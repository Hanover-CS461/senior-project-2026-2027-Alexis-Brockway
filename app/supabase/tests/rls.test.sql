-- ============================================================
-- pgTAP policy tests for the blind-review RLS boundary.
--
-- Run with:  supabase test db
-- (requires the Supabase CLI and Docker; see
--  https://supabase.com/docs/guides/local-development/testing/pgtap-extended)
--
-- These pin the anonymous boundary at the database layer, so a future schema
-- change can't silently un-blind the authors table. The authenticated
-- reader-vs-editor boundary is covered by src/lib/rls-auth.test.ts.
-- ============================================================

begin;
select plan(3);

-- Act as an anonymous visitor (no login token).
set local role anon;

select is(
  (select count(*)::int from public.submissions),
  0,
  'anon cannot read submissions'
);

select is(
  (select count(*)::int from public.authors),
  0,
  'anon cannot read authors (blind review holds)'
);

select is(
  public.is_editor(),
  false,
  'anon is not an editor'
);

reset role;
select * from finish();
rollback;
