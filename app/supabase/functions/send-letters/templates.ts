// The letter text. One copy, used by the `send-letters` Edge Function and by
// `src/lib/letters.test.ts`, so the wording a test checks is the wording a
// writer receives.
//
// Dependency-free on purpose: this file is bundled into a Deno Edge Function
// and imported by Vitest, and it must be plain TypeScript in both places.
//
// ---------------------------------------------------------------------------
// Two rules the shape of these functions enforces, rather than a comment:
//
// 1. A letter is built from a title, a genre, and a name. Nothing else is
//    passed in, so reader names, scores, recusal flags and notes *cannot*
//    reach a writer — there is no argument to put them in. Blind review is
//    a database property, and this keeps it a property of the letter too.
//
// 2. The signature is the journal, never a person (proposal line 65). A
//    writer is told what Kennings decided, not which editor decided it.
// ---------------------------------------------------------------------------

export type LetterKind = 'received' | 'accepted' | 'rejected'

export interface LetterFacts {
  /** The piece's title, as the writer typed it. */
  title: string
  /** The genre name from `src/data/genres.ts`, e.g. "Poetry". */
  genre: string
  /** The writer's name, used only to greet them. */
  name: string
}

export interface Letter {
  subject: string
  /** Plain text. Never HTML: there is nothing to escape and nothing to inject. */
  text: string
}

const SIGNATURE = 'The Kennings editors\nKennings Literary Journal'

/** Curly quotes around a title, the way the journal sets it. */
function quoted(title: string): string {
  return `“${title}”`
}

function greeting(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first ? `Dear ${first},` : 'Hello,'
}

const BUILDERS: Record<LetterKind, (f: LetterFacts) => Letter> = {
  received: (f) => ({
    subject: `We received ${quoted(f.title)} — Kennings`,
    text: [
      greeting(f.name),
      '',
      `Thank you for sending ${quoted(f.title)} to Kennings. It reached us`,
      `on the ${f.genre} table and is now with our editors.`,
      '',
      'Every piece is read blind: the readers who see your work do not see',
      'your name, and we ask that the manuscript itself carry no identifying',
      'details. You do not need to do anything else.',
      '',
      'We read submissions as they arrive and write to every writer with a',
      'decision. You will hear from us at this address.',
      '',
      SIGNATURE,
    ].join('\n'),
  }),

  accepted: (f) => ({
    subject: `Kennings would like to publish ${quoted(f.title)}`,
    text: [
      greeting(f.name),
      '',
      `We are delighted to tell you that ${quoted(f.title)} has been`,
      'accepted for Kennings.',
      '',
      'An editor will write to you shortly about edits, proofs, and when the',
      'issue will appear. Please keep this address reachable, and reply to',
      'this message if anything about your submission has changed.',
      '',
      'Thank you for trusting us with your work.',
      '',
      SIGNATURE,
    ].join('\n'),
  }),

  rejected: (f) => ({
    subject: `About ${quoted(f.title)} — Kennings`,
    text: [
      greeting(f.name),
      '',
      `Thank you for sending ${quoted(f.title)} to Kennings. We read it with`,
      'care, and we are sorry to say that we are not able to place it in this',
      'issue.',
      '',
      'This is a decision about one piece and one issue, not about your',
      'writing. We would be glad to see new work from you in a future reading',
      'period.',
      '',
      'Thank you for thinking of Kennings.',
      '',
      SIGNATURE,
    ].join('\n'),
  }),
}

/** Every kind a letter can be. `hold` is absent, and the database agrees. */
export const LETTER_KINDS: readonly LetterKind[] = [
  'received',
  'accepted',
  'rejected',
]

export function isLetterKind(value: string): value is LetterKind {
  return (LETTER_KINDS as readonly string[]).includes(value)
}

/**
 * Build one letter. Throws on an unknown kind rather than inventing a
 * subject line — a wrong letter to a writer is worse than a failed send.
 */
export function letterFor(kind: LetterKind, facts: LetterFacts): Letter {
  const build = BUILDERS[kind]
  if (!build) throw new Error(`No letter template for kind "${kind}"`)
  return build(facts)
}
