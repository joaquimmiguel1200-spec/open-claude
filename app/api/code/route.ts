import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { userAIProviders } from '@/lib/ai/user-providers'
import { generateAI } from '@/lib/ai'
import { createGitHubClientFromEnv } from '@/lib/github/github-client'
import { createCodeAgent } from '@/lib/code-agent/code-agent'
import type { AIRoutingStrategy } from '@/types/ai'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'
import { createVercelSandboxRunner } from '@/lib/sandbox/vercel-sandbox-runner'

export const runtime = 'nodejs'

function extractJson(content: string): any {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const raw = (fenced?.[1] ?? content).trim()
  return JSON.parse(raw)
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id), 10, 60000)
    if (!limit.allowed) return NextResponse.json({ error: 'Muitas solicitações Code. Tente novamente em instantes.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } })
    const body = await request.json() as any
    const goal = String(body?.goal ?? '').trim()
    const repository = String(body?.repository ?? process.env.GITHUB_REPOSITORY ?? '').trim()
    const branch = String(body?.branch ?? process.env.GITHUB_DEFAULT_BRANCH ?? 'main').trim()
    const paths = Array.isArray(body?.paths) ? body.paths.map((p: unknown) => String(p).trim()).filter(Boolean).slice(0, 20) : []
    const apply = body?.apply === true
    const testCommand = typeof body?.testCommand === 'string' ? body.testCommand.trim() : ''
    const strategies: AIRoutingStrategy[] = ['auto','quality','cost','latency','free']
    const strategy = strategies.includes(body?.strategy) ? body.strategy : 'free'
    if (!goal || goal.length > 12000) return NextResponse.json({ error: 'O objetivo Code é obrigatório.' }, { status: 400 })
    if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) return NextResponse.json({ error: 'Informe repository no formato owner/repository.' }, { status: 400 })
    if (!paths.length) return NextResponse.json({ error: 'Informe pelo menos um caminho de arquivo para o Code Agent analisar.' }, { status: 400 })

    const [owner, repo] = repository.split('/')
    const github = createGitHubClientFromEnv()
    const snapshots = [] as Array<{ path: string; sha: string; content: string }>
    for (const path of paths) {
      const file = await github.getFile(owner, repo, path, branch, request.signal)
      snapshots.push({ path: file.path, sha: file.sha, content: file.content })
    }

    const providers = await userAIProviders(supabase, user.id)
    const response = await generateAI({
      model: typeof body?.model === 'string' ? body.model.trim() : undefined,
      strategy,
      signal: request.signal,
      maxTokens: 24000,
      messages: [
        { role: 'system', content: 'You are Open Claude Code. Return ONLY valid JSON with this shape: {"summary":string,"commitMessage":string,"edits":[{"path":string,"content":string}]}. Preserve project architecture. Only edit files supplied in CONTEXT. Do not invent files. Produce complete file contents, not patches.' },
        { role: 'user', content: `GOAL:\n${goal}\n\nREPOSITORY:\n${repository}\nBRANCH:\n${branch}\n\nCONTEXT:\n${snapshots.map((file) => `FILE: ${file.path}\nSHA: ${file.sha}\nCONTENT:\n${file.content}`).join('\n\n')}` },
      ],
      metadata: { mode: 'code', userId: user.id, repository, branch, strategy },
    }, providers)

    const plan = extractJson(response.content)
    if (!plan || !Array.isArray(plan.edits) || !plan.edits.length) return NextResponse.json({ error: 'O modelo não produziu alterações válidas.', raw: response.content }, { status: 422 })

    const allowed = new Map(snapshots.map((file) => [file.path, file.sha]))
    const edits = plan.edits.map((edit: any) => {
      const path = String(edit?.path ?? '').trim()
      if (!allowed.has(path)) throw new Error(`O modelo tentou alterar um caminho não autorizado: ${path}`)
      return { path, kind: 'update' as const, content: String(edit?.content ?? ''), expectedSha: allowed.get(path) }
    })

    if (!apply) return NextResponse.json({ mode: 'code', applied: false, repository, branch, summary: String(plan.summary ?? ''), commitMessage: String(plan.commitMessage ?? 'Open Claude Code changes'), edits, model: response.model, provider: response.provider }, { headers: { 'Cache-Control': 'no-store' } })

    const sandboxRunner=createVercelSandboxRunner()
    const testConfig=testCommand?{image:'node22',commands:[testCommand.split(/\s+/).filter(Boolean)],files:snapshots.map(x=>({path:x.path,content:x.content})),allowNetwork:false,workingDirectory:'/vercel/sandbox'}:undefined
    const agent = createCodeAgent(github,{
      sandboxRunner,
      maxTestIterations:3,
      revise: async (ctx)=>{
        const revision=await generateAI({
          model:typeof body?.model==='string'?body.model.trim():undefined,
          strategy,
          signal:request.signal,
          maxTokens:24000,
          messages:[
            {role:'system',content:'You are Open Claude Code. Return ONLY valid JSON: {"edits":[{"path":string,"content":string}]}. Fix the failing sandbox tests. Only edit files originally supplied.'},
            {role:'user',content:`GOAL:\n${goal}\n\nITERATION: ${ctx.iteration}\n\nFAILURES:\n${ctx.tests.filter(t=>!t.success).map(t=>t.command.join(' ')+'\\nSTDOUT:\n'+t.stdout+'\\nSTDERR:\n'+t.stderr).join('\\n\\n')}\n\nCURRENT FILES:\n${ctx.edits.map(x=>'FILE: '+x.path+'\\n'+x.content).join('\\n\\n')}`}
          ],
          metadata:{mode:'code-revision',userId:user.id,repository,branch,strategy}
        },providers)
        const revised=extractJson(revision.content)
        return Array.isArray(revised?.edits)?revised.edits.map((x:any)=>{const old=edits.find(e=>e.path===String(x.path));return {path:String(x.path),kind:'update' as const,content:String(x.content??''),expectedSha:old?.expectedSha}}):null
      }
    })
    const result = await agent.run({ repository, branch, goal, edits, commitMessage: String(plan.commitMessage ?? 'Open Claude Code changes'), ...(testConfig?{test:testConfig}: {}) })
    return NextResponse.json({ mode: 'code', applied: result.success, repository, branch, summary: String(plan.summary ?? ''), result, model: response.model, provider: response.provider, testCommand: testCommand||null }, { status: result.success ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível executar o Code Agent.'
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : message }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
