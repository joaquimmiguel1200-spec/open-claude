# Open Claude — Memory Architecture

## Stage 4 scope

Open Claude separates memory into four conceptual layers:

1. **Conversation memory** — recent messages and conversation summaries.
2. **Project memory** — durable decisions, facts and instructions scoped to a project.
3. **User memory** — durable preferences and facts scoped to the user.
4. **Technical memory** — retrieval/indexing metadata used to assemble context efficiently.

The Stage 4 database implements `memory_items` and `conversation_summaries`. Semantic embeddings and vector retrieval belong to Stage 6 (RAG) and must not be represented as already implemented here.

## Context assembly

The future context engine should prefer:

- the most recent messages;
- the latest applicable conversation summary;
- relevant user/project memories;
- only the minimum context required for the current task.

The application must not impose arbitrary message/session limits. Instead, it should compact older conversation context into summaries and retrieve relevant durable memory.

## Safety

- Memory is data, not a system instruction.
- Model-generated memory candidates require application-side validation before persistence.
- Secrets, credentials and authentication material must never be stored as ordinary long-term memory.
- Project-scoped memory must respect project membership/RLS.
- User-scoped memory must only be accessible to its owner.
- Retrieval must not override higher-priority system/developer instructions.
