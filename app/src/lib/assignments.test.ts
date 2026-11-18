import { describe, expect, it } from 'vitest'
import {
  assigneeLabel,
  assigneeState,
  assigneesFor,
  readersOnStaff,
  splitReaderQueue,
  staffTargets,
  staffsWithTargets,
  unassignedReaders,
  type AssignableReader,
} from './assignments'

const readers: AssignableReader[] = [
  { user_id: 'u1', name: 'Alexis', staffs: ['fiction', 'poetry'] },
  { user_id: 'u2', name: 'Jordan', staffs: ['fiction'] },
  { user_id: 'u3', name: 'Sam', staffs: [] },
  { user_id: 'u4', name: 'Robin' },
]

describe('assigneeState', () => {
  it('is "reading" until the reader has a row', () => {
    expect(assigneeState(undefined)).toBe('reading')
  })

  it('is "recused" when they stood aside, even with a note', () => {
    expect(assigneeState({ reader_id: 'u1', score: null, recused: true })).toBe(
      'recused',
    )
  })

  it('is "scored" once a score exists', () => {
    expect(assigneeState({ reader_id: 'u1', score: 4, recused: false })).toBe(
      'scored',
    )
  })

  it('is still "reading" for a notes-only row with no score', () => {
    expect(assigneeState({ reader_id: 'u1', score: null, recused: false })).toBe(
      'reading',
    )
  })
})

describe('assigneeLabel', () => {
  it('names the problem on a recusal, not a verdict', () => {
    expect(assigneeLabel('recused', null)).toBe('Recused — needs reassignment')
  })

  it('shows the score out of five', () => {
    expect(assigneeLabel('scored', 4)).toBe('Scored 4 / 5')
  })

  it('leaves the score blank rather than printing "null"', () => {
    expect(assigneeLabel('scored', null)).toBe('Scored — / 5')
  })

  it('says nothing has happened yet', () => {
    expect(assigneeLabel('reading', null)).toBe('Not read yet')
  })
})

describe('assigneesFor', () => {
  it('joins names, staffs and ratings, in name order', () => {
    const rows = assigneesFor(
      [{ reader_id: 'u2' }, { reader_id: 'u1' }],
      readers,
      [{ reader_id: 'u2', score: 3, recused: false }],
    )

    expect(rows.map((r) => r.name)).toEqual(['Alexis', 'Jordan'])
    expect(rows[0]).toMatchObject({ state: 'reading', score: null })
    expect(rows[1]).toMatchObject({ state: 'scored', score: 3 })
  })

  it('does not invent a name for a reader it cannot see', () => {
    // RLS can hide a member row from a viewer; the row must still render.
    const rows = assigneesFor([{ reader_id: 'ghost' }], readers, [])
    expect(rows[0].name).toBe('Unknown reader')
    expect(rows[0].staffs).toEqual([])
  })

  it('treats a missing staffs column as no teams', () => {
    const rows = assigneesFor([{ reader_id: 'u4' }], readers, [])
    expect(rows[0].staffs).toEqual([])
  })
})

describe('unassignedReaders', () => {
  it('drops anyone already holding the piece', () => {
    expect(
      unassignedReaders(readers, [{ reader_id: 'u1' }]).map((r) => r.user_id),
    ).toEqual(['u2', 'u3', 'u4'])
  })

  it('keeps everyone when nothing is assigned', () => {
    expect(unassignedReaders(readers, [])).toHaveLength(4)
  })
})

describe('readersOnStaff', () => {
  it('returns the staff in name order', () => {
    expect(readersOnStaff(readers, 'fiction').map((r) => r.name)).toEqual([
      'Alexis',
      'Jordan',
    ])
  })

  it('is empty for a staff nobody joined', () => {
    expect(readersOnStaff(readers, 'visual-arts')).toEqual([])
  })

  it('never includes a general-staff reader', () => {
    expect(readersOnStaff(readers, 'poetry').map((r) => r.user_id)).toEqual([
      'u1',
    ])
  })
})

describe('staffTargets', () => {
  it('is the staff minus anyone already assigned — the rows a click writes', () => {
    expect(
      staffTargets(readers, [{ reader_id: 'u1' }], 'fiction').map(
        (r) => r.user_id,
      ),
    ).toEqual(['u2'])
  })
})

describe('staffsWithTargets', () => {
  it('offers only staffs that still have someone to add, in genre order', () => {
    // u1 (fiction+poetry) and u2 (fiction) are already on the piece, so
    // fiction has nobody left; poetry is empty too.
    expect(
      staffsWithTargets(readers, [{ reader_id: 'u1' }, { reader_id: 'u2' }]),
    ).toEqual([])

    expect(
      staffsWithTargets(readers, [{ reader_id: 'u2' }]).map((s) => s.slug),
    ).toEqual(['fiction', 'poetry'])
  })

  it('counts the readers a click would add', () => {
    expect(staffsWithTargets(readers, [{ reader_id: 'u2' }])[0].count).toBe(1)
  })
})

describe('splitReaderQueue', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('puts assigned, unscored work first and everything else below', () => {
    const { assigned, rest } = splitReaderQueue(
      items,
      new Set(['a', 'c']),
      new Set(['b']),
    )
    expect(assigned.map((i) => i.id)).toEqual(['a', 'c'])
    expect(rest.map((i) => i.id)).toEqual(['d'])
  })

  it('removes a piece from both lists once it is scored', () => {
    // The score is the only "done" signal: an assignment that has been read
    // must not linger in "Assigned to you" forever.
    const { assigned, rest } = splitReaderQueue(
      items,
      new Set(['a']),
      new Set(['a']),
    )
    expect(assigned).toEqual([])
    expect(rest.map((i) => i.id)).toEqual(['b', 'c', 'd'])
  })

  it('shows the whole queue when nothing is assigned', () => {
    const { assigned, rest } = splitReaderQueue(items, new Set(), new Set())
    expect(assigned).toEqual([])
    expect(rest).toHaveLength(4)
  })
})
