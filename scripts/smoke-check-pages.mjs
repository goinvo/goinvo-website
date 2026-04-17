/**
 * Smoke-check a list of pages against their Gatsby equivalents:
 *   - Both pages load (200 OK)
 *   - No broken images on the Next.js side (naturalWidth === 0 after load)
 *   - Element counts within a tolerance (h1+h2+h3, p, img, ul+ol, sup)
 *   - Up-next entry count matches
 *
 * Usage:
 *   node scripts/smoke-check-pages.mjs
 *
 * Edit the PAGES list below to choose what to audit. Each entry maps a
 * Next.js path to the corresponding Gatsby path (set gatsby: null to skip
 * the Gatsby comparison and only do a broken-image scan).
 */
import puppeteer from 'puppeteer'

const NEXT_BASE = process.env.NEXT_BASE || 'http://localhost:3000'
const GATSBY_BASE = 'https://www.goinvo.com'

const PAGES = [
  // === Specifically requested for double-check ===
  { label: 'Care Plans (overview)', next: '/vision/care-plans', gatsby: '/features/careplans/' },
  { label: 'Care Plans Part 1', next: '/vision/care-plans/part-1', gatsby: '/features/careplans/part-1.html' },
  { label: 'Care Plans Part 2', next: '/vision/care-plans/part-2', gatsby: '/features/careplans/part-2.html' },
  { label: 'Care Plans Part 3', next: '/vision/care-plans/part-3', gatsby: '/features/careplans/part-3.html' },
  { label: 'Digital Healthcare 2016', next: '/vision/digital-healthcare', gatsby: '/features/digital-healthcare/' },
  { label: 'Healing US Healthcare', next: '/vision/healing-us-healthcare', gatsby: '/features/us-healthcare/' },
  { label: 'Bathroom to Healthroom', next: '/vision/bathroom-to-healthroom', gatsby: '/features/from-bathroom-to-healthroom/' },

  // === Screenshot list #54-71 case studies ===
  { label: 'MITRE State of US Healthcare', next: '/work/mitre-state-of-us-healthcare', gatsby: '/work/mitre-state-of-us-healthcare/' },
  { label: '3M CodeRyte', next: '/work/3m-coderyte', gatsby: '/work/3m-coderyte/' },
  { label: 'hGraph', next: '/work/hgraph', gatsby: '/work/hgraph/' },
  { label: 'Partners Insight', next: '/work/partners-insight', gatsby: '/work/partners-insight/' },
  { label: 'MITRE Flux Notes', next: '/work/mitre-flux-notes', gatsby: '/work/mitre-flux-notes/' },
  { label: 'CommonHealth Smart Cards', next: '/work/commonhealth-smart-health-cards', gatsby: '/work/commonhealth-smart-health-cards/' },
  { label: 'FasterCures Health Data', next: '/work/fastercures-health-data-basics', gatsby: '/work/fastercures-health-data-basics/' },
  { label: 'Mount Sinai Consent', next: '/work/mount-sinai-consent', gatsby: '/work/mount-sinai-consent/' },
  { label: 'Inspired EHRs', next: '/work/inspired-ehrs', gatsby: '/work/inspired-ehrs/' },
  { label: 'AHRQ CDS', next: '/work/ahrq-cds', gatsby: '/work/ahrq-cds/' },
  { label: 'Infobionic Heart Monitor', next: '/work/infobionic-heart-monitoring', gatsby: '/work/infobionic-heart-monitoring/' },
  { label: 'Personal Genome Project', next: '/work/personal-genome-project-vision', gatsby: '/work/personal-genome-project-vision/' },
  { label: 'StaffPlan', next: '/work/staffplan', gatsby: '/work/staffplan/' },
  { label: 'Care Cards', next: '/work/care-cards', gatsby: '/work/care-cards/' },
  { label: 'Partners GeneInsight', next: '/work/partners-geneinsight', gatsby: '/work/partners-geneinsight/' },
  { label: 'InsideTracker Nutrition', next: '/work/insidetracker-nutrition-science', gatsby: '/work/insidetracker-nutrition-science/' },
  { label: 'PainTrackr', next: '/work/paintrackr', gatsby: '/work/paintrackr/' },
  { label: 'Tabeeb Diagnostics', next: '/work/tabeeb-diagnostics', gatsby: '/work/tabeeb-diagnostics/' },

  // === Screenshot list #81-85 landing pages ===
  { label: 'AI Landing', next: '/ai', gatsby: '/ai/' },
  { label: 'Enterprise Landing', next: '/enterprise', gatsby: '/enterprise/' },
  { label: 'Government Landing', next: '/government', gatsby: '/government/' },
  { label: 'Patient Engagement', next: '/patient-engagement', gatsby: '/patient-engagement/' },
  { label: 'Open Source Health Design', next: '/open-source-health-design', gatsby: '/open-source-health-design/' },
]

