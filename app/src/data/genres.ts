export interface Genre {
  slug: string
  name: string
  blurb: string
  rules: string[]
  fileTypes: string
  fileHint: string
}

export const generalRequirements: string[] = [
  'We accept work from Hanover College students, alumni, staff, and faculty, plus other creative contributors.',
  'Prose, poetry, and art are accepted from August 1 to February 8.',
  'Blind review: do NOT include your name in the file. Include the title of your piece in the file and in the form.',
  'You may submit up to five pieces, each to a different category.',
  'Simultaneous submissions are acceptable if you tell us promptly of acceptance elsewhere.',
  'No AI-generated work. Nothing racist, homophobic, transphobic, xenophobic, or otherwise exclusionary. No overly graphic or sexual content.',
  'Work that does not follow the guidelines will be deleted unread.',
]

export const genres: Genre[] = [
  {
    slug: 'fiction',
    name: 'Fiction',
    blurb: 'Satiric stories, tragic tales, and everything between.',
    rules: [
      'One or more prose works, 500–3,000 words (or up to 10 pages).',
      'Use an easy-to-read font and double-space the text.',
      'Submit as a Word file and do not include your name in the document.',
    ],
    fileTypes: '.doc,.docx',
    fileHint: 'Word file (.doc or .docx)',
  },
  {
    slug: 'poetry',
    name: 'Poetry',
    blurb: 'Promising poems of any length or form.',
    rules: [
      'Submit 1–3 poems in the same document.',
      'Use an easy-to-read font and double-spaced text.',
      'Submit as a Word file, or a PDF if the poem is format-sensitive.',
      'No chapbook submissions; each poem is considered individually.',
      'Do not include your name in the document.',
    ],
    fileTypes: '.doc,.docx,.pdf',
    fileHint: 'Word file (.doc/.docx) or PDF',
  },
  {
    slug: 'creative-nonfiction',
    name: 'Creative Nonfiction',
    blurb: 'Nihilistic nonfiction, essays, and memoir.',
    rules: [
      'One or more prose works, 500–3,000 words (or up to 10 pages).',
      'Use an easy-to-read font and double-spaced text.',
      'Submit as a Word file and do not include your name in the document.',
    ],
    fileTypes: '.doc,.docx',
    fileHint: 'Word file (.doc or .docx)',
  },
  {
    slug: 'visual-arts',
    name: 'Photography & Visual Art',
    blurb: 'Picturesque photos and amazing artwork.',
    rules: [
      'Submit 1–5 works.',
      'High-resolution JPG files (300–600 dpi).',
      'Name each JPG file with the title of the work.',
    ],
    fileTypes: '.jpg,.jpeg',
    fileHint: 'High-resolution JPG (300–600 dpi)',
  },
]

export function getGenre(slug: string): Genre | undefined {
  return genres.find((g) => g.slug === slug)
}