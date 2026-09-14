# Open Claude Architecture

## Runtime flow

User → Next.js UI → server-side application boundary → Supabase / AI provider / future tools

## Core layers

1. UI and interaction layer
2. Authentication and session layer
3. Chat service
4. Context and memory engine
5. Project and file workspace layer
6. Tool/MCP orchestration
7. Permission engine
8. External integrations
9. Sandboxed execution
10. Persistence and audit

## Workspace model

Projects are the durable workspace boundary for chats, memory and files. Project roles are `owner`, `editor`, and `viewer`.

Files use a database catalog (`public.files`) plus a private Supabase Storage bucket. The database owns authorization metadata; Storage holds the bytes. Storage paths are namespaced by uploader UUID and stable file UUID.

## Chat lifecycle

1. Authenticate the user.
2. Resolve or create the chat.
3. Resolve the active project, when applicable.
4. Resolve attached/relevant files, when applicable.
5. Persist the user message.
6. Load relevant conversation history.
7. Later stages add summaries, memory and RAG context.
8. Send the resulting context to the configured agent runtime.
9. Stream assistant/tool events to the UI.
10. Persist the completed assistant response and relevant metadata.

## Autonomy boundary

An agent may autonomously perform substeps required to complete the user's explicitly requested task. It must not silently start unrelated future stages or objectives.

## Repository rule

Every meaningful implementation stage should be represented in Git history. Secrets and generated local credentials must never be committed.
