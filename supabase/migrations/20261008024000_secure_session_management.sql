create or replace function public.list_my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  factor_id uuid,
  aal text,
  not_after timestamptz,
  refreshed_at timestamp,
  user_agent text,
  ip inet,
  tag text,
  oauth_client_id uuid,
  scopes text
)
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  select
    s.id,
    s.created_at,
    s.updated_at,
    s.factor_id,
    s.aal::text,
    s.not_after,
    s.refreshed_at,
    s.user_agent,
    s.ip,
    s.tag,
    s.oauth_client_id,
    s.scopes
  from auth.sessions s
  where s.user_id = (select auth.uid())
  order by s.updated_at desc;
$$;

create or replace function public.revoke_my_session(target_session_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, public, auth
as $$
  delete from auth.sessions
  where id = target_session_id
    and user_id = (select auth.uid());
  select true;
$$;

revoke execute on function public.list_my_sessions() from public, anon, authenticated;
revoke execute on function public.revoke_my_session(uuid) from public, anon, authenticated;
grant execute on function public.list_my_sessions() to authenticated;
grant execute on function public.revoke_my_session(uuid) to authenticated;
