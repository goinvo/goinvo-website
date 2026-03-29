/**
 * Visual Page Comparison (Puppeteer)
 *
 * Opens a Gatsby page and its Next.js equivalent side-by-side,
 * takes screenshots, and compares computed styles of every
 * content element (headings, images, paragraphs, lists, sups, etc.)
 *
 * Usage:
 *   npx tsx scripts/compare-visual.ts fraud-waste-abuse-in-healthcare
 *   npx tsx scripts/compare-visual.ts fraud-waste-abuse-in-healthcare --screenshots
 *   npx tsx scripts/compare-visual.ts --all
 *
 * Requires: Next.js server on localhost:3000, puppeteer installed
 */

import puppeteer, { type Page } from 'puppeteer'
import { mkdirSync, writeFileSync } from 'fs'

const GATSBY_BASE = 'https://www.goinvo.com/vision'
const NEXTJS_BASE = 'http://localhost:3000/vision'
const SCREENSHOT_DIR = '.audit/screenshots'

// Slug mapping for pages where Gatsby uses a different slug
const SLUG_MAP: Record<string, string> = {
  'bathroom-to-healthroom': 'from-bathroom-to-healthroom',
  'care-plans': 'careplans',
  'healing-us-healthcare': 'us-healthcare',
  'oral-history-goinvo': 'an-oral-history',
  'understanding-ebola': 'ebola',
  'understanding-zika': 'zika',
}

interface ElementInfo {
  tag: string
  text: string
  classes: string
  index: number
  styles: {
    fontSize: string
    fontWeight: string
    fontFamily: string
    lineHeight: string
    color: string
    marginTop: string
    marginBottom: string
    marginLeft: string
    paddingLeft: string
    textTransform: string
    letterSpacing: string
    listStyleImage: string
    listStyleType: string
    width: string
    maxWidth: string
    display: string
  }
  rect: { width: number; height: number }
}

interface Diff {
  severity: 'critical' | 'high' | 'medium' | 'low'
  element: string
  property: string
  gatsby: string
  nextjs: string
}

async function extractElements(page: Page): Promise<ElementInfo[]> {
  return page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('.app__body') || document.body
    // Get all content elements in order
    const selectors = 'h1, h2, h3, h4, p, ul, ol, li, img, figure, figcaption, blockquote, sup, a.button, video, iframe'
    const elements = main.querySelectorAll(selectors)
    return Array.from(elements).map((el, i) => {
      const cs = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().substring(0, 80),
        classes: el.className || '',
        index: i,
        styles: {
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(),
          lineHeight: cs.lineHeight,
          color: cs.color,
          marginTop: cs.marginTop,
          marginBottom: cs.marginBottom,
          marginLeft: cs.marginLeft,
          paddingLeft: cs.paddingLeft,
          textTransform: cs.textTransform,
          letterSpacing: cs.letterSpacing,
          listStyleImage: cs.listStyleImage,
          listStyleType: cs.listStyleType,
          width: cs.width,
          maxWidth: cs.maxWidth,
          display: cs.display,
        },
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
      }
    })
  })
}

function matchElements(gatsby: ElementInfo[], nextjs: ElementInfo[]): { matched: [ElementInfo, ElementInfo][]; missingInNext: ElementInfo[]; extraInNext: ElementInfo[] } {
  const matched: [ElementInfo, ElementInfo][] = []
  const usedNext = new Set<number>()

  // Match headings first (by text similarity)
  const headingTags = new Set(['h1', 'h2', 'h3', 'h4'])

  for (const g of gatsby.filter(e => headingTags.has(e.tag))) {
    const gText = g.text.toLowerCase().substring(0, 30)
    const match = nextjs.find((n, i) =>
      !usedNext.has(i) && headingTags.has(n.tag) &&
      n.text.toLowerCase().substring(0, 30).includes(gText.substring(0, 20))
    )
    if (match) {
      usedNext.add(nextjs.indexOf(match))
      matched.push([g, match])
    }
  }

  // Match images by order
  const gImages = gatsby.filter(e => e.tag === 'img')
  const nImages = nextjs.filter((e, i) => e.tag === 'img' && !usedNext.has(i))
  for (let i = 0; i < Math.min(gImages.length, nImages.length); i++) {
    usedNext.add(nextjs.indexOf(nImages[i]))
    matched.push([gImages[i], nImages[i]])
  }

  // Match lists by order
  for (const listTag of ['ul', 'ol']) {
    const gLists = gatsby.filter(e => e.tag === listTag)
    const nLists = nextjs.filter((e, i) => e.tag === listTag && !usedNext.has(i))
    for (let i = 0; i < Math.min(gLists.length, nLists.length); i++) {
      usedNext.add(nextjs.indexOf(nLists[i]))
      matched.push([gLists[i], nLists[i]])
    }
  }

  // Match sups by order
  const gSups = gatsby.filter(e => e.tag === 'sup')
  const nSups = nextjs.filter((e, i) => e.tag === 'sup' && !usedNext.has(i))
  for (let i = 0; i < Math.min(gSups.length, nSups.length); i++) {
    usedNext.add(nextjs.indexOf(nSups[i]))
    matched.push([gSups[i], nSups[i]])
  }

  const missingInNext = gatsby.filter(g => !matched.some(([mg]) => mg === g) && headingTags.has(g.tag))
  const extraInNext = nextjs.filter((n, i) => !usedNext.has(i) && headingTags.has(n.tag))

  return { matched, missingInNext, extraInNext }
}

