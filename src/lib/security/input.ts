import { z } from 'zod'

export const chatInputSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  model: z.string().trim().max(120).optional(),
  honeypot: z.string().max(200).optional().default(''),
}).strict()

export function rejectBotHoneypot(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

export function publicError(message = 'Invalid request.') {
  return { error: message }
}
