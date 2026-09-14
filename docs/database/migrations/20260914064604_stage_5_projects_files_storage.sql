-- Open Claude — Stage 5: Projects + Files
-- Persistent file catalog + private Supabase Storage bucket.

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  name text not null,
  folder_path text not null default '',
  storage_bucket text not null default 'open-claude-files',
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  checksum text,
  source text not null default 'upload',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_name_length check (char_length(trim(name)) between 1 and 255),
  constraint files_folder_path_length check (char_length(folder_path) <= 2048),
  constraint files_storage_bucket check (storage_bucket = 'open-claude-files'),
  constraint files_storage_path_length check (char_length(storage_path) between 1 and 4096),
  constraint files_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint files_checksum_length check (checksum is null or char_length(checksum) <= 256),
  constraint files_source_valid check (source in ('upload','generated','imported','attachment'))
);

create index files_owner_id_idx on public.files(owner_id);
create index files_project_id_idx on public.files(project_id);
create index files_chat_id_idx on public.files(chat_id);
create index files_project_folder_idx on public.files(project_id, folder_path);
create index files_created_at_idx on public.files(created_at desc);

create or replace function private.set_file_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger files_set_updated_at
before update on public.files
for each row execute function private.set_file_updated_at();

create or replace function private.validate_file_context()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  chat_owner uuid;
  chat_project uuid;
begin
  if new.chat_id is not null then
    select c.owner_id, c.project_id into chat_owner, chat_project
      from public.chats c where c.id = new.chat_id;

    if chat_owner is null then raise exception 'Chat not found'; end if;
    if chat_project is distinct from new.project_id then
      raise exception 'File project_id must match chat project_id';
    end if;
    if chat_project is null and chat_owner <> new.owner_id then
      raise exception 'File owner must match the chat owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger files_validate_context
before insert or update on public.files
for each row execute function private.validate_file_context();

create or replace function private.can_edit_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = (select auth.uid())
            and pm.role in ('owner'::public.project_role, 'editor'::public.project_role)
        )
      )
  );
$$;

create or replace function private.can_access_file(p_file_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.files f
    where f.id = p_file_id
      and (
        f.owner_id = (select auth.uid())
        or (f.project_id is not null and private.is_project_member(f.project_id))
      )
  );
$$;

create or replace function private.can_edit_file(p_file_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.files f
    where f.id = p_file_id
      and (
        (f.project_id is null and f.owner_id = (select auth.uid()))
        or (f.project_id is not null and private.can_edit_project(f.project_id))
      )
  );
$$;

alter table public.files enable row level security;

create policy files_select_access on public.files
for select to authenticated using (
  owner_id = (select auth.uid())
  or (project_id is not null and private.is_project_member(project_id))
);

create policy files_insert_owner on public.files
for insert to authenticated with check (
  owner_id = (select auth.uid())
  and (project_id is null or private.can_edit_project(project_id))
);

create policy files_update_access on public.files
for update to authenticated
using (private.can_edit_file(id))
with check (
  private.can_edit_file(id)
  and (project_id is null or private.can_edit_project(project_id))
);

create policy files_delete_access on public.files
for delete to authenticated using (private.can_edit_file(id));

revoke all on public.files from anon;
grant select, insert, update, delete on public.files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'open-claude-files', 'open-claude-files', false, 104857600,
  array[
    'text/plain','text/markdown','text/csv','application/json','application/pdf',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/*','audio/*','video/*'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy open_claude_storage_insert on storage.objects
for insert to authenticated with check (
  bucket_id = 'open-claude-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy open_claude_storage_select on storage.objects
for select to authenticated using (
  bucket_id = 'open-claude-files'
  and exists (
    select 1 from public.files f
    where f.storage_bucket = bucket_id
      and f.storage_path = name
      and private.can_access_file(f.id)
  )
);

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

create policy open_claude_storage_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'open-claude-files'
  and exists (
    select 1 from public.files f
    where f.storage_bucket = bucket_id
      and f.storage_path = name
      and private.can_edit_file(f.id)
  )
);
