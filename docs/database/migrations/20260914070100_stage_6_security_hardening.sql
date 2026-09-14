-- Open Claude — Stage 6 security hardening
-- Keep pgvector outside public and keep retrieval under rag_chunks RLS.

drop function if exists public.match_rag_chunks(extensions.vector(384), float, integer, uuid, uuid, text);
alter extension vector set schema extensions;

create index if not exists rag_chunks_embedding_hnsw_idx
  on public.rag_chunks using hnsw (embedding extensions.vector_ip_ops)
  where embedding is not null;

create or replace function public.match_rag_chunks(
  query_embedding extensions.vector(384), match_threshold float default 0.55, match_count integer default 8,
  filter_project_id uuid default null, filter_file_id uuid default null, query_text text default null
)
returns table (id uuid, file_id uuid, project_id uuid, owner_id uuid, chunk_index integer, content text, metadata jsonb, similarity real, keyword_score real, score real)
language sql stable security invoker set search_path = '' as $$
  with candidates as (
    select c.id, c.file_id, c.project_id, c.owner_id, c.chunk_index, c.content, c.metadata,
      (1 - (c.embedding OPERATOR(extensions.<#>) query_embedding))::real as similarity,
      case when nullif(trim(query_text), '') is null then 0::real else ts_rank_cd(to_tsvector('simple', c.content), websearch_to_tsquery('simple', query_text))::real end as keyword_score
    from public.rag_chunks c
    where c.embedding is not null and c.embedding_status = 'ready'
      and (filter_project_id is null or c.project_id = filter_project_id)
      and (filter_file_id is null or c.file_id = filter_file_id)
      and (1 - (c.embedding OPERATOR(extensions.<#>) query_embedding)) >= greatest(-1, least(1, match_threshold))
  )
  select id, file_id, project_id, owner_id, chunk_index, content, metadata, similarity, keyword_score,
    (similarity * 0.8 + least(keyword_score, 1) * 0.2)::real as score
  from candidates order by score desc, similarity desc limit least(greatest(match_count, 1), 50);
$$;
revoke all on function public.match_rag_chunks(extensions.vector(384), float, integer, uuid, uuid, text) from public, anon;
grant execute on function public.match_rag_chunks(extensions.vector(384), float, integer, uuid, uuid, text) to authenticated;
