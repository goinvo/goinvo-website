/**
 * check-linebreaks.ts
 *
 * Compares <br> tags inside paragraphs between Gatsby and Next.js.
 * Reports paragraphs where Gatsby has a <br> but Next.js doesn't
 * (or vice versa).
 *
 * Run after Next.js dev/start server is running on :3000, or set
 * NEXT_BASE_URL to another local server.
 *
 *   npx tsx scripts/check-linebreaks.ts                    # all vision pages
 *   npx tsx scripts/check-linebreaks.ts <slug>             # single vision page
 *   npx tsx scripts/check-linebreaks.ts --section work     # all work pages
 *   npx tsx scripts/check-linebreaks.ts --section work <slug>
 */

import puppeteer, { Browser } from 'puppeteer'

const GATSBY_BASE_URL = process.env.GATSBY_BASE_URL || 'https://www.goinvo.com'
const NEXT_BASE_URL = process.env.NEXT_BASE_URL || 'http://localhost:3000'

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

const WORK_SLUGS = [
  '3m-coderyte', 'ahrq-cds', 'all-of-us', 'care-cards',
  'commonhealth-smart-health-cards', 'fastercures-health-data-basics',
  'hgraph', 'infobionic-heart-monitoring', 'insidetracker-nutrition-science',
  'inspired-ehrs', 'ipsos-facto', 'mass-snap', 'maya-ehr',
  'mitre-flux-notes', 'mitre-shr', 'mitre-state-of-us-healthcare',
  'mount-sinai-consent', 'nih-nhlbi', 'open-humans', 'open-pro',
  'partners-insight', 'pcori', 'public-sector', 'upstream',
  'walgreens-health-guide', 'wuxi-nextcode', 'wuxi-nextcode-carrier-testing',
]

type Section = 'vision' | 'work'

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

function pageUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}${path}`
}

async function getParagraphsWithBr(browser: Browser, url: string): Promise<ParagraphWithBr[]> {
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1280, height: 1000 })
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    if (!response || !response.ok()) {
      throw new Error(`Unable to load ${url}: ${response?.status() || 'no response'}`)
    }

    return page.evaluate(() => {
      const out: { text: string; brCount: number; withMarkers: string }[] = []
      document.querySelectorAll('p, li').forEach((paragraph) => {
        const brs = paragraph.querySelectorAll('br')
        if (brs.length === 0) return
        if (paragraph.closest('header') || paragraph.closest('footer') || paragraph.closest('nav')) return

        const text = paragraph.textContent || ''
        if (/661 Mass(achusetts)? Ave|Arlington, MA|info@goinvo\.com|617-803-7043/.test(text)) return

        const cloned = paragraph.cloneNode(true) as HTMLElement
        cloned.querySelectorAll('br').forEach((br) => br.replaceWith(' [BR] '))
        const withMarkers = cloned.textContent?.trim() || ''
        out.push({
          text: withMarkers.replace(/\s*\[BR\]\s*/g, ' '),
          brCount: brs.length,
          withMarkers: withMarkers.substring(0, 200),
        })
      })
      return out
    })
  } finally {
    await page.close()
  }
}

async function checkSlug(
  browser: Browser,
  slug: string,
  section: Section
): Promise<{ slug: string; missing: ParagraphWithBr[]; extra: ParagraphWithBr[] }> {
  const gatsbyPath = SLUG_MAP[slug] || slug
  const gatsbyUrl = section === 'work'
    ? pageUrl(GATSBY_BASE_URL, `/work/${gatsbyPath}/`)
    : SLUG_MAP[slug] && /careplans|us-healthcare|from-bathroom|an-oral-history/.test(gatsbyPath)
      ? pageUrl(GATSBY_BASE_URL, `/features/${gatsbyPath}/`)
      : pageUrl(GATSBY_BASE_URL, `/vision/${gatsbyPath}/`)
  const nextUrl = pageUrl(NEXT_BASE_URL, `/${section}/${slug}`)

  const gatsby = await getParagraphsWithBr(browser, gatsbyUrl)
  const next = await getParagraphsWithBr(browser, nextUrl)

  const nextByText = new Map(next.map((paragraph) => [normalize(paragraph.text), paragraph]))
  const gatsbyByText = new Map(gatsby.map((paragraph) => [normalize(paragraph.text), paragraph]))

  const missing: ParagraphWithBr[] = []
  for (const paragraph of gatsby) {
    const key = normalize(paragraph.text)
    const nextParagraph = nextByText.get(key)
    if (!nextParagraph || nextParagraph.brCount < paragraph.brCount) {
      missing.push(paragraph)
    }
  }

  const extra: ParagraphWithBr[] = []
  for (const paragraph of next) {
    const key = normalize(paragraph.text)
    const gatsbyParagraph = gatsbyByText.get(key)
    if (!gatsbyParagraph || gatsbyParagraph.brCount < paragraph.brCount) {
      extra.push(paragraph)
    }
  }

  return { slug, missing, extra }
}

function parseTargets(args: string[]): Array<{ section: Section; slug: string }> {
  const sectionArg = args.find((arg) => arg.startsWith('--section='))?.split('=')[1] ||
    (args.includes('--section') ? args[args.indexOf('--section') + 1] : 'vision')
  const section: Section = sectionArg === 'work' ? 'work' : 'vision'
  const slugArgs = args.filter((arg, index) => {
    if (arg.startsWith('--')) return false
    return args[index - 1] !== '--section'
  })

  if (slugArgs.length === 0) {
    return (section === 'work' ? WORK_SLUGS : VISION_SLUGS).map((slug) => ({ section, slug }))
  }

  return slugArgs.map((arg) => ({
    section: arg.startsWith('/work/') ? 'work' : arg.startsWith('/vision/') ? 'vision' : section,
    slug: arg.replace(/^\/?(work|vision)\//, '').replace(/\/$/, ''),
  }))
}

async function main() {
  const targets = parseTargets(process.argv.slice(2))
  if (targets.length === 0) {
    throw new Error('Line break audit checked 0 pages.')
  }

  const browser = await puppeteer.launch({ headless: true })
  console.log(`Checking ${targets.length} page(s) for missing/extra <br> tags...\n`)

  let totalMissing = 0
  let totalExtra = 0
  try {
    for (const target of targets) {
      const result = await checkSlug(browser, target.slug, target.section)
      const label = `${target.section}/${target.slug}`
      if (result.missing.length === 0 && result.extra.length === 0) {
        console.log(`PASS ${label}`)
        continue
      }

      console.log(`\nFAIL ${label}`)
      if (result.missing.length > 0) {
        console.log(`  Missing line breaks (${result.missing.length} paragraphs):`)
        result.missing.forEach((paragraph) => {
          console.log(`    Gatsby has ${paragraph.brCount} BR: "${paragraph.withMarkers.substring(0, 120)}"`)
        })
        totalMissing += result.missing.length
      }

      if (result.extra.length > 0) {
        console.log(`  Extra line breaks (${result.extra.length} paragraphs):`)
        result.extra.forEach((paragraph) => {
          console.log(`    Next.js has ${paragraph.brCount} BR: "${paragraph.withMarkers.substring(0, 120)}"`)
        })
        totalExtra += result.extra.length
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Total: ${totalMissing} missing, ${totalExtra} extra`)
  if (totalMissing > 0 || totalExtra > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
