import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

async function currentUser(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await currentUser(supabase)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    const [{ data: factors, error }, { data: assurance }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ])
    if (error) throw error
    return NextResponse.json({
      factors: factors?.all ?? [],
      verifiedFactor: (factors?.all ?? []).find((factor: any) => factor.status === 'verified') ?? null,
      currentLevel: assurance?.currentLevel ?? null,
      nextLevel: assurance?.nextLevel ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Não foi possível consultar a verificação em duas etapas.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const user = await currentUser(supabase)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    const limit = rateLimit(clientKey(request, user.id) + ':mfa', 8, 10 * 60 * 1000)
    if (!limit.allowed) return NextResponse.json({ error: 'Muitas tentativas de verificação. Aguarde antes de tentar novamente.' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } })
    const body = await request.json().catch(() => ({}))
    const action = String(body?.action ?? '')
    const factorId = String(body?.factorId ?? '')
    if (action === 'enroll') {
      const { data: existing } = await supabase.auth.mfa.listFactors()
      if ((existing?.all ?? []).some((factor: any) => factor.status === 'verified')) {
        return NextResponse.json({ error: 'Já existe um autenticador ativo nesta conta.' }, { status: 409 })
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Open Claude Authenticator' })
      if (error || !data?.totp) return NextResponse.json({ error: 'Não foi possível iniciar a configuração do autenticador.' }, { status: 422 })
      return NextResponse.json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (!/^[0-9a-f-]{36}$/i.test(factorId)) return NextResponse.json({ error: 'Autenticador inválido.' }, { status: 400 })
    if (action === 'verify' || action === 'challengeAndVerify') {
      const code = String(body?.code ?? '').trim()
      if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Digite o código de seis dígitos.' }, { status: 400 })
      if (action === 'challengeAndVerify') {
        const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
        if (error || !data) return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 422 })
      } else {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
        if (challengeError || !challenge?.id) return NextResponse.json({ error: 'Não foi possível iniciar a verificação.' }, { status: 422 })
        const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
        if (error) return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 422 })
      }
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (action === 'remove') {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (assurance?.currentLevel !== 'aal2') return NextResponse.json({ error: 'Confirme um código MFA antes de remover o autenticador.' }, { status: 403 })
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) return NextResponse.json({ error: 'Não foi possível remover o autenticador.' }, { status: 422 })
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({ error: 'Ação MFA inválida.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Não foi possível concluir a operação de segurança.' }, { status: 500 })
  }
}
