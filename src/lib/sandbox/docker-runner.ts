import 'server-only'

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, relative, isAbsolute } from 'node:path'
import { spawn } from 'node:child_process'
import type { SandboxFile, SandboxLimits, SandboxRunRequest, SandboxRunResult, SandboxRunner } from '@/types/sandbox'

const DEFAULT_TIMEOUT_MS = 120_000
const DEFAULT_MEMORY_MB = 512
const DEFAULT_CPUS = 1
const DEFAULT_PIDS_LIMIT = 128
const DEFAULT_MAX_OUTPUT = 64_000
const DEFAULT_WORKDIR = '/workspace'

function validateImage(image: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/@:-]*$/.test(image)) throw new Error('Invalid sandbox image.')
}

function validateRelativePath(filePath: string) {
  const normalized = filePath.replaceAll('\\', '/')
  if (!normalized || normalized.startsWith('/') || normalized.includes('..') || normalized.startsWith('.git/')) {
    throw new Error(`Unsafe sandbox file path: ${filePath}`)
  }
}

function buildDockerArgs(request: SandboxRunRequest, workspace: string, limits: Required<SandboxLimits>) {
  const args = [
    'run', '--rm', '--init',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges:true',
    '--pids-limit', String(limits.pidsLimit),
    '--memory', `${limits.memoryMb}m`,
    '--cpus', String(limits.cpus),
    '--mount', `type=bind,src=${workspace},dst=${DEFAULT_WORKDIR},rw`,
    '--workdir', request.workingDirectory ?? DEFAULT_WORKDIR,
  ]
  if (!request.allowNetwork) args.push('--network', 'none')
  for (const [key, value] of Object.entries(request.environment ?? {})) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`Invalid sandbox environment key: ${key}`)
    args.push('--env', `${key}=${value}`)
  }
  args.push(request.image, ...request.command)
  return args
}

async function writeWorkspace(root: string, files: SandboxFile[]) {
  for (const file of files) {
    validateRelativePath(file.path)
    const target = resolve(root, file.path)
    const rel = relative(root, target)
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Sandbox path escapes workspace: ${file.path}`)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, file.content, 'utf8')
  }
}

export function createDockerSandboxRunner(): SandboxRunner {
  return {
    async run(request, signal) {
      validateImage(request.image)
      if (!request.command.length) throw new Error('Sandbox command is required.')
      const raw = request.limits ?? {}
      const limits: Required<SandboxLimits> = {
        timeoutMs: raw.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        memoryMb: raw.memoryMb ?? DEFAULT_MEMORY_MB,
        cpus: raw.cpus ?? DEFAULT_CPUS,
        pidsLimit: raw.pidsLimit ?? DEFAULT_PIDS_LIMIT,
        maxOutputChars: raw.maxOutputChars ?? DEFAULT_MAX_OUTPUT,
      }
      if (limits.timeoutMs <= 0 || limits.memoryMb <= 0 || limits.cpus <= 0 || limits.pidsLimit <= 0) throw new Error('Sandbox limits must be positive.')

      const workspace = await mkdtemp(join(tmpdir(), 'open-claude-sandbox-'))
      await writeWorkspace(workspace, request.files)
      const args = buildDockerArgs(request, workspace, limits)
      const started = Date.now()
      let stdout = ''
      let stderr = ''
      let truncated = false
      let timedOut = false
      let cancelled = false

      try {
        const result = await new Promise<SandboxRunResult>((resolveResult, reject) => {
          const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false })
          const append = (target: 'stdout' | 'stderr', chunk: Buffer) => {
            const text = chunk.toString('utf8')
            if (target === 'stdout') stdout += text
            else stderr += text
            if (stdout.length > limits.maxOutputChars) { stdout = stdout.slice(0, limits.maxOutputChars); truncated = true }
            if (stderr.length > limits.maxOutputChars) { stderr = stderr.slice(0, limits.maxOutputChars); truncated = true }
          }
          child.stdout.on('data', (chunk: Buffer) => append('stdout', chunk))
          child.stderr.on('data', (chunk: Buffer) => append('stderr', chunk))

          const timer = setTimeout(() => {
            timedOut = true
            child.kill('SIGKILL')
          }, limits.timeoutMs)
          const abort = () => {
            cancelled = true
            child.kill('SIGKILL')
          }
          signal?.addEventListener('abort', abort, { once: true })
          child.on('error', (error) => {
            clearTimeout(timer)
            signal?.removeEventListener('abort', abort)
            reject(error)
          })
          child.on('close', (code) => {
            clearTimeout(timer)
            signal?.removeEventListener('abort', abort)
            const status = cancelled ? 'cancelled' : timedOut ? 'timed_out' : code === 0 ? 'completed' : 'failed'
            resolveResult({ status, exitCode: code, stdout, stderr, durationMs: Date.now() - started, timedOut, truncated })
          })
        })
        return result
      } finally {
        await rm(workspace, { recursive: true, force: true })
      }
    },
  }
}
