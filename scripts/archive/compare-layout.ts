/**
 * Pixel-level layout comparison script.
 *
 * Uses Puppeteer to load both Gatsby and Next.js pages, then queries
 * exact bounding rects, computed styles, and positions of key elements.
 * Reports pixel differences.
 *
 * Usage: npx tsx scripts/compare-layout.ts [section]
 *   section: "reviews" (default), "tabs", "subscribe", etc.
 *
 * Requires: npm install puppeteer
 * Requires: Next.js dev server on localhost:3000
 */

import puppeteer, { type Page } from 'puppeteer'

const GATSBY_URL = 'https://goinvo.com/vision/'
const NEXTJS_URL = 'http://localhost:3000/vision/'

interface ElementMetrics {
  tag: string
  text: string
  rect: { x: number; y: number; width: number; height: number }
  styles: Record<string, string>
}

async function getElementMetrics(page: Page, selector: string, label: string): Promise<ElementMetrics | null> {
  return page.evaluate((sel, lbl) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().substring(0, 60),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      styles: {
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(),
        lineHeight: cs.lineHeight,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        margin: cs.margin,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        textAlign: cs.textAlign,
        display: cs.display,
        position: cs.position,
        borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
        borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor,
        boxShadow: cs.boxShadow,
        borderRadius: cs.borderRadius,
        width: cs.width,
        maxWidth: cs.maxWidth,
        minWidth: cs.minWidth,
        gap: cs.gap,
        opacity: cs.opacity,
        textTransform: cs.textTransform,
        letterSpacing: cs.letterSpacing,
        textDecoration: cs.textDecorationLine || cs.textDecoration,
      },
    }
  }, selector, label)
}

async function getAllMetrics(page: Page, selectors: Record<string, string>): Promise<Record<string, ElementMetrics | null>> {
  const results: Record<string, ElementMetrics | null> = {}
  for (const [label, selector] of Object.entries(selectors)) {
    results[label] = await getElementMetrics(page, selector, label)
  }
  return results
}

function compareMetrics(label: string, gatsby: ElementMetrics | null, nextjs: ElementMetrics | null): string[] {
  const diffs: string[] = []
  if (!gatsby && !nextjs) return diffs
  if (!gatsby) { diffs.push(`${label}: EXISTS in Next.js but NOT in Gatsby`); return diffs }
  if (!nextjs) { diffs.push(`${label}: EXISTS in Gatsby but NOT in Next.js`); return diffs }

  // Compare rects
  const rd = gatsby.rect
  const rn = nextjs.rect
  if (Math.abs(rd.width - rn.width) > 5) diffs.push(`${label} WIDTH: Gatsby=${rd.width}px Next.js=${rn.width}px (diff ${rn.width - rd.width}px)`)
  if (Math.abs(rd.height - rn.height) > 5) diffs.push(`${label} HEIGHT: Gatsby=${rd.height}px Next.js=${rn.height}px (diff ${rn.height - rd.height}px)`)

  // Compare styles
  const styleChecks = [
    'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'color',
    'backgroundColor', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'marginTop', 'marginBottom', 'textAlign', 'display', 'position',
    'borderRadius', 'textTransform', 'letterSpacing', 'opacity', 'gap',
  ]
  for (const prop of styleChecks) {
    const gVal = gatsby.styles[prop] || ''
    const nVal = nextjs.styles[prop] || ''
    if (gVal !== nVal && gVal !== '' && nVal !== '') {
      // Skip minor differences
      if (prop === 'color' || prop === 'backgroundColor') {
        // Normalize rgb to compare
        if (gVal.replace(/\s/g, '') === nVal.replace(/\s/g, '')) continue
      }
      diffs.push(`${label} ${prop}: Gatsby="${gVal}" Next.js="${nVal}"`)
    }
  }

  return diffs
}

