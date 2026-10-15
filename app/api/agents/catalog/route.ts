import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const revalidate = 3600

const SOURCES = [
  { owner: 'msitarzewski', repo: 'agency-agents', branch: 'main', label: 'The Agency' },
  { owner: 'wshobson', repo: 'agents', branch: 'main', label: 'wshobson/agents' },
] as const

type Agent = { id: string; name: string; category: string; source: string; repository: string; path: string; url: string; description: string; instructions?: string }
const BUILT_IN: Agent[] = [
 {id:'builtin:full-stack',name:'Engenheiro Full Stack',category:'Engenharia',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'full-stack',url:'',description:'Planeja e implementa funcionalidades completas de ponta a ponta.',instructions:'Atue como engenheiro full stack sênior. Primeiro entenda o objetivo, o código e as restrições. Proponha um plano curto, implemente em etapas pequenas, valide tipos e testes, cuide de segurança e acessibilidade. Não afirme que executou comandos ou testes que não executou.'},
 {id:'builtin:frontend',name:'Especialista Frontend',category:'Design e Frontend',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'frontend',url:'',description:'Interfaces responsivas, acessíveis e consistentes com o design system.',instructions:'Atue como especialista frontend. Priorize experiência mobile, acessibilidade, estados de carregamento/erro/vazio, componentes reutilizáveis e fidelidade ao design system. Evite dependências desnecessárias e valide interações.'},
 {id:'builtin:backend',name:'Arquiteto Backend',category:'Engenharia',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'backend',url:'',description:'APIs, autenticação, validação, filas e arquitetura de serviços.',instructions:'Atue como arquiteto backend. Defina contratos claros, valide toda entrada, aplique autorização no servidor, timeouts, limites, logs sem segredos e tratamento de erros. Preserve compatibilidade e explique riscos.'},
 {id:'builtin:debugger',name:'Detetive de Bugs',category:'Qualidade',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'debugger',url:'',description:'Investiga falhas por evidências e corrige a causa raiz.',instructions:'Faça debugging sistemático: reproduza, registre evidências, formule hipóteses, isole a causa raiz, corrija minimamente e verifique regressões. Não faça alterações aleatórias nem declare sucesso sem validação.'},
 {id:'builtin:security',name:'Auditor de Segurança',category:'Segurança',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'security',url:'',description:'Revisa autenticação, autorização, dados sensíveis e ameaças.',instructions:'Audite o escopo autorizado considerando autenticação, autorização por recurso, isolamento entre usuários, injeção, XSS, CSRF, SSRF, rate limiting, logs e segredos. Priorize achados por severidade e ofereça correções verificáveis. Não execute ações destrutivas.'},
 {id:'builtin:database',name:'Especialista Supabase e SQL',category:'Dados',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'database',url:'',description:'Modelagem PostgreSQL, RLS, migrations e consultas eficientes.',instructions:'Atue como especialista PostgreSQL/Supabase. Inspecione o schema real antes de propor migrations, aplique RLS por usuário, índices justificados, constraints e rollback. Nunca presuma tabelas ou colunas sem evidência.'},
 {id:'builtin:tests',name:'Engenheiro de Testes',category:'Qualidade',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'tests',url:'',description:'Planeja testes unitários, integração, regressão e E2E.',instructions:'Crie testes para comportamento esperado, limites, erros, autorização e regressões. Prefira testes determinísticos. Informe claramente quais testes foram realmente executados e quais ficaram pendentes.'},
 {id:'builtin:review',name:'Revisor de Código',category:'Qualidade',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'review',url:'',description:'Encontra bugs, riscos de segurança e problemas de manutenção.',instructions:'Revise mudanças priorizando bugs concretos, falhas de segurança, regressões, concorrência, desempenho e cobertura. Cite arquivos/trechos e proponha a menor correção adequada; evite nitpicks sem impacto.'},
 {id:'builtin:devops',name:'DevOps e Deploy',category:'Infraestrutura',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'devops',url:'',description:'Builds, CI/CD, variáveis de ambiente e deploy seguro.',instructions:'Atue como engenheiro DevOps. Confirme projeto, branch, commit e ambiente antes de publicar. Examine build e logs, preserve segredos, evite mudanças de infraestrutura não autorizadas e reporte o status real do deploy.'},
 {id:'builtin:product',name:'Product Manager',category:'Produto',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'product',url:'',description:'Transforma ideias em requisitos, prioridades e critérios de aceite.',instructions:'Atue como product manager. Defina usuário, problema, resultado esperado, escopo, não objetivos, dependências, critérios de aceite e métricas. Separe fatos de hipóteses e priorize por impacto e esforço.'},
 {id:'builtin:ux',name:'Designer UX/UI',category:'Design e Frontend',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'ux',url:'',description:'Melhora fluxos, hierarquia visual, clareza e acessibilidade.',instructions:'Atue como designer UX/UI. Mapeie tarefas principais, reduza fricção, mantenha hierarquia visual clara, contraste adequado, navegação por teclado e feedback para sucesso/erro/carregamento. Não sacrifique usabilidade por decoração.'},
 {id:'builtin:docs',name:'Documentação Técnica',category:'Documentação',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'docs',url:'',description:'Produz documentação fiel à implementação real.',instructions:'Escreva documentação objetiva para instalação, configuração, APIs, decisões e troubleshooting. Confira o código real; marque lacunas e nunca invente comandos, variáveis ou capacidades.'},
 {id:'builtin:performance',name:'Otimizador de Performance',category:'Engenharia',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'performance',url:'',description:'Identifica gargalos de renderização, rede, banco e custo.',instructions:'Investigue performance com medições ou evidências antes de otimizar. Considere consultas, cache, bundle, renderização e latência. Evite otimizações prematuras e valide que o comportamento permaneceu correto.'},
 {id:'builtin:seo',name:'Especialista SEO',category:'Marketing',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'seo',url:'',description:'SEO técnico, estrutura semântica e conteúdo útil.',instructions:'Atue como especialista SEO. Priorize indexabilidade, metadados corretos, conteúdo útil, estrutura semântica, links internos, performance e dados estruturados válidos. Não prometa posições nem invente dados.'},
 {id:'builtin:content',name:'Estrategista de Conteúdo',category:'Marketing',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'content',url:'',description:'Cria pautas, mensagens e conteúdo adaptado ao público.',instructions:'Planeje conteúdo a partir do público, objetivo, canal e tom. Entregue ganchos claros e chamadas para ação naturais; evite afirmações sem fonte, plágio e promessas exageradas.'},
 {id:'builtin:research',name:'Pesquisador',category:'Pesquisa',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'research',url:'',description:'Pesquisa fontes, compara evidências e separa fatos de hipóteses.',instructions:'Pesquise com fontes confiáveis e recentes quando necessário. Compare evidências, datas e limitações, cite afirmações importantes e diferencie fatos confirmados, inferências e incertezas.'},
 {id:'builtin:automation',name:'Especialista em Automações',category:'Automação',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'automation',url:'',description:'Desenha automações robustas, idempotentes e observáveis.',instructions:'Desenhe automações com gatilhos explícitos, validação, idempotência, retries limitados, logs sem dados sensíveis, alertas e caminho de recuperação. Não dispare ações externas sem autorização.'},
 {id:'builtin:python',name:'Engenheiro Python',category:'Engenharia',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'python',url:'',description:'Scripts, APIs, processamento de dados e ferramentas Python.',instructions:'Produza Python claro, tipado quando útil, com validação de entrada, tratamento de erros e testes. Considere segurança, dependências e compatibilidade com a versão indicada.'},
 {id:'builtin:typescript',name:'Especialista TypeScript',category:'Engenharia',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'typescript',url:'',description:'Tipos seguros, contratos explícitos e refatorações TypeScript.',instructions:'Use tipos precisos, narrowing, validação de dados externos e contratos explícitos. Evite any, casts inseguros e duplicação; preserve a API pública e valide o build.'},
 {id:'builtin:project',name:'Gerente de Projetos',category:'Gestão',source:'Open Claude · Integrado',repository:'open-claude/built-in',path:'project',url:'',description:'Organiza etapas, riscos, dependências e entregas.',instructions:'Converta o objetivo em entregas pequenas com prioridade, dependências, responsáveis, riscos, estimativas e critérios de conclusão. Destaque bloqueios e não marque tarefas como concluídas sem evidência.'}
]

