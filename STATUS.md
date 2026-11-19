# Project status — Nov 19, 2026

Everything in one place: what is live, what was verified and when, what shipped
today, and what is left. `AGENTS.md` is the short handoff for agents (state,
commands, schema, the gotchas that bite first); its long tail — every gotcha, the
history, the decisions with reasoning — lives in `agent-docs/`. This page is the
summary a human reads first.

---

## What this is

A submission manager for **Kennings**, Hanover College's literary journal — built
to replace a paid platform (Submittable). Writers submit, readers score blind,
editors decide. Blind review is enforced by database rules (row-level security),
not by the interface: readers have no policy on the `authors` table at all, so a
reader cannot learn who wrote a piece even by calling the database directly.

---

## Where it lives

| Thing | Address |
|---|---|
| The app | `https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/app/` |
| The site (proposal, tutorial, slides, handoff page) | `https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/` |
| For the club | the site's `/handoff.html` |
| Code | `Hanover-CS461/senior-project-2026-2027-Alexis-Brockway` on GitHub |
| Data, auth, file storage | Supabase project `qsynlsbltpnhzncpqerz` (free tier) |

The URL is owned by the class organization and **will not outlive the course**.
The fix is a DNS record on `kenningsliteraryjournal.com`, deliberately scheduled
after the deadline (see "What is left").

---

## Verified on Nov 19 (deadline pass — suites, live probes, browser walkthrough)

Run from this machine, read-only; nothing about the app changed to get these.

| Check | Result |
|---|---|
| `npm test` (unit + live anon-RLS) | **112/112**, 12 files, 0 skips |
| `npm run test:e2e` (Chromium) | **19/19**, 0 skips |
| `npm run lint` / `npx tsc -b` | exit 0 (the same warnings only) / clean |
| Live site, `/app/`, `/tutorial/` | **200 / 200 / 200** |
| Auth probe with `redirect_to` | `location:` → the Pages app, `#error=otp_expired` ✅ |
| Auth probe without `redirect_to` | `location:` → the Pages app, same `otp_expired` ✅ |
| Keep-alive cron (last run) | **success**, Nov 16 14:31 UTC — next due today |
| Browser pass over the **deployed** app | **19/19**, no errors beyond the expected fallback 404 |
| Reader-approval policy (`pg_policies`, pasted Nov 19) | `db_is_the_gate` → **`true`** — the database, not just the app, refuses a self-approving sign-up |

What the deployed walkthrough proved (signed in through the published demo buttons):

- Chief lands on `/editor`; the **Staff** tab shows the Staffs column, 32 genre
  chip buttons (16 people × 2 states), and "Who's on each staff".
- Six of the seven queue rows open; the **Reading** panel renders on all of them,
  *The Last Ferry* still carries its one assignment with a live state and a
  populated reader picker.
- A deep `/app/editor/<id>` URL survives the Pages fallback unchanged.
- Reader lands on `/reader` and sees **Assigned to you** above *The whole queue*;
  **no seed author name appears** on the queue or on a submission page; the
  manuscript/notes/score controls render; `/editor` shows the denial with the
  "Go to your reader queue" link (the door is a message, not a redirect).
- The only console noise is the Pages fallback's own 404 — the hack working.

---

## Verified on Nov 18 (nothing assumed)

| Check | Result |
|---|---|
| `npm test` (unit + live anon-RLS) | **112/112**, 13 files, 0 skips |
| `npm run test:e2e` (Chromium) | **19/19**, 0 skips |
| `npm run lint` | exit 0 (warnings only, unchanged) |
| `tsc -b` | clean |
| Live site and `/app/` | **200 / 200** |
| Keep-alive cron | green Nov 13 and Nov 16 |
| Pages deploy runs | every run since Nov 11 green |
| Browser walkthrough of the **deployed** app | **14/14**, no console errors |

What the walkthrough proved, signed in through the published demo buttons:

- Chief lands on `/editor`; the **Staff** tab shows a Staffs column, 16 genre chips
  (four per member), and "Who's on each staff" naming Test Reader on Fiction and Poetry.
