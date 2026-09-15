import type { AIProviderConfig, AIRequest, AIResponse, AIStreamEvent } from '@/types/ai'
import type { ContextOptions, ContextSources } from '@/types/context'
import { buildContextRequest } from '@/lib/context/context-engine'
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

export async function generateAIWithContext(
  sources: ContextSources,
  request: Omit<AIRequest, 'messages'> & { messages?: AIRequest['messages'] },
  options: Partial<ContextOptions> = {},
  extraProviders: AIProviderConfig[] = [],
): Promise<AIResponse> {
  const built = buildContextRequest(sources, request, options)
  return routeAI(built.request, getAIProviders(extraProviders))
}

export function streamAIWithContext(
  sources: ContextSources,
  request: Omit<AIRequest, 'messages'> & { messages?: AIRequest['messages'] },
  options: Partial<ContextOptions> = {},
  extraProviders: AIProviderConfig[] = [],
): AsyncGenerator<AIStreamEvent> {
  const built = buildContextRequest(sources, request, options)
  return streamAI(built.request, getAIProviders(extraProviders))
}

export { AIError } from './errors'
export { calculateCost } from './cost'
export { adapterFor } from './provider-adapter'
