import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  DECISION_STATUSES,
  WORKFLOW_STATUSES,
  badgeClass,
  isDecision,
} from '../lib/statuses'

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
  score: number | null
  notes: string
  recused: boolean
  created_at: string
}

function EditorSubmissionPage() {
  const { submissionId } = useParams()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [author, setAuthor] = useState<Author | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [decidedAt, setDecidedAt] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [ratings, setRatings] = useState<RatingRow[]>([])
  const [missing, setMissing] = useState(false)

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
        .select('score, notes, recused, created_at')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true })
      if (!cancelled) setRatings(ratingRows ?? [])
    }

    load()
    return () => {
      cancelled = true
    }
  }, [submissionId])

  // One writer for both halves of the workflow. `decided_at` and `status` must
  // move together: the database refuses a decision without a timestamp, and a
  // timestamp on a workflow state, so a partial update is rejected rather than
  // silently leaving an inconsistent row.
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
    }
  }

  const decide = (next: string) => {
    if (!submission) return
    const ok = window.confirm(
      `Record “${next}” for “${submission.title}”?\n\n` +
        'The decision is stamped with today’s date. You can undo it from this page.',
    )
    if (ok) void save(next, true)
  }

  const undoDecision = () => {
    const ok = window.confirm(
      'Send this back to Shortlist and clear the decision?',
    )
    if (ok) void save('Shortlist', false)
  }

  if (missing) {
    return <Navigate to="/editor" replace />
  }

  if (!submission) {
    return <p className="page empty">Loading…</p>
  }

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
      </div>

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