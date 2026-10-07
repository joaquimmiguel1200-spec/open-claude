create table if not exists public.policy_acceptances (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 policy_type text not null check(policy_type in ('terms','privacy','security','cookies','acceptable_use','ai')),
 version text not null,
 accepted_at timestamptz not null default now(),
 unique(user_id,policy_type,version)
);
create index if not exists policy_acceptances_user_idx on public.policy_acceptances(user_id,accepted_at desc);
alter table public.policy_acceptances enable row level security;
drop policy if exists policy_acceptances_owner_select on public.policy_acceptances;
drop policy if exists policy_acceptances_owner_insert on public.policy_acceptances;
create policy policy_acceptances_owner_select on public.policy_acceptances for select to authenticated using((select auth.uid())=user_id);
create policy policy_acceptances_owner_insert on public.policy_acceptances for insert to authenticated with check((select auth.uid())=user_id);
revoke all on public.policy_acceptances from anon;
grant select,insert on public.policy_acceptances to authenticated;

create table if not exists public.security_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 event_type text not null,
 severity text not null default 'info' check(severity in ('info','warning','critical')),
 metadata jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index if not exists security_events_created_idx on public.security_events(created_at desc);
create index if not exists security_events_user_idx on public.security_events(user_id,created_at desc);
alter table public.security_events enable row level security;
drop policy if exists security_events_owner_select on public.security_events;
create policy security_events_owner_select on public.security_events for select to authenticated using((select auth.uid())=user_id);
revoke all on public.security_events from anon;
grant select on public.security_events to authenticated;

create or replace function public.purge_expired_audit_logs()
returns bigint language plpgsql security invoker set search_path = public as $$
declare deleted_count bigint;
begin
 delete from public.audit_logs where created_at < now() - interval '180 days';
 get diagnostics deleted_count = row_count;
 return deleted_count;
end;
$$;
revoke all on function public.purge_expired_audit_logs() from public;
