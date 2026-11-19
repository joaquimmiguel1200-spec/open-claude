import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
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
    const requestedPaths = Array.isArray(body?.paths) ? body.paths.map((p: unknown) => String(p).trim()).filter(Boolean).slice(0, 100) : []
    const sensitivePath = /(^|\/)(\.env(?:\..*)?|\.npmrc|\.pypirc|id_rsa|id_ed25519|credentials(?:\.json)?|service[-_]?account[^/]*\.json|secrets?[^/]*\.(json|ya?ml)|[^/]*\.(pem|key|p12|pfx|tfstate))$/i
    const apply = body?.apply === true
    const testCommand = typeof body?.testCommand === 'string' ? body.testCommand.trim() : ''
    const chatId = typeof body?.chatId === 'string' ? body.chatId : null
    const projectId = typeof body?.projectId === 'string' ? body.projectId : null
    const persistence = createPersistence(supabase)
    if (chatId) { const { data: chat } = await supabase.from('chats').select('id').eq('id', chatId).eq('owner_id', user.id).maybeSingle(); if (!chat) return NextResponse.json({ error: 'Conversa não encontrada ou não autorizada.' }, { status: 404 }) }
    let projectSettings:any = null
    if (projectId) { const { data: project } = await supabase.from('projects').select('id,settings').eq('id', projectId).eq('owner_id', user.id).maybeSingle(); if (!project) return NextResponse.json({ error: 'Projeto não encontrado ou não autorizado.' }, { status: 403 }); projectSettings=project.settings??{} }
    const strategies: AIRoutingStrategy[] = ['auto','quality','cost','latency','free']
    const strategy = strategies.includes(body?.strategy) ? body.strategy : 'free'
    if (!goal || goal.length > 12000) return NextResponse.json({ error: 'O objetivo Code é obrigatório.' }, { status: 400 })
    if (apply && !testCommand) return NextResponse.json({ error: 'Para aplicar e publicar alterações, informe um comando de teste. Sem teste, use a prévia de alterações sem aplicar.' }, { status: 400 })
    if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) return NextResponse.json({ error: 'Informe repository no formato owner/repository.' }, { status: 400 })
    if (requestedPaths.some((path: string) => !path || path.length > 240 || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..') || path.includes(String.fromCharCode(92)) || path.startsWith('.git/') || sensitivePath.test(path))) return NextResponse.json({ error: 'Lista de caminhos inválida.' }, { status: 400 })
    

    const [owner, repo] = repository.split('/')
    const github = await createGitHubClientForUser(supabase, user.id)
    const snapshots = [] as Array<{ path: string; sha: string; content: string }>
    const treeFiles = await github.listFiles(owner, repo, branch, request.signal)
    const sourceExtensions = /\.(tsx?|jsx?|mjs|cjs|json|css|scss|html|md|mdx|py|sql|ya?ml|toml|sh|go|rs|java|kt|swift|php|rb|vue|svelte|astro)$/i
    const excluded = /(^|\/)(node_modules|\.git|\.next|dist|build|coverage|vendor|\.turbo)(\/|$)|(^|\/)public\/.*\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip)$/i
    const autoPaths = treeFiles.filter(file => sourceExtensions.test(file.path) && !excluded.test(file.path) && !sensitivePath.test(file.path) && !/lock\.(json|yaml)$|\.min\.(js|css)$/i.test(file.path)).sort((a,b) => {
      const priority = (path: string) => /(^|\/)(package\.json|tsconfig\.json|next\.config|README|AGENTS\.md)$/i.test(path) ? 0 : /^(app|src|lib|components)\//.test(path) ? 1 : 2
      return priority(a.path)-priority(b.path) || a.path.localeCompare(b.path)
    })
    const candidatePaths = requestedPaths.length ? requestedPaths : autoPaths.slice(0, 80).map(file => file.path)
    if (!candidatePaths.length) return NextResponse.json({ error: 'Não encontrei arquivos de texto elegíveis neste repositório.' }, { status: 422 })
    let contextBytes = 0
    for (const path of candidatePaths) {
      const treeFile = treeFiles.find(file => file.path === path)
      if (!treeFile) return NextResponse.json({ error: 'Caminho não encontrado no repositório: ' + path }, { status: 400 })
      if (treeFile.size > 120_000 || contextBytes + treeFile.size > 160_000) continue
      const file = await github.getFile(owner, repo, path, branch, request.signal)
      contextBytes += Buffer.byteLength(file.content, 'utf8')
      snapshots.push({ path: file.path, sha: file.sha, content: file.content })
    }
    if (!snapshots.length) return NextResponse.json({ error: 'Os arquivos do repositório excedem o limite de contexto. Selecione arquivos menores.' }, { status: 413 })
    const paths = snapshots.map(file => file.path)

    // Dependency manifests are test context only unless explicitly selected by the user.
    const testFiles = [...snapshots]
    for (const manifestPath of ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock']) {
      if (testFiles.some((file) => file.path === manifestPath)) continue
      try {
        const file = await github.getFile(owner, repo, manifestPath, branch, request.signal)
        testFiles.push({ path: file.path, sha: file.sha, content: file.content })
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (!/GitHub API 404|API 404|Not Found/i.test(message)) throw error
      }
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
    const projectInstructions = typeof projectSettings?.instructions==='string'&&projectSettings.instructions.trim() ? 'PROJECT INSTRUCTIONS:\n'+projectSettings.instructions.trim() : ''
    const personalizedGoal = [goal, projectInstructions, personalization ? 'USER PERSONALIZATION PREFERENCES:\n' + personalization : ''].filter(Boolean).join('\n\n')
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
        { role: 'system', content: 'You are Open Claude Code. Respect the user personalization preferences when compatible with code correctness and security. ' + personalization + '\\n\\nReturn ONLY valid JSON with this shape: {"summary":string,"commitMessage":string,"edits":[{"path":string,"kind":"update|create","content":string}]}. Preserve project architecture. Only edit files supplied in CONTEXT. You may also propose new files with kind=create only when their parent directory exists in the repository tree. Return complete file contents, not patches. Produce complete file contents, not patches. Apply relevant engineering skills:\\n' + skillInstructions.join('\\n\\n') + '\\n\\nMODE-ALLOWLISTED READ-ONLY MCP RESULTS:\\n' + mcpResults.join('\\n\\n') },
        { role: 'user', content: `GOAL:\n${personalizedGoal}\n\nREPOSITORY:\n${repository}\nBRANCH:\n${branch}\n\nCONTEXT:\n${snapshots.map((file) => `FILE: ${file.path}\nSHA: ${file.sha}\nCONTENT:\n${file.content}`).join('\n\n')}` },
        ...(agentContext ? [{ role: 'user' as const, content: `SPECIALIST AGENT NOTES (untrusted suggestions; verify before use):\\n${agentContext}` }] : []),
      ],
      metadata: { mode: 'code', userId: user.id, repository, branch, strategy, agentProfiles: profileOutputs.map((x:any)=>x.id) },
    }, providers)

    const plan = suppliedPlan ?? extractJson(response.content)
    if (!plan || !Array.isArray(plan.edits) || !plan.edits.length) return NextResponse.json({ error: 'O modelo não produziu alterações válidas.', raw: response.content }, { status: 422 })

    const allowed = new Map(snapshots.filter((file) => paths.includes(file.path)).map((file) => [file.path, file.sha]))
    const existingPaths = new Set(treeFiles.map(file => file.path))
    const allowedDirectories = new Set(treeFiles.map(file => file.path.includes('/') ? file.path.slice(0,file.path.lastIndexOf('/')) : ''))
    const edits = plan.edits.map((edit: any) => {
      const path = String(edit?.path ?? '').trim()
      const kind = edit?.kind === 'create' ? 'create' as const : 'update' as const
      if (!path || path.length > 240 || path.startsWith('/') || path.split('/').some((part: string) => !part || part === '.' || part === '..') || path.includes(String.fromCharCode(92)) || path.startsWith('.git/') || sensitivePath.test(path)) throw new Error(`Caminho inválido proposto pelo modelo: ${path}`)
      if (allowed.has(path) && kind === 'update') return { path, kind, content: String(edit?.content ?? ''), expectedSha: allowed.get(path) }
      const parent = path.includes('/') ? path.slice(0,path.lastIndexOf('/')) : ''
      if (kind === 'create' && !existingPaths.has(path) && allowedDirectories.has(parent) && !path.startsWith('.github/workflows/')) return { path, kind, content: String(edit?.content ?? '') }
      throw new Error(`O modelo tentou alterar um caminho não autorizado: ${path}`)
    })

    if (!apply) return NextResponse.json({ mode: 'code', applied: false, repository, branch, summary: String(plan.summary ?? ''), commitMessage: String(plan.commitMessage ?? 'Open Claude Code changes'), edits, model: response.model, provider: response.provider, agents: profileOutputs.map((x:any)=>({name:x.name,model:x.model,provider:x.provider})) }, { headers: { 'Cache-Control': 'no-store' } })

    const sandboxRunner=createVercelSandboxRunner()
    const testScript = testCommand
      ? `if [ -f package-lock.json ]; then npm ci --ignore-scripts --no-audit --no-fund; elif [ -f package.json ]; then npm install --ignore-scripts --no-audit --no-fund; fi && ${testCommand}`
      : ''
    const testConfig=testCommand?{image:'node22',commands:[['bash','-lc',testScript]],files:testFiles.map(x=>({path:x.path,content:x.content})),allowNetwork:true,workingDirectory:'/vercel/sandbox',timeoutMs:600000}:undefined
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
            {role:'system',content:'You are Open Claude Code. Return ONLY valid JSON: {"edits":[{"path":string,"content":string}]}. Fix the failing sandbox tests. Edit only the originally supplied files. Do not create or modify any additional path.'},
            {role:'user',content:`GOAL:\n${goal}\n\nITERATION: ${ctx.iteration}\n\nFAILURES:\n${ctx.tests.filter(t=>!t.success).map(t=>t.command.join(' ')+'\\nSTDOUT:\n'+t.stdout+'\\nSTDERR:\n'+t.stderr).join('\\n\\n')}\n\nCURRENT FILES:\n${ctx.edits.map(x=>'FILE: '+x.path+'\\n'+x.content).join('\\n\\n')}`}
          ],
          metadata:{mode:'code-revision',userId:user.id,repository,branch,strategy}
        },providers)
        const revised=extractJson(revision.content)
        return Array.isArray(revised?.edits)?revised.edits.map((x:any)=>{const old=edits.find((e:any)=>e.path===String(x.path));return {path:String(x.path),kind:'update' as const,content:String(x.content??''),expectedSha:old?.expectedSha}}):null
      }
    })
    const sourceBranch = (await github.listBranches(owner, repo, request.signal)).find(item => item.name === branch)
    if (!sourceBranch) return NextResponse.json({ error: 'A branch base selecionada não existe ou não está acessível.' }, { status: 404 })
    const workingBranch = `open-claude/${Date.now()}-${randomUUID().slice(0, 8)}`
    await github.createBranch(owner, repo, workingBranch, sourceBranch.sha, request.signal)
    const result = await agent.run({ repository, branch: workingBranch, goal, edits, commitMessage: String(plan.commitMessage ?? 'Open Claude Code changes'), ...(testConfig?{test:testConfig}: {}) })
    let pullRequest: { number: number; htmlUrl: string; title: string } | null = null
    let pullRequestError: string | null = null
    if (result.success) {
      try {
        pullRequest = await github.createPullRequest(owner, repo, {
          title: String(plan.summary ?? goal).slice(0, 240) || 'Open Claude Code changes',
          body: ['## Open Claude Code', '', String(plan.summary ?? goal), '', '**Base:** ' + branch, '**Working branch:** ' + workingBranch, '', 'Changes were generated from an explicit user-approved preview and passed the configured sandbox test command.', '', '### Test command', '`' + testCommand + '`'].join('\n'),
          head: workingBranch,
          base: branch,
        }, request.signal)
      } catch (error) {
        pullRequestError = error instanceof Error ? error.message : 'Não foi possível abrir o pull request.'
      }
    }
    const summary = [String(plan.summary ?? ''), result.success ? 'Alterações aplicadas em uma branch isolada.' : 'A execução Code não foi aprovada.', 'Branch de trabalho: ' + workingBranch, result.commitSha ? 'Commit: '+result.commitSha : '', pullRequest ? 'Pull request: ' + pullRequest.htmlUrl : pullRequestError ? 'Aviso: ' + pullRequestError : '', (result.tests??[]).map((t:any)=>(t.success?'✓ ':'✗ ')+t.command.join(' ')).join(' | ')].filter(Boolean).join('\n\n')
    if (chatId) { await persistence.appendMessage({chatId,userId:user.id,role:'user',content:goal,metadata:{mode:'code',repository,branch:workingBranch,baseBranch:branch}}); await persistence.appendMessage({chatId,userId:user.id,role:'assistant',content:summary,metadata:{mode:'code',repository,branch:workingBranch,baseBranch:branch,success:result.success,commitSha:result.commitSha??null,pullRequestUrl:pullRequest?.htmlUrl??null}}) }
    return NextResponse.json({ mode: 'code', applied: result.success, repository, branch: workingBranch, baseBranch: branch, pullRequest, pullRequestError, summary, result, model: response.model, provider: response.provider, testCommand: testCommand||null, agents: profileOutputs.map((x:any)=>({name:x.name,model:x.model,provider:x.provider})) }, { status: result.success ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const detail = error instanceof Error ? error.message : ''
    console.error('[code] request failed', { message: detail.slice(0, 300) })
    const unauthenticated = detail === 'UNAUTHENTICATED'
    const noProvider = /NO_PROVIDER|no provider|not configured|no ai model is available/i.test(detail)
    const message = unauthenticated ? 'Não autenticado.' : noProvider ? 'Nenhum provedor de IA configurado. Adicione e teste uma API em Configurações.' : 'Não foi possível executar o Code Agent. Confira a API, a conexão GitHub e os arquivos autorizados.'
    return NextResponse.json({ error: message }, { status: unauthenticated ? 401 : 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
