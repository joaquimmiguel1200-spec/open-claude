import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
const ALLOWED = new Set(['msitarzewski/agency-agents', 'wshobson/agents', 'codenamev/ai-software-architect', 'softaworks/agent-toolkit'])
export async function GET(request: Request) {
  try {
    await requireUser()
    const url = new URL(request.url)
    const repository = url.searchParams.get('repository') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (!ALLOWED.has(repository) || !path || path.length > 300 || path.startsWith('/') || path.split('/').some(part => !part || part === '.' || part === '..') || !path.endsWith('.md')) {
      return NextResponse.json({ error: 'Agente inválido.' }, { status: 400 })
    }
    const [owner, repo] = repository.split('/')
    const branch = 'main'
    const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`
    const response = await fetch(raw, { headers: { 'User-Agent': 'Open-Claude-Agent-Catalog' }, signal: AbortSignal.timeout(10000), next: { revalidate: 3600 } })
    if (!response.ok) return NextResponse.json({ error: 'Não foi possível carregar as instruções do agente.' }, { status: 502 })
    const instructions = (await response.text()).slice(0, 50000)
    return NextResponse.json({ instructions, repository, path }, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } })
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Faça login para acessar os agentes.' : 'Falha ao carregar o agente.' }, { status })
  }
}
