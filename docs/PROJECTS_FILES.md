# Open Claude — Stage 5: Projects + Files

## Scope

Stage 5 establishes the persistence and authorization contract for Projects + Files. The canonical frontend remains the future Next.js application; this stage is backend-first and does not depend on the unavailable Lovable workspace.

## Projects

Projects were established in Stage 2 and remain the workspace boundary for chats, memory and files:

- `projects`: project identity, owner, name and description.
- `project_members`: membership and role (`owner`, `editor`, `viewer`).
- Project RLS is enforced in Postgres.
- Owners can manage project membership; members can read project data according to the existing Stage 2 policies.

## Files

`public.files` is the application catalog for every uploaded/generated/imported file.

A file can be:

- personal (`project_id = null`), or
- attached to a project (`project_id` set), optionally linked to a project chat.

The database stores metadata, not file bytes:

- stable file UUID
- owner
- project/chat relationship
- display name and virtual `folder_path`
- Storage bucket/path
- MIME type and byte size
- optional checksum
- source (`upload`, `generated`, `imported`, `attachment`)
- extensible JSON metadata
- timestamps

The immutable Storage identity is intentional. File metadata can be edited without allowing a user to transfer ownership, move a file between projects, or silently replace its Storage path.

## Storage

The `open-claude-files` bucket is **private**. The bucket limit is 100 MiB per object and its allowed types cover common text, office/document, image, audio and video inputs used by an AI workspace.

The canonical object path is:

`<uploader_user_id>/<file_id>/<filename>`

The first path segment prevents an authenticated user from uploading into another user's namespace. Application-level access is then controlled by `public.files` plus project membership.

For private downloads, the application should use an authenticated Storage download or a short-lived signed URL. The service/secret key must never be exposed to the browser.

## Authorization matrix

| Resource | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| Read project files | yes | yes | yes |
| Upload project files | yes | yes | no |
| Update project file metadata | yes | yes | no |
| Delete project files | yes | yes | no |
| Personal files | full owner access | n/a | n/a |

Storage policies mirror this matrix instead of trusting the client UI.

## Chat attachments

A file linked to a chat must respect the chat's project relationship:

- personal chat → personal file owned by the same user;
- project chat → file uses the same `project_id` as the chat.

This validation is enforced server-side by a database trigger.

## Upload lifecycle

1. Authenticate the user.
2. Generate a file UUID.
3. Insert the file metadata row with the final Storage path.
4. Upload the object to the private bucket.
5. Mark/extend metadata as needed after successful upload.
6. On upload failure, clean up the metadata/object through the application boundary.
7. Generate signed URLs only when a private file must be presented to the client.

The UI should not be trusted to enforce any of these permissions.

## Future stages

Stage 5 deliberately does not implement parsing, chunking, embeddings, semantic search, MCP, GitHub automation or code execution. Those capabilities will consume the file contract later, especially in Stage 6 RAG.
