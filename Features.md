Three roles — Managing Editor (the 2 co-EiCs + advisor, full view of author identities + all admin powers), Reader (blind), and Submitter (writers, not app users).
By role:
- Submitters — submission form, emailed status tracking, withdraw.
- Managing Editors — full-identity queue, assign readers, notes/discussion, statuses, decision emails, unblind at acceptance, conflict flag, scoring/bulk actions; plus member management (invite, change roles, deactivate), form/genre config, export, backup, archive, audit log.
- Readers — blind queue ("assigned to me" + shared pile), notes, discussion, scoring, can invite other readers but never grant full view.
Cross-cutting (blind review) — identity structurally separated from reader queries, file-metadata stripping/warning, letters never name readers, editor-submission conflict detection.
Trust/handoff — export/backup, audit log for the advisor, deactivate-not-delete for clean semester turnover.
I also carried the three open questions into the file (advisor's exact role, when unblinding happens, whether bios are collected at all) so they don't get lost — those are the ones that'll firm up the spec once you talk to the club.
Want me to keep it as-is, or is there anything you'd reshuffle (e.g., separate the advisor into a fourth role, or split managing-editor review powers from admin powers)?
▣  Deliberate · DeepSeek V4 Flash · 18.3s
add this md to my github
+ Thought: 3.1s
→Read .git/config 
+ Thought: 597ms
I can't push this myself — I don't have terminal access in this environment, so I can't run git commands. But your repo is set up correctly (remote is https://github.com/Hanover-CS461/senior-project-2026-2027-Alexis-Brockway.git on branch main), so you just need to run these from the project folder:
cd /mnt/c/Users/A3bro/senior-project-2026-2027-Alexis-Brockway

git add features.md
git commit -m "Add feature list by role for Submittable replacement"
git push origin main
A couple of things to note:
- If you want brainstorm.md in there too (it's currently untracked), do git add features.md brainstorm.md instead.
- If git push asks for credentials, you may need a personal access token (GitHub no longer accepts plain passwords). If you haven't already, you can set it up via gh auth login or a token in the credential helper.
- Check your current state first with git status to make sure you're not leaving anything else out.
One small thing worth doing before you commit: I named the file features.md — if you'd rather call it something like spec.md or fold it into brainstorm.md, now's the cheap time to rename. Otherwise, run those four commands and it'll be on GitHub.
▣  Deliberate · DeepSeek V4 Flash · 8.1s
can you see the new md file now
+ Thought: 1.9s
→Read . 
I can see features.md — it's there in your project folder on disk, right next to brainstorm.md.
But to be clear about what "seeing it" means: I can read the file that's saved locally in your repo, which I just confirmed exists. I cannot see GitHub's copy of it — I have no access to your remote repo, and I can't run git commands to check whether your push went through. Only you can verify that.
So the file is definitely created and saved. To confirm it's actually on GitHub, run:
git status          # should show features.md (and brainstorm.md) as committed or untracked
git log --oneline -1
git push origin main
If git status shows nothing to commit, working tree clean, your earlier commit+push went through. If it shows Untracked files: features.md, you haven't committed it yet — run the git add / commit / push steps I gave you.
Want me to re-read the current contents of features.md to double-check it matches what we put together?
▣  Deliberate · DeepSeek V4 Flash · 6.3s
okay can you just create the md file without actualy putting it in the place
+ Thought: 1.6s
Got it — here's the full markdown content, so you can copy it wherever you want without me saving it to the repo:
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

## 5. Trust / handoff (Managing Editor role)

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
