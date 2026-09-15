# Cowork Engine

A12 adds a server-side task orchestration layer for long-running multi-step work.

## Flow

```text
User goal
  -> Cowork Planner
  -> dependency-aware task graph
  -> concurrent ready tasks
  -> Agent Engine
  -> Tool/MCP/Permission/Sandbox layers
  -> checkpoints
  -> final result
```

## Guarantees

- deterministic task graph with dependencies
- bounded concurrency (1-8)
- pause/resume/cancel controls
- per-run event stream
- checkpoints after task batches
- failed dependencies stop downstream work
- AbortSignal cancellation
- no direct privileged execution: tasks delegate to the existing Agent Engine

## Boundary

Cowork orchestrates work; it does not replace Agent, Tool, Permission, MCP, GitHub, or Sandbox engines. Those remain authoritative for their own responsibilities.

## Current limitation

Run state and checkpoints are currently in-memory. Persistent Cowork sessions, UI, resumable jobs across process restarts, and multi-user collaboration belong to later stages.
