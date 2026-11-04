-- Merge owner and administrator SELECT rules to avoid multiple permissive RLS policies.
drop policy if exists account_suspensions_admin_select on public.account_suspensions;
drop policy if exists account_suspensions_owner_select on public.account_suspensions;
create policy account_suspensions_owner_or_admin_select on public.account_suspensions
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_open_claude_admin()));

drop policy if exists security_events_admin_select on public.security_events;
drop policy if exists security_events_owner_select on public.security_events;
create policy security_events_owner_or_admin_select on public.security_events
for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_open_claude_admin()));

drop policy if exists security_reports_admin_select on public.security_reports;
drop policy if exists security_reports_owner_select on public.security_reports;
create policy security_reports_owner_or_admin_select on public.security_reports
for select to authenticated
using (reporter_id = (select auth.uid()) or (select public.is_open_claude_admin()));
