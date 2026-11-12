# Kennings Submission Manager

A club-scoped submission manager for **Kennings**, Hanover College's literary
journal. It replaces the paid Submittable workflow — intake, blind review, reader
notes, and decisions — at essentially zero cost.

**Live app:** https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/app/
**Project site:** https://hanover-cs461.github.io/senior-project-2026-2027-Alexis-Brockway/
**Handoff notes:** [`../AGENTS.md`](../AGENTS.md) — read this first.

## The idea

Blind review is enforced by the **database**, not the interface. Author identity
lives in its own table (`authors`), and readers have no RLS policy on it at all.
A reader cannot fetch who wrote a submission even by calling the API directly with
their own token — the database refuses. Nothing in the UI is hiding it.

| Role | Can read submissions | Can read authors | Can manage staff |
|---|---|---|---|
| Anonymous writer | insert only | insert only | no |
| Reader | yes (active) | **no policy — impossible** | no |
| Editor and up | yes | yes | no |
| Chief Editor | yes | yes | yes |

## Running it locally

```bash
cd app
npm install
npm run dev -- --host 0.0.0.0    # --host so a Windows browser can reach WSL
```

Open http://localhost:5173/.

Supabase credentials come from `app/.env` (gitignored). A fresh clone can copy
`app/.env.production`, which holds the project URL and the **publishable** key —
both public by design, since Vite inlines them into the bundle anyway. RLS is what
protects the data. Never put a `service_role` / `sb_secret_…` key in this app.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run lint` | oxlint (warnings only; must stay exit-0) |
| `npm test` | Vitest: unit + live anon-RLS + authenticated RLS (env-gated) |
| `npm run test:e2e` | Playwright browser specs |
| `npm run db:push` | Apply migrations to the live project (needs `db:link`) |
| `npm run db:new -- <name>` | Create a new timestamped migration |

Database changes are **code**: the schema lives in `app/supabase/migrations/` and
is applied in order. Never edit a migration that has already been applied — add a
new one.

## Testing

`npm test` covers role helpers, the membership join logic, and the live RLS
boundary. `npm run test:e2e` drives the real UI in Chromium.

Seven tests are **skipped unless `app/.env.test` exists** (see `.env.test.example`):

- `src/lib/rls-auth.test.ts` — a signed-in reader is blind to `authors` and sees
  only their own membership row; the Chief Editor is unblinded.
- `e2e/authenticated.spec.ts` — a reader lands in the queue and is still stopped at
  `/editor`, the Chief Editor walks through and can export the CSV, and a signed-in
  reader never sees an author's name.

Those credentials are deliberately **not committed**, so CI runs the anonymous
half only. Locally, filling in `.env.test` activates the rest.

## Demo access

Sample data is seeded (`app/supabase/seed.sql`), so the queue and reader flow have
something to show. Every submission, author and manuscript in it is fictional.

These two accounts are also listed on the sign-in page, so a visitor can look around
without creating an account. They are throwaway accounts — publishing them costs
nothing, because the only key in the bundle is the publishable one and RLS decides
what a role can read. They are the same accounts the authenticated tests use, so
they must keep their roles.

| Account | Email | Password |
|---|---|---|
| Chief Editor | `kennings.chief@example.com` | `KenningsTest2026!` |
| Reader | `kennings.reader@example.com` | `KenningsTest2026!` |

## Blind review, down to the file

The database hides who wrote a submission. A file is a second way to find out, so
intake closes that too:

- **The stored name is generic.** Uploads land at `<uuid>/manuscript.<ext>`, never the
  author's filename — `manuscript_path` is readable by readers, so
  `Alexis_Brockway_draft3.docx` would have given the game away.
- **Metadata is stripped in the browser before the upload.** Images are re-encoded
  through a canvas (which drops EXIF, IPTC, XMP and PNG text chunks), `.docx` has its
  creator / last-modified-by / title / company fields blanked, and PDFs get their info
  dictionary cleared.
- **What is not covered:** the legacy `.doc` format cannot be scrubbed — the form warns
  as soon as one is chosen — and `pdf-lib` does not reach PDF XMP packets. Someone who
  skips the form entirely can still upload straight to Storage with the publishable key;
  that boundary is RLS, not the form. See issue #3 in `../AGENTS.md` for the plan.

## Export

The editor dashboard's **Export** tab writes what the club owns to CSV: submissions
joined with author and average score, reader scores and notes, and (Chief Editor
only) the staff list. Nothing is stored on a server — the queries run through the
signed-in session, so the export can only ever contain what RLS already lets that
person read. Cells that begin with `=`, `+`, `-` or `@` are prefixed with an
apostrophe, so a submission titled like a spreadsheet formula cannot execute when
the file is opened.


## Stack

React 19 + Vite + TypeScript, Supabase (Postgres, Auth, Storage, RLS), hosted on
GitHub Pages under the existing Jekyll site. One deploy pipeline, no servers to
maintain after graduation.

## Known gaps

- The legacy `.doc` format cannot be scrubbed of author metadata, and PDF XMP packets
  survive `pdf-lib` — both are named in "Blind review, down to the file" above.
- Reader notes are shown to editors without attribution, because only the Chief
  Editor may read the `members` table. The export follows the same rule: the
  scores file carries the notes but no reader column.
- Decision letters and email (Resend) are not built.
- Auth email rides Supabase's built-in demo mailer, which is rate-limited to a
  handful per hour and often lands in spam. Password recovery *routes* correctly — a
  reset link always comes back to the deployed app, not to `localhost` — but delivery
  to a real inbox has not been verified. Production auth mail belongs on Resend, like
  the decision letters will.
- Sign-up is open. Anyone who finds the sign-in page can create an account, and
  they join as a Reader; there are no invite codes yet. The boundary that still holds
  is the one that matters: a Reader cannot read the `authors` table, so a stranger
  with an account sees manuscripts, never names.
- The free tier pauses the database after about a week of inactivity, and a paused
  project is a broken queue even though the page still loads.
  `.github/workflows/keep-alive.yml` pings it every three days for exactly that reason:
  a **red run means the project is paused**, and it needs reactivating from the
  Supabase dashboard. GitHub also disables scheduled workflows after 60 days of repo
  inactivity, so any commit restarts the cron.
