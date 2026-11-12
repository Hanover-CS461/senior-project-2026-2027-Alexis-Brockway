import { describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import {
  formatWarning,
  scrubDocxBytes,
  scrubFile,
  scrubPdfBytes,
  scrubStrategy,
  storageNameFor,
} from './scrub'

const CORE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>A Story About Rivers</dc:title>
  <dc:creator>Alexis Brockway</dc:creator>
  <cp:lastModifiedBy>Alexis Brockway</cp:lastModifiedBy>
  <cp:revision>3</cp:revision>
</cp:coreProperties>`

const APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Word</Application>
  <Company>Hanover College</Company>
  <Manager>Alexis Brockway</Manager>
</Properties>`

function docx(parts: Record<string, string>): Uint8Array {
  const entries: Record<string, Uint8Array> = {}
  for (const [path, xml] of Object.entries(parts)) entries[path] = strToU8(xml)
  return zipSync(entries)
}

function fileFrom(bytes: Uint8Array, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('scrubStrategy', () => {
  it('picks the right treatment from the extension', () => {
    expect(scrubStrategy('story.docx')).toBe('docx')
    expect(scrubStrategy('story.DOCX')).toBe('docx')
    expect(scrubStrategy('poem.pdf')).toBe('pdf')
    expect(scrubStrategy('scan.JPG')).toBe('image')
    expect(scrubStrategy('scan.jpeg')).toBe('image')
    expect(scrubStrategy('art.png')).toBe('image')
    expect(scrubStrategy('old.doc')).toBe('legacy-doc')
    expect(scrubStrategy('notes.txt')).toBe('unknown')
    expect(scrubStrategy('noextension')).toBe('unknown')
  })
})

describe('formatWarning', () => {
  it('warns only for the format it cannot scrub', () => {
    expect(formatWarning('old.doc')).toMatch(/can’t be scrubbed/)
    expect(formatWarning('story.docx')).toBeNull()
    expect(formatWarning('poem.pdf')).toBeNull()
    expect(formatWarning('art.png')).toBeNull()
  })
})

describe('storageNameFor', () => {
  it('does not carry the author filename into the bucket path', () => {
    const file = new File([new Uint8Array(1)], 'Alexis_Brockway_draft3.docx')
    expect(storageNameFor(file)).toBe('manuscript.docx')
  })

  it('keeps a usable extension and refuses a strange one', () => {
    expect(storageNameFor(new File([], 'poem.PDF'))).toBe('manuscript.pdf')
    expect(storageNameFor(new File([], 'art.jpeg'))).toBe('manuscript.jpeg')
    expect(storageNameFor(new File([], 'notes.weird-ext'))).toBe('manuscript')
    expect(storageNameFor(new File([], 'noextension'))).toBe('manuscript')
  })
})

describe('scrubDocxBytes', () => {
  it('blanks the author, title and company, and keeps everything else', () => {
    const input = docx({
      'docProps/core.xml': CORE_XML,
      'docProps/app.xml': APP_XML,
      'word/document.xml': '<w:document>Once upon a time</w:document>',
    })

    const { bytes, cleared } = scrubDocxBytes(input)
    const entries = unzipSync(bytes)
    const core = strFromU8(entries['docProps/core.xml'])
    const app = strFromU8(entries['docProps/app.xml'])

    expect(core).not.toContain('Alexis Brockway')
    expect(app).not.toContain('Alexis Brockway')
    expect(app).not.toContain('Hanover College')
    expect(core).toContain('<dc:creator/>')
    expect(core).toContain('<dc:title/>')

    // Not identity, so left alone.
    expect(core).toContain('<cp:revision>3</cp:revision>')
    expect(app).toContain('<Application>Microsoft Office Word</Application>')

    // The manuscript itself is untouched — this is a scrub, not a rewrite.
    expect(strFromU8(entries['word/document.xml'])).toContain('Once upon a time')

    expect(cleared).toContain('dc:creator')
    expect(cleared).toContain('Company')
  })

  it('is a no-op for a docx that carries no docProps', () => {
    const input = docx({ 'word/document.xml': '<w:document>hi</w:document>' })
    const { cleared } = scrubDocxBytes(input)

    expect(cleared).toEqual([])
  })
})

describe('scrubPdfBytes', () => {
  // pdf-lib is a large module graph and importing it through Vite's transform
  // pipeline takes ~25s on a WSL-mounted /mnt/c drive (seconds on a native
  // filesystem). The scrub itself is a few milliseconds — this timeout is about
  // module loading, not work.
  it(
    'removes the author and title from the file, not just the API view',
    async () => {
      const { PDFDocument } = await import('pdf-lib')
      const original = await PDFDocument.create()
      original.setAuthor('Alexis Brockway')
      original.setTitle('A Story About Rivers')
      original.setSubject('Workshop draft')
      original.addPage()
      const input = await original.save()

      const { bytes, cleared } = await scrubPdfBytes(input)

      // The bytes themselves must not carry the name — an API-level check could
      // pass while the string sat in the file.
      const raw = Buffer.from(bytes).toString('latin1')
      expect(raw).not.toContain('Alexis Brockway')
      expect(raw).not.toContain('A Story About Rivers')

      const reloaded = await PDFDocument.load(bytes)
      expect(reloaded.getAuthor() ?? '').toBe('')
      expect(reloaded.getTitle() ?? '').toBe('')
      expect(cleared).toContain('author')
    },
    120_000,
  )
})

describe('scrubFile', () => {
  it('lets a .doc through with a warning instead of pretending it is clean', async () => {
    const file = fileFrom(strToU8('binary'), 'old.doc', 'application/msword')
    const result = await scrubFile(file)

    expect(result.changed).toBe(false)
    expect(result.strategy).toBe('legacy-doc')
    expect(result.warning).toMatch(/can’t be scrubbed/)
    expect(result.file).toBe(file)
  })

  it('leaves an unrecognised file alone without a warning', async () => {
    const file = fileFrom(strToU8('hello'), 'notes.txt', 'text/plain')
    const result = await scrubFile(file)

    expect(result.changed).toBe(false)
    expect(result.warning).toBeUndefined()
  })

  it('returns a scrubbed .docx under the same filename', async () => {
    const file = fileFrom(
      docx({ 'docProps/core.xml': CORE_XML }),
      'story.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )

    const result = await scrubFile(file)
    const entries = unzipSync(new Uint8Array(await result.file.arrayBuffer()))

    expect(result.changed).toBe(true)
    expect(result.file.name).toBe('story.docx')
    expect(strFromU8(entries['docProps/core.xml'])).not.toContain('Alexis Brockway')
  })

  it('refuses to hand back an unscrubbed file when the format fails to parse', async () => {
    const file = fileFrom(strToU8('not really a zip'), 'broken.docx', '')

    await expect(scrubFile(file)).rejects.toThrow(/couldn’t clean the author metadata/)
  })
})
