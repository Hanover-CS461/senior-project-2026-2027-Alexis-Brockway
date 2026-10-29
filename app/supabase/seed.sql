-- ============================================================
-- seed.sql — demo data for the Kennings submission manager.
--
-- Every row here is SAMPLE DATA, not real submissions. The titles
-- and genres mirror app/src/data/submissions.ts so the app looks
-- the same now that the reader flow reads from the database.
--
-- Idempotent: fixed UUIDs + `on conflict do nothing`, so it can be
-- re-run after a pause/restore without duplicating anything.
--
-- Apply by pasting into the dashboard SQL editor (the CLI is not
-- linked — see AGENTS.md §7), or `npm run db:reset` with Docker.
-- ============================================================

insert into public.submissions (id, title, genre, status, hanover_student, manuscript_path)
values
  ('a1111111-1111-4111-8111-111111111111', 'The Last Ferry',               'Fiction',            'In review', true,  'samples/the-last-ferry.txt'),
  ('a2222222-2222-4222-8222-222222222222', 'Ode to the Dishwasher',        'Poetry',             'Received',  false, 'samples/ode-to-the-dishwasher.txt'),
  ('a3333333-3333-4333-8333-333333333333', 'Field Notes from the Corn Maze','Creative Nonfiction','In review', true,  'samples/field-notes-from-the-corn-maze.txt'),
  ('a4444444-4444-4444-8444-444444444444', 'Porcelain',                    'Poetry',             'Shortlist', true,  'samples/porcelain.txt'),
  ('a5555555-5555-4555-8555-555555555555', 'The Bridge at Night',          'Visual Arts',        'Received',  false, 'samples/the-bridge-at-night.txt'),
  ('a6666666-6666-4666-8666-666666666666', 'How to Leave a Voicemail',     'Fiction',            'In review', true,  'samples/how-to-leave-a-voicemail.txt')
on conflict (id) do nothing;

-- One author row per submission. `authors.submission_id` is unique, so this is
-- the idempotency key. Readers have NO policy on this table — that is the
-- blind-review guarantee, not a UI trick.
insert into public.authors (submission_id, name, email, mailing_address, bio)
values
  ('a1111111-1111-4111-8111-111111111111', 'Margaret Okafor', 'margaret.okafor@example.com', '12 Ferry Rd, Hanover, IN', 'Senior fiction writer, third submission to Kennings.'),
  ('a2222222-2222-4222-8222-222222222222', 'David Reyes',     'david.reyes@example.com',     '',                         'Poet and dishwasher enthusiast.'),
  ('a3333333-3333-4333-8333-333333333333', 'Priya Natarajan', 'priya.n@example.com',         '',                         'Creative nonfiction, writes about family and place.'),
  ('a4444444-4444-4444-8444-444444444444', 'Amelia Chen',     'amelia.chen@example.com',     '',                         'Ceramicist and poet.'),
  ('a5555555-5555-4555-8555-555555555555', 'Jonas Weber',     'jonas.weber@example.com',     '',                         'Photographer working in black and white.'),
  ('a6666666-6666-4666-8666-666666666666', 'Sienna Brooks',   'sienna.brooks@example.com',   '',                         'Fiction. Interested in the ordinary and the awkward.')
on conflict (submission_id) do nothing;
