import type { MemberRole } from '../data/members'

export interface MemberRow {
  user_id: string
  role: MemberRole
  name: string
  /**
   * `false` means the account exists but has not been approved yet, and
   * `is_active_member()` therefore hides submissions and manuscripts from it.
   * A new reader self-inserts inactive (issue #5); the Chief Editor activates
   * them from the Staff tab.
   *
   * Optional only so a caller that does not care about the flag (a role check)
   * can build a row without it. Anything that decides whether to show the work
   * must treat `undefined` as "not approved" — see `isPendingApproval()`.
   */
  active?: boolean
}

export interface JoinUser {
  id: string
  email?: string | null
  name?: string | null
}

export interface MembershipClient {
  findMember(userId: string): Promise<MemberRow | null>
  insertMember(row: {
    user_id: string
    name: string
    email: string
    role: MemberRole
    active: boolean
  }): Promise<MemberRow | null>
}

export async function joinClub(
  user: JoinUser,
  client: MembershipClient,
): Promise<MemberRow | null> {
  const existing = await client.findMember(user.id)
  if (existing) return existing

  const base = {
    user_id: user.id,
    name: user.name ?? user.email ?? '',
    email: user.email ?? '',
  }

  // `active` is sent explicitly rather than left to the column default, so the
  // approval rule is visible here and testable without a database. The policy in
  // 20261117000000_reader_approval.sql is what enforces it: a reader insert that
  // claims `active: true` is refused, and the chief branch is only allowed while
  // the project is empty (or it could never be bootstrapped).
  const chief = await client.insertMember({
    ...base,
    role: 'chief_editor',
    active: true,
  })
  if (chief) return chief

  return client.insertMember({ ...base, role: 'reader', active: false })
}
