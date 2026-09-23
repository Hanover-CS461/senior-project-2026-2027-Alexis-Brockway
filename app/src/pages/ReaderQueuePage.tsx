import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fakeSubmissions } from '../data/submissions'

function ReaderQueuePage() {
  const [view, setView] = useState<'assigned' | 'shared'>('assigned')

  const submissions =
    view === 'assigned'
      ? fakeSubmissions.filter((s) => s.assignedToMe)
      : fakeSubmissions.filter((s) => !s.assignedToMe)

  return (
    <div className="page">
      <h1>Reader queue</h1>
      <p className="lede">
        Blind review — you see the title, genre, and manuscript. Never the
        author.
      </p>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${view === 'assigned' ? 'active' : ''}`}
          onClick={() => setView('assigned')}
        >
          Assigned to me
        </button>
        <button
          type="button"
          className={`tab ${view === 'shared' ? 'active' : ''}`}
          onClick={() => setView('shared')}
        >
          Shared pile
        </button>
      </div>

      {submissions.length === 0 ? (
        <p className="empty">Nothing here yet.</p>
      ) : (
        <ul className="queue-list">
          {submissions.map((s) => (
            <li key={s.id} className="queue-item">
              <Link to={`/reader/${s.id}`}>
                <div className="queue-item-top">
                  <h2>{s.title}</h2>
                  <span className={`badge badge-${s.status.toLowerCase().replace(' ', '-')}`}>
                    {s.status}
                  </span>
                </div>
                <p className="queue-genre">{s.genre}</p>
                <p className="queue-excerpt">{s.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ReaderQueuePage