/**
 * Vision Page Comparison Script v3
 *
 * Deep structural + styling comparison between Gatsby (live) and Next.js (local).
 *
 * Catches:
 * - Fabricated/missing headings
 * - Heading level mismatches
 * - Font weight / style mismatches (Gatsby header--lg is light serif, not bold sans)
 * - Links that should be buttons
 * - Missing superscripts, quotes, references, authors
 * - Element count differences (images, videos, lists, iframes)
 * - Shadow/border styling that shouldn't exist
 * - Missing colored background sections
 * - Width/sizing mismatches on key elements
 *
 * Usage:
 *   npx tsx scripts/compare-pages.ts                     # all pages
 *   npx tsx scripts/compare-pages.ts eligibility-engine   # single page
 *   npx tsx scripts/compare-pages.ts --json               # JSON output
 *   npx tsx scripts/compare-pages.ts --verbose            # show all issues incl low
 */

const GATSBY_BASE = 'https://goinvo.com'
const NEXTJS_BASE = 'http://localhost:3000'

const ALL_SLUGS = [
  'ai-design-certification', 'augmented-clinical-decision-support', 'coronavirus',
  'determinants-of-health', 'eligibility-engine', 'experiments',
  'faces-in-health-communication', 'fraud-waste-abuse-in-healthcare',
  'health-design-thinking', 'health-visualizations', 'healthcare-ai',
  'healthcare-dollars', 'healthcare-dollars-redux', 'history-of-health-design',
  'human-centered-design-for-ai', 'living-health-lab', 'loneliness-in-our-human-code',
  'national-cancer-navigation', 'open-pro', 'open-source-healthcare',
  'own-your-health-data', 'patient-centered-consent', 'physician-burnout',
  'precision-autism', 'primary-self-care-algorithms', 'public-healthroom',
  'test-treat-trace', 'us-healthcare-problems', 'vapepocolypse', 'virtual-care',
  'virtual-diabetes-care', 'visual-storytelling-with-genai',
  'who-uses-my-health-data', 'digital-health-trends-2022',
]

// ---------------------------------------------------------------------------
// Gatsby CSS class → expected styling map
// ---------------------------------------------------------------------------

/** Known Gatsby classes and what they mean stylistically */
const GATSBY_CLASS_MEANING: Record<string, { font?: string; weight?: string; size?: string; case?: string; align?: string; desc: string }> = {
  'header--xl': { font: 'serif', weight: 'light/300', size: '1.75-2.25rem', desc: 'Large serif light heading' },
  'header--lg': { font: 'serif', weight: 'light/300', size: '1.5rem', desc: 'Medium serif light heading' },
  'header--md': { font: 'sans', weight: 'bold/600', size: '0.875rem', case: 'uppercase', desc: 'Small uppercase bold subheading' },
  'header--sm': { font: 'sans', weight: 'bold/600', size: '1rem', desc: 'Small bold heading' },
  'text--center': { align: 'center', desc: 'Centered text' },
  'text--gray': { desc: 'Gray colored text' },
  'text--primary': { desc: 'Primary (orange) colored text' },
  'button--secondary': { desc: 'Secondary button style (border, uppercase, tracking)' },
  'button--primary': { desc: 'Primary button style (filled orange)' },
  'button--block': { desc: 'Full-width block button' },
}

