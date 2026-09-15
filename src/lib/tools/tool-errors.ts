import type { ToolErrorCode, ToolErrorShape } from '@/types/tools'

export class ToolExecutionError extends Error {
  readonly code: ToolErrorCode
  readonly retryable: boolean
  readonly causeValue?: unknown

  constructor(code: ToolErrorCode, message: string, options: { retryable?: boolean; cause?: unknown } = {}) {
    super(message)
    this.name = 'ToolExecutionError'
    this.code = code
    this.retryable = options.retryable ?? false
    this.causeValue = options.cause
  }
}

export function normalizeToolError(error: unknown, tool?: string): ToolErrorShape {
  if (error instanceof ToolExecutionError) {
    return {
      code: error.code,
      message: error.message,
      tool,
      retryable: error.retryable,
      cause: error.causeValue,
    }
  }

  if (error instanceof Error) {
    return {
      code: 'EXECUTION_FAILED',
      message: error.message || 'Tool execution failed.',
      tool,
      retryable: false,
      cause: error,
    }
  }

  return {
    code: 'INTERNAL',
    message: 'Tool execution failed.',
    tool,
    retryable: false,
    cause: error,
  }
}