function compareStyles(g: ElementInfo, n: ElementInfo): Diff[] {
  const diffs: Diff[] = []
  const label = `<${g.tag}> "${g.text.substring(0, 40)}"`

  // Font checks for headings
  if (['h1', 'h2', 'h3', 'h4'].includes(g.tag)) {
    // Font family
    const gFont = g.styles.fontFamily.toLowerCase()
    const nFont = n.styles.fontFamily.toLowerCase()
    const gIsSerif = gFont.includes('jenson') || gFont.includes('serif')
    const nIsSerif = nFont.includes('jenson') || nFont.includes('serif')
    if (gIsSerif !== nIsSerif) {
      diffs.push({ severity: 'high', element: label, property: 'fontFamily', gatsby: g.styles.fontFamily, nextjs: n.styles.fontFamily })
    }

    // Font weight
    if (g.styles.fontWeight !== n.styles.fontWeight) {
      diffs.push({ severity: 'medium', element: label, property: 'fontWeight', gatsby: g.styles.fontWeight, nextjs: n.styles.fontWeight })
    }

    // Text transform
    if (g.styles.textTransform !== n.styles.textTransform) {
      diffs.push({ severity: 'medium', element: label, property: 'textTransform', gatsby: g.styles.textTransform, nextjs: n.styles.textTransform })
    }

    // Font size (allow 2px tolerance)
    const gSize = parseFloat(g.styles.fontSize)
    const nSize = parseFloat(n.styles.fontSize)
    if (Math.abs(gSize - nSize) > 2) {
      diffs.push({ severity: 'medium', element: label, property: 'fontSize', gatsby: g.styles.fontSize, nextjs: n.styles.fontSize })
    }

    // Margin bottom (spacing after heading)
    const gMb = parseFloat(g.styles.marginBottom)
    const nMb = parseFloat(n.styles.marginBottom)
    if (Math.abs(gMb - nMb) > 4) {
      diffs.push({ severity: 'medium', element: label, property: 'marginBottom', gatsby: g.styles.marginBottom, nextjs: n.styles.marginBottom })
    }

    // Color
    if (g.styles.color !== n.styles.color) {
      diffs.push({ severity: 'low', element: label, property: 'color', gatsby: g.styles.color, nextjs: n.styles.color })
    }
  }

  // Image checks
  if (g.tag === 'img') {
    // Width difference > 50px
    if (Math.abs(g.rect.width - n.rect.width) > 50) {
      diffs.push({ severity: 'high', element: `<img> (${g.text.substring(0, 30) || 'image'})`, property: 'width', gatsby: `${g.rect.width}px`, nextjs: `${n.rect.width}px` })
    }
  }

  // List checks
  if (g.tag === 'ul') {
    // Check list-style-image (should be star bullet)
    const gHasBullet = g.styles.listStyleImage !== 'none'
    const nHasBullet = n.styles.listStyleImage !== 'none'
    if (gHasBullet && !nHasBullet) {
      diffs.push({ severity: 'high', element: label, property: 'listStyleImage', gatsby: g.styles.listStyleImage, nextjs: n.styles.listStyleImage })
    }

    // Padding-left (gutter)
    const gPl = parseFloat(g.styles.paddingLeft)
    const nPl = parseFloat(n.styles.paddingLeft)
    if (Math.abs(gPl - nPl) > 10) {
      diffs.push({ severity: 'medium', element: label, property: 'paddingLeft', gatsby: g.styles.paddingLeft, nextjs: n.styles.paddingLeft })
    }
  }

  // Superscript checks
  if (g.tag === 'sup') {
    if (g.text !== n.text) {
      diffs.push({ severity: 'high', element: `<sup>`, property: 'text', gatsby: g.text, nextjs: n.text })
    }
  }

  return diffs
}

