import type { MemberRole } from '../data/members'

export interface MemberRow {
  user_id: string
  role: MemberRole
  name: string
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

  const chief = await client.insertMember({ ...base, role: 'chief_editor' })
  if (chief) return chief

  return client.insertMember({ ...base, role: 'reader' })
}
