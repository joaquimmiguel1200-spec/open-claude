import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { runPersistentTerminal } from '@/lib/sandbox/persistent-terminal'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':cowork-terminal', 20, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Limite do terminal Cowork atingido. Aguarde um minuto.' }, { status: 429 })

    const body = await request.json().catch(() => ({})) as any
    const command = String(body.command ?? '').trim()
    const chatId = typeof body.chatId === 'string' ? body.chatId : null
    const projectId = typeof body.projectId === 'string' ? body.projectId : null
    if (!command || command.length > 2_000) return NextResponse.json({ error: 'Informe um comando com até 2.000 caracteres.' }, { status: 400 })

    if (chatId) {
      const { data: chat } = await supabase.from('chats').select('id,project_id').eq('id', chatId).eq('owner_id', user.id).maybeSingle()
      if (!chat) return NextResponse.json({ error: 'Conversa não encontrada ou não autorizada.' }, { status: 404 })
      if (projectId && chat.project_id !== projectId) return NextResponse.json({ error: 'A conversa não pertence ao projeto selecionado.' }, { status: 403 })
    }
    if (projectId) {
      const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle()
      if (!project) return NextResponse.json({ error: 'Projeto não encontrado ou não autorizado.' }, { status: 403 })
    }

    const scope = projectId ? `${user.id}:cowork:project:${projectId}` : chatId ? `${user.id}:cowork:chat:${chatId}` : `${user.id}:cowork:default`
    const result = await runPersistentTerminal({ scope, command, signal: request.signal, timeoutMs: 120_000 })
    return NextResponse.json({
      ok: result.status === 'completed',
      command,
      ...result,
      persistent: true,
      note: 'Workspace Cowork persistente e isolado. Arquivos e diretórios continuam disponíveis entre comandos e após atualizar a página; a rede fica limitada a registros de pacotes.',
    }, { status: result.status === 'completed' ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'UNAUTHENTICATED' ? 401 : /Informe um comando|Caminho de arquivo|Arquivo grande demais/i.test(message) ? 400 : 500
    return NextResponse.json({ error: status === 500 ? 'Não foi possível iniciar o terminal persistente do Cowork.' : message }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
