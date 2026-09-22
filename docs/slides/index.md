---
marp: true
theme: default
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
3. Users & roles
4. Technology choices
5. Timeline

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

## Users & Roles

| Role | Sees author identity? |
|---|---|
| **Managing Editor** | Yes — full view |
| **Reader** | No — blind |
| **Submitter** | n/a |

---

## Technology

- **Frontend:** React + Vite
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Email:** Resend
- **Hosting:** Free static host

---

<!-- _class: lead -->

# Thanks!

Questions?