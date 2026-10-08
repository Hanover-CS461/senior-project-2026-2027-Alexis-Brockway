# Senior Project — Context File (keep me up to date)

*What this file is:* everything a fresh session or future maintainer needs to
know about this project without re-reading the whole conversation history.
Read this first. Last updated **Oct 8, 2026**: the Supabase tutorial is live on
the site, the first GitHub issues (#1–3) now track the remaining work, and the
docs build + `gh` tooling are set up (see §13). The §1–§12 notes predate that.

---

## 1. One-paragraph summary

CS senior project (2026–2027): replace the college literary magazine's paid
submission platform (Submittable) with a custom, **club-scoped** web app that
runs the whole editorial workflow — submission intake, blind review, reader
notes, and decision letters — at nearly zero cost. Built for **one club**, not
a platform, which is what makes it finishable in one semester. The project's
central CS idea is **blind review enforced at the database layer** (row-level
security): readers physically cannot fetch author identity.

## 2. The person behind it

- CS major, **double major in English / Creative Writing** — the English side
  drives the product instincts (literary analysis, editing, publishing).
- Comfort zone: JavaScript/TypeScript from coursework; limited production
  experience. Things like auth, deployment, RLS, deliverability are NEW.
- Communication style: wants **plain language and analogies** (kitchen/food,
  ID cards, door keys). Gets overwhelmed by big stacks, jargon, and large
  tables. Keep explanations small and one decision at a time.

## 3. Timeline

- Late August 2026 → mid-December 2026 (~12 real build weeks, minus finals).
- Today is Sep 24, 2026. Proposal is DONE (published to GitHub Pages). Build
  phase: submission flow, reader queue, and editor dashboard UI were built on
  fake data; **the backend is now live** — submissions save to Supabase, and
  the editor queue reads real rows. Auth (in-app sign-up + editor roles) is in.

## 4. Decision history (condensed — do not re-litigate)

1. Brainstorm ruled out AI story generators; wanted "English as a whole"
   (reading, analysis, editing, publishing) — not generation.
2. Three candidates: lit journal manager / close-reading room / scansion
   instrument. **Chose the lit journal manager** (real need, real client).
3. **Scope: one club, not a platform.** Hardcode their workflow; build only
   what they actually click.
4. Original stack was heavy: Next.js + Supabase + Prisma + Resend + Vercel.
   The user pushed to make it smaller. **The stack was simplified to:
   React + Vite frontend + Supabase (everything backend) + Resend + a free
   static host.**
5. Why the simplification is correct:
   - Scale is tiny (200–300 submissions Aug–Feb, ~20 staff) — any stack can
     handle it, so the real criteria are "fewest moving parts after
     graduation" and "fastest to build."
   - **Prisma was dropped** because it connects with the service role and
     bypasses Supabase's row-level security — it contradicted the RLS
     defense-in-depth claim.
   - **Next.js was dropped** for React + Vite because the app is login-gated
     (no search-engine need, no first-load concern for ~20 staff).
6. The security story IS the project: RLS policies + separate authors table
   = readers can't read identity even if they call the database directly.
7. **Kennings is the real club** (Hanover's literary journal,
   kenningsliteraryjournal.com). Real submission rules were pulled from their
   Submissions page on Sep 23, 2026 and put into the app.
8. **The app lives in `app/`** (React + Vite), separate from `docs/` (the
   Jekyll site). Kept separate on purpose.
9. **Supabase project created (Sep 24):** project `qsynlsbltpnhzncpqerz`
   (free tier). Schema + RLS + Storage bucket are live. The **anon key is the
   new `sb_publishable_…` format** (not the old long JWT) and lives in
   `app/.env` — never paste `service_role`.
10. **Auth approach decided:** in-app self sign-up (no dashboard account
    creation). The **first member to sign up automatically becomes Chief
    Editor** (bootstrap — enforced by an RLS policy, not by the app); everyone
    after joins as Reader. Promotion happens later via the Member manager.
11. **Hard-won lesson:** anon users have NO read policy on `submissions`
    (by design), so `insert().select().single()` FAILS — the INSERT works but
    RETURNING is refused. Fix: generate the `submission_id` with
    `crypto.randomUUID()` in the browser and insert with an explicit id.

## 5. Current stack (locked)

| Piece | Role | Notes |
|---|---|---|
| React 19 + Vite 8 + TypeScript | Frontend (SPA) | In `app/`, routed with react-router-dom v7 |
| React Hook Form + Zod | Forms + validation | Already installed and used by the submission form |
| Supabase | Backend: Postgres DB + Auth + Storage + Edge Functions | **SET UP.** Schema (`submissions`, `authors`, `members`) + RLS + Storage bucket live in project `qsynlsbltpnhzncpqerz` |
| Supabase RLS | Blind-review enforcement | Reader role has NO policy on the authors table |
| Supabase Edge Function | The ONLY server-side code | Sends email on submission / decision via Resend |
| Resend | Transactional email | Status links, decision letters, SPF/DKIM on club domain |
| `exifr`, `pdf-lib`, zip `.docx` handling | Metadata stripping | Planned for intake, not yet used |
| Vitest, Playwright | Testing | Planned, not yet set up |
| oxlint | Linting | Already configured (npm run lint) |

Important details to keep straight:
- **Anon key** (public, harmless, opens the door) vs **login token** (per-user
  "ID card" with role; every request carries it; RLS checks it).
- **The anon key is now `sb_publishable_…`** (Supabase's newer key format, not
  the old long JWT). It's public by design. It sits in `app/.env` as
  `VITE_SUPABASE_ANON_KEY`; the URL is `VITE_SUPABASE_URL`. Never paste the
  `service_role` key into the app.
- **RLS read-back gotcha:** a role with only an INSERT policy can't read back
  the row it just inserted (RETURNING is refused). Insert with an explicit,
  client-generated `id` instead of `.select().single()`.
- **Bootstrap chief editor:** the members insert policy grants `chief_editor`
  only when `member_count() = 0` (checked by a `security definer` function), so
  exactly the first sign-up becomes an editor. No one can self-promote after.
- **Dev email confirmation:** Supabase requires email confirmation by default,
  which breaks fake test emails. Confirm a dev account with one SQL line:
  `update auth.users set email_confirmed_at = now(), confirmation_token = ''
  where email = '<email>';` (or turn off "Confirm email" under Authentication →
  Providers → Email).
- Manuscript files must be **metadata-stripped at intake** — including
  `.docx`, which is a zip with author data in `docProps/core.xml`.
- **Supabase free tier pauses projects after ~1 week of inactivity** — the
  handoff guide must document the reactivation ritual before each reading
  period.
- OWASP Top 10 is the security checklist; **broken access control** is the
  project's primary risk (the whole product is a permission boundary).

## 5b. Environment setup (how the app runs)

- **Node is installed at `~/node/bin`** (version 20.19.0, downloaded manually —
  there was NO system Node). PATH is added in `~/.bashrc`, so new terminals
  get `node`/`npm` automatically. If a fresh terminal says "node not found",
  run `export PATH="$HOME/node/bin:$PATH"`.
- Dev server: `cd app && npm run dev` (optionally `-- --host 0.0.0.0` so a
  Windows browser can reach it through WSL).
- **Known gotcha:** if edits "don't show up" in the browser, the Vite server
  has a stale module cache. DO NOT use `pkill -f vite` from this tool — it
  matches the shell's own command line and hangs. Instead kill by port:
  `PID=$(ss -tlnp | grep 5173 | grep -oP 'pid=\K[0-9]+' | head -1); kill $PID`,
  then `npm run dev` again, then hard-refresh the browser (`Ctrl+Shift+R`).
  When restarting from this tool, launch with `nohup npm run dev > /tmp/opencode/vite.log 2>&1 &`
  and verify the new code is actually served with
  `curl -s http://localhost:5173/src/pages/<File>.tsx | grep <newSymbol>`
  before telling the user it's live.
- **Known WSL gotcha (big one this session):** Vite's file watcher is
  unreliable on the `/mnt/c` Windows drive, so the browser can keep showing
  STALE code (old pages, old behavior, phantom login walls) long after edits.
  Diagnose with a cache-busting curl against the server:
  `curl -s "http://localhost:5173/src/pages/<File>.tsx?t=$(date +%s)" | grep <newSymbol>`.
  If the server is current but the browser is stale, the fix that actually
  works is: **close the tab entirely and open a fresh one** (plain Ctrl+Shift+R
  often isn't enough), after restarting the dev server.
- **Supabase credentials** live in `app/.env` (gitignored): `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY`. Vite inlines them as `import.meta.env.*`. The
  client is `app/src/lib/supabase.ts`. If `.env` is created/changed, restart
  the dev server — Vite reads env vars only at startup.
- The repo lives at `/mnt/c/Users/A3bro/senior-project-2026-2027-Alexis-Brockway`
  (Windows drive via WSL).

## 6. Verified facts (checked Sep 8, 2026 — do not re-verify casually)

- Submittable CLMP plan: **$290/year** (current CLMP page says $39/mo or
  $290/yr), plus **$0.99 + 5%** on paid submissions. [Submittable Help; CLMP]
- Duosuma (Duotrope): **$0.09/submission**, monthly billing, volume tiers.
- Moksha: **$750/year** annual plan. [moksha.io/pricing]
- Green Submissions: free, self-hosted PHP/MySQL — the "do nothing" option.
- Prices were verified against primary sources on Sep 8, 2026.
- **Kennings rules** (pulled from kenningsliteraryjournal.com/submissions-1,
  Sep 23, 2026): subs open Aug 1–Feb 8; blind review (no name in file, title
  in file + form); up to 5 pieces, one per category; simultaneous subs OK with
  notice; no AI / prejudiced / graphic content; prose 500–3,000 words
  double-spaced as Word files; poetry 1–3 poems, Word or PDF, no chapbooks;
  visual art 1–5 high-res JPGs or PNGs (300–600 dpi), file named with title.

## 7. Repository layout

| File | Status | Contents |
|---|---|---|
| `brainstorm.md` | Historical | Original 3-idea brainstorm + choice framing |
| `features.md` | Historical | Role-based feature list (still accurate) |
| `proposal.md` | Superseded (kept) | Original detailed proposal, OLD stack, 13 refs |
| `proposal-simple.md` | Historical | Earlier A-ready proposal (superseded by docs/proposal.md) |
| `project-context.md` | Current | This file (handoff) |
| `docs/` | **Live site** | Jekyll site built from `docs/`, deployed to GitHub Pages |
| `docs/proposal.md` | Current | The proposal as rendered on the site |
| `docs/slides/` | Live | Marp slide deck (`index.md`) + custom Cayman theme (`themes/cayman.css`) + assets |
| `.github/workflows/jekyll-gh-pages.yml` | Live | Builds Jekyll site + Marp slides, deploys to Pages |
| `app/` | **The app** | React + Vite + TS scaffold (the submission manager) |
| `app/src/pages/` | Current | HomePage, GenrePage, GenreRulesPage, SubmitPage (wired to Supabase), LoginPage, ReaderQueuePage, ReaderSubmissionPage (fake data), EditorDashboardPage (queue reads real data; staff tab local state), EditorSubmissionPage (real data) |
| `app/supabase/schema.sql` | Current | Full schema (submissions, authors, members, RLS, storage bucket) — paste into the dashboard SQL Editor; safe to re-run |
| `app/src/lib/supabase.ts` | Current | The Supabase client (URL + anon key from `.env`) |
| `app/src/lib/auth.tsx` | Current | AuthProvider + `useAuth()` + `isEditorRole()`; lazy-creates a `members` row on first sign-in (first user = chief editor) |
| `app/src/components/RequireAuth.tsx` | Current | Route guard: `/editor` routes require sign-in + editor role |
| `app/.env` | Gitignored | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `app/src/components/MemberManager.tsx` | Current | Staff management UI (add, role-change, deactivate, delete) — still local component state only, NOT saved to the `members` table yet |
| `app/src/data/genres.ts` | Current | The 4 genres + real Kennings rules (single source of truth) |
| `app/src/data/submissions.ts` | Current | Fake submissions for the reader queue (deliberately NO author data — blind review demo) + `hanoverStudent` flag |
| `app/src/data/authors.ts` | Current | Fake author identity keyed by submission id — ONLY editor pages import this (mirrors the separate authors table + RLS design) |
| `app/src/data/members.ts` | Current | Fake staff list + 6 roles (Reader → Advisor) for the Member manager |
| `app/src/data/ratings.ts` | Current | Per-submission ratings + recusals; average computed over voters only |
| `app/src/data/manuscripts.ts` | Current | Manuscript sample text shared by reader + editor detail pages |
| `.vscode/settings.json` | Current | Marp theme path for VS Code preview |
| `docs/tutorial/` | **Live (site)** | 7-page Jekyll tutorial "Build a Blind-Review Submission Form with Supabase" — index (intro/objectives/prereqs/TOC) + 6 parts. Built/deployed by the existing Pages workflow; linked from `docs/index.md` and the site nav. Oct 8, 2026 |
| `tutorial-study-guide.md` | Gitignored | Private class-presentation cheat sheet for the tutorial. **Do not stage/push** — protected by the root `.gitignore` |
| `.gitignore` (root) | New | Ignores `tutorial-study-guide.md` only |

The `_site` folder (Jekyll generated output) is committed in this repo but is
regenerated on every build — it does not need to be hand-edited.

## 8. Rubric status (CS 461 Project Proposal Rubric)

- Rubric: https://hackmd.io/@skiadas/r1Pfv15bo
- **Every writing item on the rubric is covered** (D, C, B, A tiers): one-
  sentence first line, logical sections, ≥2 comparable solutions,
  technologies + libraries, alternatives contrasted, ≥7 IEEE references cited
  in text, architecture diagram, compelling tech reasoning,
  new-concepts-to-learn section.
- **GitHub Pages is DONE** (the last rubric blocker): the proposal is live at
  https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/
  built by a GitHub Actions workflow from `docs/`. Pages Source is set to
  "GitHub Actions" (NOT "Deploy from a branch").

## 9. Open questions / next steps

1. ~~Wire the submission form to Supabase~~ **DONE (Sep 24)** — project created,
   schema + RLS + storage live, `@supabase/supabase-js` installed, form saves
   real rows + file. See §9b.
2. **Editor dashboard (first slice DONE, queue now real)** — remaining: reader
   assignments, internal discussion, decision letters, bulk actions.
3. **Email (Resend)** — status links + decision letters via a Supabase Edge
   Function.
4. **Metadata stripping at intake** — uploads to Storage work; stripping
   (`exifr`/`pdf-lib`/zip `.docx` handling) still not done.
5. **Auth is in (self sign-up, first user = chief editor), but the Member
   manager UI is NOT wired to the `members` table** — it still lives in local
   component state (lost on refresh). Remaining: invite links,
   role-change/deactivate persisting to the DB, editing who is a member.
6. **Persistence for reader notes/scores/statuses** — submission status now
   saves to the DB from the editor detail page. Reader notes/scores and a
   `ratings` table still don't exist.
7. Advisor role: full managing editor or oversight-only (audit/export)?
8. Author reveal timing: at acceptance, or only at publication?
9. Do they collect bios/cover letters at all (they'd out the author instantly)?
10. Form fields still TBD with the club: is mailing address required? Is the
    Hanover-student checkbox wording right? (The editor view already tags
    submissions "Hanover student / Non-Hanover" from it.)
11. Decide canonical filename (see §7 note about proposal files).
12. Tests (Vitest + Playwright) and production deploy (Netlify/Vercel).
13. **Dev-only email confirmation:** Supabase confirms emails by default; for
    test accounts either confirm via SQL
    (`update auth.users set email_confirmed_at = now(), confirmation_token = ''
    where email = '<email>';`) or turn off "Confirm email" (Authentication →
    Providers → Email).

## 9b. Build progress (what exists so far)

- **Backend (Supabase) — LIVE (Sep 24):** project `qsynlsbltpnhzncpqerz`.
  - Tables: `submissions` (title, genre, status, hanover_student,
    manuscript_path, created_at), `authors` (identity, linked 1:1 by
    submission_id), `members` (user_id → auth.users, name, email, role,
    active).
  - RLS: anon can INSERT submissions + authors (the public form); anon has NO
    read; any authenticated user can read submissions; editors (via
    `is_editor()`) can read authors and update submission status; members can
    read/insert their own `members` row (first insert is `chief_editor`, then
    readers only). Full script in `app/supabase/schema.sql`.
  - Storage bucket `manuscripts` (private): anon uploads, authenticated reads.
  - Auth: in-app sign-up/sign-in; `auth.tsx` lazy-creates the member row on
    first sign-in.
- **Submission flow (done, WIRED to Supabase):** genre picker (4 genres) →
  per-genre rules page (real Kennings rules + general requirements) →
  submission form. Form fields: title, author name, email, mailing address,
  Hanover-student checkbox, bio (optional), manuscript file (file types
  restricted per genre). On submit it uploads the file to Storage, then inserts
  a `submissions` row and an `authors` row (id generated client-side — anon
  can't read back RETURNING). Shows "Submission received" on success, real
  error message on failure.
- **Reader queue (done, STILL fake data):** `/reader` shows two tabs
  ("Assigned to me" and "Shared pile"), each item showing title, genre, status
  badge, and excerpt — no author identity anywhere. `/reader/:id` shows the
  manuscript, a private notes textarea, and a 1–5 score. Fake data lives in
  `app/src/data/submissions.ts`; notes/score are local state only. Not yet
  wired to Supabase (reader pages are NOT login-gated yet).
- **Reader score lock (done):** before scoring, the reader ticks "I know the
  author — lock my vote". Checking it disables the score buttons and recuses
  the reader (blind-review integrity). Unchecked = normal 1–5 scoring.
- **Editor dashboard (done, queue READS REAL DATA):** `/editor` has two tabs —
  **Queue** (full view from Supabase: author column from `authors` via the
  editor policy, Hanover/non-Hanover tag, status filter) and **Staff** (Member
  manager: add, role-change, deactivate, delete — still local component state,
  not saved to `members` yet). `/editor/:id` reads the real submission + author,
  offers a download link for the manuscript file (signed URL), and the status
  dropdown saves to the DB. Ratings box shows "not wired yet".
- **Statuses:** only 3 exist (Received / In review / Shortlist). Accepted/
  Rejected intentionally deferred (decision-letter slice).

## 10. Glossary (as the user learned it)

- **Anon key** — the public "door key" baked into the frontend; grants
  nothing by itself. Now in the newer `sb_publishable_…` format (kept in
  `app/.env`).
- **Publishable key** — Supabase's new name for the public key (starts with
  `sb_publishable_`). Safe to sit in frontend code; the `service_role` key
  next to it is the one that must never be exposed.
- **Login token** — the "ID card" a staff member gets at login; carries their
  role; checked by RLS on every request; expires (~1 hr) and auto-refreshes.
- **RLS (row-level security)** — database rules deciding what each role can
  read; the mechanism that makes blind review structural.
- **Blind review** — readers see title/genre/manuscript only, never author.
- **Insert-without-read-back** — a role that can INSERT but not SELECT can't
  use `.insert().select()` (RETURNING is refused). The form gets around this
  by generating the row's UUID in the browser first.
- **Signed URL** — a temporary, time-limited link to a private Storage file
  (the editor detail page uses one to let editors open the manuscript).
- **Bootstrap chief editor** — the RLS policy that lets the FIRST sign-up
  become Chief Editor (`member_count() = 0`), so the app has no self-promotion
  hole; later members join as Readers.
- **Edge Function** — Supabase's serverless function; the only server code;
  sends the emails.
- **Roles** — Managing Editor (2 co-editors + advisor; full view + admin),
  Reader (~17 members; blind), Submitter (external writers; no accounts). The
  Member manager has a finer 6-role ladder the club uses: Reader → Staff
  Editor → Editor → Co-Editor → Chief Editor → Advisor.
- **Recusal** — when a reader checks "I know the author — lock my vote", their
  score is locked out; on the editor side they appear under "Recused (didn't
  vote)" and the average is computed over voters only.
- **Genre → rules → form flow** — writer picks a genre, sees that genre's
  real submission rules, then lands on the form for that genre (genre is no
  longer a field on the form).
- **Marp** — markdown → slides tool. Slides live in `docs/slides/` and are
  built into the deployed site by the Pages workflow.

## 11. Key sources

[1] Submittable Help — CLMP plan: https://submittable.help/en/articles/3512930-how-can-my-literary-organization-receive-a-discounted-clmp-plan
[2] Green Submissions — cost article: https://www.greensubmissions.com/articles/what-submittable-costs.html
[3] Duosuma overview: https://duotrope.com/duosuma/overview-publishers-agents.aspx
[4] Moksha pricing: https://moksha.io/pricing/
[5] Green Submissions — alternatives: https://www.greensubmissions.com/articles/free-submittable-alternatives.html
[6] CLMP benefits: https://www.clmp.org/join-clmp/benefits/
[7] Supabase docs: https://supabase.com/docs
[8] Vite docs: https://vite.dev
[9] React docs: https://react.dev
[10] Resend docs: https://resend.com/docs
[11] OWASP Top 10: https://owasp.org/Top10/
[12] GitHub Pages docs: https://docs.github.com/en/pages
[13] Kennings Literary Journal — submissions/rules:
    https://kenningsliteraryjournal.com/submissions-1
[14] Marp CLI: https://github.com/marp-team/marp-cli
[15] Marp for VS Code: https://github.com/marp-team/marp-vscode

## 12. How to work with this user

- Plain language first. Analogies before jargon. Ask before assuming.
- Don't dump five-option comparison tables unless asked; one decision at a
  time.
- The stack must stay simple — the club inherits it after graduation.
- When they say "smaller," they mean it. Re-simplify rather than defend.
- They want every feature visible/clickable as soon as possible; fake data
  beats waiting for the database. Build UI first, wire the backend later.
- **They happily paste SQL into the Supabase SQL Editor** (run scripts there,
  not dashboard point-and-click) but **dislike clicking through the dashboard
  UI** — when possible, give them a script or do it in the app instead.
- **They need step-by-step.** Hand them one step, wait for "done", then the
  next. Don't front-load three steps.
- If the browser "isn't showing" edits, restart the dev server by port (see
  §5b) and confirm via curl before saying it's live.

---

## 13. Latest updates (Oct 8, 2026)

### Tutorial — DONE and live
- `docs/tutorial/` is a 7-page Jekyll tutorial, **"Build a Blind-Review
  Submission Form with Supabase"** (`index.md` = intro + learning objectives +
  target audience + prerequisites + TOC; six parts: setup → database + RLS →
  public submission form → auth + bootstrap Chief Editor → editor view + signed
  URLs → conclusion with practice exercises + "See also"). It is published to
  GitHub Pages via the existing workflow, linked from `docs/index.md` and the
  site nav in `docs/_layouts/default.html`. Live at
  https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/tutorial/
- `tutorial-study-guide.md` (repo root) is the private, for-class presentation
  cheat sheet for the tutorial. It is **gitignored by the root `.gitignore`** —
  never stage or push it, and it's deliberately outside `docs/` so Jekyll never
  publishes it.

### Issues — tracking started
Remaining work now lives in GitHub issues (repo Hanover-CS461/…):
1. **Wire the Member Manager to the `members` table** (finish user setup) —
   role changes/deactivate persist to DB, RLS gating, invite flow, audit trail.
2. **Automated testing** — Vitest unit tests + Playwright E2E for the security
   boundaries (anon submit ok / anon read refused / Reader blind / Editor
   unblind), optionally `supabase test db` policy tests.
3. **Strip metadata from uploaded manuscripts at intake** — EXIF via `exifr`,
   PDF via `pdf-lib`, `.docx` via zip `docProps/core.xml`; post-process
   server-side (edge function), not in-browser.

### Tooling set up this session
- **`gh` CLI is authenticated** on this machine as **Alexis-Brockway** (token
  saved in `~/.config/gh/hosts.yml`) — issues/PRs can be created from the
  shell. GitHub auth was set up via a background `--web` device-code flow; if it
  ever stops working, re-run `gh auth login`.
- **Git commit identity is unconfigured** — commits currently auto-use
  `root <root@Alexiscomp.localdomain>`. Recommend `git config --global
  user.name`/`user.email` before the next commit.

### Docs build tooling (how to verify the site locally)
- Locally: `ruby-full` (apt) + `bundler` are installed. `cd docs && bundle
  install` uses the pinned `Gemfile.lock` (github-pages 232, jekyll 3.10).
  Verify any change with:
  `cd docs && bundle exec jekyll build --destination /tmp/opencode/site`
  — expect `done in Xs` and **no warning/error lines**. (You can also use
  `bundle exec jekyll serve` to preview at localhost:4000.)
- **Gotchas learned while writing the tutorial:**
  - **Liquid parses `{{`/`{%` even inside fenced code blocks.** A JSX
    `value={{ ... }}` triggers a "Liquid syntax error" warning and can mangle
    the sample. Fix: hoist to a variable so there are no double braces, or wrap
    the fence in `{% raw %} … {% endraw %}`.
  - **kramdown (GFM) prefixes heading anchors that start with a number** —
    `## 2. The members table …` → `id="2-the-members-table-…"`. Verify the real
    id in the built HTML before pointing fragment links at it.
  - **Rouge (this build) lexers:** `sql`, `ts`, `js`, `jsx`, `tsx`, `bash`,
    `json`, `html` all highlight — mark fenced blocks with the right language.
  - All 7 pages verified: no broken internal `.html` links, fragment anchors
    resolve, external official-docs URLs return HTTP 200.