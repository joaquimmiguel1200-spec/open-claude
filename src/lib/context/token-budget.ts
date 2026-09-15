export interface ContextItem {
  text: string
  priority: number
  kind: 'system' | 'memory' | 'summary' | 'rag' | 'message' | 'tool'
}

export interface ContextBudget {
  maxChars: number
  reservedChars?: number
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function packContext(items: ContextItem[], budget: ContextBudget): string[] {
  const limit = Math.max(0, budget.maxChars - (budget.reservedChars ?? 0))
  let used = 0
  return [...items].sort((a, b) => b.priority - a.priority).flatMap((item) => {
    if (used >= limit) return []
    const remaining = limit - used
    const text = item.text.slice(0, remaining)
    used += text.length
    return text ? [text] : []
  })
}

export function progressiveContext(recentMessages: string[], summaries: string[], memories: string[], rag: string[], maxChars: number): string {
  const items: ContextItem[] = [
    ...memories.map((text) => ({ text, priority: 100, kind: 'memory' as const })),
    ...summaries.map((text) => ({ text, priority: 90, kind: 'summary' as const })),
    ...rag.map((text) => ({ text, priority: 80, kind: 'rag' as const })),
    ...recentMessages.map((text, index) => ({ text, priority: 70 + index, kind: 'message' as const })),
  ]
  return packContext(items, { maxChars }).join('\n\n')
}
