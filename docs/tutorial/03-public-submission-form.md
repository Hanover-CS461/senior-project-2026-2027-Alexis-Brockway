---
title: Part 3 — Build the public submission form
---

# Part 3 — Build the public submission form

> **Prev:** [Part 2 — Database and RLS](02-database-and-rls.html) · **Next:** [Part 4 — Auth and roles](04-authentication-and-roles.html)

By the end of this part, anyone visiting your app can upload a manuscript and
submit a piece — and you'll have watched the RLS rules from Part 2 do their job.

## 1. Create the Supabase client

Create `src/lib/supabase.ts`. This file is the single place that knows your
project URL and anon key:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

`createClient` is your handle on the whole Supabase API: `supabase.from(...)`
for tables, `supabase.storage` for files, `supabase.auth` for users. The
library reads the `.env` values at build time via
[`import.meta.env`](https://vite.dev/guide/env-and-mode#built-in-constants).

## 2. The submission form

Create `src/pages/SubmitPage.tsx` with this content. It's a plain React form —
the interesting part is the `handleSubmit` function, which we'll dissect after:

```tsx
import { useState } from "react";
import { supabase } from "../lib/supabase";

export function SubmitPage() {
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setStatus("busy");

    // The insert-without-read-back gotcha from Part 2: anon can INSERT a
    // submission but not SELECT it back, so we generate the id here and
    // never call .select(). The row comes back later when an editor reads it.
    const submissionId = crypto.randomUUID();
    const filePath = `${submissionId}/${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("manuscripts")
      .upload(filePath, file);

    if (uploadError) {
      setStatus("error");
      setMessage(`Upload failed: ${uploadError.message}`);
      return;
    }

    const { error: insertError } = await supabase.from("submissions").insert({
      id: submissionId,
      title,
      genre: "Poetry",
      manuscript_path: filePath,
    });

    if (insertError) {
      setStatus("error");
      setMessage(`Could not save submission: ${insertError.message}`);
      return;
    }

    const { error: authorError } = await supabase.from("authors").insert({
      submission_id: submissionId,
      name: authorName,
      email,
    });

    if (authorError) {
      setStatus("error");
      setMessage(`Could not save author: ${authorError.message}`);
      return;
    }

    setStatus("done");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Submit a piece</h1>

      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label>
        Author name
        <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} required />
      </label>

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>

      <label>
        Manuscript file
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </label>

      <button disabled={status === "busy"}>Submit</button>

      {status === "done" && <p>Submission received. We'll be in touch!</p>}
      {status === "error" && <p className="error">{message}</p>}
    </form>
  );
}
```

Now the three steps inside `handleSubmit`, in the order they happen:

1. **Upload the file.** `supabase.storage.from("manuscripts").upload(filePath, file)`
   puts the manuscript in the private bucket from Part 2. The path includes the
   submission id so each file lives in its own folder. Anonymous upload is
   allowed by the `anon can upload manuscripts` policy.
2. **Insert the submission.** The `submissions` row carries the id we generated
   in the browser, plus a `manuscript_path` that points at the file we just
   uploaded. No `.select()` — remember why.
3. **Insert the author.** The `authors` row links to the submission by
   `submission_id`. This is the identity that readers will never see.

Notice that `crypto.randomUUID()` is used twice in spirit: once for the
submission id, once as the folder name. It's a built-in browser API for
generating unique ids (available on `localhost` and over HTTPS).

## 3. Wire the page into the app

Edit `src/App.tsx` so the form is the first thing you see:

```tsx
import { SubmitPage } from "./pages/SubmitPage";

export function App() {
  return (
    <main>
      <SubmitPage />
    </main>
  );
}
```

Save, make sure the dev server from Part 1 is still running, and reload
`http://localhost:5173`. (If you changed `.env` since starting it, restart the
server first.)

## 4. Checkpoint: submit and verify

1. Fill out the form and upload a small `.txt` file, then click **Submit**.
2. In the Supabase dashboard, open **Table Editor**. You should see one row in
   `submissions` and one row in `authors`.
3. In **Storage**, open the `manuscripts` bucket. You should see a folder named
   like the submission id, containing your file.

Now the fun part — prove the database is doing its job. Open your browser's
**developer console** and run this against your live app:

```js
const { supabase } = await import("/src/lib/supabase.ts");

const { data } = await supabase.from("submissions").select("*");
console.log(data); // null or [] -- anon cannot read submissions
```

You are calling the exact same API from the exact same browser session that
just successfully *inserted* a row — and the read returns nothing. The insert
worked; the read is refused. That gap is the point of this tutorial.

## What you learned

- The Supabase client is created once and shared across the app.
- Submissions = upload file → insert `submissions` row → insert `authors` row.
- Client-generated ids dodge the insert-without-read-back gotcha.
- You can prove RLS is working by reading as `anon` from the browser console.

> **Up next:** you'll add accounts so staff can sign in, with the first
> sign-up automatically becoming Chief Editor. See
> [Part 4 — Auth and roles](04-authentication-and-roles.html).

---

**Prev:** [Part 2 — Database and RLS](02-database-and-rls.html) · **Next:** [Part 4 — Auth and roles](04-authentication-and-roles.html)