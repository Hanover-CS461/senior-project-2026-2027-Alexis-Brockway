-- ============================================================
-- Migration 20261029130000_ratings
-- Reader scores, private notes, and recusal.
--
-- A rating is one reader's judgement on one submission. The
-- unique (submission_id, reader_id) pair means re-scoring updates
-- the existing row instead of piling up duplicates.
--
-- Blind review still holds: this table stores no author identity,
-- and a reader may only ever read their OWN row. Editors read all
-- of them to compute averages.
--
-- Apply with `npm run db:push` (or paste into the SQL editor if
-- the CLI is not linked — see AGENTS.md §7).
-- ============================================================

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reader_id uuid not null references auth.users(id) on delete cascade,
  -- Null is legal: a recused reader keeps their notes but casts no score.
  score integer check (score is null or score between 1 and 5),
  notes text not null default '',
  recused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, reader_id)
);

create index if not exists ratings_submission_id_idx
  on public.ratings (submission_id);
create index if not exists ratings_reader_id_idx
  on public.ratings (reader_id);

alter table public.ratings enable row level security;

-- ------------------------------------------------------------
-- A reader writes only their own row, and only while active.
-- is_active_member() checks `active`, so deactivating a reader
-- stops them scoring on the very next request.
-- ------------------------------------------------------------
drop policy if exists "readers write own ratings" on public.ratings;
create policy "readers write own ratings"
  on public.ratings for insert to authenticated
  with check (reader_id = auth.uid() and public.is_active_member());

drop policy if exists "readers update own ratings" on public.ratings;
create policy "readers update own ratings"
  on public.ratings for update to authenticated
  using (reader_id = auth.uid() and public.is_active_member())
  with check (reader_id = auth.uid() and public.is_active_member());

-- ------------------------------------------------------------
-- Readers read their own ratings (to show "you scored this").
-- They never see another reader's score: independent judgement
-- is the point of blind review.
-- ------------------------------------------------------------
drop policy if exists "readers read own ratings" on public.ratings;
create policy "readers read own ratings"
  on public.ratings for select to authenticated
  using (reader_id = auth.uid() and public.is_active_member());

-- Editors read every rating, for the summary and the average.
drop policy if exists "editors read all ratings" on public.ratings;
create policy "editors read all ratings"
  on public.ratings for select to authenticated
  using (public.is_editor());
