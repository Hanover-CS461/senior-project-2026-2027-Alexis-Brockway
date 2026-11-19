import { describe, expect, it } from 'vitest'
import {
  LETTER_KINDS,
  describeLetter,
  hasSentLetter,
  isQueued,
  kindForDecision,
  kindLabel,
  queuedLetters,
  type OutboxRow,
} from './outbox'
import { LETTER_KINDS as TEMPLATE_KINDS } from '../../supabase/functions/send-letters/templates'

function row(over: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: 'row-1',
    submission_id: 'sub-1',
    kind: 'accepted',
    status: 'queued',
    queued_at: '2026-11-20T10:00:00.000Z',
    sent_at: null,
    attempts: 0,
    last_error: null,
    ...over,
  }
}

describe('which decision releases a letter', () => {
  it('sends on Accepted and Rejected', () => {
    expect(kindForDecision('Accepted')).toBe('accepted')
    expect(kindForDecision('Rejected')).toBe('rejected')
  })

  it('sends nothing for Hold, and nothing for the workflow states', () => {
    // The whole point of the Hold decision: an editor can park a piece
    // without writing to the author, and the database refuses a 'hold' row.
    expect(kindForDecision('Hold')).toBeNull()
    for (const status of ['Received', 'In review', 'Shortlist', 'Archived']) {
      expect(kindForDecision(status)).toBeNull()
    }
  })
})

describe('the two kind lists stay in step', () => {
  it('matches the templates, which the app never bundles', () => {
    // `outbox.ts` deliberately keeps its own copy so the letter text stays out
    // of the JavaScript bundle. This is the test that makes the duplication
    // safe: adding a template without adding a kind fails here.
    expect([...LETTER_KINDS].sort()).toEqual([...TEMPLATE_KINDS].sort())
  })

  it('has no hold kind anywhere', () => {
    expect(LETTER_KINDS).not.toContain('hold' as never)
    expect(TEMPLATE_KINDS).not.toContain('hold' as never)
  })
})

describe('letter labels', () => {
  it('names each kind for the editor', () => {
    expect(kindLabel('received')).toBe('Receipt')
    expect(kindLabel('accepted')).toBe('Acceptance letter')
    expect(kindLabel('rejected')).toBe('Rejection letter')
  })

  it('falls back to the raw value so an unknown kind still renders', () => {
    expect(kindLabel('reminder')).toBe('reminder')
  })
})

describe('letter state', () => {
  it('shows queued, sent, failed and skipped differently', () => {
    expect(describeLetter(row({ status: 'queued' }))).toEqual({
      label: 'Queued',
      tone: 'queued',
    })
    expect(describeLetter(row({ status: 'sent', sent_at: 'x' }))).toEqual({
      label: 'Sent',
      tone: 'sent',
    })
    expect(describeLetter(row({ status: 'failed' }))).toEqual({
      label: 'Failed',
      tone: 'failed',
    })
    expect(describeLetter(row({ status: 'skipped' }))).toEqual({
      label: 'Skipped',
      tone: 'skipped',
    })
  })

  it('treats an unrecognised status as still queued', () => {
    expect(describeLetter(row({ status: 'weird' })).label).toBe('Queued')
  })
})

describe('reading the queue', () => {
  const rows = [
    row({ id: 'a', status: 'queued' }),
    row({ id: 'b', status: 'sent', sent_at: '2026-11-21T10:00:00.000Z' }),
    row({ id: 'c', status: 'failed' }),
    row({ id: 'd', status: 'queued' }),
  ]

  it('counts only what still has to go out', () => {
    expect(queuedLetters(rows).map((r) => r.id)).toEqual(['a', 'd'])
    expect(isQueued(rows[1])).toBe(false)
  })

  it('knows when a letter has already gone', () => {
    // This is what decides whether the undo confirm can promise a clean
    // withdrawal, so it has to be true for anything with sent_at.
    expect(hasSentLetter(rows)).toBe(true)
    expect(hasSentLetter([row({ status: 'queued' })])).toBe(false)
  })
})
