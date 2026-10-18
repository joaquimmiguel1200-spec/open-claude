# MCP integration status — Open Claude

## Verified status

The repository has an MCP-related database table (`mcp_connections`) and UI/configuration references, but the source paths inspected for this review did not establish a complete, testable MCP client runtime or a server registry endpoint. Therefore **do not treat MCP as production-ready or claim that official MCP servers are installed** based only on this document.

This page is a plan and security contract for implementing and validating MCP, not proof of implementation.

## Target architecture

```text
Chat / Code / Cowork
  -> server-side tool registry
  -> authorization and approval checks
  -> MCP client / transport adapter
  -> explicitly configured external MCP server
```

## Requirements before enabling an MCP server

- Implement and test the MCP initialization handshake and negotiated protocol version.
- Implement the required JSON-RPC operations for tools; add resources and prompts only when supported and tested.
- Support documented transports deliberately; do not claim stdio, Streamable HTTP, or legacy SSE unless an adapter exists and passes integration tests.
- Store server credentials only in protected server-side storage; never send secrets to the browser.
- Enforce per-user/per-project authorization and explicit confirmation for writes, deletion, shell execution, external messages, and other consequential actions.
- Apply timeouts, cancellation, request/output limits, audit events, and safe error handling.
- Treat tool descriptions, prompts, resources, and results as untrusted input.
- Add mocked protocol tests and at least one integration test against a reviewed server before marking the connector enabled.

## Official references

- [Model Context Protocol specification](https://modelcontextprotocol.io/)
- [Official MCP servers repository](https://github.com/modelcontextprotocol/servers)
- [Anthropic documentation](https://docs.anthropic.com/)
- [Anthropic announcement about MCP](https://www.anthropic.com/news/model-context-protocol)

These references do not mean that every server is maintained by Anthropic or automatically available to this application. Evaluate each server's maintainer, license, security posture, credentials, network access, and compatibility separately.

## Completion criteria

MCP is only considered delivered when source implementation, user-facing configuration, permissions, secrets handling, tests, and production smoke checks are all present. A database table or documentation page alone does not satisfy these criteria.
