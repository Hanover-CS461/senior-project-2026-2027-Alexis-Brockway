import { describe, expect, it } from 'vitest'
import { csvFilename, escapeCell, toCsv } from './csv'

describe('escapeCell', () => {
  it('leaves ordinary text alone', () => {
    expect(escapeCell('The Last Ferry')).toBe('The Last Ferry')
    expect(escapeCell('')).toBe('')
  })

  it('renders missing values as an empty cell, never as "null"', () => {
    expect(escapeCell(null)).toBe('')
    expect(escapeCell(undefined)).toBe('')
  })

  it('quotes cells that contain a comma, a quote or a newline', () => {
    expect(escapeCell('Hello, World')).toBe('"Hello, World"')
    expect(escapeCell('She said "no"')).toBe('"She said ""no"""')
    expect(escapeCell('line one\nline two')).toBe('"line one\nline two"')
  })

  it('defuses anything a spreadsheet would run as a formula', () => {
    expect(escapeCell('=HYPERLINK("http://example.com")')).toBe(
      `"'=HYPERLINK(""http://example.com"")"`,
    )
    expect(escapeCell('+1 555 0100')).toBe("'+1 555 0100")
    expect(escapeCell('-2+3')).toBe("'-2+3")
    expect(escapeCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('keeps numbers and booleans as their text form', () => {
    expect(escapeCell(4.5)).toBe('4.5')
    expect(escapeCell(true)).toBe('true')
  })
})

describe('toCsv', () => {
  it('writes a header, the rows, CRLF line endings and a trailing newline', () => {
    const csv = toCsv(
      ['Title', 'Score'],
      [
        ['Ode to the Dishwasher', 4],
        ['Porcelain', 5],
      ],
    )

    expect(csv).toBe(
      'Title,Score\r\nOde to the Dishwasher,4\r\nPorcelain,5\r\n',
    )
  })

  it('still emits a valid file when there are no rows', () => {
    expect(toCsv(['Title'], [])).toBe('Title\r\n')
  })
})

describe('csvFilename', () => {
  it('dates the file so two exports do not collide', () => {
    expect(csvFilename('submissions', new Date('2026-11-12T15:04:05Z'))).toBe(
      'kennings-submissions-2026-11-12.csv',
    )
  })
})
