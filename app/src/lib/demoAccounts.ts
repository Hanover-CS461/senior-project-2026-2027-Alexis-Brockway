// Demo accounts, published on purpose.
//
// The live site is graded by someone who has no account and no club membership,
// so the sign-in page has to hand them one. These two were created through the
// sign-up API on 29 Oct 2026; everything they can see is seeded sample data —
// the submissions, authors and manuscripts are fictional (asserted in
// supabase/seed.sql and the e2e blind-review spec).
//
// Publishing them is not a vulnerability, and it is worth being precise about
// why: the only key in this bundle is the publishable one, which grants nothing
// by itself, and RLS is what decides what a role may read. These credentials
// buy exactly the access a real reader or editor would have — no more.
//
// They are also the two accounts the authenticated test suites sign in as
// (app/.env.test). They must keep their roles: a demo visitor who changes a
// role breaks `npm run test:e2e` locally, not the application.

export interface DemoAccount {
  label: string
  blurb: string
  email: string
  password: string
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    label: 'Chief Editor',
    blurb: 'Full queue, author names, decisions, staff admin, export',
    email: 'kennings.chief@example.com',
    password: 'KenningsTest2026!',
  },
  {
    label: 'Reader',
    blurb: 'Blind queue — title, genre and manuscript only',
    email: 'kennings.reader@example.com',
    password: 'KenningsTest2026!',
  },
]
