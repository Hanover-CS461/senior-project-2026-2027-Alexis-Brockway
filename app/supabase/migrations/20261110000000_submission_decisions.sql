-- Decision workflow: Accepted / Hold / Rejected, recorded as an act.
--
-- Until now `status` was free text, so the three-value "ladder" existed only in
-- the UI. This makes it a database rule, and gives a decision a timestamp so the
-- app can say when it happened rather than only what the label currently says.
--
-- Both statements are idempotent: safe to re-run, and safe to paste into the
-- dashboard SQL editor (the CLI has never been linked — see AGENTS.md §7).

alter table public.submissions
  add column if not exists decided_at timestamptz;

-- The allowed ladder. Existing rows ('Received', 'In review', 'Shortlist') all
-- comply, so this validates without a backfill.
alter table public.submissions
  drop constraint if exists submissions_status_check;

alter table public.submissions
  add constraint submissions_status_check
  check (
    status in (
      'Received', 'In review', 'Shortlist',
      'Accepted', 'Hold', 'Rejected'
    )
  );

-- A decision and its timestamp travel together or not at all. This is the part
-- that makes the workflow structural instead of a UI convention: an update that
-- sets 'Accepted' without a time is rejected by Postgres, and so is a timestamp
-- on a submission that is still 'In review'.
alter table public.submissions
  drop constraint if exists submissions_decided_at_matches_status;

alter table public.submissions
  add constraint submissions_decided_at_matches_status
  check (
    (status in ('Accepted', 'Hold', 'Rejected')) = (decided_at is not null)
  );

comment on column public.submissions.decided_at is
  'Set when an editor records Accepted/Hold/Rejected; cleared when the submission returns to the workflow.';

-- No policy changes: "editors can update submissions" already grants is_editor()
-- an update on every column, so decided_at inherits that gate for free.
