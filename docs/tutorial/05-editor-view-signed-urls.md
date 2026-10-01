---
title: Part 5 — Let editors unblind submissions and open manuscripts
---

# Part 5 — Let editors unblind submissions and open manuscripts

> **Prev:** [Part 4 — Auth and roles](04-authentication-and-roles.html) · **Next:** [Part 6 — Conclusion](06-conclusion.html)

By the end of this part, the Chief Editor sees a dashboard with the author's
identity on every submission and a working manuscript download — while a Reader
signed into the *same* page sees no identity at all.

## 1. Open the drawer: editors can read authors

Remember the locked drawer from Part 2? Here's the key. Run this in the **SQL
Editor**:

```sql
-- Editors (and only editors) may read author identity.
drop policy if exists "editors can read authors" on public.authors;
create policy "editors can read authors"
  on public.authors for select to authenticated
  using (public.is_editor());
```

That's it. `is_editor()` is the helper function you created in
[Part 4](04-authentication-and-roles.html#2-the-members-table-and-the-bootstrap-policy).
When the Chief Editor queries `authors`, the policy is true and rows come back.
When a Reader runs the *exact same query*, the policy is false, so **zero rows
come back** — not an error, just an empty result. RLS filters silently, which
is why you always test from both roles.

## 2. The editor dashboard

Create `src/pages/EditorPage.tsx`. It does three reads:

- every submission (readers and editors can both read these),
- author rows (only editors get data back),
- a signed URL for each manuscript file.

```tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Submission = {
  id: string;
  title: string;
  genre: string;
  status: string;
  manuscript_path: string;
};

type Author = { submission_id: string; name: string; email: string };

export function EditorPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [downloads, setDownloads] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data: subs } = await supabase.from("submissions").select("*");
      if (!subs) return;
      setSubmissions(subs);

      // This SELECT only returns rows if our role passes the RLS policy.
      // Run the same query as a Reader and you get [] -- silently.
      const { data: authorRows } = await supabase
        .from("authors")
        .select("submission_id, name, email");
      const bySubmission: Record<string, Author> = {};
      for (const row of authorRows ?? []) bySubmission[row.submission_id] = row;
      setAuthors(bySubmission);

      // Signed URLs: temporary, time-limited download links, one per file.
      const links: Record<string, string> = {};
      for (const sub of subs) {
        const { data } = await supabase.storage
          .from("manuscripts")
          .createSignedUrl(sub.manuscript_path, 3600); // valid 1 hour
        if (data) links[sub.id] = data.signedUrl;
      }
      setDownloads(links);
    }
    load();
  }, []);

  return (
    <div>
      <h1>Editor dashboard</h1>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Author</th>
            <th>Genre</th>
            <th>Status</th>
            <th>Manuscript</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => (
            <tr key={sub.id}>
              <td>{sub.title}</td>
              <td>
                {authors[sub.id]
                  ? `${authors[sub.id].name} <${authors[sub.id].email}>`
                  : "—"}
              </td>
              <td>{sub.genre}</td>
              <td>{sub.status}</td>
              <td>
                {downloads[sub.id] ? (
                  <a href={downloads[sub.id]}>Download</a>
                ) : (
                  "No access"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Signed URLs, explained

The manuscripts bucket is private — there's no public link you can hand to
people. A **signed URL** is a time-limited pass to *one specific file*: the
storage server signs a link that works for, say, 60 minutes
(`3600` seconds) and then dies. It's like a boarding pass — it gets you onto
that one flight, for a limited time, and can't be reused forever.

`createSignedUrl(path, expiresIn)` returns `{ data: { signedUrl } }`, and you
can drop that URL straight into an `<a href>`. Supabase's
[Storage docs](https://supabase.com/docs/guides/storage/serving/downloads#signing-urls)
cover the options, including custom download filenames.

## 3. Guard the route

The dashboard is for editors. The role lives in your auth context, so gate on
it in `App.tsx`:

```tsx
// src/App.tsx
import { useAuth } from "./lib/auth";
import { SubmitPage } from "./pages/SubmitPage";
import { LoginPage } from "./pages/LoginPage";
import { EditorPage } from "./pages/EditorPage";

export function App() {
  const { session, role } = useAuth();

  return (
    <main>
      {!session && (
        <>
          <LoginPage />
          <hr />
          <SubmitPage />
        </>
      )}

      {session && role === "Chief Editor" && <EditorPage />}

      {session && role && role !== "Chief Editor" && (
        <p>Welcome, Reader! You'll see your review queue in a future part.</p>
      )}
    </main>
  );
}
```

The gate is a convenience, not the security: even if you deleted the `role`
check, a Reader hitting this page would still get empty authors and no
downloads, because the database refuses. Defense in depth — the UI hides it,
and the database enforces it.

## 4. Checkpoint: the same page, two different truths

1. **As the Chief Editor:** sign in and confirm the dashboard lists authors
   and working Download links.
2. **As the Reader:** open a private window, sign in as your second account,
   and open the same page. You'll see the submissions but every author column
   reads "—".
3. In the Reader's browser console, run
   `const { supabase } = await import("/src/lib/supabase.ts");` then
   `await supabase.from("authors").select("*")` — you get an empty array, not
   an error. The database said "no" and didn't even complain.

You've now reproduced the whole thesis of this tutorial: **blind review is
enforced at the database layer.** The Reader could copy-paste the editor's
exact code and still get nothing.

## What you learned

- A `using (is_editor())` policy opens a table to editors and silently hides it
  from everyone else.
- Private files are shared via short-lived signed URLs, never public links.
- Role checks in the UI are polish; RLS is the actual security.

> **Up next:** a recap, three practice exercises that go beyond the tutorial,
> and a reading list. See [Part 6 — Conclusion](06-conclusion.html).

---

**Prev:** [Part 4 — Auth and roles](04-authentication-and-roles.html) · **Next:** [Part 6 — Conclusion](06-conclusion.html)