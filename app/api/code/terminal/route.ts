import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createGitHubClientForUser } from '@/lib/github/user-github-client'
import { runPersistentTerminal } from '@/lib/sandbox/persistent-terminal'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':code-terminal', 12, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Limite do terminal atingido. Aguarde um minuto.' }, { status: 429 })

    const body = await request.json().catch(() => ({})) as any
    const command = String(body.command ?? '').trim()
    if (!command || command.length > 2_000) return NextResponse.json({ error: 'Informe um comando com até 2.000 caracteres.' }, { status: 400 })

    const repository = String(body.repository ?? '').trim()
    const branch = String(body.branch ?? 'main').trim()
    const chatId = typeof body.chatId === 'string' ? body.chatId : null
    const projectId = typeof body.projectId === 'string' ? body.projectId : null
    const requestedPaths = Array.isArray(body.paths) ? body.paths.map((value: unknown) => String(value).trim()).filter(Boolean).slice(0, 30) : []
    const repositoryParts = repository ? repository.split('/') : []
    const [owner, repoName] = repositoryParts
    if (repository && (repositoryParts.length !== 2 || !owner || !repoName || /\s/.test(repository) || /[?#]/.test(repository))) return NextResponse.json({ error: 'Informe um repositório no formato owner/repository.' }, { status: 400 })
    if (!branch || branch.length > 100 || /[^A-Za-z0-9._/-]/.test(branch) || branch.split('/').includes('..')) return NextResponse.json({ error: 'Branch inválida.' }, { status: 400 })
    if (chatId) { const { data } = await supabase.from('chats').select('id').eq('id', chatId).eq('owner_id', user.id).maybeSingle(); if (!data) return NextResponse.json({ error: 'Conversa não encontrada ou não autorizada.' }, { status: 404 }) }
    if (projectId) { const { data } = await supabase.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle(); if (!data) return NextResponse.json({ error: 'Projeto não encontrado ou não autorizado.' }, { status: 403 }) }
    if (requestedPaths.some((path: string) => !path || path.length > 240 || path.startsWith('/') || path.split('/').some((part) => !part || part === '..') || path.startsWith('.git/'))) {
      return NextResponse.json({ error: 'Lista de arquivos inválida.' }, { status: 400 })
    }

    const files = []
    if (repository) {
      const github = await createGitHubClientForUser(supabase, user.id)
      let totalBytes = 0
      const tree = await github.listFiles(owner, repoName, branch, request.signal)
      const paths = requestedPaths.length ? requestedPaths : tree.filter(file => /\\.(tsx?|jsx?|mjs|cjs|json|css|scss|html|md|mdx|py|sql|ya?ml|toml|sh|go|rs|java|kt|swift|php|rb|vue|svelte|astro)$/i.test(file.path) && !/(^|\\/)(node_modules|\\.git|\\.next|dist|build|coverage|vendor)(\\/|$)/i.test(file.path)).slice(0, 50).map(file => file.path)
      for (const path of paths) {
        const treeFile = tree.find(file => file.path === path)
        if (!treeFile) return NextResponse.json({ error: 'Caminho não encontrado no repositório: ' + path }, { status: 400 })
        if (treeFile.size > 180_000) continue
        const file = await github.getFile(owner, repoName, path, branch, request.signal)
        totalBytes += Buffer.byteLength(file.content, 'utf8')
        if (totalBytes > 1_500_000) return NextResponse.json({ error: 'O workspace excede o limite de 1,5 MB do terminal.' }, { status: 413 })
        files.push({ path: file.path, content: file.content })
      }
    }
    const scope = repository ? `${user.id}:code:${repository.toLowerCase()}:${branch}` : projectId ? `${user.id}:code:project:${projectId}` : chatId ? `${user.id}:code:chat:${chatId}` : `${user.id}:code:default`
    const result = await runPersistentTerminal({ scope, command, files, signal: request.signal, timeoutMs: 120_000 })
    return NextResponse.json({
      ok: result.status === 'completed',
      command,
      ...result,
      persistent: true,
      workspace: repository ? `${repository}@${branch}` : projectId ? `Projeto ${projectId}` : chatId ? `Conversa ${chatId}` : 'Workspace pessoal',
      note: repository ? 'Workspace Linux persistente por repositório e branch. Arquivos carregados do GitHub são preservados entre comandos; a rede fica limitada a registros de pacotes.' : 'Workspace Linux persistente independente do GitHub, separado por projeto ou conversa; a rede fica limitada a registros de pacotes.',
    }, { status: result.status === 'completed' ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'UNAUTHENTICATED' ? 401 : /Informe um comando|Branch inválida|Lista de arquivos|Caminho de arquivo|Arquivo grande demais/i.test(message) ? 400 : 500
    return NextResponse.json({ error: status === 500 ? 'Não foi possível iniciar o terminal persistente. Confira a conexão GitHub e a configuração do Vercel Sandbox.' : message }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
