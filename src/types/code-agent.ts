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

export interface CodeAgentRequest {
  repository: string
  branch: string
  goal: string
  edits: CodeEdit[]
  commitMessage: string
  validate?: boolean
}

export interface CodeAgentResult {
  success: boolean
  repository: string
  branch: string
  changes: CodeChange[]
  validation: CodeValidationResult
  commitSha?: string
  error?: string
}

export interface CodeAgentOptions {
  maxFiles?: number
  maxFileSizeBytes?: number
}
