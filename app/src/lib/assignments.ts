import { MEMBER_STAFF_SLUGS } from '../data/members'

/**
 * Pure helpers for handing a manuscript to a reader (issue #6).
 *
 * The editor page fetches three flat lists — assignments, active members, the
 * ratings for this submission — and these functions turn them into the panel.
 * Kept out of the component for the same reason `csv.ts` is: "who is still
 * outstanding" is a rule, and a rule deserves a test that does not need a
 * database. Nothing here decides permission; RLS does that.
 */

export interface AssignmentRow {
  id: string
  submission_id: string
  reader_id: string
}

export interface AssignableReader {
  user_id: string
  name: string
  /** Genre teams, from `members.staffs`. Missing is treated as none. */
  staffs?: string[] | null
}

export interface AssignmentRating {
  reader_id: string
  score: number | null
  recused: boolean
}

export type AssigneeState = 'scored' | 'recused' | 'reading'

/** Where one assignee stands: scored, recused, or still owing a read. */
export function assigneeState(
  rating: AssignmentRating | undefined,
): AssigneeState {
  if (!rating) return 'reading'
  if (rating.recused) return 'recused'
  if (rating.score != null) return 'scored'
  return 'reading'
}

/**
 * The badge text for an assignee.
 *
 * "Recused" is worded as a problem to solve, not a verdict: a reader who knows
 * the author has done the right thing, and the editor's next act is to give the
 * piece to somebody else.
 */
export function assigneeLabel(
  state: AssigneeState,
  score: number | null,
): string {
  if (state === 'recused') return 'Recused — needs reassignment'
  if (state === 'scored') return `Scored ${score ?? '—'} / 5`
  return 'Not read yet'
}

export interface Assignee {
  reader_id: string
  name: string
  staffs: string[]
  state: AssigneeState
  score: number | null
}

/** Join the assignments to names and to ratings, in name order. */
export function assigneesFor(
  assignments: readonly { reader_id: string }[],
  readers: readonly AssignableReader[],
  ratings: readonly AssignmentRating[],
): Assignee[] {
  const byId = new Map(readers.map((r) => [r.user_id, r]))
  const ratingByReader = new Map(ratings.map((r) => [r.reader_id, r]))

  return assignments
    .map((assignment) => {
      const reader = byId.get(assignment.reader_id)
      const rating = ratingByReader.get(assignment.reader_id)
      return {
        reader_id: assignment.reader_id,
        name: reader?.name || 'Unknown reader',
        staffs: reader?.staffs ?? [],
        state: assigneeState(rating),
        score: rating?.score ?? null,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Active readers who do not already have this submission. */
export function unassignedReaders(
  readers: readonly AssignableReader[],
  assignments: readonly { reader_id: string }[],
): AssignableReader[] {
  const taken = new Set(assignments.map((a) => a.reader_id))
  return readers.filter((r) => !taken.has(r.user_id))
}

/** Everyone on one genre staff, in name order. */
export function readersOnStaff(
  readers: readonly AssignableReader[],
  slug: string,
): AssignableReader[] {
  return readers
    .filter((r) => (r.staffs ?? []).includes(slug))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Who a staff-wide assign would actually add: on that staff, not yet holding
 * this submission. The app filters first and the unique constraint is the
 * backstop, so the count shown on the button is the number of rows inserted.
 */
export function staffTargets(
  readers: readonly AssignableReader[],
  assignments: readonly { reader_id: string }[],
  slug: string,
): AssignableReader[] {
  return unassignedReaders(readersOnStaff(readers, slug), assignments)
}

/** Staffs that have at least one unassigned reader, in genre order. */
export function staffsWithTargets(
  readers: readonly AssignableReader[],
  assignments: readonly { reader_id: string }[],
): { slug: string; count: number }[] {
  return MEMBER_STAFF_SLUGS.map((slug) => ({
    slug,
    count: staffTargets(readers, assignments, slug).length,
  })).filter((s) => s.count > 0)
}

/**
 * The reader's own queue, split so assigned work is shown first.
 *
 * `rest` excludes the assigned pieces rather than repeating them, and both
 * lists exclude anything already scored — an assignment disappears from "to
 * read" the moment it has a score, which is the only "done" signal the schema
 * needs.
 */
export function splitReaderQueue<T extends { id: string }>(
  items: readonly T[],
  assignedIds: ReadonlySet<string>,
  scoredIds: ReadonlySet<string>,
): { assigned: T[]; rest: T[] } {
  const todo = items.filter((i) => !scoredIds.has(i.id))
  return {
    assigned: todo.filter((i) => assignedIds.has(i.id)),
    rest: todo.filter((i) => !assignedIds.has(i.id)),
  }
}
