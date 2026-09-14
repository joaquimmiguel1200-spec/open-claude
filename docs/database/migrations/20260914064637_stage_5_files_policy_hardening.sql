-- Open Claude — Stage 5 hardening
-- Keep file ownership/project/storage identity immutable and keep Storage
-- updates aligned with project editor/owner permissions.

create or replace function private.validate_file_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'File owner_id cannot be changed';
  end if;
  if new.project_id is distinct from old.project_id then
    raise exception 'File project_id cannot be changed';
  end if;
  if new.storage_bucket is distinct from old.storage_bucket then
    raise exception 'File storage_bucket cannot be changed';
  end if;
  if new.storage_path is distinct from old.storage_path then
    raise exception 'File storage_path cannot be changed';
  end if;
  return new;
end;
$$;

create trigger files_validate_mutation
before update on public.files
for each row execute function private.validate_file_mutation();

drop policy files_update_access on public.files;
create policy files_update_access on public.files
for update to authenticated
using (private.can_edit_file(id))
with check (
  private.can_edit_file(id)
  and (project_id is null or private.can_edit_project(project_id))
);

drop policy open_claude_storage_update on storage.objects;
create policy open_claude_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'open-claude-files'
  and exists (
    select 1 from public.files f
    where f.storage_bucket = bucket_id
      and f.storage_path = name
      and private.can_edit_file(f.id)
  )
)
with check (
  bucket_id = 'open-claude-files'
  and exists (
    select 1 from public.files f
    where f.storage_bucket = bucket_id
      and f.storage_path = name
      and private.can_edit_file(f.id)
  )
);
