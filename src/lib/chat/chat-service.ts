import type { ChatRequest, Message } from '@/types/models';

/**
 * Application boundary for chat persistence and agent execution.
 * Provider-specific AI calls belong behind this boundary so the UI never
 * depends directly on a vendor SDK.
 */
export interface ChatRepository {
  createChat(input: { ownerId: string; projectId?: string | null; model?: string | null }): Promise<{ id: string }>;
  listChats(ownerId: string): Promise<unknown[]>;
  listMessages(chatId: string): Promise<Message[]>;
  appendMessage(input: {
    chatId: string;
    userId: string;
    role: Message['role'];
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<Message>;
}

export interface AgentRuntime {
  stream(input: {
    request: ChatRequest;
    history: Message[];
  }): AsyncIterable<{ type: 'text_delta' | 'tool_event' | 'error'; delta?: string; metadata?: Record<string, unknown>; error?: string }>;
}

export class ChatService {
  constructor(
    private readonly repository: ChatRepository,
    private readonly agent: AgentRuntime,
  ) {}

  async *sendMessage(input: {
    userId: string;
    request: ChatRequest;
  }) {
    const chatId = input.request.chatId ?? (
      await this.repository.createChat({
        ownerId: input.userId,
        projectId: input.request.projectId,
        model: input.request.model,
      })
    ).id;

    await this.repository.appendMessage({
      chatId,
      userId: input.userId,
      role: 'user',
      content: input.request.message,
    });

    const history = await this.repository.listMessages(chatId);

    let assistantText = '';
    for await (const event of this.agent.stream({
      request: { ...input.request, chatId },
      history,
    })) {
      if (event.type === 'text_delta' && event.delta) {
        assistantText += event.delta;
      }
      yield event;
    }

    if (assistantText) {
      await this.repository.appendMessage({
        chatId,
        userId: input.userId,
        role: 'assistant',
        content: assistantText,
      });
    }
  }
}
