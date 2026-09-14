export type ArtifactType =
  | 'code'
  | 'document'
  | 'html'
  | 'markdown'
  | 'json'
  | 'data'
  | 'other'

export interface Artifact {
  id: string
  owner_id: string
  project_id: string | null
  chat_id: string | null
  name: string
  artifact_type: ArtifactType
  language: string | null
  mime_type: string | null
  current_version_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ArtifactVersion {
  id: string
  artifact_id: string
  version_number: number
  content: string
  mime_type: string | null
  language: string | null
  size_bytes: number
  metadata: Record<string, unknown>
  created_by: string
  created_at: string
}
