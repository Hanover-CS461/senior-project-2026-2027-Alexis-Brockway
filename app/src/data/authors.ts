export interface Author {
  id: string
  name: string
  email: string
  bio: string
  mailingAddress?: string
}

export const fakeAuthors: Record<string, Author> = {
  'sub-1': {
    id: 'sub-1',
    name: 'Margaret Okafor',
    email: 'margaret.okafor@example.com',
    bio: 'Margaret writes short fiction about rivers, border towns, and the things families do not say. She is a junior studying English.',
    mailingAddress: 'PO Box 118, Hanover, IN 47243',
  },
  'sub-2': {
    id: 'sub-2',
    name: 'David Reyes',
    email: 'david.reyes@example.com',
    bio: 'David is a poet and occasional dishwasher. His work has appeared in two high-school zines and one fraternity newsletter.',
  },
  'sub-3': {
    id: 'sub-3',
    name: 'Priya Natarajan',
    email: 'priya.natarajan@example.com',
    bio: 'Priya writes creative nonfiction about growing up in Ohio, corn mazes, and being lost on purpose. First-time submitter.',
    mailingAddress: '2215 Arbor Way, Appleton, OH 44889',
  },
  'sub-4': {
    id: 'sub-4',
    name: 'Amelia Chen',
    email: 'amelia.chen@example.com',
    bio: 'Amelia is a senior studying Studio Art. Porcelain is her first published poem, if you count this.',
  },
  'sub-5': {
    id: 'sub-5',
    name: 'Jonas Weber',
    email: 'jonas.weber@example.com',
    bio: 'Jonas photographs bridges, grain elevators, and whatever else holds still long enough. Based in Madison, Indiana.',
    mailingAddress: '902 River Rd, Madison, IN 47250',
  },
  'sub-6': {
    id: 'sub-6',
    name: 'Sienna Brooks',
    email: 'sienna.brooks@example.com',
    bio: 'Sienna writes experiments in second person. How to Leave a Voicemail is one of four completed this winter.',
  },
}

export function getAuthor(submissionId: string): Author | undefined {
  return fakeAuthors[submissionId]
}