import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { userAIProviders } from '@/lib/ai/user-providers'
import { createAgentRuntime } from '@/lib/agent/agent-runtime'
import { createAgentTaskRunner } from '@/lib/cowork/agent-task-runner'
import { createCoworkRuntime } from '@/lib/cowork/cowork-runtime'
import { parseCoworkPlan } from '@/lib/cowork/cowork-planner'
import { generateAI } from '@/lib/ai'
import { createPersistence } from '@/lib/supabase/persistence'
import { runAgentProfiles } from '@/lib/agent/profile-orchestrator'
import { loadModeSkillInstructions } from '@/lib/skills/mode-skill-loader'
import { runMcpReadTools } from '@/lib/mcp/mode-runner'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

const strategyValues = new Set(['auto','quality','cost','latency','free'])

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id), 5, 60000)
    if (!limit.allowed) return NextResponse.json({ error: 'Muitas execuções Cowork. Tente novamente em instantes.' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) } })
    const body = await request.json() as any
    const goal = String(body?.goal ?? '').trim()
    if (!goal || goal.length > 12000) return NextResponse.json({ error: 'A tarefa Cowork é obrigatória.' }, { status: 400 })

    const model = typeof body?.model === 'string' ? body.model.trim() : undefined
    const strategy = strategyValues.has(body?.strategy) ? body.strategy : 'free'
    if (body?.chatId) { const chat = await supabase.from('chats').select('id,project_id').eq('id', body.chatId).eq('owner_id', user.id).maybeSingle(); if (!chat.data) return NextResponse.json({error:'Chat não encontrado ou não autorizado.'},{status:404}) }
    let projectSettings:any = null
    if (body?.projectId) { const project = await supabase.from('projects').select('id,settings').eq('id', body.projectId).eq('owner_id', user.id).maybeSingle(); if (!project.data) return NextResponse.json({error:'Projeto não encontrado ou não autorizado.'},{status:403}); projectSettings=project.data.settings??{} }
    const providers = await userAIProviders(supabase, user.id)
    const [specialistAgents, skillInstructions, mcpResults] = await Promise.all([runAgentProfiles(supabase,user.id,'cowork',goal,model,providers,request.signal),loadModeSkillInstructions(supabase,user.id,'cowork',goal),runMcpReadTools('cowork',goal,request.signal)])
    const specialistBrief = specialistAgents.map((item) => `\n\n[Especialista ${item.name} · ${item.provider}/${item.model}]\n${item.content}`).join('')
    const projectInstructions = typeof projectSettings?.instructions==='string'&&projectSettings.instructions.trim() ? 'PROJECT INSTRUCTIONS:\n'+projectSettings.instructions.trim() : ''
    const executionGoal = [goal, projectInstructions, skillInstructions.length ? 'ACTIVE COWORK SKILLS:\n' + skillInstructions.join('\n\n') : '', specialistBrief, mcpResults.length ? 'MODE-ALLOWLISTED READ-ONLY MCP RESULTS:\n' + mcpResults.join('\n\n') : ''].filter(Boolean).join('\n\n')
    const agent = createAgentRuntime({ providers })
    const maxTasks = Math.max(1, Math.min(Number(body?.maxTasks ?? 5), 8))
    let dynamicPlanUsed = false
    let dynamicPlan
    try {
      const planning = await generateAI({
        model,
        strategy,
        signal: request.signal,
        maxTokens: 3000,
        messages: [
          { role: 'system', content: 'You are the Open Claude Cowork planner. Convert the objective into a concise, executable task DAG. Return ONLY JSON: {"tasks":[{"id":"task-1","title":"...","objective":"...","dependsOn":[]}]} . Use 2-8 tasks as appropriate, independent tasks should have no dependency, and only add dependencies when necessary. Include explicit validation and delivery tasks when useful. Never claim tools have already run.' },
          { role: 'user', content: 'OBJECTIVE:\\n' + executionGoal + '\\n\\nMAX TASKS: ' + maxTasks },
        ],
        metadata: { mode: 'cowork-planning', userId: user.id, projectId: body?.projectId ?? null },
      }, providers)
      const raw = planning.content.match(/\\{[\\s\\S]*\\}/)?.[0]
      if (raw) { dynamicPlan = parseCoworkPlan(executionGoal, JSON.parse(raw), maxTasks); dynamicPlanUsed = true }
    } catch (error) {
      console.warn('[cowork] dynamic planning fallback', error instanceof Error ? error.message : 'planning failed')
    }
    const runtime = createCoworkRuntime({ taskRunner: createAgentTaskRunner(agent, { supabase }), maxConcurrency: 3 })
    const controller = new AbortController()
    request.signal.addEventListener('abort', () => controller.abort(), { once: true })
    if (request.signal.aborted) controller.abort()

    const result = await runtime.run({
      userId: user.id,
      projectId: typeof body?.projectId === 'string' ? body.projectId : null,
      chatId: typeof body?.chatId === 'string' ? body.chatId : null,
      goal: executionGoal,
      model,
      strategy,
      maxTasks,
      concurrency: Math.max(1, Math.min(Number(body?.concurrency ?? 3), 4)),
      signal: controller.signal,
    })

    const persistence = createPersistence(supabase)
    if (body?.chatId) {
      await persistence.appendMessage({
        chatId: body.chatId,
        userId: user.id,
        role: 'user',
        content: goal,
        metadata: { mode: 'cowork', runId: result.runId },
      })
      await persistence.appendMessage({
        chatId: body.chatId,
        userId: user.id,
        role: 'assistant',
        content: result.status === 'completed'
          ? result.plan.tasks.map((task) => `## ${task.title}\\n${typeof task.result === 'string' ? task.result : JSON.stringify(task.result)}`).join('\\n\\n')
          : result.error ?? 'A execução Cowork não foi concluída.',
        metadata: { mode: 'cowork', runId: result.runId, status: result.status, tasks: result.plan.tasks.length },
      })
    }
    await persistence.audit({
      userId: user.id,
      projectId: typeof body?.projectId === 'string' ? body.projectId : null,
      action: 'cowork.run',
      resourceType: 'cowork_run',
      resourceId: result.runId,
      metadata: { status: result.status, tasks: result.plan.tasks.length, specialistAgents: specialistAgents.map((item) => item.id) },
    })

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      plan: result.plan,
      events: result.events,
      specialistAgents: specialistAgents.map(({id,name,model,provider})=>({id,name,model,provider})),
      dynamicPlanUsed,
      error: result.error,
    }, { status: result.status === 'completed' ? 200 : 422, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const detail = error instanceof Error ? error.message : ''
    console.error('[cowork] request failed', { message: detail.slice(0, 300) })
    const unauthenticated = detail === 'UNAUTHENTICATED'
    const noProvider = /NO_PROVIDER|no provider|not configured|no ai model is available/i.test(detail)
    const message = unauthenticated ? 'Não autenticado.' : noProvider ? 'Nenhum provedor de IA configurado. Adicione e teste uma API em Configurações.' : 'Não foi possível executar o Cowork. Confira a API e as integrações autorizadas.'
    return NextResponse.json({ error: message }, { status: unauthenticated ? 401 : 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
