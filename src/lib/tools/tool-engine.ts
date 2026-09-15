import { randomUUID } from 'node:crypto'
import type {
  ToolCallRequest,
  ToolCallResult,
  ToolDefinition,
  ToolEvent,
  ToolExecutionContext,
  ToolPermissionChecker,
} from '@/types/tools'
import { normalizeToolError, ToolExecutionError } from './tool-errors'
import { ToolRegistry } from './tool-registry'
import { validateToolInput } from './tool-validation'

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_OUTPUT_CHARS = 32_000

function outputToText(output: unknown): string {
  if (typeof output === 'string') return output
  try { return JSON.stringify(output) } catch { return String(output) }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ToolExecutionError('CANCELLED', 'Tool execution was cancelled.'))
      return
    }
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) reject(new ToolExecutionError('TIMEOUT', `Tool execution exceeded ${timeoutMs}ms.`, { retryable: true }))
    }, timeoutMs)
    const onAbort = () => {
      if (!settled) reject(new ToolExecutionError('CANCELLED', 'Tool execution was cancelled.'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    promise.then((value) => { settled = true; clearTimeout(timer); signal?.removeEventListener('abort', onAbort); resolve(value) }, (error) => { settled = true; clearTimeout(timer); signal?.removeEventListener('abort', onAbort); reject(error) })
  })
}

export interface ToolEngineOptions {
  registry?: ToolRegistry
  permissionChecker?: ToolPermissionChecker
  defaultTimeoutMs?: number
  defaultMaxOutputChars?: number
}

export function createToolEngine(options: ToolEngineOptions = {}) {
  const registry = options.registry ?? new ToolRegistry()
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS
  const defaultMaxOutputChars = options.defaultMaxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS

  async function execute(request: ToolCallRequest, onEvent?: (event: ToolEvent) => void): Promise<ToolCallResult> {
    const callId = randomUUID()
    const startedAt = Date.now()
    const timestamp = () => new Date().toISOString()
    const registered = registry.get(request.toolName)

    onEvent?.({ type: 'tool.call.started', callId, toolName: request.toolName, timestamp: timestamp(), input: request.input })

    if (!registered) {
      const result = fail(callId, request.toolName, startedAt, 'NOT_FOUND', 'Tool is not registered.')
      onEvent?.({ type: 'tool.call.failed', callId, toolName: request.toolName, timestamp: timestamp(), result, message: result.error?.message })
      return result
    }

    const validation = validateToolInput(request.input, registered.definition.inputSchema)
    if (!validation.valid) {
      const result = fail(callId, request.toolName, startedAt, 'INVALID_INPUT', validation.errors.join(' '))
      onEvent?.({ type: 'tool.call.failed', callId, toolName: request.toolName, timestamp: timestamp(), result, message: result.error?.message })
      return result
    }

    const context: ToolExecutionContext = request.context ?? {}
    if (registered.definition.requiresPermission || registered.definition.dangerous) {
      if (!options.permissionChecker) {
        const result = fail(callId, request.toolName, startedAt, 'PERMISSION_REQUIRED', 'This tool requires the Permission Engine before execution.')
        onEvent?.({ type: 'tool.call.failed', callId, toolName: request.toolName, timestamp: timestamp(), result, message: result.error?.message })
        return result
      }
      if (!(await options.permissionChecker.authorize(registered.definition, context))) {
        const result = fail(callId, request.toolName, startedAt, 'PERMISSION_REQUIRED', 'Tool execution was not authorized.')
        onEvent?.({ type: 'tool.call.failed', callId, toolName: request.toolName, timestamp: timestamp(), result, message: result.error?.message })
        return result
      }
    }

    try {
      const timeoutMs = request.timeoutMs ?? registered.definition.timeoutMs ?? defaultTimeoutMs
      const output = await withTimeout(registered.executor.execute(request.input, context), timeoutMs, context.signal)
      const maxOutputChars = request.maxOutputChars ?? registered.definition.maxOutputChars ?? defaultMaxOutputChars
      const text = outputToText(output)
      if (text.length > maxOutputChars) {
        const result: ToolCallResult = { callId, toolName: request.toolName, status: 'completed', output: text.slice(0, maxOutputChars), durationMs: Date.now() - startedAt, truncated: true }
        onEvent?.({ type: 'tool.call.completed', callId, toolName: request.toolName, timestamp: timestamp(), result, message: 'Tool output was truncated to the configured limit.' })
        return result
      }
      const result: ToolCallResult = { callId, toolName: request.toolName, status: 'completed', output, durationMs: Date.now() - startedAt }
      onEvent?.({ type: 'tool.call.completed', callId, toolName: request.toolName, timestamp: timestamp(), result })
      return result
    } catch (error) {
      const normalized = normalizeToolError(error, request.toolName)
      const result: ToolCallResult = { callId, toolName: request.toolName, status: normalized.code === 'CANCELLED' ? 'cancelled' : 'failed', error: normalized, durationMs: Date.now() - startedAt }
      onEvent?.({ type: normalized.code === 'CANCELLED' ? 'tool.call.cancelled' : 'tool.call.failed', callId, toolName: request.toolName, timestamp: timestamp(), result, message: normalized.message })
      return result
    }
  }

  return { registry, execute }
}

function fail(callId: string, toolName: string, startedAt: number, code: 'NOT_FOUND' | 'INVALID_INPUT' | 'PERMISSION_REQUIRED', message: string): ToolCallResult {
  return { callId, toolName, status: 'failed', error: { code, message, tool: toolName, retryable: false }, durationMs: Date.now() - startedAt }
}

export type { ToolDefinition }
