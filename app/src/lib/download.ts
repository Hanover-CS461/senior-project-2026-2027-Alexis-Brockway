// Saving a string as a file, in the browser and nowhere else.
//
// Kept apart from csv.ts so the CSV logic stays testable in the Node test
// environment, where `document` and `Blob`'s download dance don't exist.

/**
 * Download `text` as a file. The byte-order mark is deliberate: without it,
 * Excel on Windows reads a UTF-8 CSV as ANSI and turns "José" into "JosÃ©".
 */
export function downloadTextFile(
  filename: string,
  text: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob(['\ufeff', text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Revoke on the next tick: Safari reads the href after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
