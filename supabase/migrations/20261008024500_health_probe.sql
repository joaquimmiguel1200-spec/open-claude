create table if not exists public.health_probe (
  id boolean primary key default true,
  checked_at timestamptz not null default now(),
  constraint health_probe_singleton check (id = true)
);
insert into public.health_probe (id) values (true) on conflict (id) do nothing;
alter table public.health_probe enable row level security;
revoke all on table public.health_probe from anon, authenticated;
grant select on table public.health_probe to anon, authenticated;
drop policy if exists health_probe_anon_select on public.health_probe;
drop policy if exists health_probe_authenticated_select on public.health_probe;
create policy health_probe_anon_select on public.health_probe for select to anon using (true);
create policy health_probe_authenticated_select on public.health_probe for select to authenticated using (true);
