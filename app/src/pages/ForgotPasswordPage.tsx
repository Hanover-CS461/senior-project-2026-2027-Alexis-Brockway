import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Step 1 of password recovery.
 *
 * The email link has to point at the app ROOT, not at /reset-password. On
 * GitHub Pages a deep link is served by 404.html, which stashes the URL and
 * bounces to the root — but supabase-js reads the recovery token when the
 * client is constructed, which happens while the page is still on the 404
 * fallback. A root landing keeps the #access_token fragment intact, the client
 * picks it up and emits PASSWORD_RECOVERY, and the router then shows the reset
 * form. See docs/404.html and main.tsx.
 */
function redirectTarget() {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectTarget(),
    })

    setBusy(false)

    if (error) {
      // 429 is the free-tier mailer rate limit, not a wrong address.
      setError(
        /rate|too many|429/i.test(error.message)
          ? 'Too many reset emails have gone out in the last hour. Wait a few minutes and try again.'
          : error.message,
      )
      return
    }

    // Deliberately says "if" — Supabase will not tell us whether the address
    // exists, and neither should this page. Saying so prevents using the form
    // to check who has an account.
    setSent(true)
  }

  return (
    <div className="page">
      <h1>Forgot your password?</h1>
      <p className="lede">
        Enter the email you signed up with and we'll send a link to set a new
        password. The link is good for one hour.
      </p>

      {sent ? (
        <>
          <p className="hint">
            If an account exists for <strong>{email.trim()}</strong>, a reset
            link is on its way. It can take a minute, and it often lands in spam
            — the club's mail comes from Supabase's shared sender.
          </p>
          <p className="hint">
            Still nothing after a few minutes? Ask the Chief Editor to send a
            reset from the Supabase dashboard (Authentication → Users → the
            account → Send recovery).
          </p>
        </>
      ) : (
        <form className="form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="back-link">
        <Link to="/login">← Back to sign in</Link>
      </p>
    </div>
  )
}

export default ForgotPasswordPage