const TOLERANCE = 0.20  // ±20% before flagging a count mismatch

const collectStats = `(() => {
  const broken = []
  const imgs = document.querySelectorAll('img')
  for (const img of imgs) {
    if (img.complete && img.naturalWidth === 0 && (img.src || img.srcset)) {
      const r = img.getBoundingClientRect()
      if (r.width > 20 || r.height > 20) {
        broken.push({ src: (img.src || '').slice(0, 200), w: Math.round(r.width), h: Math.round(r.height), alt: img.alt || '' })
      }
    }
  }
  const upNextHeading = Array.from(document.querySelectorAll('h3')).find((h) => /^up next$/i.test((h.textContent || '').trim()))
  const upNextSection = upNextHeading?.closest('section') || upNextHeading?.parentElement?.parentElement
  const upNextCount = upNextSection ? upNextSection.querySelectorAll('a').length : 0
  return {
    headings: document.querySelectorAll('h1,h2,h3').length,
    paragraphs: document.querySelectorAll('p').length,
    images: imgs.length,
    lists: document.querySelectorAll('ul,ol').length,
    sups: document.querySelectorAll('sup').length,
    iframes: document.querySelectorAll('iframe').length,
    upNextCount,
    broken,
  }
})()`

const browser = await puppeteer.launch({ headless: true })
const results = []

for (const page of PAGES) {
  const result = { label: page.label, next: page.next, gatsby: page.gatsby, issues: [] }
  const tab = await browser.newPage()
  await tab.setViewport({ width: 1440, height: 900 })

  // Next
  let nextStats
  try {
    const res = await tab.goto(NEXT_BASE + page.next, { waitUntil: 'networkidle2', timeout: 60000 })
    if (res.status() !== 200) {
      result.issues.push(`NEXT_HTTP_${res.status()}`)
    } else {
      await new Promise((r) => setTimeout(r, 2000))
      nextStats = await tab.evaluate(collectStats)
    }
  } catch (e) {
    result.issues.push(`NEXT_LOAD_ERROR: ${e.message.slice(0, 100)}`)
  }

  // Gatsby
  let gatsbyStats
  if (page.gatsby) {
    try {
      const res = await tab.goto(GATSBY_BASE + page.gatsby, { waitUntil: 'networkidle2', timeout: 60000 })
      if (res.status() !== 200) {
        result.issues.push(`GATSBY_HTTP_${res.status()}`)
      } else {
        await new Promise((r) => setTimeout(r, 1500))
        gatsbyStats = await tab.evaluate(collectStats)
      }
    } catch (e) {
      result.issues.push(`GATSBY_LOAD_ERROR: ${e.message.slice(0, 100)}`)
    }
  }

  if (nextStats) {
    if (nextStats.broken.length > 0) {
      result.issues.push(`BROKEN_IMAGES: ${nextStats.broken.length}`)
      result.brokenSamples = nextStats.broken.slice(0, 4)
    }
  }

  if (nextStats && gatsbyStats) {
    const compareKey = (key, label) => {
      const n = nextStats[key]
      const g = gatsbyStats[key]
      if (g === 0 && n === 0) return
      const diff = Math.abs(n - g) / Math.max(g, 1)
      if (diff > TOLERANCE) result.issues.push(`${label}: gatsby=${g}, next=${n} (Δ${Math.round(diff * 100)}%)`)
    }
    compareKey('headings', 'HEADINGS')
    compareKey('paragraphs', 'PARAGRAPHS')
    compareKey('images', 'IMAGES')
    compareKey('lists', 'LISTS')
    compareKey('sups', 'SUPS')
    if (gatsbyStats.upNextCount !== nextStats.upNextCount) {
      result.issues.push(`UPNEXT: gatsby=${gatsbyStats.upNextCount}, next=${nextStats.upNextCount}`)
    }
  }

  results.push(result)
  await tab.close()
  process.stdout.write(`${page.label}: ${result.issues.length === 0 ? 'OK' : result.issues.length + ' issue(s)'}\n`)
}

await browser.close()

console.log('\n=== Issues by page ===')
let totalIssues = 0
let pagesWithIssues = 0
for (const r of results) {
  if (r.issues.length === 0) continue
  pagesWithIssues++
  totalIssues += r.issues.length
  console.log(`\n${r.label} — ${r.next}`)
  for (const issue of r.issues) console.log(`  ${issue}`)
  if (r.brokenSamples) {
    for (const b of r.brokenSamples) console.log(`    broken (${b.w}x${b.h}): ${b.src}`)
  }
}

console.log(`\n${pagesWithIssues}/${results.length} pages with issues, ${totalIssues} total issues`)
