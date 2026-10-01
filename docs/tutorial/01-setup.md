---
title: Part 1 — Set up Supabase and your project
---

# Part 1 — Set up Supabase and your project

> **Prev:** [Start here](index.html) · **Next:** [Part 2 — Database and RLS](02-database-and-rls.html)

By the end of this part you'll have a brand-new React app running in your
browser and talking to a brand-new Supabase project. If you already have a
React + Vite + TypeScript app, you can reuse it and skip straight to
[Step 3](#3-scaffold-the-app).

## What Supabase gives you

Supabase is a hosted bundle of things a typical backend needs. The pieces
you'll use in this tutorial:

- **Postgres database** — a real SQL database, reachable straight from your
  frontend code through an auto-generated REST API.
- **Auth** — user sign-up and sign-in, plus a per-user token that travels with
  every request.
- **Storage** — file buckets for the manuscripts.

Because all of this runs in *their* cloud, your app has no server code to
write, deploy, or maintain. That's the whole point for a small project: the
database *is* the backend.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (create a free
   account if you don't have one).
2. Click **New project**.
3. Give it a name (e.g. `blind-review-demo`), set a database password (save it
   somewhere), and pick a region near you.
4. Wait for the project to finish provisioning — it takes about a minute.

When it's done you'll land on the project **Dashboard**. The two places you'll
return to most are in the left sidebar:

- **SQL Editor** — where you paste SQL scripts (you'll use this a lot).
- **Table Editor** — a spreadsheet-like view of your tables, great for checking
  that rows actually got inserted.

## 2. The three keys (and which one never leaves the server)

Every Supabase project comes with several secrets. Confusing them is the #1
beginner mistake, so let's settle it now with an analogy:

- **Anon key (public)** — the *front door*. It's baked into your frontend code
  on purpose. By itself it grants nothing; it just opens the door to your
  project's API. It's the "key to the building," not the key to any room.
- **Login token (per user)** — the *ID card* each staff member gets when they
  sign in. Every request carries it, and the database checks it against your
  rules. You never type this yourself — Supabase creates it during auth.
- **`service_role` key (secret)** — the *master key* that opens every room and
  ignores all your rules. If it ever leaks, anyone can read and delete
  everything. **It must never appear in frontend code.** You'll paste it only
  into a server you control — and in this tutorial, you won't use it at all.

Find your project's keys under **Settings → API** (or **Connect → App
Frameworks** in newer dashboards): a **Project URL** and an **anon /
publishable** key. Grab both; you'll need them in [Step 4](#4-stash-your-keys-in-env).

## 3. Scaffold the app

Open a terminal and create a Vite + React + TypeScript app:

```bash
npm create vite@latest blind-review-demo -- --template react-ts
cd blind-review-demo
npm install
```

Then add the Supabase client library:

```bash
npm install @supabase/supabase-js
```

(If `npm create vite` asks you to install the `create-vite` package, press
`y`.) Vite scaffolds everything you need, including `src/main.tsx`.

## 4. Stash your keys in `.env`

Create a file called `.env` in the project root and put your two values in it:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

Two things matter here:

- The **`VITE_` prefix** is Vite's rule: only variables that start with `VITE_`
  are exposed to your frontend code (via `import.meta.env`). Anything else
  stays server-side. Vite documents this in
  [Env Variables and Modes](https://vite.dev/guide/env-and-mode#env-variables).
- **Never commit `.env`.** The Vite scaffold's `.gitignore` already ignores
  `.env.local`; add `.env` to it if it isn't there. Your anon key is public and
  harmless, but the habit of keeping secrets out of git is the one that counts.

> **Restart the dev server after editing `.env`.** Vite reads env variables
> only at startup, so a running server won't see new values until you restart
> it. This is a classic "why isn't it working?" moment.

## 5. Checkpoint: run it

```bash
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) and confirm you see the
Vite welcome page. The app doesn't use Supabase yet — that's the very next
part. But you now have the two halves of every Supabase app: a project in the
cloud, and a client that holds the URL + anon key.

## What you learned

- Supabase = database + auth + storage, all reachable from frontend code.
- The anon key is public; the login token is a per-user ID card; the
  `service_role` key is a master key that must never ship to a browser.
- `.env` files hold your keys, and only `VITE_`-prefixed variables reach the app.

> **Up next:** you'll design two tables and use row-level security to make the
> author's identity unreadable — that's the heart of blind review. See
> [Part 2 — Database and RLS](02-database-and-rls.html).

---

**Prev:** [Start here](index.html) · **Next:** [Part 2 — Database and RLS](02-database-and-rls.html)