- *The Last Ferry* carries a **Reading** panel with one assignee marked *Not read yet*
  and a populated reader picker.
- Reader demo lands on `/reader` and sees **Assigned to you** at the top with that piece
  **and** the whole queue below it — and no author name anywhere on the page.
- `/app/submit` survives the Pages fallback; deep `/app/editor/<id>` links stay put.
  The only console noise is that fallback's own `404`, which is the hack working.

Also probed: anonymous listing of the `manuscripts` bucket returns `[]`, so the
file boundary holds.

---

## What the live project actually holds (re-probed Nov 19, read-only)

Signing in as the published demo Chief and reading the rows turns up more than
the seed file describes:

- **Seven submissions, not six.** The seventh is **"Among Us" (Poetry)**, arrived
  **Nov 17 through the public form**, and reads **`Accepted`**. **Decided Nov 19: keep
  it exactly as it is** — it is the end-to-end proof that the public form, the author
  row, and the decision workflow all work on real data. The reset script leaves it
  alone.
- **Seed statuses are back where the seed says.** The Nov 17 drift was reverted by
  `demo-reset.sql`: *The Last Ferry* is `In review`, *Porcelain* is `Shortlist`.
- **Eight member rows, one pending.** The pending one is the owner's own second signup
  (`abrockwaya@gmail.com`) — #7's cleanup, not a stranger. The `hanover.edu` student
  address that was waiting was **approved Nov 19**, and proved from outside:
  `member_audit` shows `reactivate`, `false → true`, 08:50 UTC.
- **Three rows hold `chief_editor`**: the published demo account, the owner's own
  second account (confirmed Nov 17), and one more personal address that was **not**
  in the Nov 17 note. Anyone with that role can read `authors`, so confirm whose it
  is before a real reading period — that is #7's territory, not a new issue.
- **Two ratings**, and **one assignment** — *The Last Ferry*, still the seeded one.

RLS still holds — a reader sees no author identity — so this is not a blind-review
breach. It is the demo looking messy, plus the risks #5 and #7 describe happening
in miniature. `app/supabase/demo-reset.sql` is the undo for the six seeded pieces;
it deliberately leaves the seventh alone.

---


## Shipped today (committed and deployed)

Nov 18 — the two halves of the editor's people-work:

- **`6c52195` — genre staffs.** `members.staffs` is a `text[]` of the four genre slugs
  with a check constraint; the Staff tab gained four toggle chips per person plus a
  "Who's on each staff" summary, and the staff CSV export gained a Staffs column.
  **Labels only** — a team says who usually reads what and never changes what a reader
  can open. Empty `{}` means general staff, so no row had to be backfilled.
- **`1d1944f` — reading assignments.** A new `assignments` table (one row per
  submission + reader, unique together), written **only by the Chief Editor**. The
  submission page has a **Reading** panel: pick one reader, or assign a whole genre
  staff in one click (a fan-out of rows, skipping anyone already on it). Each assignee
  reads *Not read yet* / *Scored 4 / 5* / *Recused — needs reassignment*. The reader's
  queue shows **Assigned to you** above the whole blind queue — a highlight, not a
  fence, so an unassigned piece is still read by someone.
- **`1f05bf4` — no "Unknown reader" flash.** Assignments and the reader list are two
  queries; the panel now waits for the names instead of printing a placeholder row.
- **`3cfa81c`** — recorded the 14-check pass over the deployed app in `AGENTS.md`,
  plus the staffs/assignments gotchas and glossary entries.
- **`demo-reset.sql`** now also restores the demo Reader's staffs, seeds one
  assignment, and deletes assignments a visitor made from a demo account to a real
  manuscript. Applied and proved from the API.

Nov 17 — the deadline-week risks:

- **#5 phase 1 — a new reader waits for approval.** `members.active` now defaults to
  `false`, the join policy refuses a self-insert that claims `active = true`, and the
  app shows a "waiting for approval" screen instead of an empty queue. Chief-only, by
  design. The app half is deployed and running; whether the migration paste landed is
  the one thing not provable from here (see the check in "What is left").
