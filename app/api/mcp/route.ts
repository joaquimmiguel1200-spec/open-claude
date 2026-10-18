import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/server'
import { clientKey, rateLimit } from '@/lib/security/rate-limit'
import { callMcpTool, configuredMcpServers, listMcpTools } from '@/lib/mcp/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':mcp-list', 15, 60_000)
    if (!limit.allowed) return jsonError('Muitas solicitações MCP. Tente novamente em instantes.', 429)
    const servers = configuredMcpServers()
    const url = new URL(request.url)
    const requested = url.searchParams.get('server')
    if (requested) {
      const server = servers.find(item => item.id === requested)
      if (!server) return jsonError('Servidor MCP não configurado ou desabilitado.', 404)
      const tools = await listMcpTools(server)
      return NextResponse.json({ server: { id: server.id, name: server.name }, tools }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json({
      configured: servers.length,
      servers: servers.map(server => ({ id: server.id, name: server.name, url: new URL(server.url).origin, status: 'configured' })),
      setupRequired: servers.length === 0,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return jsonError('Entre para acessar as conexões MCP.', 401)
    if (error instanceof Error && error.message === 'MFA_REQUIRED') return jsonError('Conclua a verificação MFA para acessar as conexões MCP.', 403)
    return jsonError(error instanceof Error ? error.message : 'Não foi possível consultar os servidores MCP.', 502)
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const limit = rateLimit(clientKey(request, user.id) + ':mcp-call', 10, 60_000)
    if (!limit.allowed) return jsonError('Limite de chamadas MCP atingido.', 429)
    const body = await request.json().catch(() => null)
    if (!body || typeof body.server !== 'string' || typeof body.tool !== 'string' || !body.arguments || typeof body.arguments !== 'object' || Array.isArray(body.arguments)) return jsonError('Informe server, tool e arguments válidos.')
    const servers = configuredMcpServers()
    const server = servers.find(item => item.id === body.server)
    if (!server) return jsonError('Servidor MCP não configurado ou desabilitado.', 404)
    const tools = await listMcpTools(server)
    const tool = tools.find((item: any) => item.name === body.tool)
    if (!tool) return jsonError('Ferramenta não encontrada neste servidor MCP.', 404)
    if (tool.annotations?.readOnlyHint !== true) {
      if (body.confirmAction !== true) return jsonError('A ferramenta não está marcada como somente leitura. Confirme explicitamente a ação após revisar os argumentos.', 409)
      return jsonError('A execução de ferramentas com efeitos colaterais está bloqueada nesta primeira versão. Use apenas ferramentas com readOnlyHint=true.', 403)
    }
    const result = await callMcpTool(server, body.tool, body.arguments as Record<string, unknown>)
    return NextResponse.json({ ok: true, server: server.id, tool: body.tool, result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') return jsonError('Entre para executar ferramentas MCP.', 401)
    if (error instanceof Error && error.message === 'MFA_REQUIRED') return jsonError('Conclua a verificação MFA para executar ferramentas MCP.', 403)
    const message = error instanceof Error ? error.message : 'A chamada MCP falhou.'
    return jsonError(message, message.includes('timed out') ? 504 : 502)
  }
}
