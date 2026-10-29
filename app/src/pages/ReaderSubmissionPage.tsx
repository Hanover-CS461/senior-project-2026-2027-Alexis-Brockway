import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

interface Submission {
  id: string
  title: string
  genre: string
  status: string
  manuscript_path: string
}

function ReaderSubmissionPage() {
  const { submissionId } = useParams()
  const { member } = useAuth()

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(true)

  const [note, setNote] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [recused, setRecused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!submissionId) {
      setMissing(true)
      return
    }
    let cancelled = false

    const load = async () => {
      // No join to `authors`: readers have no policy on that table, so the
      // database itself refuses to reveal who wrote this.
      const { data: sub } = await supabase
        .from('submissions')
        .select('id, title, genre, status, manuscript_path')
        .eq('id', submissionId)
        .maybeSingle()

      if (cancelled) return
      if (!sub) {
        setMissing(true)
        setLoading(false)
        return
      }
      setSubmission(sub)

      const { data: signed } = await supabase.storage
        .from('manuscripts')
        .createSignedUrl(sub.manuscript_path, 3600)
      if (!cancelled) setFileUrl(signed?.signedUrl ?? null)

      if (member) {
        const { data: existing } = await supabase
          .from('ratings')
          .select('score, notes, recused')
          .eq('submission_id', submissionId)
          .eq('reader_id', member.user_id)
          .maybeSingle()
        if (!cancelled && existing) {
          setNote(existing.notes ?? '')
          setScore(existing.score ?? null)
          setRecused(Boolean(existing.recused))
        }
      }

      if (!cancelled) setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [submissionId, member])

  const save = async () => {
    if (!member || !submissionId) return
    setSaving(true)
    setError(null)
    setSaved(false)

    const { error } = await supabase.from('ratings').upsert(
      {
        submission_id: submissionId,
        reader_id: member.user_id,
        // A recused reader keeps their note but casts no score.
        score: recused ? null : score,
        notes: note,
        recused,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id,reader_id' },
    )

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSaved(true)
  }

  if (missing) {
    return <Navigate to="/reader" replace />
  }

  if (loading || !submission) {
    return <p className="page empty">Loading…</p>
  }

  return (
    <div className="page">
      <p className="back-link">
        <Link to="/reader">← Back to reader queue</Link>
      </p>

      <h1>{submission.title}</h1>
      <p className="queue-genre">
        {submission.genre} · {submission.status}
      </p>

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

      <div className="notes-box">
        <h2>Your notes</h2>
        <textarea
          rows={4}
          placeholder="Private note — only the editor team can see this"
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setSaved(false)
          }}
        />
      </div>

      <div className="score-box">
        <h2>Score</h2>
        <label className="checkbox blind-check">
          <input
            type="checkbox"
            checked={recused}
            onChange={(e) => {
              setRecused(e.target.checked)
              setSaved(false)
            }}
          />
          I know the author — lock my vote
        </label>
        <div className="score-options">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`score-btn ${score === n ? 'active' : ''}`}
              disabled={recused}
              onClick={() => {
                setScore(n)
                setSaved(false)
              }}
            >
              {n}
            </button>
          ))}
        </div>
        {recused ? (
          <p className="hint">
            Vote locked — you know the author, so your score is recused to keep
            the review blind. Editors still see your note.
          </p>
        ) : score ? (
          <p className="saved-note">Scored {score}/5</p>
        ) : (
          <p className="hint">Score this piece 1–5.</p>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="notes-actions">
        <button type="button" className="btn" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save review'}
        </button>
        {saved && <span className="saved-note">Saved</span>}
      </div>
    </div>
  )
}

export default ReaderSubmissionPage
