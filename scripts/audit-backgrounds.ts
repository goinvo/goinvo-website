/**
 * Background Audit
 *
 * Compares shared section background treatments between Gatsby and Next.js.
 * Focuses on common article anchors where global CSS or shared template
 * changes can introduce regressions:
 * - Author section background
 * - Contributor section background
 * - Newsletter / subscribe card + band backgrounds
 * - Contact form card + band backgrounds
 * - References section background
 *
 * Usage:
 *   npx tsx scripts/audit-backgrounds.ts
 *   npx tsx scripts/audit-backgrounds.ts --slugs eligibility-engine,who-uses-my-health-data
 *   npx tsx scripts/audit-backgrounds.ts --next-base https://goinvo-website-next.vercel.app
 *   npx tsx scripts/audit-backgrounds.ts --json
 *
 * Defaults:
 *   Gatsby base: https://www.goinvo.com
 *   Next base:   http://localhost:3000
 *
 * Output:
 *   - Human-readable summary to stdout
 *   - JSON report written to .audit/background-audit.json
 */

import puppeteer, { type Browser, type Page } from 'puppeteer'
import { mkdirSync, writeFileSync } from 'fs'

type SectionKey =
  | 'authors'
  | 'contributors'
  | 'newsletterCard'
  | 'newsletterBand'
  | 'contactFormCard'
  | 'contactFormBand'
  | 'references'
type Tone = 'none' | 'white' | 'gray' | 'other'
type Coverage = 'none' | 'contained' | 'full-bleed'

interface BackgroundEntry {
  tag: string
  className: string
  backgroundColor: string
  width: number
  height: number
}

interface BackgroundDescriptor {
  tone: Tone
  coverage: Coverage
  color: string
  width: number
  height: number
}

interface PageSnapshot {
  slug: string
  path: string
  url: string
  authors: {
    anchorFound: boolean
    chain: BackgroundEntry[]
    descriptor: BackgroundDescriptor
  }
  contributors: {
    anchorFound: boolean
    chain: BackgroundEntry[]
    descriptor: BackgroundDescriptor
  }
  newsletter: {
    anchorFound: boolean
    chain: BackgroundEntry[]
    card: BackgroundDescriptor
    band: BackgroundDescriptor
  }
  contactForm: {
    anchorFound: boolean
    chain: BackgroundEntry[]
    card: BackgroundDescriptor
    band: BackgroundDescriptor
  }
  references: {
    anchorFound: boolean
    chain: BackgroundEntry[]
    descriptor: BackgroundDescriptor
  }
}

interface SectionDiff {
  section: SectionKey
  expected: BackgroundDescriptor
  actual: BackgroundDescriptor
  expectedFound: boolean
  actualFound: boolean
}

interface AuditResult {
  slug: string
  gatsbyPath: string
  gatsbyUrl: string
  nextUrl: string
  mismatches: SectionDiff[]
  gatsby: PageSnapshot
  next: PageSnapshot
}

interface PageDef {
  slug: string
  gatsbySlug: string
}

const GATSBY_BASE_DEFAULT = 'https://www.goinvo.com'
const NEXT_BASE_DEFAULT = 'http://localhost:3000'
const REPORT_PATH = '.audit/background-audit.json'
const VIEWPORT = { width: 1600, height: 1200 }
const WIDTH_TOLERANCE = 24

