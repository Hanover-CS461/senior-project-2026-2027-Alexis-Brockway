export const MEMBER_ROLES = [
  'Reader',
  'Staff Editor',
  'Editor',
  'Co-Editor',
  'Chief Editor',
  'Advisor',
] as const

export type MemberRole = (typeof MEMBER_ROLES)[number]

export interface Member {
  id: string
  name: string
  email: string
  role: MemberRole
  active: boolean
}

export const fakeMembers: Member[] = [
  {
    id: 'mem-1',
    name: 'Alexis Brockway',
    email: 'alexis@example.com',
    role: 'Chief Editor',
    active: true,
  },
  {
    id: 'mem-2',
    name: 'Jordan Whitfield',
    email: 'jordan@example.com',
    role: 'Co-Editor',
    active: true,
  },
  {
    id: 'mem-3',
    name: 'Morgan Ellison',
    email: 'morgan@example.com',
    role: 'Co-Editor',
    active: true,
  },
  {
    id: 'mem-4',
    name: 'Dr. Simone Hart',
    email: 'simone.hart@example.edu',
    role: 'Advisor',
    active: true,
  },
  {
    id: 'mem-5',
    name: 'Taylor Kim',
    email: 'taylor@example.com',
    role: 'Staff Editor',
    active: true,
  },
  {
    id: 'mem-6',
    name: 'Reese Alvarez',
    email: 'reese@example.com',
    role: 'Editor',
    active: true,
  },
  {
    id: 'mem-7',
    name: 'Cameron Diaz-Lee',
    email: 'cameron@example.com',
    role: 'Reader',
    active: true,
  },
  {
    id: 'mem-8',
    name: 'Quinn Patel',
    email: 'quinn@example.com',
    role: 'Reader',
    active: true,
  },
  {
    id: 'mem-9',
    name: 'Sam Okafor',
    email: 'sam@example.com',
    role: 'Reader',
    active: true,
  },
  {
    id: 'mem-10',
    name: 'Riley Nakamura',
    email: 'riley@example.com',
    role: 'Reader',
    active: false,
  },
]