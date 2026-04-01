/**
 * Regression Test Suite
 *
 * Takes a snapshot of key CSS properties on a sample of pages, then
 * compares against a baseline. Detects regressions like:
 * - Global heading size/weight/font changes
 * - Paragraph spacing or color changes
 * - Border/shadow removal
 * - List bullet style changes
 * - Hero image disappearance
 *
 * Usage:
 *   npx tsx scripts/regression-test.ts --baseline    # Save current state as baseline
 *   npx tsx scripts/regression-test.ts               # Compare against baseline
 *   npx tsx scripts/regression-test.ts --update      # Update baseline after intentional changes
 *
 * Requires: Next.js server on localhost:3000
 */

import puppeteer, { type Page } from 'puppeteer'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

const BASE_URL = 'http://localhost:3000'
const BASELINE_PATH = '.audit/regression-baseline.json'

// Sample pages that cover all major templates and content types
const SAMPLE_PAGES = [
  // Vision pages (Sanity [slug] route)
  { url: '/vision/vapepocolypse', label: 'Vision: vapepocolypse' },
  { url: '/vision/healthcare-ai', label: 'Vision: healthcare-ai' },
  { url: '/vision/coronavirus', label: 'Vision: coronavirus' },
  { url: '/vision/ai-design-certification', label: 'Vision: ai-design-cert' },
  { url: '/vision/health-design-thinking', label: 'Vision: health-design-thinking' },
  { url: '/vision/fraud-waste-abuse-in-healthcare', label: 'Vision: fraud-waste-abuse' },
  // Case studies
  { url: '/work/hgraph', label: 'Case Study: hgraph' },
  { url: '/work/maya-ehr', label: 'Case Study: maya-ehr' },
  { url: '/work/tabeeb-diagnostics', label: 'Case Study: tabeeb' },
  // Legacy ports
  { url: '/vision/disrupt', label: 'Legacy: disrupt' },
  { url: '/vision/understanding-zika', label: 'Legacy: zika' },
  { url: '/vision/killer-truths', label: 'Legacy: killer-truths' },
  // Main pages
  { url: '/', label: 'Home' },
  { url: '/work', label: 'Work listing' },
  { url: '/vision', label: 'Vision listing' },
  { url: '/about', label: 'About' },
]

interface ElementSnapshot {
  selector: string
  count: number
  samples: {
    text: string
    fontSize: string
    fontWeight: string
    fontFamily: string
    color: string
    marginTop: string
    marginBottom: string
    textTransform: string
    letterSpacing: string
    borderStyle: string
    display: string
    listStyleImage: string
  }[]
}

interface PageSnapshot {
  url: string
  label: string
  heroImageExists: boolean
  pageHeight: number
  elements: Record<string, ElementSnapshot>
}

async function snapshotPage(page: Page, url: string, label: string): Promise<PageSnapshot> {
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle2', timeout: 20000 })
  await new Promise(r => setTimeout(r, 500))

  return page.evaluate((lbl: string, pageUrl: string) => {
    const selectors: Record<string, string> = {
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      p: 'p',
      ul: 'ul',
      'ul li': 'ul li',
      img: 'img',
      blockquote: 'blockquote',
      a: 'a',
      video: 'video',
      iframe: 'iframe',
    }

    const elements: Record<string, { selector: string; count: number; samples: any[] }> = {}

    for (const [name, sel] of Object.entries(selectors)) {
      const els = document.querySelectorAll(sel)
      const samples: any[] = []

      // Sample first 3 elements of each type
      for (let i = 0; i < Math.min(3, els.length); i++) {
        const el = els[i]
        const cs = getComputedStyle(el)
        samples.push({
          text: (el.textContent || '').trim().substring(0, 50),
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(),
          color: cs.color,
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom,
          textTransform: cs.textTransform,
          letterSpacing: cs.letterSpacing,
          borderStyle: cs.borderTopStyle,
          display: cs.display,
          listStyleImage: cs.listStyleImage === 'none' ? 'none' : 'custom',
        })
      }

      elements[name] = { selector: sel, count: els.length, samples }
    }

    // Check hero image
    const heroImg = document.querySelector('[style*="view-transition"], .hero img, .persistent-hero img')
    const heroImageExists = !!heroImg || document.querySelectorAll('img').length > 0

    return {
      url: pageUrl,
      label: lbl,
      heroImageExists,
      pageHeight: document.documentElement.scrollHeight,
      elements,
    }
  }, label, url) as Promise<PageSnapshot>
}

interface Regression {
  page: string
  element: string
  property: string
  baseline: string
  current: string
  severity: 'critical' | 'warning'
}

