# MCP integration — implementation and deployment

## What is implemented

Open Claude includes a server-side MCP client for the Streamable HTTP transport, an authenticated `/api/mcp` route, and a `/mcp` management/testing screen. It negotiates the current protocol version (`2026-07-28`) with compatibility fallback to `2025-11-25` and `2025-03-26`, performs `initialize`, sends `notifications/initialized`, discovers tools with `tools/list`, and invokes read-only tools with `tools/call`.

The first release deliberately blocks tools that do not declare `annotations.readOnlyHint=true`. Tool execution is limited by per-user rate limiting, a 12-second request timeout, a 1 MB server response cap and a 20 KB returned tool output cap. Server URLs and bearer tokens are read only from server-side environment variables.

## Configure a server

Set `MCP_SERVERS_JSON` in the Vercel project environment. Example:

```json
[
  {
    "id": "example",
    "name": "Example MCP server",
    "url": "https://mcp.example.com/mcp",
    "tokenEnv": "EXAMPLE_MCP_TOKEN",
    "enabled": true
  }
]
```

Store the actual token in a separate server-only environment variable named by `tokenEnv`. Never put tokens inside `MCP_SERVERS_JSON`, `.env.example`, the browser, or a committed file. URLs must use HTTPS in production. After setting environment variables, redeploy the project and visit `/mcp` while signed in.

## Scope and limitations

- Only Streamable HTTP is implemented here. Local `stdio` servers and legacy SSE transport are not supported by this client.
- The current version supports discovery and read-only tool invocation. Tools without an explicit read-only annotation are blocked even if a caller asks to confirm.
- MCP resources, prompts, OAuth-based per-server authorization, server registry administration, and durable audit storage for every tool invocation are not yet implemented.
- An integration is not considered enabled merely because it appears in an upstream repository. Configure and test each server separately.
- MCP is a protocol, not a single fixed catalogue of "Anthropic MCPs". Servers are maintained by different parties and may have independent licenses, risks, credentials and network access.

## Security checks before enabling connectors

Review the server's source, license, permissions, network destinations, authentication model and tool schemas. Treat descriptions, arguments and outputs as untrusted data. Keep tokens server-side, restrict each server to the minimum required credentials, and test with non-production data first.

## Validation status

A passing production integration test requires at least one configured MCP endpoint and credentials. If `MCP_SERVERS_JSON` is absent, `/mcp` reports that setup is required. Do not claim a live connector is working until a real read-only tool has passed an end-to-end check.

## Official references

- [Model Context Protocol specification](https://modelcontextprotocol.io/)
- [MCP servers repository](https://github.com/modelcontextprotocol/servers)
- [Anthropic documentation](https://docs.anthropic.com/)
- [Anthropic MCP announcement](https://www.anthropic.com/news/model-context-protocol)
