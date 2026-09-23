import type { MemoryCategory, MemorySource } from '@/types/memory'
import type { MemoryCandidate } from './memory-policy'

export interface MemoryTurn {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
}

const EXPLICIT_PATTERNS: Array<{ pattern: RegExp; category: MemoryCategory; importance: number }> = [
  { pattern: /\b(?:lembre-se|lembra que|memorize|guarde|anote|salve|remember)\b/i, category: 'instruction', importance: 90 },
  { pattern: /\b(?:eu prefiro|prefiro|meu padrão é|minha preferência é|gosto de|não gosto de|não quero)\b/i, category: 'preference', importance: 82 },
  { pattern: /\b(?:meu nome é|sou o|sou a|eu sou|trabalho com|estou estudando|estudo)\b/i, category: 'fact', importance: 72 },
  { pattern: /\b(?:decidi|decidimos|vamos usar|vamos fazer|fica decidido|a decisão é)\b/i, category: 'decision', importance: 80 },
  { pattern: /\b(?:meu projeto|projeto .* é|estou construindo|estou criando|estou desenvolvendo)\b/i, category: 'project', importance: 76 },
]

function cleanSentence(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/^[-*•\s]+/, '').trim()
}

function splitCandidates(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+|\n+/)
    .map(cleanSentence)
    .filter((sentence) => sentence.length >= 12 && sentence.length <= 600)
}

function classify(text: string): { category: MemoryCategory; importance: number } | null {
  for (const item of EXPLICIT_PATTERNS) {
    if (item.pattern.test(text)) return { category: item.category, importance: item.importance }
  }
  return null
}

function dedupeKey(content: string): string {
  return content.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 500)
}

/**
 * Conservative local extractor. Explicit user statements are preferred over
 * model inference so memory capture remains deterministic and auditable.
 * A future AI extractor can implement the same output contract.
 */
export function extractMemoryCandidates(turn: MemoryTurn, options: { projectId?: string | null; chatId?: string | null } = {}): MemoryCandidate[] {
  if (turn.role !== 'user') return []

  return splitCandidates(turn.content).flatMap((content): MemoryCandidate[] => {
    const classification = classify(content)
    if (!classification) return []
    const explicit = /\b(?:lembre-se|lembra que|memorize|guarde|anote|salve|remember)\b/i.test(content)
    return [{
      content,
      category: classification.category,
      importance: explicit ? Math.max(classification.importance, 92) : classification.importance,
      source: 'user' as MemorySource,
      projectId: options.projectId ?? null,
      chatId: options.chatId ?? null,
      dedupeKey: dedupeKey(content),
      metadata: { extraction: 'rule-based', explicit },
    }]
  })
}
