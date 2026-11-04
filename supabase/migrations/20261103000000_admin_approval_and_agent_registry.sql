-- Admin-approved registration, trusted role claims, and per-user agent profiles.
create table if not exists public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists account_access_status_requested_idx on public.account_access(status, requested_at desc);
alter table public.account_access enable row level security;
revoke all on public.account_access from anon;
grant select, update on public.account_access to authenticated;

create or replace function public.is_open_claude_admin()
returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;
revoke all on function public.is_open_claude_admin() from public;
grant execute on function public.is_open_claude_admin() to authenticated;

drop policy if exists account_access_read_self_or_admin on public.account_access;
create policy account_access_read_self_or_admin on public.account_access for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_open_claude_admin()));
drop policy if exists account_access_admin_review on public.account_access;
create policy account_access_admin_review on public.account_access for update to authenticated
using ((select public.is_open_claude_admin())) with check ((select public.is_open_claude_admin()));

create or replace function public.bootstrap_open_claude_account()
returns trigger language plpgsql security definer set search_path = '' as $$
declare is_admin boolean := lower(coalesce(new.email,'')) = 'joaquimmiguel1200@gmail.com';
begin
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', case when is_admin then 'admin' else 'user' end);
  insert into public.account_access(user_id,email,status,reviewed_at)
  values (new.id, lower(coalesce(new.email,'')), case when is_admin then 'approved' else 'pending' end,
          case when is_admin then now() else null end)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function public.bootstrap_open_claude_account() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_open_claude_access on auth.users;
create trigger on_auth_user_created_open_claude_access before insert on auth.users
for each row execute function public.bootstrap_open_claude_account();

update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = 'joaquimmiguel1200@gmail.com';
insert into public.account_access(user_id,email,status,reviewed_at)
select id, lower(email), 'approved', now() from auth.users
where lower(email) = 'joaquimmiguel1200@gmail.com'
on conflict (user_id) do update set email=excluded.email,status='approved',reviewed_at=now(),reviewed_by=null;
insert into public.account_access(user_id,email,status)
select id, lower(coalesce(email,'')), 'pending' from auth.users
where lower(coalesce(email,'')) <> 'joaquimmiguel1200@gmail.com'
on conflict (user_id) do nothing;

create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  instructions text not null check (char_length(instructions) between 1 and 20000),
  source text not null default 'manual' check (source in ('manual','opencode','imported')),
  model_id text,
  enabled boolean not null default true,
  modes text[] not null default array['chat','code','cowork']::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,name)
);
create index if not exists agent_profiles_user_enabled_idx on public.agent_profiles(user_id,enabled);
alter table public.agent_profiles enable row level security;
revoke all on public.agent_profiles from anon;
grant select,insert,update,delete on public.agent_profiles to authenticated;
drop policy if exists agent_profiles_owner_all on public.agent_profiles;
create policy agent_profiles_owner_all on public.agent_profiles for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
