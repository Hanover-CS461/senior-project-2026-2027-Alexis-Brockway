export interface Rating {
  memberId: string
  memberName: string
  score: number
}

export interface Recusal {
  memberId: string
  memberName: string
}

export const ratingsBySubmission: Record<string, Rating[]> = {
  'sub-1': [
    { memberId: 'mem-5', memberName: 'Taylor Kim', score: 4 },
    { memberId: 'mem-6', memberName: 'Reese Alvarez', score: 5 },
    { memberId: 'mem-7', memberName: 'Cameron Diaz-Lee', score: 4 },
  ],
  'sub-2': [
    { memberId: 'mem-5', memberName: 'Taylor Kim', score: 3 },
    { memberId: 'mem-8', memberName: 'Quinn Patel', score: 2 },
  ],
  'sub-3': [
    { memberId: 'mem-6', memberName: 'Reese Alvarez', score: 4 },
    { memberId: 'mem-9', memberName: 'Sam Okafor', score: 3 },
    { memberId: 'mem-7', memberName: 'Cameron Diaz-Lee', score: 5 },
  ],
  'sub-4': [
    { memberId: 'mem-8', memberName: 'Quinn Patel', score: 5 },
    { memberId: 'mem-9', memberName: 'Sam Okafor', score: 4 },
    { memberId: 'mem-5', memberName: 'Taylor Kim', score: 5 },
  ],
  'sub-5': [
    { memberId: 'mem-7', memberName: 'Cameron Diaz-Lee', score: 3 },
    { memberId: 'mem-8', memberName: 'Quinn Patel', score: 3 },
  ],
  'sub-6': [
    { memberId: 'mem-6', memberName: 'Reese Alvarez', score: 4 },
    { memberId: 'mem-9', memberName: 'Sam Okafor', score: 4 },
  ],
}

export const recusalsBySubmission: Record<string, Recusal[]> = {
  'sub-1': [{ memberId: 'mem-8', memberName: 'Quinn Patel' }],
  'sub-3': [{ memberId: 'mem-5', memberName: 'Taylor Kim' }],
  'sub-5': [{ memberId: 'mem-9', memberName: 'Sam Okafor' }],
}

export function getRatings(submissionId: string): Rating[] {
  return ratingsBySubmission[submissionId] ?? []
}

export function getRecusals(submissionId: string): Recusal[] {
  return recusalsBySubmission[submissionId] ?? []
}

export function getAverageRating(submissionId: string): number | null {
  const ratings = getRatings(submissionId)
  if (ratings.length === 0) return null
  const total = ratings.reduce((sum, r) => sum + r.score, 0)
  return Math.round((total / ratings.length) * 10) / 10
}