import type { CodeEdit, CodeValidationResult } from '@/types/code-agent'

export function validateCodeEdits(edits: CodeEdit[], maxFiles = 20, maxFileSizeBytes = 1_000_000): CodeValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  if (edits.length === 0) errors.push('No code edits supplied.')
  if (edits.length > maxFiles) errors.push(`Maximum of ${maxFiles} files exceeded.`)
  const paths = new Set<string>()
  for (const edit of edits) {
    const path = edit.path.trim().replace(/^\/+/, '')
    if (!path || path.includes('..') || path.startsWith('.git/')) errors.push(`Unsafe path: ${edit.path}`)
    if (paths.has(path)) errors.push(`Duplicate path: ${path}`)
    paths.add(path)
    if (Buffer.byteLength(edit.content, 'utf8') > maxFileSizeBytes) errors.push(`File too large: ${path}`)
    if (edit.kind === 'update' && !edit.expectedSha) errors.push(`Missing expectedSha for update: ${path}`)
    if (edit.kind === 'create' && edit.expectedSha) warnings.push(`expectedSha is ignored for create: ${path}`)
  }
  return { valid: errors.length === 0, errors, warnings }
}
