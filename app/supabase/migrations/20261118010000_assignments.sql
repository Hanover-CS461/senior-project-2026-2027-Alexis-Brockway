-- ============================================================
-- Migration 20261118010000_assignments
-- Give a piece of work to a reader (issue #6).
--
-- Genre staffs say who *can* read a genre; this says who is expected to
-- read THIS manuscript. One row per reader per submission, so the same
-- piece can go to three people and each of them sees it on their own
-- queue.
--
-- Decisions behind the shape:
--   - No `week_of`. Issue #6 proposed one, but nothing in the app has a
--     concept of a reading week yet, and a column no screen reads is a
--     column nobody keeps correct. `created_at` gives the date.
--   - `unique (submission_id, reader_id)` makes "assign to a whole staff"
--     idempotent: the app filters already-assigned readers out first, and
--     the constraint is the backstop.
--   - Reassignment is delete + insert. There is no UPDATE policy, so an
--     assignment cannot be quietly rewritten in place.
--   - Only the Chief Editor writes (decision Nov 17). Readers read their
--     own rows and nothing else; editors get nothing here, because the
--     assignment panel is chief-only and the ratings box already tells an
--     editor whether a piece has been read.
--
-- This is a *highlight*, not a fence: the reader queue keeps the whole
-- blind queue below the "Assigned to you" section. Hiding unassigned work
-- would mean a piece nobody assigned is read by nobody.
-- ============================================================

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reader_id uuid not null references auth.users(id) on delete cascade,
  -- Who handed it over. Null if that account is ever deleted; the assignment
  -- itself survives, because the reader still has work to do.
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (submission_id, reader_id)
);

create index if not exists assignments_submission_id_idx
  on public.assignments (submission_id);
create index if not exists assignments_reader_id_idx
  on public.assignments (reader_id);

alter table public.assignments enable row level security;

-- ------------------------------------------------------------
-- A reader sees their own assignments — that is what feeds the
-- "Assigned to you" section. `is_active_member()` keeps a deactivated
-- reader from seeing work the moment the flag flips.
-- ------------------------------------------------------------
drop policy if exists "readers read own assignments" on public.assignments;
create policy "readers read own assignments"
  on public.assignments for select to authenticated
  using (reader_id = auth.uid() and public.is_active_member());

-- The chief sees every assignment (and maps reader ids to names through
-- the existing "chief reads all members" policy — no new function needed).
drop policy if exists "chief reads all assignments" on public.assignments;
create policy "chief reads all assignments"
  on public.assignments for select to authenticated
  using (public.is_chief_editor());

-- ------------------------------------------------------------
-- Only the Chief Editor hands out work or takes it back.
-- ------------------------------------------------------------
drop policy if exists "chief assigns work" on public.assignments;
create policy "chief assigns work"
  on public.assignments for insert to authenticated
  with check (public.is_chief_editor());

drop policy if exists "chief unassigns work" on public.assignments;
create policy "chief unassigns work"
  on public.assignments for delete to authenticated
  using (public.is_chief_editor());

-- ------------------------------------------------------------
-- Prove it landed (a dashboard that says "saved" is not proof — §7):
-- select policyname, cmd from pg_policies
-- where tablename = 'assignments' order by policyname;
-- select count(*) from public.assignments;
-- ------------------------------------------------------------
