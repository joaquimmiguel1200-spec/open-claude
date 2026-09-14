-- Open Claude — Stage 5 Storage insert hardening
-- Require a pre-authorized public.files row before any Storage upload.

drop policy open_claude_storage_insert on storage.objects;
create policy open_claude_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'open-claude-files'
  and exists (
    select 1 from public.files f
    where f.storage_bucket = bucket_id
      and f.storage_path = name
      and f.owner_id = (select auth.uid())
      and private.can_edit_file(f.id)
  )
);
