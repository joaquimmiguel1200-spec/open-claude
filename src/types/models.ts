export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

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