const SLUG_MAP: Record<string, string | null> = {
  'ai-design-certification': null,
  'augmented-clinical-decision-support': null,
  'bathroom-to-healthroom': 'from-bathroom-to-healthroom',
  'care-plans': 'careplans',
  'coronavirus': null,
  'determinants-of-health': null,
  'digital-health-trends-2022': null,
  'digital-healthcare': null,
  'disrupt': null,
  'ebola-care-guideline': null,
  'eligibility-engine': null,
  'experiments': null,
  'faces-in-health-communication': null,
  'fraud-waste-abuse-in-healthcare': null,
  'healing-us-healthcare': 'us-healthcare',
  'health-design-thinking': null,
  'health-visualizations': null,
  'healthcare-ai': null,
  'healthcare-dollars': null,
  'healthcare-dollars-redux': null,
  'history-of-health-design': null,
  'human-centered-design-for-ai': null,
  'killer-truths': null,
  'living-health-lab': null,
  'loneliness-in-our-human-code': null,
  'national-cancer-navigation': null,
  'open-pro': null,
  'open-source-healthcare': null,
  'oral-history-goinvo': 'an-oral-history',
  'own-your-health-data': null,
  'patient-centered-consent': null,
  'physician-burnout': null,
  'precision-autism': null,
  'primary-self-care-algorithms': null,
  'print-big': null,
  'public-healthroom': null,
  'redesign-democracy': null,
  'rethinking-ai-beyond-chat': null,
  'test-treat-trace': null,
  'understanding-ebola': 'ebola',
  'understanding-zika': 'zika',
  'us-healthcare-problems': null,
  'vapepocolypse': null,
  'virtual-care': null,
  'virtual-diabetes-care': null,
  'visual-storytelling-with-genai': null,
  'who-uses-my-health-data': null,
}

const PAGES: PageDef[] = Object.entries(SLUG_MAP).map(([slug, mapped]) => ({
  slug,
  gatsbySlug: mapped || slug,
}))

function getArgValue(args: string[], flag: string): string | null {
  const inline = args.find(arg => arg.startsWith(`${flag}=`))
  if (inline) return inline.substring(flag.length + 1)

  const index = args.indexOf(flag)
  if (index >= 0 && index < args.length - 1) return args[index + 1]
  return null
}

function normalizeColor(value: string): string {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return value.trim().toLowerCase()
  const [, r, g, b] = match
  return `rgb(${Number(r)}, ${Number(g)}, ${Number(b)})`
}

function classifyTone(color: string): Tone {
  const normalized = normalizeColor(color)
  if (!normalized || normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)') return 'none'
  if (normalized === 'rgb(255, 255, 255)') return 'white'
  if (
    normalized === 'rgb(246, 246, 246)' ||
    normalized === 'rgb(250, 250, 250)' ||
    normalized === 'rgb(245, 245, 245)' ||
    normalized === 'rgb(247, 247, 247)'
  ) {
    return 'gray'
  }
  return 'other'
}

function makeDescriptor(entry: BackgroundEntry | null): BackgroundDescriptor {
  if (!entry) {
    return {
      tone: 'none',
      coverage: 'none',
      color: 'none',
      width: 0,
      height: 0,
    }
  }

  return {
    tone: classifyTone(entry.backgroundColor),
    coverage: entry.width >= VIEWPORT.width * 0.9 ? 'full-bleed' : 'contained',
    color: normalizeColor(entry.backgroundColor),
    width: entry.width,
    height: entry.height,
  }
}

function descriptorsMatch(expected: BackgroundDescriptor, actual: BackgroundDescriptor): boolean {
  if (expected.tone !== actual.tone) return false
  if (expected.coverage !== actual.coverage) return false
  if (expected.tone === 'other' && expected.color !== actual.color) return false
  if (expected.coverage !== 'none' && Math.abs(expected.width - actual.width) > WIDTH_TOLERANCE) return false
  return true
}

async function ensureNextBaseReachable(nextBase: string): Promise<void> {
  try {
    const response = await fetch(nextBase)
    if (!response.ok) throw new Error(`returned ${response.status}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Next.js base is unreachable at ${nextBase}: ${message}`)
  }
}

async function preparePage(page: Page): Promise<void> {
  await page.setViewport(VIEWPORT)
}

