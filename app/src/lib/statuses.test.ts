import { describe, expect, it } from 'vitest'
import {
  DECISION_STATUSES,
  DEFAULT_STATUS,
  STATUSES,
  WORKFLOW_STATUSES,
  badgeClass,
  isDecision,
  isKnownStatus,
  readerStatus,
  toneOf,
} from './statuses'

describe('status ladder', () => {
  it('splits cleanly into workflow states and decisions', () => {
    expect(WORKFLOW_STATUSES.map((s) => s.value)).toEqual([
      'Received',
      'In review',
      'Shortlist',
    ])
    expect(DECISION_STATUSES.map((s) => s.value)).toEqual([
      'Accepted',
      'Hold',
      'Rejected',
    ])
    // No status may appear in both halves, and none may be dropped.
    expect(WORKFLOW_STATUSES.length + DECISION_STATUSES.length).toBe(
      STATUSES.length,
    )
  })

  it('gives every status its own badge tone', () => {
    const tones = STATUSES.map((s) => s.tone)
    expect(new Set(tones).size).toBe(STATUSES.length)
  })

  it('does not put the default status behind a decision', () => {
    expect(DEFAULT_STATUS).toBe('Received')
    expect(isDecision(DEFAULT_STATUS)).toBe(false)
  })
})

describe('isDecision', () => {
  it('is true only for the three terminal states', () => {
    expect(isDecision('Accepted')).toBe(true)
    expect(isDecision('Hold')).toBe(true)
    expect(isDecision('Rejected')).toBe(true)
    expect(isDecision('Received')).toBe(false)
    expect(isDecision('In review')).toBe(false)
    expect(isDecision('Shortlist')).toBe(false)
  })

  it('says no to values outside the ladder', () => {
    expect(isDecision('Archived')).toBe(false)
    expect(isDecision('')).toBe(false)
    expect(isKnownStatus('Archived')).toBe(false)
  })
})

describe('badges', () => {
  it('builds a class from the tone, however many words the status has', () => {
    // The old inline version was status.toLowerCase().replace(' ', '-'),
    // which only replaced the first space and would have produced
    // badge-in-review-x for a three-word status.
    expect(badgeClass('In review')).toBe('badge badge-in-review')
    expect(badgeClass('Accepted')).toBe('badge badge-accepted')
    expect(badgeClass('Hold')).toBe('badge badge-hold')
    expect(badgeClass('Rejected')).toBe('badge badge-rejected')
  })

  it('falls back to the neutral tone for an unknown value', () => {
    expect(toneOf('Archived')).toBe('received')
    expect(badgeClass('Archived')).toBe('badge badge-received')
  })
})

describe('what a reader sees', () => {
  it('passes workflow states through unchanged', () => {
    expect(readerStatus('Received')).toEqual({
      label: 'Received',
      badge: 'badge badge-received',
    })
    expect(readerStatus('In review').label).toBe('In review')
    expect(readerStatus('Shortlist').label).toBe('Shortlist')
  })

  it('never shows a reader which way a decision went', () => {
    for (const status of ['Accepted', 'Hold', 'Rejected']) {
      const shown = readerStatus(status)
      expect(shown.label).toBe('With editors')
      expect(shown.badge).toBe('badge badge-in-review')
      // The word itself must not leak through the label.
      expect(shown.label).not.toContain(status)
    }
  })
})
