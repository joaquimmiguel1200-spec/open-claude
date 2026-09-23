import type { AgentPlan, AgentStep } from '@/types/agent'

function cleanGoal(goal: string): string {
  return goal.trim().replace(/\s+/g, ' ')
}

export function createInitialPlan(goal: string, maxSteps = 6): AgentPlan {
  const normalized = cleanGoal(goal)
  const steps: AgentStep[] = [
    { id: 'step-1', index: 1, title: 'Understand request', objective: 'Identify the user goal, constraints, and expected result.', status: 'pending' },
    { id: 'step-2', index: 2, title: 'Select capabilities', objective: 'Determine which relevant skills and available capabilities are needed.', status: 'pending' },
    { id: 'step-3', index: 3, title: 'Execute reasoning', objective: 'Produce the best solution using the selected context and capabilities.', status: 'pending' },
    { id: 'step-4', index: 4, title: 'Validate result', objective: 'Check completeness, constraints, safety, and consistency.', status: 'pending' },
    { id: 'step-5', index: 5, title: 'Deliver result', objective: 'Return a concise result that directly addresses the request.', status: 'pending' },
  ].slice(0, Math.max(1, Math.min(maxSteps, 5))) as AgentStep[]
  return { goal: normalized, steps }
}
