import { randomUUID } from 'node:crypto'
import type { AIMessage } from '@/types/ai'
import type { AgentEvent, AgentRunInput, AgentRunResult } from '@/types/agent'
import { generateAI } from '@/lib/ai'
import { createInitialPlan } from './agent-planner'
import type { SkillDefinition } from '@/types/skills'

export interface AgentSkillSelector {
  select(query: string, limit?: number): { active: SkillDefinition[] }
  buildContext(query: string, limit?: number): string
}

function emit(events: AgentEvent[], event: AgentEvent, onEvent?: (event: AgentEvent) => void) {
  events.push(event)
  onEvent?.(event)
}

export function createAgentRuntime(deps: { skillEngine?: AgentSkillSelector } = {}) {
  return {
    async run(input: AgentRunInput, onEvent?: (event: AgentEvent) => void): Promise<AgentRunResult> {
      const runId = randomUUID()
      const events: AgentEvent[] = []
      const now = () => new Date().toISOString()
      const plan = createInitialPlan(input.goal, input.maxSteps ?? 5)
      const activeSkills = deps.skillEngine?.select(input.goal, 3).active ?? []

      emit(events, { type: 'run.started', runId, timestamp: now(), message: 'Agent run started.' }, onEvent)
      emit(events, { type: 'plan.created', runId, timestamp: now(), data: { steps: plan.steps } }, onEvent)

      if (input.signal?.aborted) {
        emit(events, { type: 'run.cancelled', runId, timestamp: now(), message: 'Agent run cancelled before execution.' }, onEvent)
        return { runId, status: 'cancelled', plan, activeSkills, events }
      }

      for (const step of plan.steps) {
        step.status = 'running'
        emit(events, { type: 'step.started', runId, stepId: step.id, timestamp: now(), message: step.title }, onEvent)
        if (step.index !== 3) {
          step.status = 'completed'
          emit(events, { type: 'step.completed', runId, stepId: step.id, timestamp: now(), message: step.title }, onEvent)
        }
      }

      const skillContext = deps.skillEngine?.buildContext(input.goal, 3) ?? ''
      const messages: AIMessage[] = [
        ...(input.messages ?? []),
        { role: 'user', content: input.goal },
        ...(skillContext ? [{ role: 'system' as const, content: skillContext }] : []),
      ]

      try {
        const response = await generateAI({ messages, model: input.model, strategy: input.strategy, signal: input.signal, metadata: { agentRunId: runId, activeSkills: activeSkills.map((skill) => skill.name) } })
        plan.steps.forEach((step) => { if (step.status === 'running') step.status = 'completed' })
        plan.steps.forEach((step) => emit(events, { type: 'step.completed', runId, stepId: step.id, timestamp: now(), message: step.title }, onEvent))
        emit(events, { type: 'model.completed', runId, timestamp: now(), data: { model: response.model, provider: response.provider, usage: response.usage } }, onEvent)
        emit(events, { type: 'run.completed', runId, timestamp: now(), message: 'Agent run completed.' }, onEvent)
        return { runId, status: 'completed', plan, response, activeSkills, events }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Agent execution failed.'
        plan.steps.forEach((step) => { if (step.status === 'running') step.status = 'failed' })
        emit(events, { type: 'step.failed', runId, stepId: plan.steps.find((step) => step.status === 'failed')?.id, timestamp: now(), message }, onEvent)
        emit(events, { type: input.signal?.aborted ? 'run.cancelled' : 'run.failed', runId, timestamp: now(), message }, onEvent)
        return { runId, status: input.signal?.aborted ? 'cancelled' : 'failed', plan, activeSkills, events, error: message }
      }
    },
  }
}
