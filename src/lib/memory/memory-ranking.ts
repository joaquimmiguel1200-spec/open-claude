import type { MemoryItem } from '@/types/memory'

export interface MemoryQuery {
  text?: string | null
  projectId?: string | null
  chatId?: string | null
  limit?: number
}

export interface MemoryRankingOptions {
  now?: Date
}

export function rankMemories(
  memories: MemoryItem[],
  query: MemoryQuery & MemoryRankingOptions = {},
): MemoryItem[] {
  const limit = Math.max(0, Math.min(query.limit ?? 12, 100))
  if (!limit || memories.length === 0) return []

  const queryTokens = tokenize(query.text ?? '')
  const now = query.now ?? new Date()

  return memories
    .filter((memory) => {
      if (!memory?.content?.trim()) return false
      if (!memory.expires_at) return true
      const expires = Date.parse(memory.expires_at)
      return !Number.isFinite(expires) || expires > now.getTime()
    })
    .map((memory, index) => {
      const lexical = lexicalScore(queryTokens, tokenize(memory.content))
      const importance = clamp(memory.importance, 0, 100) / 100
      const recency = recencyScore(memory.updated_at || memory.created_at, now)
      const projectMatch = query.projectId && memory.project_id === query.projectId ? 1 : 0
      const chatMatch = query.chatId && memory.chat_id === query.chatId ? 1 : 0
      const scope = chatMatch * 0.08 + projectMatch * 0.12 + (!memory.project_id ? 0.06 : 0)

      const score = queryTokens.length
        ? lexical * 0.54 + importance * 0.26 + recency * 0.10 + scope
        : importance * 0.62 + recency * 0.20 + scope

      return { memory, score, index }
    })
    .sort((a, b) =>
      b.score - a.score ||
      b.memory.importance - a.memory.importance ||
      b.index - a.index,
    )
    .slice(0, limit)
    .map(({ memory }) => memory)
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLocaleLowerCase()
        .normalize('NFKC')
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length >= 2),
    ),
  )
}

function lexicalScore(queryTokens: string[], memoryTokens: string[]): number {
  if (!queryTokens.length || !memoryTokens.length) return 0
  const memorySet = new Set(memoryTokens)
  let matched = 0

  for (const token of queryTokens) {
    if (memorySet.has(token)) {
      matched += 1
      continue
    }

    if (
      token.length >= 5 &&
      memoryTokens.some((candidate) =>
        candidate.length >= 5 &&
        (candidate.startsWith(token.slice(0, -2)) || token.startsWith(candidate.slice(0, -2))),
      )
    ) {
      matched += 0.5
    }
  }

  return Math.min(1, matched / queryTokens.length)
}

function recencyScore(timestamp: string | null | undefined, now: Date): number {
  if (!timestamp) return 0
  const time = Date.parse(timestamp)
  if (!Number.isFinite(time)) return 0
  const ageDays = Math.max(0, (now.getTime() - time) / 86_400_000)
  return Math.exp(-ageDays / 65)
}

function clamp(value: number | null | undefined, min: number, max: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return min
  return Math.min(max, Math.max(min, numeric))
}
