import 'server-only'
import { createHash } from 'node:crypto'
import { Sandbox } from '@vercel/sandbox'
import type { SandboxFile, SandboxRunResult } from '@/types/sandbox'

const MAX_OUTPUT = 64_000
const MAX_FILE_BYTES = 180_000
const SNAPSHOT_TTL = 7 * 24 * 60 * 60 * 1000

function safePath(value: string) {
  const normalized = value.split(String.fromCharCode(92)).join('/')
  if (!normalized || normalized.startsWith('/') || normalized.split('/').some((part) => part === '..' || part === '') || normalized.startsWith('.git/')) {
    throw new Error('Caminho de arquivo inválido para o workspace.')
  }
  return normalized
}

export async function runPersistentTerminal(input: {
  scope: string
  command: string
  files?: SandboxFile[]
  signal?: AbortSignal
  timeoutMs?: number
}): Promise<SandboxRunResult> {
  const command = input.command.trim()
  if (!command || command.length > 2_000 || command.includes(String.fromCharCode(0))) {
    throw new Error('Informe um comando com até 2.000 caracteres.')
  }

  const name = `open-claude-${createHash('sha256').update(input.scope).digest('hex').slice(0, 32)}`
  const timeout = Math.max(30_000, Math.min(input.timeoutMs ?? 120_000, 300_000))
  const sandbox = await Sandbox.getOrCreate({
    name,
    image: 'vercel/sandbox/node:22',
    persistent: true,
    snapshotExpiration: SNAPSHOT_TTL,
    keepLastSnapshots: { count: 1 },
    timeout,
    resources: { vcpus: 1 },
    networkPolicy: {
      allow: {
        'registry.npmjs.org': [],
        'registry.yarnpkg.com': [],
        'pypi.org': [],
        'files.pythonhosted.org': [],
      },
    },
    tags: { app: 'open-claude', kind: 'terminal' },
  })

  const started = Date.now()
  let stoppedForAbort = false
  const abort = () => {
    stoppedForAbort = true
    void sandbox.stop().catch(() => undefined)
  }

  try {
    for (const file of (input.files ?? []).slice(0, 20)) {
      const path = safePath(file.path)
      if (Buffer.byteLength(file.content, 'utf8') > MAX_FILE_BYTES) {
        throw new Error(`Arquivo grande demais para o terminal: ${path}`)
      }
      const existing = await sandbox.readFileToBuffer({ path })
      if (!existing) {
        await sandbox.writeFiles([{ path, content: Buffer.from(file.content, 'utf8') }])
      }
    }

    if (input.signal?.aborted) {
      return { status: 'cancelled', exitCode: null, stdout: '', stderr: '', durationMs: Date.now() - started, timedOut: false, truncated: false }
    }

    input.signal?.addEventListener('abort', abort, { once: true })
    const result = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-lc', command],
      cwd: '/vercel/sandbox',
    })
    input.signal?.removeEventListener('abort', abort)

    let stdout = await result.stdout()
    let stderr = await result.stderr()
    let truncated = false
    if (stdout.length > MAX_OUTPUT) { stdout = stdout.slice(0, MAX_OUTPUT); truncated = true }
    if (stderr.length > MAX_OUTPUT) { stderr = stderr.slice(0, MAX_OUTPUT); truncated = true }
    return {
      status: stoppedForAbort ? 'cancelled' : result.exitCode === 0 ? 'completed' : 'failed',
      exitCode: result.exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - started,
      timedOut: false,
      truncated,
    }
  } catch (error) {
    return {
      status: input.signal?.aborted ? 'cancelled' : 'failed',
      exitCode: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Falha ao executar comando no workspace.',
      durationMs: Date.now() - started,
      timedOut: false,
      truncated: false,
    }
  } finally {
    input.signal?.removeEventListener('abort', abort)
    await sandbox.stop().catch(() => undefined)
  }
}
