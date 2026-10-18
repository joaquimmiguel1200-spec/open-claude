import 'server-only'

export type McpServerConfig = { id: string; name: string; url: string; tokenEnv?: string; enabled?: boolean }
type JsonRpc = { jsonrpc: '2.0'; id?: number; method: string; params?: Record<string, unknown> }
const PROTOCOL_VERSIONS = ['2026-07-28', '2025-11-25', '2025-03-26'] as const
const MAX_RESPONSE_BYTES = 1_000_000

export function configuredMcpServers(): McpServerConfig[] {
  const raw = process.env.MCP_SERVERS_JSON
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is McpServerConfig => {
      if (!entry || typeof entry !== 'object') return false
      const s = entry as Record<string, unknown>
      if (s.enabled === false || typeof s.id !== 'string' || !/^[a-z0-9_-]{1,48}$/i.test(s.id)) return false
      if (typeof s.name !== 'string' || typeof s.url !== 'string') return false
      try {
        const url = new URL(s.url)
        return url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))
      } catch { return false }
    }).slice(0, 20)
  } catch { return [] }
}

function responseJson(text: string): any {
  if (text.length > MAX_RESPONSE_BYTES) throw new Error('MCP server response exceeded the 1 MB limit.')
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('data:') || trimmed.includes('\ndata:')) {
    const data = trimmed.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).filter(Boolean)
    for (let i = data.length - 1; i >= 0; i--) { try { return JSON.parse(data[i]) } catch {} }
    throw new Error('MCP server returned an invalid event stream.')
  }
  return JSON.parse(trimmed)
}

async function rpc(server: McpServerConfig, request: JsonRpc, sessionId?: string, protocolVersion = PROTOCOL_VERSION) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
    'mcp-protocol-version': protocolVersion,
  }
  if (sessionId) headers['mcp-session-id'] = sessionId
  if (server.tokenEnv && process.env[server.tokenEnv]) headers.authorization = 'Bearer ' + process.env[server.tokenEnv]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(server.url, { method: 'POST', headers, body: JSON.stringify(request), signal: controller.signal, cache: 'no-store', redirect: 'error' })
    if (!response.ok) throw new Error('MCP server returned HTTP ' + response.status + '.')
    const session = response.headers.get('mcp-session-id') || sessionId
    const text = await response.text()
    return { result: responseJson(text), sessionId: session, protocolVersion: response.headers.get('mcp-protocol-version') || protocolVersion }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('MCP server timed out after 12 seconds.')
    throw error
  } finally { clearTimeout(timer) }
}

async function initialize(server: McpServerConfig) {
  let initialized: Awaited<ReturnType<typeof rpc>> | null = null
  let lastError: unknown = null
  for (const requestedVersion of PROTOCOL_VERSIONS) {
    try {
      const attempt = await rpc(server, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: requestedVersion, capabilities: {}, clientInfo: { name: 'Open Claude', version: '1.0.0' } } }, undefined, requestedVersion)
      if (attempt.result?.error) {
        lastError = new Error(String(attempt.result.error.message || 'MCP initialization failed.'))
        continue
      }
      initialized = attempt
      break
    } catch (error) { lastError = error }
  }
  if (!initialized) throw (lastError instanceof Error ? lastError : new Error('MCP initialization failed for supported protocol versions.'))
  const sessionId = initialized.sessionId
  const negotiatedVersion = initialized.result?.result?.protocolVersion || initialized.protocolVersion
  await rpc(server, { jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId, negotiatedVersion)
  return { sessionId, protocolVersion: negotiatedVersion }
}

export async function listMcpTools(server: McpServerConfig) {
  const session = await initialize(server)
  const response = await rpc(server, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, session.sessionId, session.protocolVersion)
  if (response.result?.error) throw new Error(String(response.result.error.message || 'Unable to list MCP tools.'))
  const tools = Array.isArray(response.result?.result?.tools) ? response.result.result.tools : Array.isArray(response.result?.tools) ? response.result.tools : []
  return tools.slice(0, 100).map((tool: any) => ({
    name: String(tool.name || '').slice(0, 128),
    description: String(tool.description || '').slice(0, 1200),
    inputSchema: tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : { type: 'object', properties: {} },
    annotations: tool.annotations && typeof tool.annotations === 'object' ? tool.annotations : {},
  })).filter((tool: any) => tool.name)
}

export async function callMcpTool(server: McpServerConfig, name: string, args: Record<string, unknown>) {
  const tools = await listMcpTools(server)
  const tool = tools.find((entry: any) => entry.name === name)
  if (!tool) throw new Error('Tool not found on this MCP server.')
  if (tool.annotations?.readOnlyHint !== true) throw new Error('This tool may change data. Review the arguments and retry with confirmAction=true.')
  const session = await initialize(server)
  const response = await rpc(server, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: args } }, session.sessionId, session.protocolVersion)
  if (response.result?.error) throw new Error(String(response.result.error.message || 'MCP tool call failed.'))
  const result = response.result?.result ?? response.result
  const serialized = JSON.stringify(result)
  if (serialized.length > 20_000) throw new Error('MCP tool output exceeded the 20 KB limit.')
  return result
}
