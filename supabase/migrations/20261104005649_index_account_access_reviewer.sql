create index if not exists account_access_reviewed_by_idx on public.account_access(reviewed_by) where reviewed_by is not null;
