# AGENTS.md

*Read this first.* This is the onboarding/handoff file for any AI agent (or
human) working in this repo. It replaces the old `project-context.md`. Last
updated **Nov 12, 2026**.

---

## 1. What this project is

CS senior project (2026–2027): replace the college literary magazine's paid
submission platform (Submittable) with a custom, **club-scoped** web app that
runs the whole editorial workflow — submission intake, blind review, reader
notes, and decision letters — at nearly zero cost. Built for **one club**, not a
platform, which is what makes it finishable in one semester. The central CS idea
is **blind review enforced at the database layer** (row-level security): readers
physically cannot fetch author identity.

The real club is **Kennings**, Hanover College's literary journal
(kenningsliteraryjournal.com). Real submission rules were pulled from their
Submissions page on Sep 23, 2026 and live in the app.

---

## 2. Current status (Nov 12, 2026)

- **Proposal** — DONE, live on GitHub Pages (URL at the end of §12).
- **App** lives in `app/` (React + Vite + TS), separate from `docs/` (the
  Jekyll site). Backend is **Supabase**, live in project `qsynlsbltpnhzncpqerz`
  (free tier). **Deployed and live** at the §12 URL under `/app/` (Oct 29).
- **Submission flow** — DONE and wired to Supabase (file → Storage, then
  `submissions` + `authors` rows).
- **Auth** — DONE: in-app sign-up/sign-in; the first sign-up becomes Chief
  Editor (enforced by RLS), everyone after joins as Reader. **The bootstrap no
  longer fires** — `member_count()` is 4, so a new sign-up joins as a Reader.
  **Email confirmation is now OFF** (`mailer_autoconfirm: true` live, and
  `config.toml` already had `enable_confirmations = false`), so sign-up returns a
  live session immediately. See §7. All three password fields — sign-in, and both
  halves of the reset form — carry a **Show/Hide toggle** (Nov 12), so a password can be
  checked before it is submitted.
- **Password recovery** — built Nov 11 (`/forgot-password` → email → `/reset-password`).
  The emailed link deliberately points at the **app root**, not the reset route — see
  §7. A reset URL with no session says the link expired; the same page also works as a
  change-password form when signed in. **Both halves of the auth-URL problem are fixed as
  of Nov 12**: the Site URL and the redirect allow-list now point at the Pages app, proven
  by the three-probe test in §8. What is still unproven is **delivery** — the built-in
  mailer is a demo (§7). The SQL password reset is the emergency lever, not the plan.
- **Editor dashboard** — Queue reads real data; `/editor/:id` reads real
  submission + author and saves status. **Member Manager is live**: role changes,
  soft deactivate/reactivate, and the audit trail all work against real rows.
  **Ratings summary is live too**: average of non-recused scores, recusal count,
  and the written notes (reader names are deliberately absent — see §13 week 3).
- **Reader queue** — **live on real data** (Oct 29). `ratings` table with RLS (a reader
  writes/reads only their own row while active; editors read all), queue reads
  `submissions` and splits into To read / Scored, detail page opens the manuscript via
  a signed URL and saves score, notes and recusal. `/reader` is login-gated. Seeded
  with six sample submissions (`app/supabase/seed.sql`).
- **Tests** — **green across the board (Nov 12)**: `npm test` **66/66** and
  `npm run test:e2e` **15/15**, with no skips. `app/.env.test` (gitignored) holds two
  throwaway accounts, and the test-Chief is `chief_editor`, which is what unblocked
  the last assertion. **CI still runs the anonymous half only**, because no
  test credentials are committed; a fresh clone gets 7 clean skips by design. Note:
  `src/lib/scrub.test.ts` takes ~25s on its own, because importing `pdf-lib` through
  Vite's transform pipeline is slow on `/mnt/c` — the work is milliseconds, the module
  graph is not.
- **Metadata stripping** — **done Nov 12** (`src/lib/scrub.ts`), browser-side at intake:
  images re-encoded through a canvas, `.docx` creator fields blanked, PDF info dictionary
  cleared, `.doc` warned about. It also closed a leak nobody had noticed: the stored
  object name used to be the author's own filename, and `manuscript_path` is visible to
  readers (§7). Scope and residual risk are in §8 #3.
