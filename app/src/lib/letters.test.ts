import { describe, expect, it } from 'vitest'
import {
  LETTER_KINDS,
  isLetterKind,
  letterFor,
  type LetterKind,
} from '../../supabase/functions/send-letters/templates'

const facts = {
  title: 'Among Us',
  genre: 'Poetry',
  name: 'Jordan Alvarez',
}

/** Everything a letter must never carry out of the building. */
const FORBIDDEN = [
  'score',
  'recus',
  'average',
  'voted',
  '/5',
  'note:',
  'Jordan', // the greeting uses a first name, but never repeats it elsewhere
  '{{',
  'undefined',
  'null',
]

describe('the three letters', () => {
  it('writes one letter per kind, and nothing for Hold', () => {
    expect([...LETTER_KINDS].sort()).toEqual(['accepted', 'received', 'rejected'])
    expect(isLetterKind('hold')).toBe(false)
    expect(isLetterKind('accepted')).toBe(true)
  })

  it('names the piece in the subject', () => {
    for (const kind of LETTER_KINDS) {
      expect(letterFor(kind, facts).subject).toContain('Among Us')
    }
  })

  it('greets the writer by first name and signs as the journal', () => {
    for (const kind of LETTER_KINDS) {
      const text = letterFor(kind, facts).text
      expect(text.startsWith('Dear Jordan,')).toBe(true)
      expect(text).toContain('Kennings Literary Journal')
      // Signed by the journal, never by an individual editor (proposal §65).
      expect(text).not.toContain('Sincerely,')
    }
  })

  it('falls back to a plain greeting when there is no name', () => {
    expect(letterFor('received', { ...facts, name: '' }).text).toMatch(
      /^Hello,/,
    )
  })

  it('says the decision in plain words', () => {
    expect(letterFor('accepted', facts).text).toContain('has been')
    expect(letterFor('accepted', facts).text).toContain('accepted for Kennings')
    expect(letterFor('rejected', facts).text).toContain('not able to place it')
    expect(letterFor('received', facts).text).toContain('read blind')
  })

  it('refuses a kind it has no template for', () => {
    // A wrong letter is worse than a failed send, so this throws rather than
    // inventing a subject line.
    expect(() => letterFor('hold' as LetterKind, facts)).toThrow(/No letter/)
  })
})

describe('blind review survives the letter', () => {
  it('carries no reader, score or recusal', () => {
    // The template functions take a title, a genre and a name — there is no
    // argument a score could be passed through. This asserts the words too,
    // because the next edit to the prose is the real risk.
    for (const kind of LETTER_KINDS) {
      const letter = letterFor(kind, facts)
      const haystack = `${letter.subject}\n${letter.text}`.toLowerCase()
      for (const word of FORBIDDEN) {
        // The greeting is "Dear Jordan," — so the name is allowed exactly once.
        if (word === 'Jordan') {
          expect(haystack.split('jordan').length - 1).toBe(1)
          continue
        }
        expect(haystack).not.toContain(word.toLowerCase())
      }
    }
  })

  it('is plain text, so there is nothing to escape', () => {
    for (const kind of LETTER_KINDS) {
      const text = letterFor(kind, facts).text
      expect(text).not.toMatch(/<[a-z/]/i)
    }
  })
})
