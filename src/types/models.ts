export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  ownerId: string;
  projectId: string | null;
  chatId: string | null;
  name: string;
  folderPath: string;
  storageBucket: 'open-claude-files';
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  source: 'upload' | 'generated' | 'imported' | 'attachment';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  id: string;
  ownerId: string;
  projectId: string | null;
  title: string | null;
  model: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string | null;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ChatRequest {
  chatId: string | null;
  message: string;
  model?: string;
  projectId?: string | null;
}

export interface ChatStreamEvent {
  type: 'message_start' | 'text_delta' | 'tool_event' | 'message_end' | 'error';
  delta?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface AIProvider {
  id: string;
  displayName: string;
  models: string[];
}
