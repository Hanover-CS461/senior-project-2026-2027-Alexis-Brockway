import { describe, expect, it } from 'vitest'

// API-level proof of the authenticated half of the blind-review boundary:
// a signed-in Reader must still be unable to read author identity, while the
// Chief Editor can. This talks to the Supabase Auth + PostgREST endpoints
// directly and only READS, so it never mutates the project.
//
// Credentials come from app/.env.test (see .env.test.example). If they are not
// set, the whole suite is skipped.

const url = process.env.TEST_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
const anonKey =
  process.env.TEST_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY

const readerEmail = process.env.TEST_READER_EMAIL
const readerPassword = process.env.TEST_READER_PASSWORD
const chiefEmail = process.env.TEST_CHIEF_EMAIL
const chiefPassword = process.env.TEST_CHIEF_PASSWORD

const hasCreds = Boolean(
  url && anonKey && readerEmail && readerPassword && chiefEmail && chiefPassword,
)
const suite = hasCreds ? describe : describe.skip

const headers = {
  apikey: anonKey as string,
  'Content-Type': 'application/json',
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error(
      `Could not sign in as ${email} (HTTP ${res.status}): ${await res.text()}`,
    )
  }
  const body = (await res.json()) as { access_token: string }
  return body.access_token
}

function rest(path: string, token: string) {
  return fetch(`${url}/rest/v1/${path}`, {
    headers: { ...headers, Authorization: `Bearer ${token}` },
  })
}

function rpc(fn: string, token: string) {
  return fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...headers, Authorization: `Bearer ${token}` },
    body: '{}',
  })
}

suite('RLS boundary: authenticated staff (read-only)', () => {
  it('a reader is blind to authors and is not an editor', async () => {
    const token = await signIn(readerEmail!, readerPassword!)

    expect(await rpc('is_editor', token).then((r) => r.json())).toBe(false)

    const authors = await rest('authors?select=name', token).then((r) => r.json())
    expect(authors).toEqual([])
  })

  it('a reader can only see their own membership row', async () => {
    const token = await signIn(readerEmail!, readerPassword!)
    const members = await rest('members?select=user_id', token).then((r) =>
      r.json(),
    )
    expect(members).toHaveLength(1)
  })

  it('the chief editor is unblinded and sees every member', async () => {
    const token = await signIn(chiefEmail!, chiefPassword!)

    expect(await rpc('is_editor', token).then((r) => r.json())).toBe(true)

    const res = await rest('members?select=user_id', token)
    expect(res.status).toBe(200)
    const members = (await res.json()) as unknown[]
    expect(members.length).toBeGreaterThanOrEqual(1)
  })
})
