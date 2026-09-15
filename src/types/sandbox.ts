export type SandboxStatus = 'completed' | 'failed' | 'timed_out' | 'cancelled'

export interface SandboxFile {
  path: string
  content: string
}

export interface SandboxLimits {
  timeoutMs?: number
  memoryMb?: number
  cpus?: number
  pidsLimit?: number
  maxOutputChars?: number
}

export interface SandboxRunRequest {
  image: string
  command: string[]
  files: SandboxFile[]
  workingDirectory?: string
  environment?: Record<string, string>
  allowNetwork?: boolean
  limits?: SandboxLimits
}

export interface SandboxRunResult {
  status: SandboxStatus
  exitCode: number | null
  stdout: string
  stderr: string
  durationMs: number
  timedOut: boolean
  truncated: boolean
}

export interface SandboxRunner {
  run(request: SandboxRunRequest, signal?: AbortSignal): Promise<SandboxRunResult>
}
