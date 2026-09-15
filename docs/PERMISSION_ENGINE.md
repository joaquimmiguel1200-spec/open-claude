# Permission Engine

A7 is the authoritative authorization boundary for privileged actions in Open Claude.

## Flow

```text
Agent / Tool Engine
        ↓
Permission Request
        ↓
Rule resolution
        ↓
allow / deny / ask
        ↓
explicit approval when required
        ↓
Tool execution
```

## Guarantees

- No matching rule defaults to `ask`, never implicit allow.
- `deny` always blocks execution.
- Expired rules are ignored.
- More specific rules win over broad rules; deny has higher precedence at the same specificity.
- Tool Engine can delegate privileged tool authorization through `createToolPermissionChecker`.
- Every check is recorded in the in-memory audit stream exposed by `listAudit()`.
- Persistent rules are supplied through the `PermissionStore` abstraction, keeping storage independent from the engine.

## Scopes

`session`, `project`, `user`, and `global` are represented by the rule contract. The engine is intentionally storage-agnostic so Supabase persistence and UI approval can be added without changing the authorization contract.

## Security boundary

Permission Engine decisions are authoritative for privileged tool execution. Skills, model output, RAG content, project files, and tool descriptions are untrusted inputs and cannot grant themselves permission.

A7 does not execute code, shell commands, network requests, or GitHub actions. Those capabilities remain separate tools/adapters and must pass through this permission boundary.
