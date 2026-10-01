---
title: Part 2 — Design the schema and lock it down with RLS
---

# Part 2 — Design the schema and lock it down with RLS

> **Prev:** [Part 1 — Setup](01-setup.html) · **Next:** [Part 3 — The submission form](03-public-submission-form.html)

By the end of this part, your database will hold two tables and the rules that
make blind review *structural* — enforced by the database itself, not by a
well-behaved UI.

## The design problem

Blind review means readers judge a piece **without knowing who wrote it**.
But the editors need to know the author eventually. So identity must exist in
the system — just not where readers can reach it.

The cleanest way to guarantee that is to split it into **two tables**:

- `submissions` — what everyone may see: title, genre, status, and a path to
  the manuscript file. **No identity here.**
- `authors` — the private half: name and email, linked to a submission by
  `submission_id`. Readers get *no* access to this table at all.

Think of it like a contest: the manuscripts sit in a public bin, and the sealed
envelopes with names stay in a locked drawer. The bin is what reviewers look
at; the drawer is opened only by the organizers.

## Row-level security (RLS) in one minute

Normally a database table is all-or-nothing: you can read it or you can't.
Row-level security makes it per-row. A **policy** is a rule attached to a table
that acts like an invisible `WHERE` clause appended to every query.

For example, this policy:

```sql
create policy "authenticated can read submissions"
  on public.submissions for select to authenticated
  using (true);
```

means: "for signed-in users, every row passes the filter." And a *missing*
policy means **zero rows pass**. That empty default is your best friend — it
means you must explicitly grant every bit of access, and anything you forget
stays locked. Supabase's [Row Level Security guide](https://supabase.com/docs/guides/database/postgres/row-level-security#understand-row-level-security)
explains the full model.

There are two built-in "roles" Supabase checks against:

- **`anon`** — a request with no user signed in (the public submission form).
- **`authenticated`** — a request carrying a valid login token (your staff).

## The schema script

Open the **SQL Editor** in your Supabase dashboard, paste this whole script,
and press **Run**. It's safe to re-run as many times as you like.

```sql
-- ============================================================
-- Blind-review schema (Part 2)
-- ============================================================

-- What readers see: no author identity anywhere.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text not null,
  status text not null default 'Received',
  manuscript_path text not null,
  created_at timestamptz not null default now()
);

-- Identity, kept separate on purpose. Readers have NO policy on this
-- table, so they physically cannot read it.
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Turn on row-level security for both tables.
alter table public.submissions enable row level security;
alter table public.authors enable row level security;

-- ---------- submissions policies ----------
-- Anyone (not signed in) may submit: insert a submission row.
drop policy if exists "anon can insert submissions" on public.submissions;
create policy "anon can insert submissions"
  on public.submissions for insert to anon
  with check (true);

-- Staff (signed in) may read submissions for review.
drop policy if exists "authenticated can read submissions" on public.submissions;
create policy "authenticated can read submissions"
  on public.submissions for select to authenticated
  using (true);

-- ---------- authors policies ----------
-- Writers may insert their own author row. Nobody may SELECT from authors
-- yet -- editors arrive in Part 5. This is what makes blind review
-- structural: there is no policy that lets a reader read identity.
drop policy if exists "anon can insert authors" on public.authors;
create policy "anon can insert authors"
  on public.authors for insert to anon
  with check (true);

-- ---------- storage: manuscript files ----------
-- A PRIVATE bucket. Not publicly listable; files are never served openly.
insert into storage.buckets (id, name, public)
values ('manuscripts', 'manuscripts', false)
on conflict (id) do nothing;

-- Writers (anon) may upload files into the bucket.
drop policy if exists "anon can upload manuscripts" on storage.objects;
create policy "anon can upload manuscripts"
  on storage.objects for insert to anon
  with check (bucket_id = 'manuscripts');

-- Staff (authenticated) may download manuscript files.
drop policy if exists "authenticated can read manuscripts" on storage.objects;
create policy "authenticated can read manuscripts"
  on storage.objects for select to authenticated
  using (bucket_id = 'manuscripts');
```

Read the comments as you paste it — each policy is one deliberate decision.

## Reading the policies back in plain English

| Policy | Meaning |
|---|---|
| `anon can insert submissions` | The public form can add a submission. |
| `authenticated can read submissions` | Signed-in staff can see every submission. |
| `anon can insert authors` | The form can add the matching author row. |
| *(no authors SELECT policy)* | **Nobody can read author identity yet.** |
| `anon can upload manuscripts` | The form can upload files to the private bucket. |
| `authenticated can read manuscripts` | Signed-in staff can download manuscripts. |

Notice what's **missing**: no `SELECT` policy on `authors`, and no `SELECT`
policy for `anon` on `submissions`. Those gaps are the feature.

## The insert-without-read-back gotcha

Here's a subtle Supabase behavior you *will* hit, so let's defuse it now.

Say the frontend does this:

```ts
await supabase.from("submissions").insert({ title, genre, manuscript_path });
```

That works — `anon` has an INSERT policy. But if you ask for the row back in
the same call:

```ts
await supabase.from("submissions").insert({ ... }).select().single();
```

it **fails**, even though the row was created. Why? Because returning the row
requires a `SELECT` — and `anon` has no SELECT policy on `submissions`. The
database won't let the anonymous writer peek at the row they just created.

The fix is simple: **generate the row's id in the browser first**, insert with
that explicit id, and don't ask for the row back. You'll see this in the next
part's code.

## Checkpoint: verify the rules hold

Still in the **SQL Editor**, run a couple of probes. Expect the first to fail
and the second to return `0`:

```sql
-- Should return 0 rows: anon has no SELECT policy on submissions.
set role anon;
select * from public.submissions;

-- Should return 0 rows: nobody can read authors yet.
set role authenticated;
select * from public.authors;
```

If both do what's expected, your database is already enforcing blind review.

## What you learned

- Split identity out of the public data so access can be granted separately.
- RLS policies are invisible `WHERE` clauses; a missing policy means no access.
- `anon` and `authenticated` are the two roles your policies target.
- An INSERT that asks to return rows needs a SELECT policy — so anonymous
  inserts use a client-generated id instead.

> **Up next:** you'll point the React app at this database and build the public
> submission form. See
> [Part 3 — The submission form](03-public-submission-form.html).

---

**Prev:** [Part 1 — Setup](01-setup.html) · **Next:** [Part 3 — The submission form](03-public-submission-form.html)