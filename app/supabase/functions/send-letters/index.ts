// Supabase Edge Function: send-letters
//
// Drains `public.email_outbox` and posts each letter to Resend. This is the
// only place in the project that sends mail to a writer, and the only place
// the Resend key exists.
//
// ---------------------------------------------------------------------------
// The gate is in the database, not in this file.
//
// The caller's own token is used for one question — `is_editor()` — before
// the service-role client exists at all. So "may you send letters?" is
// answered by the same function that guards every other editor action, and
// a reader who calls the function directly gets a 403 from Postgres.
// ---------------------------------------------------------------------------
//
// Deploy:    supabase functions deploy send-letters
// Secrets:   supabase secrets set RESEND_API_KEY=... FROM_EMAIL=...
// Preview:   POST with {"dryRun": true} — renders every queued letter and
//            writes nothing, which is how the wording is checked without
//            mailing a seed author.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { letterFor, type LetterKind } from './templates.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Small batches: a free-tier limit or a function timeout must not half-drain a queue. */
const BATCH = 20
const MAX_ATTEMPTS = 3

/**
 * A receipt queued this long ago is not a writer waiting for word — it is a
 * seed re-paste or a database restored from a dump. Decisions are exempt: a
 * writer can legitimately wait months for one.
 */
const RECEIPT_MAX_AGE_DAYS = 30

interface QueuedRow {
  id: string
  submission_id: string
  kind: LetterKind
  queued_at: string
  attempts: number
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function ageInDays(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Missing session token' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // 1. Ask the database who is calling, using their own token.
  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: allowed, error: gateError } = await asCaller.rpc('is_editor')
  if (gateError) return json({ error: gateError.message }, 401)
  if (allowed !== true) {
    return json({ error: 'Only an active editor may send letters.' }, 403)
  }

  let dryRun = false
  let onlySubmission: string | null = null
  try {
    const body = await req.json()
    dryRun = body?.dryRun === true
    if (typeof body?.submissionId === 'string') {
      onlySubmission = body.submissionId
    }
  } catch {
    // No body is fine: the default is a real send.
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('FROM_EMAIL')
  if (!dryRun && (!resendKey || !from)) {
    return json(
      {
        error:
          'Mail is not configured yet. Set RESEND_API_KEY and FROM_EMAIL ' +
          'as function secrets (see supabase/functions/send-letters/README.md).',
      },
      503,
    )
  }

  // 2. Now, and only now, the service-role client — it is what can read
  //    `authors`, which readers are structurally unable to open.
  const admin = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: queued, error: queueError } = await admin
    .from('email_outbox')
    .select('id, submission_id, kind, queued_at, attempts')
    .eq('status', 'queued')
    .order('queued_at', { ascending: true })
    .limit(BATCH)

  if (queueError) return json({ error: queueError.message }, 500)

  // "Send now" on one submission means that submission, not the whole queue.
  const rows = onlySubmission
    ? (queued ?? []).filter((r) => r.submission_id === onlySubmission)
    : (queued ?? [])

  if (rows.length === 0) {
    return json({ sent: 0, failed: 0, skipped: 0, letters: [] })
  }

  const ids = [...new Set(rows.map((r) => r.submission_id))]

  // Three plain queries rather than one embedded select: an embed across
  // authors.submission_id is legal but easy to get subtly wrong, and this
  // runs in a place where a wrong query is a silent no-op, not a test failure.
  const { data: submissions, error: subError } = await admin
    .from('submissions')
    .select('id, title, genre')
    .in('id', ids)
  if (subError) return json({ error: subError.message }, 500)

  const { data: authors, error: authorError } = await admin
    .from('authors')
    .select('submission_id, name, email')
    .in('submission_id', ids)
  if (authorError) return json({ error: authorError.message }, 500)

  const submissionById = new Map((submissions ?? []).map((s) => [s.id, s]))
  const authorBySubmission = new Map(
    (authors ?? []).map((a) => [a.submission_id, a]),
  )

  const letters: Array<{
    submissionId: string
    kind: string
    to: string
    subject: string
    text: string
  }> = []
  let sent = 0
  let failed = 0
  let skipped = 0

  for (const row of rows as QueuedRow[]) {
    const submission = submissionById.get(row.submission_id)
    const author = authorBySubmission.get(row.submission_id)

    // A submission with no author row cannot be emailed, and one that no
    // longer exists is nothing to say. Surface it instead of failing quietly.
    if (!submission || !author?.email) {
      failed += 1
      await admin
        .from('email_outbox')
        .update({
          status: 'failed',
          attempts: row.attempts + 1,
          last_error: 'No author email on file for this submission.',
        })
        .eq('id', row.id)
      continue
    }

    if (row.kind === 'received' && ageInDays(row.queued_at) > RECEIPT_MAX_AGE_DAYS) {
      skipped += 1
      if (!dryRun) {
        await admin
          .from('email_outbox')
          .update({
            status: 'skipped',
            last_error: `Receipt queued more than ${RECEIPT_MAX_AGE_DAYS} days ago; not a live submission.`,
          })
          .eq('id', row.id)
      }
      continue
    }

    const letter = letterFor(row.kind, {
      title: submission.title,
      genre: submission.genre,
      name: author.name ?? '',
    })

    letters.push({
      submissionId: row.submission_id,
      kind: row.kind,
      to: author.email,
      subject: letter.subject,
      text: letter.text,
    })

    if (dryRun) continue

    let ok = false
    let failure = ''
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
          // The outbox row id is the idempotency key, so a retried request
          // cannot arrive twice. Belt and braces with `unique (submission_id,
          // kind)`, which already makes a duplicate row impossible.
          'Idempotency-Key': row.id,
        },
        body: JSON.stringify({
          from,
          to: [author.email],
          subject: letter.subject,
          text: letter.text,
        }),
      })
      ok = res.ok
      if (!ok) failure = `${res.status} ${(await res.text()).slice(0, 300)}`
    } catch (e) {
      failure = e instanceof Error ? e.message : 'Network error reaching Resend'
    }

    if (ok) {
      sent += 1
      await admin
        .from('email_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
        .eq('id', row.id)
    } else {
      failed += 1
      const attempts = row.attempts + 1
      await admin
        .from('email_outbox')
        .update({
          // Keep a retryable row queued until it runs out of attempts, then
          // stop retrying and let an editor look at it.
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
          attempts,
          last_error: failure,
        })
        .eq('id', row.id)
    }
  }

  return json({ dryRun, sent, failed, skipped, letters })
})
