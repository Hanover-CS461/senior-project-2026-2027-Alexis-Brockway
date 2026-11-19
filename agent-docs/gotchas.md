# Gotchas — the full list

Reference file for `AGENTS.md` §7. Everything here was learned by hitting it.
Each entry is **symptom → cause → fix**, with the proof that it is real.

Grouped by where it bites, not by when it happened. Dates are kept because
"how long was this true" is sometimes the point.

---

## 1. The live database, and how changes reach it

**The repo is the source of truth; the database is edited by pasting.**
The schema lives in `app/supabase/migrations/` (timestamped, applied in order).
But the Supabase CLI has **never been linked on this machine** — `app/supabase/.temp`
holds a `cli-latest` file and no `project-ref`, so anything requiring `--linked`
(`db:push`, `db query`, `config push`) is unavailable.

Consequences:

- The working path is a **manual paste into the dashboard SQL editor**.
- Nothing is recorded in `supabase_migrations.schema_migrations`, so the CLI thinks
  every migration is unapplied. They are idempotent, so a later `db:push` re-runs
  harmlessly — but expect it to try.
- To get `--linked` working: `npm run db:login` (Supabase PAT) then `npm run db:link`
  (database password). Neither has ever succeeded here.
- **Do not paste SQL into the dashboard as an experiment** — write a migration and
  commit it, then paste *that*. Never edit a migration that has already been pasted;
  add a new one.

**Deployment sequencing: paste the migration before pushing code that reads a new
column.** PostgREST answers `42703 column … does not exist` for a `select` of a
column the table does not have yet, which blanks the page. Seen with
`submissions.decided_at` and again with `members.staffs`. Because the paste is
manual and the push is not, the safe order is always: write the migration → commit →
*user pastes* → push. A deploy that lands first is a broken app, not a slow one.

**A dashboard change reported as "saved" is not saved until something outside the
dashboard says so.** The Site URL and the redirect allow-list both reported success
while the project kept `localhost:3000` (Nov 11–12, twice). The cheap proof is a
probe (§2 below); the general rule is that a save is a claim, not a fact.

**A failed SQL paste rolls back and looks like nothing happened.** The SQL editor
wraps what you give it in one transaction, so if statement 7 throws, the six before
it are undone too and the screen just says there was an error. That is why
`app/supabase/demo-reset.sql` opens with a `do $$ … $$` guard that aborts with a
readable message when a demo account is missing, instead of failing later on a
foreign key. When a paste "didn't do anything," re-read the output for the *first*
error rather than pasting again.

**A policy cannot be read from PostgREST, so a policy change has no visible trace.**
`20261117000000_reader_approval.sql` is committed and the app half is deployed, so a
new sign-up already sends `active = false` — but the *lock* (the join policy refusing
a hand-rolled insert that claims `active = true`) can only be confirmed in SQL:

```sql
select policyname, with_check from pg_policies
where tablename = 'members' and policyname = 'members join once, first as chief';
```

`with_check` must contain `active = false`. Same class of lesson as the auth-URL
probes: a change the dashboard reports as saved is not saved until something outside

**Resolved Nov 19:** the first read showed the old policy, the migration was pasted,
and the check then returned `true` (`with_check ~ 'active\s*=\s*false'`). The query
above still works; the regex form is easier to read as a single word.
the dashboard says so. **Status: this query has not been run yet.**

**A paused project drops its DNS record — that is not deletion.** On Oct 27 the
project read as NXDOMAIN, which is indistinguishable from a deleted project, and was
wrongly written off. It was merely paused (free tier, ~1 week idle). The reliable
signal is HTTP, not DNS: a paused project resolves and returns Cloudflare **521 "Web
server is down"**, and "Restore project" brings the data back intact. Restore takes a
few minutes and the schema cache lags — tables may 404 with `PGRST205` before they
reappear.

**The free tier caps you at 2 active projects.** This repo uses one project for both
the app and the tests on purpose (decision 12), so that budget stays unspent.

---

## 2. Auth, email, and links

