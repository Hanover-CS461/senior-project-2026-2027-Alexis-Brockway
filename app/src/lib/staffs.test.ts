import { describe, expect, it } from 'vitest'
import {
  groupByStaff,
  hasStaff,
  staffNamesFor,
  staffNamesFromCsv,
  toggleStaff,
} from './staffs'
import { MEMBER_STAFFS, MEMBER_STAFF_SLUGS, staffLabel } from '../data/members'
import { genres } from '../data/genres'

describe('toggleStaff', () => {
  it('adds a staff that is not there yet', () => {
    expect(toggleStaff([], 'poetry')).toEqual(['poetry'])
    expect(toggleStaff(['fiction'], 'poetry')).toEqual(['fiction', 'poetry'])
  })

  it('removes a staff that is already there', () => {
    expect(toggleStaff(['fiction', 'poetry'], 'fiction')).toEqual(['poetry'])
    expect(toggleStaff(['poetry'], 'poetry')).toEqual([])
  })

  it('treats a missing array as empty', () => {
    expect(toggleStaff(undefined, 'fiction')).toEqual(['fiction'])
    expect(toggleStaff(null, 'fiction')).toEqual(['fiction'])
  })

  it('keeps genre order, not click order', () => {
    // Clicking Poetry then Fiction must store the same value as the reverse,
    // so two members with identical teams produce identical rows.
    const a = toggleStaff(toggleStaff([], 'poetry'), 'fiction')
    const b = toggleStaff(toggleStaff([], 'fiction'), 'poetry')
    expect(a).toEqual(['fiction', 'poetry'])
    expect(b).toEqual(a)
  })

  it('does not duplicate an existing entry', () => {
    const once = toggleStaff([], 'fiction')
    const off = toggleStaff(once, 'fiction')
    expect(toggleStaff(off, 'fiction')).toEqual(['fiction'])
  })
})

describe('hasStaff', () => {
  it('is true only for a staff actually assigned', () => {
    expect(hasStaff(['fiction'], 'fiction')).toBe(true)
    expect(hasStaff(['fiction'], 'poetry')).toBe(false)
  })

  it('is false for an empty or missing list', () => {
    expect(hasStaff([], 'fiction')).toBe(false)
    expect(hasStaff(undefined, 'fiction')).toBe(false)
    expect(hasStaff(null, 'fiction')).toBe(false)
  })
})

describe('staffNamesFor', () => {
  it('renders genre labels in genre order', () => {
    expect(staffNamesFor(['visual-arts', 'fiction'])).toBe(
      'Fiction, Photography & Visual Art',
    )
  })

  it('is empty for no staffs', () => {
    expect(staffNamesFor([])).toBe('')
    expect(staffNamesFor(undefined)).toBe('')
  })

  it('drops an unknown slug instead of printing it raw', () => {
    expect(staffNamesFor(['fiction', 'not-a-genre'])).toBe('Fiction')
  })
})

describe('staffNamesFromCsv', () => {
  it('reads the comma-joined audit value back into labels', () => {
    expect(staffNamesFromCsv('fiction,poetry')).toBe('Fiction, Poetry')
  })

  it('handles an empty audit value (every staff removed)', () => {
    expect(staffNamesFromCsv('')).toBe('')
    expect(staffNamesFromCsv(null)).toBe('')
  })

  it('ignores stray separators', () => {
    expect(staffNamesFromCsv('fiction,,poetry,')).toBe('Fiction, Poetry')
  })
})

describe('groupByStaff', () => {
  it('returns one group per staff, in genre order, with members attached', () => {
    const staff = [
      { name: 'Alexis', staffs: ['fiction', 'poetry'], active: true },
      { name: 'Sam', staffs: ['poetry'], active: true },
      { name: 'Nobody', staffs: [], active: true },
    ]
    const groups = groupByStaff(staff)

    expect(groups.map((g) => g.slug)).toEqual([...MEMBER_STAFF_SLUGS])
    expect(groups[0].members.map((m) => m.name)).toEqual(['Alexis'])
    expect(groups[1].members.map((m) => m.name)).toEqual(['Alexis', 'Sam'])
    expect(groups[2].members).toEqual([])
    expect(groups[3].members).toEqual([])
  })

  it('tolerates a row fetched without the staffs column', () => {
    const rows: { name: string; staffs?: string[] }[] = [{ name: 'Old Query' }]
    const groups = groupByStaff(rows)
    expect(groups.every((g) => g.members.length === 0)).toBe(true)
  })
})

describe('staff slugs match the rest of the app', () => {
  it('names every real genre in genres.ts', () => {
    // Drift guard: adding a fifth genre to the submission form must not leave a
    // genre nobody can be assigned to. This failing is the reminder to update
    // MEMBER_STAFF_SLUGS and the members_staffs_known check constraint too.
    const genreSlugs = genres.map((g) => g.slug).sort()
    expect([...MEMBER_STAFF_SLUGS].sort()).toEqual(genreSlugs)
  })

  it('labels each staff with its genre name', () => {
    for (const staff of MEMBER_STAFFS) {
      expect(staff.label).toBe(genres.find((g) => g.slug === staff.value)?.name)
    }
  })

  it('leaves an unknown slug readable rather than blank', () => {
    expect(staffLabel('fiction')).toBe('Fiction')
    expect(staffLabel('mystery')).toBe('mystery')
  })
})
