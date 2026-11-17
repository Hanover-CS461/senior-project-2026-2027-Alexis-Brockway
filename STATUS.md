# Project status — Nov 17, 2026

Everything in one place: what is live, what was verified and when, what shipped
today, and what is left. `AGENTS.md` remains the detailed handoff for agents; this
page is the summary a human reads first.

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

## Verified on Nov 17 (nothing assumed)

| Check | Result |
|---|---|
| `npm test` (unit + live anon-RLS) | **66/66**, 10 files, 0 skips |
| `npm run test:e2e` (Chromium) | **17/17**, 22.6s |
| `npm run lint` | exit 0 (warnings only, unchanged) |
| Live site and `/app/` | **200 / 200** |
| Keep-alive cron | green Nov 13 and Nov 16 |
| Pages deploy runs | every run since Nov 11 green |
| Browser walkthrough of the **deployed** app | **16/16**, no console errors |

What the walkthrough proved, signed in through the published demo buttons:

- Reader demo lands on `/reader`, sees all six seeded pieces, **no author contact fields**.
- Chief demo lands on `/editor`; the detail page shows `David Reyes · david.reyes@example.com` and `2.0 / 5 average from 1 reader`.
- The **Export** tab downloads a real CSV.
- `/app/submit` survives the Pages fallback; refreshing a deep `/app/editor/<id>` URL stays put.

Also probed: anonymous listing of the `manuscripts` bucket returns `[]`, so the
file boundary holds.

---

## What the live project actually holds (probed Nov 17, read-only)

Signing in as the published demo Chief and reading the rows turns up more than
the seed file describes, and none of it is what a visitor should see:

- **Seven submissions, not six.** One arrived **Nov 17 through the public form**
  from a Hanover student address, and it currently reads `Accepted`. It is not
  sample data and must not be deleted casually — a real writer's manuscript looks
  exactly like junk from the outside.
- **Two seed statuses have drifted**: *The Last Ferry* is `Rejected` and
  *Porcelain* is `Received`, where the seed says `In review` and `Shortlist`.
- **Six member rows**: the two demo accounts, plus personal addresses — one of
  which holds **`chief_editor`**. That one is your own second account (confirmed
  Nov 17), so it stays.
- **A student signed up and is an active `reader` today**, so unpublished work is
  already visible to someone outside the club. That is issue #5, live.
- Three ratings, one of them carrying the notes `hello notes`.

RLS still holds — a reader sees no author identity — so this is not a blind-review
breach. It is the demo looking messy, plus the two risks #5 and #7 describe
happening in miniature. `app/supabase/demo-reset.sql` is the undo for the six
seeded pieces; it deliberately leaves the seventh alone.

---


## Shipped today (committed and deployed)

- **#5 phase 1 — a new reader waits for approval.** `members.active` now defaults to
  `false`, the join policy refuses a self-insert that claims `active = true`, and the
  app shows a "waiting for approval" screen instead of an empty queue. Chief-only, by
  design. Pending: the migration paste (below).
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
- **`app/supabase/demo-reset.sql`** — paste-to-undo for a public demo: restores
  the six seed statuses (with `decided_at` travelling alongside), clears sample
  ratings, and puts both demo logins back in their roles. **Never executed** —
  reviewed against the two check constraints, not run. Paste it once to prove it.
- **Issue #5** — require an editor to approve a reader before the queue opens.
- **Issue #6** — let editors assign submissions to readers for a reading week.
- **Issue #7** — take the published demo logins out before a real reading period.
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
- `npm test` **66/66**, `npm run lint` exit 0, `tsc` clean.
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

1. **Paste two files** into the dashboard SQL editor (the CLI isn't linked, so this
   is the one thing I can't run):
   - `app/supabase/demo-reset.sql` — restores the six seed statuses, clears the junk
     ratings, puts one sensible rating back, re-asserts both demo roles.
   - `app/supabase/migrations/20261117000000_reader_approval.sql` — makes a new
     sign-up a pending reader. The app half is live already; this is the half that
     stops a hand-rolled request from approving itself.
   Each file ends in `select`s that print what it did.
2. **Decide what happens to the seventh submission** (the Nov 17 one from a Hanover
   student, now `Accepted`). It is not sample data, so I won't touch it.
3. **Delete two probe files** — Supabase dashboard → Storage → `manuscripts` →
   `probe.txt`, and `manuscripts/samples` → `probe-test.txt`. The app cannot: anon
   has an insert policy on Storage and no delete policy. Inert, but visible to
   anyone browsing the bucket.
4. **Prove email delivery once** — sign up at the live `/login` with a real inbox,
   then walk `/forgot-password`. Routing is proven; **delivery is not**. If it
   lands, a caveat comes out of the README. If it doesn't, that is the real
   blocker found with a week to spare.
5. **Open the app on a phone, on cellular** — every check so far ran from one
   machine. Thirty seconds, and it is the only honest proof of "public".

### Open issues, in the order I would defend

| Order | Issue | Why here |
|---|---|---|
| 1 | **#8 phase 0** — Resend as Supabase Auth's SMTP | One day, no app code, turns password recovery from "routes correctly" into "delivers" |
| 2 | **#7 phase 2** — delete the published demo logins | **A gate, not a date:** no published credential may exist when the first real manuscript arrives. The switch (phase 1) is done; the accounts still exist |
| 3 | **#5** — approve readers | **Built, waiting on one paste.** Until it lands, the app half already gates new sign-ups, but only the policy stops a hand-rolled insert |
| 4 | **#6** — weekly assignments | Depends on #5; both change what a reader sees |

### Decisions waiting on you

- **#5:** approval by the **Chief Editor only** (no schema change) or by **any
  editor** (needs a policy widening that hands every editor the staff list,
  including emails)?
- **#6:** **advisory** assignments (organise the queue, everyone can still read
  anything) or **strict** ones enforced in RLS (an unassigned story is invisible
  to everyone)?
- **#8:** does `Hold` get a letter, and whose words are in it? That is Kennings'
  voice, not the project's.

### Blocked on someone else

- **DNS on `kenningsliteraryjournal.com`** — the custom domain, Resend's SPF/DKIM,
  and therefore working mail all sit behind the club's DNS access.
- **Deleting the stray storage objects** — needs the dashboard or a service key.

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

- `AGENTS.md` — full handoff: schema, RLS policies, every gotcha, decision history
- `app/README.md` — developer docs: commands, RLS matrix, known gaps
- `docs/handoff.md` — the club-facing page (also live on the site)
- `app/supabase/demo-reset.sql` — the undo for a vandalised demo