- **Demo access + export** — added Nov 12. The sign-in page lists two throwaway
  accounts (§13's demo requirement) and signs a visitor in with one click; the
  credentials live in `app/src/lib/demoAccounts.ts` **on purpose** (§7). The editor
  dashboard gained an **Export** tab: submissions + authors + average score, reader
  scores and notes, and the staff list (Chief Editor only), all as CSV read through
  the signed-in session. A Reader now lands on `/reader` after signing in instead of
  hitting the editor wall (§7).
- **Decision workflow** — built Nov 10, **live Nov 10**. Six statuses in five stages:
  `Received → In review → Shortlist → { Accepted | Hold | Rejected }`. The workflow
  dropdown is separate from the decision buttons on purpose; a decision is stamped with
  `decided_at`, confirmed, and undone explicitly. The `decided_at` column and both check
  constraints (`submissions_status_check`, `submissions_decided_at_matches_status`) are
  **live as of Nov 12**, so the ladder is structural: Postgres rejects `Accepted` without
  a timestamp. See §7 ("deployment sequencing").
- **Keep-alive** — a scheduled Action has been pinging the database since Oct 29 and
  has fired on schedule (Nov 1, Nov 4), so the free-tier project no longer pauses.
- **Open work** — the auth-URL blocker is **closed** (§8: all three probes now land on the
  app), the demo queue is clean, and **metadata stripping shipped Nov 12**. Nothing on the
  critical path for Nov 24 is left; what remains is either after the deadline (decision
  letters, invite codes, the club pilot) or the residual risks written down in §8 #3.
  Issues #1–#4 (§8) are all **closed on GitHub** as of Nov 12, each with a closing note
  recording what actually shipped and where it deviated from the original plan. §13 has
  the plan. Two loose ends need the user's hands, not an agent's: the stray
  `manuscripts/probe.txt` and `manuscripts/samples/probe-test.txt` objects (§7 — anon
  cannot delete), and one real inbox to prove auth mail is *delivered*, not just routed
  (§8).

---

## 3. Environment & commands

- **Node is v22.22.1** and is on the default PATH (`/usr/bin/node`); `~/node/bin`
  also has a copy. If a fresh terminal says "node not found":
  `export PATH="$HOME/node/bin:$PATH"`. (The Pages workflow still pins
  `node-version: 20` — align it or leave it deliberately.)
- Repo root: `/mnt/c/Users/A3bro/senior-project-2026-2027-Alexis-Brockway`
  (Windows drive via WSL).

All app commands run from `app/`:

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (add `-- --host 0.0.0.0` so a Windows browser can reach WSL) |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | `oxlint` (warnings only right now; must stay exit-0) |
| `npm test` | Vitest: unit + live anon-RLS tests. Takes ~25s: importing `pdf-lib` through Vite's transform pipeline is slow on `/mnt/c` (see §2) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright (starts/reuses the dev server) |
| `npm run db:login` | One-time: log the CLI into your Supabase account (browser/paste token) |
| `npm run db:link` | One-time: link the CLI to project `qsynlsbltpnhzncpqerz` (prompts for the DB password) |
| `npm run db:push` | Apply new migrations to the live project (`supabase db push --linked`) |
| `npm run db:push:dry` | Show which migrations would run, without applying |
| `npm run db:new -- <name>` | Create a new empty migration file |
| `npm run db:start` / `db:stop` | Local Supabase stack (needs Docker; not installed) |
| `npm run db:reset` | Rebuild the LOCAL db from migrations + seed (needs Docker) |

- **Database changes are code now.** The schema lives in
  `app/supabase/migrations/` (timestamped, applied in order) and settings in
  `app/supabase/config.toml`; the Supabase CLI is pinned as a devDependency.
  **Do not paste SQL into the dashboard** — add a migration and `npm run
  db:push`. Never edit a migration that has already been pushed; add a new one.
- **First-time CLI setup (once per machine):** `npm run db:link` (needs the
  database password from the Supabase dashboard → Settings → Database). The
  link is cached in `app/supabase/.temp` (gitignored).
- **Credentials** live in `app/.env` (gitignored): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. Vite inlines `VITE_*` as `import.meta.env.*`. The
  client is `app/src/lib/supabase.ts`. Restart the dev server after changing
  `.env` — Vite reads env only at startup.
- **The anon key is the newer `sb_publishable_…` format** (public by design).
  Never put the `service_role` key in the app.
- **There is ONE Supabase project, and the tests use it.** `TEST_SUPABASE_URL` and
  `TEST_SUPABASE_ANON_KEY` in `.env.test` are deliberately **blank**, so `rls-auth.test.ts`
  falls back to `VITE_SUPABASE_URL` and `playwright.config.ts` sees a falsy
  `testProjectUrl` and reuses the app's dev server. Same Postgres, same Auth, same
  private bucket as the deployed site. Consequences worth remembering:
  - the two test accounts are **real `members` rows** (that is why `member_count()`
    is 4), and the test-Chief is a real `chief_editor` who can read `authors`;
  - **the suites must stay read-only.** All 8 e2e specs and the 3 auth tests only
    navigate and GET — verified Nov 10. There is **no DELETE policy** on
    `submissions`, so a test that wrote a row could never clean it up from the app.
  - to isolate later, fill in `TEST_SUPABASE_URL`/`TEST_SUPABASE_ANON_KEY` and the
    config switches projects and boots its own server. The free tier allows 2
    projects. Not done: a second project is more maintenance than it is worth here.
- **Authenticated tests** read `app/.env.test` (gitignored; template is
  `app/.env.test.example`). Without it those suites skip cleanly. As of Nov 5 the file
  **exists locally** with two throwaway accounts (`kennings.reader@example.com` and
  `kennings.chief@example.com`), so the authenticated suites run on this machine but not
  in CI.
- **`gh` needs the `workflow` scope to touch `.github/workflows/`.** Without it the push
  is rejected at the API layer: *"refusing to allow an OAuth App to create or update
  workflow"*. Fix once with `gh auth refresh --hostname github.com --scopes workflow`,
  which prints a device code and polls.
- **Device-code auth expires.** `gh auth login --web` and `gh auth refresh` both print a
  one-time code and wait; if it isn't entered within ~15 minutes the session dies and a
  fresh code is needed. `gh auth status` tells you the granted scopes.
- **Git commit identity is set** (Oct 29): `Alexis Brockway
  <155980055+Alexis-Brockway@users.noreply.github.com>`, repo-local. Using the GitHub
  noreply address keeps a personal email out of a public repo's history.
- **`gh` CLI is authenticated** as **Alexis-Brockway**; issues/PRs can be made
  from the shell. Note: `gh issue view` currently errors on this repo
  ("Projects (classic) is being deprecated"); use
  `gh api repos/Hanover-CS461/senior-project-2026-2027-Alexis-Brockway/issues/<n>`
  instead.

### Dev-server gotchas (WSL)

- **Vite's watcher is unreliable on `/mnt/c`**, so the browser can keep showing
  STALE code. Diagnose with a cache-busting curl:
  `curl -s "http://localhost:5173/src/pages/<File>.tsx?t=$(date +%s)" | grep <symbol>`.
  If the server is current but the browser is stale, **close the tab and open a
  fresh one** (plain Ctrl+Shift+R often isn't enough).
- Do **not** `pkill -f vite` from the tool (it matches the shell's own command
  line and hangs). Kill by port:
  `PID=$(ss -tlnp | grep 5173 | grep -oP 'pid=\K[0-9]+' | head -1); kill $PID`.
- Restart detached with
  `nohup npm run dev > /tmp/opencode/vite.log 2>&1 &`, then verify via curl
  before telling the user it's live.
- **Playwright** reuses an existing server on :5173 unless `CI=1` or a separate
  test project is configured (`TEST_SUPABASE_URL`); then it boots its own.

---

## 4. Repository layout

| Path | Status | Contents |
|---|---|---|
| `brainstorm.md`, `features.md`, `proposal.md`, `proposal-simple.md` | Historical | Original idea/proposal material (old stack; kept, not authoritative) |
| `AGENTS.md` | **Current** | This file |
| `docs/` | **Live site** | Jekyll site deployed to GitHub Pages |
| `docs/proposal.md` | Current | Proposal as rendered on the site |
| `docs/tutorial/` | Live | 7-page Jekyll tutorial "Build a Blind-Review Submission Form with Supabase" |
| `docs/slides/` | Live | Marp slide deck + custom Cayman theme |
| `.github/workflows/jekyll-gh-pages.yml` | Live | Builds Jekyll + Marp, deploys to Pages |
| `tutorial-study-guide.md` | Gitignored | Private class cheat sheet — never stage/push |
| **`app/`** | **The app** | React + Vite + TS submission manager |
| `app/src/pages/` | Current | HomePage, GenrePage, GenreRulesPage, SubmitPage, LoginPage, ForgotPasswordPage, ResetPasswordPage, ReaderQueuePage, ReaderSubmissionPage, EditorDashboardPage, EditorSubmissionPage |
| `app/src/components/` | Current | `RequireAuth.tsx` (route guard), `MemberManager.tsx` (staff admin, now DB-backed), `ExportPanel.tsx` (CSV export, session-scoped) |
| `app/src/lib/` | Current | `supabase.ts` (client + `authLinkError`), `auth.tsx` (AuthProvider/`useAuth`/recovery flag/`memberLoading`), `appUrl.ts` (where emailed links point), `authLink.ts` (dead-link parsing), `roles.ts` (pure role helpers + `landingFor`), `statuses.ts` (workflow ladder + badge tones + the reader-facing label), `membership.ts` (`joinClub` + `MembershipClient` seam), `csv.ts` + `exportData.ts` (pure CSV building, formula-safe), `download.ts` (blob save), `demoAccounts.ts` (published demo logins), `scrub.ts` (metadata stripping + `storageNameFor`) |
| `app/src/lib/*.test.ts` | Current | `roles`, `membership`, `statuses`, `appUrl`, `authLink`, `csv`, `exportData`, `scrub` (unit), `rls` (live anon boundary), `rls-auth` (auth boundary, env-gated) |
| `app/src/data/` | Current | `genres.ts` (real Kennings rules — source of truth), `members.ts` (roles + types). The fake reader data (`submissions/manuscripts/ratings.ts`) was deleted Oct 29 when the reader flow went onto Supabase |
| `app/supabase/migrations/` | **Canonical** | Versioned schema (tables, functions, RLS, storage, audit) applied with `npm run db:push` |
| `app/e2e/` | Current | Playwright specs: public submission, blind-review UI, editor gating, authenticated roles, `password-recovery` (request form, expired link, rejected link), `metadata-scrub` (a real JPEG through a real canvas) |
| `app/supabase/config.toml` | Current | Supabase project settings as code (project ref, auth, storage, ports) |
| `app/supabase/tests/rls.test.sql` | Current | pgTAP policy tests (needs Supabase CLI + Docker) |
| `app/playwright.config.ts`, `app/vite.config.ts`, `app/test/setup.ts` | Current | Test/build config; setup loads `.env.test` |
| `app/.env` / `app/.env.test` | Gitignored | Supabase creds / test accounts. `.env.test` is **populated on this machine** (two throwaway accounts) but never committed |
| `app/.env.test.example` | Current | Template for the authenticated tests |
| `app/.env.production` | Current | Committed project URL + publishable key, so the Pages build needs no secrets |
| `app/README.md` | Current | Real project docs (live URLs, RLS matrix, commands, known gaps) — replaced the Vite boilerplate Oct 29 |
| `app/supabase/seed.sql` | **Current** | Six sample submissions + authors (`on conflict do nothing`), applied to the live project Oct 29; matching sample manuscripts live under the `manuscripts/samples/` storage prefix |
| `app/supabase/functions/` | **Planned** (§13 wk 5) | Edge Functions — metadata stripping (issue #3), decision-letter email |
| `docs/404.html` | Current | GitHub Pages fallback: bounces `/app/*` deep links back into the SPA, leaves real 404s alone |
| `netlify.toml` / `vercel.json` | Not needed | Hosting is GitHub Pages (§5); no static-host config required |

The committed `docs/_site` is generated output — don't hand-edit.

---

## 5. Stack (locked — do not re-litigate)

| Piece | Role | Notes |
|---|---|---|
| React 19 + Vite 8 + TypeScript | Frontend SPA | routed with react-router-dom v7 |
| React Hook Form + Zod | Forms + validation | used by the submission form |
| Supabase | Postgres + Auth + Storage + Edge Functions | project `qsynlsbltpnhzncpqerz` |
| Supabase RLS | Blind-review enforcement | Readers have NO policy on `authors` |
| Supabase Edge Function | The only server-side code | sends email (planned) |
| Resend | Transactional email | status links / decision letters (planned) |
| Vitest + Playwright | Testing | set up and green |
| fflate + pdf-lib | Scrubbing metadata out of uploads | `fflate` rewrites the `.docx` zip; `pdf-lib` is a **lazy chunk** (~176 kB gz), fetched only when someone submits a PDF |
| oxlint | Linting | `npm run lint` |
| GitHub Pages | Hosting | Free; no new accounts. App served at `/app/` under the existing Jekyll site — **not** at the site root, which would break the proposal link. The live URL is **repo-bound** (it belongs to the `Hanover-CS461` org); a custom domain is the post-deadline fix — see §13 |

**Why this stack (settled):** scale is tiny (200–300 subs/season, ~20 staff), so
the real criteria are "fewest moving parts after graduation" and "fastest to
build." Prisma was dropped (service role bypasses RLS, contradicting the
security story); Next.js was dropped for React + Vite (login-gated, no SEO
need).

---

## 6. Data model & the security core

The security story **is** the project. RLS + a separate `authors` table means a
Reader cannot read identity even by calling the database directly.

**Tables** (`app/supabase/migrations/`):
- `submissions` — `id, title, genre, status, decided_at, hanover_student,
  manuscript_path, created_at`. **No author identity here** (readers may read this) —
  which is why `manuscript_path` is `<uuid>/manuscript.<ext>` and never the author's
  filename (decision 17, §9).
  Two check constraints make the workflow structural (`20261110000000`):
  `submissions_status_check` limits `status` to the six ladder values, and
  `submissions_decided_at_matches_status` requires a decision and its timestamp to
  travel together — so `set status = 'Accepted'` without `decided_at` is **rejected
  by Postgres**, not merely hidden by the UI.
- `authors` — `id, submission_id (unique FK), name, email, mailing_address, bio,
  created_at`. Readers have **no** policy → blind.
- `members` — `id, user_id (FK auth.users, unique), email, name, role, active,
  created_at`. Roles are **snake_case**: `reader`, `staff_editor`, `editor`,
  `co_editor`, `chief_editor`, `advisor`.
- `member_audit` — `actor_id, target_user_id, action, old_value, new_value,
  created_at`; written by a trigger on `members` update.

**Helper functions** (all `security definer`):
- `member_count()` — total members (used by the bootstrap policy).
- `is_active_member()` — caller is an active member (gates submissions/storage).
- `is_editor()` — caller is an active member with any editor role.
- `is_chief_editor()` — caller is an active chief editor (gates member admin).

**Key policies:**
- anon may INSERT submissions/authors (public form) and upload to Storage; anon
  has **no** SELECT on anything.
- active staff may SELECT submissions and download manuscripts; editors may
  UPDATE submissions and SELECT authors.
- members may INSERT their own row once — role `reader`, **or** `chief_editor`
  only when `member_count() = 0` (the bootstrap rule). They may read their own
  row; the Chief Editor may read/update all rows.

**Revocation is immediate:** `is_editor()`, `is_active_member()`, and
`is_chief_editor()` all check `active`, so deactivating a member cuts access on
the next request without touching their token.

**Live DB facts (introspected Oct 13, 2026):** `members` has
`id,user_id,email,name,role,active,created_at`; `member_count()` returns 1;
`is_editor()` exists. The live schema uses **snake_case roles + a `name`
column** — the tutorial (§7) does not.

### Hard-won lesson: insert-without-read-back

A role with only an INSERT policy cannot read back the row it just inserted
(RETURNING is refused). The public form avoids `.insert().select().single()` by
generating the `submission_id` with `crypto.randomUUID()` in the browser and
inserting an explicit id. (Members can read their own row, so `joinClub`'s
insert-with-return is fine.)

---

## 7. Conventions & gotchas

### The live database matches the repo (as of Nov 5, 2026)

**Verified by probing `qsynlsbltpnhzncpqerz` on Oct 29 and again Nov 5, 2026.** The init
migration and the `ratings` migration are applied: all five tables (`submissions`,
`authors`, `members`, `member_audit`, `ratings`) and all four helpers (`member_count()`,
`is_editor()`, `is_active_member()`, `is_chief_editor()`) respond, the Member Manager and
the reader queue work against real rows, and `npm test` runs **24/24** with no skips when
`.env.test` is present.

It was applied by **pasting `app/supabase/migrations/20261013000000_init.sql` into the
dashboard SQL editor**, not with `npm run db:push` — the CLI has never been linked.
Two consequences:
- Nothing is recorded in `supabase_migrations.schema_migrations`, so the CLI thinks the
  migration is unapplied. It is idempotent, so a later `db:push` is safe (it re-runs
  harmlessly) — but expect it to try.
- Anything needing `--linked` (`db:push`, `db query`, `config push`) is unavailable
  until `npm run db:login` + `db:link` succeed. **The SQL editor is the working path.**

**Lesson: a paused project drops its DNS record.** On Oct 27 the project read as
NXDOMAIN — indistinguishable from deletion — and was wrongly written off as dead. It
was merely paused (free tier, ~1 week idle). The reliable signal is HTTP, not DNS: a
paused project resolves and returns Cloudflare **521 "Web server is down"**, and
"Restore project" brings the data back intact. Check the dashboard before concluding a
project is gone. Restore takes a few minutes and the schema cache lags — right after a
restore, tables may 404 with `PGRST205` before they reappear.

**Also live (as of Nov 5, 2026):** email confirmation is **OFF**
(`mailer_autoconfirm: true`), so sign-up returns a live session immediately —
`config.toml` already had `enable_confirmations = false`, so file and dashboard
agree. `member_count()` is **4**, so the "first sign-up becomes Chief Editor"
bootstrap will never fire again — new sign-ups join as `reader`. The current Chief
Editor was promoted by hand:
`update public.members set role = 'chief_editor' where email = '…';`. This is why §13
publishes demo accounts.

### Other gotchas

- **Metadata stripping is done in the browser, at intake** (`app/src/lib/scrub.ts`, Nov
  12). Images are re-encoded through a canvas (EXIF/IPTC/XMP/PNG text chunks all die
  with the old bytes), `.docx` is unzipped and its `dc:creator` / `cp:lastModifiedBy` /
  `Company` / `Manager` fields are blanked, and PDFs get their info dictionary cleared
  with `pdf-lib` (loaded on demand — a Word submission never downloads it). **`.doc` is
  allowed but cannot be scrubbed**, so the form warns as soon as one is chosen; that is
  the one format where the promise is qualified. Also: PDF XMP packets are not reached
  by `pdf-lib`, and an author who skips the app entirely can upload straight to Storage
  with the publishable key — the boundary there is RLS, not the form. See §8 #3.
- **`manuscript_path` must never contain the author's filename.** It did until Nov 12
  (`<uuid>/Alexis_Brockway_draft3.docx`), and readers can read `submissions`, so that
  handed them the identity the whole design exists to withhold — a bigger hole than
  EXIF, and one no amount of form design closes. Uploads now store
  `<uuid>/manuscript.<ext>` (`storageNameFor()` in `lib/scrub.ts`). If you ever change
  the upload path, keep the name generic.
- **Dev email confirmation:** Supabase confirms emails by default, which breaks
  fake test accounts. Either confirm via SQL
  (`update auth.users set email_confirmed_at = now(), confirmation_token = ''
  where email = '<email>';`) or turn off "Confirm email" under Authentication →
  Providers → Email.
- **Supabase free tier pauses projects after ~1 week of inactivity** — the
  handoff guide must document the reactivation ritual before each reading
  period. A paused project can only be resumed from a dashboard the reader has
  no access to, so for the public demo URL this needs a **keep-alive cron**
  (§13 week 2). The free tier also caps you at **2 active projects**.
- **Tutorial vs real schema mismatch:** `docs/tutorial/` teaches title-case roles
  (`'Chief Editor'`/`'Reader'`) and a `members` table without `name`, while the
  app + live DB use snake_case + `name`. The tutorial is a self-contained
  teaching artifact, but reconciling it with the real schema is a known
  to-do.
- **Jekyll/Liquid:** Liquid parses `{{`/`{%` even inside fenced code blocks — a
  JSX `value={{ … }}` triggers a syntax error. Hoist to a variable or wrap in
  `{% raw %}…{% endraw %}`. kramdown prefixes heading anchors that start with a
  number. Verify with
  `cd docs && bundle exec jekyll build --destination /tmp/opencode/site`
  (expect `done in Xs`, no warnings).
- **Two keys, only one secret.** `sb_publishable_…` is public by design: it is
  committed in `app/.env.production` **on purpose** and Vite inlines it into the
  bundle every visitor downloads. It identifies the project and grants nothing —
  RLS is the boundary. `sb_secret_…` / `service_role` **bypasses RLS entirely** and
  must only ever live in Edge Function secrets (`supabase secrets set`), a local
  gitignored env file, or GitHub repository secrets. Verified Nov 5: no secret key
  exists anywhere in the tree or in git history. With the public key a stranger can
  *submit a manuscript*, *upload a file*, and *sign up* — and can read **nothing**
  (authors, members, ratings all return `[]`). Rotating the publishable key is never
  an incident; rotating the secret key is one click at Settings → API.
- **The demo credentials are in the source on purpose.** `app/src/lib/demoAccounts.ts`
  holds the two throwaway logins, and `/login` prints them. This is the §13 decision,
  not a leak: those accounts see seeded fictional data only (verified Nov 12 — all 10
  submissions and 9 author rows are Sep 24 probes and the Oct 29 samples), and the
  bundle's only key is the publishable one. The real consequence to remember is that
  **they are the same two accounts `app/.env.test` signs in as**, so `.env.test` being
  gitignored no longer hides anything — and a visitor who changes a demo role breaks
  `npm run test:e2e` locally. Worth a line in any handoff talk.
- **Anything that routes on the role must wait for the member row.** `member` is null
  both *before* the lookup finishes and for a session that has no `members` row, so a
  page that reads `member?.role` during that gap sees a reader. `AuthProvider` now
  exposes `memberLoading` and both `LoginPage` and `RequireAuth` wait on it; without
  that, an editor is briefly mis-routed to `/reader` on every sign-in. `landingFor()`
  in `lib/roles.ts` is the single rule for "where does this role belong".
- **A CSV is executable content.** Exported cells are prefixed with an apostrophe when
  they start with `=`, `+`, `-` or `@`, because a submission titled
  `=HYPERLINK("http://…"&A1)` would otherwise run on open in Excel or Sheets. That is
  `escapeCell()` in `lib/csv.ts`, and it is why the CSV builder is a pure module with
  tests rather than string concatenation inside a button handler.
- **Storage uploads must not use `x-upsert`.** Anon has an INSERT policy on
  `storage.objects` and deliberately **no** UPDATE policy, so an upsert fails with a
  403 "violates row-level security". A plain
  `POST /storage/v1/object/manuscripts/<path>` works.
- **A read-only suite cannot test an upload by uploading.** There is no DELETE policy on
  `submissions` and anon cannot delete Storage objects, so a browser test that pressed
  Submit would leave a permanent row in the project a grader looks at. The scrubbing spec
  gets around it by importing the app's own module *in the page* — in dev, Vite serves
  `/src/lib/scrub.ts`, so `page.evaluate(() => import('/src/lib/scrub.ts'))` runs the real
  scrubber on a real `File` with no form and no write
  (`e2e/metadata-scrub.spec.ts`). Use the same trick for any other intake logic that
  cannot be exercised without writing. Two consequences to remember: the spec only works
  against the dev server (the deployed bundle has no per-module URLs), and the image
  path — which needs a canvas — is the one piece of scrubbing that cannot be a unit test.
- **Blank `.env.test` values are not "absent".** `process.env.X ?? fallback` keeps the
  empty string, so a template-following `.env.test` with `TEST_SUPABASE_URL=` silently
  skipped the whole authenticated suite. `rls-auth.test.ts` now trims and treats `''`
  as unset (fixed Nov 5).
- **Playwright `click()` does not wait for sign-in.** `authenticated.spec.ts`'s helper
  used to click submit and return, so a test that navigated immediately reloaded the app
  before the session was persisted and `RequireAuth` bounced it to `/login` — a race that
  looked exactly like a broken auth guard. The helper now waits for the post-login
  redirect (`expect(page).not.toHaveURL(/\/login$/)`). Any future spec that signs in
  must do the same, or await a heading.
- **`getByLabel('Password')` is a substring match, so it also hits the "Show password"
  toggle.** The password fields now carry a Show/Hide button whose `aria-label` contains
  the word "password", and Playwright matched both the input and the button — a strict-mode
  violation in `authenticated.spec.ts`'s sign-in helper. Pass `{ exact: true }` when
  targeting the field. Two related traps in the same component
  (`components/PasswordField.tsx`): the toggle must be a **sibling** of the `<label>`, not
  a child, or it joins the label's control and renames the input to "Password Show
  password" for a screen reader; and it must say `type="button"`, or clicking it submits
  the form. `e2e/password-toggle.spec.ts` covers both.
- **Deployment sequencing: paste the migration before pushing code that reads a new
  column.** PostgREST returns `42703 column … does not exist` for a `select` of a
  column the table doesn't have yet, which blanks the page. Because the CLI has never
  been linked, the migration is a manual paste by the user, so the safe order is:
  write the migration → commit → *user pastes* → push. The decision workflow
  (`decided_at`) is currently in exactly that state.
- **`status` and `decided_at` must be written together.** The
  `submissions_decided_at_matches_status` constraint rejects a decision with no
  timestamp *and* a timestamp on a workflow status. Any code (or hand-run SQL) that
  updates only `status` to `Accepted`/`Hold`/`Rejected` now fails with a check
  violation — intended, and it surfaces bugs loudly instead of storing an inconsistent
  row.
- **A password-reset link must land on the app root, never on `/reset-password`.**
  On Pages a deep link is answered by `404.html`, which stashes the path and bounces to
  `/app/`, and `main.tsx` restores it with `history.replaceState`. But the Supabase client
  is constructed at module import — *before* that restore runs — so it reads the URL while
  the page is still on the fallback, sees no `#access_token`, and quietly drops the
  recovery token. `redirectTo` is therefore the app root from `lib/appUrl.ts` (always the
  **deployed** URL, never `window.location.origin`, so a request made on a dev copy does
  not produce a localhost link), the client fires `PASSWORD_RECOVERY`, and `AuthProvider`
  exposes a `recovery` flag that the router uses to forward to the form.
- **A rejected `redirect_to` is NOT harmless — it falls back to the project's `site_url`.**
  `lib/appUrl.ts` is only half the fix; the other half is the dashboard, and the fallback
  is exactly how the app spent two days sending every reset email to a machine that does
  not exist. Prove the current state in one request — an invalid token makes GoTrue
  redirect without sending mail:
  ```bash
  curl -s -o /dev/null -D - "$URL/auth/v1/verify?token=nope&type=recovery&redirect_to=$APP_ROOT" | grep -i location
  ```
  `location:` must start with the Pages URL. On Nov 11 it printed
  `http://localhost:3000#error=…` — i.e. the allow-list was missing the app, and every
  reset email in the project pointed at a machine that does not exist. The allow-list
  *did* accept `localhost:5173` and `localhost:3000`, which is why a link requested from a
  local dev copy looked fine while a link requested from the live site did not.
  **Update Nov 12, evening: fixed, and verified.** All three probes now redirect into
  the Pages app — including the one with **no `redirect_to`**, which is the Site URL
  itself. So both dashboard fields are right and every auth email (reset, confirmation,
  invite, magic link) points at the live app. This took three attempts across two days;
  the lesson stands: **prove a dashboard save from the outside** with the probe below,
  because the page has twice reported success while the project kept the old value.
  What this does *not* prove is delivery — see "auth email is a demo" below.
- **A dead auth link must say so.** Supabase returns failures as
  `#error=access_denied&error_description=…`, which creates no session and fires no event;
  supabase-js ignores it and the visitor lands on the home page with no explanation (that
  is what "the link does nothing" looked like on Nov 11). `lib/supabase.ts` captures the
  fragment at import, before the client rewrites it, and the router forwards it to
  `/reset-password`, which explains it. Any future auth link (magic link, invite) should
  go through the same path.
- **Supabase's built-in auth email is a demo, not a mail service.** The free tier's
  shared sender is heavily rate-limited (a handful per hour — a 429 comes back as "too
  many reset emails") and routinely lands in spam. It is enough to prove the flow, not
  enough for a real reading period; production auth mail belongs on Resend like the
  decision letters (§13). It also means the recovery flow **cannot be tested with the
  `@example.com` demo accounts** — no inbox exists. Create an account with a real address
  to prove it, and reset that account's password.
- **Locked out and the reset email is dead? Set the password in SQL.** The SQL editor runs
  as `postgres`, so this needs no service key and no email:
  ```sql
  update auth.users
  set encrypted_password = crypt('<new password>', gen_salt('bf')), updated_at = now()
  where email = '<their email>';
  ```
  Find the row with
  `select email, created_at::date, last_sign_in_at::date from auth.users order by created_at;`
  (`crypt`/`gen_salt` come from pgcrypto, which ships with every project; if it is missing,
  `create extension if not exists pgcrypto;` first.) **Password sign-in never touches
  `site_url`** — only emailed links do — which is why a locked-out user could still sign in
  the moment the hash was set. Treat this as an emergency lever, not a feature: it skips
  the password policy and leaves no audit row. Use it to get back in, then fix `site_url`
  so the real recovery flow works. It cannot change a role; that is a `members` update
  (`update public.members set role = 'chief_editor' where email = '…';`).
- **A `<select>` is not a safe control for an irreversible action.** The status
  dropdown saves on `change`, so a mouse-wheel scroll over a focused select changes it.
  That is why decisions are buttons behind a `window.confirm`, not three more options.
- **Readers must not see the outcome.** `readerStatus()` in `statuses.ts` renders the
  three decision states as **"With editors"** on both the queue and the reader detail
  page; `statuses.test.ts` asserts the word itself never reaches them. Reversing that is
  one constant, but it is a workflow decision about Kennings, not a technical one.
- **Stray objects in the live bucket:** `manuscripts/probe.txt` (Oct 20, buckets-probe)
  and `manuscripts/samples/probe-test.txt` (Oct 29, upload-path probe). Anon can
  upload by policy but cannot delete (403), so they need the dashboard,
  `supabase storage rm`, or a service-role call. Inert — no author data — but should
  not be left in a project shown to a grader. **Still a §13 task.**
- ~~**Four junk submissions at the top of the reader queue**~~ — **deleted Nov 12.** `curl
  probe`, `node probe`, `titleTitle`, `hello` (all Sep 24 probes) were removed with
  `delete from public.submissions where created_at < '2026-10-01'`, authors cascading.
  Verified from the API afterwards: **6 submissions, 6 author rows**, and the live reader
  queue opens on `The Last Ferry`. There is still **no DELETE policy on `submissions`**,
  so any future cleanup is another SQL paste, not an app action.
- **One orphan auth user:** `kennings.reader@gmail.com` was created while testing which
  domains Supabase's sign-up accepts. It has **no** `members` row, so it is invisible
  in the Staff tab and harmless, but deleting it needs a service-role key.
- **OWASP Top 10** is the security checklist; **broken access control** is the
  project's primary risk (the whole product is a permission boundary).

---

## 8. Open work (GitHub issues)

Repo: `Hanover-CS461/senior-project-2026-2027-Alexis-Brockway`.

### ✅ RESOLVED (Nov 12, evening) — the auth URLs now point at the live app

Password recovery is built, deployed, and **routable**. Both dashboard values are now
right, and all three probes redirect into the Pages app — including the one with **no
`redirect_to`**, which is the Site URL itself.

**Probed live on Nov 12, before and after the fix:**

| Sent as `redirect_to` | Before | After |
|---|---|---|
| the deployed app | `localhost:3000` ❌ | `https://…/app/` ✅ |
| `http://localhost:5173/` | itself ✅ | itself ✅ |
| nothing (the Site URL) | `localhost:3000` ❌ | `https://…/app/` ✅ |
| a foreign site | `localhost:3000` ❌ | `https://…/app/` ✅ |

How it was fixed, for the record: the **Redirect allow-list** got the Pages URL first
(that is why recovery mail started working while nothing else did), and the **Site URL**
was the second, later save. The Site URL is what confirmation / invite / magic-link mail
uses, because those are not built by `lib/appUrl.ts`.

**Re-run this whenever auth mail is suspect — it costs one request and no email:**

```bash
curl -s -o /dev/null -D - "$URL/auth/v1/verify?token=nope&type=recovery&redirect_to=$APP_ROOT" | grep -i location
curl -s -o /dev/null -D - "$URL/auth/v1/verify?token=nope&type=recovery" | grep -i location   # the Site URL itself
```

Both `location:` values must start with the Pages URL. **This is the acceptance test.**

**Still unproven: delivery.** Routing says the link points at the app; it says nothing
about whether Supabase's shared demo mailer delivered it (§7). Prove that once with a
real inbox, then move auth mail to Resend.

1. **#1 — Wire the Member Manager to the `members` table.** *Done and live:* roles,
   deactivate/reactivate, RLS gating, and the audit trail all work against real rows
   (the init migration was applied Oct 29 — see §7). *Remaining:* invite links /
   "join with a code" flow instead of open self-signup (scheduled for §13 week 5).
2. **#2 — Automated testing.** *Closed Nov 10:* Vitest **24/24**, live anon-RLS, and
   Playwright **8/8** including the three authenticated browser tests. Remaining
   optional work: the pgTAP run (needs Docker).
3. **#3 — Strip metadata from uploaded manuscripts at intake.** *Closed Nov 12, in the
   browser* (`app/src/lib/scrub.ts`; reasoning in §13's open fork, now decided). What it
   does: images are re-encoded through a canvas, `.docx` gets `dc:creator` /
   `cp:lastModifiedBy` / `title` / `subject` / `Company` / `Manager` blanked, PDFs get
   their info dictionary cleared. It also stopped the bigger leak — the stored path used
   to be the author's own filename (§7). **Residual risk, stated plainly:** legacy `.doc`
   cannot be scrubbed (the form warns), `pdf-lib` does not reach XMP packets, and anyone
   can skip the form and upload to Storage with the publishable key. Closing that last
   one means dropping the anon upload policy and routing uploads through an Edge Function
   — the right long-term move, deliberately not attempted before the deadline. Proof:
   `lib/scrub.test.ts` (11 tests, including that the PDF's *bytes* no longer contain the
   name) and `e2e/metadata-scrub.spec.ts` (a real JPEG through a real canvas).
4. **#4 — Activate the authenticated RLS tests.** *Closed Nov 10.* `app/.env.test`
   holds two throwaway accounts; the test-Chief was promoted to `chief_editor` and
   everything passes. The suite proves the security story both ways: through the API
   (`is_editor()` false, `SELECT authors` returns `[]`, exactly one visible `members`
   row) and through the browser (a reader sees the queue but no author identity). A
   fresh clone (no `.env.test`) still gets 7 clean skips, and CI has no credentials by
   design.

### Other known gaps / next candidates
- ~~Decision workflow~~ — **done Nov 10**: six statuses in five stages, `decided_at`,
  a confirm-gated decision panel, an undo, and two check constraints. The *notification*
  half (decision letters via Resend) is still absent.
- ~~Reader queue → Supabase~~ — **done** (§13 week 3): `ratings` table with RLS,
  `/reader` login-gated, real queue + detail page.
- ~~Password recovery~~ — **done Nov 11**: `/forgot-password` + `/reset-password`, an
  expired-link state, and a change-password mode. **Gap:** auth email rides Supabase's
  demo mailer (rate-limited, spam-prone) and the `@example.com` accounts cannot receive
  it, so the inbox half is unproven — prove it with a real address, then move auth mail
  to Resend (§7).
- Editor dashboard remainder: reader assignments, internal discussion, decision
  letters, bulk actions.
- ~~**A Reader who signs in lands on `/editor`**~~ — **fixed Nov 12.** Sign-in now
  routes by role (`landingFor()` in `lib/roles.ts`), and the editor wall offers a link
  to `/reader` instead of ending the story.
- Decision letters + email via Resend (submissions now carry all six statuses; only
  the letters are missing).
- ~~Production deploy (Netlify/Vercel)~~ → hosting decided: **GitHub Pages under
  the existing site** (§5, §13 week 2). Post-deadline question is a **custom
  domain**, not a new host — see the end of §13.
- Open questions: Advisor role scope; author-reveal timing; whether bios/cover
  letters are collected; final form fields with the club.

---

## 9. Decision history (condensed — do not re-litigate)

1. Ruled out AI story generators; wanted "English as a whole" (reading,
   analysis, editing, publishing).
2. Candidates: lit-journal manager / close-reading room / scansion instrument.
   **Chose the lit-journal manager.**
3. **Scope: one club, not a platform.** Hardcode their workflow.
4. Simplified the stack to **React + Vite + Supabase + Resend + static host**.
5. Prisma dropped (bypasses RLS); Next.js dropped (login-gated, no SEO need).
6. **The security story IS the project:** RLS + separate `authors` table.
7. **Kennings is the real club.**
8. **The app lives in `app/`**, separate from `docs/`.
9. Supabase project created Sep 24; anon key is `sb_publishable_…`.
10. Auth = in-app self sign-up; first member becomes Chief Editor via an RLS
    policy (no app-side promotion).
11. Insert-without-read-back gotcha → client-generated UUIDs (§6).
12. **One database for the app and the tests** — no second Supabase project. The
    blind-review tests prove the *deployed* policies, which is a stronger claim than
    proving a replica's. The cost is that the suites must stay read-only (§3).
13. **Decisions are an act, not a label.** `Accepted`/`Hold`/`Rejected` carry
    `decided_at`, need a confirm, and are undone explicitly; the workflow dropdown only
    holds the three in-progress states. Enforced by check constraint, not just by the UI.
14. **Readers do not see the outcome.** All three decision states read "With editors" to
    a reader — the author learns from a decision letter, not from a queue badge.
15. **No secret key in the app.** Seeding demo users goes through the sign-up API and
    export goes through the Chief Editor's own session, both of which need only the
    publishable key, so the app's boundary is only ever the RLS boundary. If an Edge
    Function ever needs elevated writes, it gets one named, non-`VITE_` secret used via
    `@supabase/server`'s `withSupabase({ auth: 'secret' })`.
16. **Metadata is stripped in the browser, at intake** (Nov 12), not in an Edge Function.
    The adversary is a careless author whose word processor filled in their name, not
    someone deliberately evading the app, so scrubbing what the form receives removes the
    realistic exposure. An Edge Function would be stricter and could not ship before the
    deadline. The residual hole — an author who skips the form and uploads straight to
    Storage with the publishable key — is written down in §8 #3 rather than papered over.
17. **The stored object name is generic on purpose** (`<uuid>/manuscript.<ext>`).
    `manuscript_path` is visible to readers, so the author's filename in that path leaked
    the identity that blind review exists to withhold. Nothing may reintroduce it: no
    original filenames, no author name in the path, ever.

---

## 10. Working with the user

- CS major **double-majoring in English / Creative Writing**; strong JS/TS from
  coursework, but auth/deploy/RLS/deliverability are NEW.
- **Plain language first. Analogies before jargon** (kitchen/food, ID cards,
  door keys). One decision at a time; avoid big option dumps and large tables.
- The stack must stay simple — the club inherits it after graduation. When they
  say "smaller," they mean it.
- They want features **visible/clickable ASAP**; fake data beats waiting for the
  DB.
- They happily **paste SQL into the Supabase SQL Editor**, but dislike clicking
  through the dashboard UI — prefer a script or do it in the app.
- **A dashboard change they report as "saved" may not be saved — confirm it from the
  outside before building on it.** Twice on Nov 11–12 the Auth → URL Configuration page
  appeared to accept a new Site URL and the live project still answered `localhost:3000`.
  The model is the invalid-token probe in §8: one request, no side effects, no inbox, and
  it reports the truth. When they must touch a multi-field dashboard page, give the exact
  string, say what the screen should look like, and give them a **check step that proves
  the save landed** (refresh and re-read the field) — then verify it yourself.
- **Prefer a credential + API call over a dashboard walkthrough when the page has bitten
  them before.** A short-lived Personal Access Token (Account → Access Tokens, revoked
  right after) lets the agent set the same values with one `PATCH` and prove it, which is
  usually less effort for them than three attempts at a form.
- **Step-by-step:** hand them one step, wait for "done," then the next.
- **Prefer doing it over asking them to.** They will say "just do it" or "do the
  preferred" — so pick a sensible default, execute it, and report what changed. Only
  surface a step when it genuinely requires *their* hands (a click in their signed-in
  browser, a SQL paste, or a credential only they hold). Say plainly which of those it
  is and why the agent can't do it.
- **They ask sharp security questions** ("how do you use the key without putting it in
  the public repo?"). Answer with the concrete evidence — grep the tree and git history,
  show the check's output — rather than reassurance. §7 has the key model.
- **They ask for the handoff file to be updated at the end of a work session**
  ("add everything to the agents file"). Treat `AGENTS.md` as a deliverable, not
  scratch notes: when a unit of work lands, update status, gotchas, decisions, and the
  plan in the same breath — including anything still pending, so the next agent does not
  repeat the investigation.
- If the browser "isn't showing" edits, restart by port (§3) and confirm via
  curl before saying it's live.

---

## 11. Glossary (as the user learned it)

- **Anon / publishable key** — the public "door key" baked into the frontend;
  grants nothing by itself. Now `sb_publishable_…`.
- **Login token** — the "ID card" a staff member gets at login; carries their
  role; checked by RLS on every request.
- **RLS** — database rules deciding what each role can read; makes blind review
  structural.
- **Blind review** — readers see title/genre/manuscript only, never author.
- **Insert-without-read-back** — an INSERT-only role can't use `.insert().select()`;
  generate the UUID client-side instead.
- **Signed URL** — a temporary, time-limited link to a private Storage file
  (the editor detail page uses one).
- **Bootstrap chief editor** — the RLS policy that lets the FIRST sign-up become
  Chief Editor (`member_count() = 0`).
- **Edge Function** — Supabase's serverless function; the only server code.
- **Recusal** — a reader who knows the author locks their vote; the average is
  computed over voters only.
- **Genre → rules → form flow** — writer picks a genre, sees that genre's rules,
  then lands on the form (genre is no longer a form field).
- **Marp** — markdown → slides; deck lives in `docs/slides/`.
- **Roles** — Managing Editor / Reader / Submitter (external, no accounts). The
  Member manager uses the finer 6-role ladder: Reader → Staff Editor → Editor →
  Co-Editor → Chief Editor → Advisor.

---

## 12. Key sources

[1] Submittable CLMP plan: https://submittable.help/en/articles/3512930-how-can-my-literary-organization-receive-a-discounted-clmp-plan
[2] Green Submissions cost article: https://www.greensubmissions.com/articles/what-submittable-costs.html
[3] Duosuma overview: https://duotrope.com/duosuma/overview-publishers-agents.aspx
[4] Moksha pricing: https://moksha.io/pricing/
[5] Green Submissions alternatives: https://www.greensubmissions.com/articles/free-submittable-alternatives.html
[6] CLMP benefits: https://www.clmp.org/join-clmp/benefits/
[7] Supabase docs: https://supabase.com/docs
[8] Vite docs: https://vite.dev
[9] React docs: https://react.dev
[10] Resend docs: https://resend.com/docs
[11] OWASP Top 10: https://owasp.org/Top10/
[12] GitHub Pages docs: https://docs.github.com/en/pages
[13] Kennings submissions/rules: https://kenningsliteraryjournal.com/submissions-1
[14] Marp CLI: https://github.com/marp-team/marp-cli
[15] Marp for VS Code: https://github.com/marp-team/marp-vscode
[16] Supabase API keys (publishable vs. secret): https://supabase.com/docs/guides/api/api-keys
[17] GitHub Pages custom domains: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

Live site: https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/
(including `/tutorial/`)

Live app (live since Oct 29, 2026):
https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/app/

---

## 13. Live-URL plan (Oct 20 → Nov 24, 2026)

**Deadline:** the class requires a live URL to the working app. Target: **Nov 24, 2026**
(5 weeks). This matches the proposal's own timeline — weeks 10–11 are "deploy," week 12
is handoff.

**Not on the critical path:** Kennings' next reading period is next year, so decision
letters, Resend, invite codes, and the club pilot all come *after* this deadline.

**Decisions made (Oct 20):**
- **Host:** GitHub Pages, under the existing Jekyll site, at
  `https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/app/`.
  Chosen over Netlify/Vercel to avoid new accounts and keep one deploy pipeline.
  Consequence: Vite needs a `base` path, `BrowserRouter` needs a matching `basename`,
  and GitHub Pages needs a `404.html` fallback so deep links like `/app/editor/123`
  survive a refresh. The app is NOT at the site root — that would break the existing
  proposal link.
- **Demo accounts:** publish 1–2 throwaway accounts (a Chief Editor and a Reader) in a
  "Demo access" box on the login page, and put the same credentials in the README.
  Publishing credentials for a throwaway project with fake data is *not* a
  vulnerability: the anon key is `sb_publishable_…` and is public by design. The
  `service_role` key still must never be committed. A "join with a code" flow
  (issue #1 remainder) is the nicer artifact and is scheduled for week 5.

### Week 1 — repo is the source of truth; fix the live database ✅ (Oct 29)
- ~~Set `git config user.name` / `user.email`~~ — done: `Alexis Brockway
  <155980055+Alexis-Brockway@users.noreply.github.com>`.
- ~~Push the 6 unpushed commits, then commit the uncommitted work~~ — done; all 8
  commits are on `origin/main` as of `3e1d965`.
- ~~`npm run db:push` to apply `20261013000000_init.sql`~~ — **applied, but not via the
  CLI.** The project was found paused (not deleted) on Oct 27, restored, and the
  migration was pasted into the SQL editor on Oct 29. Live now has `member_audit`,
  `is_active_member()`, `is_chief_editor()`, the audit trigger, and the corrected
  policies. The security story is real. See §7.
- **Still open:** `npm run db:login` + `db:link` have never succeeded (no Supabase PAT
  cached), so `--linked` commands are unavailable. Needed before `config push` in
  week 2 — but the SQL editor covers everything else.
- **Still open:** delete the stray `manuscripts/probe.txt` and
  `manuscripts/samples/probe-test.txt` (see §7). Needs the dashboard,
  `supabase storage rm`, or a service-role call — anon cannot delete.

### Week 2 — a demo-able database, and a live URL (deploy done Oct 29)
- ~~Commit `app/.env.production`~~ and ~~deploy to Pages at `/app/`~~ — **done**. Vite
  `base` is applied only on build (dev stays at `/`), `BrowserRouter basename` comes
  from `import.meta.env.BASE_URL`, and `docs/404.html` stashes deep links in
  `sessionStorage` for `main.tsx` to restore before the router mounts. Verified with
  Playwright against the live URL: `/app/` renders, `/app/submit` restores and lands on
  `/app/submit/genre`, `/app/editor/123` restores then gates to `/app/login`, and
  `/tutorial/does-not-exist` still 404s. **Pushing a workflow change needs the
  `workflow` token scope** (`gh auth refresh -s workflow`).
- ~~`app/supabase/seed.sql`~~ — **done** (Oct 29). Six sample submissions + authors,
  idempotent (`on conflict do nothing`), applied to the live project, with matching
  sample manuscripts under the `manuscripts/samples/` storage prefix. A fresh
  `db:reset` now works.
- **Still open:** a committed seed script that creates the demo auth users via the Admin
  API, reading `SUPABASE_SERVICE_ROLE_KEY` from the environment (never committed).
- ~~`supabase config push` to turn off email confirmation~~ — **moot**: confirmation was
  turned off in the dashboard (`mailer_autoconfirm: true`) and `config.toml` already had
  `enable_confirmations = false`, so file and live agree.
  ⚠️ **CORRECTED Nov 11, then fixed Nov 12.** For two days the live project kept
  Supabase's factory default Site URL `http://localhost:3000`, and its allow-list held
  `localhost:3000` + `localhost:5173` but not the Pages URL — so every auth email pointed
  at a machine that does not exist. `config.toml` was right the whole time; the dashboard
  was never updated, because `config push` needs a linked CLI that has never existed. Both
  fields were set by hand on Nov 12 (allow-list first, Site URL second) and **verified with
  the probe in §8**. Lesson: `config.toml` is not the source of truth for auth URLs — the
  dashboard is, and only a probe tells you what the project actually believes.
- ~~**Keep-alive cron**~~ — **done** (`.github/workflows/keep-alive.yml`, Oct 29). Pings
  `app/.env.production`'s REST endpoint every 3 days and fails loudly if the answer
  isn't 200, so a paused project shows up as a red run instead of a broken app. No
  secrets needed. **Caveat:** GitHub disables scheduled workflows after 60 days of
  repository inactivity — a push re-enables them. After handoff, if the cron stops, any
  commit restarts it. The free-tier 7-day pause window is what it defends against.

### Week 3 — make the reader flow real ✅ (Oct 29)
- ~~New migration: a `ratings` table (score, notes, recusal) with RLS~~ — done
  (`20261029130000_ratings.sql`). A reader writes and reads only their own row while
  active; editors read all; readers still have no policy on `authors`.
- ~~Rewrite `ReaderQueuePage` / `ReaderSubmissionPage` onto real data and gate `/reader`
  behind login~~ — done. Queue splits on the reader's own ratings (To read / Scored),
  the detail page opens the manuscript through a signed URL and upserts score, notes
  and recusal, and `/reader` is behind `RequireAuth`. The fake data files were deleted.
- **Bonus:** the editor submission page now shows the average of non-recused scores,
  the recusal count, and the written notes — replacing the "not wired up" placeholder.
  Reader names are deliberately absent: only the Chief Editor can read `members`, so
  attributing notes needs a policy decision.

### Week 4 — activate the tests, finish the editor workflow ✅ (Nov 10)
- ~~Point `.env.test` at the seeded accounts → the authenticated RLS tests and the
  Playwright role suite stop skipping~~ — **done Nov 5.** Created
  `kennings.reader@example.com` and `kennings.chief@example.com` through the sign-up API
  (confirmation is off, so no email round-trip), gave each a `reader` membership row, and
  wrote `app/.env.test`. Vitest: **14 passed / 1 failed / 0 skipped**.
- ~~Promote `kennings.chief@example.com` to `chief_editor`~~ — **done Nov 10** via the
  Staff tab dropdown (which also exercised the role change + audit trigger). It can't be
  done through the API: the update policy requires `is_chief_editor()`, and the insert
  policy only allows `chief_editor` when `member_count() = 0`.
- **Result:** `npm test` **15/15** at that point (24/24 once the decision workflow and its
  9 unit tests landed), `npm run test:e2e` **8/8**, zero skips. One real bug
  fell out of the first honest browser run — the sign-in helper raced the session write
  (see §7) — and it was a test bug, not an auth bug.
- **Found, not fixed:** a Reader who signs in is sent to `/editor`, where they hit
  *"You need an editor role to view this page."* Correct, but a dead end. Sending
  non-editors to `/reader` after login (or linking to the queue from that message) is a
  five-line improvement. Same path affects a signed-in reader who visits `/login`.
- **Found and fixed:** `TEST_SUPABASE_URL=` (blank, as the template instructs) silently
  skipped the whole suite because `??` keeps `''`. `rls-auth.test.ts` now trims and
  treats empty as unset.
- ~~Editor dashboard: real statuses~~ — **done Nov 10**: six statuses in five stages,
  `decided_at`, decision buttons with a confirm, undo, and the filter tabs derived from
  the shared list. See §7 for the two check constraints and the deployment sequencing.
  **Pending:** the migration still has to be pasted before the commit is pushed. Once it
  is, verify by hand: Accept one seeded submission, confirm the "decided …" date appears,
  then Undo.

### Week 4.5 — password recovery, and the auth-URL autopsy (Nov 11–12)
- ~~Password recovery~~ — **built and live**: `/forgot-password` → email → `/reset-password`,
  with an expired-link state, a change-password mode for signed-in members, and a real
  message when a link is dead. **But it cannot deliver yet** — see the blocker in §8. Three
  failed attempts in a row were all one cause: the project's Site URL is `localhost:3000`.
- **Chronology worth remembering**, because each step looked like a different bug:
  1. a link requested from the local dev copy came back to `localhost:5173` and read as a
     dead link — fixed by building links from the deployed URL (`lib/appUrl.ts`);
  2. the failed click had *consumed* the single-use token, so the retry failed too — and a
     failed link then landed silently on the home page, fixed in `lib/authLink.ts`;
  3. both were symptoms; the cause was the dashboard Site URL, found only by sending an
     invalid token to `/auth/v1/verify` and reading the redirect.
- **Lockout, and the way out:** the user lost the password and the reset email could not
  help, so the account was recovered with the SQL lever in §7
  (`update auth.users set encrypted_password = crypt(...)`). Password sign-in does not
  consult `site_url`; only emailed links do. Recorded because it will happen to the club.
- ~~Paste the decision migration~~ — **done Nov 12.** The `decided_at` column went in
  earlier; the two check constraints (`submissions_status_check`,
  `submissions_decided_at_matches_status`) were pasted the same evening, so the six-status
  ladder is now enforced by Postgres and not only by the UI. Nothing outside the database
  can see a constraint, so if you ever need to re-prove it:
  ```sql
  select conname from pg_constraint
  where conrelid = 'public.submissions'::regclass and contype = 'c' order by conname;
  ```
- ~~**Still open from week 4:** a Reader who signs in lands on `/editor`~~ — **fixed
  Nov 12** by `landingFor()` in `lib/roles.ts` plus a link on the editor wall.

### Week 5 — metadata stripping, docs, buffer
- ~~Export~~ — **done Nov 12, in the app rather than a script.** The editor dashboard's
  **Export** tab writes submissions + authors + average score, reader scores and notes,
  and the staff list (Chief Editor only) as CSV, through the signed-in session, so RLS
  governs it and no credential is stored anywhere. `npm run db:export` was never built
  and is not needed: a browser button is the same data with no key to hold. Pure logic
  in `lib/csv.ts` + `lib/exportData.ts`, 18 unit tests, one e2e that watches a real
  download.
- ~~Demo access~~ — **done Nov 12.** `/login` lists both demo accounts with one-click
  sign-in (`lib/demoAccounts.ts`), and the README table is filled in.
- ~~Strip manuscript metadata at intake~~ — **done Nov 12, browser-side** (`lib/scrub.ts`,
  issue #3 closed). Images re-encoded, `.docx` creator fields blanked, PDF info cleared;
  `.doc` warned about. The upload path also stopped carrying the author's filename.
- Final docs pass.

**After the 5 weeks:** decision letters + Resend (and move **auth email** onto Resend
too — the built-in mailer is a demo, §7), join-with-a-code, real club pilot.

### After Nov 24 — making the URL the club's

Hosting settled: the app is a **static bundle** (one HTML, one JS, one CSS) plus an
already-hosted Supabase backend, so any static host works and nothing is host-locked.
Confirmed healthy Nov 5: site 200, `/app/` 200, Supabase 200, keep-alive green Nov 1 and
Nov 4.

**Do not migrate hosts before the deadline.** It works, it was verified in a real
browser, and it is the graded deliverable. Order of operations afterwards:

1. **Custom domain — the change that actually matters.** The app currently lives at a
   URL owned by the `Hanover-CS461` class org, which will not outlive the course.
   Kennings already owns `kenningsliteraryjournal.com`, so `app.kenningsliteraryjournal.com`
   is a DNS record, not a purchase:
   - add a `CNAME` file containing the domain to the published site
   - DNS: `CNAME` → `hanover-cs461.github.io`
   - repo → Settings → Pages → set the domain, tick **Enforce HTTPS** (free cert)
   - update `config.toml`'s `site_url` + `additional_redirect_urls`, the README, and §12
   - **Blocker:** access to Kennings' DNS. If that isn't available, design around the
     `github.io` URL rather than planning for a domain.
2. **Transfer the repo** to a Kennings org/account so the code outlives the course. The
   Pages URL changes on transfer — which is exactly why the domain should come first, so
   links survive the move. (A fork keeps the original but leaves two copies to sync.)
3. **Only then consider a different host.** Netlify or Cloudflare Pages would skip the
   `404.html` hack (native SPA rewrites) and let the app build in its own pipeline
   instead of sharing one crowded Jekyll+Marp+app workflow — a maintainability win, not
   a functional one, paid for with an account. Do **not** move the app to the site root:
   that breaks the existing proposal link (§5).

Hosting never fixes the free-tier Supabase pause — that stays the keep-alive cron's job.

### Open forks (decide before week 5)
1. ~~**Where does metadata stripping run?**~~ — **decided Nov 12: browser-side**, and it
   is built (`lib/scrub.ts`, issue #3 closed). The reasoning, since the "correct" answer
   was the Edge Function: the adversary is a careless author whose word processor filled
   in their name, not someone deliberately evading the app, so scrubbing what the form
   receives removes the realistic exposure. The Edge Function needs a deployed function
   and a service key and could not ship before the deadline; the strictest option (drop
   the anon upload policy, route everything through the function) remains the right
   long-term move and is written up in §8 #3 as the known residual risk.
2. **Free tier vs. paid.** The 7-day pause is the one thing that can silently break the
   live URL after handoff. A keep-alive cron is free but can fail; a paid plan cannot
   pause. A pause only breaks the *data*, not the *page* — but a grader still sees a
   broken queue.
3. ~~**Seed the live project, or leave it empty?**~~ — **resolved**: seeded, with the
   rows clearly labelled as sample data.

### Credentials needed to start week 1
1. **Supabase personal access token** — Dashboard → Account → Personal Access Tokens.
   Needed for `npm run db:login`.
2. **Project database password** — Dashboard → Project Settings → Database. Needed for
   `npm run db:link`.
3. ~~**Git name and email**~~ — done Oct 29 (see §3).

### Useful CLI commands confirmed present in v2.120.0
`supabase db query --linked` (runs SQL against the linked project — good for auditing
`pg_policies` without a DB password), `supabase config push`, `supabase db push
--include-seed`, `supabase storage rm`, `supabase functions deploy`.
