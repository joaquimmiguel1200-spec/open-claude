import type { AIModel, AIProviderConfig, AIRoutingStrategy } from '@/types/ai'

export function rankModels(providers: AIProviderConfig[], strategy: AIRoutingStrategy = 'auto'): AIModel[] {
  const models = providers
    .filter((p) => p.enabled)
    .flatMap((p) => p.models.filter((m) => m.enabled !== false))

  return [...models].sort((a, b) => {
    if (strategy === 'free') return Number(b.free) - Number(a.free)
    if (strategy === 'cost') {
      const aCost = (a.inputCostPerMillion ?? 999999) + (a.outputCostPerMillion ?? 999999)
      const bCost = (b.inputCostPerMillion ?? 999999) + (b.outputCostPerMillion ?? 999999)
      return aCost - bCost
    }
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
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 120000),
    maxRetries: Number(process.env.AI_MAX_RETRIES || 2),
    models: [],
  }
}

export function configuredProviders(extra: AIProviderConfig[] = []): AIProviderConfig[] {
  const omni = createOmniRouteConfig()
  return [...(omni ? [omni] : []), ...extra]
    .filter((provider) => provider.enabled)
    .sort((a, b) => a.priority - b.priority)
}
