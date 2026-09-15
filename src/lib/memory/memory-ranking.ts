import type { MemoryItem } from '@/types/memory'

export interface MemoryQuery {
  text: string
  projectId?: string | null
  chatId?: string | null
  limit?: number
}

function lexicalScore(query: string, content: string): number {
  const terms = new Set(query.toLowerCase().split(/\W+/).filter(Boolean))
  if (!terms.size) return 0
  const haystack = content.toLowerCase()
  let hits = 0
  for (const term of terms) if (haystack.includes(term)) hits++
  return hits / terms.size
}

export function rankMemories(items: MemoryItem[], query: MemoryQuery): MemoryItem[] {
  return [...items]
    .filter((item) => !item.expires_at || new Date(item.expires_at).getTime() > Date.now())
    .map((item) => {
      const lexical = lexicalScore(query.text, item.content)
      const scope = item.chat_id === query.chatId ? 1 : item.project_id === query.projectId ? 0.8 : item.project_id === null ? 0.6 : 0.2
      const score = lexical * 0.55 + (item.importance / 100) * 0.3 + scope * 0.15
      return { item, score }
    })
    .filter(({ score }) => score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, query.limit ?? 12)
    .map(({ item }) => item)
}
