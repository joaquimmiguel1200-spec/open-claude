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
    const paths = Array.isArray(body.paths) ? body.paths.map((value: unknown) => String(value).trim()).filter(Boolean).slice(0, 20) : []
    const repositoryParts = repository.split('/')
    const [owner, repoName] = repositoryParts
    if (repositoryParts.length !== 2 || !owner || !repoName || /\s/.test(repository) || /[?#]/.test(repository)) return NextResponse.json({ error: 'Informe um repositório no formato owner/repository.' }, { status: 400 })
    if (!branch || branch.length > 100 || /[^A-Za-z0-9._/-]/.test(branch) || branch.split('/').includes('..')) return NextResponse.json({ error: 'Branch inválida.' }, { status: 400 })
    if (paths.some((path: string) => !path || path.length > 240 || path.startsWith('/') || path.split('/').some((part) => !part || part === '..') || path.startsWith('.git/'))) {
      return NextResponse.json({ error: 'Lista de arquivos inválida.' }, { status: 400 })
    }

    const github = await createGitHubClientForUser(supabase, user.id)
    const files = []
    let totalBytes = 0
    for (const path of paths) {
      const file = await github.getFile(owner, repoName, path, branch, request.signal)
      totalBytes += Buffer.byteLength(file.content, 'utf8')
      if (totalBytes > 1_500_000) return NextResponse.json({ error: 'Os arquivos selecionados excedem o limite de 1,5 MB do terminal.' }, { status: 413 })
      files.push({ path: file.path, content: file.content })
    }

    const result = await runPersistentTerminal({
      scope: `${user.id}:code:${repository.toLowerCase()}:${branch}`,
      command,
      files,
      signal: request.signal,
      timeoutMs: 120_000,
    })
    return NextResponse.json({
      ok: result.status === 'completed',
      command,
      ...result,
      persistent: true,
      workspace: `${repository}@${branch}`,
      note: 'Workspace Linux persistente por repositório e branch. Arquivos carregados do GitHub são preservados entre comandos; a rede fica limitada a registros de pacotes.',
    }, { status: result.status === 'completed' ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'UNAUTHENTICATED' ? 401 : /Informe um comando|Informe um repositório|Branch inválida|Lista de arquivos|Caminho de arquivo|Arquivo grande demais/i.test(message) ? 400 : 500
    return NextResponse.json({ error: status === 500 ? 'Não foi possível iniciar o terminal persistente. Confira a conexão GitHub e a configuração do Vercel Sandbox.' : message }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
