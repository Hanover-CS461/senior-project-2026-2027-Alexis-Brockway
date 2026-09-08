# A Custom Submission Manager for a College Literary Magazine

This project replaces the college literary magazine's paid submission platform, Submittable, with a custom, club-scoped web application that runs the journal's entire editorial workflow — submission intake, blind review, reader notes, and decision letters — at nearly zero cost.

The magazine is a small student-run publication that currently processes all submissions through Submittable, a general-purpose platform whose annual price has become hard to justify for a club-sized budget [1][6]. The club's workflow is small and stable: roughly 200–300 submissions per reading period (August to February), about 20 staff members at a time, and the club actually uses only a handful of the platform's features. This project builds a tool around exactly what the club does and nothing else. Beyond cost, the project solves a second problem that is invisible until it hurts: the club's submission archive currently lives inside a third-party system, and when a subscription ends, access to years of editorial history ends with it [2]. A tool the club operates itself, with its own database and backups, guarantees that the journal's history outlives any vendor relationship.

## Why This Project Exists

Three problems motivate the project: cost, fit, and ownership.

**Cost.** Submittable charges CLMP-member magazines $290 per year, plus a $0.99 processing fee and a 5% charge on any paid submission [1][6]. For a college club running on a student-activities budget, several hundred dollars a year for software is a real line item, and per-transaction fees quietly multiply across every submission [2].

**Fit.** The magazine uses a small fraction of Submittable's surface area. Submittable is built to serve contests, grants, and corporate programs; the club clicks a few features — a submission form, a queue, statuses, and letters — and pays for the rest [1].

**Ownership.** Every submission, note, and decision the club has made lives in a proprietary system. Exporting requires the platform's cooperation, and when the subscription ends, the archive is no longer the club's to open [2]. A tool with its own database and backups returns that archive to the club.

## Comparable Solutions

Four existing systems are worth contrasting with the proposed project.

