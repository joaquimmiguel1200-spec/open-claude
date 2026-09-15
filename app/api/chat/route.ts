import { NextResponse } from 'next/server'
import { generateAI } from '@/src/lib/ai'
import { requireUser } from '@/src/lib/supabase/server'
import { chatInputSchema, rejectBotHoneypot } from '@/src/lib/security/input'
import { clientKey, rateLimit } from '@/src/lib/security/rate-limit'

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id), 20, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Muitas solicitações. Tente novamente em instantes.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } })
    const body: unknown = await request.json()
    const parsed = chatInputSchema.safeParse(body)
    if (!parsed.success || rejectBotHoneypot(parsed.data?.honeypot)) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
    const response = await generateAI({ messages: [{ role: 'user', content: parsed.data.message }], model: parsed.data.model, metadata: { userId: user.id } })
    return NextResponse.json({ id: response.id, content: response.content.trim(), model: response.model, usage: response.usage }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível processar a solicitação.'
    return NextResponse.json({ error: message }, { status: message === 'Não autenticado.' ? 401 : 500 })
  }
}
