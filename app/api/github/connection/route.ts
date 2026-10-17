import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { assertEncryptionConfigured, decryptSecret, encryptSecret } from '@/lib/security/encryption'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { user, supabase } = await requireUser()
    const { data, error } = await supabase.from('github_connections').select('id,account_login,scopes,created_at,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) throw error
    return NextResponse.json({ connected: Boolean(data), accountLogin: data?.account_login ?? null, scopes: data?.scopes ?? [], connectedAt: data?.created_at ?? null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível consultar a conexão GitHub.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':github-connect', 5, 10 * 60 * 1000)
    if (!limit.allowed) return NextResponse.json({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } })
    const body = await request.json().catch(() => ({}))
    const token = String(body?.token ?? '').trim()
    if (token.length < 20 || token.length > 500 || !/^(?:ghp_|github_pat_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]+$/.test(token)) {
      return NextResponse.json({ error: 'Informe um token pessoal do GitHub válido.' }, { status: 400 })
    }
    try { assertEncryptionConfigured() } catch { return NextResponse.json({ error: 'A criptografia de credenciais não está configurada no servidor.' }, { status: 503 }) }
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!response.ok) return NextResponse.json({ error: response.status === 401 ? 'Token do GitHub inválido ou expirado.' : 'Não foi possível validar o token do GitHub.' }, { status: response.status === 401 ? 400 : 502 })
    const account = await response.json() as { login?: string }
    if (!account.login) return NextResponse.json({ error: 'O GitHub não retornou a conta vinculada ao token.' }, { status: 502 })
    const scopes = (response.headers.get('x-oauth-scopes') ?? '').split(',').map(value => value.trim()).filter(Boolean)
    const { data: existing, error: lookupError } = await supabase.from('github_connections').select('id').eq('user_id', user.id).limit(1).maybeSingle()
    if (lookupError) throw lookupError
    const payload = { user_id: user.id, account_login: account.login, access_token_ref: encryptSecret(token), scopes, metadata: { storage: 'aes-256-gcm', updated_by: 'user' }, updated_at: new Date().toISOString() }
    const saved = existing
      ? await supabase.from('github_connections').update(payload).eq('id', existing.id).eq('user_id', user.id)
      : await supabase.from('github_connections').insert(payload)
    if (saved.error) throw saved.error
    return NextResponse.json({ ok: true, connected: true, accountLogin: account.login, scopes }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível conectar o GitHub.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}

export async function DELETE() {
  try {
    const { user, supabase } = await requireUser()
    const { error } = await supabase.from('github_connections').delete().eq('user_id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true, connected: false }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível desconectar o GitHub.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
