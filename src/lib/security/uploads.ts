const MAX_FILE_SIZE = 100 * 1024 * 1024
const ALLOWED_TYPES = new Set(['text/plain','text/markdown','application/pdf','application/json','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/png','image/jpeg','image/webp'])

export function validateUpload(file: { name: string; type: string; size: number }) {
  const safeName = file.name.trim().replace(/[\u0000-\u001f\\/]/g, '_')
  if (!safeName || safeName.length > 180) throw new Error('Invalid filename.')
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error('File size is not allowed.')
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('File type is not allowed.')
  return { name: safeName, type: file.type, size: file.size }
}

export const uploadPolicy = { maxBytes: MAX_FILE_SIZE, allowedMimeTypes: [...ALLOWED_TYPES] }
