---
layout: default
title: Keeping it running
---

# Keeping it running

One page for whoever looks after this after the course ends. The developer
details live in `app/README.md`; this is the operational half.

## What this is, and where it lives

A submission manager for **Kennings**, Hanover College's literary journal. It
replaces a paid platform (Submittable) for one club's reading period: writers
submit, readers score blind, editors decide.

- **The app:** [the live site](app/) — bookmark this, not the repository
- **The code:** the GitHub repository it is served from
- **The data:** a Supabase project (free tier), which the app talks to directly

Opening the app needs no account, and the sign-in page prints two throwaway
logins — a **Chief Editor** and a **Reader**. Use them to look around. They are
deliberate: they buy exactly the access a real reader or editor has, and nothing
more.

## Everything in it is fictional

Every submission, author name, bio and manuscript currently in the app is sample
data created in October 2026. Nothing in there belongs to a real writer, so it is
safe to click, score, accept, reject and break.

## What you inherit

| Piece | Where | Note |
|---|---|---|
| Code and site | the GitHub repository | Public. Editing it rebuilds the site automatically. |
| Database, logins, file storage | the Supabase project | Free tier; one project; the app has only the public key |
| The domain | *not yet the club's* | The address is owned by the class organization and will not outlive the course |

The domain is the one piece of this that is genuinely temporary. Pointing
`app.kenningsliteraryjournal.com` at the site is a DNS record on a domain Kennings
already owns, and it is the first thing worth doing after the course: every link
you have handed out survives the move only if the domain comes before anything
else.

## The one ritual

The free database tier **pauses after about a week of inactivity**, and a paused
project looks like a broken app even though the page still loads. A scheduled
GitHub Action pings it every three days to prevent that.

- **A green run means everything is fine.** You do not need to do anything.
- **A red run means the project is paused.** Open the Supabase dashboard,
  choose the project, and press restore. The data comes back intact.
- GitHub turns scheduled jobs off after **60 days with no commits** to the
  repository. Any commit restarts it — a typo fix in this page will do.

## If the demo looks wrong

Because the demo login is public, a visitor can change a decision, wipe a score,
or demote the demo accounts. Nothing is lost — it is sample data — but the app
starts looking odd. Paste `app/supabase/demo-reset.sql` into the Supabase SQL
editor and it goes back to how it looked on day one.

## What is not built yet

- **Decision letters.** The six statuses work and are enforced by the database,
  but nothing emails an author. That needs Resend wired into an Edge Function.
- **Invite codes.** Sign-up is open: anyone who finds the page can join as a
  Reader. A Reader still cannot see author names — that boundary is enforced by
  the database, not the page.
- **Real email delivery.** Password reset links point at the right place, but
  they ride Supabase's built-in demo mailer, which is rate-limited and often
  lands in spam. Production mail belongs on Resend.
- **Reader names next to notes.** Notes reach editors unattributed, because only
  the Chief Editor may read the staff table.

## If something is genuinely wrong

The security model is worth understanding before changing anything: readers are
kept blind by **database rules** (row-level security), not by the interface. A
separate `authors` table holds identity, and no reader has permission to read it
— so a reader cannot see who wrote what even by calling the database directly.
Anything that moves author identity into the submissions table, or gives readers
a policy on `authors`, breaks the whole point of the project.

