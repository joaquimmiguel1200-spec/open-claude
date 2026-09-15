import type { AICost, AIModel, AIUsage } from '@/types/ai'

export function calculateCost(usage: AIUsage | undefined, model: AIModel): AICost | undefined {
  if (!usage) return undefined
  const input = usage.inputTokens != null && model.inputCostPerMillion != null
    ? (usage.inputTokens / 1_000_000) * model.inputCostPerMillion
    : undefined
  const output = usage.outputTokens != null && model.outputCostPerMillion != null
    ? (usage.outputTokens / 1_000_000) * model.outputCostPerMillion
    : undefined

  if (input == null && output == null) return undefined
  return {
    input,
    output,
    total: (input ?? 0) + (output ?? 0),
    currency: 'USD',
  }
}
