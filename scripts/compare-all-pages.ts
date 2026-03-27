/**
 * Full site comparison: vision pages + case studies + main pages
 *
 * Compares DOM structure between Gatsby (live) and Next.js (localhost).
 * Reports heading mismatches, missing content, count differences.
 *
 * Usage:
 *   npx tsx scripts/compare-all-pages.ts              # all pages
 *   npx tsx scripts/compare-all-pages.ts --section work  # case studies only
 *   npx tsx scripts/compare-all-pages.ts --section main  # main pages only
 */

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
