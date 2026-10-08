import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

type Mode = 'signin' | 'signup'

function LoginPage() {
  const { session } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (session) {
    return <Navigate to="/editor" replace />
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
    if (error) {
      setError(error.message)
      return
    }
    navigate('/editor')
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
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {mode === 'signup' && (
          <p className="hint">
            The first person to create an account automatically becomes Chief
            Editor. Everyone after joins as a Reader.
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
      <p className="back-link">
        <Link to="/">← Back to home</Link>
      </p>
    </div>
  )
}

export default LoginPage