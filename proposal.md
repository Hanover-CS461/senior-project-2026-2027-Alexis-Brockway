# Replacing Submittable: A Custom Submission Manager for a College Literary Magazine

This project replaces the college literary magazine's paid submission platform (Submittable) with a custom, club-scoped web application that manages the full editorial workflow — intake, blind review, reader notes, and decision letters — while cutting the journal's annual software cost to nearly zero.

The magazine is a small student-run publication that currently processes all submissions through Submittable, a general-purpose submission and grant-management platform whose pricing has become hard to justify for a club-sized budget [1]. The journal's workflow is small and stable: a handful of editors and readers, a few genres, and one or two submission windows per year. That workflow does not need a platform; it needs a tool built around exactly what the club does and nothing else. This project builds that tool, scoped to one club rather than designed as a general platform, which is the key decision that makes the project completable in a single semester. Beyond cost, the project addresses a second problem that is invisible until it hurts: the club's submissions archive currently lives inside a third-party system, and when a subscription ends, access to years of editorial history ends with it [2].

## Motivation and Problem

The problem has three parts: cost, fit, and ownership.

**Cost.** Submittable does not publish prices for most customers, but its discounted plan for members of the Community of Literary Magazines and Presses (CLMP) costs $290 per year, plus a $0.99 processing fee and a 5% charge on any paid submission [1][2]. For a college club that runs on a student-activities budget, several hundred dollars a year for software is a real line item, and the per-transaction fees quietly multiply across every submission [2].

**Fit.** The magazine uses a small fraction of Submittable's surface area. Submittable is built to serve contests, grants, fellowships, and corporate programs; its own pricing page now markets corporate social-responsibility and grant-management products rather than literary journals [1]. The club clicks a few features — a submission form, a queue, statuses, and letters — and pays for the rest.

**Ownership.** Every submission, note, and decision the club has made lives in a proprietary system. Exporting requires the platform's cooperation, and when the subscription ends, the archive is no longer the club's to open [2][5]. A tool the club operates, with its own database and backups, guarantees that the journal's editorial history outlives any vendor relationship.

## Project Goals and Core Features

The system serves three roles, with one non-negotiable constraint: readers must never see author identity.

- **Submitters (writers).** A public submission form for genre, title, manuscript upload, and author details; an emailed status link (no writer accounts); and the ability to withdraw a submission.
- **Managing Editors (2 co-editors-in-chief + advisor).** A full-view queue with author column, assignment of submissions to specific readers, per-reader notes, internal discussion threads, configurable status stages (Received → In review → Shortlist → Accepted/Rejected), decision letters with the journal's templates, author reveal at acceptance, and an editor-submission conflict flag when a club member submits their own work.
- **Readers.** A blind queue of assigned and shared submissions showing only title, genre, and manuscript; private attributed notes; and discussion on pieces. Readers can invite other readers but can never gain full view.
- **System-wide blind review.** Author identity is stored in a separate table and structurally excluded from every reader-facing query at the data layer, not merely hidden in the UI. Uploaded files have author metadata stripped at intake. Letters never carry reader names.
- **Trust and handoff.** A full audit log (invites, role changes, deactivations), CSV export, scheduled backups, and deactivate-not-delete so semester turnover is painless and the archive is preserved after the project ends.

## Comparable Solutions

Four existing systems are worth contrasting with the proposed project.

