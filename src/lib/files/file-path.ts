const MAX_FILENAME_LENGTH = 255;
const MAX_FOLDER_LENGTH = 2048;

export function sanitizeFileName(name: string): string {
  const trimmed = name.trim().replace(/[\\/]/g, '_').replace(/[\u0000-\u001f\u007f]/g, '_');
  return (trimmed || 'untitled').slice(0, MAX_FILENAME_LENGTH);
}

export function normalizeFolderPath(folderPath: string | null | undefined): string {
  if (!folderPath) return '';

  const segments = folderPath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== '.' && segment !== '..')
    .map((segment) => segment.replace(/[\\\u0000-\u001f\u007f]/g, '_'));

  return segments.join('/').slice(0, MAX_FOLDER_LENGTH);
}

/**
 * Storage identity is generated from trusted IDs, never from a user-controlled
 * path. The file UUID is created before the Storage upload so the DB row and
 * object can share one stable identity.
 */
export function buildStoragePath(userId: string, fileId: string, name: string): string {
  return `${userId}/${fileId}/${sanitizeFileName(name)}`;
}
