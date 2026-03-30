/**
 * Page Render Tests
 *
 * Validates that all pages in the sitemap:
 * - Return HTTP 200
 * - Have no broken media (images, videos returning 404)
 * - Have proper page structure (title, main content)
 * - Have no console errors from broken block rendering
 *
 * Requires a running Next.js server (npx next start).
 * Set BASE_URL env var to override default http://localhost:3000.
 */

import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

let sitemapUrls: string[] = []
let serverAvailable = false

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const xml = await res.text()
      sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map(m => m[1].replace('https://www.goinvo.com', BASE_URL))
      serverAvailable = true
    }
  } catch {
    // Server not running — tests will be skipped
  }
})

describe('Page Rendering', () => {
  it('should have a running server with sitemap', () => {
    if (!serverAvailable) {
      console.warn('⚠️  No server running at ' + BASE_URL + ' — page render tests skipped. Start with: npx next start')
      return
    }
    expect(sitemapUrls.length).toBeGreaterThan(10)
  })

  it('should return 200 for all sitemap pages', async () => {
    if (!serverAvailable) return

    const failures: string[] = []
    for (const url of sitemapUrls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (!res.ok) {
          failures.push(`${res.status} ${url.replace(BASE_URL, '')}`)
        }
      } catch (e) {
        failures.push(`ERR ${url.replace(BASE_URL, '')}: ${(e as Error).message.slice(0, 40)}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('should have no broken CloudFront image URLs on any page', async () => {
    if (!serverAvailable) return

    const contentUrls = sitemapUrls.filter(u => u.includes('/vision/') || u.includes('/work/'))
    const failures: string[] = []

    for (const pageUrl of contentUrls) {
      try {
        const res = await fetch(pageUrl, { signal: AbortSignal.timeout(10000) })
        const html = await res.text()
        const main = html.match(/<main[^>]*>([\s\S]*)<\/main>/i)
        const content = main ? main[1] : html

        // Find CloudFront image URLs (not proxied through next/image)
        const cfImages = [...content.matchAll(/src="(https:\/\/dd17w[^"]+)"/gi)]
        for (const [, src] of cfImages) {
          try {
            const imgRes = await fetch(src, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
            if (!imgRes.ok) {
              failures.push(`${imgRes.status} ${pageUrl.replace(BASE_URL, '')} -> ${src.slice(-60)}`)
            }
          } catch {
            failures.push(`ERR ${pageUrl.replace(BASE_URL, '')} -> ${src.slice(-60)}`)
          }
        }
      } catch {
        // Page fetch failed — covered by the 200 test
      }
    }
    expect(failures).toEqual([])
  })

  it('should have no broken video source URLs', async () => {
    if (!serverAvailable) return

    const contentUrls = sitemapUrls.filter(u => u.includes('/vision/') || u.includes('/work/'))
    const failures: string[] = []

    for (const pageUrl of contentUrls) {
      try {
        const res = await fetch(pageUrl, { signal: AbortSignal.timeout(10000) })
        const html = await res.text()
        const main = html.match(/<main[^>]*>([\s\S]*)<\/main>/i)
        const content = main ? main[1] : html

        const videoSrcs = [...content.matchAll(/<(?:video|source)[^>]*src="(https?:\/\/[^"]+)"/gi)]
        for (const [, src] of videoSrcs) {
          try {
            const vidRes = await fetch(src, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
            if (!vidRes.ok) {
              failures.push(`${vidRes.status} ${pageUrl.replace(BASE_URL, '')} -> ${src.slice(-60)}`)
            }
          } catch {
            failures.push(`ERR ${pageUrl.replace(BASE_URL, '')} -> ${src.slice(-60)}`)
          }
        }
      } catch {
        // covered by 200 test
      }
    }
    expect(failures).toEqual([])
  })

  it('should have no pages with missing <title> tag', async () => {
    if (!serverAvailable) return

    const failures: string[] = []
    for (const url of sitemapUrls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
        const html = await res.text()
        const title = html.match(/<title>([^<]+)<\/title>/)
        if (!title || title[1].trim().length < 3) {
          failures.push(`${url.replace(BASE_URL, '')}: missing or empty <title>`)
        }
      } catch {
        // covered by 200 test
      }
    }
    expect(failures).toEqual([])
  })

  it('should have no pages rendering unknown Portable Text block warnings', async () => {
    if (!serverAvailable) return

    const contentUrls = sitemapUrls.filter(u => u.includes('/vision/') || u.includes('/work/'))
    const failures: string[] = []

    for (const pageUrl of contentUrls) {
      try {
        const res = await fetch(pageUrl, { signal: AbortSignal.timeout(10000) })
        const html = await res.text()

        // Check for Portable Text unknown block type warnings rendered in HTML
        if (html.includes('Unknown block type') || html.includes('Unknown block style')) {
          failures.push(`${pageUrl.replace(BASE_URL, '')}: unknown Portable Text block`)
        }
      } catch {
        // covered by 200 test
      }
    }
    expect(failures).toEqual([])
  })
})
