-- ============================================================
-- Migration 20261117000000_reader_approval
--
-- A new account must be approved before it can read unpublished
-- work (issue #5).
--
-- Until now `members.active` defaulted to true, so anyone who
-- signed up was an approved reader within seconds and could read
-- every submission and open every manuscript. Blind review held
-- (readers still have no policy on `authors`), but the *work* was
-- visible to strangers.
--
-- The gate is the flag that already existed: `is_active_member()`
-- checks `active`, and `submissions` + `storage.objects` both go
-- through it. What was missing was a reason for `active` to start
-- false.
--
-- Two changes, and the second is the one that matters:
--   1. new rows default to inactive, and
--   2. the INSERT policy REFUSES a self-insert that says
--      `active = true`, so a client cannot approve itself.
--
-- The Chief Editor approves by flipping `active` in the Staff tab —
-- the update policy for that already exists, and
-- `member_audit` records who did it.
--
-- The bootstrap branch (first sign-up becomes Chief Editor) stays
-- ACTIVE, or a fresh project could never be bootstrapped: its
-- chief would be gated by the same rule it is supposed to undo.
--
-- Decision recorded: approval is the Chief Editor's alone. Letting
-- "any editor" approve would mean giving every editor the ability
-- to read `members`, which hands them the whole staff list,
-- emails included.
--
-- Apply with `npm run db:push`, or paste into the dashboard SQL
-- editor if the CLI is not linked (see AGENTS.md §7). Paste this
-- BEFORE relying on it: the app-side change alone (which sends
-- `active = false`) opens the gate for a new sign-up, but only this
-- policy stops a hand-rolled request from approving itself.
-- ============================================================

-- 1. A new member starts inactive. Existing rows are untouched, so nobody
--    already reading loses access because of this migration.
alter table public.members
  alter column active set default false;

-- 2. Joining: you may insert only YOUR OWN row, only once, and only into the
--    state you are allowed to choose.
--      reader       -> active = false  (waiting for approval)
--      chief_editor -> active = true   (bootstrap only, when nobody exists)
drop policy if exists "members join once, first as chief" on public.members;
create policy "members join once, first as chief"
  on public.members for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.members m where m.user_id = auth.uid()
    )
    and (
      (role = 'reader' and active = false)
      or (
        role = 'chief_editor'
        and active = true
        and public.member_count() = 0
      )
    )
  );

-- 3. Receipt: paste this file and read the result you get back.
select email,
       role,
       active,
       case
         when role = 'reader' and not active then 'waiting for approval'
         when active then 'can read'
         else 'inactive'
       end as state
from public.members
order by active desc, role, email;
