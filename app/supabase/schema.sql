-- ============================================================
-- Kennings submission manager — schema v1
-- Run this in the Supabase dashboard: SQL Editor -> paste -> Run
-- Safe to re-run: it recreates its own policies only.
-- ============================================================

-- submissions: the ONLY table readers can read (blind review).
-- No author identity ever lives here.
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text not null,
  status text not null default 'Received',
  hanover_student boolean not null default false,
  manuscript_path text not null,
  created_at timestamptz not null default now()
);

-- authors: identity, kept separate on purpose. Readers have NO
-- policy on this table — they physically cannot read it.
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  name text not null,
  email text not null,
  mailing_address text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now()
);

-- Turn on row-level security.
alter table public.submissions enable row level security;
alter table public.authors enable row level security;

-- ---------- submissions policies ----------
-- Public form (anon): anyone may insert a submission.
drop policy if exists "anon can insert submissions" on public.submissions;
create policy "anon can insert submissions"
  on public.submissions for insert to anon
  with check (true);

-- Authenticated staff (readers + editors): may read submissions.
-- Editors get authors access in the auth slice, not yet.
drop policy if exists "authenticated can read submissions" on public.submissions;
create policy "authenticated can read submissions"
  on public.submissions for select to authenticated
  using (true);

-- ---------- authors policies ----------
-- Public form (anon): anyone may insert the author row for their
-- own submission. Nobody may SELECT from authors yet — editors arrive
-- later. This is the lock that makes blind review structural.
drop policy if exists "anon can insert authors" on public.authors;
create policy "anon can insert authors"
  on public.authors for insert to anon
  with check (true);

-- ---------- storage: manuscript files ----------
-- Private bucket (not publicly listable). Writers upload files;
-- authenticated staff download them; nobody lists or reads others'.
insert into storage.buckets (id, name, public)
values ('manuscripts', 'manuscripts', false)
on conflict (id) do nothing;

-- Writers (anon) may upload files into the bucket.
drop policy if exists "anon can upload manuscripts" on storage.objects;
create policy "anon can upload manuscripts"
  on storage.objects for insert to anon
  with check (bucket_id = 'manuscripts');

-- Authenticated staff may download manuscript files.
drop policy if exists "authenticated can read manuscripts" on storage.objects;
create policy "authenticated can read manuscripts"
  on storage.objects for select to authenticated
  using (bucket_id = 'manuscripts');