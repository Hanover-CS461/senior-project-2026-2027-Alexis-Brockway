import { describe, expect, it, vi } from 'vitest'
import { joinClub, type MemberRow, type MembershipClient } from './membership'

function makeClient(options: {
  existing?: MemberRow | null
  chiefAccepted?: boolean
}) {
  const insertMember = vi.fn(
    async (row: {
      user_id: string
      name: string
      email: string
      role: MemberRow['role']
    }): Promise<MemberRow | null> => {
      if (row.role === 'chief_editor' && options.chiefAccepted === false) {
        return null
      }
      return { user_id: row.user_id, role: row.role, name: row.name }
    },
  )

  const client: MembershipClient = {
    findMember: vi.fn(async () => options.existing ?? null),
    insertMember,
  }

  return { client, insertMember }
}

const user = { id: 'user-1', email: 'writer@example.com', name: 'Alex Writer' }

describe('joinClub', () => {
  it('returns the existing membership without inserting again', async () => {
    const existing: MemberRow = {
      user_id: 'user-1',
      role: 'reader',
      name: 'Alex Writer',
    }
    const { client, insertMember } = makeClient({ existing })

    await expect(joinClub(user, client)).resolves.toEqual(existing)
    expect(insertMember).not.toHaveBeenCalled()
  })

  it('makes the first member the chief editor', async () => {
    const { client } = makeClient({ existing: null, chiefAccepted: true })

    await expect(joinClub(user, client)).resolves.toEqual({
      user_id: 'user-1',
      role: 'chief_editor',
      name: 'Alex Writer',
    })
  })

  it('falls back to reader when the chief editor claim is refused', async () => {
    const { client, insertMember } = makeClient({
      existing: null,
      chiefAccepted: false,
    })

    await expect(joinClub(user, client)).resolves.toEqual({
      user_id: 'user-1',
      role: 'reader',
      name: 'Alex Writer',
    })
    expect(insertMember).toHaveBeenCalledTimes(2)
  })

  it('returns null when the database refuses both inserts', async () => {
    const client: MembershipClient = {
      findMember: vi.fn(async () => null),
      insertMember: vi.fn(async () => null),
    }

    await expect(joinClub(user, client)).resolves.toBeNull()
  })

  it('falls back to the email when no name is available', async () => {
    const { client } = makeClient({ existing: null, chiefAccepted: true })

    const result = await joinClub(
      { id: 'user-2', email: 'noname@example.com' },
      client,
    )

    expect(result?.name).toBe('noname@example.com')
  })
})
