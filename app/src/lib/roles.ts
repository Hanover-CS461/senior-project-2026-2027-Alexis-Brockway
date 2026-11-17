import { EDITOR_ROLES } from '../data/members'

export function isEditorRole(role: string | null | undefined): boolean {
  return role != null && (EDITOR_ROLES as string[]).includes(role)
}

export function canManageMembers(role: string | null | undefined): boolean {
  return role === 'chief_editor'
}

/**
 * A signed-in account that exists but has not been approved yet.
 *
 * New readers self-insert with `active = false` (issue #5) and the database
 * hides submissions and manuscripts from them until a Chief or editor flips the
 * flag. That is the right place for the rule; this function exists only so the
 * screens explain it instead of showing an empty queue that reads as a bug.
 *
 * Deliberately fails closed: anything other than an explicit `true` is treated
 * as not approved, so a member row fetched by an older query that forgot to
 * select `active` cannot quietly unlock a queue.
 */
export function isPendingApproval(
  member: { active?: boolean } | null | undefined,
): boolean {
  return member != null && member.active !== true
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
