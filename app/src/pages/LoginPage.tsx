import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { landingFor } from '../lib/roles'
import { DEMO_ACCESS_ENABLED } from '../lib/demoMode'
import PasswordField from '../components/PasswordField'
import DemoAccessBox from '../components/DemoAccessBox'

type Mode = 'signin' | 'signup'

function LoginPage() {
  const { session, member, memberLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Signing in never navigates directly: a successful sign-in creates a
  // session, and the redirect below routes by role. That keeps one rule in one
  // place, so a Reader cannot be sent to /editor by a stale call site.
  if (session) {
    if (memberLoading) {
      return <p className="page empty">Loading your account…</p>
    }
    return <Navigate to={landingFor(member?.role ?? null)} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      setMode('signin')
      setMessage('Account created — now sign in below.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  // One-click sign-in for the published demo accounts. This page never sees the
  // credentials: DemoAccessBox owns them, and it disappears from a live build
  // (see lib/demoMode.ts).
  const signInAs = async (accountEmail: string, accountPassword: string) => {
    setError(null)
    setMessage(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: accountEmail,
      password: accountPassword,
    })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div className="page">
      <h1>Staff sign in</h1>
      <p className="lede">
        Readers and editors sign in here. Writers who submit work don't need an
        account.
      </p>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => setMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => setMode('signup')}
        >
          Create account
        </button>
      </div>

      <form className="form" onSubmit={onSubmit}>
        {mode === 'signup' && (
          <label>
            Your name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
        {mode === 'signup' && (
          <p className="hint">
            New accounts join as a Reader. A Chief Editor can raise anyone's role
            from the Staff tab.
          </p>
        )}
        {error && <p className="error">{error}</p>}
        {message && <p className="hint">{message}</p>}
        <button type="submit" className="btn" disabled={loading}>
          {loading
            ? 'Please wait…'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>
      {mode === 'signin' && (
        <p className="back-link">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      )}

      {mode === 'signin' && DEMO_ACCESS_ENABLED && (
        <DemoAccessBox onPick={signInAs} disabled={loading} />
      )}

      <p className="back-link">
        <Link to="/">← Back to home</Link>
      </p>
    </div>
  )
}

export default LoginPage
