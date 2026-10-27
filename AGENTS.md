# AGENTS.md

*Read this first.* This is the onboarding/handoff file for any AI agent (or
human) working in this repo. It replaces the old `project-context.md`. Last
updated **Oct 20, 2026**.

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

## 2. Current status (Oct 20, 2026)

- **Proposal** — DONE, live on GitHub Pages (URL at the end of §12).
- **App** lives in `app/` (React + Vite + TS), separate from `docs/` (the
  Jekyll site). Backend is **Supabase**, live in project `qsynlsbltpnhzncpqerz`
  (free tier). **Not deployed yet** — the live URL is the §13 goal.
- **Submission flow** — DONE and wired to Supabase (file → Storage, then
  `submissions` + `authors` rows).
- **Auth** — DONE: in-app sign-up/sign-in; the first sign-up becomes Chief
  Editor (enforced by RLS), everyone after joins as Reader. **On the live
  project this bootstrap no longer fires** — `member_count()` is 1, so a new
  sign-up joins as a Reader, and email confirmation is still ON. See §7.
- **Editor dashboard** — Queue reads real data; `/editor/:id` reads real
  submission + author and saves status. **Member Manager is implemented against
  the `members` table** (role changes + soft deactivate/reactivate) with an audit
  trail — in `app/supabase/migrations/20261013000000_init.sql`, but **not yet
  applied to the live project**. Read the "live database is behind the repo"
  note in §7 before trusting any of it; §13 has the fix.
- **Reader queue** — still **fake data** (`app/src/data/*.ts`); notes/scores are
  local state only and are **not** login-gated yet.
- **Tests** — Vitest + Playwright are set up and green (unit + anon-RLS + UI
  E2E). The authenticated reader-vs-editor suites are written but **skipped**
  until test credentials are supplied; activating them is tracked in issue #4.
- **Open work** — issues #1–#4 (§8). The immediate plan is §13: a live URL by
  **Nov 24, 2026**.

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
| `npm test` | Vitest: unit + live anon-RLS tests |
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
- **Authenticated tests** read `app/.env.test` (gitignored; template is
  `app/.env.test.example`). Without it those suites skip cleanly.
- **Git commit identity is unconfigured** — commits auto-use
  `root <root@Alexiscomp.localdomain>`. Set `git config user.name/user.email` if
  you want proper authorship.
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
| `app/src/pages/` | Current | HomePage, GenrePage, GenreRulesPage, SubmitPage, LoginPage, ReaderQueuePage, ReaderSubmissionPage, EditorDashboardPage, EditorSubmissionPage |
| `app/src/components/` | Current | `RequireAuth.tsx` (route guard), `MemberManager.tsx` (staff admin, now DB-backed) |
| `app/src/lib/` | Current | `supabase.ts` (client), `auth.tsx` (AuthProvider/`useAuth`), `roles.ts` (pure role helpers), `membership.ts` (`joinClub` + `MembershipClient` seam) |
| `app/src/lib/*.test.ts` | Current | `roles`, `membership` (unit), `rls` (live anon boundary), `rls-auth` (auth boundary, env-gated) |
| `app/src/data/` | Mixed | `genres.ts` (real Kennings rules — source of truth), `members.ts` (roles + types). `submissions/authors/manuscripts/ratings.ts` are still fake reader data |
| `app/supabase/migrations/` | **Canonical** | Versioned schema (tables, functions, RLS, storage, audit) applied with `npm run db:push` |
| `app/supabase/config.toml` | Current | Supabase project settings as code (project ref, auth, storage, ports) |
| `app/supabase/tests/rls.test.sql` | Current | pgTAP policy tests (needs Supabase CLI + Docker) |
| `app/e2e/` | Current | Playwright specs: public submission, blind-review UI, editor gating, authenticated roles |
| `app/playwright.config.ts`, `app/vite.config.ts`, `app/test/setup.ts` | Current | Test/build config; setup loads `.env.test` |
| `app/.env` / `app/.env.test` | Gitignored | Supabase creds / test accounts |
| `app/.env.test.example` | Current | Template for the authenticated tests |
| `app/.env.example` | **Planned** (§13 wk 2) | Project URL + publishable key, so a fresh clone runs with no setup |
| `app/supabase/seed.sql` | **Planned** (§13 wk 2) | Demo submissions/authors/ratings. **Does not exist yet**, but `config.toml` already points `db.seed.sql_paths` at `./seed.sql`, so `db:reset` fails without it |
| `app/supabase/functions/` | **Planned** (§13 wk 5) | Edge Functions — metadata stripping (issue #3), decision-letter email |
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
| oxlint | Linting | `npm run lint` |
| GitHub Pages | Hosting | Free; no new accounts. App served at `/app/` under the existing Jekyll site — **not** at the site root, which would break the proposal link |

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
- `submissions` — `id, title, genre, status, hanover_student, manuscript_path,
  created_at`. **No author identity here** (readers may read this).
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

### The live database is behind the repo — the init migration was never applied

**Verified by probing `qsynlsbltpnhzncpqerz` on Oct 20, 2026.** The live project
predates the member-management work; `app/supabase/migrations/20261013000000_init.sql`
has never been pushed.

Present live: `submissions`, `authors`, `members` (has `name` and `active`),
`member_count()`, `is_editor()`, and the private `manuscripts` bucket.
Absent live: `member_audit` (404), `is_active_member()` (404), `is_chief_editor()`
(404), `log_member_change()` (404).

Consequences, all live today:
- The audit trail cannot write (no table).
- The Chief Editor cannot read or update other members' rows (no `is_chief_editor()`
  policy), so the Member Manager Staff tab is effectively empty.
