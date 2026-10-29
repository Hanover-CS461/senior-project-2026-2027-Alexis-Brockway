import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const statuses = ['Received', 'In review', 'Shortlist'] as const

interface Submission {
  id: string
  title: string
  genre: string
  status: string
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
        .select('id, title, genre, status, hanover_student, manuscript_path')
        .eq('id', submissionId)
        .maybeSingle()
      if (cancelled) return
      if (!sub) {
        setMissing(true)
        return
      }
      setSubmission(sub)
      setStatus(sub.status)

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

  const updateStatus = async (next: string) => {
    if (!submissionId) return
    const previous = status
    setStatus(next)
    const { error } = await supabase
      .from('submissions')
      .update({ status: next })
      .eq('id', submissionId)
    if (error) setStatus(previous)
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
        <select
          className="status-select"
          value={status ?? ''}
          onChange={(e) => updateStatus(e.target.value)}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {status && (
          <span className={`badge badge-${status.toLowerCase().replace(' ', '-')}`}>
            {status}
          </span>
        )}
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