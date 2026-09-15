import type { AIRequest, AIResponse, AIProviderConfig } from '@/types/ai'
import { rankModels } from './provider-registry'

function apiKeyFor(provider: AIProviderConfig): string | undefined {
  return provider.apiKeyEnv ? process.env[provider.apiKeyEnv] : undefined
}

export async function routeAI(request: AIRequest, providers: AIProviderConfig[]): Promise<AIResponse> {
  const enabled = providers.filter((p) => p.enabled)
  const ranked = rankModels(enabled, request.strategy ?? 'auto')
  const candidates = request.model ? ranked.filter((m) => m.id === request.model) : ranked

  if (!candidates.length) throw new Error('No AI model is available for this request.')

  let lastError: unknown
  for (const model of candidates) {
    const provider = enabled.find((p) => p.id === model.provider)
    if (!provider) continue

    try {
      const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKeyFor(provider) ? { Authorization: `Bearer ${apiKeyFor(provider)}` } : {}),
        },
        body: JSON.stringify({
          model: model.id,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          stream: false,
        }),
      })

      if (!response.ok) throw new Error(`${provider.name}/${model.id}: HTTP ${response.status}`)
      const data = await response.json() as any
      const choice = data.choices?.[0]
      if (!choice?.message?.content) throw new Error(`${provider.name}/${model.id}: empty response`)

      return {
        id: data.id ?? crypto.randomUUID(),
        model: model.id,
        provider: provider.id,
        content: choice.message.content,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        finishReason: choice.finish_reason,
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All configured AI providers failed.')
}
