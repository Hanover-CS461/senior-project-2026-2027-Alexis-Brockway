-- ============================================================
-- Migration 20261120000000_email_outbox
-- Tell the writer what happened (issue #8, phase 1).
--
-- Three things email a writer:
--     on submit            "we received it"        kind = 'received'
--     on Accepted          a letter                kind = 'accepted'
--     on Rejected          a letter                kind = 'rejected'
--
-- Hold deliberately sends nothing, and that is a *database rule*, not a
-- habit in the UI: `kind` will not accept 'hold'. Adding it later is a
-- migration and a decision, not a typo in a component.
--
-- Why an outbox and not a trigger that mails:
--   - Deciding and notifying are separate acts (decision 13). A decision
--     can be undone, so it must be possible to take back a letter that has
--     not gone out yet.
--   - The app can only ever *write a row*. Sending happens in an Edge
--     Function holding the Resend key, which never reaches the browser.
--
-- Why there is no recipient column:
--   - The address lives in `authors`, behind a policy readers cannot pass.
--     Joining at send time keeps one source of truth, and if the writer
--     corrects their address the queued letter follows it.
--   - A row therefore carries no name and no address. A leaked row leaks
--     no identity — only "this submission has a letter waiting".
--
-- Idempotent throughout: safe to re-run and safe to paste into the
-- dashboard SQL editor (the CLI has never been linked — see AGENTS.md §7).
-- ============================================================

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  kind text not null,
  status text not null default 'queued',
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  constraint email_outbox_kind_check
    check (kind in ('received', 'accepted', 'rejected')),
  constraint email_outbox_status_check
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  -- The same trick as submissions_decided_at_matches_status: a letter and
  -- its send time travel together, so "sent" without a date is refused.
  constraint email_outbox_sent_at_matches_status
    check ((status = 'sent') = (sent_at is not null)),
  -- One letter of each kind per submission. A double-send is not a bug the
  -- code has to avoid; it is a row Postgres will not accept.
  unique (submission_id, kind)
);

-- The drainer only ever asks for queued rows, so index exactly those.
create index if not exists email_outbox_queued_idx
  on public.email_outbox (queued_at)
  where status = 'queued';

alter table public.email_outbox enable row level security;

comment on table public.email_outbox is
  'Letters owed to a writer. A row is queued by the app (or by the receipt trigger) and marked sent by the send-letters Edge Function. Holds no author identity.';

-- ------------------------------------------------------------
-- Editors read and write the queue. Readers get nothing: a row whose
-- kind is 'accepted' is the outcome, and decision 14 keeps outcomes away
-- from readers.
-- ------------------------------------------------------------
drop policy if exists "editors read the letter queue" on public.email_outbox;
create policy "editors read the letter queue"
  on public.email_outbox for select to authenticated
  using (public.is_editor());

drop policy if exists "editors queue letters" on public.email_outbox;
create policy "editors queue letters"
  on public.email_outbox for insert to authenticated
  with check (public.is_editor());

-- The one narrow DELETE in the schema, and it is narrow on purpose: an
-- unsent letter can be taken back (undoing a decision must not leave a
-- rejection waiting to go out), but a letter that has gone out is history
-- and cannot be deleted by anyone.
drop policy if exists "editors cancel an unsent letter" on public.email_outbox;
create policy "editors cancel an unsent letter"
  on public.email_outbox for delete to authenticated
  using (public.is_editor() and sent_at is null);

-- No UPDATE policy at all: only the Edge Function, using the service role,
-- marks a row sent. Nobody edits a queue row into "sent" by hand.

-- ------------------------------------------------------------
-- The receipt is queued by a trigger, not by the public form.
--
-- The form submits as anon, and anon must never get INSERT on a mail
-- queue — otherwise anyone could fill it. A security-definer trigger
-- writes the row with the table owner's rights, so the public form's
-- permissions stay exactly as they were.
--
-- This cannot be abused into a mail bomb: the letter always goes to the
-- address in the `authors` row that fired the trigger, so a spammer who
-- submits garbage can only email themselves. There is no amplification.
-- ------------------------------------------------------------
create or replace function public.queue_receipt_letter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_outbox (submission_id, kind)
  values (new.submission_id, 'received')
  on conflict (submission_id, kind) do nothing;
  return new;
end;
$$;

-- PostgREST cannot invoke this: a function returning `trigger` can only be
-- called as a trigger, so there is no RPC door to widen.
drop trigger if exists authors_queue_receipt on public.authors;
create trigger authors_queue_receipt
  after insert on public.authors
  for each row
  execute function public.queue_receipt_letter();

-- ------------------------------------------------------------
-- Prove it landed (a dashboard that says "saved" is not proof — §7).
-- The second query must return true: editors may queue, anon may not.
-- ------------------------------------------------------------
-- select policyname, cmd from pg_policies
--   where tablename = 'email_outbox' order by policyname;
--
-- select
--   has_table_privilege('anon', 'public.email_outbox', 'insert') as anon_can_queue,
--   has_table_privilege('authenticated', 'public.email_outbox', 'insert') as staff_can_queue,
--   (select count(*) from pg_trigger where tgname = 'authors_queue_receipt') as trigger_present;
--
-- Expect: anon_can_queue = true (the grant exists in Supabase) but the RLS
-- policy refuses the row, so the honest probe is an anon INSERT over the
-- REST API, which must fail. See AGENTS.md §7 and the README beside the
-- Edge Function.
-- ------------------------------------------------------------
