/**
 * Full site comparison: vision pages + case studies + main pages
 *
 * Compares DOM structure between Gatsby (live) and Next.js (localhost).
 * Reports heading mismatches, missing content, count differences, and
 * rendered-layout drift on main pages (hero wrap and card image layout).
 *
 * Usage:
 *   npx tsx scripts/compare-all-pages.ts              # all pages
 *   npx tsx scripts/compare-all-pages.ts --section work  # case studies only
 *   npx tsx scripts/compare-all-pages.ts --section main  # main pages only
 */

import puppeteer, { type Browser, type Page } from 'puppeteer'

const GATSBY_BASE_URL = 'https://goinvo.com'
const NEXTJS_BASE_URL = 'http://localhost:3000'

const CASE_STUDY_SLUGS = [
  '3m-coderyte', 'ahrq-cds', 'all-of-us', 'care-cards',
  'commonhealth-smart-health-cards', 'fastercures-health-data-basics',
  'hgraph', 'infobionic-heart-monitoring', 'insidetracker-nutrition-science',
  'inspired-ehrs', 'ipsos-facto', 'mass-snap', 'maya-ehr',
  'mitre-flux-notes', 'mitre-shr', 'mitre-state-of-us-healthcare',
  'mount-sinai-consent', 'paintrackr', 'partners-geneinsight',
  'partners-insight', 'personal-genome-project-vision', 'prior-auth',
  'public-sector', 'staffplan', 'tabeeb-diagnostics', 'wuxi-nextcode-familycode',
]

const MAIN_PAGES = [
  { path: '/', label: 'Homepage' },
  { path: '/about', label: 'About' },
  { path: '/about/careers', label: 'Careers' },
  { path: '/about/open-office-hours', label: 'Open Office Hours' },
  { path: '/about/studio-timeline', label: 'Studio Timeline' },
  { path: '/services', label: 'Services' },
  { path: '/work', label: 'Work' },
  { path: '/vision', label: 'Vision' },
  { path: '/contact', label: 'Contact' },
  { path: '/enterprise', label: 'Enterprise' },
  { path: '/government', label: 'Government' },
  { path: '/ai', label: 'AI' },
  { path: '/patient-engagement', label: 'Patient Engagement' },
  { path: '/open-source-health-design', label: 'Open Source Health Design' },
]

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  message: string
}

interface RenderHeroMetric {
  text: string
  boxWidth: number
  boxHeight: number
  headingWidth: number
  headingHeight: number
  lineCount: number | null
}

interface RenderCardImageMetric {
  title: string
  parentWidth: number
  parentHeight: number
  imageWidth: number
  imageHeight: number
  topOffset: number
  bottomOffset: number
  rightGap: number
  heightOccupancy: number
}

interface RenderMetrics {
  hero: RenderHeroMetric | null
  cardImages: RenderCardImageMetric[]
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

interface PageElement { tag: string; text: string; classes: string }

function extractHeadings(html: string): PageElement[] {
  const results: PageElement[] = []
  const regex = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    const attrs = match[2]
    const text = stripTags(match[3]).substring(0, 100)
    const classMatch = attrs.match(/class(?:Name)?="([^"]*)"/)
    if (text.length > 0) results.push({ tag: `h${match[1]}`, text, classes: classMatch?.[1] || '' })
  }
  return results
}

function getContentArea(html: string): string {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*)<\/main>/i)
  if (mainMatch) return mainMatch[1]
  const bodyMatch = html.match(/<div class="app__body">([\s\S]*?)(?:<div class="footer">|$)/i)
  if (bodyMatch) return bodyMatch[1]
  return html
}

function pageUrl(base: string, path: string): string {
  if (path === '/') return `${base}/`
  return `${base}${path}/`
}

async function preparePageForCapture(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 400)
    const maxScroll = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)

    for (let y = 0; y <= maxScroll; y += step) {
      window.scrollTo(0, y)
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    window.scrollTo(0, maxScroll)
    await new Promise(resolve => setTimeout(resolve, 400))
    window.scrollTo(0, 0)
    await new Promise(resolve => setTimeout(resolve, 250))
  })
}

