import 'server-only'
import { configuredMcpServers, listMcpTools, callMcpTool } from '@/lib/mcp/client'

export type MCPWorkMode = 'chat' | 'code' | 'cowork'

function relevance(goal: string, name: string, description: string) {
  const terms = goal.toLowerCase().split(/[^a-z0-9À-ÿ]+/i).filter((term) => term.length >= 4)
  const source = (name + ' ' + description).toLowerCase()
  return terms.reduce((score, term) => score + (source.includes(term) ? 1 : 0), 0)
}

/** Execute only mode-allowlisted MCP tools explicitly annotated as read-only. */
export async function runMcpReadTools(mode: MCPWorkMode, goal: string, signal?: AbortSignal): Promise<string[]> {
  const servers = configuredMcpServers().filter((server) => server.modes?.includes(mode))
  if (!servers.length || signal?.aborted) return []
  const discovered = await Promise.all(servers.map(async (server) => {
    try { return { server, tools: await listMcpTools(server) } }
    catch (error) {
      console.warn('[mcp-mode-runner] discovery failed', { server: server.id, mode, reason: error instanceof Error ? error.message.slice(0, 140) : 'unknown' })
      return { server, tools: [] }
    }
  }))
  const candidates = discovered.flatMap(({ server, tools }) => tools
    .filter((tool: any) => tool.annotations?.readOnlyHint === true && !(Array.isArray(tool.inputSchema?.required) && tool.inputSchema.required.length))
    .map((tool: any) => ({ server, tool, score: relevance(goal, tool.name, tool.description) })))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  const results: string[] = []
  for (const item of candidates) {
    if (signal?.aborted) break
    try {
      const result = await callMcpTool(item.server, item.tool.name, {})
      results.push('[MCP somente leitura: ' + item.server.name + ' / ' + item.tool.name + ']\n' + JSON.stringify(result).slice(0, 8000))
    } catch (error) {
      console.warn('[mcp-mode-runner] tool failed', { server: item.server.id, tool: item.tool.name, mode, reason: error instanceof Error ? error.message.slice(0, 140) : 'unknown' })
    }
  }
  return results
}
