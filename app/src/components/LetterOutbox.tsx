import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { describeLetter, isQueued, kindLabel, type OutboxRow } from '../lib/outbox'
import {
  cancelLetter,
  loadQueue,
  sendLetters,
  type PreviewLetter,
} from '../lib/emailOutbox'

/**
 * The letters waiting to go out (issue #8).
 *
 * Everything here is deliberately a second act: a decision has already been
 * recorded on the submission page, and this is where an editor chooses to
 * send. Sent letters are not listed — the queue is for what is still owed, and
 * each piece shows its own history on its own page.
 */
function LetterOutbox() {
  const [rows, setRows] = useState<OutboxRow[]>([])
  const [titles, setTitles] = useState<Map<string, string>>(new Map())
  const [ready, setReady] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewLetter[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const all = await loadQueue()
      const owed = all.filter((r) => r.status !== 'sent')
      setRows(owed)
      setReady(true)

      const ids = [...new Set(owed.map((r) => r.submission_id))]
      if (ids.length > 0) {
        const { data } = await supabase
          .from('submissions')
          .select('id, title')
          .in('id', ids)
        setTitles(new Map((data ?? []).map((s) => [s.id, s.title])))
      }
    } catch {
      // Table not pasted yet: say so plainly instead of showing a red error.
      setReady(false)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const waiting = rows.filter(isQueued)

  const sendAll = async () => {
    const ok = window.confirm(
      `Send ${waiting.length} letter${waiting.length === 1 ? '' : 's'} now?\n\n` +
        'This emails every writer waiting above. It cannot be unsent.',
    )
    if (!ok) return

    setBusy(true)
    setError(null)
    setNote(null)
    const { result, error } = await sendLetters()
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    setNote(
      `Sent ${result?.sent ?? 0}, failed ${result?.failed ?? 0}, ` +
        `skipped ${result?.skipped ?? 0}.`,
    )
    await load()
  }

  const previewAll = async () => {
    setBusy(true)
    setError(null)
    setNote(null)
    const { result, error } = await sendLetters({ dryRun: true })
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    setPreview(result?.letters ?? [])
  }

  const cancel = async (row: OutboxRow) => {
    const ok = window.confirm(
      `Withdraw the ${kindLabel(row.kind).toLowerCase()} for “${
        titles.get(row.submission_id) ?? 'this piece'
      }”?\n\nThe author is not emailed.`,
    )
    if (!ok) return
    setBusy(true)
    setError(null)
    const failure = await cancelLetter(row.id)
    setBusy(false)
    if (failure) {
      setError(failure)
      return
    }
    await load()
  }

  if (!ready) {
    return (
      <div className="letters-page">
        <h2>Letters</h2>
        <p className="empty">
          The letter queue is not set up yet. Paste
          <code> 20261120000000_email_outbox.sql </code>
          into the Supabase SQL editor, then reload.
        </p>
      </div>
    )
  }

  return (
    <div className="letters-page">
      <h2>Letters</h2>
      <p className="lede">
        Decisions queue a letter; nothing is emailed until you send here. Every
        writer who is owed a word is on this list.
      </p>

      {error && <p className="error">{error}</p>}
      {note && <p className="hint">{note}</p>}

      {loading ? (
        <p className="empty">Loading the queue…</p>
      ) : rows.length === 0 ? (
        <p className="empty">Nothing waiting to go out.</p>
      ) : (
        <ul className="letter-list letter-queue-list">
          {rows.map((row) => {
            const view = describeLetter(row)
            return (
              <li key={row.id}>
                <span className="letter-kind">
                  <Link to={`/editor/${row.submission_id}`}>
                    {titles.get(row.submission_id) ?? 'A submission'}
                  </Link>{' '}
                  — {kindLabel(row.kind)}
                </span>
                <span className={`letter-state state-${view.tone}`}>
                  {view.label}
                </span>
                <span className="hint">
                  queued {new Date(row.queued_at).toLocaleDateString()}
                </span>
                {row.last_error && (
                  <span className="hint warn">{row.last_error}</span>
                )}
                {isQueued(row) && (
                  <button
                    type="button"
                    className="btn btn-small btn-quiet"
                    disabled={busy}
                    onClick={() => void cancel(row)}
                  >
                    Withdraw
                  </button>
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
          disabled={busy || waiting.length === 0}
          onClick={() => void sendAll()}
        >
          Send {waiting.length} letter{waiting.length === 1 ? '' : 's'}
        </button>
        <button
          type="button"
          className="btn btn-small btn-quiet"
          disabled={busy}
          onClick={() => void previewAll()}
        >
          Preview
        </button>
      </div>

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
  )
}

export default LetterOutbox
