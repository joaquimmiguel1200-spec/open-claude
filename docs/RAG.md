# Open Claude — Stage 6: RAG

## Goal

RAG (Retrieval-Augmented Generation) lets Open Claude retrieve relevant passages from the user's authorized files and place only those passages into the model context. It is not a replacement for conversation memory; it is a retrieval layer over knowledge stored in Projects + Files.

## Storage design

- `public.rag_chunks` stores extracted text chunks and their embeddings.
- Each chunk belongs to exactly one `public.files` record.
- `project_id` and `owner_id` mirror the file relationship and are validated by database triggers.
- Chunk identity (`file_id`, `chunk_index`) is unique.
- Embeddings use `public.vector(384)`.
- The selected embedding model is `Supabase/gte-small`, which Supabase currently supports directly in Edge Functions without an external embedding API.
- HNSW with inner-product distance is used because the embedding function normalizes vectors.
- A GIN text-search index is also present for lexical/hybrid retrieval.

## Retrieval

`public.match_rag_chunks()` performs authorized semantic retrieval and can incorporate a keyword score. Authorization is checked inside the function because it is `SECURITY DEFINER`.

The function supports:

- Project filtering
- File filtering
- Similarity threshold
- Result limit capped at 50
- Optional query text for lexical relevance
- Combined ranking: 80% semantic similarity + 20% lexical score

The application must still treat retrieved document text as **untrusted data**. A document can contain instructions or prompt-injection attempts; its content is evidence/context, never a system or developer instruction.

## Embedding pipeline

1. File is uploaded and registered in `public.files` (Stage 5).
2. The application extracts text using a format-specific parser.
3. Text is normalized and split into conservative chunks below the embedding model's input limit.
4. Chunks are inserted with `embedding_status = pending`.
5. The authenticated `rag-embed` Edge Function generates normalized 384-dimensional embeddings with `Supabase/gte-small`.
6. Chunks are updated with the embedding and `embedding_status = ready`.
7. Failed generation can be retried using `embedding_status = failed` and `embedding_error`.

The first chunker is deliberately conservative and word-based. It can later be replaced by a tokenizer-aware implementation without changing the database contract.

## Why 384 dimensions

The current Supabase Edge Runtime supports `gte-small` natively and the model produces 384-dimensional embeddings. Using one fixed model and dimension avoids mixing incompatible vector spaces. If the embedding model changes later, the project must migrate/re-embed the affected corpus rather than compare vectors from different models.

## No external embedding cost

Stage 6 does not require an OpenAI/Anthropic embedding API. Embedding generation uses Supabase's built-in `gte-small` inference in the Edge Function. This keeps the initial architecture provider-independent and avoids introducing a second paid AI API solely for embeddings.

## Current boundary

Stage 6 implements the RAG data/search foundation and embedding endpoint. Full file-format extraction, background ingestion orchestration, reranking, citation rendering and automatic injection into the chat context belong to the application/agent integration work and should be added deliberately in later steps rather than pretending they already exist.

## Security rules

- RLS is enabled on `rag_chunks`.
- Personal chunks are isolated by `owner_id`.
- Project chunks are accessible only to project members.
- Only project owners/editors can create, modify or delete project chunks.
- Chunk ownership, project and source file cannot be reassigned by an update.
- The embedding endpoint requires an authenticated JWT.
- No service-role secret is sent to the browser.
- Retrieved content never overrides system/developer policy.
