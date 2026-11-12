// The three exports, as pure functions over rows the page has already fetched.
//
// Keeping them here (rather than inline in the component) means the join logic
// — submission to author to score — is testable, and the column order is stated
// once instead of drifting between the button and the file.
//
// Who may export what is NOT decided here: it is decided by RLS. An editor can
// read authors, so the join works; a reader's copy of this page would simply
// get empty author columns. The dashboard still hides the panel from readers,
// but the database is the boundary.

import { toCsv } from './csv'

export interface ExportSubmission {
  id: string
  title: string
  genre: string
  status: string
  decided_at: string | null
  hanover_student: boolean
  created_at: string
}

export interface ExportAuthor {
  submission_id: string
  name: string
  email: string
  mailing_address: string
  bio: string
}

export interface ExportRating {
  submission_id: string
  score: number | null
  notes: string
  recused: boolean
}

export interface ExportMember {
  name: string
  email: string
  role: string
  active: boolean
  created_at: string
}

export interface ScoreSummary {
  /** Mean of the non-recused scores, or null when nobody has scored yet. */
  average: number | null
  /** How many readers cast a usable score. */
  cast: number
  /** How many stood aside because they know the author. */
  recused: number
}

export const SUBMISSION_HEADERS = [
  'Title',
  'Author',
  'Email',
  'Genre',
  'Status',
  'Decided',
  'Hanover student',
  'Submitted',
  'Average score',
  'Scores cast',
  'Recused',
  'Mailing address',
  'Bio',
  'Submission ID',
] as const

export const RATING_HEADERS = [
  'Submission ID',
  'Title',
  'Score',
  'Recused',
  'Notes',
] as const

export const MEMBER_HEADERS = [
  'Name',
  'Email',
  'Role',
  'Active',
  'Joined',
] as const

/**
 * Recusal is the point: a reader who knows the author locks their vote, and the
 * average is over voters only. Same rule as the editor's submission page.
 */
export function summariseScores(
  ratings: readonly ExportRating[],
): ScoreSummary {
  const cast = ratings.filter((r) => !r.recused && r.score != null)
  return {
    average:
      cast.length === 0
        ? null
        : cast.reduce((sum, r) => sum + (r.score ?? 0), 0) / cast.length,
    cast: cast.length,
    recused: ratings.filter((r) => r.recused).length,
  }
}

export function submissionsCsv(
  submissions: readonly ExportSubmission[],
  authors: readonly ExportAuthor[],
  ratings: readonly ExportRating[],
): string {
  const authorBySubmission = new Map(authors.map((a) => [a.submission_id, a]))

  const ratingsBySubmission = new Map<string, ExportRating[]>()
  for (const rating of ratings) {
    const list = ratingsBySubmission.get(rating.submission_id)
    if (list) list.push(rating)
    else ratingsBySubmission.set(rating.submission_id, [rating])
  }

  const rows = submissions.map((s) => {
    const author = authorBySubmission.get(s.id)
    const scores = summariseScores(ratingsBySubmission.get(s.id) ?? [])

    return [
      s.title,
      author?.name ?? '',
      author?.email ?? '',
      s.genre,
      s.status,
      s.decided_at ?? '',
      s.hanover_student ? 'yes' : 'no',
      s.created_at,
      scores.average === null ? '' : scores.average.toFixed(1),
      scores.cast,
      scores.recused,
      author?.mailing_address ?? '',
      author?.bio ?? '',
      s.id,
    ]
  })

  return toCsv(SUBMISSION_HEADERS, rows)
}

/**
 * Reader notes, one row per rating, deliberately without a reader column. The
 * product decision is that editors see the notes but not who wrote them, and an
 * export is just another view — publishing identities here would quietly
 * reverse it.
 */
export function ratingsCsv(
  submissions: readonly Pick<ExportSubmission, 'id' | 'title'>[],
  ratings: readonly ExportRating[],
): string {
  const titleById = new Map(submissions.map((s) => [s.id, s.title]))

  const rows = ratings.map((r) => [
    r.submission_id,
    titleById.get(r.submission_id) ?? '',
    r.recused ? '' : (r.score ?? ''),
    r.recused ? 'yes' : 'no',
    r.notes,
  ])

  return toCsv(RATING_HEADERS, rows)
}

export function membersCsv(members: readonly ExportMember[]): string {
  const rows = members.map((m) => [
    m.name,
    m.email,
    m.role,
    m.active ? 'yes' : 'no',
    m.created_at,
  ])

  return toCsv(MEMBER_HEADERS, rows)
}
