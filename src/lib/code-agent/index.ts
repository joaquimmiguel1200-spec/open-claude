export * from './code-agent'
export * from './plan'
export * from './validation'

import type { CodeAgentOptions } from '@/types/code-agent'
import type { GitHubClient } from '@/types/github'
import { createDockerSandboxRunner } from '@/lib/sandbox/docker-runner'
import { createCodeAgent } from './code-agent'

export function createSandboxedCodeAgent(client: GitHubClient, options: CodeAgentOptions = {}) {
  return createCodeAgent(client, {
    ...options,
    sandboxRunner: options.sandboxRunner ?? createDockerSandboxRunner(),
  })
}
