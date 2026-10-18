import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.honeypot) {
      return NextResponse.json({ error: 'Solicitação inválida.' }, { status: 400 })
    }

    const email = String(body?.email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
    }

    const ip = (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown')
      .split(',')[0]
      .trim()
    const ipLimit = rateLimit(hash(ip) + ':resend-confirmation:ip', 10, 15 * 60 * 1000)
    const emailLimit = rateLimit(hash(email) + ':resend-confirmation:email', 3, 15 * 60 * 1000)

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const resetAt = Math.max(ipLimit.resetAt, emailLimit.resetAt)
      return NextResponse.json(
        { error: 'Muitas solicitações. Aguarde alguns minutos antes de tentar novamente.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))),
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin
    const redirect = new URL('/auth/callback', siteUrl)
    if (process.env.NODE_ENV === 'production' && redirect.protocol !== 'https:') {
      return NextResponse.json({ error: 'Configuração de endereço seguro inválida.' }, { status: 500 })
    }

    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: redirect.toString() },
    })

    if (error) {
      // Keep provider details out of the public response.
      return NextResponse.json(
        { error: 'Não foi possível solicitar o envio. Confira o endereço e tente novamente mais tarde.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(
      { ok: true, message: 'Se houver uma confirmação pendente para esse endereço, o envio foi solicitado.' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível solicitar o envio agora.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
