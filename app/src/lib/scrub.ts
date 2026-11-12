// Stripping author identity out of a manuscript before it is uploaded.
//
// Blind review is enforced in the database, but a file is a second door into the
// same room: Word writes the author's name into `docProps/core.xml`, a camera
// writes the model and sometimes GPS into EXIF, a PDF carries `/Author` in its
// info dictionary. None of that shows up in the form, and all of it survives
// into the bucket where a reader can download it.
//
// The scrubbing runs in the browser, at intake, before the upload leaves the
// page. That is a deliberate trade (§13 of AGENTS.md): an Edge Function is
// stricter, but it needs a deployed function and a service key, and the browser
// version is what can actually ship. The adversary here is a careless author
// whose word processor filled in their name — not someone deliberately sneaking
// identity past the app. Making carelessness harmless is the whole job, and the
// formats the app cannot help with are named out loud rather than ignored.
//
// What each path does:
//   images  — decode and re-encode through a canvas, which drops EXIF, IPTC,
//             XMP and PNG text chunks by construction.
//   .docx   — unzip, blank the creator/last-modified-by/company fields, re-zip.
//   .pdf    — clear the info dictionary with pdf-lib (loaded on demand, so a
//             poetry submission pays for it and a Word submission does not).
//   .doc    — legacy binary format; cannot be scrubbed here. Allowed, warned.

import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

export type ScrubStrategy = 'image' | 'docx' | 'pdf' | 'legacy-doc' | 'unknown'

export interface ScrubResult {
  file: File
  strategy: ScrubStrategy
  /** True when the bytes were rewritten. */
  changed: boolean
  /** Field names that were cleared, for tests and the UI. */
  cleared: string[]
  /** Set when the format cannot be scrubbed; the author sees this. */
  warning?: string
}

/** The fields Word fills in without being asked. */
const DOCX_CORE_FIELDS = [
  'dc:creator',
  'cp:lastModifiedBy',
  'dc:title',
  'dc:subject',
  'cp:keywords',
  'dc:description',
  'cp:category',
  'cp:contentStatus',
] as const

const DOCX_APP_FIELDS = ['Company', 'Manager'] as const

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const LEGACY_DOC_WARNING =
  'This older .doc format can’t be scrubbed of author metadata. Save it as .docx and upload that if you can.'

/**
 * A warning to show as soon as the file is chosen, rather than after the
 * submission is already in. Returns null for formats the app can handle.
 */
export function formatWarning(filename: string): string | null {
  return scrubStrategy(filename) === 'legacy-doc' ? LEGACY_DOC_WARNING : null
}

export function scrubStrategy(filename: string): ScrubStrategy {
  const extension = filename.toLowerCase().split('.').pop() ?? ''

  if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
    return 'image'
  }
  if (extension === 'docx') return 'docx'
  if (extension === 'pdf') return 'pdf'
  if (extension === 'doc') return 'legacy-doc'
  return 'unknown'
}

/**
 * Replace `<tag>anything</tag>` and `<tag/>` with `<tag/>`, keeping the
 * surrounding XML valid. Attributes are dropped with the value: `xml:lang` on a
 * title is no loss, and the point is that nothing of the original survives.
 */
function blankElements(
  xml: string,
  tags: readonly string[],
): { xml: string; cleared: string[] } {
  let next = xml
  const cleared: string[] = []

  for (const tag of tags) {
    const before = next
    const withContent = new RegExp(`<${tag}(\\s[^>]*)?>[\\s\\S]*?</${tag}>`, 'g')
    const selfClosing = new RegExp(`<${tag}(\\s[^>]*)?/>`, 'g')
    next = next.replace(withContent, `<${tag}/>`).replace(selfClosing, `<${tag}/>`)
    if (next !== before) cleared.push(tag)
  }

  return { xml: next, cleared }
}

