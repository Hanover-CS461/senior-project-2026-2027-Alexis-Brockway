import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { canManageMembers } from '../lib/roles'
import { csvFilename } from '../lib/csv'
import { downloadTextFile } from '../lib/download'
import {
  membersCsv,
  ratingsCsv,
  submissionsCsv,
  type ExportAuthor,
  type ExportMember,
  type ExportRating,
  type ExportSubmission,
} from '../lib/exportData'

type Kind = 'submissions' | 'scores' | 'staff'

interface Report {
  kind: Kind
  rows: number
  filename: string
}

/**
 * The club's escape hatch: every record, as a file, on demand.
 *
 * There is deliberately no service key and no server here. The queries run
 * through the signed-in Chief Editor's own session, so RLS decides what comes
 * out — the same boundary that governs every other page. A reader who somehow
 * loaded this panel would export a file with empty author columns, because the
 * database refuses them the identity, not because the button hid it.
 */
function ExportPanel() {
  const { member } = useAuth()
  const [busy, setBusy] = useState<Kind | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)

  const run = async (
    kind: Kind,
    load: () => Promise<{ csv: string; rows: number }>,
    prefix: string,
  ) => {
    setBusy(kind)
    setError(null)
    setReport(null)

    try {
      const { csv, rows } = await load()
      const filename = csvFilename(prefix)
      downloadTextFile(filename, csv)
      setReport({ kind, rows, filename })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const exportSubmissions = () =>
    run(
      'submissions',
      async () => {
        const [subs, authors, ratings] = await Promise.all([
          supabase
            .from('submissions')
            .select(
              'id, title, genre, status, decided_at, hanover_student, created_at',
            )
            .order('created_at', { ascending: false }),
          supabase
            .from('authors')
            .select('submission_id, name, email, mailing_address, bio'),
          supabase.from('ratings').select('submission_id, score, notes, recused'),
        ])

        const failure = subs.error ?? authors.error ?? ratings.error
        if (failure) throw new Error(failure.message)

        const rows = (subs.data ?? []) as ExportSubmission[]
        return {
          csv: submissionsCsv(
            rows,
            (authors.data ?? []) as ExportAuthor[],
            (ratings.data ?? []) as ExportRating[],
          ),
          rows: rows.length,
        }
      },
      'submissions',
    )

  const exportScores = () =>
    run(
      'scores',
      async () => {
        const [subs, ratings] = await Promise.all([
          supabase.from('submissions').select('id, title'),
          supabase.from('ratings').select('submission_id, score, notes, recused'),
        ])

        const failure = subs.error ?? ratings.error
        if (failure) throw new Error(failure.message)

        const rows = (ratings.data ?? []) as ExportRating[]
        return {
          csv: ratingsCsv((subs.data ?? []) as { id: string; title: string }[], rows),
          rows: rows.length,
        }
      },
      'reader-scores',
    )

  const exportStaff = () =>
    run(
      'staff',
      async () => {
        const { data, error } = await supabase
          .from('members')
          .select('name, email, role, active, created_at')
          .order('created_at', { ascending: true })

        if (error) throw new Error(error.message)

        const rows = (data ?? []) as ExportMember[]
        return { csv: membersCsv(rows), rows: rows.length }
      },
      'staff',
    )

  const files: {
    kind: Kind
    title: string
    blurb: string
    action: () => void
    chiefOnly?: boolean
  }[] = [
    {
      kind: 'submissions',
      title: 'Submissions',
      blurb:
        'One row per submission, with author, status, decision date and average score — the archive and the backup.',
      action: exportSubmissions,
    },
    {
      kind: 'scores',
      title: 'Reader scores',
      blurb:
        'One row per reader judgement: score, recusal, and the written note. Notes carry no reader name, by design.',
      action: exportScores,
    },
    {
      kind: 'staff',
      title: 'Staff',
      blurb: 'Name, email, role, active flag and join date for every member.',
      action: exportStaff,
      chiefOnly: true,
    },
  ]

  return (
    <div className="export-panel">
      <p className="lede">
        Every record the club owns, as a CSV. The file is read through your own
        session, so the database decides what it contains.
      </p>

      {error && <p className="error">{error}</p>}
      {report && (
        <p className="hint">
          Downloaded {report.filename} — {report.rows}{' '}
          {report.rows === 1 ? 'row' : 'rows'}.
        </p>
      )}

      <ul className="export-list">
        {files
          .filter((f) => !f.chiefOnly || canManageMembers(member?.role))
          .map((file) => (
            <li key={file.kind} className="export-row">
              <span className="export-detail">
                <strong>{file.title}</strong>
                <span className="demo-blurb">{file.blurb}</span>
              </span>
              <button
                type="button"
                className="btn btn-small"
                aria-label={`Download ${file.title} as CSV`}
                disabled={busy !== null}
                onClick={file.action}
              >
                {busy === file.kind ? 'Preparing…' : 'Download CSV'}
              </button>
            </li>
          ))}
      </ul>
    </div>
  )
}

export default ExportPanel
