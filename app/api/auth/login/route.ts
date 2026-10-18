import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')

    if (body?.honeypot) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password) {
      return NextResponse.json({ error: 'Informe um e-mail válido e a senha.' }, { status: 400 })
    }

    const ip = (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown')
      .split(',')[0]
      .trim()
    const emailHash = hash(email)
    const ipHash = hash(ip)
    const ipLimit = rateLimit(ipHash + ':login', 8, 10 * 60 * 1000)

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((ipLimit.resetAt - Date.now()) / 1000))),
            'Cache-Control': 'no-store',
          },
        },
      )
    }

    // Admin access is optional for authentication itself. Without the service-role
    // secret, sign-in still works; privileged audit/credential-stuffing operations
    // are skipped, while per-IP rate limiting and user-scoped suspension checks remain.
    const admin = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
      ? createSupabaseAdminClient()
      : null

    if (admin) {
      const { data: recent } = await admin
        .from('auth_attempts')
        .select('id')
        .eq('email_hash', emailHash)
        .eq('success', false)
        .gt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .limit(20)

      if ((recent ?? []).length >= 12) {
        try {
          const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
          const target = users.data?.users?.find((user: any) => String(user.email ?? '').toLowerCase() === email)
          if (target) {
            await admin.from('account_suspensions').insert({
              user_id: target.id,
              reason: 'Credential stuffing protection: repeated failed login attempts',
              source: 'automatic',
              starts_at: new Date().toISOString(),
              ends_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              active: true,
              metadata: { ip_hash: ipHash },
            })
          }
        } catch {
          // Do not leak internal security-service errors to the client.
        }
        return NextResponse.json(
          { error: 'Login temporariamente bloqueado por tentativas suspeitas.' },
          { status: 429, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (admin) {
      await admin.from('auth_attempts').insert({
        email_hash: emailHash,
        ip_hash: ipHash,
        success: !error,
        reason: error?.code ?? null,
      })
    }

    if (error) {
      return NextResponse.json(
        {
          error: error.code === 'email_not_confirmed'
            ? 'Confirme seu e-mail antes de entrar. Se a mensagem não chegou, use “Reenviar confirmação de e-mail”.'
            : 'E-mail ou senha inválidos.',
        },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // Check suspension through the signed-in user's RLS-protected view. This
    // does not require a service-role key and matches the server guard behavior.
    const activeSuspension = await supabase
      .from('account_suspensions')
      .select('id, ends_at')
      .eq('user_id', data.user?.id ?? '')
      .eq('active', true)
      .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
      .limit(1)
      .maybeSingle()

    if (activeSuspension.error) {
      await supabase.auth.signOut({ scope: 'global' })
      return NextResponse.json(
        { error: 'Não foi possível validar a segurança da conta. Tente novamente.' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (activeSuspension.data) {
      await supabase.auth.signOut({ scope: 'global' })
      return NextResponse.json(
        { error: 'Login temporariamente bloqueado por segurança.' },
        { status: 429, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const verified = (factors?.all ?? []).filter((factor: any) => factor.status === 'verified')
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    return NextResponse.json(
      { ok: true, userId: data.user?.id, needsMfa: Boolean(verified.length && aal?.currentLevel !== 'aal2') },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível entrar agora.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
