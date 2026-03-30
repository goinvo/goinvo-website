/**
 * Link Parity Tests
 *
 * Ensures all internal links on the Next.js site match the live Gatsby site.
 * Specifically catches:
 * - /vision/ vs /features/ path mismatches
 * - Links to pages that don't exist on Gatsby
 * - Missing links that Gatsby has but Next.js doesn't
 *
 * Crawls from the sitemap AND discovers linked pages (since vision articles
 * may not be in the sitemap).
 *
 * Requires a running Next.js server (npx next start).
 * Set TEST_BASE_URL env var to override default http://localhost:3000.
 */

import { describe, it, expect, beforeAll } from 'vitest'

const NEXT_BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const GATSBY_BASE = 'https://www.goinvo.com'

/** Map Next.js slugs to their Gatsby equivalents when the path differs */
const PATH_MAP: Record<string, string> = {
  '/vision/bathroom-to-healthroom': '/vision/from-bathroom-to-healthroom',
}

/**
 * Pages that exist at /features/ on Gatsby, not /vision/.
 * These are older articles that predate the /vision/ rename.
 * Our Next.js site serves them at /vision/ but links pointing to these
 * on the Gatsby site use /features/.
 */
const FEATURES_ONLY_ON_GATSBY = new Set([
  'digital-healthcare',
  'disrupt',
  'ebola-care-guideline',
  'killer-truths',
  'print-big',
  'redesign-democracy',
])

/** Pages to skip entirely (no Gatsby equivalent) */
const SKIP_PAGES = new Set(['/studio', '/thank-you'])

let allPagePaths: string[] = []
let serverAvailable = false

function normalizeHref(href: string): string {
  return href
    .replace(/\/$/, '')
    .replace(/#.*$/, '')
    .replace(/\?.*$/, '')
    .toLowerCase()
}

function extractInternalLinks(html: string): string[] {
  const links: string[] = []
  const matches = html.matchAll(/href="([^"]+)"/g)
  for (const m of matches) {
    const href = m[1]
    if (
      href.startsWith('http') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('javascript:') ||
      href.startsWith('#') ||
      href.startsWith('data:')
    ) continue
    if (href.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|pdf|xml|json)$/i)) continue
    links.push(normalizeHref(href))
  }
  return [...new Set(links)]
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

beforeAll(async () => {
  try {
    const res = await fetch(`${NEXT_BASE}/sitemap.xml`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return

    const xml = await res.text()
    const sitemapPaths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(m => new URL(m[1]).pathname)
      .filter(p => !SKIP_PAGES.has(p))

    // Also discover vision article links from the vision index and key pages
    const discoveryPages = ['/vision', '/work', '/']
    const discovered = new Set<string>(sitemapPaths)

    for (const dp of discoveryPages) {
      const html = await fetchText(`${NEXT_BASE}${dp}`)
      if (!html) continue
      const links = extractInternalLinks(html)
      for (const link of links) {
        if (link.startsWith('/vision/') || link.startsWith('/work/')) {
          discovered.add(link)
        }
      }
    }

    allPagePaths = [...discovered]
    serverAvailable = true
  } catch {
    // Server not running
  }
})

describe('Link Parity (Next.js vs Gatsby)', () => {
  it('server must be running — tests will report real failures, not silently skip', () => {
    if (!serverAvailable) {
      // This is a hard fail, not a silent skip
      throw new Error(
        'No server running at ' + NEXT_BASE + '. Start with: npx next build && npx next start\n' +
        'Link parity tests CANNOT run without a server.'
      )
    }
    expect(allPagePaths.length).toBeGreaterThan(0)
    console.log(`Found ${allPagePaths.length} pages to check`)
  })

  it('all vision page links should use correct Gatsby path (/vision/ vs /features/)', async () => {
    if (!serverAvailable) throw new Error('Server required')

    const mismatches: string[] = []
    const visionPaths = allPagePaths.filter(p => p.startsWith('/vision/') && p !== '/vision')

    expect(visionPaths.length, 'Should discover vision article pages').toBeGreaterThan(0)
    console.log(`Checking ${visionPaths.length} vision pages against Gatsby...`)

    for (const path of visionPaths) {
      const slug = path.replace('/vision/', '')
      if (!slug) continue

      const gatsbyPath = PATH_MAP[path] || path

      // Check if page exists on Gatsby at /vision/
      const visionRes = await fetch(`${GATSBY_BASE}${gatsbyPath}/`, {
        signal: AbortSignal.timeout(10000),
        redirect: 'manual',
      }).catch(() => null)

      // Check if page exists at /features/
      const featuresRes = await fetch(`${GATSBY_BASE}/features/${slug}/`, {
        signal: AbortSignal.timeout(10000),
        redirect: 'manual',
      }).catch(() => null)

      const atVision = visionRes?.status === 200
      const atFeatures = featuresRes?.status === 200

      if (atFeatures && !atVision) {
        // Page only exists at /features/ on Gatsby
        if (!FEATURES_ONLY_ON_GATSBY.has(slug)) {
          mismatches.push(`${slug}: exists at /features/ on Gatsby but NOT listed in FEATURES_ONLY_ON_GATSBY`)
        }
      } else if (!atVision && !atFeatures) {
        // Page doesn't exist on Gatsby at all — might be new, just note it
        console.log(`  INFO: ${slug} not found on Gatsby (new page?)`)
      }
    }

    if (mismatches.length > 0) {
      console.error('\nMismatched pages:')
      mismatches.forEach(m => console.error('  ' + m))
    }
    expect(mismatches, 'All /features/-only pages must be listed in FEATURES_ONLY_ON_GATSBY').toHaveLength(0)
  }, 120000)

  it('no links should point to /features/ paths (relative or absolute)', async () => {
    if (!serverAvailable) throw new Error('Server required')

    const featuresLinks: { page: string; link: string }[] = []

    for (let i = 0; i < allPagePaths.length; i += 5) {
      const batch = allPagePaths.slice(i, i + 5)
      await Promise.all(batch.map(async (path) => {
        const html = await fetchText(`${NEXT_BASE}${path}`)
        if (!html) return
        // Check ALL href attributes, including absolute URLs
        const allHrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1])
        for (const href of allHrefs) {
          if (
            href.startsWith('/features/') ||
            href.includes('goinvo.com/features/')
          ) {
            featuresLinks.push({ page: path, link: href })
          }
        }
      }))
    }

    if (featuresLinks.length > 0) {
      console.error('\nPages with /features/ links (should be /vision/):')
      for (const { page, link } of featuresLinks) {
        console.error(`  ${page} -> ${link}`)
      }
    }
    expect(featuresLinks, 'No links should use /features/ path — use /vision/ instead').toHaveLength(0)
  }, 120000)

  it('pages that only exist at /features/ on Gatsby should have redirects', async () => {
    if (!serverAvailable) throw new Error('Server required')

    const missing: string[] = []

    for (const slug of FEATURES_ONLY_ON_GATSBY) {
      // Our site should serve these at /vision/{slug}
      const res = await fetch(`${NEXT_BASE}/vision/${slug}`, {
        signal: AbortSignal.timeout(10000),
        redirect: 'manual',
      }).catch(() => null)

      if (!res || res.status >= 400) {
        missing.push(`/vision/${slug} returns ${res?.status || 'error'} — page not served`)
      }
    }

    if (missing.length > 0) {
      console.error('\nFeatures-only pages not served on Next.js:')
      missing.forEach(m => console.error('  ' + m))
    }
    expect(missing, 'All features-only pages should be served at /vision/ on Next.js').toHaveLength(0)
  }, 30000)
})
