// Turning rows into a CSV file, kept pure so it can be tested without a
// browser (the download itself lives in download.ts).
//
// Two rules matter beyond "put commas between things":
//
//   1. RFC 4180 quoting. A title like "Hello, World" or a note with a line
//      break must survive a round-trip through a spreadsheet, which means
//      wrapping the cell in quotes and doubling any quote inside it.
//
//   2. Formula injection. A submission titled "=HYPERLINK("http://…"&A1)"
//      is data, not a spreadsheet command — but Excel and Sheets will happily
//      execute it on open. A leading apostrophe is the spreadsheet convention
//      for "this is literal text", and it is the difference between exporting
//      a hostile title and running it.

export type CsvCell = string | number | boolean | null | undefined

/** Characters a spreadsheet treats as the start of a formula. */
const FORMULA_LEADERS = ['=', '+', '-', '@', '\t', '\r']

export function escapeCell(value: CsvCell): string {
  if (value === null || value === undefined) return ''

  let text = String(value)

  if (text.length > 0 && FORMULA_LEADERS.includes(text[0])) {
    text = `'${text}`
  }

  if (/[",\n\r]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`
  }

  return text
}

/**
 * A complete CSV document: header row, then one line per row. Uses CRLF and a
 * trailing newline, which is what Excel expects and what other tools tolerate.
 */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvCell[])[],
): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) lines.push(row.map(escapeCell).join(','))
  return `${lines.join('\r\n')}\r\n`
}

/**
 * `kennings-submissions-2026-11-12.csv` — a dated name so two exports a week
 * apart don't fight over the same file.
 */
export function csvFilename(prefix: string, date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10)
  return `kennings-${prefix}-${day}.csv`
}