- **Demo reset — run and proven.** `demo-reset.sql` was pasted and its effects verified
  from the outside: *The Last Ferry* back to `In review`, *Porcelain* to `Shortlist`,
  the `hello notes` rating gone, the seeded `2` present, and the Nov 17 submission
  untouched.
- **`74c4fa0`** — `demo-reset.sql` now re-seeds one rating instead of leaving the
  demo with none, plus `deploy-pages@v5` (green), the Node-22 documentation fix, a
  teaching-vs-real callout in tutorial part 4, and the live-state probe written down
  in `AGENTS.md` §7. One "Node.js 20 is deprecated" warning line remains, from four
  actions' own runtimes; left deliberately (§3).
- **`5107b20`** — made demo access a **build-time** decision (`VITE_DEMO_MODE`), so
  the published logins cannot reach a live build by accident. Details below.

- **`5361e34`** — recorded the Nov 17 verification pass in `AGENTS.md` and the
  README, and named the two stray probe objects as a known wart.
- **`a872df2`** — gave the site a **front door**: `docs/index.md` now leads with
  *"Open the live app →"*, a **QR code** (`docs/assets/app-qr.png`, decoded and
  confirmed to point at the app URL), and a link to the new handoff page.
  Before this, the site did not link the app at all — only someone who already
  knew the `/app/` subpath could find it.
- **`ebd4b9c`** — constrained the QR to 220px so it doesn't swallow the page.
- **`3740d4b`**, **`d16124d`** — filed and described the four open issues in
  `AGENTS.md` §8.
- **`docs/handoff.md`** — one page for the club: what they inherit, the
  free-tier pause ritual, the demo-reset lever, and what is not built.
- **`app/supabase/demo-reset.sql`** — paste-to-undo for a public demo: restores the six
  seed statuses (with `decided_at` travelling alongside), clears sample ratings, puts
  both demo logins back in their roles, and since Nov 18 restores staffs and one
  assignment. **Executed and proved** — see the Nov 17 entry above.
- **Issue #5** — require an editor to approve a reader before the queue opens.
  *Done and proved Nov 19: the policy is applied, and the `pg_policies` check returns
  `true`, so the database itself refuses a self-approving sign-up.*
- **Issue #6** — let editors assign submissions to readers. *Phase 1 built Nov 18; the
  reading-week half is still open.*
- **Issue #7** — take the published demo logins out before a real reading period.
  *Phase 1 built (the build-time switch); deleting the accounts is the gate.*
- **Issue #8** — send real email (auth mail off the demo mailer, then decision letters).

---

## The demo-mode switch (issue #7, phase 1) — done and green

`VITE_DEMO_MODE` is now a **build-time** decision (`5107b20`), so the published logins
cannot reach a live build by accident. Seven files:

| File | Change |
|---|---|
| `app/src/lib/demoMode.ts` | **new** — `DEMO_ACCESS_ENABLED`, the build-time rule and its reasoning |
| `app/src/components/DemoAccessBox.tsx` | **new** — the only module that holds the demo credentials |
| `app/src/pages/LoginPage.tsx` | renders the box behind the flag; no longer imports credentials |
| `app/vite.config.ts` | a production build **fails** unless `VITE_DEMO_MODE` is `"true"` or `"false"` |
| `app/.env.production` | `VITE_DEMO_MODE=true` for the graded demo build |
| `app/playwright.config.ts` | mirrors the dev server's view into `E2E_DEMO_ACCESS` |
| `app/e2e/editor-gating.spec.ts` | the demo-box spec skips when demo access is off |

Verified Nov 17 after the refactor, not assumed:

- `npm run test:e2e` **17/17**, including the demo-box spec, so the
  `E2E_DEMO_ACCESS` wiring is right.
- `npm test` **71/71**, `npm run lint` exit 0, `tsc` clean.
- `VITE_DEMO_MODE=false npm run build` → **zero** matches for either demo address
  in `dist/assets/*.js`.
- `VITE_DEMO_MODE= npm run build` → fails loudly with the intended message.
- The default build (`.env.production` → `true`) still contains both addresses, so
  the graded demo is intact — confirmed against the **live** bundle after the Pages
  deploy of `a608762` went green.

