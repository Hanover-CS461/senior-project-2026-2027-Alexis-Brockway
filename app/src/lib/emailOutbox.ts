// Reading and writing the letter queue from the app.
//
// Every call here is allowed or refused by RLS, not by this file: an editor
// may queue and cancel, and nobody may mark a row sent — that is the Edge
// Function's job with the service role. So there is no "send" call that
// touches the table; sending is one request to the function.

import { supabase } from './supabase'
import type { LetterKind, OutboxRow } from './outbox'

export interface PreviewLetter {
  /** Which piece this letter belongs to, so a preview can be narrowed to one. */
  submissionId: string
  kind: string
  to: string
  subject: string
  text: string
}

export interface SendResult {
  dryRun: boolean
  sent: number
  failed: number
  skipped: number
  letters: PreviewLetter[]
}

const NOT_DEPLOYED =
  'Letters are not switched on yet: the send-letters function has not been deployed. ' +
  'See app/supabase/functions/send-letters/README.md.'

/** Pulls the useful half out of a functions.invoke failure. */
async function describeInvokeError(e: unknown): Promise<string> {
  const response = (e as { context?: Response }).context
  if (response && typeof response.status === 'number') {
    if (response.status === 404) return NOT_DEPLOYED
    try {
      const body = await response.clone().json()
      if (body && typeof body.error === 'string') return body.error
    } catch {
      // Not JSON — fall through to the status line.
    }
    return `The mail function answered ${response.status}.`
  }
  return e instanceof Error ? e.message : 'Could not reach the mail function.'
}

/** Every letter queued or sent for one submission. */
export async function loadLetters(submissionId: string): Promise<OutboxRow[]> {
  const { data, error } = await supabase
    .from('email_outbox')
    .select(
      'id, submission_id, kind, status, queued_at, sent_at, attempts, last_error',
    )
    .eq('submission_id', submissionId)
    .order('queued_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as OutboxRow[]
}

/** The whole queue, newest last. Editor-only by RLS. */
export async function loadQueue(): Promise<OutboxRow[]> {
  const { data, error } = await supabase
    .from('email_outbox')
    .select(
      'id, submission_id, kind, status, queued_at, sent_at, attempts, last_error',
    )
    .order('queued_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as OutboxRow[]
}

/**
 * Queue a letter. A duplicate is not a failure: `unique (submission_id, kind)`
 * is the database refusing to send the same letter twice — the behaviour we
 * want — so 23505 counts as success from the caller's side.
 */
export async function queueLetter(
  submissionId: string,
  kind: LetterKind,
): Promise<string | null> {
  const { error } = await supabase
    .from('email_outbox')
    .insert({ submission_id: submissionId, kind })

  if (!error) return null
  if (error.code === '23505') return null
  return error.message
}

/**
 * Take back decision letters that have not gone out.
 *
 * Only the two decision kinds are touched: a receipt still sitting in the
 * queue is owed to the writer regardless of what the editors decided, so
 * recording a verdict must not swallow it. `keepKind` spares the letter for
 * the verdict just recorded, so moving straight from Accepted to Rejected
 * withdraws the acceptance instead of mailing both.
 *
 * A letter that has already gone out survives this: the DELETE policy refuses
 * any row with `sent_at` set, and that is the point.
 */
export async function cancelUnsentDecisionLetters(
  submissionId: string,
  keepKind?: LetterKind,
): Promise<string | null> {
  let query = supabase
    .from('email_outbox')
    .delete()
    .eq('submission_id', submissionId)
    .is('sent_at', null)
    .in('kind', ['accepted', 'rejected'])

  if (keepKind) query = query.neq('kind', keepKind)

  const { error } = await query
  return error ? error.message : null
}

/** Cancel any single queued letter by id — used from the queue view. */
export async function cancelLetter(id: string): Promise<string | null> {
  const { error } = await supabase.from('email_outbox').delete().eq('id', id)
  return error ? error.message : null
}

export interface SendOptions {
  /** Render the letters and write nothing. */
  dryRun?: boolean
  /** Drain one submission instead of the whole queue. */
  submissionId?: string
}

/**
 * Ask the Edge Function to drain the queue. `dryRun` renders the letters and
 * writes nothing — that is how the wording gets checked without mailing
 * anyone.
 */
export async function sendLetters(
  options: SendOptions = {},
): Promise<{ result: SendResult | null; error: string | null }> {
  const { dryRun = false, submissionId } = options

  const { data, error } = await supabase.functions.invoke('send-letters', {
    body: { dryRun, submissionId },
  })

  if (error) return { result: null, error: await describeInvokeError(error) }
  return { result: data as SendResult, error: null }
}
