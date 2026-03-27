/**
 * Vision Page Comparison Script
 *
 * Compares the structure of each static vision page on the Gatsby site
 * against the Next.js version by fetching both and comparing:
 * - Heading count and text
 * - Image count
 * - Button/link count
 * - List count (ul/ol)
 * - Quote blocks
 * - Section structure
 *
 * Usage: npx tsx scripts/compare-pages.ts [slug]
 * If no slug provided, compares all static vision pages.
 */

const GATSBY_BASE = 'https://goinvo.com'
const NEXTJS_BASE = 'http://localhost:3000'

// All static vision page slugs
const STATIC_SLUGS = [
  'ai-design-certification',
  'augmented-clinical-decision-support',
  'coronavirus',
  'determinants-of-health',
  'eligibility-engine',
  'experiments',
  'faces-in-health-communication',
  'fraud-waste-abuse-in-healthcare',
  'health-design-thinking',
  'health-visualizations',
  'healthcare-ai',
  'healthcare-dollars',
  'healthcare-dollars-redux',
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
  'primary-self-care-algorithms',
  'public-healthroom',
  'test-treat-trace',
  'us-healthcare-problems',
  'vapepocolypse',
  'virtual-care',
  'virtual-diabetes-care',
  'visual-storytelling-with-genai',
  'who-uses-my-health-data',
  'digital-health-trends-2022',
]

interface PageStructure {
  headings: { level: number; text: string }[]
  imageCount: number
  buttonCount: number
  linkCount: number
  ulCount: number
  olCount: number
  quoteCount: number
  iframeCount: number
  supCount: number
  paragraphCount: number
}

function extractText(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi')
  const matches: string[] = []
  let match
  while ((match = regex.exec(html)) !== null) {
    // Strip inner HTML tags to get plain text
    const text = match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ')
    if (text) matches.push(text)
  }
  return matches
}

function parseStructure(html: string): PageStructure {
  const headings: { level: number; text: string }[] = []

  // Extract headings h1-h4
  for (let level = 1; level <= 4; level++) {
    const texts = extractText(html, `h${level}`)
    for (const text of texts) {
      headings.push({ level, text: text.substring(0, 80) })
    }
  }

  // Count elements
  const imageCount = (html.match(/<img\b/gi) || []).length
  const buttonCount = (html.match(/<button\b|class="[^"]*button[^"]*"/gi) || []).length
  const linkCount = (html.match(/<a\b/gi) || []).length
  const ulCount = (html.match(/<ul\b/gi) || []).length
  const olCount = (html.match(/<ol\b/gi) || []).length
  const quoteCount = (html.match(/class="[^"]*quote[^"]*"|<blockquote\b/gi) || []).length
  const iframeCount = (html.match(/<iframe\b/gi) || []).length
  const supCount = (html.match(/<sup\b/gi) || []).length
  const paragraphCount = (html.match(/<p\b/gi) || []).length

  return {
    headings,
    imageCount,
    buttonCount,
    linkCount,
    ulCount,
    olCount,
    quoteCount,
    iframeCount,
    supCount,
    paragraphCount,
  }
}

function comparePage(slug: string, gatsby: PageStructure, nextjs: PageStructure): string[] {
  const issues: string[] = []

  // Compare heading counts by level
  for (let level = 1; level <= 4; level++) {
    const gCount = gatsby.headings.filter(h => h.level === level).length
    const nCount = nextjs.headings.filter(h => h.level === level).length
    if (gCount !== nCount) {
      issues.push(`h${level} count: Gatsby=${gCount}, Next.js=${nCount}`)
    }
  }

  // Find headings in Next.js that don't exist in Gatsby (fabricated headings)
  for (const nh of nextjs.headings) {
    const found = gatsby.headings.some(
      gh => gh.text.toLowerCase().includes(nh.text.toLowerCase().substring(0, 20)) ||
            nh.text.toLowerCase().includes(gh.text.toLowerCase().substring(0, 20))
    )
    if (!found && nh.text.length > 3) {
      issues.push(`EXTRA HEADING in Next.js: <h${nh.level}> "${nh.text}"`)
    }
  }

  // Find headings in Gatsby missing from Next.js
  for (const gh of gatsby.headings) {
    const found = nextjs.headings.some(
      nh => nh.text.toLowerCase().includes(gh.text.toLowerCase().substring(0, 20)) ||
            gh.text.toLowerCase().includes(nh.text.toLowerCase().substring(0, 20))
    )
    if (!found && gh.text.length > 3) {
      issues.push(`MISSING HEADING from Gatsby: <h${gh.level}> "${gh.text}"`)
    }
  }

  // Compare element counts
  const comparisons: [string, number, number, number][] = [
    ['images', gatsby.imageCount, nextjs.imageCount, 2],
    ['buttons', gatsby.buttonCount, nextjs.buttonCount, 1],
    ['lists (ul)', gatsby.ulCount, nextjs.ulCount, 1],
    ['lists (ol)', gatsby.olCount, nextjs.olCount, 1],
    ['quotes', gatsby.quoteCount, nextjs.quoteCount, 1],
    ['iframes', gatsby.iframeCount, nextjs.iframeCount, 1],
    ['superscripts', gatsby.supCount, nextjs.supCount, 2],
    ['paragraphs', gatsby.paragraphCount, nextjs.paragraphCount, 5],
  ]

  for (const [name, gVal, nVal, threshold] of comparisons) {
    const diff = Math.abs(gVal - nVal)
    if (diff >= threshold) {
      const direction = nVal > gVal ? 'MORE' : 'FEWER'
      issues.push(`${name}: Gatsby=${gVal}, Next.js=${nVal} (${direction} by ${diff})`)
    }
  }

  return issues
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GoInvo-PageCompare/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

async function main() {
  const slugArg = process.argv[2]
  const slugs = slugArg ? [slugArg] : STATIC_SLUGS

  console.log(`\n📊 Comparing ${slugs.length} vision page(s)...\n`)

  let totalIssues = 0

  for (const slug of slugs) {
    const gatsbyUrl = `${GATSBY_BASE}/vision/${slug}/`
    const nextjsUrl = `${NEXTJS_BASE}/vision/${slug}/`

    process.stdout.write(`  ${slug}... `)

    const [gatsbyHtml, nextjsHtml] = await Promise.all([
      fetchPage(gatsbyUrl),
      fetchPage(nextjsUrl),
    ])

    if (!gatsbyHtml) {
      console.log('⚠️  Could not fetch Gatsby page')
      continue
    }
    if (!nextjsHtml) {
      console.log('⚠️  Could not fetch Next.js page (is dev server running?)')
      continue
    }

    const gatsbyStructure = parseStructure(gatsbyHtml)
    const nextjsStructure = parseStructure(nextjsHtml)
    const issues = comparePage(slug, gatsbyStructure, nextjsStructure)

    if (issues.length === 0) {
      console.log('✅ No structural differences found')
    } else {
      console.log(`❌ ${issues.length} issue(s):`)
      for (const issue of issues) {
        console.log(`     - ${issue}`)
      }
      totalIssues += issues.length
    }
  }

  console.log(`\n${totalIssues === 0 ? '✅ All pages match!' : `❌ Total issues found: ${totalIssues}`}\n`)
}

main().catch(console.error)
