import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createVercelSandboxRunner } from '@/lib/sandbox/vercel-sandbox-runner'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
const allowed = new Set(['pwd','ls','node','python3','npm','pnpm','yarn'])
const forbidden = /[;&|<>$\x60\n\r]/

function parseCommand(raw: string): string[] {
  const value = raw.trim()
  if (!value || value.length > 300 || forbidden.test(value)) throw new Error('Comando vazio, muito longo ou com operadores de shell não permitidos.')
  const args = value.split(/\s+/)
  if (!allowed.has(args[0])) throw new Error('Comando não permitido no terminal Cowork.')
  if (['npm','pnpm','yarn'].includes(args[0]) && !['--version','-v','version','run'].includes(args[1] ?? '')) throw new Error('O terminal Cowork permite apenas consulta de versão e scripts já presentes na sandbox.')
  if (args.some(arg => arg.includes('..') || arg.startsWith('/') || arg.startsWith('-e'))) throw new Error('Argumento ou caminho não permitido.')
  return args
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':cowork-terminal', 10, 60_000)
    if (!limit.allowed) return NextResponse.json({ error: 'Limite do terminal Cowork atingido.' }, { status: 429 })
    const body = await request.json().catch(() => ({})) as any
    const command = parseCommand(String(body.command ?? ''))
    const runner = createVercelSandboxRunner()
    const result = await runner.run({ image: 'node22', command, files: [], workingDirectory: '/vercel/sandbox', allowNetwork: false, limits: { timeoutMs: 20_000, cpus: 1 } }, request.signal)
    return NextResponse.json({ ok: result.status === 'completed', command, ...result, note: 'Terminal Cowork temporário e isolado, sem rede e sem persistência de arquivos.' }, { status: result.status === 'completed' ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const status = message === 'UNAUTHENTICATED' ? 401 : /Comando|argumento|caminho|terminal Cowork/i.test(message) ? 400 : 500
    return NextResponse.json({ error: status === 500 ? 'Não foi possível iniciar o terminal Cowork.' : message }, { status, headers: { 'Cache-Control': 'no-store' } })
  }
}