- Deactivating a member does not revoke access (no `is_active_member()` check).
- The submission/manuscript read policies live predate the member work. Because
  `is_active_member()` is absent, the current "active staff" policy **cannot** exist,
  so reads are likely governed by the older `"authenticated can read submissions"`
  with `using (true)` — i.e. any signed-in account, not just staff. **Verify with
  SQL once linked** (`select * from pg_policies;`) before trusting the live read
  boundary; the authenticated test suite (issue #4) will settle it.

**Fix:** `npm run db:push` (see §3). The init migration is idempotent
(`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY` first) and applies cleanly to
the already-provisioned remote project.

**Also live:** email confirmation is ON (`mailer_autoconfirm: false`), so self-signup
requires clicking a confirmation link; and `member_count()` = 1, so the "first sign-up
becomes Chief Editor" bootstrap no longer fires — a new sign-up joins as a Reader.
This is why §13 publishes demo accounts.

### Other gotchas

- **Metadata stripping is NOT done yet.** Manuscript files must be scrubbed at
  intake — images (EXIF via `exifr`), PDFs (`pdf-lib`), and `.docx` (a zip with
  author data in `docProps/core.xml`). Post-process server-side (edge function),
  not in the browser. Tracked in issue #3.
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
- **Stray file in the live bucket:** `manuscripts/probe.txt` (6 bytes of text) was
  created in the live project on Oct 20, 2026 while an agent was verifying that the
  bucket exists and is private. Anon can upload by policy but cannot delete (403), so
  it needs the dashboard, `supabase storage rm`, or a service-role call to remove.
  It is inert — no author data — but should not be left in a project shown to a
  grader. **Week 1 task in §13.**
- **OWASP Top 10** is the security checklist; **broken access control** is the
  project's primary risk (the whole product is a permission boundary).

---

## 8. Open work (GitHub issues)

Repo: `Hanover-CS461/senior-project-2026-2027-Alexis-Brockway`.

1. **#1 — Wire the Member Manager to the `members` table.** *Core done in code:*
   roles + deactivate persist, RLS gating, audit trail, `is_editor()` checks
   `active`. **Not live** — see the §7 note; `npm run db:push` is the fix.
   *Remaining:* invite links / "join with a code" flow instead of open
   self-signup (scheduled for §13 week 5).
2. **#2 — Automated testing.** Largely done: Vitest unit + live anon-RLS +
   Playwright UI E2E are green. Remaining is the authenticated layer's
   activation (see #4) and the optional pgTAP run.
3. **#3 — Strip metadata from uploaded manuscripts at intake** (exifr / pdf-lib /
   `.docx`), server-side. Scheduled for §13 week 5; the open fork is *where* it
   runs (Edge Function vs. browser).
4. **#4 — Activate the authenticated RLS tests.** Needs Chief/Reader accounts and
   `app/.env.test` filled in. The suites `skip` until then. §13 week 4 reuses the
   demo accounts from week 2 rather than provisioning a separate project.

### Other known gaps / next candidates
- Reader queue → Supabase: a `ratings` table so notes/scores persist, and
  login-gating the `/reader` routes. (§13 week 3.)
- Editor dashboard remainder: reader assignments, internal discussion, decision
  letters, bulk actions.
- Decision letters + email via Resend (only 3 statuses exist today: Received /
  In review / Shortlist).
- ~~Production deploy (Netlify/Vercel)~~ → hosting decided: **GitHub Pages under
  the existing site** (§5, §13 week 2).
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
- **Step-by-step:** hand them one step, wait for "done," then the next.
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

Live site: https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/
(including `/tutorial/`)

Live app (planned, §13 week 2):
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

### Week 1 — repo is the source of truth; fix the live database
- Set `git config user.name` / `user.email` (all 6 unpushed commits are currently
  authored by `root <root@Alexiscomp.localdomain>`).
- Push the 6 unpushed commits, then commit the uncommitted work
  (`app/supabase/migrations/`, `app/supabase/config.toml`, `app/package.json`,
  `AGENTS.md`).
- One-time CLI auth: `npm run db:login` (paste a personal access token) →
  `npm run db:link` (paste the project DB password).
- `npm run db:push` — applies `20261013000000_init.sql`, so live finally gains
  `member_audit`, `is_active_member()`, `is_chief_editor()`, the audit trigger, and
  the corrected policies. **Highest-value hour of the project:** it is the difference
  between the security story being real and being aspirational.
- Delete the stray `manuscripts/probe.txt` left by agent probing (see §7).

### Week 2 — a demo-able database, and a live URL
- `app/supabase/seed.sql` (does not exist yet — `config.toml` already points at
  `./seed.sql`, so `db:reset` fails without it). Seed demo submissions, authors, and
  ratings, reusing the titles/text already in `app/src/data/submissions.ts` so the
  demo looks identical before and after the reader flow goes live. Must be idempotent
  (`on conflict do nothing`).
- A committed seed script that creates the demo auth users via the Admin API, reading
  `SUPABASE_SERVICE_ROLE_KEY` from the environment (never committed).
- `supabase config push` to turn off email confirmation — **but first fix `site_url`
  and `additional_redirect_urls` in `config.toml`**, which still point at
  `http://127.0.0.1:3000`. Pushing those as-is breaks auth redirects on the live site.
- Commit `app/.env.production` (project URL + publishable key only). Public by design,
  so the Pages build needs no secrets and a fresh clone runs immediately.
- Deploy to Pages at `/app/`: Vite `base`, `BrowserRouter basename`, and a root
  `404.html` that bounces deep links into the SPA.
- **Keep-alive cron.** Free-tier Supabase pauses after ~7 days idle, and a paused
  project can only be resumed from a dashboard the grader has no access to. A
  scheduled GitHub Action hitting the project every few days prevents that.

### Week 3 — make the reader flow real
- New migration: a `ratings` table (score, notes, recusal) with RLS — a reader writes
  only their own row, editors read all, readers never touch `authors`.
- Rewrite `ReaderQueuePage` / `ReaderSubmissionPage` onto real data and gate `/reader`
  behind login. Today this is the most visible "not really working" part: a grader
  clicks "Reader queue" and sees fake samples.

### Week 4 — activate the tests, finish the editor workflow
- Point `.env.test` at the seeded accounts → the authenticated RLS tests and the
  Playwright role suite **stop skipping**. Closes issues #2 and #4.
- Editor dashboard: real statuses (Accepted / Rejected / Hold, not just 3), and the
  ratings summary backed by real data.

### Week 5 — metadata stripping, docs, buffer
- Strip manuscript metadata at intake (issue #3). See the open fork below.
- `npm run db:export` — the proposal promises every record is exportable; this is a
  grading line item.
- Final docs pass; fix the dangling §2 → §7 cross-reference.

**After the 5 weeks:** decision letters + Resend, join-with-a-code, real club pilot.

### Open forks (decide before week 5)
1. **Where does metadata stripping run?** (a) *Edge Function* — correct, and §7 already
   says "not in the browser," but it is Deno and roughly 150 lines. (b) *Browser-side*
   (`exifr` + `pdf-lib`) — an afternoon, but the anon key is public, so anyone can
   upload straight to Storage and skip the app. (c) *Strictest* — drop the anon
   upload policy and route every upload through the Edge Function, so the function is
   the only door; airtight, but rewrites `SubmitPage`'s upload path.
2. **Free tier vs. paid.** The 7-day pause is the one thing that can silently break the
   live URL after handoff. A keep-alive cron is free but can fail; a paid plan cannot
   pause. A pause only breaks the *data*, not the *page* — but a grader still sees a
   broken queue.
3. **Seed the live project, or leave it empty?** Recommended: seed it, and label the
   rows clearly as sample data.

### Credentials needed to start week 1
1. **Supabase personal access token** — Dashboard → Account → Personal Access Tokens.
   Needed for `npm run db:login`.
2. **Project database password** — Dashboard → Project Settings → Database. Needed for
   `npm run db:link`.
3. **Git name and email** — so commits stop being authored by `root`.

### Useful CLI commands confirmed present in v2.120.0
`supabase db query --linked` (runs SQL against the linked project — good for auditing
`pg_policies` without a DB password), `supabase config push`, `supabase db push
--include-seed`, `supabase storage rm`, `supabase functions deploy`.
