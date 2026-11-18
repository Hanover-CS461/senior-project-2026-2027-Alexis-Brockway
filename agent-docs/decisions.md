# Decisions — with the reasoning

Reference file for `AGENTS.md` §9, which carries the same list as one line each.
**The numbers are stable and are cited from code comments and other docs**
(`decisions.md` #16 is quoted in `app/src/lib/scrub.ts`, for example). Add new
decisions at the end; never renumber.

Most of these are "do not re-litigate" items. If a decision needs to change, change it
deliberately and record the new one — don't quietly edit the old text.

---

1. **Ruled out AI story generators.** Wanted "English as a whole" — reading, analysis,
   editing, publishing — not a text generator.
2. **Candidates:** lit-journal manager / close-reading room / scansion instrument.
   **Chose the lit-journal manager.**
3. **Scope: one club, not a platform.** Hardcode their workflow. This is what makes it
   finishable in one semester; a platform would need configurable stages, roles, and
   bylaws.
4. **Simplified the stack** to React + Vite + Supabase + Resend + a static host.
5. **Prisma dropped** (the service role bypasses RLS, which contradicts the security
   story). **Next.js dropped** (login-gated app, no SEO need).
6. **The security story IS the project:** RLS + a separate `authors` table, so a reader
   physically cannot fetch identity even by calling the database directly.
7. **Kennings is the real club** — Hanover College's literary journal. Real submission
   rules pulled from their Submissions page on Sep 23, 2026 live in `src/data/genres.ts`.
8. **The app lives in `app/`**, separate from `docs/` (the Jekyll site).
9. Supabase project created Sep 24; the anon key is the `sb_publishable_…` format.
10. **Auth = in-app self sign-up**, and the first member becomes Chief Editor via an RLS
    policy — no app-side promotion, because the app cannot be trusted with the rule it
    is enforcing.
11. **Insert-without-read-back:** a role with only an INSERT policy cannot read back the
    row it just inserted, so the public form generates the submission id with
    `crypto.randomUUID()` in the browser and inserts an explicit id instead of
    `.insert().select().single()`.
12. **One database for the app and the tests** — no second Supabase project. The
    blind-review tests then prove the *deployed* policies, a stronger claim than
    proving a replica's. The cost, which is real: the suites must stay read-only,
    because there is no DELETE policy to clean up after a write.
13. **Decisions are an act, not a label.** `Accepted`/`Hold`/`Rejected` carry
    `decided_at`, need a confirm, and are undone explicitly; the workflow dropdown only
    holds the three in-progress states. Enforced by check constraint, not just by the
    UI, because a dropdown that saves on change can be scrolled by accident.
14. **Readers do not see the outcome.** All three decision states read "With editors" to
    a reader — the author learns from a decision letter, not from a queue badge.
    Reversing it is one constant, but it is a workflow decision about Kennings.
15. **No secret key in the app.** Seeding demo users goes through the sign-up API and
    export goes through the Chief Editor's own session, both of which need only the
    publishable key — so the app's boundary is only ever the RLS boundary. If an Edge
    Function ever needs elevated writes, it gets one named, non-`VITE_` secret used via
    `@supabase/server`'s `withSupabase({ auth: 'secret' })`. This is also why publishing
    demo logins is not a leak: the bundle holds nothing but the publishable key.
16. **Metadata is stripped in the browser, at intake** (Nov 12), not in an Edge
    Function. The adversary is a careless author whose word processor filled in their
    name, not someone deliberately evading the app, so scrubbing what the form receives
    removes the realistic exposure. An Edge Function would be stricter and could not
    ship before the deadline. The residual hole — an author who skips the form and
    uploads straight to Storage with the publishable key — is written down rather than
    papered over (`gotchas.md` §4). The strictest option, dropping the anon upload
    policy and routing everything through a function, remains the right long-term move.
17. **The stored object name is generic on purpose** (`<uuid>/manuscript.<ext>`).
    `manuscript_path` is visible to readers, so the author's filename in that path
    leaked the identity blind review exists to withhold. Nothing may reintroduce it: no
    original filenames, no author name in the path, ever.
18. **Demo access is a build-time decision** (Nov 17). `VITE_DEMO_MODE` must be `"true"`
    or `"false"` for any production build or the build fails, and `false` removes the
    credentials from the bundle instead of hiding the box — a hidden box is still a
    published password to anyone who reads the JavaScript. `.env.production` says `true`
    for the graded demo. Phase 2 is deleting the accounts, because the passwords are in
    git history.
19. **Approval is the Chief Editor's, and a new account is pending by default** (Nov 17).
    The alternative — any editor approves — needs the `members` SELECT policy widened,
    which hands every editor the whole staff list, emails included. So a reader
    self-inserts with `active = false`, the policy *refuses* an insert claiming
    otherwise, and the bootstrap chief branch keeps `active = true` so a fresh project
    can still be born. The rule lives in the database; the app only explains it.
20. **A demo reset must reset *to* something, not just delete.** `demo-reset.sql` used to
    clear every sample rating, which left the queue with no "Scored" section and every
    editor page saying "no ratings yet" — a clean demo that looked broken. It now
    re-seeds one rating from the demo Reader, restores roles and genre staffs, and seeds
    one assignment. The visible state is part of the artifact.
21. **A staff team is a label, not a permission** (Nov 17). Staffs live in one
    `text[]` on `members` rather than a join table, because there are four of them, the
    list already exists in `genres.ts`, and the existing `members` policies (chief reads
    all, chief updates, a member reads their own row) are exactly the rules the feature
    needs — so the change added a column and zero policies. Teams deliberately do **not**
    filter the queue: hiding work from a reader is issue #6's assignment model, which
    needs its own decision about unassigned stories. The empty array means "general
    staff" so nothing had to be backfilled, and a check constraint keeps the column to
    real genre slugs.
22. **An assignment is one reader, one manuscript — and only the chief hands it out**
    (Nov 18). `assignments` stores a row per (submission, reader); "assign the whole
    Fiction staff" is a fan-out of those rows, not a second kind of record, so the queue
    and the database only ever reason about one shape. `unique (submission_id,
    reader_id)` makes the fan-out idempotent. No `week_of`: issue #6 proposed it, but no
    screen has a reading-week concept, and a column nothing reads is a column nobody
    keeps correct. The assignment **highlights** rather than filters — the reader queue
    shows *Assigned to you* above the whole blind queue — because strict assignment
    hides unassigned work from everyone, and the failure mode is a piece nobody reads.
    Chief-only, which retired the planned `list_readers()` function: the panel does not
    render for other editors, and the chief already reads `members`. The cost, stated
    plainly: only editors can see who owes a read, and a chief who is offline is a
    bottleneck. Reassignment is delete + insert — there is no UPDATE policy, so an
    assignment cannot be quietly rewritten in place.

---

## Appendix — glossary (full)

`AGENTS.md` §11 keeps the short list an agent needs constantly. The rest:

- **Anon / publishable key** — the public "door key" baked into the frontend; grants
  nothing by itself. Now `sb_publishable_…`.
- **Login token** — the "ID card" a staff member gets at login; carries their role;
  checked by RLS on every request.
- **RLS** — database rules deciding what each role can read; makes blind review
  structural.
- **Blind review** — readers see title/genre/manuscript only, never author.
- **Insert-without-read-back** — an INSERT-only role can't use `.insert().select()`;
  generate the UUID client-side instead.
- **Signed URL** — a temporary, time-limited link to a private Storage file (the editor
  detail page uses one).
- **Bootstrap chief editor** — the RLS policy that lets the FIRST sign-up become Chief
  Editor (`member_count() = 0`).
- **Edge Function** — Supabase's serverless function; the only server code.
- **Recusal** — a reader who knows the author locks their vote; the average is computed
  over voters only.
- **Genre → rules → form flow** — writer picks a genre, sees that genre's rules, then
  lands on the form (genre is no longer a form field).
- **Marp** — markdown → slides; deck lives in `docs/slides/`.
- **Roles** — Managing Editor / Reader / Submitter (external, no accounts). The Member
  manager uses the finer 6-role ladder: Reader → Staff Editor → Editor → Co-Editor →
  Chief Editor → Advisor.
- **Pending reader** — a member row with `active = false`: the account exists, the person
  can sign in, and they can read nothing. Activating it in the Staff tab is the approval
  step (issue #5). Same flag as deactivation, which is why the database — not the UI — is
  what ultimately decides.
- **Genre staff** — a team label on a person (`members.staffs`: Fiction, Poetry,
  Creative Nonfiction, Visual Arts, or none). It says who usually reads what; it changes
  nothing a reader is allowed to open.
- **Assignment** — one row saying "this reader is expected to read this manuscript"
  (`assignments`). Only the Chief Editor hands them out, and assigning a whole staff is
  one click that writes several rows.
- **Assigned to you** — the highlighted box at the top of the reader queue. A highlight,
  not a fence: everything else is still below it, because an unassigned piece must not be
  a piece nobody reads.
