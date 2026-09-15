import type { AIErrorCode, AIErrorShape } from '@/types/ai'

export class AIError extends Error {
  readonly code: AIErrorCode
  readonly provider?: string
  readonly model?: string
  readonly status?: number
  readonly retryable: boolean
  readonly cause?: unknown

  constructor(shape: AIErrorShape) {
    super(shape.message)
    this.name = 'AIError'
    this.code = shape.code
    this.provider = shape.provider
    this.model = shape.model
    this.status = shape.status
    this.retryable = shape.retryable
    this.cause = shape.cause
  }

  toJSON(): AIErrorShape {
    return {
      code: this.code,
      message: this.message,
      provider: this.provider,
      model: this.model,
      status: this.status,
      retryable: this.retryable,
      cause: this.cause,
    }
  }
}

export function normalizeAIError(error: unknown, context: Pick<AIErrorShape, 'provider' | 'model'> = {}): AIError {
  if (error instanceof AIError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new AIError({ code: 'TIMEOUT', message: 'AI provider request timed out.', retryable: true, ...context })
  }
  if (error instanceof Error) {
    return new AIError({ code: 'UPSTREAM_ERROR', message: error.message, retryable: true, cause: error, ...context })
  }
  return new AIError({ code: 'INTERNAL', message: 'Unknown AI provider error.', retryable: false, cause: error, ...context })
}

export function errorFromStatus(status: number, message: string, context: Pick<AIErrorShape, 'provider' | 'model'>): AIError {
  const code: AIErrorCode = status === 401 ? 'AUTHENTICATION'
    : status === 403 ? 'AUTHORIZATION'
    : status === 429 ? 'RATE_LIMIT'
    : status >= 500 ? 'PROVIDER_UNAVAILABLE'
    : 'UPSTREAM_ERROR'

  return new AIError({
    code,
    message,
    status,
    retryable: status === 408 || status === 409 || status === 425 || status === 429 || status >= 500,
    ...context,
  })
}