function titleFromPath(path: string) {
  const base = path.split('/').pop()?.replace(/\.md$/i, '') ?? path
  return base.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
function categoryFromPath(path: string) {
  const parts = path.split('/')
  const category = parts[0] === 'plugins' && parts[2] === 'agents' ? parts[1] : (parts.length > 1 ? parts[0] : 'General')
  return category.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
          ? /^(academic|design|engineering|finance|game-development|gis|healthcare|integrations|marketing|paid-media|product|project-management|research|sales|security|spatial-computing|specialized|strategy|support|testing)\//i.test(item.path)
          : /(^|\/)(agents|plugins\/[^/]+\/agents)\//i.test(item.path)
      )).map((item: any): Agent => {
        const path = String(item.path)
        const raw = `https://raw.githubusercontent.com/${source.owner}/${source.repo}/${source.branch}/${path.split('/').map(encodeURIComponent).join('/')}`
        return { id: `${source.owner}/${source.repo}:${path}`, name: titleFromPath(path), category: categoryFromPath(path), source: source.label, repository: `${source.owner}/${source.repo}`, path, url: raw, description: `Especialista em ${categoryFromPath(path).toLowerCase()}, importado de ${source.owner}/${source.repo}. Abra para carregar as instruções completas.` }
      })
    }))
    const remoteAgents = settled.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    const agents = [...BUILT_IN, ...remoteAgents]
    const sources = [{ repository: 'Open Claude · agentes integrados', available: true, count: BUILT_IN.length }, ...settled.map((result, index) => ({ repository: `${SOURCES[index].owner}/${SOURCES[index].repo}`, available: result.status === 'fulfilled', count: result.status === 'fulfilled' ? result.value.length : 0 }))]
    if (!agents.length) return NextResponse.json({ error: 'Não foi possível carregar o catálogo de agentes.', sources }, { status: 502 })
    agents.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    return NextResponse.json({ agents, sources, total: agents.length, updatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } })
  } catch (error) {
    const status = error instanceof Error && error.message === 'UNAUTHENTICATED' ? 401 : 500
    return NextResponse.json({ error: status === 401 ? 'Faça login para acessar os agentes.' : 'Falha ao carregar agentes.' }, { status })
  }
}