async function captureSnapshot(page: Page, url: string, slug: string, path: string): Promise<PageSnapshot | null> {
  const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  if (!response || response.status() >= 400) return null
  await new Promise(resolve => setTimeout(resolve, 600))

  const snapshot = await page.evaluate(`(() => {
    const pageSlug = ${JSON.stringify(slug)};
    const pagePath = ${JSON.stringify(path)};
    const pageUrl = ${JSON.stringify(url)};
    const viewportWidth = ${VIEWPORT.width};

    const normalizeText = (value) => (value || '').replace(/\\s+/g, ' ').trim();

    const findHeading = (labels) => {
      const wanted = labels.map(label => label.toLowerCase());
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      for (const element of elements) {
        const text = normalizeText(element.textContent).toLowerCase();
        if (wanted.includes(text)) return element;
      }
      return null;
    };

    const collectBackgroundChain = (start) => {
      if (!start) return [];
      const entries = [];
      let node = start;
      while (node) {
        const styles = getComputedStyle(node);
        const backgroundColor = styles.backgroundColor;
        if (
          backgroundColor &&
          backgroundColor !== 'transparent' &&
          backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          node.tagName.toLowerCase() !== 'body'
        ) {
          const rect = node.getBoundingClientRect();
          entries.push({
            tag: node.tagName.toLowerCase(),
            className: typeof node.className === 'string' ? node.className.trim().substring(0, 160) : '',
            backgroundColor,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
        if (node.tagName.toLowerCase() === 'body') break;
        node = node.parentElement;
      }
      return entries;
    };

    const authorAnchor = findHeading(['Authors', 'Author']);
    const newsletterAnchor = findHeading(['Subscribe to our newsletter']);
    const referencesAnchor =
      document.querySelector('#references h1, #references h2, #references h3, #references h4, #references h5, #references h6') ||
      document.querySelector('#references') ||
      findHeading(['References', 'Sources']);
    const contributorsAnchor = findHeading(['Contributors']);
    const contactFormAnchor =
      findHeading(['Get in touch']) ||
      document.querySelector('iframe[id^="JotFormIFrame-"]') ||
      document.querySelector('iframe[title="Contact"]');

    return {
      slug: pageSlug,
      path: pagePath,
      url: pageUrl,
      authors: {
        anchorFound: Boolean(authorAnchor),
        chain: collectBackgroundChain(authorAnchor),
        descriptor: null,
      },
      contributors: {
        anchorFound: Boolean(contributorsAnchor),
        chain: collectBackgroundChain(contributorsAnchor),
        descriptor: null,
      },
      newsletter: {
        anchorFound: Boolean(newsletterAnchor),
        chain: collectBackgroundChain(newsletterAnchor),
        card: null,
        band: null,
      },
      contactForm: {
        anchorFound: Boolean(contactFormAnchor),
        chain: collectBackgroundChain(contactFormAnchor),
        card: null,
        band: null,
      },
      references: {
        anchorFound: Boolean(referencesAnchor),
        chain: collectBackgroundChain(referencesAnchor),
        descriptor: null,
      },
      viewportWidth,
    };
  })()`) as {
    slug: string
    path: string
    url: string
    viewportWidth: number
    authors: { anchorFound: boolean; chain: BackgroundEntry[]; descriptor: null }
    contributors: { anchorFound: boolean; chain: BackgroundEntry[]; descriptor: null }
    newsletter: { anchorFound: boolean; chain: BackgroundEntry[]; card: null; band: null }
    contactForm: { anchorFound: boolean; chain: BackgroundEntry[]; card: null; band: null }
    references: { anchorFound: boolean; chain: BackgroundEntry[]; descriptor: null }
  }

  const authorsEntry = snapshot.authors.chain.find(entry => entry.width >= snapshot.viewportWidth * 0.9) || snapshot.authors.chain[0] || null
  const contributorsEntry = snapshot.contributors.chain.find(entry => entry.width >= snapshot.viewportWidth * 0.9) || snapshot.contributors.chain[0] || null
  const newsletterCardEntry = snapshot.newsletter.chain.find(entry => entry.width < snapshot.viewportWidth * 0.9) || null
  const newsletterBandEntry = snapshot.newsletter.chain.find(entry => entry.width >= snapshot.viewportWidth * 0.9) || null
  const contactFormCardEntry = snapshot.contactForm.chain.find(entry => entry.width < snapshot.viewportWidth * 0.9) || snapshot.contactForm.chain[0] || null
  const contactFormBandEntry = snapshot.contactForm.chain.find(entry => entry.width >= snapshot.viewportWidth * 0.9) || null
  const referencesEntry = snapshot.references.chain.find(entry => entry.width >= snapshot.viewportWidth * 0.9) || snapshot.references.chain[0] || null

  return {
    slug: snapshot.slug,
    path: snapshot.path,
    url: snapshot.url,
    authors: {
      ...snapshot.authors,
      descriptor: makeDescriptor(authorsEntry),
    },
    contributors: {
      ...snapshot.contributors,
      descriptor: makeDescriptor(contributorsEntry),
    },
    newsletter: {
      ...snapshot.newsletter,
      card: makeDescriptor(newsletterCardEntry),
      band: makeDescriptor(
        newsletterBandEntry && newsletterCardEntry && newsletterBandEntry === newsletterCardEntry
          ? null
          : newsletterBandEntry
      ),
    },
    contactForm: {
      ...snapshot.contactForm,
      card: makeDescriptor(contactFormCardEntry),
      band: makeDescriptor(
        contactFormBandEntry && contactFormCardEntry && contactFormBandEntry === contactFormCardEntry
          ? null
          : contactFormBandEntry
      ),
    },
    references: {
      ...snapshot.references,
      descriptor: makeDescriptor(referencesEntry),
    },
  }
}

