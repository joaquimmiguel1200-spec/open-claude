export function pickAllowed<T extends Record<string, unknown>, K extends keyof T>(input: T, keys: readonly K[]): Pick<T, K> {
  const output = {} as Pick<T, K>
  for (const key of keys) if (key in input) output[key] = input[key]
  return output
}

export const writableProfileFields = ['display_name', 'avatar_url'] as const
export const writableProjectFields = ['name', 'description'] as const