/** Check if Next.js classes match the expected styling for a Gatsby class */
function checkClassMatch(gatsbyClasses: string, nextjsClasses: string): string[] {
  const issues: string[] = []
  const gc = gatsbyClasses.toLowerCase()
  const nc = nextjsClasses.toLowerCase()

  // header--xl should be serif + light weight
  if (gc.includes('header--xl')) {
    if (!nc.includes('font-serif') && !nc.includes('serif')) {
      issues.push('should be serif font (header--xl) but missing font-serif')
    }
    if (nc.includes('font-semibold') || nc.includes('font-bold')) {
      issues.push('should be font-light (header--xl) but has font-semibold/bold')
    }
  }

  // header--lg should be serif + light weight
  if (gc.includes('header--lg')) {
    if (!nc.includes('font-serif') && !nc.includes('serif')) {
      issues.push('should be serif font (header--lg) but missing font-serif')
    }
    if (nc.includes('font-semibold') || nc.includes('font-bold')) {
      issues.push('should be font-light (header--lg) but has font-semibold/bold')
    }
    if (nc.includes('text-2xl') || nc.includes('text-3xl')) {
      issues.push('header--lg is 1.5rem but Next.js uses text-2xl/3xl (too large)')
    }
  }

  // header--md should be sans + bold + uppercase + small
  if (gc.includes('header--md')) {
    if (nc.includes('font-serif') || nc.includes('serif')) {
      issues.push('should be sans-serif (header--md) but has font-serif')
    }
    if (!nc.includes('uppercase') && !nc.includes('header-md')) {
      issues.push('should be uppercase (header--md) but missing uppercase')
    }
    if (nc.includes('text-xl') || nc.includes('text-2xl')) {
      issues.push('header--md is small (0.875rem) but Next.js uses text-xl/2xl (too large)')
    }
  }

  // text--center should be centered
  if (gc.includes('text--center') && !nc.includes('text-center')) {
    issues.push('should be centered (text--center) but missing text-center')
  }

  // button styling
  if (gc.includes('button--secondary') || gc.includes('button--primary')) {
    if (!nc.includes('button') && !nc.includes('uppercase') && !nc.includes('tracking')) {
      issues.push('Gatsby has button styling but Next.js classes lack button appearance')
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  message: string
}

interface PageElement {
  tag: string
  text: string
  classes: string
  attrs: string
}

interface PageAnalysis {
  headings: PageElement[]
  images: number
  videos: number
  iframes: number
  uls: number
  ols: number
  sups: number
  quotes: number
  paragraphs: number
  buttons: PageElement[]
  links: PageElement[]
  hasReferences: boolean
  hasAuthors: boolean
  hasNewsletter: boolean
  hasShadowCards: boolean
  bgSections: string[]
  videoWidthClasses: string[]
}

// ---------------------------------------------------------------------------
// HTML parsing
// ---------------------------------------------------------------------------

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function extractElements(html: string, tagName: string): PageElement[] {
  const results: PageElement[] = []
  const regex = new RegExp(`<${tagName}([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  let match
  while ((match = regex.exec(html)) !== null) {
    const attrs = match[1]
    const text = stripTags(match[2]).substring(0, 100)
    const classMatch = attrs.match(/class(?:Name)?="([^"]*)"/)
    const classes = classMatch ? classMatch[1] : ''
    if (text.length > 0) results.push({ tag: tagName, text, classes, attrs })
  }
  return results
}

function getContentArea(html: string): string {
  // Try to isolate main content, skipping header/footer/nav
  const mainMatch = html.match(/<main[^>]*>([\s\S]*)<\/main>/i)
  if (mainMatch) return mainMatch[1]
  const bodyMatch = html.match(/<div class="app__body">([\s\S]*?)(?:<div class="footer">|$)/i)
  if (bodyMatch) return bodyMatch[1]
  return html
}

function analyzeHtml(html: string): PageAnalysis {
  const content = getContentArea(html)

  const headings: PageElement[] = []
  for (let level = 1; level <= 4; level++) {
    headings.push(...extractElements(content, `h${level}`))
  }

  const allAs = extractElements(content, 'a')
  const allButtons = extractElements(content, 'button')
  const buttons = [
    ...allButtons,
    ...allAs.filter(a =>
      /button/i.test(a.classes) ||
      (/uppercase/i.test(a.classes) && /tracking/i.test(a.classes)) ||
      (/px-[4-9]/i.test(a.classes) && /py-[1-3]/i.test(a.classes) && /border/i.test(a.classes))
    ),
  ]
  const links = allAs.filter(a => !buttons.includes(a))

  // Video width analysis
  const videoWidthClasses: string[] = []
  const videoRegex = /<(?:video|div[^>]*eligibility-engine__video)[^>]*class(?:Name)?="([^"]*)"/gi
  let vm
  while ((vm = videoRegex.exec(content)) !== null) {
    videoWidthClasses.push(vm[1])
  }

  return {
    headings,
    images: (content.match(/<img\b/gi) || []).length,
    videos: (content.match(/<video\b/gi) || []).length,
    iframes: (content.match(/<iframe\b/gi) || []).length,
    uls: (content.match(/<ul\b/gi) || []).length,
    ols: (content.match(/<ol\b/gi) || []).length,
    sups: (content.match(/<sup\b/gi) || []).length,
    quotes: (content.match(/<blockquote\b|class="[^"]*quote[^"]*"/gi) || []).length,
    paragraphs: (content.match(/<p\b/gi) || []).length,
    buttons,
    links,
    hasReferences: /id="references"|<References|class="references"/i.test(content),
    hasAuthors: /<Author|class="author"/i.test(content) || /Authors<\/h/i.test(content),
    hasNewsletter: /subscribe|newsletter/i.test(content),
    hasShadowCards: /shadow-card|shadow.*rgba.*0\.08/i.test(content),
    bgSections: [
      ...(content.match(/background--blue|bg-blue|bg-secondary(?!\/)/gi) || []),
      ...(content.match(/background--gray/gi) || []),
    ],
    videoWidthClasses,
  }
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

function compare(slug: string, gatsby: PageAnalysis, nextjs: PageAnalysis): Issue[] {
  const issues: Issue[] = []

  // ---- HEADINGS: extra, missing, level, and styling ----

  for (const nh of nextjs.headings) {
    const match = gatsby.headings.find(gh => {
      const g = gh.text.toLowerCase().substring(0, 25)
      const n = nh.text.toLowerCase().substring(0, 25)
      return g.includes(n) || n.includes(g)
    })
    if (!match) {
      issues.push({
        severity: 'critical',
        category: 'EXTRA_HEADING',
        message: `<h${nh.tag === 'h1' ? '1' : nh.tag === 'h2' ? '2' : nh.tag === 'h3' ? '3' : '4'}> "${nh.text}" in Next.js but NOT in Gatsby`,
      })
    }
  }

  // Hmm, the tag field is the tag name like "h2", not just "h". Let me fix:
  for (const nh of nextjs.headings) {
    const found = gatsby.headings.some(gh => {
      const g = gh.text.toLowerCase().substring(0, 25)
      const n = nh.text.toLowerCase().substring(0, 25)
      return g.includes(n) || n.includes(g)
    })
    if (!found && !issues.some(i => i.message.includes(nh.text.substring(0, 20)))) {
      issues.push({
        severity: 'critical',
        category: 'EXTRA_HEADING',
        message: `"${nh.text}" heading in Next.js but NOT in Gatsby`,
      })
    }
  }

  for (const gh of gatsby.headings) {
    const found = nextjs.headings.some(nh => {
      const g = gh.text.toLowerCase().substring(0, 25)
      const n = nh.text.toLowerCase().substring(0, 25)
      return g.includes(n) || n.includes(g)
    })
    if (!found) {
      issues.push({
        severity: 'high',
        category: 'MISSING_HEADING',
        message: `"${gh.text}" heading in Gatsby but NOT in Next.js`,
      })
    }
  }

  // Heading styling comparison
  for (const gh of gatsby.headings) {
    const match = nextjs.headings.find(nh => {
      const g = gh.text.toLowerCase().substring(0, 25)
      const n = nh.text.toLowerCase().substring(0, 25)
      return g.includes(n) || n.includes(g)
    })
    if (match) {
      const classIssues = checkClassMatch(gh.classes, match.classes)
      for (const ci of classIssues) {
        issues.push({
          severity: 'medium',
          category: 'HEADING_STYLE',
          message: `"${gh.text.substring(0, 40)}": ${ci}`,
        })
      }
    }
  }

  // ---- ELEMENT COUNTS ----

  const checks: [string, number, number, number, 'critical' | 'high' | 'medium'][] = [
    ['images', gatsby.images, nextjs.images, 2, 'high'],
    ['videos', gatsby.videos, nextjs.videos, 1, 'high'],
    ['iframes', gatsby.iframes, nextjs.iframes, 1, 'high'],
    ['unordered lists (ul)', gatsby.uls, nextjs.uls, 1, 'medium'],
    ['ordered lists (ol)', gatsby.ols, nextjs.ols, 1, 'medium'],
    ['superscripts', gatsby.sups, nextjs.sups, 2, 'high'],
    ['quotes', gatsby.quotes, nextjs.quotes, 1, 'high'],
  ]

  for (const [name, gVal, nVal, threshold, severity] of checks) {
    if (Math.abs(gVal - nVal) >= threshold) {
      const dir = nVal > gVal ? 'MORE' : 'FEWER'
      issues.push({ severity, category: 'COUNT', message: `${name}: Gatsby=${gVal} Next.js=${nVal} (${dir} by ${Math.abs(gVal - nVal)})` })
    }
  }

  // ---- BUTTONS vs LINKS ----

  for (const gb of gatsby.buttons) {
    const inNextButtons = nextjs.buttons.some(nb => {
      const g = gb.text.toLowerCase().substring(0, 20)
      const n = nb.text.toLowerCase().substring(0, 20)
      return g.includes(n) || n.includes(g)
    })
    if (!inNextButtons) {
      const inNextLinks = nextjs.links.some(nl => {
        const g = gb.text.toLowerCase().substring(0, 20)
        const n = nl.text.toLowerCase().substring(0, 20)
        return g.includes(n) || n.includes(g)
      })
      if (inNextLinks) {
        issues.push({
          severity: 'high',
          category: 'LINK_NOT_BUTTON',
          message: `"${gb.text}" is a BUTTON in Gatsby but a plain LINK in Next.js`,
        })
      } else {
        issues.push({
          severity: 'high',
          category: 'MISSING_BUTTON',
          message: `"${gb.text}" button in Gatsby but not found in Next.js`,
        })
      }
    }
  }

  // ---- SECTIONS ----

  if (gatsby.hasReferences && !nextjs.hasReferences) {
    issues.push({ severity: 'critical', category: 'MISSING_SECTION', message: 'References section missing from Next.js' })
  }
  if (gatsby.hasAuthors && !nextjs.hasAuthors) {
    issues.push({ severity: 'high', category: 'MISSING_SECTION', message: 'Authors section missing from Next.js' })
  }
  if (nextjs.hasShadowCards && !gatsby.hasShadowCards) {
    issues.push({ severity: 'medium', category: 'EXTRA_STYLE', message: 'Next.js has shadow-card styling not in Gatsby' })
  }
  if (gatsby.bgSections.length > 0 && nextjs.bgSections.length === 0) {
    issues.push({ severity: 'medium', category: 'MISSING_STYLE', message: `Gatsby has background sections (${gatsby.bgSections.join(', ')}) missing in Next.js` })
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GoInvo-PageCompare/3.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const jsonOutput = args.includes('--json')
  const verbose = args.includes('--verbose')
  const slugArg = args.find(a => !a.startsWith('--'))
  const slugs = slugArg ? [slugArg] : ALL_SLUGS

  if (!jsonOutput) console.log(`\n📊 Comparing ${slugs.length} vision page(s)...\n`)

  const allResults: Record<string, Issue[]> = {}
  let totalIssues = 0
  let criticalCount = 0
  let cleanPages = 0

  for (const slug of slugs) {
    if (!jsonOutput) process.stdout.write(`  ${slug}... `)

    const [gatsbyHtml, nextjsHtml] = await Promise.all([
      fetchPage(`${GATSBY_BASE}/vision/${slug}/`),
      fetchPage(`${NEXTJS_BASE}/vision/${slug}/`),
    ])

    if (!gatsbyHtml) { if (!jsonOutput) console.log('⚠️  Gatsby not found'); continue }
    if (!nextjsHtml) { if (!jsonOutput) console.log('⚠️  Next.js unreachable'); continue }

    const issues = compare(slug, analyzeHtml(gatsbyHtml), analyzeHtml(nextjsHtml))
    allResults[slug] = issues
    totalIssues += issues.length
    criticalCount += issues.filter(i => i.severity === 'critical').length
    if (issues.length === 0) cleanPages++

    if (!jsonOutput) {
      if (issues.length === 0) {
        console.log('✅')
      } else {
        const crits = issues.filter(i => i.severity === 'critical').length
        const highs = issues.filter(i => i.severity === 'high').length
        console.log(`❌ ${issues.length} issues (${crits}C ${highs}H)`)
        const showSeverities = verbose
          ? ['critical', 'high', 'medium', 'low']
          : ['critical', 'high']
        for (const issue of issues.filter(i => showSeverities.includes(i.severity))) {
          const icons: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' }
          console.log(`     ${icons[issue.severity]} [${issue.category}] ${issue.message}`)
        }
        const hidden = issues.filter(i => !showSeverities.includes(i.severity)).length
        if (hidden > 0) console.log(`     ℹ️  +${hidden} medium/low (use --verbose)`)
      }
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(allResults, null, 2))
  } else {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Pages scanned: ${Object.keys(allResults).length}`)
    console.log(`Clean pages:   ${cleanPages}`)
    console.log(`Total issues:  ${totalIssues} (${criticalCount} critical)`)
    console.log()
  }
}

main().catch(console.error)
