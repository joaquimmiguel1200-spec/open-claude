-- Allow the trusted administrator claim to review and manage security records without service-role credentials.
drop policy if exists account_suspensions_admin_select on public.account_suspensions;
create policy account_suspensions_admin_select on public.account_suspensions
for select to authenticated using ((select public.is_open_claude_admin()));
drop policy if exists account_suspensions_admin_insert on public.account_suspensions;
create policy account_suspensions_admin_insert on public.account_suspensions
for insert to authenticated with check ((select public.is_open_claude_admin()));
drop policy if exists account_suspensions_admin_update on public.account_suspensions;
create policy account_suspensions_admin_update on public.account_suspensions
for update to authenticated using ((select public.is_open_claude_admin()))
with check ((select public.is_open_claude_admin()));

drop policy if exists security_reports_admin_select on public.security_reports;
create policy security_reports_admin_select on public.security_reports
for select to authenticated using ((select public.is_open_claude_admin()));
drop policy if exists security_reports_admin_update on public.security_reports;
create policy security_reports_admin_update on public.security_reports
for update to authenticated using ((select public.is_open_claude_admin()))
with check ((select public.is_open_claude_admin()));

drop policy if exists security_events_admin_select on public.security_events;
create policy security_events_admin_select on public.security_events
for select to authenticated using ((select public.is_open_claude_admin()));
drop policy if exists security_events_admin_insert on public.security_events;
create policy security_events_admin_insert on public.security_events
for insert to authenticated with check ((select public.is_open_claude_admin()));
