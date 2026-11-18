-- ============================================================
-- demo-reset.sql — put the public demo back the way a visitor
-- expects to find it.
--
-- Why this exists: the sign-in page publishes a Chief Editor account so
-- anyone can look around without creating one. The same door lets anyone
-- change a decision, score the queue, or edit a role. The data is all
-- fictional, so none of that is a breach — it just makes the demo look
-- broken, and it can quietly demote the account the e2e suite signs in as.
--
-- This file is the undo. It touches ONLY the six seeded submissions and the
-- two demo accounts; it never deletes anything a real submission might need.
-- That now includes reading assignments: a visitor sitting in the demo Chief's
-- seat can hand a real manuscript to the demo Reader, and those rows are undone
-- too (see 3b) — otherwise the demo account would be shown work a stranger
-- assigned it. It deliberately does NOT delete extra submissions — if a
-- stranger left one behind, that block is at the bottom, commented out, because
-- a real writer's manuscript looks exactly like junk from here.
--
-- Paste it into the dashboard SQL editor (the CLI is not linked — see
-- AGENTS.md §7) whenever the demo has drifted, or before a walkthrough.
-- ============================================================

-- 0. The two migrations this file now needs. Without this guard the editor
--    reports one line about a missing column or table and rolls the whole
--    script back — which looks exactly like "nothing happened". Name the fix
--    instead.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'members' and column_name = 'staffs'
  ) then
    raise exception 'members.staffs is missing — paste 20261118000000_member_staffs.sql first';
  end if;

  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'assignments'
  ) then
    raise exception 'public.assignments is missing — paste 20261118010000_assignments.sql first';
  end if;
end;
$$;


-- 1. Statuses back to their seed values.
--    decided_at must travel with the status, or
--    submissions_decided_at_matches_status rejects the write.
update public.submissions as s
set status = v.status,
    decided_at = null
from (values
  ('a1111111-1111-4111-8111-111111111111'::uuid, 'In review'),
  ('a2222222-2222-4222-8222-222222222222'::uuid, 'Received'),
  ('a3333333-3333-4333-8333-333333333333'::uuid, 'In review'),
  ('a4444444-4444-4444-8444-444444444444'::uuid, 'Shortlist'),
  ('a5555555-5555-4555-8555-555555555555'::uuid, 'Received'),
  ('a6666666-6666-4666-8666-666666666666'::uuid, 'In review')
) as v(id, status)
where s.id = v.id;

-- 2. Reader scores, notes and recusals on the sample queue.
delete from public.ratings
where submission_id in (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'a3333333-3333-4333-8333-333333333333',
  'a4444444-4444-4444-8444-444444444444',
  'a5555555-5555-4555-8555-555555555555',
  'a6666666-6666-4666-8666-666666666666'
);

