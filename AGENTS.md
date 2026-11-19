# AGENTS.md

*Read this first.* This is the onboarding/handoff file for any AI agent (or human)
working in this repo. Last updated **Nov 18, 2026**.

**This file holds current truth.** The long tail lives in `agent-docs/` so that the
file an agent reads on every turn stays small:

| File | What is in it |
|---|---|
| `AGENTS.md` | this file — what the project is, current state, commands, schema, the gotchas that bite first, open work, decisions |
| `STATUS.md` | the dated one-pager for a human: what is live, what was verified today, what is left, what needs your hands |
| `agent-docs/gotchas.md` | **every** gotcha in full, grouped by where it bites |
| `agent-docs/history.md` | what was built when, and what was proven — newest first |
| `agent-docs/decisions.md` | the 22 decisions with their reasoning (numbers are stable and cited from code) |
| `app/README.md` | app-level docs: live URLs, RLS matrix, commands, known gaps |
| `docs/handoff.md` | the club-facing page (published on the site) |

**Two rules keep this file useful.** (1) Session narratives and resolved issues go to
`STATUS.md` or `agent-docs/history.md` — this file gets at most a one-line pointer.
(2) A new gotcha gets one line here only if it will bite in the first hour; otherwise
it goes straight into `agent-docs/gotchas.md`.

**§10 is the operating contract** — how the person you are working with wants to be
talked to. Read it before your first message.

---

## 1. What this project is

CS senior project (2026–2027): replace the college literary magazine's paid
submission platform (Submittable) with a custom, **club-scoped** web app that runs the
whole editorial workflow — submission intake, blind review, reader notes, and decision
letters — at nearly zero cost. Built for **one club**, not a platform, which is what
makes it finishable in one semester. The central CS idea is **blind review enforced at
the database layer** (row-level security): readers physically cannot fetch author
identity.

The real club is **Kennings**, Hanover College's literary journal
(kenningsliteraryjournal.com). Real submission rules were pulled from their Submissions
page on Sep 23, 2026 and live in the app (`app/src/data/genres.ts`).

---

## 2. Current status (Nov 18, 2026)

**Live and working:** public submission form with browser-side metadata stripping,
sign-up/sign-in with role-based landing, pending-reader approval, reader queue + detail
page + ratings/notes/recusal, editor dashboard with the six-status decision workflow,
Member Manager (roles, activate/deactivate, genre staffs, audit trail), reading
assignments with staff fan-out, CSV export, password recovery, and demo access behind a
build-time switch.

**URLs:** site https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/
(including `/tutorial/`) · app at **`/app/`** under it:
https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/app/ · Supabase
project `qsynlsbltpnhzncpqerz`. The URL is repo-bound (it belongs to the `Hanover-CS461`
org), which is why a custom domain is first on the §13 list.

**Verified Nov 19, 2026** (read-only; nothing about the app changed to get these):
`npm test` **112/112**, `npm run test:e2e` **19/19**, lint and `tsc -b` clean, all
three live URLs 200, both auth probes landing on the Pages app, keep-alive green
(last run Nov 16), and a 19-check browser pass over the deployed URL covering the
Staffs column, the genre chips, the Reading panel, and the *Assigned to you* box.
No console errors beyond the Pages fallback's own 404.

**Facts worth knowing before you trust a green light:**

- **The Supabase CLI has never been linked** on this machine, so the working path for
  schema changes is a **manual paste into the dashboard SQL editor** by the user. Order
  is always: write the migration → commit → *user pastes* → push. See §7.
- **The live project is not demo-only.** It holds a real manuscript submitted through
  the public form, a student reader, and the owner's own second account. Never treat a
  non-seed row as junk. Keep personal addresses out of every doc in this repo.
