import { NextResponse } from 'next/server'
import { generateAI, streamAIResponse } from '@/src/lib/ai'
import type { AIRoutingStrategy } from '@/src/types/ai'
import { requireUser } from '@/src/lib/supabase/server'
import { chatInputSchema, rejectBotHoneypot } from '@/src/lib/security/input'
import { clientKey, rateLimit } from '@/src/lib/security/rate-limit'

export const runtime = 'nodejs'

const routingStrategies: AIRoutingStrategy[] = ['auto', 'quality', 'cost', 'latency', 'free']
function configuredStrategy(): AIRoutingStrategy {
  const value = process.env.AI_ROUTING_STRATEGY?.trim() as AIRoutingStrategy | undefined
  return value && routingStrategies.includes(value) ? value : 'free'
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id), 20, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Muitas solicitações. Tente novamente em instantes.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } })
    const body: unknown = await request.json()
    const parsed = chatInputSchema.safeParse(body)
    if (!parsed.success || rejectBotHoneypot(parsed.data?.honeypot)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

    const aiRequest = {
      messages: [{ role: 'user' as const, content: parsed.data.message }],
      model: parsed.data.model,
      strategy: configuredStrategy(),
      stream: true,
      signal: request.signal,
      metadata: { userId: user.id },
    }

    const wantsStream = request.headers.get('accept')?.includes('text/event-stream') || parsed.data.stream === true
    if (!wantsStream) {
      const response = await generateAI({ ...aiRequest, stream: false })
      return NextResponse.json({ id: response.id, content: response.content.trim(), model: response.model, usage: response.usage, cost: response.cost }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of streamAIResponse(aiRequest)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          }
          controller.close()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI stream failed.'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: { code: 'INTERNAL', message, retryable: false } })}\n\n`))
          controller.close()
        }
      },
      cancel() {
        // request.signal is forwarded into the AI transport and aborts upstream fetches.
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível processar a solicitação.'
    return NextResponse.json({ error: message }, { status: message === 'Não autenticado.' ? 401 : 500 })
  }
}
