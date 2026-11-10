// One source of truth for the submission workflow.
//
//   Received → In review → Shortlist → { Accepted | Hold | Rejected }
//
// The first three are *workflow* states an editor moves around freely. The last
// three are *decisions*: the database stamps them with `decided_at` and refuses
// a decision that doesn't carry one (see submissions_decided_at_matches_status
// in the 20261110 migration).
//
// Keep this list in step with submissions_status_check. The database rejects any
// other value, so drift here shows up as a 400 rather than a silent bad row.

export type StatusValue =
  | 'Received'
  | 'In review'
  | 'Shortlist'
  | 'Accepted'
  | 'Hold'
  | 'Rejected'

export interface StatusDef {
  value: StatusValue
  /** CSS modifier: `badge-${tone}` */
  tone: string
  /** A decision is an act, not a label — it needs confirming and carries a date. */
  decision: boolean
}

export const STATUSES: readonly StatusDef[] = [
  { value: 'Received', tone: 'received', decision: false },
  { value: 'In review', tone: 'in-review', decision: false },
  { value: 'Shortlist', tone: 'shortlist', decision: false },
  { value: 'Accepted', tone: 'accepted', decision: true },
  { value: 'Hold', tone: 'hold', decision: true },
  { value: 'Rejected', tone: 'rejected', decision: true },
]

/** What the public form writes; a new submission is never a decision. */
export const DEFAULT_STATUS: StatusValue = 'Received'

/** The three options in the workflow dropdown. */
export const WORKFLOW_STATUSES = STATUSES.filter((s) => !s.decision)

/** The three buttons in the decision panel. */
export const DECISION_STATUSES = STATUSES.filter((s) => s.decision)

export function isKnownStatus(value: string): value is StatusValue {
  return STATUSES.some((s) => s.value === value)
}

export function isDecision(value: string): boolean {
  return STATUSES.some((s) => s.value === value && s.decision)
}

/** Falls back to the neutral tone so an unexpected value still renders. */
export function toneOf(value: string): string {
  return STATUSES.find((s) => s.value === value)?.tone ?? 'received'
}

export function badgeClass(value: string): string {
  return `badge badge-${toneOf(value)}`
}

/**
 * What a reader sees. Readers are staff, but a decision is an editorial matter:
 * they see that a submission is with the editors, not which way it went. The
 * author learns from a decision letter, not by watching a queue.
 */
export const READER_HIDDEN_LABEL = 'With editors'

export function readerStatus(value: string): { label: string; badge: string } {
  return isDecision(value)
    ? { label: READER_HIDDEN_LABEL, badge: 'badge badge-in-review' }
    : { label: value, badge: badgeClass(value) }
}
