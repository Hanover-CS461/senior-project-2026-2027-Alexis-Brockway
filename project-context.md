# Senior Project — Context File (keep me up to date)

*What this file is:* everything a fresh session or future maintainer needs to
know about this project without re-reading the whole conversation history.
Read this first. It was last updated Sep 23, 2026.

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
- Today is Sep 23, 2026. Proposal is DONE (published to GitHub Pages). Build
  phase has started: the scaffold and the submission form are done.

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

## 5. Current stack (locked)

| Piece | Role | Notes |
|---|---|---|
| React 19 + Vite 8 + TypeScript | Frontend (SPA) | In `app/`, routed with react-router-dom v7 |
| React Hook Form + Zod | Forms + validation | Already installed and used by the submission form |
| Supabase | Backend: Postgres DB + Auth + Storage + Edge Functions | One service replaces the whole backend (NOT set up yet) |
| Supabase RLS | Blind-review enforcement | Reader role has NO policy on the authors table |
| Supabase Edge Function | The ONLY server-side code | Sends email on submission / decision via Resend |
| Resend | Transactional email | Status links, decision letters, SPF/DKIM on club domain |
| `exifr`, `pdf-lib`, zip `.docx` handling | Metadata stripping | Planned for intake, not yet used |
| Vitest, Playwright | Testing | Planned, not yet set up |
| oxlint | Linting | Already configured (npm run lint) |

Important details to keep straight:
- **Anon key** (public, harmless, opens the door) vs **login token** (per-user
  "ID card" with role; every request carries it; RLS checks it).
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
  has a stale cache. Fix: `pkill -f vite`, then `npm run dev` again, then
  hard-refresh the browser (`Ctrl+Shift+R`).
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
| `app/src/pages/` | Current | HomePage, GenrePage, GenreRulesPage, SubmitPage, ReaderQueuePage (placeholder), EditorDashboardPage (placeholder) |
| `app/src/data/genres.ts` | Current | The 4 genres + real Kennings rules (single source of truth) |
| `.vscode/settings.json` | Current | Marp theme path for VS Code preview |

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

1. **Wire the submission form to Supabase** — create the Supabase project,
   schema (submissions + authors tables, RLS policies), install
   `@supabase/supabase-js`, and make the form actually save. THIS IS THE NEXT
   STEP.
2. **Reader queue** — the blind review view (title/genre/manuscript only).
3. **Editor dashboard** — full-view queue, assignments, notes, statuses,
   decision letters.
4. **Email (Resend)** — status links + decision letters via a Supabase Edge
   Function.
5. **File uploads + metadata stripping** — Supabase Storage + `exifr`/`pdf-lib`/
   zip `.docx` handling at intake.
6. **Auth / member management** — Supabase Auth, roles, invite/deactivate.
7. Advisor role: full managing editor or oversight-only (audit/export)?
8. Author reveal timing: at acceptance, or only at publication?
9. Do they collect bios/cover letters at all (they'd out the author instantly)?
10. Form fields still TBD with the club: is mailing address required? Is the
    Hanover-student checkbox wording right?
11. Decide canonical filename (see §7 note about proposal files).
12. Tests (Vitest + Playwright) and production deploy (Netlify/Vercel).

## 10. Glossary (as the user learned it)

- **Anon key** — the public "door key" baked into the frontend; grants
  nothing by itself.
- **Login token** — the "ID card" a staff member gets at login; carries their
  role; checked by RLS on every request; expires (~1 hr) and auto-refreshes.
- **RLS (row-level security)** — database rules deciding what each role can
  read; the mechanism that makes blind review structural.
- **Blind review** — readers see title/genre/manuscript only, never author.
- **Edge Function** — Supabase's serverless function; the only server code;
  sends the emails.
- **Roles** — Managing Editor (2 co-editors + advisor; full view + admin),
  Reader (~17 members; blind), Submitter (external writers; no accounts).
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