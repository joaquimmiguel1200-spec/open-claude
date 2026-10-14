import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const revalidate = 3600

const SOURCES = [
  { owner: 'msitarzewski', repo: 'agency-agents', branch: 'main', label: 'The Agency' },
  { owner: 'wshobson', repo: 'agents', branch: 'main', label: 'wshobson/agents' },
] as const

type Agent = { id: string; name: string; category: string; source: string; repository: string; path: string; url: string; description: string }

function titleFromPath(path: string) {
  const base = path.split('/').pop()?.replace(/\.md$/i, '') ?? path
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function categoryFromPath(path: string) {
  const parts = path.split('/')
  return (parts.length > 1 ? parts[0] : 'General').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
async function getTree(owner: string, repo: string, branch: string): Promise<any[]> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Open-Claude-Agent-Catalog', 'X-GitHub-Api-Version': '2022-11-28' },
    next: { revalidate: 3600 },
  })
  if (!response.ok) throw new Error(`GitHub catalogue unavailable for ${owner}/${repo} (${response.status})`)
  const data = await response.json()
  if (data.truncated) throw new Error(`GitHub tree truncated for ${owner}/${repo}`)
  return data.tree ?? []
}
export async function GET() {
  try {
    await requireUser()
    const settled = await Promise.allSettled(SOURCES.map(async source => {
      const tree = await getTree(source.owner, source.repo, source.branch)
      return tree.filter((item: any) => item.type === 'blob' && /\.md$/i.test(item.path) && !/(^|\/)(readme|contributing|license|changelog|code_of_conduct)(\.md)?$/i.test(item.path) && (
        source.repo === 'agency-agents'
          ? /^(engineering|design|marketing|product|project-management|testing|support|spatial-computing|specialized|paid-media|strategy|sales|finance|legal|operations|game-development|academic|business|data|security|hr|social-media)\//i.test(item.path)
          : /(^|\/)(agents|plugins\/[^/]+\/agents)\//i.test(item.path)
      )).map((item: any): Agent => {
        const path = String(item.path)
        const raw = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.branch}/${path.split('/').map(encodeURIComponent).join('/')}`
        return { id: `${source.owner}/${source.repo}:${path}`, name: titleFromPath(path), category: categoryFromPath(path), source: source.label, repository: `${source.owner}/${source.repo}`, path, url: raw, description: `Agente especializado importado do repositório ${source.owner}/${source.repo}.` }
      })
    }))
    const agents = settled.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    const sources = settled.map((result, index) => ({ repository: `${SOURCES[index].owner}/${SOURCES[index].repo}`, available: result.status === 'fulfilled', count: result.status === 'fulfilled' ? result.value.length : 0 }))
    if (!agents.length) return NextResponse.json({ error: 'Não foi possível carregar o catálogo de agentes.', sources }, { status: 502 })
    agents.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    return NextResponse.json({ agents, sources, total: agents.length, updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } })
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Faça login para acessar os agentes.' : 'Falha ao carregar agentes.' }, { status })
  }
}
