# Code Agent

The Code Agent is the controlled code-editing layer above the GitHub Agent and Sandbox Engine.

## Execution flow

```text
Agent
  ↓
Code Agent
  ↓
Sandbox Engine (Docker)
  ↓
edit in memory
  ↓
containerized tests
  ↓
failed? ──→ revision callback ──→ sandbox again
  │
  └─ passed
       ↓
GitHub Agent
       ↓
commit
```

## Sandbox-first rule

When `CodeAgentRequest.test` is configured, the Code Agent validates the proposed edits in the sandbox **before committing them to GitHub**. If no sandbox runner is supplied, execution fails closed instead of committing untested code.

The `createSandboxedCodeAgent()` factory injects the Docker sandbox runner automatically.

## Test loop

1. Build the proposed workspace from the supplied test files plus current edits.
2. Run each command sequentially inside an isolated Docker container.
3. Stop at the first failing command.
4. If a `revise` callback is configured, pass the diagnostics to the revision layer.
5. Replace the in-memory edits and validate again.
6. Commit only after the sandbox test sequence succeeds.
7. Stop after the configured maximum number of iterations.

The default maximum is 3 test iterations.

## Isolation

The Docker runner uses a read-only root filesystem, a temporary writable workspace, dropped Linux capabilities, `no-new-privileges`, CPU/memory/process limits, timeout, output limits, and network isolation by default. Sensitive environment-variable names are rejected. Sandbox paths cannot escape the workspace.

## Boundary

The sandbox is an execution boundary, not a permission bypass. Network access remains opt-in and privileged capabilities must continue through the Permission Engine.

The current GitHub write path still performs one Contents API commit per changed file. The sandbox validates the complete proposed in-memory edit set before any of those commits occur, but the final multi-file GitHub operation is not yet atomic. A future Git Data API implementation can add a single tree/commit transaction without changing the sandbox contract.
