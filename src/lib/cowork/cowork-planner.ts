import { randomUUID } from 'node:crypto'
import type { CoworkPlan, CoworkTask } from '@/types/cowork'

export function createCoworkPlan(goal: string, maxTasks = 5): CoworkPlan {
  const normalized = goal.trim()
  if (!normalized) throw new Error('Cowork goal cannot be empty.')
  const titles = [
    ['Understand objective', 'Understand the requested outcome and constraints.'],
    ['Plan work', 'Break the objective into executable work units.'],
    ['Execute', 'Perform the planned work using available agents and tools.'],
    ['Validate', 'Check outputs against the objective and constraints.'],
    ['Finalize', 'Prepare the final result and report important outcomes.'],
  ]
  const count = Math.max(1, Math.min(maxTasks, titles.length))
  const tasks: CoworkTask[] = titles.slice(0, count).map(([title, objective]) => ({ id: randomUUID(), title, objective, status: 'pending', dependsOn: [] }))
  for (let i = 1; i < tasks.length; i++) tasks[i].dependsOn = [tasks[i - 1].id]
  return { goal: normalized, tasks }
}
