---
title: Build a Blind-Review Submission Form with Supabase
---

# Build a Blind-Review Submission Form with Supabase

Welcome! In this tutorial you will build a small but real web app: a public
submission form that collects writing manuscripts, stores them privately, and
lets a staff of signed-in editors review them — **while keeping the author's
identity invisible to everyone except the editors.**

You will learn how to use **Supabase**, a "backend-as-a-service" that gives you
a hosted Postgres database, user authentication, and file storage out of the
box. Everything you build here is a stripped-down version of the submission
manager used by a real college literary magazine.

## What you'll build

By the end of the tutorial you'll have a running app where:

1. **Anyone** (even someone not signed in) can submit a title, author name,
   email, and a manuscript file.
2. The manuscript is stored in a **private** storage bucket.
3. Signed-in **readers** can see submissions — but **never** the author's name.
   That separation is enforced by the *database*, not by the UI.
4. The **first person to sign up automatically becomes Chief Editor**; everyone
   after joins as a Reader. No code in the browser can fake a promotion.
5. Editors can see author identity and download manuscripts through
   **time-limited signed URLs**.

The big idea, which you'll meet again and again, is **row-level security
(RLS)**: rules written in SQL that decide who can read and write which rows.
Blind review stops being a UI rule and becomes a database rule.

## Learning objectives

After completing this tutorial you will be able to:

- Create a Supabase project and explain the difference between the public
  (`anon`) key, the `service_role` key, and a signed-in user's login token.
- Model data as separate tables so that sensitive identity can be kept apart
  from what everyone is allowed to see.
- Write row-level security policies for `INSERT` and `SELECT`, and explain how
  a policy behaves like an invisible `WHERE` clause on every query.
- Work around the "insert without read-back" gotcha that trips up anonymous
  inserts.
- Upload files to a private storage bucket and generate signed URLs so staff
  can download them without exposing the bucket.
- Add email/password authentication and bootstrap a first-user-as-owner rule
  using a `security definer` function.
- Test your work at each step from the perspective of an outsider, a reader,
  and an editor.

## Target audience

This tutorial is for a **computer science student who already knows
JavaScript/TypeScript and a little React**, but has **never used Supabase** —
and possibly never worked with SQL, authentication, or a database before. If
that's you, perfect. Explanations start from scratch and use plain-language
analogies before introducing jargon.

## Prerequisites

### Expected knowledge

- Comfortable reading and writing JavaScript or TypeScript (React's `useState`
  and components are used, but you can follow along even if they're new).
- A rough idea of what a database table is (rows and columns).
- A terminal and a code editor you're happy in.
- **No** prior Supabase, SQL, or authentication experience is expected.

### Installed tools

- [Node.js](https://nodejs.org/) version 18 or newer (with `npm`). Check with
  `node --version`.
- A modern browser (Chrome, Edge, Firefox, or Safari).
- A free account at [supabase.com](https://supabase.com) — you'll create it in
  Part 1.
- (Optional but handy) `git`.

## How this tutorial is organized

Each part is one page, and every page has a working **Prev / Next** link at the
bottom, so you can read the pages like a book.

| Part | What you'll do | Page |
|---|---|---|
| 1 | Create a Supabase project, meet the API keys, and scaffold the React app | [Part 1 — Setup](01-setup.html) |
| 2 | Design the tables and lock them down with row-level security | [Part 2 — Database and RLS](02-database-and-rls.html) |
| 3 | Build the public submission form (upload + insert) | [Part 3 — The submission form](03-public-submission-form.html) |
| 4 | Add authentication and bootstrap the Chief Editor | [Part 4 — Auth and roles](04-authentication-and-roles.html) |
| 5 | Let editors unblind submissions and download manuscripts | [Part 5 — The editor view](05-editor-view-signed-urls.html) |
| 6 | Recap, practice exercises, and links to official docs | [Part 6 — Conclusion](06-conclusion.html) |

Parts build on each other, so do them in order. Expect to spend about **1–1.5
hours** total; most of it is reading the explanations.

There are also **practice exercises** in [Part 6](06-conclusion.html#practice-exercises)
that ask you to go beyond what the tutorial teaches.

---

**Next:** [Part 1 — Set up Supabase and your project](01-setup.html)