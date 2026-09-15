export type AIProviderKind = 'openai-compatible' | 'anthropic-compatible' | 'omniroute'

export type AIRoutingStrategy = 'auto' | 'quality' | 'cost' | 'latency' | 'free'

export interface AIModel {
  id: string
  provider: string
  displayName?: string
  inputCostPerMillion?: number
  outputCostPerMillion?: number
  contextWindow?: number
  supportsVision?: boolean
  supportsTools?: boolean
  free?: boolean
  enabled?: boolean
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export interface AIRequest {
  messages: AIMessage[]
  model?: string
  strategy?: AIRoutingStrategy
  temperature?: number
  maxTokens?: number
  stream?: boolean
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
  metadata?: Record<string, unknown>
}

export interface AIUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

export interface AICost {
  input?: number
  output?: number
  total?: number
  currency: 'USD'
}

export type AIErrorCode =
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'PROVIDER_UNAVAILABLE'
  | 'UPSTREAM_ERROR'
  | 'EMPTY_RESPONSE'
  | 'NO_PROVIDER'
  | 'INTERNAL'

export interface AIErrorShape {
  code: AIErrorCode
  message: string
  provider?: string
  model?: string
  status?: number
  retryable: boolean
  cause?: unknown
}

export interface AIResponse {
  id: string
  model: string
  provider: string
  content: string
  usage?: AIUsage
  cost?: AICost
  finishReason?: string
  latencyMs?: number
  attempts?: number
}

export interface AIStreamEvent {
  type: 'start' | 'delta' | 'usage' | 'done' | 'error'
  id?: string
  provider?: string
  model?: string
  delta?: string
  usage?: AIUsage
  cost?: AICost
  finishReason?: string
  error?: AIErrorShape
}

export interface AIProviderConfig {
  id: string
  name: string
  kind: AIProviderKind
  baseUrl: string
  apiKeyEnv?: string
  enabled: boolean
  priority: number
  timeoutMs?: number
  maxRetries?: number
  models: AIModel[]
}
