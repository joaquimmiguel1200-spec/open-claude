import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { userAIProviders } from '@/lib/ai/user-providers'
import { generateAI } from '@/lib/ai'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':provider-test', 5, 60_000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Muitos testes de conexão. Aguarde antes de tentar novamente.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } },
      )
    }

    const body = await request.json().catch(() => ({}))
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'API inválida.' }, { status: 400 })

    const target = 'user-api-' + id
    const providers = (await userAIProviders(supabase, user.id)).filter(p => p.id === target)
    if (!providers.length) return NextResponse.json({ error: 'API não encontrada ou desligada.' }, { status: 404 })

    const response = await generateAI({
      model: providers[0].models[0].id,
      maxTokens: 16,
      temperature: 0,
      timeoutMs: 15_000,
      maxRetries: 0,
      messages: [{ role: 'user', content: 'Responda somente: OK' }],
      metadata: { userId: user.id, source: 'provider-test' },
    }, providers)

    return NextResponse.json({
      ok: true,
      provider: response.provider,
      model: response.model,
      latencyMs: response.latencyMs,
      usage: response.usage,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const unauthenticated = message === 'UNAUTHENTICATED'
    return NextResponse.json({
      error: unauthenticated ? 'Não autenticado.' : 'Falha no teste de conexão. Confira a chave, o modelo e o endpoint; detalhes técnicos foram ocultados.',
    }, { status: unauthenticated ? 401 : 422, headers: { 'Cache-Control': 'no-store' } })
  }
}
