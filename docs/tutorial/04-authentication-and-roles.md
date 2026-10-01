---
title: Part 4 — Add auth and bootstrap the Chief Editor
---

# Part 4 — Add auth and bootstrap the Chief Editor

> **Prev:** [Part 3 — The submission form](03-public-submission-form.html) · **Next:** [Part 5 — The editor view](05-editor-view-signed-urls.html)

By the end of this part, people can create accounts and sign in. The **first
person to sign up becomes Chief Editor**, and everyone after joins as a Reader
— and no code running in a browser can change that outcome.

## The design problem

A staff panel needs accounts. But if the app is just a frontend, any "role"
logic you write in JavaScript can be edited by anyone who opens DevTools. The
role decision has to happen somewhere the user can't reach. That somewhere is
the **database**, using the same RLS machinery you already know.

The bootstrap rule we want:

- The **first** account ever created is the Chief Editor.
- Every account after that is a Reader.
- It must be impossible to self-promote later.

## 1. Turn on email authentication

In the dashboard, go to **Authentication → Providers → Email** and make sure
it's enabled. For development, also untick **Confirm email** (otherwise
sign-ups sit in limbo waiting for a confirmation link you'll never send).

> If you'd rather keep email confirmation on, confirm a test user's email with
> one line of SQL after creating them:
> `update auth.users set email_confirmed_at = now(), confirmation_token = '' where email = 'you@example.com';`

## 2. The `members` table and the bootstrap policy

The auth system stores users in a table you can't see directly
(`auth.users`). Our app needs to attach a **role** to those users, so we create
a `members` table in our own schema.

Paste this into the **SQL Editor** and run it:

```sql
-- ============================================================
-- Part 4 -- staff accounts with roles
-- ============================================================

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('Reader', 'Chief Editor')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

-- A security definer function runs as its creator (postgres), so it can
-- COUNT every member even though RLS would normally hide everyone's rows.
create or replace function public.member_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*) from public.members;
$$;

-- Join rule: you may insert only YOUR OWN membership, only once.
-- You may claim 'Chief Editor' ONLY if no one has joined yet.
drop policy if exists "members join once, first as chief" on public.members;
create policy "members join once, first as chief"
  on public.members for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.members m where m.user_id = auth.uid()
    )
    and (
      (role = 'Reader')
      or (role = 'Chief Editor' and public.member_count() = 0)
    )
  );

-- You may read your own membership row (used on every login to reload role).
drop policy if exists "members read own row" on public.members;
create policy "members read own row"
  on public.members for select to authenticated
  using (auth.uid() = user_id);

-- Role check used by later policies. Readers see nothing; editors see authors.
create or replace function public.is_editor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and role = 'Chief Editor' and active
  );
$$;
```

### What the bootstrap policy does

The interesting policy is `members join once, first as chief`. Its `with check`
requires **all three** of these to be true:

1. `auth.uid() = user_id` — you can only insert a membership row for
   *yourself*, never for someone else.
2. `not exists (...)` — you can't have a membership row already (one per user).
3. `role = 'Reader' OR (role = 'Chief Editor' AND member_count() = 0)` — you
   may claim Chief Editor only if you're genuinely first.

