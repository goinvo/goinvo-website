/**
 * Poster download size guard
 *
 * Three free poster downloads shipped as print plates — design-axiom-make-things
 * was 304.8 MB, which is a failed download on a phone, not a slow one. They are
 * now flattened rebuilds served from public/ (scripts/compress-poster-pdfs.py),
 * because the CDN origin that holds the originals is not writable from here.
 *
 * The failure mode this guards is quiet: a path typo in LOCALLY_HOSTED_PDFS
 * silently falls through to the CDN and hands the visitor the 304 MB file again,
 * with the page still rendering a perfectly ordinary download link.
 */

import { describe, it, expect } from 'vitest'
import { statSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { LOCALLY_HOSTED_PDFS } from '../src/lib/shop/posterDownloads'

// Generous next to the 3-4 MB rebuilds, and far under anything that reads as
// broken on a phone.
const MAX_MEGABYTES = 12

const publicFile = (urlPath: string) =>
  fileURLToPath(new URL(`../public${urlPath}`, import.meta.url))

describe('locally hosted poster downloads', () => {
  it('lists at least the three posters that were too big to download', () => {
    expect(LOCALLY_HOSTED_PDFS.length).toBeGreaterThanOrEqual(3)
  })

  for (const pdfPath of LOCALLY_HOSTED_PDFS) {
    describe(pdfPath, () => {
      it('has a real file in public/', () => {
        expect(
          existsSync(publicFile(pdfPath)),
          `${pdfPath} is listed as locally hosted but no file exists — the link would 404`,
        ).toBe(true)
      })

      it(`is under ${MAX_MEGABYTES} MB`, () => {
        const megabytes = statSync(publicFile(pdfPath)).size / 1024 / 1024
        expect(
          megabytes,
          `${pdfPath} is ${megabytes.toFixed(1)} MB. Re-run scripts/compress-poster-pdfs.py rather than shipping it.`,
        ).toBeLessThan(MAX_MEGABYTES)
      })
    })
  }
})
