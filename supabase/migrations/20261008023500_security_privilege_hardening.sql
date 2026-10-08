-- Harden public data access and preserve privacy audit history.
do $$
declare
  item record;
begin
  for item in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('revoke all on table public.%I from anon', item.tablename);
  end loop;
end
$$;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon;

revoke update, delete on table public.privacy_consents from authenticated;
revoke update, delete on table public.policy_acceptances from authenticated;
