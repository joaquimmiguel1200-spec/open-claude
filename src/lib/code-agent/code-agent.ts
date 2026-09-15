import type { CodeAgentOptions, CodeAgentRequest, CodeAgentResult, CodeValidationResult } from '@/types/code-agent'
import type { GitHubClient } from '@/types/github'

const DEFAULT_MAX_FILES = 20
const DEFAULT_MAX_FILE_SIZE = 1_000_000

function validateRequest(input: CodeAgentRequest, options: CodeAgentOptions): CodeValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (!input.repository.match(/^[^/\s]+\/[^/\s]+$/)) errors.push('Repository must use owner/repository format.')
  if (!input.branch.trim()) errors.push('Branch is required.')
  if (!input.goal.trim()) errors.push('Goal is required.')
  if (!input.commitMessage.trim()) errors.push('Commit message is required.')
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES
  if (input.edits.length === 0) errors.push('At least one code edit is required.')
  if (input.edits.length > maxFiles) errors.push(`Too many edits. Maximum is ${maxFiles} files.`)
  const maxSize = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE
  const seen = new Set<string>()
  for (const edit of input.edits) {
    const path = edit.path.trim().replace(/^\/+/, '')
    if (!path || path.includes('..') || path.startsWith('.git/')) errors.push(`Unsafe file path: ${edit.path}`)
    if (seen.has(path)) errors.push(`Duplicate file path: ${path}`)
    seen.add(path)
    if (Buffer.byteLength(edit.content, 'utf8') > maxSize) errors.push(`File exceeds size limit: ${path}`)
    if (edit.kind === 'update' && !edit.expectedSha) errors.push(`Update requires expectedSha: ${path}`)
  }
  return { valid: errors.length === 0, errors, warnings }
}

export function createCodeAgent(client: GitHubClient, options: CodeAgentOptions = {}) {
  async function run(input: CodeAgentRequest): Promise<CodeAgentResult> {
    const validation = validateRequest(input, options)
    if (!validation.valid) return { success: false, repository: input.repository, branch: input.branch, changes: [], validation, error: 'Code Agent request validation failed.' }

    const [owner, repo] = input.repository.split('/')
    const changes = [] as CodeAgentResult['changes']

    try {
      for (const edit of input.edits) {
        const path = edit.path.trim().replace(/^\/+/, '')
        let previousSha: string | undefined
        if (edit.kind === 'update') {
          const current = await client.getFile(owner, repo, path, input.branch)
          previousSha = current.sha
          if (current.sha !== edit.expectedSha) throw new Error(`Stale file SHA for ${path}. Expected ${edit.expectedSha}, current ${current.sha}.`)
        } else {
          try {
            const current = await client.getFile(owner, repo, path, input.branch)
            throw new Error(`Refusing to overwrite existing file ${path}; current SHA is ${current.sha}.`)
          } catch (error) {
            if (error instanceof Error && /API 404/.test(error.message)) {
              // expected for a new file
            } else if (error instanceof Error && error.message.includes('GitHub API 404')) {
              // expected for a new file
            } else throw error
          }
        }
        await client.createOrUpdateFile(owner, repo, path, edit.content, input.commitMessage, input.branch, previousSha)
        changes.push({ path, kind: edit.kind, previousSha, content: edit.content })
      }
      return { success: true, repository: input.repository, branch: input.branch, changes, validation, commitSha: undefined }
    } catch (error) {
      return { success: false, repository: input.repository, branch: input.branch, changes, validation, error: error instanceof Error ? error.message : 'Code Agent execution failed.' }
    }
  }
  return { run }
}
