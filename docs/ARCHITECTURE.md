# Open Claude Architecture

## Runtime flow

User → Next.js UI → server-side application boundary → Supabase / AI provider / future tools

## Core layers

1. UI and interaction layer
2. Authentication and session layer
3. Chat service
4. Context and memory engine
5. Tool/MCP orchestration
6. Permission engine
7. External integrations
8. Sandboxed execution
9. Persistence and audit

## Chat lifecycle

1. Authenticate the user.
2. Resolve or create the chat.
3. Persist the user message.
4. Load relevant conversation history.
5. Later stages add summaries, memory and RAG context.
6. Send the resulting context to the configured agent runtime.
7. Stream assistant/tool events to the UI.
8. Persist the completed assistant response and relevant metadata.

## Autonomy boundary

An agent may autonomously perform substeps required to complete the user's explicitly requested task. It must not silently start unrelated future stages or objectives.

## Repository rule

Every meaningful implementation stage should be represented in Git history. Secrets and generated local credentials must never be committed.
