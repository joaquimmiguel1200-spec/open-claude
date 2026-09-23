// @ts-nocheck\nimport type { AIProviderConfig,AIRequest,AIResponse,AIStreamEvent,AIModel } from '@/types/ai'
import { completeOpenAICompatible,streamOpenAICompatible } from './openai-compatible'
import { completeAnthropic,streamAnthropic } from './anthropic-compatible'
export interface AIProviderAdapter{readonly kind:AIProviderConfig['kind'];complete(input:{provider:AIProviderConfig;model:AIModel;request:AIRequest;apiKey?:string}):Promise<AIResponse>;stream(input:{provider:AIProviderConfig;model:AIModel;request:AIRequest;apiKey?:string}):AsyncGenerator<AIStreamEvent>}
const openAICompatibleAdapter:AIProviderAdapter={kind:'openai-compatible',complete:completeOpenAICompatible,stream:streamOpenAICompatible}
const omniRouteAdapter:AIProviderAdapter={kind:'omniroute',complete:completeOpenAICompatible,stream:streamOpenAICompatible}
const openRouterAdapter:AIProviderAdapter={kind:'openrouter',complete:completeOpenAICompatible,stream:streamOpenAICompatible}
const anthropicAdapter:AIProviderAdapter={kind:'anthropic-compatible',complete:completeAnthropic,stream:streamAnthropic}
const adapters=new Map<AIProviderConfig['kind'],AIProviderAdapter>([['openai-compatible',openAICompatibleAdapter],['omniroute',omniRouteAdapter],['openrouter',openRouterAdapter],['anthropic-compatible',anthropicAdapter]])
export function adapterFor(provider:AIProviderConfig):AIProviderAdapter{const adapter=adapters.get(provider.kind);if(!adapter)throw new Error(`No AI adapter registered for provider kind: ${provider.kind}`);return adapter}
