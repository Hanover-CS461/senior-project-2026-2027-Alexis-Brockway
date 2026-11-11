/**
 * Reading the URL fragment when an auth link fails.
 *
 * A broken password-reset link arrives back at the app as
 *   #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
 * supabase-js does not turn that into an auth event — there is no session to
 * create — so without this the visitor simply lands on the home page and the
 * link appears to do nothing at all.
 *
 * Kept as pure functions so the parsing is testable without a browser.
 */

/** Returns the error text carried by a URL fragment, or null if there isn't one. */
export function parseAuthLinkError(hash: string): string | null {
  if (!hash) return null
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  if (!params.has('error')) return null
  return (
    params.get('error_description') ??
    params.get('error_code') ??
    params.get('error')
  )
}

/** Turns Supabase's terse description into something a member can act on. */
export function friendlyAuthLinkError(raw: string): string {
  const text = raw.replace(/\+/g, ' ').trim()
  if (/expired/i.test(text)) {
    return 'That link has expired, or it was already used. Reset links work once and last an hour.'
  }
  if (/invalid/i.test(text)) {
    return 'That link is not valid. It may have been used already, or cut short by the email.'
  }
  if (/access_denied|denied/i.test(text)) {
    return 'That link was refused.'
  }
  return text || 'That link did not work.'
}
