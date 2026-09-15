# Tool Engine

## A6 status

The Tool Engine is implemented as a server-side execution boundary between the Agent Engine and concrete tool adapters.

## Architecture

```text
Agent / future model tool call
        ↓
Tool Engine
  ├─ registry lookup
  ├─ input schema validation
  ├─ permission gate (A7 when required)
  ├─ timeout + cancellation
  ├─ executor adapter
  ├─ output-size enforcement
  └─ normalized result/events
```

## Contracts

`src/types/tools.ts` defines:
- tool definitions and JSON-like input schemas;
- execution context;
- tool calls/results;
- structured lifecycle events;
- normalized error codes;
- executor and permission interfaces.

## Registry

`ToolRegistry` keeps tool definitions and executor adapters separate from the execution engine. Duplicate names are rejected and names are validated.

## Validation

`validateToolInput` validates object properties, required fields, primitive types, arrays, enums, ranges, string lengths and `additionalProperties: false`.

This is intentionally dependency-free. A future JSON Schema implementation can replace the validator without changing the Tool Engine contract.

## Execution safety

Every call receives:
1. registration lookup;
2. input validation;
3. a permission check when the tool is marked `dangerous` or `requiresPermission`;
4. a timeout;
5. an AbortSignal-aware cancellation path;
6. an output character limit;
7. a normalized result/error.

Tools requiring permission are **not executed** unless a permission checker authorizes them. This keeps A7 authoritative and prevents A6 from silently becoming a privilege-escalation layer.

The timeout prevents the Tool Engine from waiting forever, although an adapter should also implement cooperative cancellation because JavaScript cannot forcibly stop arbitrary asynchronous work.

## Events

The engine emits:
- `tool.call.started`
- `tool.call.completed`
- `tool.call.failed`
- `tool.call.cancelled`

These events are suitable for Agent/Cowork UI streaming and audit logging later.

## Built-in tool

`current_time` is included as a safe reference adapter. It requires no privileged permission and returns an ISO timestamp plus Unix milliseconds.

External tools such as filesystem mutation, shell execution, GitHub writes, network requests, browser control and sandbox execution must be implemented as explicit adapters and should be permission-gated. They are intentionally not opened in A6.

## Agent boundary

A5 remains responsible for orchestration. A6 exposes the execution primitive that A5/A7+ can consume. The model/provider contract does not yet claim provider-specific native tool-call support; that belongs to the next integration work where it can be implemented without bypassing the Permission Engine.