**A rejected `redirect_to` falls back to the project's `site_url` — it is not
harmless.** This is how every reset email in the project pointed at
`http://localhost:3000` for two days. Prove the current state in one request (an
invalid token makes GoTrue redirect without sending mail):

```bash
curl -s -o /dev/null -D - "$URL/auth/v1/verify?token=nope&type=recovery&redirect_to=$APP_ROOT" | grep -i location
curl -s -o /dev/null -D - "$URL/auth/v1/verify?token=nope&type=recovery" | grep -i location   # the Site URL itself
```

Both `location:` values must start with the Pages app URL. On Nov 11 the first
printed `http://localhost:3000#error=…` while the allow-list *did* accept
`localhost:5173` and `localhost:3000` — which is why a link requested from a local
dev copy looked fine and a link from the live site did not. Fixed Nov 12: the
allow-list got the Pages URL first, the Site URL second, and all three probes
(including the one with no `redirect_to`) now land on the app. **Re-run this whenever
auth mail is suspect — it costs one request and no email.** `config.toml` was right
the whole time, which is why it is not the source of truth here: the dashboard is.

**A password-reset link must land on the app root, never on `/reset-password`.**
On Pages a deep link is answered by `404.html`, which stashes the path in
`sessionStorage` and bounces to `/app/`, and `main.tsx` restores it with
`history.replaceState`. But the Supabase client is constructed at module import —
*before* that restore runs — so it reads the URL while the page is still on the
fallback, sees no `#access_token`, and quietly drops the recovery token. So
`redirectTo` comes from `lib/appUrl.ts` (always the **deployed** URL, never
`window.location.origin`, so requesting from a dev copy does not produce a localhost
link), the client fires `PASSWORD_RECOVERY`, and `AuthProvider` exposes a `recovery`
flag the router uses to forward to the form.

**A dead auth link must say so.** Supabase returns failures as
`#error=access_denied&error_description=…`, which creates no session and fires no
event; supabase-js ignores it and the visitor lands on the home page with no
explanation — that is what "the link does nothing" looked like on Nov 11.
`lib/supabase.ts` captures the fragment at import, before the client rewrites it, and
the router forwards it to `/reset-password`, which explains it. Any future auth link
(magic link, invite) should go through the same path.

**A failed click consumes the single-use token**, so retrying the same link fails for
a *second* reason. When a link "doesn't work twice," check the cause of the first
failure before debugging the second.

