import type { RegisteredTool } from '@/types/tools'

export const builtinTools: RegisteredTool[] = [
  {
    definition: {
      name: 'current_time',
      description: 'Returns the current ISO timestamp and Unix timestamp.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      requiresPermission: false,
      dangerous: false,
      maxOutputChars: 2_000,
    },
    executor: {
      async execute() {
        const now = new Date()
        return { iso: now.toISOString(), unixMs: now.getTime() }
      },
    },
  },
]
