import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { getSubmission } from '../data/submissions'
import { manuscriptSamples } from '../data/manuscripts'

function ReaderSubmissionPage() {
  const { submissionId } = useParams()
  const submission = submissionId ? getSubmission(submissionId) : undefined

  const [note, setNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [score, setScore] = useState(0)
  const [knowsAuthor, setKnowsAuthor] = useState(false)

  if (!submission) {
    return <Navigate to="/reader" replace />
  }

  const saveNote = () => {
    setSavedNote(note)
  }

  const canScore = !knowsAuthor

  const pickScore = (n: number) => {
    if (!canScore) return
    setScore(n)
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
        {manuscriptSamples[submission.id]?.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      <div className="notes-box">
        <h2>Your notes</h2>
        <textarea
          rows={4}
          placeholder="Private note — only the editor team can see this"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="notes-actions">
          <button type="button" className="btn" onClick={saveNote}>
            Save note
          </button>
          {savedNote && <span className="saved-note">Note saved</span>}
        </div>
      </div>

      <div className="score-box">
        <h2>Score</h2>
        <label className="checkbox blind-check">
          <input
            type="checkbox"
            checked={knowsAuthor}
            onChange={(e) => setKnowsAuthor(e.target.checked)}
          />
          I know the author — lock my vote
        </label>
        <div className="score-options">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`score-btn ${score === n ? 'active' : ''}`}
              disabled={!canScore}
              onClick={() => pickScore(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {knowsAuthor ? (
          <p className="hint">
            Vote locked — you know the author, so your score is recused to keep
            the review blind.
          </p>
        ) : score > 0 ? (
          <p className="saved-note">Scored {score}/5</p>
        ) : (
          <p className="hint">Score this piece 1–5.</p>
        )}
      </div>
    </div>
  )
}

export default ReaderSubmissionPage