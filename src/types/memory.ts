export type MemoryCategory =
  | 'preference'
  | 'fact'
  | 'instruction'
  | 'decision'
  | 'project'
  | 'general'

export type MemorySource =
  | 'user'
  | 'assistant'
  | 'system'
  | 'inferred'
  | 'imported'

export interface MemoryItem {
  id: string
  user_id: string
  project_id: string | null
  chat_id: string | null
  category: MemoryCategory
  content: string
  importance: number
  source: MemorySource
  metadata: Record<string, unknown>
  dedupe_key: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface ConversationSummary {
  id: string
  user_id: string
  chat_id: string
  summary: string
  covered_through_message_id: string | null
  token_estimate: number | null
  created_at: string
  updated_at: string
}

export interface MemoryContext {
  recentMessages: string[]
  summaries: ConversationSummary[]
  memories: MemoryItem[]
}
