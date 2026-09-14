# Artifacts

Stage 7 foundation for generated/editable artifacts.

## Backend

- `public.artifacts` stores artifact identity, scope, type and current version pointer.
- `public.artifact_versions` stores immutable-by-default versioned text content up to 10 MiB per version.
- Artifacts may be personal or project-scoped and may optionally belong to a chat.
- Project-scoped artifacts follow project membership/RLS rules.
- Only owners/editors can create or update project artifacts; project owners can delete them.
- Artifact versions are written by the authenticated artifact owner/editor and are protected by RLS.

## Intended frontend

The frontend should provide a split workspace for an artifact: source/editor on one side and preview/rendering on the other where applicable. Do not execute artifact code in the browser or server as part of Stage 7 foundation. Execution belongs to the later Code Execution stage and must use an isolated sandbox.

## Intended evolution

Future work may add binary/generated-file backing through the existing private Storage layer, artifact parsing/renderers, diff/version controls, and sandboxed execution. Do not represent those capabilities as implemented until their respective stages are completed.
