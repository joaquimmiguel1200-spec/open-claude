import type { CodeAgentRequest, CodeEdit } from '@/types/code-agent'

export interface CodePlan {
  goal: string
  branch: string
  files: string[]
  steps: Array<'inspect' | 'validate' | 'edit' | 'verify'>
}

export function createCodePlan(request: CodeAgentRequest): CodePlan {
  const files = request.edits.map((edit: CodeEdit) => edit.path)
  return {
    goal: request.goal.trim(),
    branch: request.branch.trim(),
    files,
    steps: ['inspect', 'validate', 'edit', 'verify'],
  }
}