**Supabase's built-in auth email is a demo, not a mail service.** The free tier's
shared sender is heavily rate-limited (a handful per hour — a 429 surfaces as "too
many reset emails") and routinely lands in spam. It is enough to prove the flow, not
enough for a real reading period; production auth mail belongs on Resend like the
decision letters. It also means the recovery flow **cannot be tested with the
`@example.com` demo accounts** — no inbox exists. Create an account with a real
address to prove delivery, and reset that account's password. **Delivery was proven
Nov 19, 2026:** a reset mail reached a real Gmail inbox and its link opened the
change-password form on the deployed app. Routing *and* one delivery are now facts;
the rate limit and spam placement are what still make this a demo mailer.

**Locked out and the reset email is dead? Set the password in SQL.** The SQL editor
runs as `postgres`, so this needs no service key and no email:

```sql
update auth.users
set encrypted_password = crypt('<new password>', gen_salt('bf')), updated_at = now()
where email = '<their email>';
```

Find the row with `select email, created_at::date, last_sign_in_at::date from
auth.users order by created_at;` (`crypt`/`gen_salt` come from pgcrypto, which ships
with every project; if missing, `create extension if not exists pgcrypto;` first).
**Password sign-in never touches `site_url`** — only emailed links do — which is why
a locked-out user can sign in the moment the hash is set. Treat this as an emergency
lever, not a feature: it skips the password policy and leaves no audit row. It cannot
change a role; that is `update public.members set role = 'chief_editor' where
email = '…';`.

**Dev email confirmation:** Supabase confirms emails by default, which breaks fake
test accounts. Either confirm via SQL (`update auth.users set email_confirmed_at =
now(), confirmation_token = '' where email = '<email>';`) or turn off "Confirm email"
under Authentication → Providers → Email. Live state as of Nov 5: **off**
(`mailer_autoconfirm: true`), so sign-up returns a live session immediately.

**Anything that routes on the role must wait for the member row.** `member` is null
both *before* the lookup finishes and for a session that has no `members` row, so a
page reading `member?.role` during that gap sees a reader. `AuthProvider` exposes
`memberLoading` and both `LoginPage` and `RequireAuth` wait on it; without that an
editor is briefly mis-routed to `/reader` on every sign-in. `landingFor()` in
`lib/roles.ts` is the single rule for "where does this role belong".

---

## 3. Keys, credentials, and what is public on purpose

**Two keys, only one secret.** `sb_publishable_…` is public by design: it is
committed in `app/.env.production` on purpose and Vite inlines it into the bundle
every visitor downloads. It identifies the project and grants nothing — RLS is the
boundary. `sb_secret_…` / `service_role` **bypasses RLS entirely** and must only ever
live in Edge Function secrets (`supabase secrets set`), a local gitignored env file,
or GitHub repository secrets. Verified Nov 5: no secret key exists anywhere in the
tree or in git history. With the publishable key a stranger can *submit a
manuscript*, *upload a file*, and *sign up* — and can read **nothing** (authors,
members, ratings all return `[]`). Rotating the publishable key is never an incident;
rotating the secret key is one click at Settings → API.

**The demo credentials are in the source on purpose.** `app/src/lib/demoAccounts.ts`
holds two throwaway logins and `/login` offers them one-click. This is decision 15,
not a leak: those accounts see seeded fictional data only, and the bundle's only key
is the publishable one. Two consequences to remember: they are the **same two
accounts `app/.env.test` signs in as**, so `.env.test` being gitignored no longer
hides anything; and a visitor who changes a demo role breaks `npm run test:e2e`
locally. Worth a line in any handoff talk.

**A published credential has to be absent from the bundle, not hidden in the UI.**
`LoginPage` no longer imports `demoAccounts.ts`; the credentials live in one leaf
component (`components/DemoAccessBox.tsx`) rendered behind `DEMO_ACCESS_ENABLED`
(`lib/demoMode.ts`), so a build with `VITE_DEMO_MODE=false` drops both and greps
**0** in `dist/assets/*.js`. `vite.config.ts` throws if the flag is neither `"true"`
nor `"false"`, so "nobody remembered" cannot ship silently either way;
`.env.production` says `true` for the graded demo. The dev server defaults on, and
`playwright.config.ts` mirrors it into `E2E_DEMO_ACCESS` so the demo-box spec skips
(rather than failing) against a no-demo build. What this does **not** do is delete the
accounts: the passwords are in git history, so deletion (#7 phase 2) is the only fix
before a real reading period.

**The live project is no longer demo-only, and the docs assumed it was.** A read-only
probe on Nov 17 (sign in as the published demo Chief with the publishable key, then
`GET /rest/v1/submissions` and `/members`) found a real manuscript posted through the
public form by a Hanover student address, one non-demo personal address holding
`chief_editor` (the owner's own second account, confirmed — not a stranger), and a
student sign-up already active as `reader`. **Do not treat a non-seed submission as
junk** — a real writer's manuscript looks exactly like junk from the outside, which
is why `demo-reset.sql`'s delete block is commented out. Probe the rows before
writing any statement that names a table you did not seed, and keep personal
addresses out of `STATUS.md`/`AGENTS.md`/`agent-docs/` — this repo is public.

**A published demo Chief is a real disclosure risk.** The demo Chief can read
`authors`, so the day Kennings opens a real reading period with the demo box live,
anyone with the URL is one click from every writer's identity. That is why #7 is a
**gate, not a date**.

**One orphan auth user exists** — created while testing which domains Supabase's
sign-up accepts. It has **no** `members` row, so it is invisible in the Staff tab and
can read nothing, but deleting it needs a service-role key. Harmless; it is listed so
nobody rediscovers it and wonders.

---

## 4. Uploads and metadata

**Metadata is stripped in the browser, at intake** (`app/src/lib/scrub.ts`, Nov 12).
Images are re-encoded through a canvas (EXIF/IPTC/XMP/PNG text chunks all die with
the old bytes), `.docx` is unzipped and its `dc:creator` / `cp:lastModifiedBy` /
`title` / `subject` / `Company` / `Manager` fields are blanked, and PDFs get their
info dictionary cleared with `pdf-lib` (loaded on demand — a Word submission never
downloads the ~176 kB chunk). **`.doc` is allowed but cannot be scrubbed**, so the
form warns the moment one is chosen; that is the one format where the promise is
qualified. Residual risk, stated plainly: `pdf-lib` does not reach XMP packets, and
an author who skips the app entirely can upload straight to Storage with the
publishable key — the boundary there is RLS, not the form. Closing that last one
means dropping the anon upload policy and routing uploads through an Edge Function
(see `decisions.md` #16).

**`manuscript_path` must never contain the author's filename.** It did until Nov 12
(`<uuid>/Alexis_Brockway_draft3.docx`), and readers can read `submissions`, so that
handed them the identity the whole design exists to withhold — a bigger hole than
EXIF, and one no amount of form design closes. Uploads now store
`<uuid>/manuscript.<ext>` (`storageNameFor()` in `lib/scrub.ts`). If you ever change
the upload path, keep the name generic.

**Storage uploads must not use `x-upsert`.** Anon has an INSERT policy on
`storage.objects` and deliberately **no** UPDATE policy, so an upsert fails with a
403 "violates row-level security". A plain
`POST /storage/v1/object/manuscripts/<path>` works.

**The two documented stray objects are gone (Nov 19).** `manuscripts/probe.txt` and
`manuscripts/samples/probe-test.txt` were deleted from the dashboard and the deletion
was proved from outside with the chief's own bucket listing; all six seed manuscripts
survived. What remains is clutter of a different kind: `curl-test/`,
`node-test-1790263302941/`, and **seven UUID folders of orphaned test uploads**
(`testForProject.docx`, `Health & Safety Checks Guide.docx`) that no submission row
references. Only `a0093e54-…/manuscript.docx` is real — it is the *Among Us* upload.
Anon still cannot list or download any of it. **Post-deadline cleanup.**

---

## 5. Content that is executable

**A CSV is executable content.** Exported cells are prefixed with an apostrophe when
they start with `=`, `+`, `-` or `@`, because a submission titled
`=HYPERLINK("http://…"&A1)` would otherwise run on open in Excel or Sheets. That is
`escapeCell()` in `lib/csv.ts`, and it is why the CSV builder is a pure module with
tests rather than string concatenation inside a button handler.

**A `<select>` is not a safe control for an irreversible action.** The status
dropdown saves on `change`, so a mouse-wheel scroll over a focused select changes it.
That is why decisions are buttons behind a `window.confirm`, not three more options.

**Readers must not see the outcome.** `readerStatus()` in `statuses.ts` renders the
three decision states as **"With editors"** on both the queue and the detail page;
`statuses.test.ts` asserts the word itself never reaches a reader. Reversing that is
one constant, but it is a workflow decision about Kennings, not a technical one
(decision 14).

**`status` and `decided_at` must be written together.** The
`submissions_decided_at_matches_status` constraint rejects a decision with no
timestamp *and* a timestamp on a workflow status. Any code (or hand-run SQL) that
updates only `status` to `Accepted`/`Hold`/`Rejected` now fails with a check
violation — intended, and it surfaces bugs loudly instead of storing an inconsistent
row.

---

## 6. Testing

**The suites are read-only, and that is a design constraint, not a preference.**
There is **no DELETE policy** on `submissions`, `members`, or `assignments`, and anon
cannot delete Storage objects, so any test that writes leaves a permanent row in the
project a grader looks at. Two workarounds exist and are worth copying:

- `e2e/metadata-scrub.spec.ts` imports the app's own module *in the page* — in dev,
  Vite serves `/src/lib/scrub.ts`, so `page.evaluate(() => import('/src/lib/scrub.ts'))`
  runs the real scrubber on a real `File` with no form and no write. The spec only
  works against the dev server (the deployed bundle has no per-module URLs), and the
  canvas path is the one piece of scrubbing that cannot be a unit test.
- `authenticated.spec.ts` asserts the Reading panel renders and the picker is
  populated, but never presses Assign — the fan-out itself is covered by
  `assignments.test.ts` and a manual pass over the deployed URL.

The general problem is shared across #5 (approve a reader), #6 (create an
assignment) and #7 (delete demo accounts): all three are writes. Decide a throwaway-
account/cleanup strategy once and it unblocks all of them.

**Blank `.env.test` values are not "absent".** `process.env.X ?? fallback` keeps the
empty string, so a template-following `.env.test` with `TEST_SUPABASE_URL=` silently
skipped the whole authenticated suite. `rls-auth.test.ts` now trims and treats `''`
as unset (fixed Nov 5).

**Playwright `click()` does not wait for sign-in.** The sign-in helper used to click
submit and return, so a test that navigated immediately reloaded the app before the
session was persisted and `RequireAuth` bounced it to `/login` — a race that looked
exactly like a broken auth guard. The helper now waits for the post-login redirect
(`expect(page).not.toHaveURL(/\/login$/)`). Any future spec that signs in must do the
same, or await a heading.

**`getByLabel('Password')` is a substring match, so it also hits the "Show password"
toggle.** Pass `{ exact: true }` when targeting the field. Two related traps in
`components/PasswordField.tsx`: the toggle must be a **sibling** of the `<label>`, not
a child, or it joins the label's control and renames the input to "Password Show
password" for a screen reader; and it must say `type="button"`, or clicking it
submits the form. `e2e/password-toggle.spec.ts` covers both.

**`src/lib/scrub.test.ts` takes ~25s on its own**, because importing `pdf-lib`
through Vite's transform pipeline is slow on `/mnt/c` — the work is milliseconds, the
module graph is not. That is the whole runtime of `npm test`.

---

## 7. UI states that read as bugs

**A half-loaded foreign key reads as broken data.** The Reading panel is two queries:
`assignments` says *who* holds a piece, the `members` select says *what they are
called*. Between the two replies the panel used to print **"Unknown reader"**, which
looks like a broken row rather than a race. `readingLoaded` now gates the list, so a
row is either a real name or not drawn yet — and it is never reset to `false` on a
reload, because blanking the list after Assign is the same wart in reverse. Any panel
that resolves a foreign key through a second query has this shape.

**A demo reset must reset *to* something, not just delete.**
`demo-reset.sql` used to clear every sample rating, which left the queue with no
"Scored" section and every editor page saying "no ratings yet" — a clean demo that
looked broken. It now re-seeds one rating from the demo Reader, restores the demo
logins' roles **and genre staffs**, seeds one reading assignment, and deletes
assignments a visitor created that point a demo account at a real manuscript. The
visible state is part of the artifact.

**A new sign-up is a pending stranger, and the UI has to say so.** Since
`20261117000000`, `members.active` defaults to `false` and the join policy refuses an
insert that claims otherwise, so a reader who signs up sees **nothing** until the
Chief Editor activates them. Two traps: (1) `MemberRow.active` is *optional* in the
type so a role check can omit it, and `isPendingApproval()` deliberately fails closed
(`active !== true`) — otherwise a query that forgot to select the column would
silently unlock an unpublished-work queue; (2) the bootstrap `chief_editor` branch
must keep `active = true`, or a brand-new project's first user would be gated by the
very rule they exist to override.

**Genre staffs are labels, not a gate.** `members.staffs` is readable with the member
row, which is what makes it cheap: a reader knows their own teams with no extra query
and no new policy, and nothing in the queue filters on it. Three traps: (1) a fifth
genre means updating `MEMBER_STAFF_SLUGS` **and** the `members_staffs_known` check
constraint — `staffs.test.ts` asserts both against `genres.ts` so drift fails a test
instead of silently becoming an unassignable staff; (2) `auth.tsx` selects `staffs`,
so deploying the app before the column exists makes every sign-in look like a reader
(`42703` is swallowed by the failed member lookup, `joinClub` returns null, the chief
lands on `/reader`) — paste first, push second; (3) assigning *yourself* to a team is
allowed (the chief reads too); only the role select and the Activate button are
disabled on your own row, because those are the two ways to lock yourself out.

---

## 8. Docs, Jekyll, and the deploy pipeline

**Liquid parses `{{`/`{%` even inside fenced code blocks.** A JSX
`value={{ … }}` triggers a syntax error in the docs site. Hoist to a variable or wrap
in `{% raw %}…{% endraw %}`. kramdown also prefixes heading anchors that start with a
number. Verify with `cd docs && bundle exec jekyll build --destination
/tmp/opencode/site` (expect `done in Xs`, no warnings).

**`docs/` is the published Jekyll site; the repo root is not.** Anything added under
`docs/` gets published and appears in the site's navigation unless the config excludes
it (`docs/_config.yml` currently excludes only `slides`). That is why agent-facing
notes live in `agent-docs/` at the repo root instead.

**Node is v22.22.1** and is on the default PATH (`/usr/bin/node`); `~/node/bin` also
has a copy. If a fresh terminal says "node not found":
`export PATH="$HOME/node/bin:$PATH"`. The Pages workflow pins `node-version: 22` to
match, so a "Node.js 20 is deprecated" line in a deploy log is never about that pin —
it is about an **action's own runtime**, and bumping the action is the only fix.
`deploy-pages` is on v5 and no longer warns; `checkout@v4`, `configure-pages@v5`,
`setup-node@v4` and `upload-artifact@v4` still name themselves and all run green.
Leave them until after the deadline: `upload-pages-artifact` v4+ changes **which
files are archived** (dotfiles excluded by default), which is not a change to make
the week a demo is graded.

**`gh` needs the `workflow` scope to touch `.github/workflows/`.** Without it the push
is rejected at the API layer: *"refusing to allow an OAuth App to create or update
workflow"*. Fix once with `gh auth refresh --hostname github.com --scopes workflow`.
Device-code auth expires in ~15 minutes; `gh auth status` shows granted scopes.

**`gh issue view` errors on this repo** ("Projects (classic) is being deprecated"); use
`gh api repos/Hanover-CS461/senior-project-2026-2027-Alexis-Brockway/issues/<n>`.

**Tutorial vs real schema mismatch:** `docs/tutorial/` teaches title-case roles
(`'Chief Editor'`/`'Reader'`) and a `members` table without `name`, while the app and
live DB use snake_case + `name`. The tutorial is a self-contained teaching artifact,
but reconciling it with the real schema is a known to-do.

---

## 9. Frontier / free-tier operations

**Supabase free tier pauses projects after ~1 week of inactivity.** A paused project
can only be resumed from a dashboard the reader has no access to, so for a public demo
URL this needs a keep-alive cron (`.github/workflows/keep-alive.yml`, since Oct 29):
it pings `app/.env.production`'s REST endpoint every 3 days and fails loudly if the
answer isn't 200, so a pause shows up as a red run instead of a broken app. **Caveat:**
GitHub disables scheduled workflows after 60 days of repository inactivity — any push
re-enables them. Hosting never fixes this; it stays the cron's job.

**Hosting is GitHub Pages under the existing Jekyll site**, at `/app/` — not the site
root, which would break the existing proposal link. Consequences that bite: Vite needs
a `base` path applied only on build (dev stays at `/`), `BrowserRouter` needs a
matching `basename` from `import.meta.env.BASE_URL`, and `docs/404.html` has to stash
deep links in `sessionStorage` for `main.tsx` to restore before the router mounts.
