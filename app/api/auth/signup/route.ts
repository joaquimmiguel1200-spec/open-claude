import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.honeypot) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'A senha deve ter entre 8 e 128 caracteres.' }, { status: 400 })
    }
    if (body?.accepted !== true) return NextResponse.json({ error: 'Aceite os termos e políticas para criar a conta.' }, { status: 400 })

    const ip = (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown').split(',')[0].trim()
    const ipLimit = rateLimit(hash(ip) + ':signup', 5, 15 * 60 * 1000)
    const emailLimit = rateLimit(hash(email) + ':signup', 5, 60 * 60 * 1000)
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const resetAt = Math.max(ipLimit.resetAt, emailLimit.resetAt)
      return NextResponse.json({ error: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) },
      })
    }

    const supabase = await createSupabaseServerClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin
    const redirect = new URL('/auth/callback', siteUrl)
    if (process.env.NODE_ENV === 'production' && redirect.protocol !== 'https:') {
      return NextResponse.json({ error: 'Configuração de URL segura inválida.' }, { status: 500 })
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirect.toString() },
    })
    if (error) {
      const message = /password/i.test(error.message) ? 'A senha não atende aos requisitos do provedor.' : 'Não foi possível criar a conta com esses dados.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      authenticated: Boolean(data.session),
      confirmationRequired: !data.session,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Não foi possível criar a conta agora.' }, { status: 500 })
  }
}
