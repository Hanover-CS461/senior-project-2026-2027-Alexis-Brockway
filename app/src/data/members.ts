import { getGenre } from './genres'

export const MEMBER_ROLES = [
  { value: 'reader', label: 'Reader' },
  { value: 'staff_editor', label: 'Staff Editor' },
  { value: 'editor', label: 'Editor' },
  { value: 'co_editor', label: 'Co-Editor' },
  { value: 'chief_editor', label: 'Chief Editor' },
  { value: 'advisor', label: 'Advisor' },
] as const

export type MemberRole = (typeof MEMBER_ROLES)[number]['value']

export const EDITOR_ROLES: MemberRole[] = [
  'staff_editor',
  'editor',
  'co_editor',
  'chief_editor',
  'advisor',
]

export function roleLabel(role: string): string {
  return MEMBER_ROLES.find((r) => r.value === role)?.label ?? role
}

/**
 * The genre staffs a member can belong to.
 *
 * These slugs are duplicated in two other places on purpose: `genres.ts` owns
 * the genre list the submission form uses, and the `members_staffs_known` check
 * constraint in `20261118000000_member_staffs.sql` owns what the database will
 * accept. A test asserts all three agree, so a fifth genre added to `genres.ts`
 * fails loudly instead of silently becoming an unassignable staff.
 *
 * Labels come from `genres.ts` rather than being repeated here — one name per
 * genre, so "Photography & Visual Art" reads the same on the Staff tab as it
 * does on the submission form.
 */
export const MEMBER_STAFF_SLUGS = [
  'fiction',
  'poetry',
  'creative-nonfiction',
  'visual-arts',
] as const

export type StaffSlug = (typeof MEMBER_STAFF_SLUGS)[number]

export const MEMBER_STAFFS = MEMBER_STAFF_SLUGS.map((slug) => ({
  value: slug,
  label: getGenre(slug)?.name ?? slug,
}))

export function staffLabel(slug: string): string {
  return MEMBER_STAFFS.find((s) => s.value === slug)?.label ?? slug
}

export interface Member {
  id: string
  user_id: string
  name: string
  email: string
  role: MemberRole
  /**
   * Genre staffs this member sits on. `[]` means general staff — no team, and
   * deliberately no loss of access: staffs label people, they do not gate work.
   */
  staffs: string[]
  active: boolean
}

export interface MemberAuditEntry {
  id: string
  actor_id: string | null
  target_user_id: string
  action: string
  old_value: string | null
  new_value: string | null
  created_at: string
}
