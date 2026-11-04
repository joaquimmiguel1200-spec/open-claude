import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createGitHubClientForUser } from '@/lib/github/user-github-client'
import { createVercelSandboxRunner } from '@/lib/sandbox/vercel-sandbox-runner'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
const allowed = new Set(['pwd','ls','cat','head','grep','node','npm','pnpm','yarn','git','tsc','next','python3'])
const forbidden = /[;&|<>$\x60\n\r]/

function parseCommand(raw: string): string[] {
  const value = raw.trim()
  if (!value || value.length > 400 || forbidden.test(value)) throw new Error('Comando vazio, muito longo ou com operadores de shell não permitidos.')
  const args = value.split(/\s+/)
  if (!allowed.has(args[0])) throw new Error('Comando não permitido neste terminal isolado.')
  const sub = args[1] ?? ''
  if (args[0] === 'git' && !['status','log','diff','show','branch'].includes(sub)) throw new Error('O terminal permite apenas git status, log, diff, show e branch.')
  if (['npm','pnpm','yarn'].includes(args[0]) && !['test','run','build','lint','version','--version','-v'].includes(sub)) throw new Error('Gerenciadores de pacotes permitem somente test, run, build, lint e consulta de versão. A rede fica bloqueada.')
  if (args.some((arg) => arg.includes('..') || arg.startsWith('/') || (arg.startsWith('-e') && args[0] === 'node'))) throw new Error('Argumento ou caminho não permitido.')
  return args
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':code-terminal', 12, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Limite do terminal atingido. Aguarde um minuto.' }, { status: 429 })
    const body = await request.json().catch(() => ({})) as any
    const command = parseCommand(String(body.command ?? ''))
    const repository = String(body.repository ?? '').trim()
    const branch = String(body.branch ?? 'main').trim()
    const paths = Array.isArray(body.paths) ? body.paths.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 20) : []
    if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) return NextResponse.json({ error: 'Informe um repositório no formato owner/repository.' }, { status: 400 })
    if (paths.some((path: string) => !path || path.length > 240 || path.startsWith('/') || path.split('/').includes('..') || path.startsWith('.git/'))) return NextResponse.json({ error: 'Lista de arquivos inválida.' }, { status: 400 })
    const [owner, repo] = repository.split('/')
    const github = await createGitHubClientForUser(supabase, user.id)
    const files = []
    for (const path of paths) {
      const file = await github.getFile(owner, repo, path, branch, request.signal)
      if (file.content.length > 180_000) return NextResponse.json({ error: 'Arquivo grande demais para a sessão do terminal.' }, { status: 413 })
      files.push({ path: file.path, content: file.content })
    }
    const runner = createVercelSandboxRunner()
    const result = await runner.run({ image: 'node22', command, files, workingDirectory: '/vercel/sandbox', allowNetwork: false, limits: { timeoutMs: 30_000, cpus: 1 } }, request.signal)
    return NextResponse.json({ ok: result.status === 'completed', command, ...result, note: 'Terminal descartável: cada comando inicia uma sandbox isolada, sem rede e sem persistência de arquivos. As alterações devem ser aplicadas pelo fluxo Code após revisão e testes.' }, { status: result.status === 'completed' ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'UNAUTHENTICATED' ? 401 : /Comando|argumento|caminho|Gerenciadores|git status|terminal permite/i.test(message) ? 400 : 500
    return NextResponse.json({ error: status === 500 ? 'Não foi possível iniciar o terminal. Confira a conexão GitHub e a configuração de sandbox.' : message }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}
