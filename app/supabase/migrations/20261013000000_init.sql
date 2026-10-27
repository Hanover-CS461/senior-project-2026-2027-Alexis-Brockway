-- ============================================================
-- Migration 20261013000000_init
-- Kennings submission manager — initial schema.
--
-- This is the canonical source of truth for the database and is
-- applied with `npm run db:push` (Supabase CLI), NOT by pasting
-- into the dashboard. It matches the live project (roles are
-- snake_case, members has a name column) and includes the
-- member-management policies.
--
-- It is written to be idempotent (IF NOT EXISTS / CREATE OR
-- REPLACE / DROP POLICY first), so it also applies cleanly to the
-- already-provisioned remote project the first time it is pushed.
--
-- For later changes, add a NEW timestamped migration in this
-- directory — never edit this file once it has been pushed.
-- ============================================================

-- ------------------------------------------------------------
-- submissions: the ONLY table readers can read (blind review).
-- No author identity ever lives here.
-- ------------------------------------------------------------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  genre text not null,
  status text not null default 'Received',
  hanover_student boolean not null default false,
  manuscript_path text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- authors: identity, kept separate on purpose. Readers have NO
-- policy on this table — they physically cannot read it.
-- ------------------------------------------------------------
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  name text not null,
  email text not null,
  mailing_address text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- members: staff accounts. Attaches a role to auth.users.
-- Roles are snake_case (matches the app). The first sign-up
-- becomes chief_editor; everyone after joins as reader.
-- ------------------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'reader'
    check (role in ('reader', 'staff_editor', 'editor', 'co_editor', 'chief_editor', 'advisor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- member_audit: who changed whose role / active flag, and when.
-- Written only by the trigger below (security definer), read by
-- the chief editor.
-- ------------------------------------------------------------
create table if not exists public.member_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  target_user_id uuid not null references auth.users(id),
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Turn on row-level security.
-- ------------------------------------------------------------
alter table public.submissions enable row level security;
alter table public.authors enable row level security;
alter table public.members enable row level security;
alter table public.member_audit enable row level security;

-- ============================================================
-- Helper functions (security definer = run as owner, so they
-- can see rows RLS would otherwise hide).
-- ============================================================

-- How many members exist? Used by the bootstrap policy.
create or replace function public.member_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*) from public.members;
$$;

-- Is the caller an active staff member? Used to revoke access
-- the moment a member is deactivated.
create or replace function public.is_active_member()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and active
  );
$$;

-- Is the caller an active editor of any rank? Opens authors and
-- status updates. Checks `active`, so revocation is immediate.
create or replace function public.is_editor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid()
      and active
      and role in ('staff_editor', 'editor', 'co_editor', 'chief_editor', 'advisor')
  );
$$;

-- Is the caller the (active) chief editor? Only they may manage
-- other members.
create or replace function public.is_chief_editor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and active and role = 'chief_editor'
  );
$$;

-- ============================================================
-- submissions policies
-- ============================================================

-- Public form (anon): anyone may insert a submission.
drop policy if exists "anon can insert submissions" on public.submissions;
create policy "anon can insert submissions"
  on public.submissions for insert to anon
  with check (true);

-- Active staff (readers + editors): may read submissions.
-- Deactivated members lose access immediately.
drop policy if exists "authenticated can read submissions" on public.submissions;
drop policy if exists "active staff can read submissions" on public.submissions;
create policy "active staff can read submissions"
  on public.submissions for select to authenticated
  using (public.is_active_member());

-- Editors may update a submission (e.g. its status).
drop policy if exists "editors can update submissions" on public.submissions;
create policy "editors can update submissions"
  on public.submissions for update to authenticated
  using (public.is_editor())
  with check (public.is_editor());

-- ============================================================
-- authors policies
-- ============================================================

-- Public form (anon): anyone may insert the author row for their
-- own submission.
drop policy if exists "anon can insert authors" on public.authors;
create policy "anon can insert authors"
  on public.authors for insert to anon
  with check (true);

-- Editors (and only editors) may read author identity. This is
-- the lock that makes blind review structural.
drop policy if exists "editors can read authors" on public.authors;
create policy "editors can read authors"
  on public.authors for select to authenticated
  using (public.is_editor());

-- ============================================================
-- members policies
-- ============================================================

-- Join rule: you may insert only YOUR OWN membership, only once.
-- You may claim 'chief_editor' ONLY if no one has joined yet.
drop policy if exists "members join once, first as chief" on public.members;
create policy "members join once, first as chief"
  on public.members for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.members m where m.user_id = auth.uid()
    )
    and (
      (role = 'reader')
      or (role = 'chief_editor' and public.member_count() = 0)
    )
  );

-- You may read your own membership row (used on every login).
drop policy if exists "members read own row" on public.members;
create policy "members read own row"
  on public.members for select to authenticated
  using (auth.uid() = user_id);

-- The chief editor may read every membership row (Staff tab).
drop policy if exists "chief reads all members" on public.members;
create policy "chief reads all members"
  on public.members for select to authenticated
  using (public.is_chief_editor());

-- The chief editor may change roles / deactivate members.
-- Deactivation is soft (active = false); rows are never deleted.
drop policy if exists "chief updates members" on public.members;
create policy "chief updates members"
  on public.members for update to authenticated
  using (public.is_chief_editor())
  with check (public.is_chief_editor());

-- ============================================================
-- member_audit policies + trigger
-- ============================================================

-- Only the chief editor may read the audit trail.
drop policy if exists "chief reads member audit" on public.member_audit;
create policy "chief reads member audit"
  on public.member_audit for select to authenticated
  using (public.is_chief_editor());

-- The audit writer runs as the table owner, so it bypasses RLS.
create or replace function public.log_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.member_audit (actor_id, target_user_id, action, old_value, new_value)
    values (auth.uid(), new.user_id, 'role_change', old.role, new.role);
  end if;

  if new.active is distinct from old.active then
    insert into public.member_audit (actor_id, target_user_id, action, old_value, new_value)
    values (
      auth.uid(),
      new.user_id,
      case when new.active then 'reactivate' else 'deactivate' end,
      old.active::text,
      new.active::text
    );
  end if;

  return new;
end;
$$;

drop trigger if exists members_audit on public.members;
create trigger members_audit
  after update on public.members
  for each row execute function public.log_member_change();

-- ============================================================
-- storage: manuscript files
-- ============================================================
insert into storage.buckets (id, name, public)
values ('manuscripts', 'manuscripts', false)
on conflict (id) do nothing;

-- Writers (anon) may upload files into the bucket.
drop policy if exists "anon can upload manuscripts" on storage.objects;
create policy "anon can upload manuscripts"
  on storage.objects for insert to anon
  with check (bucket_id = 'manuscripts');

-- Active staff may download manuscript files. Deactivated members
-- lose access immediately.
drop policy if exists "authenticated can read manuscripts" on storage.objects;
drop policy if exists "active staff can read manuscripts" on storage.objects;
create policy "active staff can read manuscripts"
  on storage.objects for select to authenticated
  using (bucket_id = 'manuscripts' and public.is_active_member());
