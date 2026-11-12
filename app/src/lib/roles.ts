import { EDITOR_ROLES } from '../data/members'

export function isEditorRole(role: string | null | undefined): boolean {
  return role != null && (EDITOR_ROLES as string[]).includes(role)
}

export function canManageMembers(role: string | null | undefined): boolean {
  return role === 'chief_editor'
}

/**
 * Where a member belongs after signing in, when they haven't asked for a
 * specific page. Editors get the full queue; everyone else gets the blind one.
 *
 * This exists so a Reader is never dropped on /editor and told "you need an
 * editor role" as their very first act — a dead end that reads like a broken
 * account rather than a router choice.
 */
export function landingFor(role: string | null | undefined): string {
  return isEditorRole(role) ? '/editor' : '/reader'
}