async function fetchGatsbySnapshot(page: Page, gatsbyBase: string, pageDef: PageDef): Promise<PageSnapshot | null> {
  const candidates = [
    `/vision/${pageDef.gatsbySlug}/`,
    `/features/${pageDef.gatsbySlug}/`,
  ]

  for (const path of candidates) {
    const url = `${gatsbyBase}${path}`
    const snapshot = await captureSnapshot(page, url, pageDef.slug, path)
    if (snapshot) return snapshot
  }

  return null
}

function buildDiffs(gatsby: PageSnapshot, next: PageSnapshot): SectionDiff[] {
  const diffs: SectionDiff[] = []

  const entries: Array<{
    section: SectionKey
    expected: BackgroundDescriptor
    actual: BackgroundDescriptor
    expectedFound: boolean
    actualFound: boolean
  }> = [
    {
      section: 'authors',
      expected: gatsby.authors.descriptor,
      actual: next.authors.descriptor,
      expectedFound: gatsby.authors.anchorFound,
      actualFound: next.authors.anchorFound,
    },
    {
      section: 'contributors',
      expected: gatsby.contributors.descriptor,
      actual: next.contributors.descriptor,
      expectedFound: gatsby.contributors.anchorFound,
      actualFound: next.contributors.anchorFound,
    },
    {
      section: 'newsletterCard',
      expected: gatsby.newsletter.card,
      actual: next.newsletter.card,
      expectedFound: gatsby.newsletter.anchorFound,
      actualFound: next.newsletter.anchorFound,
    },
    {
      section: 'newsletterBand',
      expected: gatsby.newsletter.band,
      actual: next.newsletter.band,
      expectedFound: gatsby.newsletter.anchorFound,
      actualFound: next.newsletter.anchorFound,
    },
    {
      section: 'contactFormCard',
      expected: gatsby.contactForm.card,
      actual: next.contactForm.card,
      expectedFound: gatsby.contactForm.anchorFound,
      actualFound: next.contactForm.anchorFound,
    },
    {
      section: 'contactFormBand',
      expected: gatsby.contactForm.band,
      actual: next.contactForm.band,
      expectedFound: gatsby.contactForm.anchorFound,
      actualFound: next.contactForm.anchorFound,
    },
    {
      section: 'references',
      expected: gatsby.references.descriptor,
      actual: next.references.descriptor,
      expectedFound: gatsby.references.anchorFound,
      actualFound: next.references.anchorFound,
    },
  ]

  for (const entry of entries) {
    if (!entry.expectedFound && !entry.actualFound) continue
    if (descriptorsMatch(entry.expected, entry.actual)) continue
    diffs.push({
      section: entry.section,
      expected: entry.expected,
      actual: entry.actual,
      expectedFound: entry.expectedFound,
      actualFound: entry.actualFound,
    })
  }

  return diffs
}

function formatDescriptor(descriptor: BackgroundDescriptor): string {
  if (descriptor.tone === 'none') return 'none'
  return `${descriptor.tone} / ${descriptor.coverage} (${descriptor.color}, ${descriptor.width}px wide)`
}

