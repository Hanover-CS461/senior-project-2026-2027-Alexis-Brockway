import { describe, expect, it } from 'vitest'
import { friendlyAuthLinkError, parseAuthLinkError } from './authLink'

describe('parseAuthLinkError', () => {
  it('ignores an ordinary URL', () => {
    expect(parseAuthLinkError('')).toBeNull()
    expect(parseAuthLinkError('#')).toBeNull()
    expect(parseAuthLinkError('#access_token=abc&type=recovery')).toBeNull()
  })

  it('finds the description in a failed recovery link', () => {
    const hash =
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    // URLSearchParams has already turned the + signs into spaces.
    expect(parseAuthLinkError(hash)).toBe('Email link is invalid or has expired')
  })

  it('falls back to the code, then the error itself', () => {
    expect(parseAuthLinkError('#error=access_denied&error_code=otp_expired')).toBe(
      'otp_expired',
    )
    expect(parseAuthLinkError('#error=server_error')).toBe('server_error')
  })
})

describe('friendlyAuthLinkError', () => {
  it('turns an expired token into plain language', () => {
    const message = friendlyAuthLinkError('Email+link+is+invalid+or+has+expired')
    expect(message).toContain('expired, or it was already used')
    expect(message).not.toContain('+')
  })

  it('explains an invalid link', () => {
    expect(friendlyAuthLinkError('Invalid+link')).toContain('not valid')
  })

  it('explains a refusal', () => {
    expect(friendlyAuthLinkError('access_denied')).toContain('refused')
  })

  it('never renders an empty message', () => {
    expect(friendlyAuthLinkError('')).toBe('That link did not work.')
  })
})
