import type { ToolRegistry } from '@/lib/tools/tool-registry'
import type { GitHubClient } from '@/types/github'
import { createGitHubClient, createGitHubClientFromEnv } from './github-client'
import { createGitHubTools } from './github-tools'

export interface GitHubAgentOptions {
  token?: string
  baseUrl?: string
  client?: GitHubClient
}

export function createGitHubAgent(options: GitHubAgentOptions = {}) {
  const client = options.client ?? (options.token ? createGitHubClient({ token: options.token, baseUrl: options.baseUrl }) : createGitHubClientFromEnv())
  const tools = createGitHubTools(client)

  return {
    client,
    tools,
    register(registry: ToolRegistry) {
      registry.registerMany(tools)
      return registry
    },
  }
}
