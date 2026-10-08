import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import MemberManager from '../components/MemberManager'

const statuses = ['All', 'Received', 'In review', 'Shortlist'] as const

interface QueueItem {
  id: string
  title: string
  genre: string
  status: string
  hanover_student: boolean
  author_name: string | null
  created_at: string
}

function EditorDashboardPage() {
  const [view, setView] = useState<'queue' | 'staff'>('queue')
  const [status, setStatus] = useState<(typeof statuses)[number]>('All')
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('id, title, genre, status, hanover_student, created_at')
        .order('created_at', { ascending: false })

      const { data: authors } = await supabase
        .from('authors')
        .select('submission_id, name')

      if (cancelled) return

      if (error) {
        setError(error.message)
        setItems([])
      } else {
        const nameBySubmission = new Map<string, string>()
        for (const a of authors ?? []) {
          nameBySubmission.set(a.submission_id, a.name)
        }
        setItems(
          (submissions ?? []).map((s) => ({
            ...s,
            author_name: nameBySubmission.get(s.id) ?? null,
          })),
        )
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered =
    status === 'All' ? items : items.filter((s) => s.status === status)

  return (
    <div className="page">
      <h1>Editor dashboard</h1>
      <p className="lede">
        Full view — author identity is visible here. Only the managing editor
        role can see this.
      </p>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${view === 'queue' ? 'active' : ''}`}
          onClick={() => setView('queue')}
        >
          Queue
        </button>
        <button
          type="button"
          className={`tab ${view === 'staff' ? 'active' : ''}`}
          onClick={() => setView('staff')}
        >
          Staff
        </button>
      </div>

      {view === 'staff' ? (
        <MemberManager />
      ) : (
        <>
          <div className="tabs">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                className={`tab ${status === s ? 'active' : ''}`}
                onClick={() => setStatus(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {error && <p className="error">{error}</p>}
          {loading ? (
            <p className="empty">Loading submissions…</p>
          ) : filtered.length === 0 ? (
            <p className="empty">Nothing here yet.</p>
          ) : (
            <ul className="queue-list">
              {filtered.map((s) => (
                <li key={s.id} className="queue-item">
                  <Link to={`/editor/${s.id}`}>
                    <div className="queue-item-top">
                      <h2>{s.title}</h2>
                      <span
                        className={`badge badge-${s.status.toLowerCase().replace(' ', '-')}`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="queue-genre">{s.genre}</p>
                    <p className="queue-author">
                      {s.author_name ?? 'Unknown author'}
                    </p>
                    <p className="queue-tag">
                      {s.hanover_student ? 'Hanover student' : 'Non-Hanover'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default EditorDashboardPage