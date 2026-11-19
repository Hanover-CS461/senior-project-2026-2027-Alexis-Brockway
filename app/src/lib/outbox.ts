// What the app knows about the letter queue.
//
// Deliberately *not* importing `templates.ts`: the app never holds the text
// of a letter. A preview comes from the Edge Function's `dryRun`, so the
// wording of a rejection letter is not sitting in a JavaScript bundle any
// reader can open in devtools. `outbox.test.ts` asserts this file's kind list
// still matches the templates' list, so the duplication cannot drift.

export type LetterKind = 'received' | 'accepted' | 'rejected'

export type LetterStatus = 'queued' | 'sent' | 'failed' | 'skipped'

/** Every kind a letter can be. `hold` is absent on purpose — Hold sends nothing. */
export const LETTER_KINDS: readonly LetterKind[] = [
  'received',
  'accepted',
  'rejected',
]

export interface OutboxRow {
  id: string
  submission_id: string
  kind: string
  status: string
  queued_at: string
  sent_at: string | null
  attempts: number
  last_error: string | null
}

export const KIND_LABELS: Record<LetterKind, string> = {
  received: 'Receipt',
  accepted: 'Acceptance letter',
  rejected: 'Rejection letter',
}

/** Falls back to the raw value so an unknown kind still renders. */
export function kindLabel(kind: string): string {
  return KIND_LABELS[kind as LetterKind] ?? kind
}

/**
 * Which letter a decision releases.
 *
 * `Hold` returns null — and so does every workflow state. That is the rule:
 * a writer hears a receipt, an acceptance, or a rejection, and nothing else.
 * The database refuses a 'hold' row anyway, so this is the friendly half of
 * the same decision.
 */
export function kindForDecision(status: string): LetterKind | null {
  if (status === 'Accepted') return 'accepted'
  if (status === 'Rejected') return 'rejected'
  return null
}

export interface LetterView {
  label: string
  /** CSS modifier: `letter-state state-${tone}` */
  tone: string
}

export function describeLetter(row: OutboxRow): LetterView {
  switch (row.status) {
    case 'sent':
      return { label: 'Sent', tone: 'sent' }
    case 'failed':
      return { label: 'Failed', tone: 'failed' }
    case 'skipped':
      return { label: 'Skipped', tone: 'skipped' }
    default:
      return { label: 'Queued', tone: 'queued' }
  }
}

export function isQueued(row: OutboxRow): boolean {
  return row.status === 'queued'
}

export function queuedLetters(rows: readonly OutboxRow[]): OutboxRow[] {
  return rows.filter(isQueued)
}

/**
 * True once any letter for this submission has actually gone out. Undoing a
 * decision after that point cannot un-send it, so the confirm text has to say
 * so plainly instead of pretending the undo was clean.
 */
export function hasSentLetter(rows: readonly OutboxRow[]): boolean {
  return rows.some((r) => r.status === 'sent')
}