Phase 2 of #7 is still the gate: before a real reading period the two accounts
must be **deleted** (not just switched off), because the passwords are in git
history.

---

## What is left

### Needs your hands (four small things, no code)

> **Phase 0 and Phase 1 are done (Nov 19).** The reader-approval migration is applied
> and proved (`db_is_the_gate` → `true`). The Hanover student reader was approved, and
> the approval is visible in `member_audit`. "Among Us" stays `Accepted` on purpose —
> it is the end-to-end proof, not an accident.

1. **Prove email delivery once** — at the live `/login`, use **Forgot password?** with
   a real inbox that belongs to an **existing** account (your chief account), not a
   fresh sign-up: a new account leaves a `members` row that no one can delete. Routing
   is proven; **delivery is not**. If the mail lands, the caveat comes out of the
   README; if it doesn't, that is the real blocker found with five days to spare. The
   mailer is rate-limited — one attempt, then wait.
2. **Open the app on a phone, on cellular** — every check so far ran from one
   machine. Thirty seconds, and it is the only honest proof of "public".
3. **Take one screenshot of the reader view** with no author name on it — the
   artifact that makes the security claim legible in a demo.

### Open issues, in the order I would defend

| Order | Issue | Why here |
|---|---|---|
| 1 | **#8 phase 0** — Resend as Supabase Auth's SMTP | One day, no app code, turns password recovery from "routes correctly" into "delivers" |
| 2 | **#7 phase 2** — delete the published demo logins | **A gate, not a date:** no published credential may exist when the first real manuscript arrives. The switch (phase 1) is done; the accounts still exist |
| 3 | **#5** — approve readers | **Closed Nov 19.** The migration is applied and the `pg_policies` check now returns `true`: the database refuses a self-approving sign-up |
| 4 | **#6 remainder** — reading weeks and workload counts | Phase 1 (assignments) is built and live; weeks are a scheduling feature, not a security one; the decided model is recorded in `AGENTS.md` §9 #22 |

### Decisions waiting on you

- **#5:** approval by the **Chief Editor only** (no schema change) or by **any
  editor** (needs a policy widening that hands every editor the staff list,
  including emails)?
- **#6:** **answered Nov 18** — assignments are **advisory**: the queue shows
  *Assigned to you* above everything else, because strict RLS assignment would hide an
  unassigned story from everyone. Only the Chief Editor hands work out; that is the
  recorded trade-off (a chief who is offline is a bottleneck).
- **#8:** does `Hold` get a letter, and whose words are in it? That is Kennings'
  voice, not the project's.

### Blocked on someone else

- **DNS on `kenningsliteraryjournal.com`** — the custom domain, Resend's SPF/DKIM,
  and therefore working mail all sit behind the club's DNS access.
- **Deleting the orphan storage uploads** — needs the dashboard or a service key; the
  two documented probes are already gone.

---

## The four things to remember

1. **No published credential after go-live.** The demo Chief Editor can read
   `authors`, so a live period with the demo box on hands any visitor every
   writer's name and email. That is why #7 is a gate.
2. **The security story is the database, not the UI.** Anything that moves author
   identity into `submissions`, or gives readers a policy on `authors`, breaks the
   whole point of the project.
3. **The free tier pauses after ~7 days idle.** The keep-alive cron pings it every
   3 days; a **red run means paused**, not broken. GitHub disables scheduled jobs
   after 60 days without a commit — any commit restarts it.
4. **A dashboard "Saved" is not saved** until proven from outside. The Site URL
   appeared to save twice while the project kept the old value.

---

## Where the detail lives

- `AGENTS.md` — the short handoff for agents: state, commands, schema, RLS, the gotchas
  that bite first, open work, decisions
- `agent-docs/` — the long tail: `gotchas.md` (every gotcha in full), `history.md` (what
  was built when, and what was proven), `decisions.md` (the 22 decisions with reasoning)
- `app/README.md` — developer docs: commands, RLS matrix, known gaps
- `docs/handoff.md` — the club-facing page (also live on the site)
- `app/supabase/demo-reset.sql` — the undo for a vandalised demo