That last clause is where the magic lives. `member_count()` is a
[`security definer`](https://supabase.com/docs/guides/database/postgres/row-level-security#use-security-definer-functions)
function: it runs with the database owner's powers, so it can count *all*
members even though an ordinary user can only see their own row.

**The important consequence:** the browser can *try* to insert itself as Chief
Editor, but the database will refuse unless it's the first membership in the
table. Role assignment is decided by the database, so a reader who edits the
JavaScript still can't promote themselves.

## 3. Auth in the app

Now the frontend. First, a small module that watches the session and makes the
current user + role available to the whole app. Create `src/lib/auth.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: string | null;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
});

async function joinClub(user: User): Promise<string> {
  // Reload the role on every login from the members row we already have.
  const { data: existing } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return existing.role;

  // First-time member: try to claim Chief Editor. RLS only lets the very
  // first member through; if the database refuses, join as a Reader.
  const attempt = await supabase.from("members").insert({
    user_id: user.id,
    email: user.email ?? "",
    role: "Chief Editor",
  });
  if (!attempt.error) return "Chief Editor";

  const fallback = await supabase.from("members").insert({
    user_id: user.id,
    email: user.email ?? "",
    role: "Reader",
  });
  if (fallback.error) throw fallback.error;
  return "Reader";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) setRole(await joinClub(data.session.user));
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next?.user) setRole(await joinClub(next.user));
      else setRole(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = { session, user: session?.user ?? null, role };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

The `joinClub` function is the app-side half of the bootstrap trick: it *tries*
Chief Editor first, and only falls back to Reader when the database says no.
Because the policy decided, not the app, the outcome is trustworthy.

Next, a sign-up / sign-in page. Create `src/pages/LoginPage.tsx`:

```tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signUp" | "signIn">("signUp");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (mode === "signUp") {
      const { error } = await supabase.auth.signUp({ email, password });
      setMessage(error ? error.message : "Account created — now sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setMessage(error ? error.message : "Signed in!");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{mode === "signUp" ? "Create an account" : "Sign in"}</h1>

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>

      <button>{mode === "signUp" ? "Create account" : "Sign in"}</button>

      <p>
        {mode === "signUp" ? "Already a member?" : "New here?"}{" "}
        <button type="button" onClick={() => setMode(mode === "signUp" ? "signIn" : "signUp")}>
          {mode === "signUp" ? "Sign in" : "Create an account"}
        </button>
      </p>

      {message && <p>{message}</p>}
    </form>
  );
}
```

## 4. Wire it together

Update `src/main.tsx` to wrap the app in `AuthProvider`, and update
`src/App.tsx` to show the login page to signed-out visitors:

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./lib/auth";
import { App } from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
```

```tsx
// src/App.tsx
import { useAuth } from "./lib/auth";
import { SubmitPage } from "./pages/SubmitPage";
import { LoginPage } from "./pages/LoginPage";

export function App() {
  const { session } = useAuth();

  return (
    <main>
      {!session && (
        <>
          <LoginPage />
          <hr />
          <SubmitPage />
        </>
      )}
      {session && <p>Signed in! (Role loading / editor view is Part 5.)</p>}
    </main>
  );
}
```

## 5. Checkpoint: first user is the Chief Editor

1. Reload the app, create an account, and sign in.
2. In the dashboard **Table Editor**, open `members`. Your row should have
   `role = Chief Editor`.
3. Open a private/incognito window, create a *second* account, and sign in.
   Check `members` again — the second row should be `Reader`.
4. As the Reader, open the browser console and try to promote yourself:

   ```js
   const { supabase } = await import("/src/lib/supabase.ts");
   const { data } = await supabase
     .from("members")
     .update({ role: "Chief Editor" })
     .eq("user_id", "PASTE-YOUR-USER-ID");
   ```

   The update affects **zero rows** — no error, but nothing changes, because no
   `UPDATE` policy exists on `members`. The database refuses the self-promotion.

   > Don't test this step in the dashboard's Table Editor or SQL Editor. Those
   > run with elevated access that bypasses RLS, so they'd let the change
   > through. The browser is the right place to prove a policy.

If the second account could not self-promote, the bootstrap rule is working.

## What you learned

- Roles are decided by the database, not by frontend code.
- A `security definer` function can peek past RLS when a policy needs a global
  count (like "how many members exist?").
- `auth.uid()` is how a policy knows who is asking.
- The first-member bootstrap is a single RLS policy, not special app logic.

> **Up next:** now that editors exist, you'll grant them the one thing readers
> can't have — the author's identity — and add signed-URL downloads. See
> [Part 5 — The editor view](05-editor-view-signed-urls.html).

---

**Prev:** [Part 3 — The submission form](03-public-submission-form.html) · **Next:** [Part 5 — The editor view](05-editor-view-signed-urls.html)