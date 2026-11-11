import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { isEditorRole } from '../lib/roles'

// Matches minimum_password_length in app/supabase/config.toml. Checking it here
// turns a server error into a sentence next to the field.
const MIN_LENGTH = 6

/**
 * Step 2 of password recovery, and also a plain "change my password" page for
 * anyone already signed in.
 *
 * Arriving from the email means supabase-js has already exchanged the token for
 * a session, so `session` is set. Arriving with no session means the link was
 * already used or has expired.
 */
function ResetPasswordPage() {
  const { session, loading, member, acknowledgeRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('The two passwords do not match.')
      return
    }

    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)

    if (error) {
      setError(error.message)
      return
    }

    acknowledgeRecovery()
    setDone(true)
  }

  if (loading) {
    return <p className="page empty">Checking your link…</p>
  }

  if (!session) {
    return (
      <div className="page">
        <h1>That link has expired</h1>
        <p className="lede">
          Reset links are good for one hour and work only once. Request a fresh
          one and it will take you straight here.
        </p>
        <p className="back-link">
          <Link to="/forgot-password">Send a new reset link</Link>
        </p>
      </div>
    )
  }

  if (done) {
    return (
      <Navigate
        to={isEditorRole(member?.role) ? '/editor' : '/reader'}
        replace
      />
    )
  }

  return (
    <div className="page">
      <h1>Set a new password</h1>
      <p className="lede">
        Signed in as {session.user.email}. Choose something you'll remember — six
        characters or more.
      </p>

      <form className="form" onSubmit={onSubmit}>
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Repeat it
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>

      <p className="back-link">
        <Link to="/login">← Back to sign in</Link>
      </p>
    </div>
  )
}

export default ResetPasswordPage
