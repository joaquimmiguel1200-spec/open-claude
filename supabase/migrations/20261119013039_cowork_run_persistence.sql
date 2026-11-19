create table if not exists public.cowork_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  chat_id uuid references public.chats(id) on delete set null,
  goal text not null check (char_length(goal) between 1 and 12000),
  status text not null default 'planning' check (status in ('queued','planning','running','waiting','paused','completed','failed','cancelled')),
  plan jsonb not null default '{"goal":"","tasks":[]}'::jsonb,
  events jsonb not null default '[]'::jsonb,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cowork_runs_user_updated_idx on public.cowork_runs (user_id, updated_at desc);
create index if not exists cowork_runs_chat_updated_idx on public.cowork_runs (chat_id, updated_at desc) where chat_id is not null;
alter table public.cowork_runs enable row level security;
revoke all on public.cowork_runs from anon;
grant select, insert, update, delete on public.cowork_runs to authenticated;
drop policy if exists "Users can view their own Cowork runs" on public.cowork_runs;
create policy "Users can view their own Cowork runs" on public.cowork_runs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their own Cowork runs" on public.cowork_runs;
create policy "Users can create their own Cowork runs" on public.cowork_runs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own Cowork runs" on public.cowork_runs;
create policy "Users can update their own Cowork runs" on public.cowork_runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete their own Cowork runs" on public.cowork_runs;
create policy "Users can delete their own Cowork runs" on public.cowork_runs for delete to authenticated using ((select auth.uid()) = user_id);