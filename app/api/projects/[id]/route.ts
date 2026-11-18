import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function validSettings(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const instructions = typeof input.instructions === 'string' ? input.instructions.trim().slice(0, 8000) : ''
  const defaultMode = ['chat', 'code', 'cowork'].includes(String(input.defaultMode)) ? String(input.defaultMode) : 'chat'
  const model = typeof input.model === 'string' ? input.model.trim().slice(0, 200) : ''
  const ids = (key: string) => Array.isArray(input[key]) ? (input[key] as unknown[]).filter((v): v is string => typeof v === 'string' && /^[a-zA-Z0-9:_./-]{1,300}$/.test(v)).slice(0, 600) : []\n  return { instructions, defaultMode, model, ...(Array.isArray(input.selectedAgentIds) ? { selectedAgentIds: ids('selectedAgentIds') } : {}), ...(Array.isArray(input.selectedSkillIds) ? { selectedSkillIds: ids('selectedSkillIds') } : {}) }
}

function projectIdFrom(request: Request) {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  const id = segments.at(-1) ?? ''
  return /^[0-9a-f-]{36}$/i.test(id) ? id : ''
}

export async function GET(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const id = projectIdFrom(request)
    if (!id) return NextResponse.json({ error: 'Projeto inválido.' }, { status: 400 })
    const { data, error } = await supabase.from('projects').select('id,name,description,settings,created_at,updated_at').eq('id', id).eq('owner_id', user.id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    return NextResponse.json({ project: data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Falha ao carregar o projeto.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const id = projectIdFrom(request)
    if (!id) return NextResponse.json({ error: 'Projeto inválido.' }, { status: 400 })
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const { data: current, error: readError } = await supabase.from('projects').select('id,settings').eq('id', id).eq('owner_id', user.id).maybeSingle()
    if (readError) throw readError
    if (!current) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    const incoming = validSettings(body.settings)
    if (!incoming) return NextResponse.json({ error: 'Configurações inválidas.' }, { status: 400 })
    const settings = { ...(current.settings ?? {}), ...incoming }
    const { error } = await supabase.from('projects').update({ settings, updated_at: new Date().toISOString() }).eq('id', id).eq('owner_id', user.id)
    if (error) throw error
    return NextResponse.json({ ok: true, settings }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível salvar as configurações do projeto.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}


export async function DELETE(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const id = projectIdFrom(request)
    if (!id) return NextResponse.json({ error: 'Projeto inválido.' }, { status: 400 })
    const { data, error } = await supabase.from('projects').delete().eq('id', id).eq('owner_id', user.id).select('id').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
    return NextResponse.json({ ok: true, chatsUnassigned: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : 'Não foi possível excluir o projeto.' }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