function compareSnapshots(baseline: PageSnapshot, current: PageSnapshot): Regression[] {
  const regressions: Regression[] = []
  const page = current.label

  // Check hero image
  if (baseline.heroImageExists && !current.heroImageExists) {
    regressions.push({ page, element: 'hero', property: 'exists', baseline: 'true', current: 'false', severity: 'critical' })
  }

  // Check page height (>50% change is suspicious)
  if (Math.abs(current.pageHeight - baseline.pageHeight) > baseline.pageHeight * 0.5) {
    regressions.push({ page, element: 'page', property: 'height', baseline: `${baseline.pageHeight}px`, current: `${current.pageHeight}px`, severity: 'warning' })
  }

  // Compare element counts
  for (const [name, bEl] of Object.entries(baseline.elements)) {
    const cEl = current.elements[name]
    if (!cEl) {
      regressions.push({ page, element: name, property: 'exists', baseline: `${bEl.count} elements`, current: '0 elements', severity: 'critical' })
      continue
    }

    // Count changes >50% are suspicious
    if (bEl.count > 0 && cEl.count === 0) {
      regressions.push({ page, element: name, property: 'count', baseline: `${bEl.count}`, current: '0', severity: 'critical' })
    } else if (bEl.count > 2 && Math.abs(cEl.count - bEl.count) > bEl.count * 0.5) {
      regressions.push({ page, element: name, property: 'count', baseline: `${bEl.count}`, current: `${cEl.count}`, severity: 'warning' })
    }

    // Compare style samples
    const criticalProps = ['fontSize', 'fontWeight', 'fontFamily', 'color', 'display'] as const
    const warningProps = ['marginBottom', 'textTransform', 'letterSpacing', 'listStyleImage', 'borderStyle'] as const

    for (let i = 0; i < Math.min(bEl.samples.length, cEl.samples.length); i++) {
      const bSample = bEl.samples[i]
      const cSample = cEl.samples[i]

      for (const prop of criticalProps) {
        if (bSample[prop] !== cSample[prop]) {
          // Font family: only flag if serif/sans category changed
          if (prop === 'fontFamily') {
            const bSerif = bSample[prop].toLowerCase().includes('jenson') || bSample[prop].toLowerCase().includes('georgia')
            const cSerif = cSample[prop].toLowerCase().includes('jenson') || cSample[prop].toLowerCase().includes('georgia')
            if (bSerif === cSerif) continue
          }
          regressions.push({
            page, element: `${name}[${i}] "${bSample.text?.substring(0, 20)}"`,
            property: prop, baseline: bSample[prop], current: cSample[prop], severity: 'critical',
          })
        }
      }

      for (const prop of warningProps) {
        if (bSample[prop] !== cSample[prop]) {
          regressions.push({
            page, element: `${name}[${i}] "${bSample.text?.substring(0, 20)}"`,
            property: prop, baseline: bSample[prop], current: cSample[prop], severity: 'warning',
          })
        }
      }
    }
  }

  return regressions
}

async function main() {
  const args = process.argv.slice(2)
  const isBaseline = args.includes('--baseline')
  const isUpdate = args.includes('--update')

  // Verify server is running
  try {
    const res = await fetch(`${BASE_URL}/`)
    if (!res.ok) throw new Error(`Server returned ${res.status}`)
  } catch {
    console.error('ERROR: Next.js server not running at ' + BASE_URL)
    console.error('Start it with: npx next build && npx next start -p 3000')
    process.exit(1)
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  console.log(`\n🧪 Regression Test — ${SAMPLE_PAGES.length} pages`)

  const snapshots: PageSnapshot[] = []
  for (const sp of SAMPLE_PAGES) {
    process.stdout.write(`  ${sp.label}... `)
    try {
      const snapshot = await snapshotPage(page, sp.url, sp.label)
      snapshots.push(snapshot)
      console.log(`OK (${snapshot.elements.h2?.count || 0} h2, ${snapshot.elements.p?.count || 0} p, ${snapshot.elements.img?.count || 0} img)`)
    } catch (err) {
      console.log(`FAIL: ${(err as Error).message.substring(0, 60)}`)
    }
  }

  await browser.close()

  if (isBaseline || isUpdate) {
    mkdirSync('.audit', { recursive: true })
    writeFileSync(BASELINE_PATH, JSON.stringify(snapshots, null, 2))
    console.log(`\n✅ Baseline saved to ${BASELINE_PATH} (${snapshots.length} pages)`)
    return
  }

  // Compare against baseline
  if (!existsSync(BASELINE_PATH)) {
    console.error('\n❌ No baseline found. Run with --baseline first.')
    process.exit(1)
  }

  const baseline: PageSnapshot[] = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'))
  const allRegressions: Regression[] = []

  for (const current of snapshots) {
    const base = baseline.find(b => b.url === current.url)
    if (!base) {
      console.log(`  ⚠️  No baseline for ${current.label}`)
      continue
    }
    const regs = compareSnapshots(base, current)
    allRegressions.push(...regs)
  }

  // Report
  const critical = allRegressions.filter(r => r.severity === 'critical')
  const warnings = allRegressions.filter(r => r.severity === 'warning')

  if (allRegressions.length === 0) {
    console.log('\n✅ No regressions detected!')
  } else {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`REGRESSIONS: ${critical.length} critical, ${warnings.length} warnings`)
    console.log(`${'═'.repeat(60)}`)

    for (const r of critical) {
      console.log(`  🔴 ${r.page} — ${r.element} ${r.property}: "${r.baseline}" → "${r.current}"`)
    }
    for (const r of warnings.slice(0, 20)) {
      console.log(`  🟡 ${r.page} — ${r.element} ${r.property}: "${r.baseline}" → "${r.current}"`)
    }
    if (warnings.length > 20) {
      console.log(`  ... and ${warnings.length - 20} more warnings`)
    }

    if (critical.length > 0) {
      console.log(`\n❌ ${critical.length} CRITICAL regressions found. Fix before deploying.`)
      process.exit(1)
    }
  }

  console.log()
}

main().catch(console.error)
