import { describe, expect, it } from 'vitest'
import {
  membersCsv,
  ratingsCsv,
  submissionsCsv,
  summariseScores,
  type ExportAuthor,
  type ExportRating,
  type ExportSubmission,
} from './exportData'

const submission: ExportSubmission = {
  id: 'sub-1',
  title: 'The Last Ferry',
  genre: 'Fiction',
  status: 'Accepted',
  decided_at: '2026-11-10T14:00:00Z',
  hanover_student: true,
  created_at: '2026-10-29T09:00:00Z',
}

const author: ExportAuthor = {
  submission_id: 'sub-1',
  name: 'Margaret Okafor',
  email: 'margaret.okafor@example.com',
  mailing_address: '12 Ferry Rd, Hanover, IN',
  bio: 'Senior, English',
}

function rating(overrides: Partial<ExportRating> = {}): ExportRating {
  return {
    submission_id: 'sub-1',
    score: 4,
    notes: '',
    recused: false,
    ...overrides,
  }
}

describe('summariseScores', () => {
  it('averages the non-recused scores only', () => {
    const summary = summariseScores([
      rating({ score: 2 }),
      rating({ score: 4 }),
      rating({ score: null, recused: true }),
    ])

    expect(summary.average).toBe(3)
    expect(summary.cast).toBe(2)
    expect(summary.recused).toBe(1)
  })

  it('reports no average when nobody has scored', () => {
    const summary = summariseScores([rating({ score: null, recused: true })])

    expect(summary.average).toBeNull()
    expect(summary.cast).toBe(0)
    expect(summary.recused).toBe(1)
  })

  it('treats an unscored, non-recused rating as no vote', () => {
    const summary = summariseScores([rating({ score: null })])

    expect(summary.average).toBeNull()
    expect(summary.cast).toBe(0)
    expect(summary.recused).toBe(0)
  })
})

describe('submissionsCsv', () => {
  it('joins the author and the score summary onto the submission', () => {
    const csv = submissionsCsv([submission], [author], [rating({ score: 4 })])
    const [, row] = csv.split('\r\n')

    expect(row).toContain('The Last Ferry')
    expect(row).toContain('Margaret Okafor')
    expect(row).toContain('margaret.okafor@example.com')
    expect(row).toContain('Accepted')
    expect(row).toContain('4.0')
    expect(row).toContain('yes')
  })

  it('keeps a submission whose author row is missing (a half-failed intake)', () => {
    const csv = submissionsCsv([submission], [], [])
    const [, row] = csv.split('\r\n')

    expect(row).toContain('The Last Ferry')
    expect(row).toContain('sub-1')
  })

  it('leaves the average blank rather than printing 0 for an unscored piece', () => {
    const csv = submissionsCsv([submission], [author], [])
    const [, row] = csv.split('\r\n')
    const cells = row.split(',')

    // Average score is column 9, followed by "Scores cast" and "Recused".
    expect(cells[8]).toBe('')
    expect(cells[9]).toBe('0')
  })

  it('puts a quoted address back together as one cell', () => {
    const csv = submissionsCsv([submission], [author], [])
    expect(csv).toContain('"12 Ferry Rd, Hanover, IN"')
  })
})

describe('ratingsCsv', () => {
  it('exports notes without saying who wrote them', () => {
    const csv = ratingsCsv(
      [submission],
      [rating({ score: 5, notes: 'The ending earns it.' })],
    )

    expect(csv).toContain('The ending earns it.')
    expect(csv).not.toContain('reader')
    expect(csv).not.toContain('user_id')
  })

  it('records a recusal with no score', () => {
    const csv = ratingsCsv(
      [submission],
      [rating({ score: null, recused: true, notes: 'I know this writer.' })],
    )
    const [, row] = csv.split('\r\n')

    expect(row).toBe('sub-1,The Last Ferry,,yes,I know this writer.')
  })
})

describe('membersCsv', () => {
  it('exports staff with role and active flag', () => {
    const csv = membersCsv([
      {
        name: 'Test Reader',
        email: 'kennings.reader@example.com',
        role: 'reader',
        active: true,
        created_at: '2026-10-29T09:00:00Z',
      },
    ])

    expect(csv.split('\r\n')[0]).toBe('Name,Email,Role,Active,Joined')
    expect(csv).toContain('kennings.reader@example.com,reader,yes')
  })
})