**Submittable** is the incumbent and the platform being replaced. It offers intake forms, team roles, blind-read options, statuses, and automated letters, and it is deeply established in the market [1]. The differences are cost (roughly $290/year even at its CLMP discount, plus per-transaction fees), generality (features for contests, grants, and enterprise programs the club never touches), and ownership (the club's archive is held by a vendor whose pricing and product direction it does not control) [1][2][6].

**Duosuma**, by Duotrope, is a submission manager priced per submission rather than per month, which suits magazines that open only a few times a year [3]. It charges publishers roughly $0.09 per submission, billed monthly, with volume discounts, and is free for writers who hold a Duotrope account [3]. It is affordable, but the club still pays forever per submission, the workflow is Duotrope's rather than the club's, and the journal's data remains on a third-party service.

**Moksha** is a hosted submissions system used by major speculative-fiction magazines such as *Lightspeed*, *Nightmare*, and *The Magazine of Fantasy & Science Fiction* [4]. It offers one-click form letters, customizable workflows, ratings, and a "permanent archive" — permanent, that is, while the subscription runs [4][5]. Its annual plan costs $750, which is *more* than Submittable's discounted rate, and it is closed software with a subdomain hosted under moksha.io [4][5].

**Green Submissions** is the strongest "do nothing" alternative: free, self-hosted submission software for literary magazines that installs on ordinary shared hosting [5]. It proves that a club could avoid building anything. It is PHP/MySQL software from a single author, however; it cannot be customized to the club's exact workflow without forking it, and it offers no learning value for a computer-science senior project [5].

The proposed project differs from all four in the same ways: it is built to the club's exact workflow rather than a general template; it costs nothing beyond hosting and a domain the club already owns; it keeps the archive in a database the club controls and can export at any time; and, uniquely among the options, it is the point of a computer-science senior project — the build itself is the deliverable.

| Aspect | This project | Submittable | Duosuma | Moksha |
|---|---|---|---|---|
| Cost model | ~$0 (free tiers + owned domain) | ~$290/yr + per-submission fees [1][2] | ~$0.09/submission [3] | ~$750/yr [4][5] |
| Scoped to club workflow | Yes, by design | No, general platform | No | No |
| Club controls the data | Yes, own database | No | No | No |
| Blind review at data layer | Yes | Configurable [1] | Configurable [3] | Configurable [4] |
| Maintenance burden | Student-built, documented | Vendor | Vendor | Vendor |

## Proposed Architecture

The system is a single full-stack web application with a small number of external services, each with one job.

```
                      ┌──────────────────────────────────┐
                      │  GoDaddy: domain and DNS          │
                      │  submit.<journal>.org ──► app     │
                      │  SPF / DKIM records for email     │
                      └────────────────┬─────────────────┘
                                       │
  Submitter (writer)                   │            Managing Editor / Reader
       │                               ▼                       │
       │                       ┌──────────────────┐            │
       └── public form ───────►│  Next.js app      │◄─── authenticated ─┘
       └── status link ◄───────│  (Vercel)         │     routes, role-gated
                               │  React UI + API   │
                               └───────┬──────┬────┘
                                       │      │
                      ┌────────────────┘      └─────────────────┐
                      ▼                                         ▼
              ┌──────────────────┐                     ┌──────────────────┐
              │  Supabase        │                     │  Supabase        │
              │  PostgreSQL      │                     │  Storage         │
              │  roles,          │                     │  manuscripts     │
              │  submissions,    │                     │  (metadata       │
              │  notes, audit log│                     │  stripped)       │
              └────────┬─────────┘                     └──────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  Resend (email)  │──► confirmations, status links, letters
              └──────────────────┘
```

The logical pieces and their connections are as follows.

- **Next.js application (deployed on Vercel's free tier).** The only piece the club's users ever see. It serves the public submission form and the role-gated editor/reader interface, and it implements all business rules (status transitions, conflict detection, letter generation) in server-side code [7].
- **Supabase PostgreSQL.** The system of record: users and roles, submissions, reader notes, discussion, the audit log, and the archive. Author identity lives in a separate table so that reader-facing queries never join it — blind review is enforced by schema, not by UI discipline [9][10].
- **Supabase Storage.** Manuscript files, with a metadata-stripping step at upload (using libraries such as `exifr` for images and `pdf-lib` for PDFs) so that a writer's name cannot leak through a document's properties.
- **Resend (transactional email).** Confirmation links and decision letters, sent from the journal's own domain so they land in inboxes rather than spam filters [11].
- **GoDaddy domain and DNS.** The journal's existing domain provides the public-facing URL (`submit.<journal>.org`) and the identity that email verification (SPF/DKIM records) depends on.

## Technology Choices and Rationale

| Area | Choice | Alternatives considered | Why this choice |
|---|---|---|---|
| Framework | Next.js + React + TypeScript [7] | Express + React SPA; Django; plain PHP | One deployable that serves UI and API together, mature ecosystem, first-class support on Vercel's free tier |
| Database | PostgreSQL via Supabase [9][10] | SQLite; MongoDB; self-hosted Postgres | Relational shape (submissions, notes, roles, audit) fits naturally; hosted free tier removes ops burden |
| Object storage | Supabase Storage [10] | AWS S3; Cloudflare R2; server filesystem | Co-located with the database; generous free tier; S3-compatible |
| ORM | Prisma [8] | Drizzle; Kysely; raw SQL | Type-safe schema, automatic migrations, avoids hand-rolled SQL for every query |
| Auth | Supabase Auth + `@supabase/ssr` [10] | Better Auth; Passport; hand-rolled sessions | Pre-built session and password management; role checks enforced separately in our API layer |
| Email | Resend [11] | SendGrid; Mailgun; nodemailer + SMTP | Simple API, free tier far above a club's volume, straightforward domain verification |
| Styling | Tailwind CSS + shadcn/ui | Material UI; plain CSS | Component library avoids hand-rolling tables, forms, and buttons |
| Forms & validation | React Hook Form + Zod | Hand-rolled validation | Declarative, type-safe validation on both client and server |
| Testing | Vitest + Playwright | Jest; no tests | Unit tests for business rules, end-to-end tests for the critical submit → review → decide path |
| Deployment | Vercel free tier [7] | Render; Railway; self-hosted VPS | Next.js is the platform's primary citizen; free tier sufficient for a club's traffic |

The framework decision deserves explicit defense, since it shapes everything else. A Next.js single application was chosen over a separate React frontend and Express backend because it halves the number of deployables, keeps one language and one type system across the stack, and renders the public submission form as fast static HTML that a search engine or a student on a slow campus network can load [7]. Django was rejected despite being a fine framework because the student's coursework background is JavaScript-based and because Django's batteries-included model overlaps with what Supabase already provides. Plain PHP, as used by Green Submissions [5], was rejected because it would hand-roll everything a framework provides for free.

The database choice follows the same logic. The data is deeply relational — a submission has notes, an audit trail, role-scoped visibility — which is PostgreSQL's natural territory and a poor fit for a document store [9]. SQLite cannot serve concurrent writers on a hosted deployment. Hosting Postgres through Supabase rather than self-managing it removes the single most failure-prone operation (database administration) from the project's critical path, and its row-level security provides a second, database-level enforcement layer for blind review behind the application logic [10]. Security work throughout follows the OWASP Top 10 as the checklist, with the broken-access-control category treated as the project's primary risk because the entire product is a permission boundary [12].

## New Concepts and Technologies to Learn

Given my current background — core computer-science coursework including data structures, algorithms, and an introduction to web programming, with limited exposure to production systems — the following are anticipated learning items rather than existing strengths:

- **Production deployment and operations.** Environment configuration, secrets management, free-tier constraints (such as cold starts), and DNS configuration through the club's GoDaddy account.
- **Authentication and authorization patterns.** Session management, role-based access control, and protecting routes at both the UI and the API layers so that blind review cannot be bypassed by calling an endpoint directly.
- **Database design for access control.** Modeling blind review so that identity columns are structurally absent from reader-facing queries, plus Postgres row-level security as defense in depth.
- **ORM migrations.** Schema evolution with Prisma as the project's shape changes during development.
- **Transactional email and deliverability.** SPF and DKIM records, domain verification, and why emails from free tiers land in spam without them.
- **File upload handling and sanitization.** Size limits, safe storage, and stripping personally identifying metadata from uploaded manuscripts.
- **Automated testing.** Unit tests for decision logic and end-to-end tests for the main user journeys, which also serve as living documentation for the club after the project ends.

## Project Plan and Timeline

The project runs from late August to mid-December 2026 (roughly twelve weeks of build time, accounting for finals).

| Weeks | Work | Deliverable |
|---|---|---|
| 1–2 | Interview the club on its actual Submittable usage; finalize schema; scaffold Next.js + Supabase + Prisma | Agreed feature scope; running scaffold |
| 3–4 | Supabase Auth, roles, and member management; public submission form with upload and metadata stripping | A writer can submit and get a status link |
| 5–7 | Reader and editor workflow: queues, assignment, notes, discussion, statuses | Editors can run a review cycle end to end |
| 8–9 | Resend integration, decision-letter templates, conflict detection, audit log | Decisions go out signed by the journal |
| 10–11 | Hardening: blind-review audit, backup/export script, automated tests; deploy to Vercel; configure `submit.<journal>.org` | Production deployment on the journal's domain |
| 12 | Dry-run pilot with the club; handoff document (deploy, backup, daily use); final report | Pilot feedback; documentation |

## Risks and Mitigations

- **Timing of the club's submission window.** If the next reading period opens before the system is ready, the pilot runs in parallel with the club's existing process rather than replacing it. The tool is demonstrated, not depended on.
- **Access to the GoDaddy account and DNS.** If the login is held by a former student, the pilot runs on a cloud URL and domain polish is deferred; the core system does not depend on the domain.
- **Advisor confidence and maintenance after graduation.** Mitigated by the audit log, the export/backup script, and a written handoff guide; the club is never trapped in the tool because every record is exportable and the archive lives in a database it can read directly.
- **Scope growth.** The single biggest risk. It is controlled by the up-front club interview (features they actually click, features they never touch) and by the explicit decision to build for one club, not a platform [2].

## Delivery and Evaluation

Success is measured three ways. First, the system runs the journal's real workflow in a pilot: submissions arrive, readers review blind, and decisions go out with letters. Second, the club can operate and hand off the system without the builder: the documentation, audit log, and export path make the tool survivable beyond December. Third, the project meets the CS 461 requirements: this proposal is published via GitHub Pages from the project repository [13], and the repository contains the implementation, tests, and deployment configuration alongside it.

## References

[1] Submittable, "How can my literary organization receive a discounted CLMP plan?," Submittable Help Center, Jan. 14, 2022. [Online]. Available: https://submittable.help/en/articles/3512930-how-can-my-literary-organization-receive-a-discounted-clmp-plan. [Accessed: Sep. 3, 2026].

[2] G. Lyvers, "What Submittable actually costs a small literary magazine," Green Submissions, Jul. 11, 2026. [Online]. Available: https://www.greensubmissions.com/articles/what-submittable-costs.html. [Accessed: Sep. 3, 2026].

[3] Duotrope, "Duosuma: Overview for Publishers and Agents," Duotrope. [Online]. Available: https://duotrope.com/duosuma/overview-publishers-agents.aspx. [Accessed: Sep. 3, 2026].

[4] Moksha, "The Moksha Submissions System," Moksha. [Online]. Available: https://moksha.io/. [Accessed: Sep. 3, 2026].

[5] G. Lyvers, "Free Submittable alternatives for literary magazines (2026)," Green Submissions, Jul. 11, 2026. [Online]. Available: https://www.greensubmissions.com/articles/free-submittable-alternatives.html. [Accessed: Sep. 3, 2026].

[6] "The rise of the submission industrial complex," Literary Hub, May 7, 2025. [Online]. Available: https://lithub.com/the-rise-of-the-submission-industrial-complex. [Accessed: Sep. 3, 2026].

[7] Vercel, "Next.js Documentation," Vercel. [Online]. Available: https://nextjs.org/docs. [Accessed: Sep. 3, 2026].

[8] Prisma, "Prisma ORM Documentation," Prisma. [Online]. Available: https://www.prisma.io/docs. [Accessed: Sep. 3, 2026].

[9] PostgreSQL Global Development Group, "PostgreSQL Documentation," PostgreSQL. [Online]. Available: https://www.postgresql.org/docs/. [Accessed: Sep. 3, 2026].

[10] Supabase, "Supabase Documentation," Supabase. [Online]. Available: https://supabase.com/docs. [Accessed: Sep. 3, 2026].

[11] Resend, "Resend Documentation," Resend. [Online]. Available: https://resend.com/docs. [Accessed: Sep. 3, 2026].

[12] OWASP Foundation, "OWASP Top 10: 2021," OWASP. [Online]. Available: https://owasp.org/Top10/. [Accessed: Sep. 3, 2026].

[13] GitHub, "GitHub Pages Documentation," GitHub. [Online]. Available: https://docs.github.com/en/pages. [Accessed: Sep. 3, 2026].