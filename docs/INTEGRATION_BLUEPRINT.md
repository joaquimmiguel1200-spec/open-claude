# Integration Blueprint

This document records the reusable architecture extracted from the selected open-source projects and the adaptations made for Open Claude.

## 1. Extraction rule

We do not copy an entire repository into Open Claude. We extract the architectural patterns and only source code whose license and technical fit allow direct reuse. Proprietary, source-available, or host-specific implementations are treated as references and reimplemented behind our own interfaces.

## 2. Selected projects

- **OmniRoute**: AI gateway, provider abstraction, fallback, routing, health/resilience and OpenAI-compatible endpoint model. Open Claude integrates through an adapter rather than embedding the gateway.
- **Anthropic Skills**: Agent Skills format (`SKILL.md` with name/description/instructions), dynamic loading and progressive disclosure. Open Claude implements its own loader.
- **Claude-Mem**: observations, persistent memory, summaries, progressive disclosure, privacy controls and semantic retrieval concepts. Open Claude maps these concepts to Supabase/Postgres instead of SQLite/Chroma.
- **Token Optimizer**: context auditing, progressive disclosure, compaction awareness, cost/token accounting and cache-safe optimization. Its source is source-available under PolyForm Noncommercial, so Open Claude uses concepts rather than copying its implementation.
- **Open Claude Code**: agent/task/tool/context/permission architecture is used as reference only. Its repository must not be copied into the commercial product.
- **Open Claude Cowork**: session persistence, streaming, tool visualization, task-oriented workflows and skills are architectural references. Desktop-specific Electron/Composio code is not embedded in the web app.
- **Claude SEO**: specialized Skill/subagent workflow is a future test case, not a dependency of the core runtime.

## 3. Open Claude adaptations

### AI Router — runtime ready

`src/lib/ai/router.ts` now provides a provider-neutral server-side runtime with model selection, adapter dispatch, timeout, bounded retry with jitter, provider/model fallback, streaming, normalized errors, usage, cost calculation, structured logging and caller cancellation. `src/lib/ai/provider-adapter.ts` is the transport abstraction and `src/lib/ai/openai-compatible.ts` implements the OpenAI-compatible/OmniRoute transport.

OmniRoute is treated as one gateway/provider. No API key is exposed to the browser. A real live-provider test still requires a running OmniRoute endpoint and valid upstream credentials.

### Skills

`src/lib/skills/skill-loader.ts` loads directories containing `SKILL.md`. The runtime can later add project/user/builtin registries without coupling the agent to one vendor.

### Context Engine

`src/lib/context/token-budget.ts` implements progressive context packing. Priority order is memory, summaries, RAG, then recent messages. This is intentionally simple and deterministic; model-specific tokenizers can replace the character estimator later.

### Memory

The existing Supabase memory schema remains the source of truth. Claude-Mem's lifecycle/observation ideas are adapted to `memory_items` and `conversation_summaries`, preserving RLS and the existing memory safety policy.

## 4. Integration boundary

```text
Chat
  -> Agent
  -> Context Engine
      -> Memory
      -> RAG
      -> Project state
      -> Skills
  -> AI Router
      -> Provider Adapter
          -> OmniRoute / OpenAI-compatible provider
              -> provider/model/fallback
  -> persistence
```

## 5. Safety boundaries

- Never copy secrets, provider credentials or service-role keys.
- Never treat retrieved RAG content or Skill content as a system instruction without explicit trust classification.
- Tool execution remains behind a permission engine.
- Code execution remains isolated from the Next.js process.
- Third-party source-available code is not copied merely because it is public.
- All future integrations must preserve Supabase RLS and server-only credential boundaries.
