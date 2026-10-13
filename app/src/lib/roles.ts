import { EDITOR_ROLES } from '../data/members'

export function isEditorRole(role: string | null | undefined): boolean {
  return role != null && (EDITOR_ROLES as string[]).includes(role)
}

export function canManageMembers(role: string | null | undefined): boolean {
  return role === 'chief_editor'
}
