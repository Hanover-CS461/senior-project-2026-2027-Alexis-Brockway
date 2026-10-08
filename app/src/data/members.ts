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

export interface Member {
  id: string
  user_id: string
  name: string
  email: string
  role: MemberRole
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
