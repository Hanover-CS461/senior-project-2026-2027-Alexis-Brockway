# History — how the project got here

Archive for `AGENTS.md`. Nothing here is a current instruction; it is the record of
what was built, what was verified, and what went wrong on the way. **Newest first.**

Two rules for keeping this useful:

1. **This is where session narratives go.** When a day's work needs more than a line
   in `AGENTS.md`, it lands here (or in `STATUS.md`, which is the dated human log).
   `AGENTS.md` gets at most a one-line pointer, so the file an agent reads on every
   turn stays small.
2. **Keep the evidence.** "Verified 14/14 on the deployed URL" is worth keeping;
   "works now" is not.

---

## Nov 19, 2026 — deadline verification pass, and #5's policy proof

**The full pass, read-only, on the deployed app:** `npm test` 112/112 ·
`npm run test:e2e` 19/19 · lint and `tsc -b` clean · site, `/app/` and `/tutorial/`
all 200 · both auth probes land on the Pages app · keep-alive green (Nov 16) · a
19-check Playwright walkthrough of the **deployed** URL (Chief: Staff tab, chips,
Reading panel, deep link; Reader: *Assigned to you*, the whole queue, no author
name, scoring controls, editor door) with no console errors beyond the fallback's
own 404. `VITE_DEMO_MODE=false npm run build` still greps **0** matches for the
demo credentials.

**#5's missing half was closed by the user, in SQL, and proved.** The
`pg_policies` read showed the old policy (no `active = false`), so the migration
was pasted and the one-boolean check then returned `true`:

```sql
select with_check ~ 'active\s*=\s*false' as db_is_the_gate
from pg_policies
where tablename = 'members' and policyname = 'members join once, first as chief';
```

Lesson worth keeping: the first read is what makes this provable. A dashboard
"Success" would not have told us *which* policy text was in place.

