export interface Genre {
  slug: string
  name: string
  blurb: string
  rules: string[]
}

export const genres: Genre[] = [
  {
    slug: 'fiction',
    name: 'Fiction',
    blurb: 'Short stories and flash fiction.',
    rules: [
      'Up to 5,000 words per piece.',
      'Submit one story per submission period.',
      'Double-space and number the pages.',
      'Include a brief cover note with the title and word count.',
    ],
  },
  {
    slug: 'poetry',
    name: 'Poetry',
    blurb: 'Poems of any length or form.',
    rules: [
      'Submit up to 5 poems in a single file.',
      'Poems may be any form: free verse, formal, or experimental.',
      'No more than 10 pages total.',
      'Please no previously published poems.',
    ],
  },
  {
    slug: 'creative-nonfiction',
    name: 'Creative Nonfiction',
    blurb: 'Essays and memoir.',
    rules: [
      'Up to 5,000 words per piece.',
      'Essays and memoir welcomed; no academic papers.',
      'Double-space and number the pages.',
      'Show, don\u2019t just tell.',
    ],
  },
  {
    slug: 'visual-arts',
    name: 'Visual Arts',
    blurb: 'Photography and other visual work.',
    rules: [
      'High-resolution images only (JPEG or PNG).',
      'At least 2000px on the longest side.',
      'You may submit up to 5 images.',
      'Include a short artist statement (200 words or fewer).',
    ],
  },
]

export function getGenre(slug: string): Genre | undefined {
  return genres.find((g) => g.slug === slug)
}