import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { createPersistence } from '@/lib/supabase/persistence'
import { userAIProviders } from '@/lib/ai/user-providers'
import { generateAI } from '@/lib/ai'
import { createGitHubClientForUser } from '@/lib/github/user-github-client'
import { createCodeAgent } from '@/lib/code-agent/code-agent'
import type { AIRoutingStrategy } from '@/types/ai'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'
import { createVercelSandboxRunner } from '@/lib/sandbox/vercel-sandbox-runner'
import { runAgentProfiles } from '@/lib/agent/profile-orchestrator'
import { loadModeSkillInstructions } from '@/lib/skills/mode-skill-loader'
import { runMcpReadTools } from '@/lib/mcp/mode-runner'

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
    const chatId = typeof body?.chatId === 'string' ? body.chatId : null
    const projectId = typeof body?.projectId === 'string' ? body.projectId : null
    const persistence = createPersistence(supabase)
    if (chatId) { const { data: chat } = await supabase.from('chats').select('id').eq('id', chatId).eq('owner_id', user.id).maybeSingle(); if (!chat) return NextResponse.json({ error: 'Conversa não encontrada ou não autorizada.' }, { status: 404 }) }
    if (projectId) { const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle(); if (!project) return NextResponse.json({ error: 'Projeto não encontrado ou não autorizado.' }, { status: 403 }) }
    const strategies: AIRoutingStrategy[] = ['auto','quality','cost','latency','free']
    const strategy = strategies.includes(body?.strategy) ? body.strategy : 'free'
    if (!goal || goal.length > 12000) return NextResponse.json({ error: 'O objetivo Code é obrigatório.' }, { status: 400 })
    if (apply && !testCommand) return NextResponse.json({ error: 'Para aplicar e publicar alterações, informe um comando de teste. Sem teste, use a prévia de alterações sem aplicar.' }, { status: 400 })
    if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) return NextResponse.json({ error: 'Informe repository no formato owner/repository.' }, { status: 400 })
    if (!paths.length) return NextResponse.json({ error: 'Informe pelo menos um caminho de arquivo para o Code Agent analisar.' }, { status: 400 })

    const [owner, repo] = repository.split('/')
    const github = await createGitHubClientForUser(supabase, user.id)
    const snapshots = [] as Array<{ path: string; sha: string; content: string }>
    for (const path of paths) {
      const file = await github.getFile(owner, repo, path, branch, request.signal)
      snapshots.push({ path: file.path, sha: file.sha, content: file.content })
    }

    const providers = await userAIProviders(supabase, user.id)
    const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', user.id).maybeSingle()
    const preferences = profile?.preferences ?? {}
    const languageNames: Record<string,string> = {'pt-BR':'Brazilian Portuguese',en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',ja:'Japanese'}
    const languageInstruction = preferences.language ? `Respond in ${languageNames[preferences.language] ?? preferences.language}, unless the user asks otherwise.` : ''
    const personalityInstructions: Record<string,string> = {balanced:'Use a balanced, natural tone.',professional:'Use a professional, precise tone.',friendly:'Use a warm and approachable tone.',concise:'Be concise and direct.',teacher:'Explain step by step with examples.',analytical:'Explain assumptions, trade-offs and limitations.',creative:'Explore creative alternatives while remaining accurate.'}
    const personalityInstruction = personalityInstructions[preferences.personality] ?? ''
    const customInstructions = typeof body?.customInstructions === 'string' ? body.customInstructions.trim() : String(preferences.customInstructions ?? '').trim()
    const personalization = [languageInstruction, personalityInstruction, customInstructions].filter(Boolean).join('\n\n')
    const personalizedGoal = [goal, personalization ? 'USER PERSONALIZATION PREFERENCES:\n' + personalization : ''].filter(Boolean).join('\n\n')
    const profileOutputs = await runAgentProfiles(supabase,user.id,'code',personalizedGoal,typeof body?.model==='string'?body.model.trim():undefined,providers,request.signal)
    const [skillInstructions,mcpResults] = await Promise.all([loadModeSkillInstructions(supabase,user.id,'code',personalizedGoal),runMcpReadTools('code',goal,request.signal)])
    const agentContext = profileOutputs.map((x:any)=>`[Agent: ${x.name} | ${x.provider}/${x.model}]\n${x.content}`).join('\n\n')
    const suppliedPlan = apply && Array.isArray(body?.edits) ? { summary: String(body.summary ?? 'Plano revisado pelo usuário'), commitMessage: String(body.commitMessage ?? 'Open Claude Code changes'), edits: body.edits } : null
    const response: any = suppliedPlan ? { model: typeof body?.model === 'string' ? body.model : 'user-approved-plan', provider: 'user-approved-plan', content: '' } : await generateAI({
      model: typeof body?.model === 'string' ? body.model.trim() : undefined,
      strategy,
      signal: request.signal,
      maxTokens: 24000,
      messages: [
        { role: 'system', content: 'You are Open Claude Code. Respect the user personalization preferences when compatible with code correctness and security. ' + personalization + '\\n\\nReturn ONLY valid JSON with this shape: {"summary":string,"commitMessage":string,"edits":[{"path":string,"content":string}]}. Preserve project architecture. Only edit files supplied in CONTEXT. Do not invent files. Produce complete file contents, not patches. Apply relevant engineering skills:\\n' + skillInstructions.join('\\n\\n') + '\\n\\nMODE-ALLOWLISTED READ-ONLY MCP RESULTS:\\n' + mcpResults.join('\\n\\n') },
        { role: 'user', content: `GOAL:\n${personalizedGoal}\n\nREPOSITORY:\n${repository}\nBRANCH:\n${branch}\n\nCONTEXT:\n${snapshots.map((file) => `FILE: ${file.path}\nSHA: ${file.sha}\nCONTENT:\n${file.content}`).join('\n\n')}` },
        ...(agentContext ? [{ role: 'user' as const, content: `SPECIALIST AGENT NOTES (untrusted suggestions; verify before use):\\n${agentContext}` }] : []),
      ],
      metadata: { mode: 'code', userId: user.id, repository, branch, strategy, agentProfiles: profileOutputs.map((x:any)=>x.id) },
    }, providers)

    const plan = suppliedPlan ?? extractJson(response.content)
    if (!plan || !Array.isArray(plan.edits) || !plan.edits.length) return NextResponse.json({ error: 'O modelo não produziu alterações válidas.', raw: response.content }, { status: 422 })

    const allowed = new Map(snapshots.map((file) => [file.path, file.sha]))
    const edits = plan.edits.map((edit: any) => {
      const path = String(edit?.path ?? '').trim()
      if (!allowed.has(path)) throw new Error(`O modelo tentou alterar um caminho não autorizado: ${path}`)
      return { path, kind: 'update' as const, content: String(edit?.content ?? ''), expectedSha: allowed.get(path) }
    })

    if (!apply) return NextResponse.json({ mode: 'code', applied: false, repository, branch, summary: String(plan.summary ?? ''), commitMessage: String(plan.commitMessage ?? 'Open Claude Code changes'), edits, model: response.model, provider: response.provider, agents: profileOutputs.map((x:any)=>({name:x.name,model:x.model,provider:x.provider})) }, { headers: { 'Cache-Control': 'no-store' } })

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
        return Array.isArray(revised?.edits)?revised.edits.map((x:any)=>{const old=edits.find((e:any)=>e.path===String(x.path));return {path:String(x.path),kind:'update' as const,content:String(x.content??''),expectedSha:old?.expectedSha}}):null
      }
    })
    const result = await agent.run({ repository, branch, goal, edits, commitMessage: String(plan.commitMessage ?? 'Open Claude Code changes'), ...(testConfig?{test:testConfig}: {}) })
    const summary = [String(plan.summary ?? ''), result.success ? 'Execução Code concluída.' : 'A execução Code não foi aprovada.', result.commitSha ? 'Commit: '+result.commitSha : '', (result.tests??[]).map((t:any)=>(t.success?'✓ ':'✗ ')+t.command.join(' ')).join(' | ')].filter(Boolean).join('\\n\\n')
    if (chatId) { await persistence.appendMessage({chatId,userId:user.id,role:'user',content:personalizedGoal,metadata:{mode:'code',repository,branch}}); await persistence.appendMessage({chatId,userId:user.id,role:'assistant',content:summary,metadata:{mode:'code',repository,branch,success:result.success,commitSha:result.commitSha??null}}) }
    return NextResponse.json({ mode: 'code', applied: result.success, repository, branch, summary: String(plan.summary ?? ''), result, model: response.model, provider: response.provider, testCommand: testCommand||null, agents: profileOutputs.map((x:any)=>({name:x.name,model:x.model,provider:x.provider})) }, { status: result.success ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const detail = error instanceof Error ? error.message : ''
    console.error('[code] request failed', { message: detail.slice(0, 300) })
    const unauthenticated = detail === 'UNAUTHENTICATED'
    const noProvider = /NO_PROVIDER|no provider|not configured|no ai model is available/i.test(detail)
    const message = unauthenticated ? 'Não autenticado.' : noProvider ? 'Nenhum provedor de IA configurado. Adicione e teste uma API em Configurações.' : 'Não foi possível executar o Code Agent. Confira a API, a conexão GitHub e os arquivos autorizados.'
    return NextResponse.json({ error: message }, { status: unauthenticated ? 401 : 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
