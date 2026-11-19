import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { canManageMembers } from '../lib/roles'
import {
  assigneeLabel,
  assigneesFor,
  staffTargets,
  staffsWithTargets,
  unassignedReaders,
  type AssignableReader,
  type AssignmentRow,
} from '../lib/assignments'
import { staffLabel } from '../data/members'
import { staffNamesFor } from '../lib/staffs'
import {
  DECISION_STATUSES,
  WORKFLOW_STATUSES,
  badgeClass,
  isDecision,
} from '../lib/statuses'
import {
  describeLetter,
  hasSentLetter,
  kindForDecision,
  kindLabel,
  queuedLetters,
  type OutboxRow,
} from '../lib/outbox'
import {
  cancelUnsentDecisionLetters,
  loadLetters,
  queueLetter,
  sendLetters,
  type PreviewLetter,
} from '../lib/emailOutbox'

interface Submission {
  id: string
  title: string
  genre: string
  status: string
  decided_at: string | null
  hanover_student: boolean
  manuscript_path: string
}

interface Author {
  name: string
  email: string
  mailing_address: string | null
  bio: string | null
}

interface RatingRow {
  reader_id: string
  score: number | null
  notes: string
  recused: boolean
  created_at: string
}

function EditorSubmissionPage() {
  const { submissionId } = useParams()
  const { member: currentMember, session } = useAuth()
  const isChief = canManageMembers(currentMember?.role)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [author, setAuthor] = useState<Author | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [decidedAt, setDecidedAt] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [ratings, setRatings] = useState<RatingRow[]>([])
  const [missing, setMissing] = useState(false)

  // Letters owed to the writer. Queued by recording a decision, sent by an
  // editor pressing Send — two separate acts, because a decision can be undone.
  const [letters, setLetters] = useState<OutboxRow[]>([])
  const [lettersReady, setLettersReady] = useState(false)
  const [letterBusy, setLetterBusy] = useState(false)
  const [letterError, setLetterError] = useState<string | null>(null)
  const [letterNote, setLetterNote] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewLetter[] | null>(null)

  /**
   * Reload this piece's letters. A failure means the outbox table has not
   * been pasted yet, or the caller is not an editor — either way the panel
   * stays hidden rather than turning the page into an error.
   */
  const refreshLetters = useCallback(async () => {
    if (!submissionId) return
    try {
      const rows = await loadLetters(submissionId)
      setLetters(rows)
      setLettersReady(true)
    } catch {
      setLettersReady(false)
    }
  }, [submissionId])

  // Reading assignments. Only the Chief Editor can write them (RLS refuses
  // anyone else), so the panel renders only for the chief — which also means
  // reader names stay behind the `members` policy they already lived behind.
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [readers, setReaders] = useState<AssignableReader[]>([])
  const [pickReader, setPickReader] = useState('')
  const [pickStaff, setPickStaff] = useState('')
  const [readingBusy, setReadingBusy] = useState(false)
  const [readingError, setReadingError] = useState<string | null>(null)
  /**
   * Assignments and the reader list are two separate queries, so for a moment
   * the panel knows WHO holds the piece but not their name — and renders "Unknown
   * reader", which reads like a broken row. One flag removes that flash: the row
   * is a real name or it is not drawn yet.
   */
  const [readingLoaded, setReadingLoaded] = useState(false)

  const loadReading = useCallback(async () => {
    if (!submissionId) return
    const { data: assigned } = await supabase
      .from('assignments')
      .select('id, submission_id, reader_id')
      .eq('submission_id', submissionId)
    setAssignments(assigned ?? [])

    const { data: staff } = await supabase
      .from('members')
      .select('user_id, name, staffs')
      .eq('active', true)
    setReaders(staff ?? [])
    // Never reset to false: a reload after assigning should swap the list, not
    // blank the panel.
    setReadingLoaded(true)
  }, [submissionId])

  useEffect(() => {
    if (!submissionId) {
      setMissing(true)
      return
    }
    let cancelled = false

    const load = async () => {
      const { data: sub } = await supabase
        .from('submissions')
        .select(
          'id, title, genre, status, decided_at, hanover_student, manuscript_path',
        )
        .eq('id', submissionId)
        .maybeSingle()
      if (cancelled) return
      if (!sub) {
        setMissing(true)
        return
      }
      setSubmission(sub)
      setStatus(sub.status)
      setDecidedAt(sub.decided_at ?? null)

      const { data: auth } = await supabase
        .from('authors')
        .select('name, email, mailing_address, bio')
        .eq('submission_id', submissionId)
        .maybeSingle()
      if (!cancelled) setAuthor(auth)

      const { data: signed } = await supabase.storage
        .from('manuscripts')
        .createSignedUrl(sub.manuscript_path, 3600)
      if (!cancelled) setFileUrl(signed?.signedUrl ?? null)

      // Editors read every rating (RLS: "editors read all ratings").
      const { data: ratingRows } = await supabase
        .from('ratings')
        .select('reader_id, score, notes, recused, created_at')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true })
      if (!cancelled) setRatings(ratingRows ?? [])

      void refreshLetters()

      // Chief-only in practice: a non-chief's copy of these two selects is
      // filtered to their own row by RLS, and the panel is not rendered anyway.
      if (!cancelled) void loadReading()
    }

    load()
    return () => {
      cancelled = true
    }
  }, [submissionId, loadReading, refreshLetters])

  // One writer for both halves of the workflow. `decided_at` and `status` must
  // move together: the database refuses a decision without a timestamp, and a
  // timestamp on a workflow state, so a partial update is rejected rather than
  // silently leaving an inconsistent row.

  /**
   * Keep the letter queue in step with the status the database just accepted.
   *
   * Recording a decision *queues* its letter, so it cannot be forgotten — but
   * nothing leaves this page. Sending is the separate act, because a decision
   * can be undone and a letter that has gone cannot be recalled.
   */
  const syncLetters = async (next: string, decision: boolean) => {
    if (!submissionId) return
    setLetterError(null)
    setLetterNote(null)
    setPreview(null)

    const kind = decision ? kindForDecision(next) : null

    // Withdraw any unsent verdict first: going Accepted → Rejected must not
    // leave an acceptance in the queue. Hold withdraws without queueing.
    const cancelError = await cancelUnsentDecisionLetters(
      submissionId,
      kind ?? undefined,
    )
    const queueError = kind ? await queueLetter(submissionId, kind) : null
    const failure = cancelError ?? queueError
    if (failure) setLetterError(failure)

    await refreshLetters()
  }

  const save = async (next: string, decision: boolean) => {
    if (!submissionId) return
    const previousStatus = status
    const previousDecidedAt = decidedAt
    const stamp = decision ? new Date().toISOString() : null

    setStatusError(null)
    setStatus(next)
    setDecidedAt(stamp)

    const { error } = await supabase
      .from('submissions')
      .update({ status: next, decided_at: stamp })
      .eq('id', submissionId)

    if (error) {
      setStatus(previousStatus)
      setDecidedAt(previousDecidedAt)
      setStatusError(error.message)
      return
    }

    await syncLetters(next, decision)
  }

  const decide = (next: string) => {
    if (!submission) return
    const letter = kindForDecision(next)
    const ok = window.confirm(
      `Record “${next}” for “${submission.title}”?\n\n` +
        'The decision is stamped with today’s date. You can undo it from this page.' +
        (letter
          ? `\n\nA ${kindLabel(letter).toLowerCase()} will be queued for the ` +
            'author. Nothing is emailed until you press Send.'
          : '\n\nHold sends no letter — the author hears nothing until you ' +
            'decide, and any letter still waiting is withdrawn.'),
    )
    if (ok) void save(next, true)
  }

  const undoDecision = () => {
    const ok = window.confirm(
      hasSentLetter(letters)
        ? 'Send this back to Shortlist and clear the decision?\n\n' +
            'A letter has already gone to the author. It cannot be recalled — ' +
            'you would have to write to them yourself.'
        : 'Send this back to Shortlist and clear the decision?\n\n' +
            'Any letter still waiting in the queue is withdrawn.',
    )
    if (ok) void save('Shortlist', false)
  }

  const sendNow = async () => {
    if (!submissionId) return
    const waiting = queuedLetters(letters).length
    const ok = window.confirm(
      `Send ${waiting} letter${waiting === 1 ? '' : 's'} for “${
        submission?.title ?? 'this piece'
      }” now?\n\nThis emails the author. It cannot be unsent.`,
    )
    if (!ok) return

    setLetterBusy(true)
    setLetterError(null)
    setLetterNote(null)
    const { result, error } = await sendLetters({ submissionId })
    setLetterBusy(false)
    if (error) {
      setLetterError(error)
      return
    }
    setLetterNote(
      result && result.sent > 0
        ? `Sent ${result.sent} letter${result.sent === 1 ? '' : 's'}.`
        : 'Nothing was sent — check the queue below.',
    )
    await refreshLetters()
  }

  const showPreview = async () => {
    if (!submissionId) return
    setLetterBusy(true)
    setLetterError(null)
    setLetterNote(null)
    const { result, error } = await sendLetters({
      dryRun: true,
      submissionId,
    })
    setLetterBusy(false)
    if (error) {
      setLetterError(error)
      return
    }
    const mine = (result?.letters ?? []).filter(
      (l) => l.submissionId === submissionId,
    )
    setPreview(mine)
    if (mine.length === 0) {
      setLetterNote('Nothing is waiting to be sent for this piece.')
    }
  }

  // Hand the piece to one reader, or to everyone on a staff in one action.
  // The lists are filtered first so the button's count is the number of rows
  // actually written; `unique (submission_id, reader_id)` is the backstop.
  const assign = async (readerIds: string[]) => {
    if (!submissionId || readerIds.length === 0) return
    setReadingBusy(true)
    setReadingError(null)
    const { error } = await supabase.from('assignments').insert(
      readerIds.map((reader_id) => ({
        submission_id: submissionId,
        reader_id,
        assigned_by: session?.user.id ?? null,
      })),
    )
    setReadingBusy(false)
    if (error) {
      setReadingError(error.message)
      return
    }
    setPickReader('')
    setPickStaff('')
    void loadReading()
  }

  const unassign = async (id: string) => {
    setReadingBusy(true)
    setReadingError(null)
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
    setReadingBusy(false)
    if (error) {
      setReadingError(error.message)
      return
    }
    void loadReading()
  }

  if (missing) {
    return <Navigate to="/editor" replace />
  }

  if (!submission) {
    return <p className="page empty">Loading…</p>
  }

  const assignees = assigneesFor(assignments, readers, ratings)
  const available = unassignedReaders(readers, assignments)
  const staffOptions = staffsWithTargets(readers, assignments)

  return (
    <div className="page">
      <p className="back-link">
        <Link to="/editor">← Back to editor dashboard</Link>
      </p>

      <h1>{submission.title}</h1>
      <p className="queue-genre">
        {submission.genre} · {status}
      </p>

      {author ? (
        <div className="author-box">
          <h2>Author</h2>
          <p className="author-name">{author.name}</p>
          <p className="author-email">{author.email}</p>
          {author.mailing_address && (
            <p className="author-mailing">{author.mailing_address}</p>
          )}
          <p className="queue-tag">
            {submission.hanover_student ? 'Hanover student' : 'Non-Hanover'}
          </p>
          <p className="author-bio">{author.bio}</p>
        </div>
      ) : (
        <p className="empty">Author identity unavailable.</p>
      )}

      <div className="manuscript">
        <h2>Manuscript</h2>
        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="btn">
            Open manuscript file
          </a>
        ) : (
          <p className="empty">File unavailable.</p>
        )}
      </div>

      <div className="status-box">
        <h2>Status</h2>
        {status && isDecision(status) ? (
          <div className="decision-record">
            <span className={badgeClass(status)}>{status}</span>
            {decidedAt && (
              <span className="hint">
                {' '}
                decided {new Date(decidedAt).toLocaleDateString()}
              </span>
            )}
            <button type="button" className="btn btn-quiet" onClick={undoDecision}>
              Undo decision
            </button>
          </div>
        ) : (
          <div>
            <select
              className="status-select"
              value={status ?? ''}
              onChange={(e) => void save(e.target.value, false)}
            >
              {WORKFLOW_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.value}
                </option>
              ))}
            </select>
            {status && <span className={badgeClass(status)}>{status}</span>}
          </div>
        )}

        <h3>Decision</h3>
        <p className="hint">
          Stamps today’s date on the record. A decision is final until you undo
          it — the workflow dropdown is for moving work around, this is for
          settling it.
        </p>
        <div className="decision-buttons">
          {DECISION_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`btn decision-${s.tone}`}
              onClick={() => decide(s.value)}
              disabled={status === s.value}
            >
              {s.value}
            </button>
          ))}
        </div>
        {statusError && <p className="error">{statusError}</p>}

        {lettersReady && (
          <div className="letters-box">
            <h3>Letters to the author</h3>
            <p className="hint">
              A decision queues its letter; sending is a separate act, so an
              undo can still withdraw anything that has not gone out. Hold
              queues nothing.
            </p>

            {letters.length === 0 ? (
              <p className="empty">Nothing queued for this piece.</p>
            ) : (
              <ul className="letter-list">
                {letters.map((row) => {
                  const view = describeLetter(row)
                  return (
                    <li key={row.id}>
                      <span className="letter-kind">{kindLabel(row.kind)}</span>
                      <span className={`letter-state state-${view.tone}`}>
                        {view.label}
                      </span>
                      {row.sent_at && (
                        <span className="hint">
                          {new Date(row.sent_at).toLocaleDateString()}
                        </span>
                      )}
                      {row.status === 'failed' && row.last_error && (
                        <span className="hint warn">{row.last_error}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="letter-actions">
              <button
                type="button"
                className="btn btn-small"
                disabled={letterBusy || queuedLetters(letters).length === 0}
                onClick={() => void sendNow()}
              >
                Send now
              </button>
              <button
                type="button"
                className="btn btn-small btn-quiet"
                disabled={letterBusy}
                onClick={() => void showPreview()}
              >
                Preview
              </button>
            </div>

            {letterError && <p className="error">{letterError}</p>}
            {letterNote && <p className="hint">{letterNote}</p>}

            {preview && preview.length > 0 && (
              <div className="letter-preview">
                {preview.map((letter, i) => (
                  <article key={i}>
                    <p className="hint">
                      To {letter.to} · {letter.subject}
                    </p>
                    <pre>{letter.text}</pre>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isChief && (
        <div className="reading-box">
          <h2>Reading</h2>
          <p className="hint">
            Hand this piece to readers. Assigned work appears at the top of
            their queue; the rest of the blind queue stays visible below it, so
            a piece nobody was given still gets read.
          </p>

          {readingError && <p className="error">{readingError}</p>}

          {!readingLoaded ? (
            <p className="empty">Loading readers…</p>
          ) : assignees.length === 0 ? (
            <p className="empty">Nobody assigned yet.</p>
          ) : (
            <ul className="assignee-list">
              {assignees.map((a) => (
                <li key={a.reader_id}>
                  <span className="assignee-name">{a.name}</span>
                  {a.staffs.length > 0 && (
                    <span className="hint"> {staffNamesFor(a.staffs)}</span>
                  )}
                  <span className={`assignee-state state-${a.state}`}>
                    {assigneeLabel(a.state, a.score)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-small btn-quiet"
                    disabled={readingBusy}
                    onClick={() => {
                      const row = assignments.find(
                        (x) => x.reader_id === a.reader_id,
                      )
                      if (row) void unassign(row.id)
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="assign-controls">
            <select
              aria-label="Add a reader"
              value={pickReader}
              disabled={readingBusy || available.length === 0}
              onChange={(e) => setPickReader(e.target.value)}
            >
              <option value="">
                {available.length === 0
                  ? 'Everyone is already on it'
                  : 'Choose a reader…'}
              </option>
              {available.map((r) => (
                <option key={r.user_id} value={r.user_id}>
                  {r.name}
                  {r.staffs && r.staffs.length > 0
                    ? ` — ${staffNamesFor(r.staffs)}`
                    : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-small"
              disabled={readingBusy || pickReader === ''}
              onClick={() => void assign([pickReader])}
            >
              Assign
            </button>
          </div>

          {staffOptions.length > 0 && (
            <div className="assign-controls">
              <select
                aria-label="Add a whole staff"
                value={pickStaff}
                disabled={readingBusy}
                onChange={(e) => setPickStaff(e.target.value)}
              >
                <option value="">Choose a staff…</option>
                {staffOptions.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {staffLabel(s.slug)} — {s.count} not yet assigned
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-small"
                disabled={readingBusy || pickStaff === ''}
                onClick={() =>
                  void assign(
                    staffTargets(readers, assignments, pickStaff).map(
                      (r) => r.user_id,
                    ),
                  )
                }
              >
                Assign whole staff
              </button>
            </div>
          )}
        </div>
      )}

      <div className="ratings-box">
        <h2>Ratings</h2>
        {ratings.length === 0 ? (
          <p className="empty">No reader scores yet.</p>
        ) : (
          <>
            <p className="queue-tag">
              {(() => {
                const scored = ratings.filter(
                  (r) => !r.recused && r.score != null,
                )
                if (scored.length === 0) return 'No scores cast yet'
                const avg =
                  scored.reduce((sum, r) => sum + (r.score ?? 0), 0) /
                  scored.length
                return `${avg.toFixed(1)} / 5 average from ${scored.length} ${
                  scored.length === 1 ? 'reader' : 'readers'
                }`
              })()}
              {ratings.some((r) => r.recused) && (
                <>
                  {' · '}
                  {ratings.filter((r) => r.recused).length} recused
                </>
              )}
            </p>
            <ul className="audit-list">
              {ratings
                .filter((r) => r.notes.trim() !== '')
                .map((r, i) => (
                  <li key={i}>
                    {r.recused ? 'Recused reader' : 'Reader'} note:{' '}
                    {r.notes}{' '}
                    <span className="hint">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
            </ul>
            {ratings.every((r) => r.notes.trim() === '') && (
              <p className="hint">No written notes yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default EditorSubmissionPage