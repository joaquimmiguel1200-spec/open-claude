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


/** Validate an AI-generated plan before it is allowed to drive execution. */
export function parseCoworkPlan(goal: string, value: unknown, maxTasks = 5): CoworkPlan {
  const fallback = () => createCoworkPlan(goal, maxTasks)
  if (!value || typeof value !== 'object' || !Array.isArray((value as any).tasks)) return fallback()
  const raw = (value as any).tasks as any[]
  const limit = Math.max(1, Math.min(Math.floor(maxTasks), 8))
  if (!raw.length || raw.length > limit) return fallback()
  const ids = new Set<string>()
  const tasks: CoworkTask[] = []
  for (let index = 0; index < raw.length; index++) {
    const item = raw[index]
    if (!item || typeof item !== 'object') return fallback()
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 120) : ''
    const objective = typeof item.objective === 'string' ? item.objective.trim().slice(0, 2000) : ''
    const id = typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(item.id) ? item.id : `task-${index + 1}`
    if (!title || !objective || ids.has(id)) return fallback()
    ids.add(id)
    tasks.push({ id, title, objective, status: 'pending', dependsOn: [] })
  }
  for (let index = 0; index < raw.length; index++) {
    const dependencies = Array.isArray(raw[index].dependsOn) ? raw[index].dependsOn : []
    if (dependencies.some((id: unknown) => typeof id !== 'string' || !ids.has(id) || id === tasks[index].id)) return fallback()
    tasks[index].dependsOn = [...new Set(dependencies as string[])]
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const byId = new Map(tasks.map(task => [task.id, task]))
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false
    if (visited.has(id)) return true
    visiting.add(id)
    for (const dependency of byId.get(id)?.dependsOn ?? []) if (!visit(dependency)) return false
    visiting.delete(id); visited.add(id); return true
  }
  if (tasks.some(task => !visit(task.id))) return fallback()
  return { goal: goal.trim(), tasks }
}
