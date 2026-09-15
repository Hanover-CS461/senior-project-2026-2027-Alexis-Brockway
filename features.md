# Submittable Replacement — Feature List by Role

A custom submission manager for the school's lit journal, scoped to one club's
workflow. Companion to `brainstorm.md`.

## Roles

| Role | Who holds it | Sees author identity? | System powers |
|---|---|---|---|
| **Managing Editor** | 2 co-editors-in-chief + advisor (3 people) | **Yes** — full view | Everything: review workflow + admin |
| **Reader** | Club members who read/review | **No** — blind | Review only; can invite other readers |
| **Submitter** | External (writers) | n/a | Submission form + status tracking |

**Security rule:** only the Managing Editor role can manage members or change
roles. If a Reader could promote themselves, blind review would be meaningless.
Changes are recorded in the audit log.

---

## 1. For Submitters (writers, not app users)

- Submission form — genre, title, manuscript upload, plus author info (name,
  email, bio) that readers never see.
- Confirmation + status tracking — emailed status link; no writer accounts.
- Withdraw a submission.

## 2. For Managing Editors (full view + admin)

### Review workflow
- See full author identity on every submission (only role that does).
- Queue / slush pile with author column.
- Assign submissions to specific readers.
- Per-reader notes (their own, plus view everyone's).
- Internal discussion on a piece.
- Manage statuses — configurable stages (Received → In review → Shortlist →
  Accepted/Rejected).
- Send decisions with email templates (accept / reject / shortlist), signed by
  the journal, not by individual readers.
- Reveal the author to the team at acceptance (unblind).
- See the editor-submission conflict flag (when a club member submits their own
  work — routed to all full-view people).
- Scoring / rating (only if the club actually uses it).
- Bulk actions — e.g. reject all remaining subs in a genre.

### Admin / system
- Member management: invite new readers and managing editors by email link.
- Change roles (Reader ↔ Managing Editor).
- Deactivate members (revoke access, keep their notes/assignments/history).
- Configure the submission form fields, genres, and reading periods.
- CSV export + full backup.
- Past-submission archive (searchable).
- Audit log — who was invited, promoted, deactivated, and when.

## 3. For Readers (blind)

- See submissions with **no author identity** (title, genre, manuscript only).
- Queue: "assigned to me" view + the shared pile.
- Add per-reader notes (attributed to them, private to the editor team).
- Internal discussion on pieces.
- Score / rate (if used).
- Invite other readers (but can never grant full view).

## 4. Blind review — cross-cutting (enforced by the system)

- Author identity is stored separately and structurally excluded from every
  reader-facing query/view — not just hidden in the UI.
- File metadata handling — strip author metadata from uploads and/or warn
  writers about names in document headers.
- Letters never contain reader names.
- Editor-submission conflict detection (submitter email matches an editor
  account).

## 5. Trust / handoff (Managed Editor role)

- Full data export + backup so the club's archive is never trapped in the code.
- Audit log for advisor oversight.
- Deactivate-not-delete so semester turnover is easy and history is preserved.

---

## Notes / open items
- Does the advisor act as a full managing editor, or mostly oversight (audit,
  export, backup)? Either way it's the same role — just a question of which
  screens they use.
- At what point is the author revealed — acceptance, or only at publication?
- Does the club collect bios / cover letters at all, given they'd out the author
  instantly?
