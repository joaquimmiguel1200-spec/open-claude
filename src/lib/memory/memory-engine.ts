import type { MemoryItem } from '@/types/memory'
import { normalizeMemoryCandidate, shouldPersistMemory, type MemoryCandidate } from './memory-policy'
import { extractMemoryCandidates, type MemoryTurn } from './memory-extractor'
import { rankMemories, type MemoryQuery } from './memory-ranking'

export interface MemoryStore {
  insertMemory(input: Omit<MemoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<MemoryItem>
  findByDedupeKey(input: { userId: string; dedupeKey: string; projectId?: string | null }): Promise<MemoryItem | null>
  updateMemory(id: string, patch: Partial<Pick<MemoryItem, 'content' | 'category' | 'importance' | 'metadata' | 'expires_at'>>): Promise<MemoryItem>
  listMemories(input: { userId: string; projectId?: string | null; chatId?: string | null; limit?: number }): Promise<MemoryItem[]>
}

export interface CaptureMemoryInput {
  userId: string
  turn: MemoryTurn
  projectId?: string | null
  chatId?: string | null
  expiresAt?: string | null
}

export interface CaptureMemoryResult {
  candidates: number
  persisted: MemoryItem[]
  rejected: number
  deduplicated: number
}

export async function captureMemories(input: CaptureMemoryInput, store: MemoryStore): Promise<CaptureMemoryResult> {
  const candidates = extractMemoryCandidates(input.turn, { projectId: input.projectId, chatId: input.chatId })
  const persisted: MemoryItem[] = []
  let rejected = 0
  let deduplicated = 0

  for (const raw of candidates) {
    const candidate = normalizeMemoryCandidate(raw)
    if (!shouldPersistMemory(candidate)) {
      rejected++
      continue
    }

    const existing = candidate.dedupeKey
      ? await store.findByDedupeKey({ userId: input.userId, dedupeKey: candidate.dedupeKey, projectId: input.projectId })
      : null

    if (existing) {
      const mergedImportance = Math.max(existing.importance, candidate.importance ?? 0)
      const updated = await store.updateMemory(existing.id, {
        importance: mergedImportance,
        metadata: { ...existing.metadata, ...candidate.metadata, lastSeenAt: new Date().toISOString() },
      })
      persisted.push(updated)
      deduplicated++
      continue
    }

    const item = await store.insertMemory({
      user_id: input.userId,
      project_id: candidate.projectId ?? null,
      chat_id: candidate.chatId ?? null,
      category: candidate.category,
      content: candidate.content,
      importance: candidate.importance ?? 50,
      source: candidate.source ?? 'user',
      metadata: candidate.metadata ?? {},
      dedupe_key: candidate.dedupeKey ?? null,
      expires_at: input.expiresAt ?? null,
    })
    persisted.push(item)
  }

  return { candidates: candidates.length, persisted, rejected, deduplicated }
}

export async function retrieveMemories(input: MemoryQuery & { userId: string }, store: MemoryStore): Promise<MemoryItem[]> {
  const items = await store.listMemories({
    userId: input.userId,
    projectId: input.projectId,
    chatId: input.chatId,
    limit: Math.min(input.limit ?? 50, 100),
  })
  return rankMemories(items, input)
}

export function buildMemoryStoreFromSupabase(client: {
  from(table: string): any
}): MemoryStore {
  return {
    async insertMemory(input) {
      const { data, error } = await client.from('memories').insert(input).select('*').single()
      if (error) throw new Error(`Memory insert failed: ${error.message}`)
      return data as MemoryItem
    },
    async findByDedupeKey(input) {
      let query = client.from('memories').select('*').eq('user_id', input.userId).eq('dedupe_key', input.dedupeKey)
      if (input.projectId) query = query.eq('project_id', input.projectId)
      else query = query.is('project_id', null)
      const { data, error } = await query.maybeSingle()
      if (error) throw new Error(`Memory lookup failed: ${error.message}`)
      return (data as MemoryItem | null) ?? null
    },
    async updateMemory(id, patch) {
      const { data, error } = await client.from('memory_items').update(patch).eq('id', id).select('*').single()
      if (error) throw new Error(`Memory update failed: ${error.message}`)
      return data as MemoryItem
    },
    async listMemories(input) {
      let query = client.from('memory_items').select('*').eq('user_id', input.userId).order('importance', { ascending: false }).limit(input.limit ?? 50)
      if (input.projectId) query = query.or(`project_id.is.null,project_id.eq.${input.projectId}`)
      if (input.chatId) query = query.or(`chat_id.is.null,chat_id.eq.${input.chatId}`)
      const { data, error } = await query
      if (error) throw new Error(`Memory retrieval failed: ${error.message}`)
      return (data ?? []) as MemoryItem[]
    },
  }
}
