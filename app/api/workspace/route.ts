import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { user, supabase } = await requireUser()
    const [{ data: projects, error: projectsError }, { data: chats, error: chatsError }, { data: profile }] = await Promise.all([
      supabase.from('projects').select('id,name,description,settings,created_at,updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('chats').select('id,project_id,title,model,metadata,created_at,updated_at').eq('owner_id', user.id).order('updated_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('display_name,avatar_url,preferences').eq('id', user.id).maybeSingle(),
    ])
    if (projectsError) throw new Error(projectsError.message)
    if (chatsError) throw new Error(chatsError.message)
    return NextResponse.json({ projects: projects ?? [], chats: chats ?? [], profile: profile ?? { display_name: user.email?.split('@')[0] ?? 'User', preferences: {} } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar o workspace.'
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const body = await request.json()
    const action = body?.action

    if (action === 'project') {
      const name = String(body?.name ?? '').trim().slice(0, 200)
      const description = String(body?.description ?? '').trim().slice(0, 1000) || null
      if (!name) return NextResponse.json({ error: 'Nome do projeto é obrigatório.' }, { status: 400 })
      const { data, error } = await supabase.from('projects').insert({ owner_id: user.id, name, description }).select('id,name,description,settings,created_at,updated_at').single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ project: data })
    }

    if (action === 'chat') {
      const title = String(body?.title ?? 'Nova conversa').trim().slice(0, 200) || 'Nova conversa'
      const projectId = typeof body?.projectId === 'string' ? body.projectId : null
      if (projectId) {
        const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle()
        if (!project) return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 })
      }
      const { data, error } = await supabase.from('chats').insert({ owner_id: user.id, project_id: projectId, title, model: body?.model ?? null, metadata: { mode: body?.mode ?? 'chat' } }).select('id,project_id,title,model,metadata,created_at,updated_at').single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ chat: data })
    }

    if (action === 'preferences') {
      const preferences = body?.preferences && typeof body.preferences === 'object' ? body.preferences : {}
      const displayName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 120) : undefined
      const { data, error } = await supabase.from('profiles').upsert({ id: user.id, ...(displayName ? { display_name: displayName } : {}), preferences, updated_at: new Date().toISOString() }).select('display_name,avatar_url,preferences').single()
      if (error) throw new Error(error.message)
      return NextResponse.json({ profile: data })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível atualizar o workspace.'
    return NextResponse.json({ error: message }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
