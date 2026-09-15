import { randomUUID } from 'node:crypto'
import type { CoworkCheckpoint, CoworkEvent, CoworkRunInput, CoworkRunResult, CoworkRuntime, CoworkTaskRunner } from '@/types/cowork'
import { createCoworkPlan } from './cowork-planner'

const now = () => new Date().toISOString()

export function createCoworkRuntime(deps: { taskRunner: CoworkTaskRunner; maxConcurrency?: number }): CoworkRuntime {
  const runs = new Map<string, CoworkRunResult>()
  const controls = new Map<string, { paused: boolean; cancelled: boolean }>()
  const checkpoints = new Map<string, CoworkCheckpoint>()

  const emit = (result: CoworkRunResult, event: CoworkEvent, onEvent?: (event: CoworkEvent) => void) => { result.events.push(event); onEvent?.(event) }

  const run = async (input: CoworkRunInput, onEvent?: (event: CoworkEvent) => void): Promise<CoworkRunResult> => {
    const runId = randomUUID()
    const plan = createCoworkPlan(input.goal, input.maxTasks ?? 5)
    const result: CoworkRunResult = { runId, status: 'planning', plan, events: [] }
    const control = { paused: false, cancelled: false }
    runs.set(runId, result); controls.set(runId, control)
    emit(result, { type: 'run.created', runId, timestamp: now() }, onEvent)
    emit(result, { type: 'run.started', runId, timestamp: now() }, onEvent)
    result.status = 'running'
    const concurrency = Math.max(1, Math.min(input.concurrency ?? deps.maxConcurrency ?? 3, 8))

    try {
      while (plan.tasks.some(t => ['pending', 'waiting', 'running'].includes(t.status))) {
        if (control.cancelled || input.signal?.aborted) { result.status = 'cancelled'; plan.tasks.forEach(t => { if (t.status === 'pending' || t.status === 'waiting') t.status = 'cancelled' }); emit(result, { type: 'run.cancelled', runId, timestamp: now() }, onEvent); return result }
        while (control.paused) { result.status = 'paused'; await new Promise(r => setTimeout(r, 100)); if (control.cancelled) break }
        if (control.cancelled) continue
        result.status = 'running'
        const ready = plan.tasks.filter(t => t.status === 'pending' && t.dependsOn.every(id => plan.tasks.find(d => d.id === id)?.status === 'completed')).slice(0, concurrency)
        if (!ready.length) { if (plan.tasks.some(t => t.status === 'failed')) throw new Error('Cowork task dependency failed.'); await new Promise(r => setTimeout(r, 10)); continue }
        await Promise.all(ready.map(async task => {
          task.status = 'running'; emit(result, { type: 'task.started', runId, taskId: task.id, timestamp: now(), message: task.title }, onEvent)
          try { task.result = await deps.taskRunner.run(task, input, input.signal); task.status = 'completed'; emit(result, { type: 'task.completed', runId, taskId: task.id, timestamp: now(), message: task.title }, onEvent) }
          catch (error) { task.status = 'failed'; task.error = error instanceof Error ? error.message : 'Cowork task failed.'; emit(result, { type: 'task.failed', runId, taskId: task.id, timestamp: now(), message: task.error }, onEvent) }
        }))
        const checkpoint: CoworkCheckpoint = { runId, timestamp: now(), status: result.status, plan: structuredClone(plan) }
        checkpoints.set(runId, checkpoint); emit(result, { type: 'checkpoint.created', runId, timestamp: checkpoint.timestamp }, onEvent)
      }
      if (plan.tasks.some(t => t.status === 'failed')) throw new Error('Cowork run failed because a task failed.')
      result.status = 'completed'; emit(result, { type: 'run.completed', runId, timestamp: now() }, onEvent); return result
    } catch (error) {
      result.status = input.signal?.aborted ? 'cancelled' : 'failed'; result.error = error instanceof Error ? error.message : 'Cowork run failed.'
      emit(result, { type: result.status === 'cancelled' ? 'run.cancelled' : 'run.failed', runId, timestamp: now(), message: result.error }, onEvent); return result
    } finally { runs.set(runId, result) }
  }

  return {
    run,
    pause(runId) { const c = controls.get(runId); if (!c) return false; c.paused = true; const r = runs.get(runId); if (r) r.status = 'paused'; return true },
    resume(runId) { const c = controls.get(runId); if (!c) return false; c.paused = false; const r = runs.get(runId); if (r) r.status = 'running'; return true },
    cancel(runId) { const c = controls.get(runId); if (!c) return false; c.cancelled = true; return true },
    checkpoint(runId) { const checkpoint = checkpoints.get(runId); return checkpoint ? structuredClone(checkpoint) : undefined },
    get(runId) { const result = runs.get(runId); return result ? structuredClone(result) : undefined },
  }
}
