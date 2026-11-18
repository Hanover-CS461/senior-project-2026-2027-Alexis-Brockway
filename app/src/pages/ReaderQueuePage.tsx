import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { readerStatus } from '../lib/statuses'
import { splitReaderQueue } from '../lib/assignments'

interface QueueItem {
  id: string
  title: string
  genre: string
  status: string
  created_at: string
}

function ReaderQueuePage() {
  const { member } = useAuth()
  const [items, setItems] = useState<QueueItem[]>([])
  const [scored, setScored] = useState<Set<string>>(new Set())
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'todo' | 'done'>('todo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // Blind review: this select names every column except the author's.
      // There is no join to `authors` — readers have no policy on it, so even
      // a direct query would be refused by the database.
      const { data, error } = await supabase
        .from('submissions')
        .select('id, title, genre, status, created_at')
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setItems(data ?? [])

      if (member) {
        const { data: mine } = await supabase
          .from('ratings')
          .select('submission_id')
          .eq('reader_id', member.user_id)
        if (!cancelled) {
          setScored(new Set((mine ?? []).map((r) => r.submission_id as string)))
        }

        // Only the caller's own rows come back (RLS: "readers read own
        // assignments"), so this is the whole "assigned to you" set. It is a
        // highlight, not a fence: the rest of the queue is still below.
        const { data: given } = await supabase
          .from('assignments')
          .select('submission_id')
          .eq('reader_id', member.user_id)
        if (!cancelled) {
          setAssignedIds(
            new Set((given ?? []).map((a) => a.submission_id as string)),
          )
        }
      }

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [member])

  const { assigned, rest } = splitReaderQueue(items, assignedIds, scored)
  const done = items.filter((s) => scored.has(s.id))
  const toRead = assigned.length + rest.length

  const card = (s: QueueItem) => {
    const shown = readerStatus(s.status)
    return (
      <li key={s.id} className="queue-item">
        <Link to={`/reader/${s.id}`}>
          <div className="queue-item-top">
            <h2>{s.title}</h2>
            <span className={shown.badge}>{shown.label}</span>
          </div>
          <p className="queue-genre">{s.genre}</p>
          <p className="queue-excerpt">
            Received {new Date(s.created_at).toLocaleDateString()}
          </p>
        </Link>
      </li>
    )
  }

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
          className={`tab ${view === 'todo' ? 'active' : ''}`}
          onClick={() => setView('todo')}
        >
          To read ({toRead})
        </button>
        <button
          type="button"
          className={`tab ${view === 'done' ? 'active' : ''}`}
          onClick={() => setView('done')}
        >
          Scored ({done.length})
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">Loading queue…</p>
      ) : view === 'done' ? (
        done.length === 0 ? (
          <p className="empty">You haven't scored anything yet.</p>
        ) : (
          <ul className="queue-list">{done.map(card)}</ul>
        )
      ) : (
        <>
          {assigned.length > 0 && (
            <section className="assigned-box">
              <h2>Assigned to you</h2>
              <p className="hint">An editor asked you to read these.</p>
              <ul className="queue-list">{assigned.map(card)}</ul>
            </section>
          )}

          {rest.length > 0 ? (
            <>
              {assigned.length > 0 && (
                <h2 className="queue-section-title">The whole queue</h2>
              )}
              <ul className="queue-list">{rest.map(card)}</ul>
            </>
          ) : assigned.length === 0 ? (
            <p className="empty">
              Nothing left to read — everything in the queue has a score from
              you.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

export default ReaderQueuePage
