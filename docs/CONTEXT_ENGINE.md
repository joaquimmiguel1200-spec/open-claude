# Context Engine

The Context Engine assembles authorized project, memory, summary, RAG, tool and recent-message sources into a model-ready request.

## Flow

```text
sources -> ranking -> token budget -> progressive packing -> AIRequest -> AI Router
```

Priority is system instructions, project context, relevant memories, conversation summaries, RAG results, tool context, then recent conversation. Recent messages remain real chat messages so role and order are preserved.

`maxTokens` is the total input-context budget. `reservedOutputTokens` is held back for output. Fixed system/recent/request messages are subtracted before retrieved context is packed, preventing silent budget overflow.

The default token estimator is model-agnostic (`~4 characters/token`) and can later be replaced by a model tokenizer without changing the public API.

RAG, memory, project and tool material is explicitly wrapped as reference data and must not become a system instruction merely because it was retrieved.

`generateAIWithContext()` and `streamAIWithContext()` in `src/lib/ai/index.ts` connect the Context Engine directly to the AI Router.

The built context exposes estimated input tokens, reserved output tokens, available budget, dropped items, per-source statistics and source labels for future telemetry.
