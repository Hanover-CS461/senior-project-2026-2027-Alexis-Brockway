import { describe, expect, it } from 'vitest'

// These tests talk to the LIVE Supabase project using the public anon key.
// They are read-only (they never insert or update), so they are safe to run
// against production. Their job is to pin the security boundary: an anonymous
// visitor must never be able to read author identity.
//
// We call the PostgREST API directly with fetch instead of the supabase-js
// client, because the client needs native WebSockets (Node 22+) even for
// simple REST reads.
//
// If the env vars are missing (e.g. a fresh checkout without app/.env), the
// suite is skipped instead of failing.

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasEnv = Boolean(url && anonKey)
const suite = hasEnv ? describe : describe.skip

function anonFetch(path: string, init?: RequestInit) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey as string,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}

suite('RLS boundary: anonymous visitor (read-only)', () => {
  it('cannot read submissions', async () => {
    const res = await anonFetch('submissions?select=id&limit=1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('cannot read authors (blind review holds)', async () => {
    const res = await anonFetch('authors?select=name&limit=1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('cannot read the members table', async () => {
    const res = await anonFetch('members?select=role&limit=1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('is not recognised as an editor', async () => {
    const res = await anonFetch('rpc/is_editor', { method: 'POST', body: '{}' })
    expect(res.status).toBe(200)
    expect(await res.json()).toBe(false)
  })
})
