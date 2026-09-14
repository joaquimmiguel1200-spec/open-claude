-- Open Claude — Stage 6: RAG core
-- pgvector + 384-dimension Supabase/gte-small embeddings.

create extension if not exists vector;

create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_count integer,
  metadata jsonb not null default '{}'::jsonb,
  embedding public.vector(384),
  embedding_model text not null default 'Supabase/gte-small',
  embedding_status text not null default 'pending',
  embedding_error text,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rag_chunks_index_nonnegative check (chunk_index >= 0),
  constraint rag_chunks_content_nonempty check (char_length(trim(content)) > 0),
  constraint rag_chunks_token_count_nonnegative check (token_count is null or token_count >= 0),
  constraint rag_chunks_embedding_model check (embedding_model = 'Supabase/gte-small'),
  constraint rag_chunks_embedding_status check (embedding_status in ('pending','ready','failed')),
  constraint rag_chunks_hash_length check (content_hash is null or char_length(content_hash) <= 128),
  unique (file_id, chunk_index)
);

create index rag_chunks_file_id_idx on public.rag_chunks(file_id);
create index rag_chunks_project_id_idx on public.rag_chunks(project_id);
create index rag_chunks_owner_id_idx on public.rag_chunks(owner_id);
create index rag_chunks_status_idx on public.rag_chunks(embedding_status);
create index rag_chunks_search_idx on public.rag_chunks using gin (to_tsvector('simple', content));
create index rag_chunks_embedding_hnsw_idx on public.rag_chunks using hnsw (embedding public.vector_ip_ops) where embedding is not null;

create or replace function private.set_rag_chunk_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger rag_chunks_set_updated_at before update on public.rag_chunks for each row execute function private.set_rag_chunk_updated_at();

create or replace function private.validate_rag_chunk_context()
returns trigger language plpgsql security definer set search_path = '' as $$
declare file_owner uuid; file_project uuid;
begin
  select f.owner_id, f.project_id into file_owner, file_project from public.files f where f.id = new.file_id;
  if file_owner is null then raise exception 'File not found'; end if;
  if file_owner <> new.owner_id then raise exception 'RAG chunk owner must match file owner'; end if;
  if file_project is distinct from new.project_id then raise exception 'RAG chunk project_id must match file project_id'; end if;
  return new;
end;
$$;
create trigger rag_chunks_validate_context before insert or update on public.rag_chunks for each row execute function private.validate_rag_chunk_context();

create or replace function private.validate_rag_chunk_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.file_id is distinct from old.file_id then raise exception 'RAG chunk file_id cannot be changed'; end if;
  if new.project_id is distinct from old.project_id then raise exception 'RAG chunk project_id cannot be changed'; end if;
  if new.owner_id is distinct from old.owner_id then raise exception 'RAG chunk owner_id cannot be changed'; end if;
  if new.chunk_index is distinct from old.chunk_index then raise exception 'RAG chunk_index cannot be changed'; end if;
  return new;
end;
$$;
create trigger rag_chunks_validate_mutation before update on public.rag_chunks for each row execute function private.validate_rag_chunk_mutation();

alter table public.rag_chunks enable row level security;
create policy rag_chunks_select_access on public.rag_chunks for select to authenticated using (
  owner_id = (select auth.uid()) or (project_id is not null and private.is_project_member(project_id))
);
create policy rag_chunks_insert_access on public.rag_chunks for insert to authenticated with check (
  owner_id = (select auth.uid()) and (project_id is null or private.can_edit_project(project_id)) and exists (
    select 1 from public.files f where f.id = file_id and f.owner_id = (select auth.uid()) and (f.project_id is null or private.can_edit_project(f.project_id))
  )
);
create policy rag_chunks_update_access on public.rag_chunks for update to authenticated
using ((project_id is null and owner_id = (select auth.uid())) or (project_id is not null and private.can_edit_project(project_id)))
with check ((project_id is null and owner_id = (select auth.uid())) or (project_id is not null and private.can_edit_project(project_id)));
create policy rag_chunks_delete_access on public.rag_chunks for delete to authenticated using (
  (project_id is null and owner_id = (select auth.uid())) or (project_id is not null and private.can_edit_project(project_id))
);
revoke all on public.rag_chunks from anon;
grant select, insert, update, delete on public.rag_chunks to authenticated;

create or replace function public.match_rag_chunks(
  query_embedding public.vector(384), match_threshold float default 0.55, match_count integer default 8,
  filter_project_id uuid default null, filter_file_id uuid default null, query_text text default null
)
returns table (id uuid, file_id uuid, project_id uuid, owner_id uuid, chunk_index integer, content text, metadata jsonb, similarity real, keyword_score real, score real)
language sql stable security definer set search_path = '' as $$
  with candidates as (
    select c.id, c.file_id, c.project_id, c.owner_id, c.chunk_index, c.content, c.metadata,
      (1 - (c.embedding OPERATOR(public.<#>) query_embedding))::real as similarity,
      case when nullif(trim(query_text), '') is null then 0::real else ts_rank_cd(to_tsvector('simple', c.content), websearch_to_tsquery('simple', query_text))::real end as keyword_score
    from public.rag_chunks c
    where c.embedding is not null and c.embedding_status = 'ready'
      and (c.owner_id = (select auth.uid()) or (c.project_id is not null and private.is_project_member(c.project_id)))
      and (filter_project_id is null or c.project_id = filter_project_id)
      and (filter_file_id is null or c.file_id = filter_file_id)
      and (1 - (c.embedding OPERATOR(public.<#>) query_embedding)) >= greatest(-1, least(1, match_threshold))
  )
  select id, file_id, project_id, owner_id, chunk_index, content, metadata, similarity, keyword_score,
    (similarity * 0.8 + least(keyword_score, 1) * 0.2)::real as score
  from candidates order by score desc, similarity desc limit least(greatest(match_count, 1), 50);
$$;
revoke all on function public.match_rag_chunks(public.vector(384), float, integer, uuid, uuid, text) from public, anon;
grant execute on function public.match_rag_chunks(public.vector(384), float, integer, uuid, uuid, text) to authenticated;
