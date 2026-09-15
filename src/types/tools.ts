export type ToolExecutionStatus = 'completed' | 'failed' | 'cancelled'

export type ToolEventType =
  | 'tool.call.started'
  | 'tool.call.completed'
  | 'tool.call.failed'
  | 'tool.call.cancelled'

export interface ToolParameterSchema {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'null'
  description?: string
  properties?: Record<string, ToolParameterSchema>
  required?: string[]
  items?: ToolParameterSchema
  enum?: unknown[]
  additionalProperties?: boolean
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: ToolParameterSchema
  version?: string
  dangerous?: boolean
  requiresPermission?: boolean
  timeoutMs?: number
  maxOutputChars?: number
  metadata?: Record<string, unknown>
}

export interface ToolExecutionContext {
  runId?: string
  userId?: string
  projectId?: string
  chatId?: string
  signal?: AbortSignal
  metadata?: Record<string, unknown>
}

export interface ToolExecutionResult {
  status: ToolExecutionStatus
  output?: unknown
  error?: ToolErrorShape
  durationMs: number
  truncated?: boolean
}

export interface ToolErrorShape {
  code: ToolErrorCode
  message: string
  tool?: string
  retryable: boolean
  cause?: unknown
}

export type ToolErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'PERMISSION_REQUIRED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'EXECUTION_FAILED'
  | 'OUTPUT_LIMIT'
  | 'INTERNAL'

export interface ToolCallRequest {
  toolName: string
  input: unknown
  context?: ToolExecutionContext
  timeoutMs?: number
  maxOutputChars?: number
}

export interface ToolCallResult extends ToolExecutionResult {
  toolName: string
  callId: string
}

export interface ToolEvent {
  type: ToolEventType
  callId: string
  toolName: string
  timestamp: string
  input?: unknown
  result?: ToolCallResult
  message?: string
}

export interface ToolExecutor {
  execute(input: unknown, context: ToolExecutionContext): Promise<unknown>
}

export interface RegisteredTool {
  definition: ToolDefinition
  executor: ToolExecutor
}

export interface ToolPermissionChecker {
  authorize(tool: ToolDefinition, context: ToolExecutionContext): Promise<boolean> | boolean
}
