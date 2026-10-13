# AGENTS.md

*Read this first.* This is the onboarding/handoff file for any AI agent (or
human) working in this repo. It replaces the old `project-context.md`. Last
updated **Oct 13, 2026**.

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

## 2. Current status (Oct 13, 2026)

- **Proposal** — DONE, live on GitHub Pages (see §8).
- **App** lives in `app/` (React + Vite + TS), separate from `docs/` (the
  Jekyll site). Backend is **Supabase**, live in project `qsynlsbltpnhzncpqerz`
  (free tier).
- **Submission flow** — DONE and wired to Supabase (file → Storage, then
  `submissions` + `authors` rows).
- **Auth** — DONE: in-app sign-up/sign-in; the first sign-up becomes Chief
  Editor (enforced by RLS), everyone after joins as Reader.
- **Editor dashboard** — Queue reads real data; `/editor/:id` reads real
  submission + author and saves status. **Member Manager now persists to the
  `members` table** (role changes + soft deactivate/reactivate) with an audit
  trail — but see the "must apply schema" note in §7.
- **Reader queue** — still **fake data** (`app/src/data/*.ts`); notes/scores are
  local state only and are **not** login-gated yet.
- **Tests** — Vitest + Playwright are set up and green (unit + anon-RLS + UI
  E2E). The authenticated reader-vs-editor suites are written but **skipped**
  until test credentials are supplied; activating them is tracked in issue #4.
- **Open work** — issues #1–#4 (§8).

---

## 3. Environment & commands

- **Node is at `~/node/bin`** (v20.19.0, installed manually — there is no
  system Node). `~/.bashrc` adds it to PATH. If a fresh terminal says "node not
  found": `export PATH="$HOME/node/bin:$PATH"`.
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
| `app/supabase/schema.sql` | **Canonical** | Full idempotent schema (tables, functions, RLS, storage, audit) — paste into the SQL Editor |
| `app/supabase/tests/rls.test.sql` | Current | pgTAP policy tests (needs Supabase CLI + Docker) |
| `app/e2e/` | Current | Playwright specs: public submission, blind-review UI, editor gating, authenticated roles |
| `app/playwright.config.ts`, `app/vite.config.ts`, `app/test/setup.ts` | Current | Test/build config; setup loads `.env.test` |
| `app/.env` / `app/.env.test` | Gitignored | Supabase creds / test accounts |
| `app/.env.test.example` | Current | Template for the authenticated tests |

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

**Why this stack (settled):** scale is tiny (200–300 subs/season, ~20 staff), so
the real criteria are "fewest moving parts after graduation" and "fastest to
build." Prisma was dropped (service role bypasses RLS, contradicting the
security story); Next.js was dropped for React + Vite (login-gated, no SEO
need).

---

## 6. Data model & the security core

The security story **is** the project. RLS + a separate `authors` table means a
Reader cannot read identity even by calling the database directly.

**Tables** (`app/supabase/schema.sql`):
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
  period.
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
- **OWASP Top 10** is the security checklist; **broken access control** is the
  project's primary risk (the whole product is a permission boundary).

---

## 8. Open work (GitHub issues)

Repo: `Hanover-CS461/senior-project-2026-2027-Alexis-Brockway`.

1. **#1 — Wire the Member Manager to the `members` table.** *Core done:* roles +
   deactivate persist, RLS gating, audit trail, `is_editor()` checks `active`.
   *Remaining:* invite links / "join with a code" flow instead of open
   self-signup.
2. **#2 — Automated testing.** Largely done: Vitest unit + live anon-RLS +
   Playwright UI E2E are green. Remaining is the authenticated layer's
   activation (see #4) and the optional pgTAP run.
3. **#3 — Strip metadata from uploaded manuscripts at intake** (exifr / pdf-lib /
   `.docx`), server-side.
4. **#4 — Activate the authenticated RLS tests.** Provision a throwaway test
   Supabase project + Chief/Reader accounts, fill `app/.env.test`. The suites
   `skip` until then.

### Other known gaps / next candidates
- Reader queue → Supabase: a `ratings` table so notes/scores persist, and
  login-gating the `/reader` routes.
- Editor dashboard remainder: reader assignments, internal discussion, decision
  letters, bulk actions.
- Decision letters + email via Resend (only 3 statuses exist today: Received /
  In review / Shortlist).
- Production deploy (Netlify/Vercel).
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
