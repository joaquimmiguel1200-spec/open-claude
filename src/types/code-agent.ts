export type CodeEditKind = 'create' | 'update'

export interface CodeEdit {
  path: string
  kind: CodeEditKind
  content: string
  expectedSha?: string
}

export interface CodeChange {
  path: string
  kind: CodeEditKind
  previousSha?: string
  content: string
}

export interface CodeValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface CodeAgentTestConfig {
  image: string
  commands: string[][]
  files?: Array<{ path: string; content: string }>
  environment?: Record<string, string>
  allowNetwork?: boolean
  workingDirectory?: string
  timeoutMs?: number
  memoryMb?: number
  cpus?: number
  pidsLimit?: number
  maxOutputChars?: number
}

export interface CodeAgentTestResult {
  command: string[]
  success: boolean
  status: 'completed' | 'failed' | 'timed_out' | 'cancelled'
  exitCode: number | null
  stdout: string
  stderr: string
  durationMs: number
}

export interface CodeAgentRevisionContext {
  iteration: number
  edits: CodeEdit[]
  tests: CodeAgentTestResult[]
  goal: string
}

export interface CodeAgentRequest {
  repository: string
  branch: string
  goal: string
  edits: CodeEdit[]
  commitMessage: string
  validate?: boolean
  test?: CodeAgentTestConfig
}

export interface CodeAgentResult {
  success: boolean
  repository: string
  branch: string
  changes: CodeChange[]
  validation: CodeValidationResult
  tests?: CodeAgentTestResult[]
  iterations?: number
  commitSha?: string
  error?: string
}

export interface CodeAgentOptions {
  maxFiles?: number
  maxFileSizeBytes?: number
  maxTestIterations?: number
  revise?: (context: CodeAgentRevisionContext) => Promise<CodeEdit[] | null>
  sandboxRunner?: import('@/types/sandbox').SandboxRunner
}
