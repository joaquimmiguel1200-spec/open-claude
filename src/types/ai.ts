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
}

export interface AIResponse {
  id: string
  model: string
  provider: string
  content: string
  inputTokens?: number
  outputTokens?: number
  finishReason?: string
}

export interface AIProviderConfig {
  id: string
  name: string
  kind: AIProviderKind
  baseUrl: string
  apiKeyEnv?: string
  enabled: boolean
  priority: number
  models: AIModel[]
}
