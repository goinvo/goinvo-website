import { cloudfrontImage } from '@/lib/utils'

/**
 * Posters served from this repo rather than the CDN.
 *
 * The CDN copies are print plates: design-axiom-make-things is 304.8 MB, which
 * on a phone is a failed download rather than a slow one. `public/pdf/...` holds
 * flattened 3-4 MB rebuilds (scripts/compress-poster-pdfs.py, verified per-pixel
 * against the originals). The CDN origin is not writable from this repo, so the
 * only way to hand a visitor the smaller file is to link ours.
 *
 * tests/poster-downloads.test.ts keeps this list honest about what is on disk.
 */
export const LOCALLY_HOSTED_PDFS = [
  '/pdf/vision/posters/design-axiom-make-things.pdf',
  '/pdf/vision/posters/care-card-healthcare-is-a-human-right.pdf',
  '/pdf/vision/posters/care-card-sugar-kills-2.pdf',
]

/**
 * Turn a stored download link into the URL to actually serve.
 *
 * Lives here, not in the page, so it can be tested without booting the Sanity
 * client: getting this wrong is invisible (the link still renders and still
 * downloads) and costs the visitor 300 MB.
 */
export function resolveDownloadUrl(link: string): string {
  if (!link) return ''

  // A download can be stored as a path, a goinvo.com URL, or an already-built
  // CDN URL; all three have to be recognised or the oversized copy wins.
  let path = link
  if (link.startsWith('http')) {
    try {
      path = new URL(link).pathname
    } catch {
      path = link
    }
  }
  if (LOCALLY_HOSTED_PDFS.includes(path)) return path

  const goinvoPdf = link.match(/^https?:\/\/(?:www\.)?goinvo\.com(\/pdf\/.+)$/)
  if (goinvoPdf) return cloudfrontImage(goinvoPdf[1])
  return link.startsWith('http') ? link : cloudfrontImage(link)
}
