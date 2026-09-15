export type CoworkRunStatus = 'queued' | 'planning' | 'running' | 'waiting' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type CoworkTaskStatus = 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled'
export type CoworkEventType = 'run.created' | 'run.started' | 'task.created' | 'task.started' | 'task.completed' | 'task.failed' | 'task.waiting' | 'run.paused' | 'run.resumed' | 'run.completed' | 'run.failed' | 'run.cancelled' | 'checkpoint.created'
export interface CoworkTask { id:string; title:string; objective:string; status:CoworkTaskStatus; dependsOn:string[]; result?:unknown; error?:string }
export interface CoworkPlan { goal:string; tasks:CoworkTask[] }
export interface CoworkEvent { type:CoworkEventType; runId:string; timestamp:string; taskId?:string; message?:string; data?:Record<string,unknown> }
export interface CoworkRunInput { userId?:string; projectId?:string|null; chatId?:string|null; goal:string; maxTasks?:number; concurrency?:number; signal?:AbortSignal }
export interface CoworkRunResult { runId:string; status:CoworkRunStatus; plan:CoworkPlan; events:CoworkEvent[]; error?:string }
export interface CoworkCheckpoint { runId:string; timestamp:string; status:CoworkRunStatus; plan:CoworkPlan }
export interface CoworkTaskRunner { run(task:CoworkTask, input:CoworkRunInput, signal?:AbortSignal):Promise<unknown> }
export interface CoworkRuntime { run(input:CoworkRunInput,onEvent?:(event:CoworkEvent)=>void):Promise<CoworkRunResult>; pause(runId:string):boolean; resume(runId:string):boolean; cancel(runId:string):boolean; checkpoint(runId:string):CoworkCheckpoint|undefined; get(runId:string):CoworkRunResult|undefined }
