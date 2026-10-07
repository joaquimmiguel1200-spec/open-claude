import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { userAIProviders } from '@/lib/ai/user-providers'
import { createAgentRuntime } from '@/lib/agent/agent-runtime'
import { createAgentTaskRunner } from '@/lib/cowork/agent-task-runner'
import { createCoworkRuntime } from '@/lib/cowork/cowork-runtime'
import { createPersistence } from '@/lib/supabase/persistence'
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
    if (body?.projectId) { const project = await supabase.from('projects').select('id').eq('id', body.projectId).eq('owner_id', user.id).maybeSingle(); if (!project.data) return NextResponse.json({error:'Projeto não encontrado ou não autorizado.'},{status:403}) }
    const providers = await userAIProviders(supabase, user.id)
    const agent = createAgentRuntime({ providers })
    const runtime = createCoworkRuntime({ taskRunner: createAgentTaskRunner(agent), maxConcurrency: 3 })
    const controller = new AbortController()
    request.signal.addEventListener('abort', () => controller.abort(), { once: true })
    if (request.signal.aborted) controller.abort()

    const result = await runtime.run({
      userId: user.id,
      projectId: typeof body?.projectId === 'string' ? body.projectId : null,
      chatId: typeof body?.chatId === 'string' ? body.chatId : null,
      goal,
      model,
      strategy,
      maxTasks: Math.max(1, Math.min(Number(body?.maxTasks ?? 5), 8)),
      concurrency: Math.max(1, Math.min(Number(body?.concurrency ?? 3), 4)),
      signal: controller.signal,
    })

    if (result.status === 'completed' && body?.chatId) {
      const persistence = createPersistence(supabase)
      await persistence.appendMessage({
        chatId: body.chatId,
        userId: user.id,
        role: 'assistant',
        content: result.plan.tasks.map((task) => `## ${task.title}\n${typeof task.result === 'string' ? task.result : JSON.stringify(task.result)}`).join('\n\n'),
        metadata: { mode: 'cowork', runId: result.runId, status: result.status, tasks: result.plan.tasks.length },
      })
    }

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      plan: result.plan,
      events: result.events,
      error: result.error,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível executar o Cowork.'
    return NextResponse.json({ error: message === 'UNAUTHENTICATED' ? 'Não autenticado.' : message }, { status: message === 'UNAUTHENTICATED' ? 401 : 500 })
  }
}
