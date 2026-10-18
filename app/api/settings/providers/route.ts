import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { assertEncryptionConfigured, encryptSecret } from '@/lib/security/encryption'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

function validUrl(value: string, provider: string) {
  try {
    const u = new URL(value)
    if (u.username || u.password) return false
    const production = process.env.NODE_ENV === 'production'
    if (production && u.protocol !== 'https:') return false
    if (!production && u.protocol !== 'https:' && u.protocol !== 'http:') return false
    const host = u.hostname.toLowerCase().replace(/\.$/, '')
    if (production && (
      host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || host.endsWith('.test') || host === 'metadata.google.internal' ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[') ||
      host.endsWith('.nip.io') || host.endsWith('.sslip.io') || host.endsWith('.xip.io')
    )) return false
    const official: Record<string, string> = {
      openrouter: 'openrouter.ai',
      openai: 'api.openai.com',
      anthropic: 'api.anthropic.com',
    }
    if (provider !== 'custom' && official[provider] && host !== official[provider]) return false
    return true
  } catch {
    return false
  }
}

function mutationLimit(request: Request, userId: string) {
  return rateLimit(clientKey(request, userId) + ':provider-settings', 15, 60_000)
}

function limitedResponse(resetAt: number) {
  return NextResponse.json(
    { error: 'Muitas alterações de APIs. Aguarde antes de tentar novamente.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))) } },
  )
}

function authError(error: unknown) {
  return error instanceof Error && error.message === 'UNAUTHENTICATED'
}

export async function GET() {
  try {
    const { user, supabase } = await requireUser()
    const { data, error } = await supabase.from('api_credentials')
      .select('id,name,provider,base_url,model,enabled,priority,key_last4,created_at')
      .eq('user_id', user.id).order('priority', { ascending: true })
    if (error) throw error
    return NextResponse.json({
      providers: (data ?? []).map((x: any) => ({ ...x, keyLast4: x.key_last4, baseUrl: x.base_url ?? '' })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: authError(error) ? 'Não autenticado.' : 'Falha ao carregar APIs.' },
      { status: authError(error) ? 401 : 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = mutationLimit(request, user.id)
    if (!limit.allowed) return limitedResponse(limit.resetAt)
    const body = await request.json().catch(() => ({})) as any
    const name = String(body?.name ?? '').trim()
    const provider = String(body?.provider ?? '').trim()
    const model = String(body?.model ?? '').trim()
    const baseUrl = String(body?.baseUrl ?? '').trim()
    const key = String(body?.key ?? '').trim()
    if (!name || !model || !key || !['openrouter', 'openai', 'anthropic', 'custom'].includes(provider) ||
        !validUrl(baseUrl, provider) || name.length > 80 || model.length > 200 || key.length > 8192 || baseUrl.length > 500) {
      return NextResponse.json({ error: 'Dados da API inválidos.' }, { status: 400 })
    }
    try {
      assertEncryptionConfigured()
    } catch {
      return NextResponse.json({ error: 'A criptografia de credenciais não está configurada no servidor.' }, { status: 503 })
    }
    const { data: maxRows, error: maxError } = await supabase.from('api_credentials')
      .select('priority').eq('user_id', user.id).order('priority', { ascending: false }).limit(1)
    if (maxError) throw maxError
    const priority = Number(maxRows?.[0]?.priority ?? 0) + 10
    const { data, error } = await supabase.from('api_credentials').insert({
      user_id: user.id, name, provider, model, base_url: baseUrl,
      encrypted_key: encryptSecret(key), key_last4: key.slice(-4), priority, enabled: true,
    }).select('id,name,provider,base_url,model,enabled,priority,key_last4').single()
    if (error) throw error
    return NextResponse.json({ provider: { ...data, keyLast4: data.key_last4, baseUrl: data.base_url } }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: authError(error) ? 'Não autenticado.' : 'Falha ao adicionar API. Confira os dados e tente novamente.' },
      { status: authError(error) ? 401 : 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = mutationLimit(request, user.id)
    if (!limit.allowed) return limitedResponse(limit.resetAt)
    const body = await request.json().catch(() => ({})) as any
    const id = String(body?.id ?? '')
    const patch: Record<string, boolean | number> = {}
    if (typeof body?.enabled === 'boolean') patch.enabled = body.enabled
    if (body?.priority !== undefined) {
      const priority = Number(body.priority)
      if (!Number.isInteger(priority) || priority < 1 || priority > 9999) {
        return NextResponse.json({ error: 'Prioridade inválida.' }, { status: 400 })
      }
      patch.priority = priority
    }
    if (!/^[0-9a-f-]{36}$/i.test(id) || !Object.keys(patch).length) {
      return NextResponse.json({ error: 'Atualização inválida.' }, { status: 400 })
    }
    const { data, error } = await supabase.from('api_credentials').update(patch)
      .eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'API não encontrada.' }, { status: 404 })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: authError(error) ? 'Não autenticado.' : 'Falha ao atualizar API.' },
      { status: authError(error) ? 401 : 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = mutationLimit(request, user.id)
    if (!limit.allowed) return limitedResponse(limit.resetAt)
    const body = await request.json().catch(() => ({})) as any
    const id = String(body?.id ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'API inválida.' }, { status: 400 })
    const { data, error } = await supabase.from('api_credentials').delete()
      .eq('id', id).eq('user_id', user.id).select('id').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'API não encontrada.' }, { status: 404 })
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: authError(error) ? 'Não autenticado.' : 'Falha ao excluir API.' },
      { status: authError(error) ? 401 : 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
