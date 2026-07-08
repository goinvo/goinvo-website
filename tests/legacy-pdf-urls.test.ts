/**
 * Legacy PDF URL guard
 *
 * The Care Plans whitepaper and the Understanding Zika guide are reachable at
 * their original public URLs (`/images/features/.../X.pdf`). Those files were
 * consolidated OUT of `public/old/` and now serve directly from their canonical
 * `/images/...` location; a reverse redirect keeps the legacy `/old/...` URL
 * working (the previous routing used a 308 *permanent* redirect to `/old/...`,
 * which browsers and search engines may have cached as the destination).
 *
 * This test pins that invariant statically (no server needed) so that moving or
 * renaming a PDF without fixing its routing fails CI instead of silently 404ing
 * a live link. The empirical HTTP proof is the curl / page-visual-audit run
 * against prod documented in the PR — this guard catches the config/file drift
 * that would cause those checks to fail.
 */

import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import redirects from '../redirects.json'

// Mirror next.config.ts: keys without a leading slash are prefixed with one.
const redirectMap = new Map<string, string>(
  Object.entries(redirects).map(([source, dest]) => [
    source.startsWith('/') ? source : `/${source}`,
    dest as string,
  ]),
)

const publicFile = (urlPath: string) =>
  fileURLToPath(new URL(`../public${urlPath}`, import.meta.url))

/**
 * The canonical, public-facing PDF URLs that must keep resolving, paired with
 * the legacy `/old/` URL that a 308-permanent redirect may have cached.
 */
const LEGACY_PDFS = [
  {
    name: 'Care Plans whitepaper',
    canonicalUrl: '/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf',
    oldUrl: '/old/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf',
  },
  {
    name: 'Understanding Zika guide',
    canonicalUrl: '/images/features/zika/understanding_zika.pdf',
    oldUrl: '/old/images/features/zika/understanding_zika.pdf',
  },
]

describe('legacy PDF URLs keep resolving', () => {
  for (const pdf of LEGACY_PDFS) {
    describe(pdf.name, () => {
      it('serves the canonical /images URL directly from a real file', () => {
        // No redirect may intercept the canonical URL — it must serve the static file.
        expect(
          redirectMap.has(pdf.canonicalUrl),
          `${pdf.canonicalUrl} must NOT have a redirect entry — it should serve the file directly`,
        ).toBe(false)
        expect(
          existsSync(publicFile(pdf.canonicalUrl)),
          `Missing file for ${pdf.canonicalUrl} — the canonical URL would 404`,
        ).toBe(true)
      })

      it('still answers the cached /old URL via a reverse redirect to the canonical URL', () => {
        expect(
          redirectMap.get(pdf.oldUrl),
          `${pdf.oldUrl} must redirect to ${pdf.canonicalUrl} so 308-cached links keep working`,
        ).toBe(pdf.canonicalUrl)
      })
    })
  }

  it('no longer routes any URL into /old/ (PDFs consolidated out of the archive)', () => {
    const intoOld = [...redirectMap.entries()].filter(([, dest]) => dest.startsWith('/old/'))
    expect(
      intoOld,
      `These redirects still point into /old/, but /old/ has been consolidated away: ${intoOld
        .map(([from]) => from)
        .join(', ')}`,
    ).toHaveLength(0)
  })

  it('does not leave the consolidated PDFs behind in public/old/', () => {
    for (const pdf of LEGACY_PDFS) {
      expect(
        existsSync(publicFile(pdf.oldUrl)),
        `${pdf.oldUrl} should have been moved out of /old/, but the file is still there`,
      ).toBe(false)
    }
  })
})