async function compareReviewSection() {
  console.log('\n🔍 Launching browsers for pixel comparison...\n')

  const browser = await puppeteer.launch({ headless: true, args: ['--window-size=1280,900'] })

  const [gatsbyPage, nextjsPage] = await Promise.all([
    browser.newPage(),
    browser.newPage(),
  ])

  await gatsbyPage.setViewport({ width: 1280, height: 900 })
  await nextjsPage.setViewport({ width: 1280, height: 900 })

  console.log('  Loading Gatsby page...')
  await gatsbyPage.goto(GATSBY_URL, { waitUntil: 'networkidle2', timeout: 30000 })

  console.log('  Loading Next.js page...')
  try {
    await nextjsPage.goto(NEXTJS_URL, { waitUntil: 'networkidle2', timeout: 15000 })
  } catch {
    console.log('  ⚠️  Next.js page failed to load. Is dev server running?')
    await browser.close()
    return
  }

  // Define selectors for the Reviews section on each site
  const gatsbySelectors: Record<string, string> = {
    // Heading
    'reviews-heading': '.carousel h2, h2.header--xl:last-of-type',
    // First tab
    'tab-first': '.carousel__menu-item:first-child',
    'tab-first-button': '.carousel__menu-item:first-child .button',
    'tab-list': '.carousel__menu-items',
    // Image
    'review-image': '.gradient-image-columns__image',
    // Quote
    'review-quote': '.quote__content',
    // CTA button
    'review-cta': '.gradient-image-columns__content .button--primary',
    // Dots
    'review-dots': '.slick-dots',
    'review-dot-first': '.slick-dots li:first-child button',
    // Gray container
    'review-container': '.carousel__carousel-container',
    // Subscribe form
    'subscribe-heading': '.form-subscribe-wrapper h2',
  }

  // For Next.js, use a smarter approach: find elements by text content
  const nextjsSelectorsViaJS: Record<string, string> = {}
  const nextjsMetricsOverride: Record<string, ElementMetrics | null> = {}

  // We'll query Next.js elements by text content instead of CSS selectors
  const nextjsTextQueries: Record<string, { text: string; tag?: string; nth?: number }> = {
    'reviews-heading': { text: 'Reviews for', tag: 'h2' },
    'tab-first-button': { text: 'Inspired EHRs', tag: 'button' },
    'review-quote': { text: 'I sent this around', tag: 'p' },
    'subscribe-heading': { text: 'Subscribe to our newsletter' },
  }

  for (const [label, query] of Object.entries(nextjsTextQueries)) {
    nextjsMetricsOverride[label] = await nextjsPage.evaluate((q) => {
      const allEls = document.querySelectorAll(q.tag || '*')
      for (const el of allEls) {
        if (el.textContent?.includes(q.text)) {
          const rect = el.getBoundingClientRect()
          const cs = getComputedStyle(el)
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().substring(0, 60),
            rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
            styles: {
              fontSize: cs.fontSize, fontWeight: cs.fontWeight,
              fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(),
              lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor,
              padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom,
              paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight,
              margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom,
              textAlign: cs.textAlign, display: cs.display, position: cs.position,
              borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
              borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor,
              boxShadow: cs.boxShadow, borderRadius: cs.borderRadius,
              width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth,
              gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform,
              letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration,
            },
          }
        }
      }
      return null
    }, query)
  }

  // For structural elements, use position-based queries
  nextjsMetricsOverride['tab-first'] = await nextjsPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Inspired EHRs'))
    const el = btn?.parentElement
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { tag: el.tagName.toLowerCase(), text: 'tab-first', rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom, textAlign: cs.textAlign, display: cs.display, position: cs.position, borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth, gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration } }
  })

  nextjsMetricsOverride['tab-list'] = await nextjsPage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Inspired EHRs'))
    const el = btn?.parentElement?.parentElement
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { tag: el.tagName.toLowerCase(), text: 'tab-list', rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom, textAlign: cs.textAlign, display: cs.display, position: cs.position, borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth, gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration } }
  })

  // CTA button - find by text
  nextjsMetricsOverride['review-cta'] = await nextjsPage.evaluate(() => {
    const el = Array.from(document.querySelectorAll('a')).find(a => a.textContent?.trim().includes('READ THE CASE STUDY') || a.textContent?.trim().includes('Read the Case Study') || a.textContent?.trim().includes('CASE STUDY'))
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { tag: el.tagName.toLowerCase(), text: (el.textContent||'').trim().substring(0,60), rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom, textAlign: cs.textAlign, display: cs.display, position: cs.position, borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth, gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration } }
  })

  // Image - find by data attribute
  nextjsMetricsOverride['review-image'] = await nextjsPage.evaluate(() => {
    const el = document.querySelector('[data-review-image]')
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { tag: el.tagName.toLowerCase(), text: 'review-image-container', rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom, textAlign: cs.textAlign, display: cs.display, position: cs.position, borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth, gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration } }
  })

  // Gray container
  nextjsMetricsOverride['review-container'] = await nextjsPage.evaluate(() => {
    const el = document.querySelector('[data-review-container]') || Array.from(document.querySelectorAll('div')).find(d => d.classList.contains('bg-gray-light'))
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { tag: el.tagName.toLowerCase(), text: 'review-container', rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom, textAlign: cs.textAlign, display: cs.display, position: cs.position, borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth, gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration } }
  })

  // Dots container
  nextjsMetricsOverride['review-dots'] = await nextjsPage.evaluate(() => {
    const grayBg = Array.from(document.querySelectorAll('div')).find(d => d.classList.contains('bg-gray-light'))
    if (!grayBg) return null
    const btns = grayBg.querySelectorAll('button[aria-label^="Review"]')
    if (btns.length === 0) return null
    const el = btns[0].parentElement
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { tag: el.tagName.toLowerCase(), text: 'review-dots', rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom, textAlign: cs.textAlign, display: cs.display, position: cs.position, borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth, gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration } }
  })

  nextjsMetricsOverride['review-dot-first'] = await nextjsPage.evaluate(() => {
    const grayBg = Array.from(document.querySelectorAll('div')).find(d => d.classList.contains('bg-gray-light'))
    if (!grayBg) return null
    const el = grayBg.querySelector('button[aria-label^="Review"]')
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { tag: el.tagName.toLowerCase(), text: 'review-dot-first', rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }, styles: { fontSize: cs.fontSize, fontWeight: cs.fontWeight, fontFamily: cs.fontFamily.split(',')[0].replace(/"/g, '').trim(), lineHeight: cs.lineHeight, color: cs.color, backgroundColor: cs.backgroundColor, padding: cs.padding, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, margin: cs.margin, marginTop: cs.marginTop, marginBottom: cs.marginBottom, textAlign: cs.textAlign, display: cs.display, position: cs.position, borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor, boxShadow: cs.boxShadow, borderRadius: cs.borderRadius, width: cs.width, maxWidth: cs.maxWidth, minWidth: cs.minWidth, gap: cs.gap, opacity: cs.opacity, textTransform: cs.textTransform, letterSpacing: cs.letterSpacing, textDecoration: cs.textDecorationLine || cs.textDecoration } }
  })

  const nextjsSelectors: Record<string, string> = {}

  console.log('\n  Querying Gatsby elements...')
  const gatsbyMetrics = await getAllMetrics(gatsbyPage, gatsbySelectors)

  console.log('  Querying Next.js elements...')
  const nextjsMetricsFromSelectors = await getAllMetrics(nextjsPage, nextjsSelectors)
  const nextjsMetrics = { ...nextjsMetricsFromSelectors, ...nextjsMetricsOverride }

  console.log('\n' + '─'.repeat(70))
  console.log('REVIEW SECTION — PIXEL COMPARISON')
  console.log('─'.repeat(70))

  let totalDiffs = 0
  for (const label of Object.keys(gatsbySelectors)) {
    const diffs = compareMetrics(label, gatsbyMetrics[label], nextjsMetrics[label])
    if (diffs.length > 0) {
      totalDiffs += diffs.length
      for (const d of diffs) {
        console.log(`  ❌ ${d}`)
      }
    } else if (gatsbyMetrics[label] && nextjsMetrics[label]) {
      console.log(`  ✅ ${label}: matches`)
    } else {
      console.log(`  ⚠️  ${label}: could not find element on one or both pages`)
    }
  }

  // Also dump raw metrics for manual inspection
  console.log('\n' + '─'.repeat(70))
  console.log('RAW METRICS (for manual inspection)')
  console.log('─'.repeat(70))
  for (const label of Object.keys(gatsbySelectors)) {
    const g = gatsbyMetrics[label]
    const n = nextjsMetrics[label]
    if (g || n) {
      console.log(`\n  ${label}:`)
      if (g) console.log(`    Gatsby:  ${g.rect.width}x${g.rect.height} @ (${g.rect.x},${g.rect.y}) | fontSize=${g.styles.fontSize} fontWeight=${g.styles.fontWeight} padding=${g.styles.paddingTop}/${g.styles.paddingRight}/${g.styles.paddingBottom}/${g.styles.paddingLeft} textAlign=${g.styles.textAlign}`)
      if (n) console.log(`    Next.js: ${n.rect.width}x${n.rect.height} @ (${n.rect.x},${n.rect.y}) | fontSize=${n.styles.fontSize} fontWeight=${n.styles.fontWeight} padding=${n.styles.paddingTop}/${n.styles.paddingRight}/${n.styles.paddingBottom}/${n.styles.paddingLeft} textAlign=${n.styles.textAlign}`)
    }
  }

  console.log(`\n${'─'.repeat(70)}`)
  console.log(`Total differences: ${totalDiffs}`)
  console.log()

  await browser.close()
}

compareReviewSection().catch(console.error)
