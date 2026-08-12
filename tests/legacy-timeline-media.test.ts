/**
 * Studio-timeline media guard
 *
 * /about/studio-timeline embeds a KnightLab TimelineJS widget whose slides come
 * from a Google Sheet, so the image URLs it loads are NOT in this repo and no
 * amount of grepping the source will surface them. They point at
 * `www.goinvo.com/old/images/...`, a path the 2018 -> Next migration dropped:
 * 55 photos rendered as broken images on a live page for months.
 *
 * The files are recovered into `public/images/...` and `redirects.json` maps the
 * legacy `/old/` prefix onto them. This test pins both halves of that invariant
 * against the URL list the sheet actually references
 * (tests/fixtures/legacy-timeline-media.txt), because the failure mode is
 * invisible: nothing in the codebase links to these files, so a cleanup that
 * deletes them as "unreferenced" breaks the page with no other signal.
 */

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import redirects from '../redirects.json'

const OLD_PREFIX_REDIRECT = 'old/images/:path*'

const mediaUrls = readFileSync(
  fileURLToPath(new URL('./fixtures/legacy-timeline-media.txt', import.meta.url)),
  'utf8',
)
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))

/** `.../old/images/history/foo.jpg` -> `images/history/foo.jpg` */
const toPublicPath = (url: string) =>
  url
    .replace(/^https?:\/\/[^/]+/, '')
    .split('?')[0]
    .replace(/^\/old\//, '')
    .replace(/^\//, '')

describe('studio timeline media', () => {
  it('pins the full set of URLs the embed loads from our host', () => {
    expect(mediaUrls.length).toBe(55)
  })

  it('redirects the legacy /old/images prefix onto the canonical /images path', () => {
    expect(
      (redirects as Record<string, string>)[OLD_PREFIX_REDIRECT],
      'Without this wildcard every timeline photo 404s — the sheet URLs all carry the /old/ prefix',
    ).toBe('/images/:path*')
  })

  it('has a real file behind every URL the timeline requests', () => {
    const missing = mediaUrls.filter(
      (url) => !existsSync(fileURLToPath(new URL(`../public/${toPublicPath(url)}`, import.meta.url))),
    )
    expect(
      missing,
      `These timeline images have no file in public/ and will render broken:\n${missing.join('\n')}\n` +
        'Recover them with: node scripts/recover-old-assets.mjs --list tests/fixtures/legacy-timeline-media.txt --apply',
    ).toEqual([])
  })
})
