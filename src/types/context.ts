import type { AIMessage, AIRequest } from './ai'
import type { ConversationSummary, MemoryItem } from './memory'
import type { RagSearchResult } from './rag'

export interface ContextMessage extends AIMessage {
  id?: string
  createdAt?: string
}

export interface ContextSources {
  systemInstructions?: string[]
  projectContext?: string[]
  memories?: MemoryItem[]
  summaries?: ConversationSummary[]
  ragResults?: RagSearchResult[]
  recentMessages?: ContextMessage[]
  toolContext?: string[]
}

export interface ContextOptions {
  maxTokens: number
  reservedOutputTokens?: number
  maxMemories?: number
  maxSummaries?: number
  maxRagResults?: number
  maxRecentMessages?: number
  includeSources?: boolean
}

export interface ContextSourceStat {
  kind: string
  included: number
  dropped: number
  estimatedTokens: number
}

export interface BuiltContext {
  messages: AIMessage[]
  systemText: string
  estimatedInputTokens: number
  reservedOutputTokens: number
  availableInputTokens: number
  droppedItems: number
  sourceStats: ContextSourceStat[]
  sourceLabels: string[]
}

export interface ContextBuildResult {
  context: BuiltContext
  request: AIRequest
}