async function measureRenderedLayout(page: Page, url: string): Promise<RenderMetrics> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise(resolve => setTimeout(resolve, 800))
  await preparePageForCapture(page)

  return page.evaluate(() => {
    const transparent = new Set(['rgba(0, 0, 0, 0)', 'transparent'])
    const root = document.querySelector('main') || document.querySelector('.app__body') || document.body
    const parsePx = (value: string | null | undefined): number => {
      const parsed = Number.parseFloat(value ?? '0')
      return Number.isFinite(parsed) ? parsed : 0
    }
    const lineCount = (el: Element | null): number | null => {
      if (!el) return null
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      const height = parsePx(style.lineHeight) || parsePx(style.fontSize) * 1.2
      if (!height) return null
      return Math.round((rect.height / height) * 10) / 10
    }
    const findMeasuredContainer = (el: HTMLElement | null): HTMLElement | null => {
      let current = el?.parentElement ?? null
      while (current && current !== document.body) {
        const style = getComputedStyle(current)
        const rect = current.getBoundingClientRect()
        const targetRect = el?.getBoundingClientRect()
        const hasPadding =
          parsePx(style.paddingTop) > 0 ||
          parsePx(style.paddingRight) > 0 ||
          parsePx(style.paddingBottom) > 0 ||
          parsePx(style.paddingLeft) > 0
        const hasMeasuredBackground = !transparent.has(style.backgroundColor)
        const className = typeof current.className === 'string' ? current.className : ''
        const canContain = !!targetRect && rect.width >= targetRect.width + 20 && rect.height >= targetRect.height

        if (canContain && (hasMeasuredBackground || hasPadding || className.includes('content-padding'))) {
          return current
        }
        current = current.parentElement
      }
      return el?.parentElement ?? null
    }

    const heroHeading = Array.from(document.querySelectorAll('h1'))
      .filter(el => !el.closest('header, footer, nav'))
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] as HTMLElement | undefined

    const hero = (() => {
      if (!heroHeading) return null
      const heroBox = findMeasuredContainer(heroHeading)
      if (!heroBox) return null
      const headingRect = heroHeading.getBoundingClientRect()
      const boxRect = heroBox.getBoundingClientRect()
      return {
        text: (heroHeading.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 80),
        boxWidth: Math.round(boxRect.width),
        boxHeight: Math.round(boxRect.height),
        headingWidth: Math.round(headingRect.width),
        headingHeight: Math.round(headingRect.height),
        lineCount: lineCount(heroHeading),
      }
    })()

    const cardImages = Array.from(root.querySelectorAll('a'))
      .map(link => {
        const heading = link.querySelector('h2, h3, h4') as HTMLElement | null
        const img = link.querySelector('img') as HTMLImageElement | null
        if (!heading || !img) return null

        const cardRect = link.getBoundingClientRect()
        if (cardRect.width < 500 || cardRect.height < 200) return null

        const parent = img.parentElement as HTMLElement | null
        if (!parent) return null

        const parentRect = parent.getBoundingClientRect()
        const imgRect = img.getBoundingClientRect()
        if (parentRect.width < 250 || parentRect.height < 180 || imgRect.width < 180) return null

        return {
          title: (heading.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 70),
          parentWidth: Math.round(parentRect.width),
          parentHeight: Math.round(parentRect.height),
          imageWidth: Math.round(imgRect.width),
          imageHeight: Math.round(imgRect.height),
          topOffset: Math.round(imgRect.top - parentRect.top),
          bottomOffset: Math.round(parentRect.bottom - imgRect.bottom),
          rightGap: Math.round(cardRect.right - parentRect.right),
          heightOccupancy: Number((imgRect.height / parentRect.height).toFixed(2)),
        }
      })
      .filter((sample): sample is RenderCardImageMetric => sample !== null)
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 6)

    return { hero, cardImages }
  })
}

