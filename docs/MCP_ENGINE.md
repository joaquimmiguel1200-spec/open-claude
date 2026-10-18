# MCP Engine — Open Claude

Open Claude implements an MCP client boundary so explicitly configured servers can expose tools, resources and prompts to the agent runtime. MCP is an integration protocol, not a list of servers automatically supplied by Anthropic.

## Request flow

```text
Chat / Code / Cowork
  -> Tool Registry
  -> Permission Engine
  -> MCP Engine
  -> configured MCP client transport
  -> external MCP server
```

## Protocol capabilities documented by the engine

- JSON-RPC 2.0 request/response handling
- initialization handshake
- `tools/list` and `tools/call`
- `resources/list` and `resources/read`
- `prompts/list` and `prompts/get`
- timeout/cancellation propagation
- bridge of discovered tools into the Tool Registry
- permission checks through the existing Tool/Permission boundary
- server-side handling of configured credentials and headers

The implemented transport scope is stdio and HTTP JSON-RPC. Do not assume support for every optional MCP transport feature (including session-specific SSE behavior) unless an adapter is implemented and tested.

## Official references

- [Model Context Protocol — specification and documentation](https://modelcontextprotocol.io/)
- [MCP servers repository](https://github.com/modelcontextprotocol/servers)
- [Anthropic documentation](https://docs.anthropic.com/)
- [Anthropic MCP announcement and ecosystem context](https://www.anthropic.com/news/model-context-protocol)

These references describe the ecosystem; they do not mean every server is maintained by Anthropic or is automatically available in Open Claude. Each integration must be evaluated for license, maintenance status, authentication, network access, required secrets and compatibility.

## Safe integration checklist

1. Configure only a server that has been reviewed and that the operator is authorized to use.
2. Keep credentials server-side; never put private tokens in browser code or public environment variables.
3. Grant the minimum tool/resource permissions required.
4. Treat all server-provided descriptions, prompts, resources and outputs as untrusted data.
5. Require explicit authorization for writes, deletion, external messages, shell execution or other consequential actions.
6. Set timeouts, input/output limits, audit events and cancellation behavior.
7. Do not expose arbitrary host filesystem or network access by default.
8. Verify behavior with integration tests against the actual configured server before marking it enabled.

## Status boundary

This document describes the engine contract and intended security boundary. A server is only usable when its configuration, runtime transport, secrets and permissions are present in the target environment. It is not a guarantee that every official, community or vendor MCP server has been installed.
