import { expect, test } from '@playwright/test'

// The one scrubbing path a unit test cannot reach: re-encoding an image through
// a canvas needs a real browser. This runs in Chromium against the dev server,
// imports the app's own module, and never touches the database.
//
// The marker is a JPEG COM segment rather than a hand-built EXIF block: a
// malformed APP1 makes some decoders refuse the file, which would test the
// decoder instead of the scrubber. A comment is the same class of payload —
// bytes the author never typed, carried alongside the pixels — and only a
// re-encode removes it, which is exactly the mechanism under test.

test('an image loses its embedded metadata before it is uploaded', async ({
  page,
}) => {
  await page.goto('/')

  const result = await page.evaluate(async () => {
    // In dev, Vite serves the source module, so the page can use the real
    // scrubber without going through the form (and without creating a row).
    const scrub = (await import(
      /* @vite-ignore */ '/src/lib/scrub.ts'
    )) as typeof import('../src/lib/scrub')

    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    const context = canvas.getContext('2d')!
    context.fillStyle = '#159957'
    context.fillRect(0, 0, 8, 8)

    const jpeg = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
    })
    const original = new Uint8Array(await jpeg.arrayBuffer())

    // Graft a COM segment carrying the "author name" straight after SOI.
    const secret = 'SECRET AUTHOR NAME'
    const payload = new TextEncoder().encode(secret)
    const segment = new Uint8Array(4 + payload.length)
    segment[0] = 0xff
    segment[1] = 0xfe
    segment[2] = ((payload.length + 2) >> 8) & 0xff
    segment[3] = (payload.length + 2) & 0xff
    segment.set(payload, 4)

    const tagged = new Uint8Array(original.length + segment.length)
    tagged.set(original.subarray(0, 2), 0)
    tagged.set(segment, 2)
    tagged.set(original.subarray(2), 2 + segment.length)

    const file = new File([tagged], 'Alexis_Brockway_scan.jpg', {
      type: 'image/jpeg',
    })
    const before = new TextDecoder('latin1').decode(tagged).includes(secret)

    const scrubbed = await scrub.scrubFile(file)
    const after = new Uint8Array(await scrubbed.file.arrayBuffer())
    const afterText = new TextDecoder('latin1').decode(after)

    // The scrubbed bytes must still be a decodable image at the same size.
    const url = URL.createObjectURL(new Blob([after], { type: 'image/jpeg' }))
    const width = await new Promise<number>((resolve) => {
      const image = new Image()
      image.onload = () => resolve(image.naturalWidth)
      image.onerror = () => resolve(-1)
      image.src = url
    })
    URL.revokeObjectURL(url)

    return {
      before,
      afterHasSecret: afterText.includes(secret),
      changed: scrubbed.changed,
      width,
      storageName: scrub.storageNameFor(file),
    }
  })

  expect(result.before, 'the fixture really carried the marker').toBe(true)
  expect(result.changed).toBe(true)
  expect(result.afterHasSecret, 'the marker is gone from the bytes').toBe(false)
  expect(result.width, 'still a readable 8px image').toBe(8)
  expect(result.storageName, 'the author filename never reaches the bucket').toBe(
    'manuscript.jpg',
  )
})
