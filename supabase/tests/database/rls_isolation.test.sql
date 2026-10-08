begin;
select plan(4);
select ok((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity)=0,'Every public table has RLS enabled');
select has_table('public','account_suspensions','account suspensions table exists');
select has_table('public','privacy_consents','privacy consent table exists');
select ok((select count(*) from pg_policies where schemaname='public' and tablename in ('projects','chats','messages','files') and policyname in ('projects_owner_select','projects_owner_insert','projects_owner_update','projects_owner_delete','chats_owner_select','chats_owner_insert','chats_owner_update','chats_owner_delete','messages_chat_owner_select','messages_chat_owner_insert','files_owner_select','files_owner_insert','files_owner_update','files_owner_delete')) > 0,'Core owner/membership policies remain installed');
select * from finish();
rollback;