- **The published demo Chief can read `authors`**, so demo access is a gate before a
  real reading period, not a cosmetic cleanup (issue #7, phase 2: delete the accounts).
- **Delivery of auth email is unproven.** Routing is proven (all three probes land on
  the app); the built-in mailer is a demo, not a mail service.

**Open, and only a human can close it:** one real inbox is needed to prove auth mail is
delivered; the #7 phase-2 account deletion is pending. The reader-approval
`pg_policies` check was **run Nov 19 and passed** (`db_is_the_gate` → `true`), so the
database is the gate, not just the app, and the two documented probe objects were
**deleted Nov 19 and proved from outside**. `STATUS.md` keeps the live list with owners.

---

## 3. Environment & commands

- **Node is v22.22.1** and is on the default PATH (`/usr/bin/node`); `~/node/bin` also
  has a copy. If a fresh terminal says "node not found":
  `export PATH="$HOME/node/bin:$PATH"`.
- Repo root: `/mnt/c/Users/A3bro/senior-project-2026-2027-Alexis-Brockway` (Windows
  drive via WSL). All app commands run from `app/`.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (add `-- --host 0.0.0.0` so a Windows browser can reach WSL) |
| `npm run build` | `tsc -b && vite build` (a production build **fails** without `VITE_DEMO_MODE`) |
| `npm run lint` | `oxlint` (warnings only right now; must stay exit-0) |
| `npm test` | Vitest: unit + live anon-RLS tests. Takes ~40s, dominated by `scrub.test.ts` importing `pdf-lib` through Vite on `/mnt/c` |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright (starts/reuses the dev server on :5173) |
| `npm run db:login` / `db:link` | One-time CLI setup. **Neither has ever succeeded here** |
| `npm run db:push` / `db:push:dry` | Apply migrations to the linked project — **unavailable until `db:link` works** |
| `npm run db:new -- <name>` | Create a new empty migration file |
| `npm run db:start` / `db:stop` / `db:reset` | Local stack — needs Docker, which is not installed |

- **Database changes are code now**, but they reach production by paste. The schema
  lives in `app/supabase/migrations/` (timestamped, applied in order) and settings in
  `app/supabase/config.toml`. **Do not paste SQL into the dashboard as an experiment** —
  write a migration, commit it, and have the user paste *that*. Never edit a migration
  that has already been pasted; add a new one.
- **Credentials** live in `app/.env` (gitignored): `VITE_SUPABASE_URL` (project
  `qsynlsbltpnhzncpqerz`), `VITE_SUPABASE_ANON_KEY`. Vite inlines `VITE_*` as
  `import.meta.env.*`. The client is `app/src/lib/supabase.ts`. **Restart the dev server
  after changing `.env`** — Vite reads env only at startup.
- **The anon key is the `sb_publishable_…` format** (public by design). Never put the
  `service_role` key in the app.
- **There is ONE Supabase project, and the tests use it** (decision 12). `TEST_SUPABASE_*`
  in `.env.test` are deliberately blank, so the suites fall back to the app's project and
  Playwright reuses the app's dev server. Consequences: the two test accounts are **real
  `members` rows**, the test-Chief is a real `chief_editor` who can read `authors`, and
  **the suites must stay read-only** — there is no DELETE policy on `submissions`,
  `members`, or `assignments`, so a test that wrote a row could never clean it up.
- **Authenticated tests** read `app/.env.test` (gitignored; template is
  `app/.env.test.example`). It exists on this machine, so the authenticated suites run
  here but not in CI — a fresh clone gets 7 clean skips by design.
- **`gh` needs the `workflow` scope** to touch `.github/workflows/`:
  `gh auth refresh --hostname github.com --scopes workflow` prints a device code and
  polls. Device codes expire in ~15 minutes; `gh auth status` shows granted scopes.
- **Git identity is set** repo-local: `Alexis Brockway
  <155980055+Alexis-Brockway@users.noreply.github.com>`.
- **`gh` is authenticated as Alexis-Brockway**, but `gh issue view` errors on this repo
  ("Projects (classic) is being deprecated"). Use
  `gh api repos/Hanover-CS461/senior-project-2026-2027-Alexis-Brockway/issues/<n>`.

### Dev-server gotchas (WSL)

- **Vite's watcher is unreliable on `/mnt/c`**, so the browser can keep showing STALE
  code. Diagnose with a cache-busting curl:
  `curl -s "http://localhost:5173/src/pages/<File>.tsx?t=$(date +%s)" | grep <symbol>`.
  If the server is current but the browser is stale, **close the tab and open a fresh
  one** (plain Ctrl+Shift+R often isn't enough).
- Do **not** `pkill -f vite` from the tool (it matches the shell's own command line and
  hangs). Kill by port: `PID=$(ss -tlnp | grep 5173 | grep -oP 'pid=\K[0-9]+' | head -1);
  kill $PID`.
- Restart detached with `nohup npm run dev > /tmp/opencode/vite.log 2>&1 &`, then verify
  via curl before telling the user it's live.
- **Playwright reuses an existing server on :5173** unless `CI=1` or a separate test
  project is configured (`TEST_SUPABASE_URL`); then it boots its own.

---

## 4. Repository layout

| Path | Status | Contents |
|---|---|---|
| `AGENTS.md` | **Current** | This file |
| `STATUS.md` | **Current** | Dated one-page human summary |
| `agent-docs/` | **Current** | `gotchas.md`, `history.md`, `decisions.md` — the long tail of this file |
| `app/` | **The app** | React + Vite + TS submission manager |
| `app/src/pages/` | Current | HomePage, GenrePage, GenreRulesPage, SubmitPage, LoginPage, ForgotPasswordPage, ResetPasswordPage, ReaderQueuePage, ReaderSubmissionPage, EditorDashboardPage, EditorSubmissionPage |
| `app/src/components/` | Current | `RequireAuth.tsx` (route guard), `MemberManager.tsx` (staff admin), `ExportPanel.tsx` (CSV export), `DemoAccessBox.tsx` (the only module holding the published demo logins), `PasswordField.tsx` (input + Show/Hide toggle) |
| `app/src/lib/` | Current | `supabase.ts` (client + `authLinkError`), `auth.tsx` (`useAuth`/`memberLoading`/recovery flag), `appUrl.ts`, `authLink.ts`, `roles.ts`, `staffs.ts`, `assignments.ts`, `statuses.ts`, `membership.ts`, `csv.ts` + `exportData.ts`, `download.ts`, `demoAccounts.ts`, `demoMode.ts`, `scrub.ts` |
| `app/src/data/` | Current | `genres.ts` (real Kennings rules — source of truth), `members.ts` (roles + types) |
| `app/supabase/migrations/` | **Canonical** | Versioned schema (tables, functions, RLS, storage, audit) |
| `app/supabase/seed.sql` | Current | Six sample submissions + authors (`on conflict do nothing`), applied to the live project |
| `app/supabase/demo-reset.sql` | Current | Paste-to-undo for a vandalised demo (see §7) |
| `app/e2e/` | Current | Playwright specs: public submission, blind review, editor gating, authenticated roles, password recovery, password toggle, metadata scrubbing |
| `app/supabase/tests/rls.test.sql` | Current | pgTAP policy tests (needs Docker) |
| `app/supabase/functions/` | Planned | Edge Functions — upload routing, decision letters |
| `docs/` | **Live site** | Jekyll site deployed to GitHub Pages; `index.md` links the app at `/app/` |
| `docs/handoff.md` | Live | One page for the club: what they inherit, the pause ritual, the reset lever |
| `docs/404.html` | Current | Pages fallback: bounces `/app/*` deep links back into the SPA |
| `brainstorm.md`, `features.md`, `proposal*.md` | Historical | Original idea material (old stack; kept, not authoritative) |
| `tutorial-study-guide.md` | Gitignored | Private class cheat sheet — never stage/push |

---

## 5. Stack (locked — do not re-litigate)

| Piece | Role | Notes |
|---|---|---|
| React 19 + Vite 8 + TypeScript | Frontend SPA | routed with react-router-dom v7 |
| React Hook Form + Zod | Forms + validation | used by the submission form |
| Supabase | Postgres + Auth + Storage + Edge Functions | project `qsynlsbltpnhzncpqerz` |
| Supabase RLS | Blind-review enforcement | readers have NO policy on `authors` |
| Supabase Edge Function | The only server-side code | upload routing / email (planned) |
| Resend | Transactional email | auth mail, decision letters (planned) |
| Vitest + Playwright | Testing | green locally, anon half in CI |
| fflate + pdf-lib | Scrubbing metadata out of uploads | `pdf-lib` is a lazy ~176 kB chunk, fetched only for a PDF |
| oxlint | Linting | `npm run lint` |
| GitHub Pages | Hosting | free, no new accounts; app at `/app/`, **not** the site root |

**Why this stack (settled):** scale is tiny (200–300 subs/season, ~20 staff), so the
real criteria are "fewest moving parts after graduation" and "fastest to build."
Prisma was dropped (service role bypasses RLS, contradicting the security story);
Next.js was dropped for React + Vite (login-gated, no SEO need).

---

## 6. Data model & the security core

The security story **is** the project. RLS + a separate `authors` table means a reader
cannot read identity even by calling the database directly.

**Tables** (`app/supabase/migrations/`):

- `submissions` — `id, title, genre, status, decided_at, hanover_student,
  manuscript_path, created_at`. **No author identity here** (readers may read this) —
  which is why `manuscript_path` is `<uuid>/manuscript.<ext>` and never the author's
  filename. Two check constraints make the workflow structural:
  `submissions_status_check` limits `status` to the six ladder values, and
  `submissions_decided_at_matches_status` requires a decision and its timestamp to travel
  together — so `set status = 'Accepted'` without `decided_at` is **rejected by
  Postgres**, not merely hidden by the UI.
- `authors` — `id, submission_id (unique FK), name, email, mailing_address, bio,
  created_at`. Readers have **no** policy → blind.
- `members` — `id, user_id (FK auth.users, unique), email, name, role, active, staffs,
  created_at`. Roles are **snake_case**: `reader`, `staff_editor`, `editor`, `co_editor`,
  `chief_editor`, `advisor`. `staffs` is a `text[]` of genre slugs (`fiction`, `poetry`,
  `creative-nonfiction`, `visual-arts`), constrained by `members_staffs_known`; `{}`
  means general staff. It labels people and never gates work.
- `member_audit` — `actor_id, target_user_id, action, old_value, new_value, created_at`;
  written by a trigger on `members` update.
- `assignments` — `id, submission_id (FK), reader_id (FK auth.users), assigned_by,
  created_at`, with `unique (submission_id, reader_id)`. One row = "this reader is
  expected to read this piece". A staff-wide assign is a fan-out of rows, not a second
  kind of record. Readers read their own rows, the chief reads all, and **only the chief
  writes**. No `week_of` column on purpose.

**Helper functions** (all `security definer`): `member_count()`, `is_active_member()`,
`is_editor()` (any editor role, active), `is_chief_editor()` (active chief only).

**Key policies:**

- anon may INSERT submissions/authors (public form) and upload to Storage; anon has
  **no** SELECT on anything.
- active staff may SELECT submissions and download manuscripts; editors may UPDATE
  submissions and SELECT authors.
- members may INSERT their own row once — role `reader` **with `active = false`**, or
  `chief_editor` **with `active = true`** only when `member_count() = 0` (the bootstrap
  rule, which must stay active or a fresh project could never be bootstrapped). Since
  `20261117000000`, `active` also **defaults** to `false`, so the policy is what makes
  pending-reader a rule rather than a convention: a hand-rolled insert claiming
  `active = true` is refused.

**Revocation is immediate:** `is_editor()`, `is_active_member()`, and `is_chief_editor()`
all check `active`, so deactivating a member cuts access on the next request without
touching their token. The same check is what makes a new sign-up harmless.

### Hard-won lesson: insert-without-read-back

A role with only an INSERT policy cannot read back the row it just inserted (RETURNING
is refused). The public form avoids `.insert().select().single()` by generating the
`submission_id` with `crypto.randomUUID()` in the browser and inserting an explicit id.
(Members can read their own row, so `joinClub`'s insert-with-return is fine.)

---

## 7. Conventions & gotchas

The full list is **`agent-docs/gotchas.md`**, grouped as: the live database and how
changes reach it / auth, email and links / keys and what is public on purpose / uploads
and metadata / executable content / testing / UI states that read as bugs / docs and the
deploy pipeline / frontier operations. Read it before touching auth, uploads, or tests.

### The eight that bite in the first hour

1. **Paste the migration before pushing code that reads a new column.** PostgREST answers
   `42703 column … does not exist`, which blanks the page. The paste is manual, the push
   is not — so: write → commit → *user pastes* → push. The CLI has never been linked, so
   there is no shortcut.
2. **A dashboard "Saved" is not saved until something outside the dashboard proves it.**
   The Site URL reported success twice while the project kept `localhost:3000`. The proof
   is the invalid-token probe in `gotchas.md` §2 — one request, no email.
3. **Anything that routes on the role must wait for `memberLoading`.** `member` is null
   both before the lookup finishes and for a session with no `members` row, so a page
   reading `member?.role` during that gap sees a reader and mis-routes an editor.
4. **The test suites are read-only by design.** No DELETE policy on `submissions`,
   `members`, or `assignments`; anon cannot delete Storage objects. A spec that presses
   Submit or Assign leaves a permanent row in the project a grader looks at.
5. **A published credential must be absent from the bundle, not hidden in the UI.** All
   demo logins live in `DemoAccessBox.tsx` behind `DEMO_ACCESS_ENABLED`; a
   `VITE_DEMO_MODE=false` build greps 0. A hidden box is still a published password.
6. **Storage uploads must not use `x-upsert`.** Anon has INSERT and deliberately no
   UPDATE on `storage.objects`, so an upsert 403s.
7. **`manuscript_path` never carries the author's filename.** It is
   `<uuid>/manuscript.<ext>`; readers can read `submissions`.
8. **Auth email is a demo mailer.** Rate-limited, spam-prone, and unproven for delivery;
   the `@example.com` accounts have no inbox, so the round trip is checked by hand. The
   emergency lever is the SQL password reset in `gotchas.md` §2.

### Other conventions worth repeating here

- **A CSV is executable content.** Exported cells get an apostrophe prefix when they
  start with `=`, `+`, `-` or `@` (`escapeCell()` in `lib/csv.ts`).
- **A `<select>` is not a safe control for an irreversible action** (a wheel-scroll
  changes it), which is why decisions are buttons behind a `window.confirm`.
- **Readers must not see the outcome.** All three decision states read "With editors" to
  a reader (`readerStatus()` in `statuses.ts`), and a test asserts the word never leaks.
- **A demo reset must restore the demo.** `demo-reset.sql` re-seeds a rating, roles,
  genre staffs, and one assignment — a demo that only deletes looks broken.
- **A new sign-up is a pending stranger**, and the UI has to say so rather than showing
  an empty queue.
- **Genre staffs are labels, not a gate.** Nothing filters a queue on `staffs`.
- **`status` and `decided_at` travel together** or Postgres refuses the write.
- **A failed SQL paste rolls back and looks like nothing happened** — re-read the first
  error instead of pasting again.
- **OWASP Top 10** is the security checklist; **broken access control** is this
  project's primary risk (the whole product is a permission boundary).

---

## 8. Open work (GitHub issues)

Repo: `Hanover-CS461/senior-project-2026-2027-Alexis-Brockway`.

- **#5 — Require an editor to approve a reader before the queue opens.** *Phase 1
  shipped Nov 17* (`20261117000000_reader_approval.sql`): `active` defaults to `false`,
  the join policy refuses a self-insert claiming otherwise, the bootstrap chief branch
  stays active, and `RequireAuth` explains the wait. **The policy half is proven:** the
  `pg_policies` check was run Nov 19 and `db_is_the_gate` returned `true`, so a
  hand-rolled sign-up cannot self-approve. Approval is the Chief Editor's alone by
  decision 19 — which is also why an "any editor approves" variant would need the
  `members` SELECT policy widened.
- **#6 — Reading assignments.** *Phase 1 shipped Nov 18*: `assignments`, the Reading
  panel on `/editor/:id`, staff fan-out, the *Assigned to you* box, and recusal surfacing
  as "needs reassignment". **Still open:** reading weeks/scheduling, per-reader workload
  counts, and the read-only-suite problem (creating an assignment is a write, so the
  browser tests assert the panel renders but never press Assign).
- **#7 — Take the published demo logins out before a real reading period.** *Phase 1
  shipped Nov 17* (`VITE_DEMO_MODE`, §7). **Phase 2 is the gate:** the demo accounts must
  be **deleted** — not rotated, because the passwords are in git history.
  `member_audit.target_user_id` is `references auth.users(id)` without `ON DELETE
  CASCADE`, so audit rows naming a demo user must be removed first.
- **#8 — Send real email.** Phase 0 is Resend as Supabase Auth's SMTP (the
  `[auth.email.smtp]` block is already commented into `config.toml`) — blocked on the
  club's DNS for SPF/DKIM. Phase 1 is decision letters via an `email_outbox` table
  drained by an Edge Function, with `unique (submission_id, kind)` so a double-send is
  impossible; deciding and notifying must stay separate acts because a decision can be
  undone.

**Shared blocker (#5, #6, #7 phase 2):** an approval, an assignment, and an account
deletion are all *writes*, and the suites are read-only. Decide the throwaway-account /
cleanup strategy once and it unblocks all three.

**Loose ends that need the user's hands, not an agent's:** orphan test uploads in the
`manuscripts` bucket (no delete policy, not even for the chief); one orphan auth user
with no `members` row (needs a service-role key); one real inbox to prove auth mail
delivers; and, after the deadline, scoping the Advisor role and author-reveal timing.

Issues #1–#4 are closed; their narratives are in `agent-docs/history.md`.

---

## 9. Decision history (one line each)

Numbers are stable and cited from code — full reasoning in `agent-docs/decisions.md`.

1. Ruled out AI story generators; wanted "English as a whole."
2. Chose the lit-journal manager over a close-reading room or scansion instrument.
3. **Scope: one club, not a platform** — hardcode their workflow.
4. Stack simplified to React + Vite + Supabase + Resend + a static host.
5. Prisma dropped (service role bypasses RLS); Next.js dropped (no SEO need).
6. **The security story is the project:** RLS + a separate `authors` table.
7. Kennings is the real club.
8. The app lives in `app/`, separate from `docs/`.
9. Supabase project created Sep 24; anon key is `sb_publishable_…`.
10. Auth = in-app self sign-up; the first member becomes Chief Editor via RLS.
11. Insert-without-read-back → client-generated UUIDs.
12. **One database for app and tests** — so the suites must stay read-only.
13. **Decisions are an act, not a label** — confirm, `decided_at`, explicit undo.
14. **Readers do not see the outcome** — all decisions read "With editors."
15. **No secret key in the app** — only ever the RLS boundary.
16. **Metadata is stripped in the browser, at intake** (Nov 12), not in a function.
17. **The stored object name is generic on purpose** (`<uuid>/manuscript.<ext>`).
18. **Demo access is a build-time decision** (Nov 17) — absent from the bundle, not
    hidden.
19. **Approval is the Chief Editor's; a new account is pending by default** (Nov 17).
20. **A demo reset must reset *to* something**, not just delete (Nov 17).
21. **A staff team is a label, not a permission** (Nov 17).
22. **An assignment is one reader, one manuscript, and only the chief hands it out**
    (Nov 18).

---

## 10. Working with the user

- CS major **double-majoring in English / Creative Writing**; strong JS/TS from
  coursework, but auth/deploy/RLS/deliverability are NEW.
- **Plain language first. Analogies before jargon** (kitchen/food, ID cards, door keys).
  One decision at a time; avoid big option dumps and large tables.
- The stack must stay simple — the club inherits it after graduation. When they say
  "smaller," they mean it.
- They want features **visible/clickable ASAP**; fake data beats waiting for the DB.
- They happily **paste SQL into the Supabase SQL Editor**, but dislike clicking through
  the dashboard UI — prefer a script or do it in the app.
- **A dashboard change they report as "saved" may not be saved — confirm it from the
  outside before building on it.** When they must touch a multi-field dashboard page,
  give the exact string, say what the screen should look like, and give them a **check
  step that proves the save landed** (refresh and re-read the field) — then verify it
  yourself.
- **Prefer a credential + API call over a dashboard walkthrough** when the page has
  bitten them before. A short-lived Personal Access Token lets the agent set the same
  values with one `PATCH` and prove it.
- **Step-by-step:** hand them one step, wait for "done," then the next.
- **Prefer doing it over asking them to.** They will say "just do it" or "do the
  preferred" — so pick a sensible default, execute it, and report what changed. Only
  surface a step when it genuinely requires *their* hands (a click in their signed-in
  browser, a SQL paste, or a credential only they hold), and say plainly which of those
  it is and why the agent can't do it.
- **They ask sharp security questions** ("how do you use the key without putting it in
  the public repo?"). Answer with the concrete evidence — grep the tree and git history,
  show the check's output — rather than reassurance.
- **They ask for the handoff file to be updated at the end of a work session** ("add
  everything to the agents file"). Treat the docs as a deliverable: update status,
  gotchas, decisions, and the plan in the same breath, including anything still pending,
  so the next agent does not repeat the investigation. Keep `AGENTS.md` short and put the
  narrative in `STATUS.md` / `agent-docs/history.md`.
- If the browser "isn't showing" edits, restart by port (§3) and confirm via curl before
  saying it's live.

---

## 11. Glossary (the ones you will use constantly)

- **Anon / publishable key** — the public "door key" baked into the frontend; grants
  nothing by itself.
- **Login token** — the "ID card" a staff member gets at login; carries their role;
  checked by RLS on every request.
- **RLS** — database rules deciding what each role can read; makes blind review
  structural.
- **Blind review** — readers see title/genre/manuscript only, never author.
- **Signed URL** — a temporary, time-limited link to a private Storage file.
- **Bootstrap chief editor** — the RLS policy that lets the FIRST sign-up become Chief
  Editor (`member_count() = 0`).
- **Recusal** — a reader who knows the author locks their vote; the average is computed
  over voters only.
- **Pending reader** — a member row with `active = false`: the account exists, they can
  sign in, and they can read nothing until the Chief Editor activates them.
- **Genre staff** — a team label on a person; changes nothing they may open.
- **Assignment** — one row saying "this reader is expected to read this manuscript";
  chief-only, and *Assigned to you* is a highlight, not a fence.

The full glossary (roles ladder, insert-without-read-back, Edge Function, Marp, …) is in
`agent-docs/decisions.md`.

---

## 12. Key sources

The proposal's full citation list lives in `docs/proposal.md`. The four an agent actually
needs:

- Supabase docs (RLS, Auth, Storage): https://supabase.com/docs
- Vite (env, `base`, build): https://vite.dev
- Resend (email, domain verification): https://resend.com/docs
- OWASP Top 10 (broken access control): https://owasp.org/Top10/

---

## 13. Plan — after Nov 24, 2026

The class deadline (**Nov 24, 2026**) needs one thing: a live URL to the working app.
That exists. Everything below is post-deadline work, in the order that matters.

1. **Custom domain — the change that actually matters.** The app currently lives at a URL
   owned by the `Hanover-CS461` org, which will not outlive the course. Kennings already
   owns `kenningsliteraryjournal.com`, so `app.kenningsliteraryjournal.com` is a DNS
   record, not a purchase: add a `CNAME` file to the published site, point DNS
   `CNAME` → `hanover-cs461.github.io`, set the domain under repo → Settings → Pages and
   tick **Enforce HTTPS**, then update `config.toml`'s `site_url` +
   `additional_redirect_urls`, the README, and the live URLs in §2 above. **Blocker:**
   access to Kennings' DNS. Without it, design around the `github.io` URL rather than
   planning for a domain.
2. **Transfer the repo** to a Kennings org so the code outlives the course. The Pages URL
   changes on transfer, which is exactly why the domain comes first.
3. **Only then consider a different host.** Netlify or Cloudflare Pages would skip the
   `404.html` hack (native SPA rewrites) and let the app build in its own pipeline — a
   maintainability win, paid for with an account. Do **not** move the app to the site
   root: that breaks the existing proposal link.
4. **Real email (#8).** Resend as SMTP for auth, then decision letters via an outbox.
   This also turns password recovery from "works in a demo" into "works."
5. **Delete the demo accounts (#7 phase 2)** — a gate before a real reading period, not a
   cleanup.
6. **Join-with-a-code** instead of open self-signup (the remainder of #1), and reading
   weeks / workload counts for #6.

**Already decided, do not reopen** (reasoning in `agent-docs/decisions.md`): metadata is
stripped in the browser at intake (#16), the stored object name is generic (#17), demo
access is build-time (#18), approval is chief-only and pending-by-default (#19), staffs
are labels and assignments are chief-only highlights (#21, #22).

**Hosting never fixes the free-tier pause** — that stays the keep-alive cron's job. The
cron itself dies after 60 days of repository inactivity; any commit restarts it.
