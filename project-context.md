# Senior Project — Context File (keep me up to date)

*What this file is:* everything a fresh session or future maintainer needs to
know about this project without re-reading the whole conversation history.
Read this first. It was last updated Sep 8, 2026.

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
- Today is Sep 8, 2026. The proposal phase is basically done; build has not
  started yet.

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

## 5. Current stack (locked)

| Piece | Role | Notes |
|---|---|---|
| React + Vite | Frontend (SPA) | JS/TS, static files, free host (Netlify or Vercel) |
| Supabase | Backend: Postgres DB + Auth + Storage + Edge Functions | One service replaces the whole backend |
| Supabase RLS | Blind-review enforcement | Reader role has NO policy on the authors table |
| Supabase Edge Function | The ONLY server-side code | Sends email on submission / decision via Resend |
| Resend | Transactional email | Status links, decision letters, SPF/DKIM on club domain |
| Libraries | React Hook Form + Zod, `exifr`, `pdf-lib`, zip-based `.docx` handling, Vitest, Playwright | Nothing hand-rolled |

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

## 6. Verified facts (checked Sep 8, 2026 — do not re-verify casually)

- Submittable CLMP plan: **$290/year** (current CLMP page says $39/mo or
  $290/yr), plus **$0.99 + 5%** on paid submissions. [Submittable Help; CLMP]
- Duosuma (Duotrope): **$0.09/submission**, monthly billing, volume tiers.
- Moksha: **$750/year** annual plan. [moksha.io/pricing]
- Green Submissions: free, self-hosted PHP/MySQL — the "do nothing" option.
- Prices were verified against primary sources on Sep 8, 2026.

## 7. Repository layout

| File | Status | Contents |
|---|---|---|
| `brainstorm.md` | Historical | Original 3-idea brainstorm + choice framing |
| `features.md` | Historical | Role-based feature list (still accurate) |
| `proposal.md` | Superseded (kept) | Original detailed proposal, OLD stack, 13 refs |
| `proposal-simple.md` | **CURRENT proposal** | The A-ready proposal (new stack, 12 refs) |
| this file | Current | Context/handoff |

Open decision: whether `proposal-simple.md` should be renamed to
`proposal.md` (and the old one archived) so there's one canonical proposal.

## 8. Rubric status (CS 461 Project Proposal Rubric)

- Rubric: https://hackmd.io/@skiadas/r1Pfv15bo
- **Every writing item on the rubric is covered** by `proposal-simple.md`
  (D, C, B, A tiers): one-sentence first line, logical sections, ≥2
  comparable solutions, technologies + libraries, alternatives contrasted,
  ≥7 IEEE references cited in text, architecture diagram, compelling tech
  reasoning, new-concepts-to-learn section.
- **NOT done — the one remaining item:** the proposal must be *available via
  GitHub Pages* (D-tier). Repo has no Pages branch or workflow yet.
  Repo: `github.com/Hanover-CS461/senior-project-2026-2027-Alexis-Brockway`.
  Action: enable Pages in repo Settings (deploy from branch: main) OR add a
  GitHub Actions workflow.

## 9. Open questions / next steps

1. **Set up GitHub Pages** (the last rubric blocker).
2. **Club interview** on actual Submittable usage — the scope of everything
   depends on it ("what do you click every week? what do you never touch?").
3. Advisor role: full managing editor or oversight-only (audit/export)?
4. Author reveal timing: at acceptance, or only at publication?
5. Do they collect bios/cover letters at all (they'd out the author instantly)?
6. Decide canonical filename (see §7).
7. User proofreads `proposal-simple.md` end to end.
8. After the proposal: build phase — scaffold React+Vite + Supabase,
   RLS policies, submission form, workflow, email, tests, deploy.

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

## 12. How to work with this user

- Plain language first. Analogies before jargon. Ask before assuming.
- Don't dump five-option comparison tables unless asked; one decision at a
  time.
- The stack must stay simple — the club inherits it after graduation.
- When they say "smaller," they mean it. Re-simplify rather than defend.