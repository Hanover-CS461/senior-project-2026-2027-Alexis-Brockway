import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { getSubmission } from '../data/submissions'

const manuscriptSamples: Record<string, string> = {
  'sub-1':
    'The ferry left at dusk, and with it went every plan the two of them had spent the summer building. On the far shore the town lights blinked once, twice, and then went dark for good.\n\nShe had not meant to let the argument end the way it did, with his coat still on the hook and the kettle still warm. But words, once released over water, do not come back on the same boat.\n\nBy the time the last bell rang across the bay, the sky had gone the color of old bruises. He would not return until the river froze, and by then it would be too late to say any of it properly.',
  'sub-2':
    'You swallow the grease of a thousand suppers\nand ask for nothing but water,\na little salt, and to be left alone.\n\nYour rack is a grammar of leftover plates,\neach bowl a sentence no one finished.\n\nI think about you when I cannot sleep,\nthe way you take everything in\nand give back only steam.',
  'sub-3':
    'Every October my family paid five dollars to get lost on purpose. The maze was a kindness: it gave us somewhere to be wrong together without having to admit it.\n\nMy father held the map upside down. My mother laughed. I, at twelve, believed I could navigate by the stars even though the stalks rose higher than our heads.\n\nWe never did find the center. That was not the point. The point was the sound of us, calling out to one another through the green walls, always near and never quite found.',
  'sub-4':
    'My grandmother kept her wedding cups\nin a cabinet that smelled of cedar\nand never let them touch.\n\nShe said porcelain remembers everything:\nthe lip of the groom,\nthe minister\u2019s cough,\nthe cold morning the cups were packed.\n\nI have them now. They do not rattle.\nThey simply wait,\nas she waited,\nfor a hand steady enough to hold them.',
  'sub-5':
    'Three photographs of the suspension bridge after midnight, shot on 35mm film. The first frames the cables against a clear sky, the second catches a single car\u2019s lights mid-crossing, the third is nearly black — just the two towers and the river holding the reflection of nothing.',
  'sub-6':
    'First, wait until you are sure no one will answer. That is the whole trick — the call matters only in the space where it will not be returned.\n\nState your name. State the date, as if either of you has a calendar that matters. Do not ask a question. Questions are for people who expect replies.\n\nWhen the beep comes, you have exactly ninety seconds to say everything you rehearsed for a week. You will use fourteen of them on the word \u201cso.\u201d',
}

function ReaderSubmissionPage() {
  const { submissionId } = useParams()
  const submission = submissionId ? getSubmission(submissionId) : undefined

  const [note, setNote] = useState('')
  const [savedNote, setSavedNote] = useState('')
  const [score, setScore] = useState(0)

  if (!submission) {
    return <Navigate to="/reader" replace />
  }

  const saveNote = () => {
    setSavedNote(note)
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
        <div className="score-options">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`score-btn ${score === n ? 'active' : ''}`}
              onClick={() => setScore(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {score > 0 && <p className="saved-note">Scored {score}/5</p>}
      </div>
    </div>
  )
}

export default ReaderSubmissionPage