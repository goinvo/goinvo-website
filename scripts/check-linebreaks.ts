/**
 * check-linebreaks.ts
 *
 * Compares <br> tags inside paragraphs between Gatsby and Next.js
 * for all vision pages. Reports paragraphs where Gatsby has a <br>
 * but Next.js doesn't (or vice versa).
 *
 * Run after Next.js dev/start server is running on :3000.
 *
 *   npx tsx scripts/check-linebreaks.ts                    # all pages
 *   npx tsx scripts/check-linebreaks.ts <slug>             # single page
 */

import puppeteer, { Browser } from 'puppeteer'

const SLUG_MAP: Record<string, string | null> = {
  'understanding-zika': 'zika',
  'understanding-ebola': 'ebola',
  'oral-history-goinvo': 'an-oral-history',
  'healing-us-healthcare': 'us-healthcare',
  'bathroom-to-healthroom': 'from-bathroom-to-healthroom',
  'care-plans': 'careplans',
}

const VISION_SLUGS = [
  'augmented-clinical-decision-support',
  'coronavirus',
  'digital-health-trends-2022',
  'eligibility-engine',
  'faces-in-health-communication',
  'fraud-waste-abuse-in-healthcare',
  'health-design-thinking',
  'healthcare-ai',
  'healthcare-dollars',
  'history-of-health-design',
  'human-centered-design-for-ai',
  'living-health-lab',
  'loneliness-in-our-human-code',
  'national-cancer-navigation',
  'open-pro',
  'open-source-healthcare',
  'own-your-health-data',
  'patient-centered-consent',
  'physician-burnout',
  'precision-autism',
  'public-healthroom',
  'test-treat-trace',
  'vapepocolypse',
  'virtual-care',
  'virtual-diabetes-care',
  'visual-storytelling-with-genai',
  'who-uses-my-health-data',
]

function normalize(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/[\u00a0]/g, ' ')
    .trim()
}

interface ParagraphWithBr {
  text: string
  brCount: number
  withMarkers: string
}

async function getParagraphsWithBr(browser: Browser, url: string): Promise<ParagraphWithBr[] | null> {
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1280, height: 1000 })
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    if (!response || !response.ok()) {
      await page.close()
      return null
    }
    const result = await page.evaluate(() => {
      const out: { text: string; brCount: number; withMarkers: string }[] = []
      document.querySelectorAll('p, li').forEach((p) => {
        const brs = p.querySelectorAll('br')
        if (brs.length === 0) return
        // Skip inside header/footer/nav
        if (p.closest('header') || p.closest('footer') || p.closest('nav')) return
        // Skip address/contact info typical for footers
        const text = p.textContent || ''
        if (/661 Mass(achusetts)? Ave|Arlington, MA|info@goinvo\.com|617-803-7043/.test(text)) return
        const cloned = p.cloneNode(true) as HTMLElement
        cloned.querySelectorAll('br').forEach((br) => br.replaceWith(' [BR] '))
        out.push({
          text: p.textContent?.trim() || '',
          brCount: brs.length,
          withMarkers: cloned.textContent?.trim().substring(0, 200) || '',
        })
      })
      return out
    })
    await page.close()
    return result
  } catch {
    await page.close()
    return null
  }
}

async function checkSlug(browser: Browser, slug: string): Promise<{ slug: string; missing: ParagraphWithBr[]; extra: ParagraphWithBr[] }> {
  const gatsbyPath = SLUG_MAP[slug] || slug
  const gatsbyUrl = SLUG_MAP[slug] && /careplans|us-healthcare|from-bathroom|an-oral-history/.test(gatsbyPath)
    ? `https://www.goinvo.com/features/${gatsbyPath}/`
    : `https://www.goinvo.com/vision/${gatsbyPath}/`
  const nextUrl = `http://localhost:3000/vision/${slug}`

  const gatsby = await getParagraphsWithBr(browser, gatsbyUrl)
  const next = await getParagraphsWithBr(browser, nextUrl)

  if (!gatsby || !next) return { slug, missing: [], extra: [] }

  // Match by normalized text content (without BR markers)
  const nextByText = new Map(next.map((p) => [normalize(p.text), p]))
  const gatsbyByText = new Map(gatsby.map((p) => [normalize(p.text), p]))

  const missing: ParagraphWithBr[] = []
  for (const g of gatsby) {
    const key = normalize(g.text)
    const n = nextByText.get(key)
    if (!n || n.brCount < g.brCount) {
      // Check if the text exists at all on Next.js
      missing.push(g)
    }
  }

  const extra: ParagraphWithBr[] = []
  for (const n of next) {
    const key = normalize(n.text)
    const g = gatsbyByText.get(key)
    if (!g || g.brCount < n.brCount) {
      extra.push(n)
    }
  }

  return { slug, missing, extra }
}

async function main() {
  const args = process.argv.slice(2)
  const single = args[0] && !args[0].startsWith('--') ? args[0] : null
  const slugs = single ? [single] : VISION_SLUGS

  const browser = await puppeteer.launch({ headless: true })
  console.log(`Checking ${slugs.length} pages for missing/extra <br> tags...\n`)

  let totalMissing = 0
  let totalExtra = 0
  for (const slug of slugs) {
    const result = await checkSlug(browser, slug)
    if (result.missing.length === 0 && result.extra.length === 0) {
      console.log(`✓ ${slug}`)
      continue
    }
    console.log(`\n✗ ${slug}`)
    if (result.missing.length > 0) {
      console.log(`  Missing line breaks (${result.missing.length} paragraphs):`)
      result.missing.forEach((p) => console.log(`    Gatsby has ${p.brCount} BR: "${p.withMarkers.substring(0, 120)}"`))
      totalMissing += result.missing.length
    }
    if (result.extra.length > 0) {
      console.log(`  Extra line breaks (${result.extra.length} paragraphs):`)
      result.extra.forEach((p) => console.log(`    Next.js has ${p.brCount} BR: "${p.withMarkers.substring(0, 120)}"`))
      totalExtra += result.extra.length
    }
  }

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`Total: ${totalMissing} missing, ${totalExtra} extra`)
  await browser.close()
  if (totalMissing > 0 || totalExtra > 0) process.exit(1)
}

main()
