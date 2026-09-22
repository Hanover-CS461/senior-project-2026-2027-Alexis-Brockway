---
marp: true
theme: cayman
paginate: true
size: 16:9
---

<!-- _class: lead -->

# Senior Project Proposal

## A Custom Submission Manager for a College Literary Magazine

---

## Agenda

1. The problem
2. The solution
3. Why this over other options
4. Users & roles
5. Features
6. Technology choices
7. Timeline

---

## The Problem

- The lit journal pays **$290/year** for Submittable
- The club uses only a **handful** of its features
- The submission archive is trapped in a **third-party system**

---

## The Solution

A custom, club-scoped web app that:

- Runs the full editorial workflow
- Enforces **blind review** at the data layer
- Keeps the archive in a database the club controls

---

## Why This Over Other Options

| | Cost | Fits club? | Club owns data? |
|---|---|---|---|
| **This project** | ~$0 | Yes, by design | Yes |
| Submittable | $290/yr + fees | No | No |
| Duosuma | ~$0.09/sub | No | No |
| Moksha | ~$750/yr | No | No |

Also: Green Submissions is free but single-author PHP that can't match the club's workflow — and teaches nothing.

---

## Users & Roles

| Role | Sees author identity? |
|---|---|
| **Managing Editor** | Yes — full view |
| **Reader** | No — blind |
| **Submitter** | n/a |

---

## Features — Submitters & Editors

**For submitters:**
- Submission form (genre, title, manuscript, author info)
- Emailed status tracking — no writer accounts
- Withdraw a submission

**For managing editors:**
- Full-view queue, assign readers, notes & discussion
- Configurable statuses: Received → In review → Shortlist → Accepted/Rejected
- Decision letters + member management + CSV export

---

## Features — Readers (Blind)

**For readers:**
- Submissions with **no author identity**
- Assigned + shared queue, private notes, scoring
- Invite other readers — but never grant full view

---

## Blind Review, Enforced

- Author identity stored separately — excluded from every reader query
- File metadata stripped from uploads
- Letters never name readers
- Editor-submission conflict detection

---

## Technology

- **Frontend:** React + Vite
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Email:** Resend
- **Hosting:** Free static host

---

## Why These Technology Choices

- **React + Vite over Next.js** — login-gated app; no server-rendering or SEO needed
- **Supabase over a hand-rolled Express/Django backend** — one free service for database, logins, storage, serverless; RLS enforces blind review
- **Postgres (RLS) over SQLite/MongoDB** — row-level security is *why* readers can't see author identity
- **Resend over self-hosted SMTP** — deliverability (SPF/DKIM) is a solved problem

---

## Thanks!

Questions?