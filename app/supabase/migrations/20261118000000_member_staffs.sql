-- ============================================================
-- Migration 20261118000000_member_staffs
-- Genre teams: record which staff a member sits on.
--
-- A magazine's reading staff is split by genre — the fiction people
-- read fiction, the poetry people read poetry. Until now `members`
-- held one `role` and nothing else, so there was no way to say
-- "Jordan is on Fiction and Poetry". That information now lives in
-- one array column.
--
-- Why an array and not a join table:
--   - there are four staffs, and the list is in `app/src/data/genres.ts`;
--   - the existing policies on `members` already do exactly what this
--     needs (chief reads all rows, chief updates rows, a member reads
--     their own row), so no policy has to change;
--   - a member's own teams are therefore readable by the member with
--     no extra query and no new surface.
--
-- Empty array means "general staff" — nobody's queue changes, and every
-- existing row keeps working the moment this is applied.
-- ============================================================

alter table public.members
  add column if not exists staffs text[] not null default '{}';

-- Keep the values honest. Postgres refuses a slug that is not a real
-- genre, so a typo in the app surfaces as an error instead of a chip
-- that renders as "undefined". These four slugs must match
-- `app/src/data/genres.ts` (and the check is duplicated there by a test).
alter table public.members
  drop constraint if exists members_staffs_known;

alter table public.members
  add constraint members_staffs_known
  check (
    staffs <@ array['fiction', 'poetry', 'creative-nonfiction', 'visual-arts']::text[]
  );

-- ------------------------------------------------------------
-- Audit: a team change is a staff change, same as a role change.
-- Redefines the existing trigger function (the only way to change a
-- function body); the trigger itself is untouched.
-- ------------------------------------------------------------
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

  -- Added 20261118000000. Stored comma-joined so the audit row stays a
  -- plain text column; the app turns slugs back into labels.
  if new.staffs is distinct from old.staffs then
    insert into public.member_audit (actor_id, target_user_id, action, old_value, new_value)
    values (
      auth.uid(),
      new.user_id,
      'staff_change',
      array_to_string(old.staffs, ','),
      array_to_string(new.staffs, ',')
    );
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- Read this back to prove the column really landed. A dashboard that
-- reports success is not proof (see AGENTS.md §7).
-- ------------------------------------------------------------
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'members' and column_name = 'staffs';
