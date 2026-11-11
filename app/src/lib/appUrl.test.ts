import { describe, expect, it } from 'vitest'
import { DEPLOYED_APP_URL, emailLinkTarget } from './appUrl'

describe('emailLinkTarget', () => {
  it('never produces a localhost link', () => {
    // The regression: links built from window.location.origin came back to
    // http://localhost:5173/ and died there.
    expect(emailLinkTarget()).not.toMatch(/localhost|127\.0\.0\.1/)
  })

  it('points at the app root, not a deep route', () => {
    // Deep links on Pages go through 404.html, and supabase-js reads the
    // recovery token before that shim runs.
    expect(emailLinkTarget()).toBe(DEPLOYED_APP_URL)
    expect(emailLinkTarget().endsWith('/app/')).toBe(true)
  })

  it('is an absolute https URL', () => {
    expect(emailLinkTarget()).toMatch(/^https:\/\//)
  })
})