**Submittable** is the incumbent being replaced [1]. It offers intake forms, team roles, blind-read options, statuses, and automated letters. The differences are cost ($290/year even discounted, plus per-transaction fees), generality (features for contests and grants the club never touches), and ownership (the club's archive is held by a vendor it does not control) [1][2].

**Duosuma**, by Duotrope, charges publishers per submission rather than per month — roughly $0.09 per submission, billed monthly, with volume discounts [3]. It is affordable, but the club still pays forever per submission, the workflow is Duotrope's rather than the club's, and the journal's data remains on a third-party service [3].

**Moksha** is a hosted system used by major genre magazines [4]. It offers customizable workflows and a "permanent archive" — permanent, that is, while the subscription runs. Its annual plan costs $750, more than Submittable's discounted rate, and it is closed software hosted under moksha.io [4].

**Green Submissions** is the strongest "do nothing" alternative: free, self-hosted submission software that installs on ordinary shared hosting [5]. It proves the club could avoid building anything. It is PHP/MySQL software from a single author, cannot be customized to the club's exact workflow without forking it, and offers no learning value for a computer-science senior project [5].

| Aspect | This project | Submittable | Duosuma | Moksha |
|---|---|---|---|---|
| Cost model | ~$0 (free tiers) | ~$290/yr + fees [1] | ~$0.09/submission [3] | ~$750/yr [4] |
| Scoped to this club's workflow | Yes, by design | No | No | No |
| Club controls its data | Yes | No | No | No |
| Blind review enforced at the data layer | Yes | Configurable [1] | Configurable [3] | Configurable [4] |
| Maintenance burden | Student-built, documented | Vendor | Vendor | Vendor |

The proposed project differs from all four in the same ways: it is built to the club's exact workflow rather than a general template; it costs nothing beyond free-tier hosting; and it keeps the archive in a database the club controls and can export at any time.

## Who Uses the System

The system has three roles, with one non-negotiable constraint: readers must never see author identity.

| Role | Who holds it | Sees author identity? | System powers |
|---|---|---|---|
| Managing Editor | 2 co-editors-in-chief + advisor | Yes — full view | Everything: review workflow + admin |
| Reader | Club members who review | No — blind | Review only; can invite other readers |
| Submitter | External writers | n/a | Submission form + status tracking |

**Security rule:** only the Managing Editor role can manage members or change roles; if a Reader could promote themselves, blind review would be meaningless. Every change is recorded in the audit log.

## Features by Role

**For submitters (writers, not staff):**
- Public submission form — genre, title, manuscript upload, and author details (name, email, bio) that readers never see.
- Confirmation and status tracking via an emailed link; no writer accounts.
- Withdrawal of a submission.

**For managing editors:**
- Full-view queue with an author column.
- Assignment of submissions to specific readers.
- Per-reader notes and internal discussion on a piece.
- Configurable status stages: Received → In review → Shortlist → Accepted/Rejected.
- Decision letters from the journal's templates, signed by the journal — never by an individual reader.
- Editor-submission conflict flag when a club member submits their own work.
- Member management: invite, change roles, deactivate (history preserved).
- CSV export, full backup, searchable archive, and audit log.

**For readers (blind):**
- Queue of assigned and shared submissions showing only title, genre, and manuscript.
- Private attributed notes and discussion.
- Invite other readers — but never grant full view.

**Blind review, enforced by the system:** author identity is stored in a separate table and structurally excluded from every reader-facing query by database security rules — not merely hidden in the UI. Uploaded files are scrubbed of author metadata at intake. Letters never carry reader names.

## Architecture

The system is a single frontend application talking to one backend service (Supabase), with one small serverless function for sending email and one email provider. The logical pieces and their connections:

```
    Writers                        Staff (editors + readers)
      │  public form                   │  login → per-user token
      ▼                                ▼
  ┌─────────────────────────────────────────────────┐
  │             React + Vite frontend               │
  │      (static files on a free host)              │
  └──────┬──────────────────────────────┬───────────┘
         │ reads/writes with token      │ manuscript uploads
         ▼                              ▼
  ┌──────────────────────────────────────────────┐
  │                  Supabase                    │
  │  Auth ──▶ logins and sessions                │
  │  PostgreSQL ──▶ submissions, notes,          │
  │                  audit log; authors table    │
  │                  unreachable by reader role  │
  │                  (row-level security)        │
  │  Storage ──▶ manuscript files                │
  │  Edge Function ──▶ sends the emails          │
  └──────────────┬───────────────────────────────┘
                 │  trigger: new submission / decision
                 ▼
          ┌───────────────┐
          │    Resend     │
          │  (email)      │──▶ status links and letters
          └───────────────┘
```

The frontend is deliberately thin: it displays pages and sends requests. The database decides what each request may see. The frontend connects to Supabase with a public "anon" key that merely opens the connection and grants nothing by itself — all real permissions come from the per-user token described next. Supabase Auth issues each staff member a token (an "ID card" stating their role), and every request carries it; Supabase's row-level security (RLS) policies check the token and return only what the role permits [7]. The reader role has no policy that can read the authors table — so author identity is structurally absent from reader-accessible data, not just hidden in the interface. The only server-side code in the project is a single Supabase Edge Function that triggers email on submission and on decisions [7].

## Technology Choices and Alternatives

The table below lists every need and the choice made, including the libraries used so nothing is hand-rolled.

| Need | Choice | Alternatives considered | Why this choice |
|---|---|---|---|
| Frontend framework | React + Vite [8][9] | Next.js; SvelteKit; plain HTML | One familiar language (JavaScript/TypeScript); static hosting; no server-side rendering needed for a login-gated app |
| Forms & validation | React Hook Form + Zod | Hand-rolled validation | Declarative, type-safe validation shared between client and server |
| Backend service | Supabase: Postgres + Auth + Storage + Edge Functions [7] | Hand-rolled Express/Django backend; Firebase; PocketBase | Provides database, logins, file storage, and serverless functions in one free service — no server to administer |
| Database access | Supabase client (@supabase/supabase-js) | Prisma ORM | Keeps row-level security intact; Prisma's direct connection bypasses RLS |
| Database | PostgreSQL via Supabase [7] | SQLite; MongoDB | RLS is the mechanism that enforces blind review; Postgres is required for it |
| File storage | Supabase Storage [7] | AWS S3; server filesystem | Co-located with the database; free tier; files stay with the data |
| Email | Resend [10] | SendGrid; Mailgun; nodemailer + SMTP | Simple API and free tier far above a club's volume |
| Metadata stripping | `exifr` (images), `pdf-lib` (PDFs), zip-based `.docx` handling | Skipping the step | Prevents a writer's name from leaking through file properties |
| Testing | Vitest + Playwright | Jest; no tests | Unit tests for business rules; end-to-end tests for submit → review → decide |
| Hosting | Free static host (Netlify or Vercel) | Self-hosted VPS | Free; static files need no server |
| Proposal delivery | GitHub Pages [12] | — | Course deliverable |

The framework decision deserves explicit defense. A plain React + Vite single-page app was chosen over Next.js because this application sits behind a login: the main advantages of server-rendering — fast first page loads and search-engine visibility — do not matter for roughly 20 logged-in staff, while the added machinery of Next.js costs learning time and future maintenance [8][9]. Django was rejected despite being a fine framework because the coursework background is JavaScript-based and because Django's admin panel overlaps with what Supabase already provides. A hand-rolled Express backend was rejected because it would require operating a server and re-implementing authentication, storage, and security — work Supabase does natively, with RLS as a genuine data-layer security mechanism rather than a convention in application code [7]. Resend was chosen over self-hosted SMTP because transactional email deliverability (SPF/DKIM records, spam placement) is a solved problem better delegated to a specialist service [10].

Security work throughout follows the OWASP Top 10 as a checklist, with "broken access control" treated as the project's primary risk, because the entire product is a permission boundary [11].

## New Concepts and Technologies to Learn

Given a background of core computer-science coursework — data structures, algorithms, and an introduction to web programming, with limited exposure to production systems — the following are anticipated learning items rather than existing strengths:

- **Row-level security (RLS) policy design.** Writing SQL policies that enforce role-based access in the database itself; this is the project's central security problem and its main new concept [7].
- **Authentication and session patterns.** Supabase Auth, tokens, refresh behavior, and protecting routes so blind review cannot be bypassed by calling the database directly [7].
- **File upload handling and sanitization.** Size limits, safe storage, and stripping personally identifying metadata — including the `.docx` format, a zip archive with author data inside.
- **Static deployment.** Building a Vite app and deploying it to a free static host, plus environment configuration.
- **Transactional email and deliverability.** SPF/DKIM records, domain verification, and why email from free tiers lands in spam without them [10].
- **Automated testing.** Unit tests for decision logic and end-to-end tests for the main user journeys, which double as living documentation for the club after the project ends.

## Timeline

The project runs from late August to mid-December 2026 (roughly twelve weeks of build time, accounting for finals).

| Weeks | Work | Deliverable |
|---|---|---|
| 1–2 | Interview the club on their actual Submittable usage; learn Supabase/RLS basics; scaffold | Agreed feature scope; running scaffold |
| 3–4 | Supabase Auth, roles, member management; public submission form with upload and metadata stripping | A writer can submit and get a status link |
| 5–7 | Reader and editor workflow: queues, assignment, notes, discussion, statuses | Editors can run a review cycle end to end |
| 8–9 | Resend integration, decision-letter templates, conflict detection, audit log | Decisions go out signed by the journal |
| 10–11 | Hardening: blind-review audit, backup/export script, automated tests; deploy | Production deployment |
| 12 | Dry-run pilot with the club; handoff document; final report | Pilot feedback; documentation |

## Risks and Mitigations

- **Access to the club's domain account.** If the login is held by a former student, the pilot runs on a cloud URL and domain polish is deferred; the core system does not depend on it.
- **Maintenance after graduation.** Mitigated by design: few services, audit log, export/backup, and a written handoff guide. Every record is exportable, so the club is never trapped in the tool.
- **Scope growth.** The single biggest risk. Controlled by the up-front club interview (features they actually click, features they never touch) and by the explicit decision to build for one club, not a platform [2].
- **Supabase free-tier pause.** Free projects pause after about a week of inactivity; the handoff guide documents the one-step reactivation ritual before each reading period.

## What the Club Is Left With

After the project ends, the club receives working software that runs its exact workflow at no cost; its own database and files with backup and export; a plain-language handoff guide covering daily use, backup, and reactivation; and a codebase simple enough — one frontend, one backend service, one email provider — that a future club member can maintain it.

## References

[1] Submittable, "How can my literary organization receive a discounted CLMP plan?," Submittable Help Center, Jan. 14, 2022. [Online]. Available: https://submittable.help/en/articles/3512930-how-can-my-literary-organization-receive-a-discounted-clmp-plan. [Accessed: Sep. 8, 2026].

[2] G. Lyvers, "What Submittable actually costs a small literary magazine," Green Submissions, Jul. 11, 2026. [Online]. Available: https://www.greensubmissions.com/articles/what-submittable-costs.html. [Accessed: Sep. 8, 2026].

[3] Duotrope, "Duosuma: Overview for Publishers and Agents," Duotrope. [Online]. Available: https://duotrope.com/duosuma/overview-publishers-agents.aspx. [Accessed: Sep. 8, 2026].

[4] Moksha, "Pricing — The Moksha Submissions System," Moksha. [Online]. Available: https://moksha.io/pricing/. [Accessed: Sep. 8, 2026].

[5] G. Lyvers, "Free Submittable alternatives for literary magazines (2026)," Green Submissions, Jul. 11, 2026. [Online]. Available: https://www.greensubmissions.com/articles/free-submittable-alternatives.html. [Accessed: Sep. 8, 2026].

[6] Community of Literary Magazines and Presses, "Benefits," CLMP. [Online]. Available: https://www.clmp.org/join-clmp/benefits/. [Accessed: Sep. 8, 2026].

[7] Supabase, "Supabase Documentation," Supabase. [Online]. Available: https://supabase.com/docs. [Accessed: Sep. 8, 2026].

[8] Vite, "Vite Documentation," Vite. [Online]. Available: https://vite.dev. [Accessed: Sep. 8, 2026].

[9] React, "React Documentation," React. [Online]. Available: https://react.dev. [Accessed: Sep. 8, 2026].

[10] Resend, "Resend Documentation," Resend. [Online]. Available: https://resend.com/docs. [Accessed: Sep. 8, 2026].

[11] OWASP Foundation, "OWASP Top 10: 2021," OWASP. [Online]. Available: https://owasp.org/Top10/. [Accessed: Sep. 8, 2026].

[12] GitHub, "GitHub Pages Documentation," GitHub. [Online]. Available: https://docs.github.com/en/pages. [Accessed: Sep. 8, 2026].
