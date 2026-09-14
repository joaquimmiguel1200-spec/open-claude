import type { MemoryCategory, MemorySource } from '@/types/memory'

export interface MemoryCandidate {
  content: string
  category: MemoryCategory
  importance?: number
  source?: MemorySource
  projectId?: string | null
  chatId?: string | null
  dedupeKey?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Conservative memory policy for Stage 4.
 * The model may propose memories, but persistence should happen only after
 * application-side validation. Secrets, credentials and sensitive values must
 * never be persisted as ordinary long-term memory.
 */
export function normalizeMemoryCandidate(candidate: MemoryCandidate): MemoryCandidate {
  return {
    ...candidate,
    content: candidate.content.trim(),
    importance: Math.max(0, Math.min(100, candidate.importance ?? 50)),
    source: candidate.source ?? 'user',
    metadata: candidate.metadata ?? {},
  }
}

export function shouldPersistMemory(candidate: MemoryCandidate): boolean {
  const content = candidate.content.trim()
  if (!content) return false

  const forbidden = [
    'password=',
    'api_key=',
    'apikey=',
    'access_token=',
    'refresh_token=',
    'service_role',
    'private_key',
  ]

  const lower = content.toLowerCase()
  return !forbidden.some((token) => lower.includes(token))
}