**Live-data truth, re-probed:** seven submissions (*Among Us* is the Nov 17 public
one, `Accepted`), eight members with **two pending readers** (one Hanover student
address; one a typo duplicate of an active reader), three `chief_editor` rows (the
demo, the owner's, and one that was not in the Nov 17 note), two ratings, one
assignment on *The Last Ferry*.

---

## Nov 18, 2026 — reading assignments (issue #6, phase 1)

The other half of #6, and the thing "genre staffs" is not: a staff says who *can*
read fiction, an assignment says who is expected to read **this** manuscript.

- `assignments` table, `unique (submission_id, reader_id)`, **chief-writes only**
  (`20261118010000`). No `week_of` — no screen has a reading-week concept yet.
- A **Reading** panel on `/editor/:id`: pick one reader, or assign **a whole genre
  staff in one click** (a fan-out of individual rows, skipping anyone already on it).
  Each assignee renders as *Not read yet* / *Scored 4 / 5* / *Recused — needs
  reassignment*. The panel does not render for other editors, so reader names stay
  behind the `members` policy they already lived behind.
- The reader queue grew an **Assigned to you** box above the whole queue — a
  highlight, not a fence, so an unassigned piece is still read by someone.
- `demo-reset.sql` now restores the demo Reader's staffs, gives them one seeded piece,
  and deletes visitor-made assignments that point a demo account at a real manuscript.
- Deviations from the issue, recorded: no `week_of`; chief-only writes; the planned
  narrow `list_readers()` function dissolved rather than being solved (the chief can
  already read `members`).
- Verified Nov 18: `npm test` **112/112**, `npm run test:e2e` **19/19**, and a
  14-check browser pass over the deployed URL. Creating an assignment is a write, so
  the browser tests assert the panel renders but never press Assign.

## Nov 17, 2026 — five things in one session, then genre staffs

**1. Demo access became a build-time switch** (`VITE_DEMO_MODE`, #7 phase 1). A
production build now fails unless the flag is `"true"` or `"false"`; `false` drops the
credentials from the bundle rather than hiding the box, verified by grepping
`dist/assets/*.js` for **0**. `e2e/editor-gating.spec.ts` became flag-conditional so it
skips rather than fails against a no-demo build, and `playwright.config.ts` mirrors the
flag into `E2E_DEMO_ACCESS`. This is a gate, not a date: no published credential may
exist when the first real manuscript arrives.

**2. A new reader now waits for approval** (#5 phase 1,
`20261117000000_reader_approval.sql`). `active` defaults to `false`, the join policy
*refuses* a self-insert claiming `active = true`, the bootstrap chief branch stays
active, and `RequireAuth` renders a "waiting for approval" screen instead of an empty
queue that reads as a bug. Chief-only fork, because "any editor approves" would mean
widening `members` SELECT and handing every editor the whole staff list. **The
migration's `pg_policies` proof still has not been run** (see `gotchas.md` §1).

**3. `demo-reset.sql` was run for the first time and proven from outside**, after being
fixed so it no longer erases the demo's only rating.

**4. The live project was probed read-only and turned out not to be demo-only any
more** — a real submission through the public form, a real student reader, and
personal accounts. The docs had assumed a fictional dataset; see `gotchas.md` §3.

**5. Housekeeping:** `deploy-pages@v5`, a corrected Node note for §3, and a
teaching-vs-real callout in the tutorial.

**Then genre staffs** (`20261118000000_member_staffs.sql`, labeled Nov 18 in the file
name but built Nov 17): `members.staffs text[]` with a check constraint on the four
genre slugs, four toggle chips per person plus a "Who's on each staff" summary in the
Staff tab, a Staffs column in the staff CSV, and `staff_change` joining `role_change`
in the audit trail. Labels only — nothing filters a queue on it. Empty `{}` means
general staff, so every existing row behaved identically the moment it was applied.

**Verification pass over the deployed URL, Nov 17 (16/16):** both demo accounts land
where they should (reader → `/reader`, chief → `/editor`); the reader queue shows all
six seeded pieces and no author contact fields; the editor detail page shows author
name + email and the average; the CSV export downloads; `/app/submit` survives the
Pages fallback; refreshing a deep `/app/editor/<id>` link stays put; no console errors
(Pages' deep-link `404` excluded — that is the `404.html` fallback working). Plus, on
Nov 18, a 14-check pass covering the Staffs column, 16 genre chips, the reading panel
and the *Assigned to you* box.

## Nov 12, 2026 (evening) — the auth URLs finally point at the app

Both dashboard values became right, and all three probes redirect into the Pages app.
This cost three attempts across two days:

| Sent as `redirect_to` | Before | After |
|---|---|---|
| the deployed app | `localhost:3000` ❌ | the Pages app ✅ |
| `http://localhost:5173/` | itself ✅ | itself ✅ |
| nothing (the Site URL) | `localhost:3000` ❌ | the Pages app ✅ |
| a foreign site | `localhost:3000` ❌ | the Pages app ✅ |

Fix order, for the record: the **Redirect allow-list** got the Pages URL first (which
is why recovery mail started working while nothing else did), and the **Site URL** was
the second, later save. The Site URL is what confirmation / invite / magic-link mail
uses, because those are not built by `lib/appUrl.ts`. **Still unproven: delivery** —
routing says the link points at the app, it says nothing about whether Supabase's demo
mailer delivered it.

## Nov 12, 2026 — metadata stripping, export, demo access, the last pastes

- **Metadata stripping shipped** (`src/lib/scrub.ts`, #3 closed): images re-encoded
  through a canvas, `.docx` creator fields blanked, PDF info dictionary cleared, `.doc`
  warned about. It also closed a leak nobody had noticed — the stored object name used
  to be the author's own filename, and `manuscript_path` is visible to readers.
- **Export** landed in the app rather than as a script: the dashboard's **Export** tab
  writes submissions + authors + average score, reader scores and notes, and the staff
  list (Chief Editor only), all as CSV read through the signed-in session, so RLS
  governs it and no credential is stored anywhere. `npm run db:export` was never built
  and is not needed.
- **Demo access**: `/login` lists both demo accounts with one-click sign-in, and the
  README table was filled in.
- **Decision migration pasted**: the two check constraints
  (`submissions_status_check`, `submissions_decided_at_matches_status`) went in the same
  evening, so the six-status ladder is enforced by Postgres and not only by the UI.
- **A Reader who signs in no longer lands on `/editor`** — fixed by `landingFor()` in
  `lib/roles.ts`, plus a link to `/reader` on the editor wall.
- **Four junk submissions deleted** (Sep 24 probes) with
  `delete from public.submissions where created_at < '2026-10-01'`; verified from the
  API afterwards: 6 submissions, 6 author rows, and the queue opens on *The Last
  Ferry*. There is still no DELETE policy on `submissions`, so any future cleanup is
  another SQL paste, not an app action.
- **Show/Hide toggles** on all three password fields.

## Nov 11–12, 2026 — password recovery, and the auth-URL autopsy

Password recovery was built (`/forgot-password` → email → `/reset-password`, with an
expired-link state and a change-password mode) and then spent two days unable to
deliver. Each step looked like a different bug:

1. a link requested from the local dev copy came back to `localhost:5173` and read as a
   dead link — fixed by building links from the deployed URL (`lib/appUrl.ts`);
2. the failed click had *consumed* the single-use token, so the retry failed too — and a
   failed link then landed silently on the home page, fixed in `lib/authLink.ts`;
3. both were symptoms. The cause was the dashboard Site URL, found only by sending an
   invalid token to `/auth/v1/verify` and reading the redirect.

**And the way out of a lockout:** the user lost the password and the reset email could
not help, so the account was recovered with the SQL lever (`update auth.users set
encrypted_password = crypt(...)`). Password sign-in does not consult `site_url`; only
emailed links do. Recorded because it will happen to the club.

## Nov 10, 2026 — tests activated, editor workflow finished

- `app/.env.test` created with two throwaway accounts (`kennings.reader@…`,
  `kennings.chief@…`) **through the sign-up API** (confirmation is off, so no email
  round-trip). The test-Chief was then promoted to `chief_editor` through the Staff tab
  dropdown, which also exercised the role change and the audit trigger — it cannot be
  done through the API, because the update policy requires `is_chief_editor()` and the
  insert policy only allows `chief_editor` when `member_count() = 0`.
- **Decision workflow**: six statuses in five stages
  (`Received → In review → Shortlist → {Accepted | Hold | Rejected}`), `decided_at`, a
  confirm-gated decision panel, an undo, and two check constraints. The workflow
  dropdown is deliberately separate from the decision buttons.
- One real bug fell out of the first honest browser run: the sign-in helper raced the
  session write (a test bug, not an auth bug — see `gotchas.md` §6).
- Also found: a blank `TEST_SUPABASE_URL=` silently skipped the whole authenticated
  suite (see `gotchas.md` §6), and a Reader who signed in landed on `/editor` (fixed
  Nov 12).

## Oct 29, 2026 — live, and the reader flow became real

- Eight commits pushed; `app/.env.production` committed; the app deployed to GitHub
  Pages at `/app/` and verified in a real browser (`/app/` renders, `/app/submit`
  restores and lands on `/app/submit/genre`, `/app/editor/123` restores then gates to
  `/app/login`, and a real 404 still 404s).
- `app/supabase/seed.sql` applied: six sample submissions + authors, idempotent, with
  matching sample manuscripts under the `manuscripts/samples/` prefix.
- `20261029130000_ratings.sql` applied; `ReaderQueuePage` and `ReaderSubmissionPage`
  rewritten onto real data; `/reader` gated behind login; the fake data files deleted.
  The editor submission page gained the average of non-recused scores, the recusal
  count, and the written notes (reader names deliberately absent).
- Keep-alive cron added; it has fired on schedule (Nov 1, Nov 4, Nov 13, Nov 16).

## Oct 20–29, 2026 — the plan that the deadline ran on

- **Host chosen:** GitHub Pages under the existing Jekyll site, at `/app/`, over
  Netlify/Vercel — no new accounts, one deploy pipeline. Accepted consequences: Vite
  `base`, `BrowserRouter` `basename`, and a `404.html` fallback for deep links.
- **Demo accounts decided:** publish 1–2 throwaway accounts in a "Demo access" box and
  in the README. Publishing credentials for a project with fake data is not a
  vulnerability; the anon key is public by design. The `service_role` key still must
  never be committed.
- **The init migration was pasted, not pushed** (Oct 29): the project was found paused
  on Oct 27, restored, and `20261013000000_init.sql` pasted into the SQL editor. Live
  now has `member_audit`, `is_active_member()`, `is_chief_editor()`, the audit trigger,
  and the corrected policies. The security story is real.
- **`config.toml` is not the source of truth for auth URLs** — the dashboard is, and
  only a probe tells you what the project believes.

---

## Issues that closed, and the narrative that went with them

**#1 — Wire the Member Manager to `members`.** Done and live: roles,
deactivate/reactivate, RLS gating, and the audit trail all work against real rows.
Remaining: invite links / "join with a code" instead of open self-signup.

**#2 — Automated testing.** Closed Nov 10. Vitest green including live anon-RLS, and
Playwright green including the authenticated browser tests. The pgTAP run
(`app/supabase/tests/rls.test.sql`) still needs Docker, which is not installed.

**#3 — Strip metadata from uploads.** Closed Nov 12 in the browser (`lib/scrub.ts`) —
see `decisions.md` #16 for why the Edge Function lost, and `gotchas.md` §4 for the
residual risk.

**#4 — Activate the authenticated RLS tests.** Closed Nov 10. The suite proves the
security story both ways: through the API (`is_editor()` false, `SELECT authors`
returns `[]`, exactly one visible `members` row) and through the browser (a reader sees
the queue but no author identity). A fresh clone (no `.env.test`) still gets 7 clean
skips, and CI has no credentials by design.

**The auth-URL blocker.** Resolved Nov 12 — see above. It was the one thing that
looked like a code bug and was a dashboard value.

---

## Useful CLI commands confirmed present in Supabase CLI v2.120.0

`supabase db query --linked` (runs SQL against the linked project — good for auditing
`pg_policies` without a DB password), `supabase config push`, `supabase db push
--include-seed`, `supabase storage rm`, `supabase functions deploy`.

## Credentials that were needed to start (kept for the next setup)

1. **Supabase personal access token** — Dashboard → Account → Personal Access Tokens,
   for `npm run db:login`.
2. **Project database password** — Project Settings → Database, for `npm run db:link`.
3. Git name/email — set Oct 29, `Alexis Brockway
   <155980055+Alexis-Brockway@users.noreply.github.com>`, repo-local. The noreply
   address keeps a personal email out of a public repo's history.
