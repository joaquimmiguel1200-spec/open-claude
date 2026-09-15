import type { AIProviderConfig, AIRequest, AIResponse, AIStreamEvent } from '@/types/ai'
import { routeAI, streamAI } from './router'
import { configuredProviders } from './provider-registry'

export function getAIProviders(extra: AIProviderConfig[] = []): AIProviderConfig[] {
  return configuredProviders(extra)
}

export async function generateAI(request: AIRequest, extraProviders: AIProviderConfig[] = []): Promise<AIResponse> {
  return routeAI(request, getAIProviders(extraProviders))
}

export function streamAIResponse(request: AIRequest, extraProviders: AIProviderConfig[] = []): AsyncGenerator<AIStreamEvent> {
  return streamAI(request, getAIProviders(extraProviders))
}

export { AIError } from './errors'
export { calculateCost } from './cost'
export { adapterFor } from './provider-adapter'
