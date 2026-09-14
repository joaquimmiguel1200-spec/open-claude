-- Open Claude — Stage 4: Memory
-- Canonical application memory schema. Semantic embeddings/RAG indexes are intentionally deferred.

create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  category text not null default 'general' check (category in ('preference','fact','instruction','decision','project','general')),
  content text not null check (length(trim(content)) > 0),
  importance smallint not null default 50 check (importance between 0 and 100),
  source text not null default 'user' check (source in ('user','assistant','system','inferred','imported')),
  metadata jsonb not null default '{}'::jsonb,
  dedupe_key text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  summary text not null check (length(trim(summary)) > 0),
  covered_through_message_id uuid references public.messages(id) on delete set null,
  token_estimate integer check (token_estimate is null or token_estimate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_items_user_id_idx on public.memory_items(user_id);
create index if not exists memory_items_project_id_idx on public.memory_items(project_id);
create index if not exists memory_items_chat_id_idx on public.memory_items(chat_id);
create index if not exists memory_items_category_idx on public.memory_items(user_id, category);
create index if not exists memory_items_active_idx on public.memory_items(user_id, updated_at desc) where expires_at is null or expires_at > now();
create unique index if not exists memory_items_dedupe_idx on public.memory_items(user_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid), dedupe_key) where dedupe_key is not null;
create index if not exists conversation_summaries_chat_idx on public.conversation_summaries(chat_id, updated_at desc);

alter table public.memory_items enable row level security;
alter table public.conversation_summaries enable row level security;

create policy "memory_items_select_own" on public.memory_items for select to authenticated using (user_id = (select auth.uid()));
create policy "memory_items_insert_own" on public.memory_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy "memory_items_update_own" on public.memory_items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "memory_items_delete_own" on public.memory_items for delete to authenticated using (user_id = (select auth.uid()));

create policy "conversation_summaries_select_own" on public.conversation_summaries for select to authenticated using (user_id = (select auth.uid()));
create policy "conversation_summaries_insert_own" on public.conversation_summaries for insert to authenticated with check (user_id = (select auth.uid()));
create policy "conversation_summaries_update_own" on public.conversation_summaries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "conversation_summaries_delete_own" on public.conversation_summaries for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.memory_items from anon;
revoke all on public.conversation_summaries from anon;
grant select, insert, update, delete on public.memory_items to authenticated;
grant select, insert, update, delete on public.conversation_summaries to authenticated;

-- Reuse the project's standard updated_at trigger if present.
do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    execute 'drop trigger if exists memory_items_set_updated_at on public.memory_items';
    execute 'create trigger memory_items_set_updated_at before update on public.memory_items for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists conversation_summaries_set_updated_at on public.conversation_summaries';
    execute 'create trigger conversation_summaries_set_updated_at before update on public.conversation_summaries for each row execute function public.set_updated_at()';
  end if;
end $$;