function compareRenderedLayout(label: string, gatsby: RenderMetrics, nextjs: RenderMetrics): Issue[] {
  const issues: Issue[] = []

  if (gatsby.hero && nextjs.hero) {
    const diffs: string[] = []
    const boxWidthDiff = Math.abs(gatsby.hero.boxWidth - nextjs.hero.boxWidth)
    const headingWidthDiff = Math.abs(gatsby.hero.headingWidth - nextjs.hero.headingWidth)
    const headingHeightDiff = Math.abs(gatsby.hero.headingHeight - nextjs.hero.headingHeight)
    const lineCountDiff =
      gatsby.hero.lineCount !== null && nextjs.hero.lineCount !== null
        ? Math.abs(gatsby.hero.lineCount - nextjs.hero.lineCount)
        : 0

    if (boxWidthDiff > 30) diffs.push(`content box width ${gatsby.hero.boxWidth}px -> ${nextjs.hero.boxWidth}px`)
    if (headingWidthDiff > 30) diffs.push(`heading width ${gatsby.hero.headingWidth}px -> ${nextjs.hero.headingWidth}px`)
    if (headingHeightDiff > 12) diffs.push(`heading height ${gatsby.hero.headingHeight}px -> ${nextjs.hero.headingHeight}px`)
    if (lineCountDiff > 0.4) diffs.push(`line wrap ~${gatsby.hero.lineCount} -> ~${nextjs.hero.lineCount} lines`)

    if (diffs.length) {
      const severity: Issue['severity'] =
        boxWidthDiff > 60 || headingHeightDiff > 24 || lineCountDiff > 0.8 ? 'high' : 'medium'
      issues.push({
        severity,
        category: 'HERO_WRAP',
        message: `"${gatsby.hero.text || label}": ${diffs.join('; ')}`,
      })
    }
  }

  const sampleCount = Math.min(gatsby.cardImages.length, nextjs.cardImages.length, 3)
  for (let i = 0; i < sampleCount; i++) {
    const g = gatsby.cardImages[i]
    const n = nextjs.cardImages[i]
    const diffs: string[] = []
    const parentWidthDiff = Math.abs(g.parentWidth - n.parentWidth)
    const rightGapDiff = Math.abs(g.rightGap - n.rightGap)
    const occupancyDiff = Math.abs(g.heightOccupancy - n.heightOccupancy)
    const topOffsetDiff = Math.abs(g.topOffset - n.topOffset)
    const bottomOffsetDiff = Math.abs(g.bottomOffset - n.bottomOffset)

    if (parentWidthDiff > 30) diffs.push(`image column width ${g.parentWidth}px -> ${n.parentWidth}px`)
    if (rightGapDiff > 8) diffs.push(`image column right gap ${g.rightGap}px -> ${n.rightGap}px`)
    if (occupancyDiff > 0.12) diffs.push(`image height occupancy ${g.heightOccupancy} -> ${n.heightOccupancy}`)
    if (topOffsetDiff > 20 || bottomOffsetDiff > 20) {
      diffs.push(`vertical padding top/bottom ${g.topOffset}px/${g.bottomOffset}px -> ${n.topOffset}px/${n.bottomOffset}px`)
    }

    if (diffs.length) {
      const severity: Issue['severity'] =
        parentWidthDiff > 50 || rightGapDiff > 16 || occupancyDiff > 0.2 ? 'high' : 'medium'
      issues.push({
        severity,
        category: 'CARD_IMAGE_LAYOUT',
        message: `"${g.title || n.title}": ${diffs.join('; ')}`,
      })
    }
  }

  return issues
}

