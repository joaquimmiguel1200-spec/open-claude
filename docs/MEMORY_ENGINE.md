# Open Claude — A3 Memory Engine

## Objective
A3 turns the Stage 4 memory tables into an application service: capture durable information from user turns, validate it, deduplicate it, persist it through the existing Supabase/RLS boundary, and retrieve relevant memories for Context Engine assembly.

## Flow

```text
user turn
  ↓
extract candidates
  ↓
classify + importance
  ↓
normalize + security policy
  ↓
dedupe by user/project/key
  ↓
Supabase memory_items
  ↓
retrieve scoped memories
  ↓
rank by relevance + importance + scope
  ↓
Context Engine
```

## Capture policy
- Only user turns are automatically captured by the deterministic extractor.
- Explicit requests such as remembering or saving something receive higher importance.
- Preferences, facts, instructions, decisions and project statements are classified locally.
- Unknown conversational text is not stored merely because it appeared in a chat.
- An AI extractor can be added later behind the same candidate contract without changing persistence or security code.

## Security
- `shouldPersistMemory` runs before every insert.
- Credential/token/private-key patterns are rejected.
- Memory content is capped at 2,000 characters per candidate.
- Project/chat scope is preserved in the candidate and database query.
- The store uses the caller's Supabase client, so existing RLS remains authoritative; this engine does not require a service-role key.
- Memory is reference data and never becomes a system instruction.

## Deduplication
`dedupe_key` is a normalized content key. Existing records in the same user/project scope are updated rather than duplicated; importance is promoted to the highest observed value and `lastSeenAt` is retained in metadata.

## Retrieval
`retrieveMemories` loads only the caller's permitted records and uses the existing lexical/importance/scope ranking. The Context Engine can then receive the returned `MemoryItem[]` as `ContextSources.memories`.

## Runtime integration
The integration point is intentionally explicit:

1. persist the user message;
2. call `captureMemories` for that user turn;
3. call `retrieveMemories` using the current query/project/chat;
4. pass the results into `buildContextRequest`;
5. route the resulting request through the AI Router.

This avoids hidden global state and keeps authorization at the application/database boundary.
