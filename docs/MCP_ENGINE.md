# A11 — MCP Engine

A11 adds a real Model Context Protocol boundary to Open Claude.

## Flow

```text
Agent
  ↓
Tool Engine
  ↓
Permission Engine
  ↓
MCP Engine
  ↓
MCP Client
  ↓
MCP Server
```

## Implemented

- MCP server configuration and lifecycle
- JSON-RPC 2.0 client transport
- stdio MCP server process support
- HTTP JSON-RPC support through configured URL
- MCP initialize / initialized handshake
- tools/list
- tools/call
- resources/list
- resources/read
- prompts/list
- prompts/get
- cancellation/timeout propagation
- MCP tools bridged into the existing Tool Registry
- MCP tools require permission through the existing Tool Engine/Permission Engine boundary
- MCP server credentials/headers remain server-side

## Security boundary

An MCP server is untrusted external capability. Its tool descriptions, resources and prompts cannot override system/developer instructions or grant themselves permissions. MCP tools are exposed through the Tool Engine and marked `requiresPermission`.

Network access is not implicitly granted to the MCP server by the MCP layer. Server configuration and deployment must explicitly provide the transport endpoint/process environment.

## Transport scope

The client implements stdio and HTTP JSON-RPC directly. SSE/session-specific transport behavior can be added as a transport adapter without changing the engine or tool contracts.

## A11 boundary

A11 provides protocol connectivity and capability discovery. It does not itself decide whether a tool may execute; the existing Permission Engine remains authoritative. It also does not execute arbitrary shell/code on the Open Claude host.