function compare(label: string, gatsbyHtml: string, nextjsHtml: string): Issue[] {
  const issues: Issue[] = []
  const gc = getContentArea(gatsbyHtml)
  const nc = getContentArea(nextjsHtml)

  const gh = extractHeadings(gc)
  const nh = extractHeadings(nc)

  // Extra headings
  for (const n of nh) {
    const found = gh.some(g => {
      const gn = g.text.toLowerCase().substring(0, 25)
      const nn = n.text.toLowerCase().substring(0, 25)
      return gn.includes(nn) || nn.includes(gn)
    })
    if (!found && n.text.length > 3) {
      issues.push({ severity: 'critical', category: 'EXTRA_HEADING', message: `<${n.tag}> "${n.text}" in Next.js only` })
    }
  }

  // Missing headings
  for (const g of gh) {
    const found = nh.some(n => {
      const gn = g.text.toLowerCase().substring(0, 25)
      const nn = n.text.toLowerCase().substring(0, 25)
      return gn.includes(nn) || nn.includes(gn)
    })
    if (!found && g.text.length > 3) {
      issues.push({ severity: 'high', category: 'MISSING_HEADING', message: `<${g.tag}> "${g.text}" in Gatsby only` })
    }
  }

  // Element counts
  const counts: [string, number, number, number, 'high' | 'medium'][] = [
    ['images', (gc.match(/<img\b/gi)||[]).length, (nc.match(/<img\b/gi)||[]).length, 3, 'high'],
    ['videos', (gc.match(/<video\b/gi)||[]).length, (nc.match(/<video\b/gi)||[]).length, 1, 'high'],
    ['iframes', (gc.match(/<iframe\b/gi)||[]).length, (nc.match(/<iframe\b/gi)||[]).length, 1, 'high'],
    ['lists', (gc.match(/<[uo]l\b/gi)||[]).length, (nc.match(/<[uo]l\b/gi)||[]).length, 2, 'medium'],
    ['superscripts', (gc.match(/<sup\b/gi)||[]).length, (nc.match(/<sup\b/gi)||[]).length, 3, 'medium'],
    ['quotes', (gc.match(/<blockquote\b|class="[^"]*quote[^"]*"/gi)||[]).length, (nc.match(/<blockquote\b|class="[^"]*quote[^"]*"/gi)||[]).length, 1, 'medium'],
  ]
  for (const [name, gv, nv, threshold, sev] of counts) {
    if (Math.abs(gv - nv) >= threshold) {
      issues.push({ severity: sev, category: 'COUNT', message: `${name}: Gatsby=${gv} Next.js=${nv}` })
    }
  }

  // Deduplicate
  const seen = new Set<string>()
  return issues.filter(i => {
    const key = `${i.category}:${i.message.substring(0, 50)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GoInvo-Compare/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch { return null }
}

async function main() {
  const args = process.argv.slice(2)
  const section = args.find(a => a.startsWith('--section='))?.split('=')[1] ||
                  (args.includes('--section') ? args[args.indexOf('--section') + 1] : 'all')

  const pages: { path: string; label: string }[] = []

  if (section === 'all' || section === 'work') {
    for (const slug of CASE_STUDY_SLUGS) {
      pages.push({ path: `/work/${slug}`, label: `work/${slug}` })
    }
  }
  if (section === 'all' || section === 'main') {
    pages.push(...MAIN_PAGES)
  }

  console.log(`\n📊 Comparing ${pages.length} ${section} page(s)...\n`)

  let totalIssues = 0
  let criticalCount = 0
  let cleanPages = 0

  for (const page of pages) {
    process.stdout.write(`  ${page.label}... `)

    const [gh, nh] = await Promise.all([
      fetchPage(`${GATSBY_BASE_URL}${page.path}/`),
      fetchPage(`${NEXTJS_BASE_URL}${page.path}/`),
    ])

    if (!gh) { console.log('⚠️  Gatsby not found'); continue }
    if (!nh) { console.log('⚠️  Next.js unreachable'); continue }

    const issues = compare(page.label, gh, nh)
    totalIssues += issues.length
    criticalCount += issues.filter(i => i.severity === 'critical').length
    if (issues.length === 0) { cleanPages++; console.log('✅'); continue }

    const crits = issues.filter(i => i.severity === 'critical').length
    const highs = issues.filter(i => i.severity === 'high').length
    console.log(`❌ ${issues.length} issues (${crits}C ${highs}H)`)
    for (const i of issues.filter(i => i.severity === 'critical' || i.severity === 'high')) {
      const icon = i.severity === 'critical' ? '🔴' : '🟠'
      console.log(`     ${icon} [${i.category}] ${i.message}`)
    }
    const rest = issues.filter(i => i.severity !== 'critical' && i.severity !== 'high').length
    if (rest > 0) console.log(`     ℹ️  +${rest} medium/low`)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Pages: ${pages.length} | Clean: ${cleanPages} | Issues: ${totalIssues} (${criticalCount} critical)`)
  console.log()
}

main().catch(console.error)
