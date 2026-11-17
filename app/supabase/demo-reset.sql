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
--
-- Paste it into the dashboard SQL editor (the CLI is not linked — see
-- AGENTS.md §7) whenever the demo has drifted, or before a walkthrough.
-- ============================================================

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

-- 3. The two demo accounts back to the roles the sign-in page promises.
--    A visitor who demotes the demo chief leaves the browser tests broken
--    until this runs.
update public.members
set role = 'chief_editor', active = true
where email = 'kennings.chief@example.com';

update public.members
set role = 'reader', active = true
where email = 'kennings.reader@example.com';

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
select 'ratings', count(*) from public.ratings;

select title, status, decided_at
from public.submissions
order by title;

select email, role, active
from public.members
order by email;
