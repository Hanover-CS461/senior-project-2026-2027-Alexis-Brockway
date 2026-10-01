---
title: Part 6 — Review, practice, and go further
---

# Part 6 — Review, practice, and go further

> **Prev:** [Part 5 — The editor view](05-editor-view-signed-urls.html) · **Next:** [Start over](index.html)

## What you built

One running app, five moving parts — each one a real Supabase concept:

| Piece of the app | Supabase concept | Where you built it |
|---|---|---|
| Project + keys | Hosted Postgres, Auth, Storage; `anon` vs `service_role` | [Part 1](01-setup.html) |
| `submissions` / `authors` tables | Modeling sensitive data separately | [Part 2](02-database-and-rls.html) |
| No `SELECT` for readers on authors | Row-level security policies | [Part 2](02-database-and-rls.html) |
| Client-generated ids | The insert-without-read-back gotcha | [Parts 2–3](03-public-submission-form.html) |
| Private manuscript bucket | Storage + policy per role | [Part 2](02-database-and-rls.html) |
| First sign-up = Chief Editor | `security definer` + policy | [Part 4](04-authentication-and-roles.html) |
| Editors read authors | Policy gated on `is_editor()` | [Part 5](05-editor-view-signed-urls.html) |
| Manuscript downloads | Signed URLs | [Part 5](05-editor-view-signed-urls.html) |

## How the security holds together

Walk through the three people who can reach your app, and what the database
lets each of them do:

- **An outsider (`anon`):** can insert a submission, insert their own author
  row, and upload a file. Can read *nothing* — not even the row they just
  inserted.
- **A Reader (`authenticated`):** can read submissions and manuscript files,
  and their own membership row. Runs `select * from authors` and gets an empty
  array, forever.
- **The Chief Editor:** everything a Reader can do, plus reading `authors` and
  downloading manuscripts through signed URLs.

The key habit to take away: **always test from the weakest role.** If a feature
"works" when you're signed in as the boss, that doesn't mean it's safe — sign
in as the lowliest user and try the same thing. That's the test that catches
real vulnerabilities.

## Practice exercises

These go beyond what the tutorial walked you through. Each one lists a goal,
hints, and links to the docs you'll need. Try them in order.

### Exercise 1 — Private reader notes

**Goal:** let each Reader attach a private note to any submission, readable
only by that Reader.

**What to do:**

1. Create a `notes` table: `submission_id`, `user_id`, `body`, `created_at`.
2. Enable RLS and write two policies using `auth.uid()`:
   - a Reader can insert a note where `user_id = auth.uid()`,
   - a Reader can read only notes where `user_id = auth.uid()`.
3. Build a small UI on the reader page that inserts and lists the signed-in
   user's notes.

**Hints:** the policies will look very much like the "own row" pattern in
[Part 4](04-authentication-and-roles.html). Read the RLS guide section on
[`auth.uid()` and helper functions](https://supabase.com/docs/guides/database/postgres/row-level-security#helper-functions),
and the reference for
[inserting rows](https://supabase.com/docs/reference/javascript/insert).

### Exercise 2 — Editors can change a submission's status

**Goal:** let the Chief Editor move a submission from `Received` to `In
review`, while Readers cannot.

**What to do:**

1. Write an `UPDATE` policy on `submissions` gated on `public.is_editor()`.
2. In `EditorPage`, replace the status `<td>` with a `<select>` that writes
   the new status with `supabase.from("submissions").update({ status }).eq("id", sub.id)`.
3. Verify: as the Reader, the update returns no error but changes nothing.

**Hints:** an UPDATE policy needs both `using` (which rows may be updated) and
`with check` (what the result may look like). See the RLS guide's
[policy-writing section](https://supabase.com/docs/guides/database/postgres/row-level-security#write-a-policy-for-each-operation)
and the [update reference](https://supabase.com/docs/reference/javascript/update).

### Exercise 3 — Production hardening

**Goal:** close the two biggest "this would be fine in production" gaps.

**What to do:**

1. Turn email confirmation back on in **Authentication → Providers → Email**
   and confirm your test users with the SQL one-liner from
   [Part 4](04-authentication-and-roles.html#1-turn-on-email-authentication).
2. Revoke the default table grants so `anon` can only do exactly what your
   policies allow. The RLS guide's
   [grants section](https://supabase.com/docs/guides/database/postgres/row-level-security#enable-rls-and-set-the-grants)
   shows the `revoke all ... from anon, authenticated` pattern.
3. Re-run the whole tutorial from scratch against a brand-new project and see
   how much you remember without the page open.

## See also

Official documentation, linked inline where each topic first appeared:

- [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) —
  the whole mental model, including
  [how policies work](https://supabase.com/docs/guides/database/postgres/row-level-security#understand-row-level-security),
  [grants](https://supabase.com/docs/guides/database/postgres/row-level-security#enable-rls-and-set-the-grants),
  and [security definer functions](https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions).
- [Supabase Auth](https://supabase.com/docs/guides/auth) — overview, plus
  [email + password](https://supabase.com/docs/guides/auth/passwords) and
  [sessions](https://supabase.com/docs/guides/auth/sessions).
- [Supabase JS reference](https://supabase.com/docs/reference/javascript/introduction) —
  [`signUp`](https://supabase.com/docs/reference/javascript/auth-signup),
  [`onAuthStateChange`](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
  [`insert`](https://supabase.com/docs/reference/javascript/insert),
  [`select`](https://supabase.com/docs/reference/javascript/select), and
  [`update`](https://supabase.com/docs/reference/javascript/update).
- [Storage: serving assets](https://supabase.com/docs/guides/storage/serving/downloads) —
  see [signing URLs](https://supabase.com/docs/guides/storage/serving/downloads#signing-urls)
  and [bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals).
- [Vite: env variables and modes](https://vite.dev/guide/env-and-mode#env-variables) —
  why values must use the `VITE_` prefix.
- [Postgres: CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) —
  the raw SQL reference under Supabase's hood.
- [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys) —
  `anon` vs `service_role`, and what must never reach a browser.

## Where this tutorial came from

This tutorial is the simplified version of a real system: a submission manager
for a college literary magazine, where blind review is enforced by exactly the
schema and policies you built here. If you're curious how the pieces fit into a
larger project — decision letters, reader assignments, metadata stripping — the
full design is described in the
[project proposal](https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/proposal.html).

## You're done

You set up Supabase, designed a schema where identity is structurally
separated, enforced that separation with RLS, added role bootstrap via
`security definer`, and shipped private manuscript downloads through signed
URLs. The database is now the enforcer of your editorial policy — exactly where
it belongs.

---

**Prev:** [Part 5 — The editor view](05-editor-view-signed-urls.html) · **Next:** [Start over at the beginning](index.html)