function printSummary(results: AuditResult[], nextBase: string, gatsbyBase: string): void {
  const mismatches = results.filter(result => result.mismatches.length > 0)
  const sectionCounts = {
    authors: 0,
    contributors: 0,
    newsletterCard: 0,
    newsletterBand: 0,
    contactFormCard: 0,
    contactFormBand: 0,
    references: 0,
  }

  for (const result of mismatches) {
    for (const mismatch of result.mismatches) {
      sectionCounts[mismatch.section]++
    }
  }

  console.log(`Gatsby base: ${gatsbyBase}`)
  console.log(`Next base: ${nextBase}`)
  console.log(`Pages checked: ${results.length}`)
  console.log(`Pages with mismatches: ${mismatches.length}`)
  console.log(
    `Section mismatches: authors=${sectionCounts.authors}, contributors=${sectionCounts.contributors}, newsletter-card=${sectionCounts.newsletterCard}, newsletter-band=${sectionCounts.newsletterBand}, contact-card=${sectionCounts.contactFormCard}, contact-band=${sectionCounts.contactFormBand}, references=${sectionCounts.references}`
  )
  console.log()

  if (mismatches.length === 0) {
    console.log('No background mismatches detected.')
    return
  }

  console.log('Pages with background mismatches:')
  for (const result of mismatches) {
    console.log(`- ${result.slug}`)
    for (const mismatch of result.mismatches) {
      console.log(`  [${mismatch.section}] Gatsby: ${formatDescriptor(mismatch.expected)} | Next: ${formatDescriptor(mismatch.actual)}`)
    }
  }
}

async function main() {
  const args = process.argv.slice(2)
  const gatsbyBase = getArgValue(args, '--gatsby-base') || GATSBY_BASE_DEFAULT
  const nextBase = getArgValue(args, '--next-base') || NEXT_BASE_DEFAULT
  const slugsArg = getArgValue(args, '--slugs')
  const jsonMode = args.includes('--json')

  const selected = slugsArg
    ? PAGES.filter(page => new Set(slugsArg.split(',').map(value => value.trim()).filter(Boolean)).has(page.slug))
    : PAGES

  if (selected.length === 0) {
    throw new Error('No pages selected for background audit')
  }

  await ensureNextBaseReachable(nextBase)

  const browser: Browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await preparePage(page)

  const results: AuditResult[] = []

  try {
    for (let index = 0; index < selected.length; index++) {
      const pageDef = selected[index]
      process.stderr.write(`[${index + 1}/${selected.length}] ${pageDef.slug}... `)

      const gatsby = await fetchGatsbySnapshot(page, gatsbyBase, pageDef)
      if (!gatsby) {
        process.stderr.write('skip (no Gatsby page)\n')
        continue
      }

      const nextPath = `/vision/${pageDef.slug}`
      const nextUrl = `${nextBase}${nextPath}`
      const next = await captureSnapshot(page, nextUrl, pageDef.slug, nextPath)

      if (!next) {
        process.stderr.write('error (no Next page)\n')
        throw new Error(`Next page not found for ${pageDef.slug} at ${nextUrl}`)
      }

      const mismatches = buildDiffs(gatsby, next)
      results.push({
        slug: pageDef.slug,
        gatsbyPath: gatsby.path,
        gatsbyUrl: gatsby.url,
        nextUrl,
        mismatches,
        gatsby,
        next,
      })
      process.stderr.write(mismatches.length === 0 ? 'clean\n' : `${mismatches.length} mismatch(es)\n`)
    }
  } finally {
    await browser.close()
  }

  if (results.length === 0) {
    throw new Error('Checked 0 pages; background audit did no work')
  }

  mkdirSync('.audit', { recursive: true })
  writeFileSync(REPORT_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    gatsbyBase,
    nextBase,
    checkedPages: results.length,
    results,
  }, null, 2))

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2))
    return
  }

  printSummary(results, nextBase, gatsbyBase)
  console.log()
  console.log(`JSON report written to ${REPORT_PATH}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
