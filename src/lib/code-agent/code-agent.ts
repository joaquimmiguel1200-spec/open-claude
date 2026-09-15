import type {
  CodeAgentOptions,
  CodeAgentRequest,
  CodeAgentResult,
  CodeAgentRevisionContext,
  CodeAgentTestResult,
  CodeEdit,
  CodeValidationResult,
} from '@/types/code-agent'
import type { GitHubClient } from '@/types/github'
import type { SandboxFile, SandboxRunRequest } from '@/types/sandbox'

const DEFAULT_MAX_FILES = 20
const DEFAULT_MAX_FILE_SIZE = 1_000_000
const DEFAULT_MAX_TEST_ITERATIONS = 3

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

function mergeSandboxFiles(base: SandboxFile[], edits: CodeEdit[]): SandboxFile[] {
  const files = new Map(base.map((file) => [file.path, file]))
  for (const edit of edits) {
    const path = edit.path.trim().replace(/^\/+/, '')
    files.set(path, { path, content: edit.content })
  }
  return [...files.values()]
}

async function runSandboxTests(input: CodeAgentRequest, edits: CodeEdit[], options: CodeAgentOptions): Promise<CodeAgentTestResult[]> {
  if (!input.test) return []
  const runner = options.sandboxRunner
  if (!runner) throw new Error('Sandbox runner is required when Code Agent tests are enabled.')

  const config = input.test
  const files = mergeSandboxFiles(config.files ?? [], edits)
  const results: CodeAgentTestResult[] = []

  for (const command of config.commands) {
    if (!command.length) throw new Error('Sandbox test command cannot be empty.')
    const request: SandboxRunRequest = {
      image: config.image,
      command,
      files,
      workingDirectory: config.workingDirectory,
      environment: config.environment,
      allowNetwork: config.allowNetwork ?? false,
      limits: {
        timeoutMs: config.timeoutMs,
        memoryMb: config.memoryMb,
        cpus: config.cpus,
        pidsLimit: config.pidsLimit,
        maxOutputChars: config.maxOutputChars,
      },
    }
    const result = await runner.run(request)
    const testResult: CodeAgentTestResult = {
      command,
      success: result.status === 'completed' && result.exitCode === 0,
      status: result.status,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: result.durationMs,
    }
    results.push(testResult)
    if (!testResult.success) break
  }
  return results
}

function failedTests(tests: CodeAgentTestResult[]) {
  return tests.filter((test) => !test.success)
}

export function createCodeAgent(client: GitHubClient, options: CodeAgentOptions = {}) {
  async function run(input: CodeAgentRequest): Promise<CodeAgentResult> {
    let edits = input.edits
    let validation = validateRequest({ ...input, edits }, options)
    if (!validation.valid) {
      return { success: false, repository: input.repository, branch: input.branch, changes: [], validation, error: 'Code Agent request validation failed.' }
    }

    const maxIterations = input.test ? Math.max(1, options.maxTestIterations ?? DEFAULT_MAX_TEST_ITERATIONS) : 1
    let tests: CodeAgentTestResult[] = []

    try {
      for (let iteration = 1; iteration <= maxIterations; iteration++) {
        if (input.test) {
          tests = await runSandboxTests(input, edits, options)
          const failures = failedTests(tests)
          if (failures.length > 0) {
            if (!options.revise || iteration >= maxIterations) {
              return {
                success: false,
                repository: input.repository,
                branch: input.branch,
                changes: [],
                validation,
                tests,
                iterations: iteration,
                error: `Sandbox validation failed after ${iteration} iteration(s).`,
              }
            }
            const revisionContext: CodeAgentRevisionContext = { iteration, edits, tests, goal: input.goal }
            const revised = await options.revise(revisionContext)
            if (!revised?.length) {
              return {
                success: false,
                repository: input.repository,
                branch: input.branch,
                changes: [],
                validation,
                tests,
                iterations: iteration,
                error: 'Sandbox tests failed and no revised edits were produced.',
              }
            }
            edits = revised
            validation = validateRequest({ ...input, edits }, options)
            if (!validation.valid) {
              return {
                success: false,
                repository: input.repository,
                branch: input.branch,
                changes: [],
                validation,
                tests,
                iterations: iteration,
                error: 'Revised Code Agent edits failed validation.',
              }
            }
            continue
          }
        }

        const [owner, repo] = input.repository.split('/')
        const changes = [] as CodeAgentResult['changes']
        let lastCommitSha: string | undefined

        for (const edit of edits) {
          const path = edit.path.trim().replace(/^\/+/, '')
          let previousSha: string | undefined
          if (edit.kind === 'update') {
            const current = await client.getFile(owner, repo, path, input.branch)
            previousSha = current.sha
            if (current.sha !== edit.expectedSha) {
              throw new Error(`Stale file SHA for ${path}. Expected ${edit.expectedSha}, current ${current.sha}.`)
            }
          } else {
            try {
              const current = await client.getFile(owner, repo, path, input.branch)
              throw new Error(`Refusing to overwrite existing file ${path}; current SHA is ${current.sha}.`)
            } catch (error) {
              if (!(error instanceof Error) || !/GitHub API 404|API 404/.test(error.message)) throw error
            }
          }
          const commit = await client.createOrUpdateFile(owner, repo, path, edit.content, input.commitMessage, input.branch, previousSha)
          lastCommitSha = commit.commitSha
          changes.push({ path, kind: edit.kind, previousSha, content: edit.content })
        }

        return {
          success: true,
          repository: input.repository,
          branch: input.branch,
          changes,
          validation,
          tests,
          iterations: iteration,
          commitSha: lastCommitSha,
        }
      }

      return { success: false, repository: input.repository, branch: input.branch, changes: [], validation, tests, error: 'Code Agent test loop exhausted.' }
    } catch (error) {
      return {
        success: false,
        repository: input.repository,
        branch: input.branch,
        changes: [],
        validation,
        tests,
        error: error instanceof Error ? error.message : 'Code Agent execution failed.',
      }
    }
  }

  return { run }
}
