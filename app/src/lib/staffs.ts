import { MEMBER_STAFFS, MEMBER_STAFF_SLUGS, staffLabel } from '../data/members'

/**
 * Pure helpers for a member's genre staffs.
 *
 * They live here rather than inside `MemberManager.tsx` for the same reason
 * `csv.ts` does: a rule that decides what gets written to the database should be
 * testable without a browser or a live project. The Staff tab only calls them.
 */

/** Is this member on the given staff? */
export function hasStaff(staffs: string[] | null | undefined, slug: string): boolean {
  return (staffs ?? []).includes(slug)
}

/**
 * Add or remove one staff from a list, keeping genre order.
 *
 * Order is taken from `MEMBER_STAFFS` rather than the order the chief clicked,
 * so two members with the same teams render identically and the stored value
 * cannot change just because someone toggled twice.
 */
export function toggleStaff(staffs: string[] | null | undefined, slug: string): string[] {
  const current = staffs ?? []
  const next = current.includes(slug)
    ? current.filter((s) => s !== slug)
    : [...current, slug]

  return MEMBER_STAFF_SLUGS.filter((s) => next.includes(s))
}

/** "Fiction, Poetry" — for a table cell, a summary line, or an audit entry. */
export function staffNamesFor(staffs: string[] | null | undefined): string {
  const known = MEMBER_STAFF_SLUGS.filter((s) => (staffs ?? []).includes(s))
  return known.map(staffLabel).join(', ')
}

/**
 * Turn an audit row's comma-joined slugs back into labels.
 *
 * `member_audit` stores text, so `staff_change` writes "fiction,poetry".
 * Unknown or blank values are dropped rather than rendered raw, because an
 * audit line is prose and "fiction,,poetry" is not.
 */
export function staffNamesFromCsv(csv: string | null | undefined): string {
  const slugs = (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return staffNamesFor(slugs)
}

/** The four staffs with their members, in genre order, for the summary block. */
export interface StaffGroup<M> {
  slug: string
  label: string
  members: M[]
}

export function groupByStaff<M extends { staffs?: string[] | null }>(
  members: M[],
): StaffGroup<M>[] {
  return MEMBER_STAFFS.map((staff) => ({
    slug: staff.value,
    label: staff.label,
    members: members.filter((m) => hasStaff(m.staffs, staff.value)),
  }))
}
