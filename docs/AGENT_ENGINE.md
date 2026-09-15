# Open Claude — Agent Engine

## A5 — Agent Engine REAL

The Agent Engine is the orchestration layer between a user goal, Skills, Context/AI, and future Tools/Permissions.

### Runtime flow

```text
user goal
  ↓
agent run
  ↓
initial plan
  ↓
skill selection
  ↓
context/capability preparation
  ↓
AI execution
  ↓
validation/result events
  ↓
completed / failed / cancelled
```

### Current implementation

- deterministic initial plan generation;
- unique run IDs;
- explicit run and step states;
- skill selection integration;
- model execution through the real AI Router;
- cancellation propagation through `AbortSignal`;
- structured lifecycle events for UI/observability;
- normalized completed/failed/cancelled results.

### Boundary

A5 does not execute arbitrary tools itself. Tool calls require the A6 Tool Engine and permission decisions belong to A7 Permission Engine. This prevents the agent planner from silently acquiring execution privileges.

### Next evolution

Later stages can replace the deterministic plan with model-assisted planning, add iterative tool loops, checkpoints, retries, result validation, and persistent run state without changing the public runtime contract.
