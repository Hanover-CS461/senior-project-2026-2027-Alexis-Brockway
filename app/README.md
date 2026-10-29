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

Six tests are **skipped unless `app/.env.test` exists** (see `.env.test.example`):

- `src/lib/rls-auth.test.ts` — a signed-in reader is blind to `authors` and sees
  only their own membership row; the Chief Editor is unblinded.
- `e2e/authenticated.spec.ts` — the reader is stopped at `/editor`, the Chief
  Editor walks through, and a signed-in reader never sees an author's name.

Those credentials are deliberately **not committed**, so CI runs the anonymous
half only. Locally, filling in `.env.test` activates the rest.

## Demo access

Sample data is seeded (`app/supabase/seed.sql`), so the queue and reader flow have
something to show. Every submission, author and manuscript in it is fictional.

<!-- Fill in once the demo accounts are final. §13 of AGENTS.md requires them here
     and on the login page. -->
| Account | Email | Password |
|---|---|---|
| Chief Editor | _to fill in_ | _to fill in_ |
| Reader | _to fill in_ | _to fill in_ |

## Stack

React 19 + Vite + TypeScript, Supabase (Postgres, Auth, Storage, RLS), hosted on
GitHub Pages under the existing Jekyll site. One deploy pipeline, no servers to
maintain after graduation.

## Known gaps

- **Manuscript metadata is not stripped yet.** Files can still carry author
  identity in EXIF, PDF metadata, or `.docx` document properties — the one
  remaining hole in blind review. Tracked as issue #3.
- **No export yet.** The proposal promises every record is exportable.
- Reader notes are shown to editors without attribution, because only the Chief
  Editor may read the `members` table.
- Decision letters and email (Resend) are not built.
