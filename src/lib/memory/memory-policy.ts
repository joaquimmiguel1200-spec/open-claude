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

/** Application-side guard that runs before any memory reaches persistent storage. */
export function normalizeMemoryCandidate(candidate: MemoryCandidate): MemoryCandidate {
  return {
    ...candidate,
    content: candidate.content.trim(),
    importance: Math.max(0, Math.min(100, candidate.importance ?? 50)),
    source: candidate.source ?? 'user',
    metadata: candidate.metadata ?? {},
  }
}

const FORBIDDEN_PATTERNS = [
  /password\s*[:=]/i,
  /passcode\s*[:=]/i,
  /api[_-]?key\s*[:=]/i,
  /secret\s*[:=]/i,
  /access[_-]?token\s*[:=]/i,
  /refresh[_-]?token\s*[:=]/i,
  /service[_-]?role/i,
  /private[_-]?key/i,
  /authorization\s*:\s*bearer\s+/i,
  /\b(?:sk|rk|pk)_[A-Za-z0-9_-]{16,}\b/i,
]

export function shouldPersistMemory(candidate: MemoryCandidate): boolean {
  const content = candidate.content.trim()
  if (!content || content.length > 2000) return false
  return !FORBIDDEN_PATTERNS.some((pattern) => pattern.test(content))
}
