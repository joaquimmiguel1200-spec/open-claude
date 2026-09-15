export interface ContextItem {
  text: string
  priority: number
  kind: 'system' | 'memory' | 'summary' | 'rag' | 'message' | 'tool' | 'project'
  required?: boolean
  tokenCount?: number
}

export interface ContextBudget {
  maxTokens: number
  reservedTokens?: number
}

export interface PackedContext {
  items: ContextItem[]
  text: string
  usedTokens: number
  remainingTokens: number
  droppedItems: ContextItem[]
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function takeWithinBudget(text: string, tokenBudget: number): string {
  if (tokenBudget <= 0) return ''
  const maxChars = tokenBudget * 4
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`
}

export function packContext(items: ContextItem[], budget: ContextBudget): PackedContext {
  const limit = Math.max(0, budget.maxTokens - (budget.reservedTokens ?? 0))
  let usedTokens = 0
  const selected: Array<{ item: ContextItem; index: number }> = []
  const droppedItems: ContextItem[] = []

  const ranked = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(Boolean(b.item.required)) - Number(Boolean(a.item.required)) || b.item.priority - a.item.priority || a.index - b.index)

  for (const entry of ranked) {
    const item = entry.item
    const tokenCount = item.tokenCount ?? estimateTokens(item.text)
    const remaining = limit - usedTokens
    if (remaining <= 0) {
      droppedItems.push(item)
      continue
    }

    if (tokenCount <= remaining) {
      selected.push({ item: { ...item, tokenCount }, index: entry.index })
      usedTokens += tokenCount
      continue
    }

    if (item.required || item.priority >= 80) {
      const text = takeWithinBudget(item.text, remaining)
      if (text) {
        const partial = { ...item, text, tokenCount: estimateTokens(text) }
        selected.push({ item: partial, index: entry.index })
        usedTokens += partial.tokenCount
      }
    } else {
      droppedItems.push(item)
    }
  }

  selected.sort((a, b) => a.index - b.index)
  const ordered = selected.map(({ item }) => item)

  return {
    items: ordered,
    text: ordered.map((item) => item.text).join('\n\n'),
    usedTokens,
    remainingTokens: Math.max(0, limit - usedTokens),
    droppedItems,
  }
}

export interface ProgressiveContextInput {
  system?: string[]
  project?: string[]
  memories?: string[]
  summaries?: string[]
  rag?: string[]
  recentMessages?: string[]
  tools?: string[]
}

export function progressiveContext(input: ProgressiveContextInput, budget: ContextBudget): PackedContext {
  const recent = input.recentMessages ?? []
  const items: ContextItem[] = [
    ...(input.system ?? []).map((text) => ({ text, priority: 120, kind: 'system' as const, required: true })),
    ...(input.project ?? []).map((text) => ({ text, priority: 105, kind: 'project' as const })),
    ...(input.memories ?? []).map((text) => ({ text, priority: 100, kind: 'memory' as const })),
    ...(input.summaries ?? []).map((text) => ({ text, priority: 90, kind: 'summary' as const })),
    ...(input.rag ?? []).map((text) => ({ text, priority: 80, kind: 'rag' as const })),
    ...(input.tools ?? []).map((text) => ({ text, priority: 75, kind: 'tool' as const })),
    ...recent.map((text, index) => ({ text, priority: 70 + (index + 1) / Math.max(1, recent.length), kind: 'message' as const })),
  ]

  return packContext(items, budget)
}
