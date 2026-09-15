import type { AIResponse, AIStreamEvent } from '@/types/ai'
import type { SkillDefinition } from '@/types/skills'

export type AgentRunStatus = 'queued' | 'planning' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'

export type AgentEventType = 'run.started' | 'plan.created' | 'step.started' | 'step.completed' | 'step.failed' | 'model.delta' | 'model.completed' | 'run.completed' | 'run.failed' | 'run.cancelled'

export interface AgentStep {
  id: string
  index: number
  title: string
  objective: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
}

export interface AgentPlan {
  goal: string
  steps: AgentStep[]
}

export interface AgentEvent {
  type: AgentEventType
  runId: string
  timestamp: string
  stepId?: string
  message?: string
  delta?: string
  data?: Record<string, unknown>
}

export interface AgentRunInput {
  userId?: string
  projectId?: string | null
  chatId?: string | null
  goal: string
  messages?: import('@/types/ai').AIMessage[]
  model?: string
  strategy?: import('@/types/ai').AIRoutingStrategy
  maxSteps?: number
  signal?: AbortSignal
}

export interface AgentRunResult {
  runId: string
  status: AgentRunStatus
  plan: AgentPlan
  response?: AIResponse
  activeSkills: SkillDefinition[]
  events: AgentEvent[]
  error?: string
}

export interface AgentRuntime {
  run(input: AgentRunInput, onEvent?: (event: AgentEvent) => void): Promise<AgentRunResult>
}

export type AgentModelEvent = AIStreamEvent
