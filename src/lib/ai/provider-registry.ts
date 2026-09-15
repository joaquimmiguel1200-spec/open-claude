import type { AIModel, AIProviderConfig, AIRoutingStrategy } from '@/types/ai'

export function rankModels(providers: AIProviderConfig[], strategy: AIRoutingStrategy = 'auto'): AIModel[] {
  const models = providers.filter((p) => p.enabled).flatMap((p) => p.models.filter((m) => m.enabled !== false))

  return [...models].sort((a, b) => {
    if (strategy === 'free') return Number(b.free) - Number(a.free)
    if (strategy === 'cost') return (a.inputCostPerMillion ?? 999999) - (b.inputCostPerMillion ?? 999999)
    if (strategy === 'quality') return (b.contextWindow ?? 0) - (a.contextWindow ?? 0)
    return 0
  })
}

export function createOmniRouteConfig(): AIProviderConfig | null {
  const baseUrl = process.env.OMNIROUTE_BASE_URL
  if (!baseUrl) return null

  return {
    id: 'omniroute',
    name: 'OmniRoute',
    kind: 'omniroute',
    baseUrl: baseUrl.replace(/\/$/, ''),
    apiKeyEnv: 'OMNIROUTE_API_KEY',
    enabled: process.env.OMNIROUTE_ENABLED !== 'false',
    priority: 10,
    models: [],
  }
}
