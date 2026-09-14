import type { ProjectRole } from '../../types/models';

/**
 * UI-level permission helpers. Postgres RLS remains the authoritative
 * authorization boundary; these functions only keep the interface consistent.
 */
export function canViewProject(role: ProjectRole | null | undefined): boolean {
  return role === 'owner' || role === 'editor' || role === 'viewer';
}

export function canEditProject(role: ProjectRole | null | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

export function canManageProject(role: ProjectRole | null | undefined): boolean {
  return role === 'owner';
}

export function canManageProjectFiles(role: ProjectRole | null | undefined): boolean {
  return canEditProject(role);
}