-- 2b. Put ONE rating back, from the demo Reader on one seeded piece.
--
-- Without this the reset erases the only rating in the project: the reader
-- queue loses its "Scored" section, and every editor detail page says "no
-- ratings yet" — so the feature a visitor came to see looks broken rather than
-- clean. It is seeded on the Reader (not the Chief) because the reader's own
-- queue is where a score is visible as a score, and because the note then shows
-- up in the editor's ratings summary too.
--
-- Keyed on (submission_id, reader_id), so pasting this file twice is harmless.
-- The join on `auth.users` is the guard: if the demo accounts are ever deleted
-- (issue #7 phase 2), the select returns no rows and this does nothing instead of
-- failing on a foreign key.
insert into public.ratings (submission_id, reader_id, score, notes, recused)
select
  'a2222222-2222-4222-8222-222222222222'::uuid,
  u.id,
  2,
  'The dishwasher as a stand-in for the speaker''s mother is doing a lot of '
    || 'work here, and I want the last stanza to trust it more than it does.',
  false
from auth.users u
where u.email = 'kennings.reader@example.com'
on conflict (submission_id, reader_id) do update
  set score = excluded.score,
      notes = excluded.notes,
      recused = excluded.recused,
      updated_at = now();

-- 3. The two demo accounts back to the roles the sign-in page promises.
--    A visitor who demotes the demo chief leaves the browser tests broken
--    until this runs.
--
--    `staffs` is reset too: the demo Reader belongs to Fiction and Poetry, so
--    the Staff tab's "Who's on each staff" summary is not empty when a visitor
--    opens it. A visitor can toggle chips freely; this is the undo.
update public.members
set role = 'chief_editor', active = true
where email = 'kennings.chief@example.com';

update public.members
set role = 'reader',
    active = true,
    staffs = array['fiction', 'poetry']
where email = 'kennings.reader@example.com';

-- 3b. Reading assignments on the sample queue.
--
--    Same reasoning as the rating in 2b: a demo with an empty Reading panel
--    looks unbuilt. The demo Reader is given one seeded piece they have NOT
--    scored, so "Assigned to you" shows up at the top of the reader queue, and
--    the Chief's detail page shows one row with a "Not read yet" state.
--
--    Two deletes before the insert:
--      a) every assignment on the six seeded pieces, so the sample queue is
--         deterministic no matter what a visitor clicked — then one is put back;
--      b) anything a visitor created while sitting in a demo account that points
--         at a submission we did NOT seed. That is the one case worth deleting
--         outside the sample: it would otherwise show a real writer's manuscript
--         to the published Reader account. Scoped to the two demo user ids, so a
--         real assignment is never touched.
--
--    The join on auth.users is the guard: if the demo accounts are deleted (#7
--    phase 2) these statements touch nothing instead of failing a foreign key.
delete from public.assignments
where submission_id in (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'a3333333-3333-4333-8333-333333333333',
  'a4444444-4444-4444-8444-444444444444',
  'a5555555-5555-4555-8555-555555555555',
  'a6666666-6666-4666-8666-666666666666'
);

with demo as (
  select id from auth.users
  where email in ('kennings.reader@example.com', 'kennings.chief@example.com')
)
delete from public.assignments a
using demo d
where (a.reader_id = d.id or a.assigned_by = d.id)
  and a.submission_id not in (
    'a1111111-1111-4111-8111-111111111111',
    'a2222222-2222-4222-8222-222222222222',
    'a3333333-3333-4333-8333-333333333333',
    'a4444444-4444-4444-8444-444444444444',
    'a5555555-5555-4555-8555-555555555555',
    'a6666666-6666-4666-8666-666666666666'
  );

insert into public.assignments (submission_id, reader_id, assigned_by)
select
  'a1111111-1111-4111-8111-111111111111'::uuid,
  r.id,
  c.id
from auth.users r
left join auth.users c on c.email = 'kennings.chief@example.com'
where r.email = 'kennings.reader@example.com'
on conflict (submission_id, reader_id) do update
  set assigned_by = excluded.assigned_by;


-- 4. Optional, deliberately commented out. Uncomment only if a stranger
--    left junk behind: submissions added through the public form, or
--    members promoted while the demo was open. Both destroy real rows if
--    you point them at the wrong thing.
--
-- delete from public.submissions
-- where id not in (
--   'a1111111-1111-4111-8111-111111111111',
--   'a2222222-2222-4222-8222-222222222222',
--   'a3333333-3333-4333-8333-333333333333',
--   'a4444444-4444-4444-8444-444444444444',
--   'a5555555-5555-4555-8555-555555555555',
--   'a6666666-6666-4666-8666-666666666666'
-- );
--
-- update public.members
-- set role = 'reader', active = true
-- where email <> 'kennings.chief@example.com';

-- 5. Read this output to confirm the reset landed.
select 'submissions' as table_name, count(*) as rows from public.submissions
union all
select 'ratings', count(*) from public.ratings
union all
select 'assignments', count(*) from public.assignments;

select title, status, decided_at
from public.submissions
order by title;

select email, role, active, staffs
from public.members
order by email;

select coalesce(s.title, r.submission_id::text) as piece,
       r.score, r.recused, left(r.notes, 46) as note
from public.ratings r
left join public.submissions s on s.id = r.submission_id
order by piece;

select coalesce(s.title, a.submission_id::text) as piece,
       u.email as reader,
       a.created_at::date as assigned
from public.assignments a
left join public.submissions s on s.id = a.submission_id
left join auth.users u on u.id = a.reader_id
order by piece;
