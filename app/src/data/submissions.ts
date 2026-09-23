export interface Submission {
  id: string
  title: string
  genre: string
  status: 'Received' | 'In review' | 'Shortlist'
  excerpt: string
  assignedToMe: boolean
}

export const fakeSubmissions: Submission[] = [
  {
    id: 'sub-1',
    title: 'The Last Ferry',
    genre: 'Fiction',
    status: 'In review',
    excerpt:
      'The ferry left at dusk, and with it went every plan the two of them had spent the summer building. On the far shore the town lights blinked once, twice, and then went dark for good.',
    assignedToMe: true,
  },
  {
    id: 'sub-2',
    title: 'Ode to the Dishwasher',
    genre: 'Poetry',
    status: 'Received',
    excerpt:
      'You swallow the grease of a thousand suppers / and ask for nothing but water, / a little salt, and to be left alone.',
    assignedToMe: true,
  },
  {
    id: 'sub-3',
    title: 'Field Notes from the Corn Maze',
    genre: 'Creative Nonfiction',
    status: 'In review',
    excerpt:
      'Every October my family paid five dollars to get lost on purpose. The maze was a kindness: it gave us somewhere to be wrong together without having to admit it.',
    assignedToMe: false,
  },
  {
    id: 'sub-4',
    title: 'Porcelain',
    genre: 'Poetry',
    status: 'Shortlist',
    excerpt:
      'My grandmother kept her wedding cups / in a cabinet that smelled of cedar / and never let them touch.',
    assignedToMe: false,
  },
  {
    id: 'sub-5',
    title: 'The Bridge at Night',
    genre: 'Visual Arts',
    status: 'Received',
    excerpt:
      'A series of three photographs of the suspension bridge after midnight, shot on film, focused on the cables against the sky.',
    assignedToMe: false,
  },
  {
    id: 'sub-6',
    title: 'How to Leave a Voicemail',
    genre: 'Fiction',
    status: 'In review',
    excerpt:
      'First, wait until you are sure no one will answer. That is the whole trick — the call matters only in the space where it will not be returned.',
    assignedToMe: true,
  },
]

export function getSubmission(id: string): Submission | undefined {
  return fakeSubmissions.find((s) => s.id === id)
}