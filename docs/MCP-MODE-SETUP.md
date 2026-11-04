# MCP setup and mode isolation

Open Claude reads remote MCP server definitions from the server-only environment variable `MCP_SERVERS_JSON`. Do not put bearer tokens or provider keys in source files, browser storage, or public environment variables.

Example (placeholders only):
```json
[
  {
    "id": "github-code",
    "name": "GitHub — Development",
    "url": "https://YOUR-MCP-HOST.example/mcp",
    "tokenEnv": "MCP_GITHUB_TOKEN",
    "enabled": true,
    "modes": ["code"]
  },
  {
    "id": "office-workspace",
    "name": "Office and Administration",
    "url": "https://YOUR-MCP-HOST.example/mcp",
    "tokenEnv": "MCP_OFFICE_TOKEN",
    "enabled": true,
    "modes": ["cowork"]
  },
  {
    "id": "research-readonly",
    "name": "Research",
    "url": "https://YOUR-MCP-HOST.example/mcp",
    "tokenEnv": "MCP_RESEARCH_TOKEN",
    "enabled": true,
    "modes": ["chat"]
  }
]
```

- `modes` is an allowlist: `chat`, `code`, `cowork`.
- A server without `modes` defaults to Chat only. It is never implicitly exposed to Code or Cowork.
- Code must only receive development, repository, testing, deployment and software-engineering connectors.
- Cowork must only receive office, document, calendar, spreadsheet, task and administrative connectors.
- Chat may receive explicitly approved research and read-only connectors.
- Every connector needs a reviewed host, authentication secret, minimum scopes and test before enablement.
- Current MCP execution blocks tools that are not explicitly marked read-only. Mutating tool execution needs a separate permission/confirmation implementation.
- Each secret referenced by `tokenEnv` must be stored in Vercel as a server-side environment variable and must never use a `NEXT_PUBLIC_` prefix.
