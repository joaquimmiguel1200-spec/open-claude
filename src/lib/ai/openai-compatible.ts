import type { AIModel, AIProviderConfig, AIRequest, AIResponse, AIStreamEvent, AIUsage } from '@/types/ai'
import { calculateCost } from './cost'
import { AIError, errorFromStatus, normalizeAIError } from './errors'

interface TransportOptions {
  provider: AIProviderConfig
  model: AIModel
  request: AIRequest
  apiKey?: string
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const forwardAbort = () => controller.abort(signal?.reason ?? 'cancelled')
  if (signal) {
    if (signal.aborted) forwardAbort()
    else signal.addEventListener('abort', forwardAbort, { once: true })
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', forwardAbort)
    },
  }
}

function usageOf(value: any): AIUsage | undefined {
  if (!value) return undefined
  const inputTokens = value.prompt_tokens ?? value.input_tokens
  const outputTokens = value.completion_tokens ?? value.output_tokens
  const totalTokens = value.total_tokens ?? value.totalTokens
  if (inputTokens == null && outputTokens == null && totalTokens == null) return undefined
  return { inputTokens, outputTokens, totalTokens }
}

function endpoint(provider: AIProviderConfig): string {
  const base = provider.baseUrl.replace(/\/$/, '')
  return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/v1/chat/completions`
}

export async function completeOpenAICompatible({ provider, model, request, apiKey }: TransportOptions): Promise<AIResponse> {
  const timeoutMs = request.timeoutMs ?? provider.timeoutMs ?? 120_000
  const started = Date.now()
  const { signal, cleanup } = withTimeout(request.signal, timeoutMs)

  try {
    const response = await fetch(endpoint(provider), {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.id,
        messages: request.messages,
        ...(request.temperature != null ? { temperature: request.temperature } : {}),
        ...(request.maxTokens != null ? { max_tokens: request.maxTokens } : {}),
        stream: false,
      }),
    })

    if (!response.ok) {
      let detail = `HTTP ${response.status}`
      try {
        const body = await response.json() as any
        detail = body?.error?.message ?? body?.message ?? detail
      } catch {}
      throw errorFromStatus(response.status, detail, { provider: provider.id, model: model.id })
    }

    const data = await response.json() as any
    const choice = data.choices?.[0]
    const content = choice?.message?.content
    if (typeof content !== 'string') {
      throw new AIError({ code: 'EMPTY_RESPONSE', message: 'AI provider returned no text content.', provider: provider.id, model: model.id, retryable: true })
    }

    const usage = usageOf(data.usage)
    return {
      id: data.id ?? crypto.randomUUID(),
      model: model.id,
      provider: provider.id,
      content,
      usage,
      cost: calculateCost(usage, model),
      finishReason: choice.finish_reason,
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    if (request.signal?.aborted) {
      throw new AIError({ code: 'CANCELLED', message: 'AI request cancelled by caller.', provider: provider.id, model: model.id, retryable: false, cause: error })
    }
    if (signal.aborted) {
      throw new AIError({ code: 'TIMEOUT', message: `AI provider timed out after ${timeoutMs}ms.`, provider: provider.id, model: model.id, retryable: true, cause: error })
    }
    throw normalizeAIError(error, { provider: provider.id, model: model.id })
  } finally {
    cleanup()
  }
}

export async function* streamOpenAICompatible({ provider, model, request, apiKey }: TransportOptions): AsyncGenerator<AIStreamEvent> {
  const timeoutMs = request.timeoutMs ?? provider.timeoutMs ?? 120_000
  const started = Date.now()
  const { signal, cleanup } = withTimeout(request.signal, timeoutMs)

  try {
    const response = await fetch(endpoint(provider), {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.id,
        messages: request.messages,
        ...(request.temperature != null ? { temperature: request.temperature } : {}),
        ...(request.maxTokens != null ? { max_tokens: request.maxTokens } : {}),
        stream: true,
        stream_options: { include_usage: true },
      }),
    })

    if (!response.ok) {
      let detail = `HTTP ${response.status}`
      try {
        const body = await response.json() as any
        detail = body?.error?.message ?? body?.message ?? detail
      } catch {}
      throw errorFromStatus(response.status, detail, { provider: provider.id, model: model.id })
    }
    if (!response.body) throw new AIError({ code: 'EMPTY_RESPONSE', message: 'AI provider returned no stream body.', provider: provider.id, model: model.id, retryable: true })

    yield { type: 'start', id: crypto.randomUUID(), provider: provider.id, model: model.id }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let usage: AIUsage | undefined
    let finishReason: string | undefined

    const consume = (line: string): AIStreamEvent | null => {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) return null
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return { type: 'done', finishReason }
      try {
        const data = JSON.parse(payload) as any
        const choice = data.choices?.[0]
        const delta = choice?.delta?.content
        if (choice?.finish_reason) finishReason = choice.finish_reason
        const nextUsage = usageOf(data.usage)
        if (nextUsage) usage = nextUsage
        if (typeof delta === 'string' && delta.length > 0) return { type: 'delta', delta, provider: provider.id, model: model.id }
        if (nextUsage) return { type: 'usage', usage: nextUsage, provider: provider.id, model: model.id }
      } catch {}
      return null
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const event = consume(line)
        if (event) yield event
      }
    }
    if (buffer) {
      const event = consume(buffer)
      if (event) yield event
    }

    const cost = calculateCost(usage, model)
    if (usage) yield { type: 'usage', usage, cost, provider: provider.id, model: model.id }
    yield { type: 'done', finishReason, provider: provider.id, model: model.id, cost, usage }
    console.info('[ai-router] stream completed', { provider: provider.id, model: model.id, latencyMs: Date.now() - started })
  } catch (error) {
    const normalized = request.signal?.aborted
      ? new AIError({ code: 'CANCELLED', message: 'AI stream cancelled by caller.', provider: provider.id, model: model.id, retryable: false, cause: error })
      : signal.aborted
        ? new AIError({ code: 'TIMEOUT', message: `AI provider stream timed out after ${timeoutMs}ms.`, provider: provider.id, model: model.id, retryable: true, cause: error })
        : normalizeAIError(error, { provider: provider.id, model: model.id })
    yield { type: 'error', error: normalized.toJSON(), provider: provider.id, model: model.id }
    throw normalized
  } finally {
    cleanup()
  }
}