async function comparePage(slug: string, takeScreenshots: boolean) {
  const gatsbySlug = SLUG_MAP[slug] || slug
  const gatsbyUrl = `${GATSBY_BASE}/${gatsbySlug}/`
  const nextjsUrl = `${NEXTJS_BASE}/${slug}/`

  console.log(`\n  ${slug}...`)

  const browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,900', '--no-sandbox'] })

  try {
    const [gPage, nPage] = await Promise.all([browser.newPage(), browser.newPage()])
    await gPage.setViewport({ width: 1280, height: 900 })
    await nPage.setViewport({ width: 1280, height: 900 })

    // Load pages
    const [gRes, nRes] = await Promise.all([
      gPage.goto(gatsbyUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null),
      nPage.goto(nextjsUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
    ])

    if (!gRes || gRes.status() !== 200) {
      console.log(`    ⚠️  Gatsby page not found (${gatsbyUrl})`)
      await browser.close()
      return null
    }
    if (!nRes || nRes.status() !== 200) {
      console.log(`    ⚠️  Next.js page not reachable (${nextjsUrl})`)
      await browser.close()
      return null
    }

    // Wait for images to load
    await Promise.all([
      gPage.waitForSelector('img', { timeout: 5000 }).catch(() => {}),
      nPage.waitForSelector('img', { timeout: 5000 }).catch(() => {}),
    ])

    // Screenshots
    if (takeScreenshots) {
      mkdirSync(SCREENSHOT_DIR, { recursive: true })
      await gPage.screenshot({ path: `${SCREENSHOT_DIR}/${slug}-gatsby.png`, fullPage: true })
      await nPage.screenshot({ path: `${SCREENSHOT_DIR}/${slug}-nextjs.png`, fullPage: true })
      console.log(`    📸 Screenshots saved to ${SCREENSHOT_DIR}/`)
    }

    // Extract elements
    const gElements = await extractElements(gPage)
    const nElements = await extractElements(nPage)

    // Match and compare
    const { matched, missingInNext, extraInNext } = matchElements(gElements, nElements)

    const allDiffs: Diff[] = []

    for (const [gEl, nEl] of matched) {
      allDiffs.push(...compareStyles(gEl, nEl))
    }

    for (const g of missingInNext) {
      allDiffs.push({ severity: 'critical', element: `<${g.tag}> "${g.text.substring(0, 40)}"`, property: 'MISSING', gatsby: 'exists', nextjs: 'not found' })
    }
    for (const n of extraInNext) {
      allDiffs.push({ severity: 'critical', element: `<${n.tag}> "${n.text.substring(0, 40)}"`, property: 'EXTRA', gatsby: 'not found', nextjs: 'exists' })
    }

    // Element counts
    const gCounts = { img: gElements.filter(e => e.tag === 'img').length, sup: gElements.filter(e => e.tag === 'sup').length, ul: gElements.filter(e => e.tag === 'ul').length }
    const nCounts = { img: nElements.filter(e => e.tag === 'img').length, sup: nElements.filter(e => e.tag === 'sup').length, ul: nElements.filter(e => e.tag === 'ul').length }

    if (Math.abs(gCounts.img - nCounts.img) >= 2) {
      allDiffs.push({ severity: 'high', element: 'images', property: 'count', gatsby: `${gCounts.img}`, nextjs: `${nCounts.img}` })
    }
    if (Math.abs(gCounts.sup - nCounts.sup) >= 2) {
      allDiffs.push({ severity: 'high', element: 'superscripts', property: 'count', gatsby: `${gCounts.sup}`, nextjs: `${nCounts.sup}` })
    }
    if (Math.abs(gCounts.ul - nCounts.ul) >= 1) {
      allDiffs.push({ severity: 'medium', element: 'lists (ul)', property: 'count', gatsby: `${gCounts.ul}`, nextjs: `${nCounts.ul}` })
    }

    // Report
    if (allDiffs.length === 0) {
      console.log(`    ✅ Visual match`)
    } else {
      const crits = allDiffs.filter(d => d.severity === 'critical').length
      const highs = allDiffs.filter(d => d.severity === 'high').length
      console.log(`    ❌ ${allDiffs.length} differences (${crits}C ${highs}H)`)
      for (const d of allDiffs.filter(d => d.severity === 'critical' || d.severity === 'high')) {
        const icon = d.severity === 'critical' ? '🔴' : '🟠'
        console.log(`      ${icon} ${d.element} — ${d.property}: Gatsby="${d.gatsby}" Next.js="${d.nextjs}"`)
      }
      const medLow = allDiffs.filter(d => d.severity === 'medium' || d.severity === 'low')
      if (medLow.length > 0) {
        console.log(`      ℹ️  +${medLow.length} medium/low (use --verbose)`)
      }
    }

    await browser.close()
    return allDiffs
  } catch (err) {
    await browser.close()
    console.log(`    ❌ Error: ${(err as Error).message}`)
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const screenshots = args.includes('--screenshots')
  const verbose = args.includes('--verbose')
  const slugArg = args.find(a => !a.startsWith('--'))

  if (!slugArg) {
    console.log('Usage: npx tsx scripts/compare-visual.ts <slug> [--screenshots] [--verbose]')
    process.exit(1)
  }

  console.log(`\n🔍 Visual comparison: ${slugArg}`)
  console.log(`   Gatsby: ${GATSBY_BASE}/${SLUG_MAP[slugArg] || slugArg}/`)
  console.log(`   Next.js: ${NEXTJS_BASE}/${slugArg}/`)

  const diffs = await comparePage(slugArg, screenshots)

  if (diffs && verbose) {
    console.log('\n  All differences:')
    for (const d of diffs) {
      const icons: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' }
      console.log(`    ${icons[d.severity]} ${d.element} — ${d.property}: Gatsby="${d.gatsby}" Next.js="${d.nextjs}"`)
    }
  }

  console.log()
}

main().catch(console.error)
