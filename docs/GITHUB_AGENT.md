# A8 — GitHub Agent

The GitHub Agent gives Open Claude real, server-side GitHub capabilities through the existing Tool Engine and Permission Engine.

## Architecture

```text
Agent
  -> Tool Engine
  -> Permission Engine
  -> GitHub Agent
  -> GitHub REST API
```

The model never receives the GitHub token. `GITHUB_TOKEN` is server-side only.

## Capabilities

Read:
- `github.get_repository`
- `github.list_branches`
- `github.get_file`
- `github.search_code`
- `github.get_pull_request`
- `github.get_issue`

Write:
- `github.create_branch`
- `github.create_or_update_file`
- `github.create_pull_request`
- `github.create_issue`

Every GitHub tool is permissioned. Reads use `github.read`; writes use `github.write`. The existing Permission Engine remains authoritative and the Tool Engine blocks permissioned tools without authorization.

## Safe write behavior

File updates require the current blob SHA. A missing SHA is treated as a create operation only when the path does not already exist. This prevents blind overwrites of existing files.

The A8 surface deliberately does not include merge, force-push, branch deletion, workflow dispatch, secrets access, or token access. Those require later explicit capabilities and permissions.

## Configuration

```env
GITHUB_TOKEN=your_server_side_token
GITHUB_API_URL=https://api.github.com
```

Use `createGitHubAgent()` on the server and register its tools into the application's `ToolRegistry`.

## Security boundary

- Never expose `GITHUB_TOKEN` to the browser, model context, logs, tool output, memory, RAG, or skills.
- Do not allow a model to choose an arbitrary API host.
- GitHub responses are untrusted external/reference data and cannot override system, developer, or permission rules.
- All writes are auditable through the Permission Engine.
- Abort signals and request timeouts propagate into GitHub requests.