export function scrubDocxBytes(bytes: Uint8Array): {
  bytes: Uint8Array
  cleared: string[]
} {
  const entries = unzipSync(bytes)
  const cleared: string[] = []

  const core = entries['docProps/core.xml']
  if (core) {
    const result = blankElements(strFromU8(core), DOCX_CORE_FIELDS)
    if (result.cleared.length > 0) {
      entries['docProps/core.xml'] = strToU8(result.xml)
      cleared.push(...result.cleared)
    }
  }

  const app = entries['docProps/app.xml']
  if (app) {
    const result = blankElements(strFromU8(app), DOCX_APP_FIELDS)
    if (result.cleared.length > 0) {
      entries['docProps/app.xml'] = strToU8(result.xml)
      cleared.push(...result.cleared)
    }
  }

  return { bytes: zipSync(entries), cleared }
}

export async function scrubPdfBytes(bytes: Uint8Array): Promise<{
  bytes: Uint8Array
  cleared: string[]
}> {
  // Loaded on demand: pdf-lib is far larger than the rest of the app, and only
  // PDF submitters need it.
  const { PDFDocument } = await import('pdf-lib')
  const document = await PDFDocument.load(bytes, { updateMetadata: false })

  document.setTitle('')
  document.setAuthor('')
  document.setSubject('')
  document.setKeywords([])
  document.setCreator('')
  document.setProducer('')

  return {
    bytes: await document.save(),
    cleared: ['title', 'author', 'subject', 'keywords', 'creator', 'producer'],
  }
}

/**
 * The name the file is stored under inside the bucket. Deliberately NOT the
 * author's filename: `manuscript_path` is a column on `submissions`, and readers
 * can read that table — so `Alexis_Brockway_draft3.docx` would hand them exactly
 * the identity the whole design exists to withhold. The extension is kept
 * because the browser needs it to open the file.
 */
export function storageNameFor(file: File): string {
  const extension = (file.name.toLowerCase().split('.').pop() ?? '').trim()
  const safe = /^[a-z0-9]{1,5}$/.test(extension) ? `.${extension}` : ''
  return `manuscript${safe}`
}

/**
 * TypeScript types every Uint8Array as possibly backed by a SharedArrayBuffer,
 * which `Blob`/`File` refuse. Copying into a fresh view gives an owned buffer,
 * which is also what we want here: the caller's bytes stay untouched.
 */
function ownedBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That image could not be read.'))
    image.src = url
  })
}

async function scrubImageBlob(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not prepare the image.')

    context.drawImage(image, 0, 0)

    // Keep the format; a PNG re-encoded as PNG still has no text chunks, and a
    // JPEG at 0.95 is visually identical at reading size.
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, 0.95)
    })

    if (!blob) throw new Error('This browser could not re-encode the image.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * The one entry point the form calls. Rewrites the bytes when it can, returns the
 * file untouched (with a warning) when the format is beyond help, and throws a
 * readable error when a format it *should* handle fails — because silently
 * uploading a file whose metadata we could not read is the one outcome that
 * breaks the promise.
 */
export async function scrubFile(file: File): Promise<ScrubResult> {
  const strategy = scrubStrategy(file.name)

  if (strategy === 'legacy-doc') {
    return {
      file,
      strategy,
      changed: false,
      cleared: [],
      warning: LEGACY_DOC_WARNING,
    }
  }

  if (strategy === 'unknown') {
    return { file, strategy, changed: false, cleared: [] }
  }

  try {
    if (strategy === 'image') {
      const blob = await scrubImageBlob(file)
      return {
        file: new File([blob], file.name, { type: blob.type }),
        strategy,
        changed: true,
        cleared: ['EXIF and other embedded image metadata'],
      }
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    if (strategy === 'docx') {
      const result = scrubDocxBytes(bytes)
      return {
        file: new File([ownedBytes(result.bytes)], file.name, { type: DOCX_MIME }),
        strategy,
        changed: result.cleared.length > 0,
        cleared: result.cleared,
      }
    }

    const result = await scrubPdfBytes(bytes)
    return {
      file: new File([ownedBytes(result.bytes)], file.name, {
        type: 'application/pdf',
      }),
      strategy,
      changed: true,
      cleared: result.cleared,
    }
  } catch {
    throw new Error(
      `We couldn’t clean the author metadata out of “${file.name}”. If it is password-protected or damaged, save a fresh copy and upload that.`,
    )
  }
}
