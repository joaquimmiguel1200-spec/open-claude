import { z } from 'zod'

export const chatInputSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  chatId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  model: z.string().trim().max(120).optional(),
  mode: z.enum(['chat', 'code', 'cowork']).optional().default('chat'),
  customInstructions: z.string().trim().max(4000).optional(),
  stream: z.boolean().optional().default(false),
  honeypot: z.string().max(200).optional().default(''),
}).strict()

export function rejectBotHoneypot(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

export function publicError(message = 'Invalid request.') {
  return { error: message }
}
