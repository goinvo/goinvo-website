/**
 * Deep Element-Level Style Audit
 *
 * For each page (vision or case study), this script:
 * 1. Opens Gatsby + Next.js versions in Puppeteer
 * 2. Identifies every section (by h2/section boundaries)
 * 3. Lists every element in each section with computed styles
 * 4. Lists any interactive components (scripts, data attributes, click handlers)
 * 5. Compares element-by-element and reports all mismatches
 *
 * Usage:
 *   npx tsx scripts/deep-audit.ts coronavirus                 # single vision page
 *   npx tsx scripts/deep-audit.ts --section vision             # all vision pages
 *   npx tsx scripts/deep-audit.ts --section work               # all case studies
 *   npx tsx scripts/deep-audit.ts coronavirus --screenshots    # with screenshots
 *   npx tsx scripts/deep-audit.ts coronavirus --json           # JSON output to .audit/
 *   npx tsx scripts/deep-audit.ts coronavirus --verbose        # show all elements, not just diffs
 *
 * Requires: Next.js server on localhost:3000, puppeteer installed
 */

import puppeteer, { type Page, type Browser } from 'puppeteer'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ── Configuration ──────────────────────────────────────────────────────────

const GATSBY_VISION_BASE = 'https://www.goinvo.com/vision'
const GATSBY_WORK_BASE = 'https://www.goinvo.com/work'
const NEXTJS_BASE = 'http://localhost:3000'
const SCREENSHOT_DIR = '.audit/deep-screenshots'
const REPORT_DIR = '.audit/deep-reports'

/** Vision slug mapping: Next.js slug → Gatsby slug (null = same) */
const VISION_SLUG_MAP: Record<string, string | null> = {
  'bathroom-to-healthroom': 'from-bathroom-to-healthroom',
  'care-plans': 'careplans',
  'healing-us-healthcare': 'us-healthcare',
  'oral-history-goinvo': 'an-oral-history',
  'understanding-ebola': 'ebola',
  'understanding-zika': 'zika',
  // Pages that exist ONLY in Next.js (legacy HTML ports, no Gatsby equivalent)
  'disrupt': null,           // legacy HTML, not in Gatsby
  'print-big': null,         // legacy HTML
  'killer-truths': null,     // legacy HTML
  'ebola-care-guideline': null, // legacy HTML
  'digital-healthcare': null,   // legacy HTML
  'redesign-democracy': null,   // legacy HTML
  'health-visualizations': null, // legacy HTML
  'experiments': null,           // legacy HTML
}

// Legacy pages that don't exist on Gatsby — skip Gatsby comparison, do standalone audit
const LEGACY_ONLY = new Set([
  'disrupt', 'print-big', 'killer-truths', 'ebola-care-guideline',
  'digital-healthcare', 'redesign-democracy', 'health-visualizations',
  'experiments', 'bathroom-to-healthroom', 'care-plans', 'healing-us-healthcare',
  'oral-history-goinvo', 'understanding-ebola', 'understanding-zika',
])

// Vision pages with Gatsby source (for comparison)
const VISION_PAGES_WITH_GATSBY = [
  'ai-design-certification',
  'augmented-clinical-decision-support',
  'coronavirus',
  'determinants-of-health',
  'digital-health-trends-2022',
  'eligibility-engine',
  'faces-in-health-communication',
  'fraud-waste-abuse-in-healthcare',
  'health-design-thinking',
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
  'rethinking-ai-beyond-chat',
  'test-treat-trace',
  'us-healthcare-problems',
  'vapepocolypse',
  'virtual-care',
  'virtual-diabetes-care',
  'visual-storytelling-with-genai',
  'who-uses-my-health-data',
]

// ── Types ──────────────────────────────────────────────────────────────────

interface ElementDetail {
  tag: string
  text: string                // first 120 chars
  classes: string
  id: string
  sectionIndex: number        // which section (0-based)
  sectionHeading: string      // section heading text
  indexInSection: number      // position within section
  isInteractive: boolean      // has onclick, data-*, or is button/input
  interactiveType?: string    // e.g., 'onclick', 'data-slick', 'button'
  styles: Record<string, string>
  rect: { x: number; y: number; width: number; height: number }
}

interface SectionDetail {
  index: number
  heading: string             // section heading (h2 text or "Hero"/"Header"/"Footer")
  tag: string                 // container tag (section, div, header, etc.)
  classes: string
  background: string          // computed background color
  elementCount: number
  interactiveCount: number
  elements: ElementDetail[]
}

interface SpecialElement {
  type: 'video' | 'iframe' | 'canvas' | 'fixed' | 'sticky' | 'animated' | 'scroll-handler'
  tag: string
  text: string
  details: string  // e.g., video src, animation name, position value
}

interface PageAudit {
  url: string
  totalElements: number
  totalSections: number
  totalInteractive: number
  specialElements: SpecialElement[]
  sections: SectionDetail[]
}

interface StyleDiff {
  section: string
  elementTag: string
  elementText: string
  property: string
  gatsbyValue: string
  nextjsValue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

interface PageReport {
  slug: string
  gatsbyUrl: string
  nextjsUrl: string
  gatsby: PageAudit | null
  nextjs: PageAudit | null
  diffs: StyleDiff[]
  missingSections: string[]
  extraSections: string[]
  missingElements: { section: string; tag: string; text: string }[]
  extraElements: { section: string; tag: string; text: string }[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    totalDiffs: number
  }
}

// ── Style properties to capture ────────────────────────────────────────────

const STYLE_PROPS = [
  'fontSize', 'fontWeight', 'fontFamily', 'fontStyle',
  'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'textDecoration',
  'color', 'backgroundColor', 'opacity',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderTopColor', 'borderTopStyle',
  'borderBottomWidth', 'borderBottomColor', 'borderBottomStyle',
  'display', 'position', 'float',
  'width', 'maxWidth', 'minHeight',
  'listStyleType', 'listStyleImage',
  'boxShadow',
  'verticalAlign',
] as const

// ── Element extraction (runs in browser context) ───────────────────────────

async function extractPageAudit(page: Page, url: string): Promise<PageAudit> {
  return page.evaluate((styleProps: string[]) => {
    const body = document.body
    const main = document.querySelector('main') || document.querySelector('.app__body') || body

    // Find all content-bearing elements
    const contentSelector = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'ul', 'ol', 'li',
      'img', 'figure', 'figcaption',
      'blockquote', 'sup',
      'a', 'button', 'input',
      'video', 'iframe',
      'table', 'tr', 'td', 'th',
      'svg',
      'hr',
      'pre', 'code',
    ].join(', ')

    // Identify sections by walking the DOM for section boundaries
    // A "section" starts at: <section>, or a top-level div with a h2/h3, or specific containers
    const sections: {
      heading: string
      tag: string
      classes: string
      background: string
      container: Element
      elements: Element[]
    }[] = []

    // Strategy: divide the page into sections by h2 boundaries
    const allElements = Array.from(main.querySelectorAll(contentSelector))

    // Group elements by their closest section ancestor or by h2 boundaries
    let currentSection = {
      heading: 'Page Header',
      tag: 'header',
      classes: '',
      background: 'transparent',
      container: main,
      elements: [] as Element[],
    }

    let sectionStarted = false

    for (const el of allElements) {
      // Skip elements not visible
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      // Skip elements in header/nav/footer
      if (el.closest('header.site-header, nav.site-nav, footer.site-footer, [data-sanity]')) continue

      const tag = el.tagName.toLowerCase()

      // New section on h2
      if (tag === 'h2' || (tag === 'h1' && sectionStarted)) {
        if (currentSection.elements.length > 0 || sectionStarted) {
          sections.push({ ...currentSection })
        }
        // Find the section container
        const sectionContainer = el.closest('section') || el.parentElement
        const sectionCs = sectionContainer ? getComputedStyle(sectionContainer) : null
        currentSection = {
          heading: (el.textContent || '').trim().substring(0, 80),
          tag: sectionContainer?.tagName.toLowerCase() || 'div',
          classes: sectionContainer?.className || '',
          background: sectionCs?.backgroundColor || 'transparent',
          container: sectionContainer || main,
          elements: [],
        }
        sectionStarted = true
      }

      currentSection.elements.push(el)
    }

    // Push last section
    if (currentSection.elements.length > 0) {
      sections.push({ ...currentSection })
    }

    // Convert to output format
    const sectionDetails: Array<{
      index: number
      heading: string
      tag: string
      classes: string
      background: string
      elementCount: number
      interactiveCount: number
      elements: Array<{
        tag: string
        text: string
        classes: string
        id: string
        sectionIndex: number
        sectionHeading: string
        indexInSection: number
        isInteractive: boolean
        interactiveType?: string
        styles: Record<string, string>
        rect: { x: number; y: number; width: number; height: number }
      }>
    }> = []

    let totalElements = 0
    let totalInteractive = 0

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si]
      const elementDetails: Array<{
        tag: string
        text: string
        classes: string
        id: string
        sectionIndex: number
        sectionHeading: string
        indexInSection: number
        isInteractive: boolean
        interactiveType?: string
        styles: Record<string, string>
        rect: { x: number; y: number; width: number; height: number }
      }> = []

      let interactiveCount = 0

      for (let ei = 0; ei < sec.elements.length; ei++) {
        const el = sec.elements[ei]
        const tag = el.tagName.toLowerCase()
        const cs = getComputedStyle(el)
        const rect = el.getBoundingClientRect()

        // Check for interactivity
        const hasOnclick = el.hasAttribute('onclick')
        const hasDataAttrs = Array.from(el.attributes).some(a => a.name.startsWith('data-'))
        const isFormEl = ['button', 'input', 'select', 'textarea'].includes(tag)
        const hasRole = el.hasAttribute('role')
        const isInteractive = hasOnclick || isFormEl || hasRole ||
          (tag === 'a' && el.hasAttribute('href'))
        let interactiveType: string | undefined
        if (hasOnclick) interactiveType = 'onclick'
        else if (isFormEl) interactiveType = tag
        else if (tag === 'a') interactiveType = 'link'
        else if (hasRole) interactiveType = `role=${el.getAttribute('role')}`

        if (isInteractive) interactiveCount++

        // Capture styles
        const styles: Record<string, string> = {}
        for (const prop of styleProps) {
          styles[prop] = (cs as unknown as Record<string, string>)[prop] || ''
        }
        // Normalize font family to first entry
        if (styles.fontFamily) {
          styles.fontFamily = styles.fontFamily.split(',')[0].replace(/"/g, '').trim()
        }

        elementDetails.push({
          tag,
          text: (el.textContent || '').trim().substring(0, 120),
          classes: (typeof el.className === 'string' ? el.className : '').substring(0, 200),
          id: el.id || '',
          sectionIndex: si,
          sectionHeading: sec.heading,
          indexInSection: ei,
          isInteractive,
          interactiveType,
          styles,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        })
      }

      totalElements += elementDetails.length
      totalInteractive += interactiveCount

      sectionDetails.push({
        index: si,
        heading: sec.heading,
        tag: sec.tag,
        classes: typeof sec.classes === 'string' ? sec.classes.substring(0, 200) : '',
        background: sec.background,
        elementCount: elementDetails.length,
        interactiveCount,
        elements: elementDetails,
      })
    }

    // ── Detect special elements (videos, iframes, fixed/sticky, animations) ──
    const specialElements: Array<{
      type: string
      tag: string
      text: string
      details: string
    }> = []

    // Videos
    const videos = document.querySelectorAll('video')
    videos.forEach((v) => {
      const src = v.querySelector('source')?.src || v.src || ''
      specialElements.push({
        type: 'video',
        tag: 'video',
        text: (v.getAttribute('poster') || '').substring(0, 80),
        details: src.substring(0, 120),
      })
    })

    // Iframes
    const iframes = document.querySelectorAll('iframe')
    iframes.forEach((f) => {
      specialElements.push({
        type: 'iframe',
        tag: 'iframe',
        text: f.title || '',
        details: (f.src || '').substring(0, 120),
      })
    })

    // Canvas
    const canvases = document.querySelectorAll('canvas')
    canvases.forEach((c) => {
      specialElements.push({
        type: 'canvas',
        tag: 'canvas',
        text: c.id || '',
        details: `${c.width}x${c.height}`,
      })
    })

    // Fixed/sticky elements
    const allEls = document.querySelectorAll('*')
    allEls.forEach((el) => {
      const cs = getComputedStyle(el)
      if (cs.position === 'fixed' || cs.position === 'sticky') {
        const tag = el.tagName.toLowerCase()
        // Skip the site header and known navigation
        if (tag === 'header' && el.classList.contains('site-header')) return
        specialElements.push({
          type: cs.position === 'fixed' ? 'fixed' : 'sticky',
          tag,
          text: (el.textContent || '').trim().substring(0, 60),
          details: `position: ${cs.position}; top: ${cs.top}; z-index: ${cs.zIndex}`,
        })
      }
      // Animated elements (CSS animation)
      if (cs.animationName && cs.animationName !== 'none') {
        specialElements.push({
          type: 'animated',
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().substring(0, 60),
          details: `animation: ${cs.animationName} ${cs.animationDuration}`,
        })
      }
    })

    return {
      url: window.location.href,
      totalElements,
      totalSections: sectionDetails.length,
      totalInteractive,
      specialElements,
      sections: sectionDetails,
    }
  }, [...STYLE_PROPS]) as Promise<PageAudit>
}

// ── Style comparison ───────────────────────────────────────────────────────

/** Tolerance for numeric style values (in px) */
const PX_TOLERANCE: Record<string, number> = {
  fontSize: 2,
  lineHeight: 4,
  letterSpacing: 1,
  marginTop: 6,
  marginRight: 6,
  marginBottom: 6,
  marginLeft: 6,
  paddingTop: 4,
  paddingRight: 4,
  paddingBottom: 4,
  paddingLeft: 4,
  width: 30,
  maxWidth: 30,
  minHeight: 10,
  borderTopWidth: 1,
  borderBottomWidth: 1,
}

/** Properties that are critical to visual appearance */
const CRITICAL_PROPS = new Set(['fontFamily', 'fontSize', 'fontWeight', 'color', 'backgroundColor', 'display'])
const HIGH_PROPS = new Set(['textTransform', 'textAlign', 'letterSpacing', 'listStyleType', 'listStyleImage', 'marginBottom', 'paddingLeft'])
const LOW_PROPS = new Set(['borderTopColor', 'borderBottomColor', 'boxShadow', 'verticalAlign', 'opacity', 'float', 'position'])

function getSeverity(prop: string): 'critical' | 'high' | 'medium' | 'low' {
  if (CRITICAL_PROPS.has(prop)) return 'critical'
  if (HIGH_PROPS.has(prop)) return 'high'
  if (LOW_PROPS.has(prop)) return 'low'
  return 'medium'
}

function normalizeColor(c: string): string {
  // Normalize rgba(0, 0, 0, 0) variants to 'transparent'
  if (c.match(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/)) return 'transparent'
  return c
}

function normalizeFont(f: string): string {
  return f.toLowerCase().replace(/['"]/g, '').trim()
}

function stylesMatch(prop: string, a: string, b: string): boolean {
  if (a === b) return true

  // Color normalization
  if (prop === 'color' || prop === 'backgroundColor' || prop.includes('Color')) {
    return normalizeColor(a) === normalizeColor(b)
  }

  // Font family: check if same category (serif vs sans)
  if (prop === 'fontFamily') {
    const aLow = normalizeFont(a)
    const bLow = normalizeFont(b)
    if (aLow === bLow) return true
    // Both serif or both sans-serif is acceptable
    const aSerif = aLow.includes('jenson') || aLow.includes('georgia') || aLow.includes('times') || aLow.includes('serif')
    const bSerif = bLow.includes('jenson') || bLow.includes('georgia') || bLow.includes('times') || bLow.includes('serif')
    return aSerif === bSerif
  }

  // Numeric properties: apply tolerance
  const tolerance = PX_TOLERANCE[prop]
  if (tolerance !== undefined) {
    const aNum = parseFloat(a)
    const bNum = parseFloat(b)
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return Math.abs(aNum - bNum) <= tolerance
    }
  }

  // display: none vs missing
  if (prop === 'display') {
    if ((a === 'none' && b === '') || (a === '' && b === 'none')) return false
  }

  // Ignore 'normal' vs '0px' for letter-spacing
  if (prop === 'letterSpacing') {
    if ((a === 'normal' && b === '0px') || (a === '0px' && b === 'normal')) return true
  }

  // Ignore 'none' vs '' for text-decoration, list-style
  if (prop === 'textDecoration' || prop === 'listStyleImage') {
    if ((a === 'none' && b === '') || (a === '' && b === 'none')) return true
    if (a.startsWith('none') && b.startsWith('none')) return true
  }

  return false
}

function compareElements(
  gEl: ElementDetail,
  nEl: ElementDetail,
  sectionHeading: string,
): StyleDiff[] {
  const diffs: StyleDiff[] = []

  for (const prop of STYLE_PROPS) {
    const gVal = gEl.styles[prop] || ''
    const nVal = nEl.styles[prop] || ''

    if (!stylesMatch(prop, gVal, nVal)) {
      diffs.push({
        section: sectionHeading,
        elementTag: gEl.tag,
        elementText: gEl.text.substring(0, 60),
        property: prop,
        gatsbyValue: gVal,
        nextjsValue: nVal,
        severity: getSeverity(prop),
      })
    }
  }

  // Check dimensions
  if (gEl.tag === 'img' && Math.abs(gEl.rect.width - nEl.rect.width) > 50) {
    diffs.push({
      section: sectionHeading,
      elementTag: 'img',
      elementText: gEl.text.substring(0, 60),
      property: 'rendered width',
      gatsbyValue: `${gEl.rect.width}px`,
      nextjsValue: `${nEl.rect.width}px`,
      severity: 'high',
    })
  }

  return diffs
}

// ── Section + element matching ─────────────────────────────────────────────

function matchSections(
  gatsby: PageAudit,
  nextjs: PageAudit,
): {
  matched: [SectionDetail, SectionDetail][]
  missingInNext: SectionDetail[]
  extraInNext: SectionDetail[]
} {
  const matched: [SectionDetail, SectionDetail][] = []
  const usedNext = new Set<number>()

  // Match by heading text similarity
  for (const gSec of gatsby.sections) {
    const gHeading = gSec.heading.toLowerCase().substring(0, 40)
    if (!gHeading) continue

    const bestMatch = nextjs.sections.find((nSec, i) => {
      if (usedNext.has(i)) return false
      const nHeading = nSec.heading.toLowerCase().substring(0, 40)
      // Fuzzy match: at least 60% of the shorter string must match
      const shorter = Math.min(gHeading.length, nHeading.length)
      if (shorter < 3) return gHeading === nHeading
      return nHeading.includes(gHeading.substring(0, Math.max(8, shorter * 0.6))) ||
        gHeading.includes(nHeading.substring(0, Math.max(8, shorter * 0.6)))
    })

    if (bestMatch) {
      usedNext.add(nextjs.sections.indexOf(bestMatch))
      matched.push([gSec, bestMatch])
    }
  }

  // Try positional matching for unmatched sections
  for (let gi = 0; gi < gatsby.sections.length; gi++) {
    const gSec = gatsby.sections[gi]
    if (matched.some(([g]) => g === gSec)) continue

    // Find closest unmatched section by position
    if (gi < nextjs.sections.length && !usedNext.has(gi)) {
      usedNext.add(gi)
      matched.push([gSec, nextjs.sections[gi]])
    }
  }

  const missingInNext = gatsby.sections.filter(g => !matched.some(([mg]) => mg === g))
  const extraInNext = nextjs.sections.filter((n, i) => !usedNext.has(i))

  return { matched, missingInNext, extraInNext }
}

function matchElementsInSection(
  gElements: ElementDetail[],
  nElements: ElementDetail[],
): {
  matched: [ElementDetail, ElementDetail][]
  missing: ElementDetail[]
  extra: ElementDetail[]
} {
  const matched: [ElementDetail, ElementDetail][] = []
  const usedNext = new Set<number>()

  // Match headings by text
  const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
  for (const gEl of gElements.filter(e => headingTags.has(e.tag))) {
    const gText = gEl.text.toLowerCase().substring(0, 30)
    const match = nElements.find((nEl, i) =>
      !usedNext.has(i) &&
      headingTags.has(nEl.tag) &&
      nEl.text.toLowerCase().substring(0, 30).includes(gText.substring(0, 15)),
    )
    if (match) {
      usedNext.add(nElements.indexOf(match))
      matched.push([gEl, match])
    }
  }

  // Match remaining elements by tag and order
  for (const tag of ['p', 'img', 'ul', 'ol', 'blockquote', 'video', 'iframe', 'table', 'hr', 'svg', 'a', 'button', 'sup', 'li', 'figure', 'figcaption', 'pre', 'code']) {
    const gTagEls = gElements.filter(e => e.tag === tag && !matched.some(([g]) => g === e))
    const nTagEls = nElements.filter((e, i) => e.tag === tag && !usedNext.has(i))
    for (let i = 0; i < Math.min(gTagEls.length, nTagEls.length); i++) {
      usedNext.add(nElements.indexOf(nTagEls[i]))
      matched.push([gTagEls[i], nTagEls[i]])
    }
  }

  const matchedGatsbySet = new Set(matched.map(([g]) => g))
  const missing = gElements.filter(g => !matchedGatsbySet.has(g) && !['li', 'a', 'sup'].includes(g.tag))
  const extra = nElements.filter((n, i) => !usedNext.has(i) && !['li', 'a', 'sup'].includes(n.tag))

  return { matched, missing, extra }
}

// ── Main audit function ────────────────────────────────────────────────────

async function auditPage(
  browser: Browser,
  slug: string,
  section: 'vision' | 'work',
  options: { screenshots: boolean; json: boolean; verbose: boolean },
): Promise<PageReport | null> {
  const gatsbySlug = section === 'vision'
    ? (VISION_SLUG_MAP[slug] !== undefined ? (VISION_SLUG_MAP[slug] || slug) : slug)
    : slug
  const isLegacy = section === 'vision' && LEGACY_ONLY.has(slug)

  const gatsbyBase = section === 'vision' ? GATSBY_VISION_BASE : GATSBY_WORK_BASE
  const gatsbyUrl = `${gatsbyBase}/${gatsbySlug}/`
  const nextjsUrl = `${NEXTJS_BASE}/${section === 'vision' ? 'vision' : 'work'}/${slug}/`

  process.stdout.write(`  ${slug}... `)

  try {
    const nPage = await browser.newPage()
    await nPage.setViewport({ width: 1280, height: 900 })

    // Load Next.js page
    const nRes = await nPage.goto(nextjsUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null)
    if (!nRes || nRes.status() >= 400) {
      console.log('SKIP (Next.js not reachable)')
      await nPage.close()
      return null
    }
    await nPage.waitForSelector('img', { timeout: 5000 }).catch(() => {})

    const nextjsAudit = await extractPageAudit(nPage, nextjsUrl)

    if (options.screenshots) {
      mkdirSync(SCREENSHOT_DIR, { recursive: true })
      await nPage.screenshot({ path: join(SCREENSHOT_DIR, `${slug}-nextjs.png`), fullPage: true })
    }

    let gatsbyAudit: PageAudit | null = null
    const diffs: StyleDiff[] = []
    const missingSections: string[] = []
    const extraSections: string[] = []
    const missingElements: { section: string; tag: string; text: string }[] = []
    const extraElements: { section: string; tag: string; text: string }[] = []

    if (!isLegacy) {
      const gPage = await browser.newPage()
      await gPage.setViewport({ width: 1280, height: 900 })

      const gRes = await gPage.goto(gatsbyUrl, { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null)
      if (gRes && gRes.status() === 200) {
        await gPage.waitForSelector('img', { timeout: 5000 }).catch(() => {})
        gatsbyAudit = await extractPageAudit(gPage, gatsbyUrl)

        if (options.screenshots) {
          await gPage.screenshot({ path: join(SCREENSHOT_DIR, `${slug}-gatsby.png`), fullPage: true })
        }

        // Compare sections
        const { matched: matchedSections, missingInNext: missingSecs, extraInNext: extraSecs } =
          matchSections(gatsbyAudit, nextjsAudit)

        for (const s of missingSecs) missingSections.push(s.heading)
        for (const s of extraSecs) extraSections.push(s.heading)

        // Compare elements within matched sections
        for (const [gSec, nSec] of matchedSections) {
          // Compare section background
          if (!stylesMatch('backgroundColor', gSec.background, nSec.background)) {
            diffs.push({
              section: gSec.heading,
              elementTag: 'section',
              elementText: `[section container]`,
              property: 'backgroundColor',
              gatsbyValue: gSec.background,
              nextjsValue: nSec.background,
              severity: 'high',
            })
          }

          // Match and compare elements
          const { matched: matchedEls, missing: missEls, extra: extraEls } =
            matchElementsInSection(gSec.elements, nSec.elements)

          for (const [gEl, nEl] of matchedEls) {
            diffs.push(...compareElements(gEl, nEl, gSec.heading))
          }

          for (const el of missEls) {
            missingElements.push({ section: gSec.heading, tag: el.tag, text: el.text.substring(0, 60) })
          }
          for (const el of extraEls) {
            extraElements.push({ section: nSec.heading, tag: el.tag, text: el.text.substring(0, 60) })
          }
        }
        // Compare special elements (videos, iframes, fixed/sticky, animations)
        if (gatsbyAudit.specialElements.length > 0 || nextjsAudit.specialElements.length > 0) {
          for (const type of ['video', 'iframe', 'canvas', 'fixed', 'sticky', 'animated'] as const) {
            const gCount = gatsbyAudit.specialElements.filter(s => s.type === type).length
            const nCount = nextjsAudit.specialElements.filter(s => s.type === type).length
            if (gCount > nCount) {
              diffs.push({
                section: 'Special Elements',
                elementTag: type,
                elementText: `[${type} elements]`,
                property: 'count',
                gatsbyValue: `${gCount}`,
                nextjsValue: `${nCount}`,
                severity: 'critical',
              })
            } else if (nCount > gCount) {
              diffs.push({
                section: 'Special Elements',
                elementTag: type,
                elementText: `[${type} elements]`,
                property: 'count',
                gatsbyValue: `${gCount}`,
                nextjsValue: `${nCount}`,
                severity: 'low',
              })
            }
          }
        }
      } else {
        console.log('(Gatsby not found, standalone audit only)')
      }
      await gPage.close()
    }

    await nPage.close()

    const critical = diffs.filter(d => d.severity === 'critical').length
    const high = diffs.filter(d => d.severity === 'high').length
    const medium = diffs.filter(d => d.severity === 'medium').length
    const low = diffs.filter(d => d.severity === 'low').length

    const report: PageReport = {
      slug,
      gatsbyUrl,
      nextjsUrl,
      gatsby: gatsbyAudit,
      nextjs: nextjsAudit,
      diffs,
      missingSections,
      extraSections,
      missingElements,
      extraElements,
      summary: { critical, high, medium, low, totalDiffs: diffs.length },
    }

    // Print summary
    if (isLegacy) {
      const specials = nextjsAudit.specialElements
      const specStr = specials.length > 0
        ? ` | ${specials.map(s => s.type).filter((v, i, a) => a.indexOf(v) === i).join(', ')}`
        : ''
      console.log(`STANDALONE — ${nextjsAudit.totalSections} sections, ${nextjsAudit.totalElements} elements, ${nextjsAudit.totalInteractive} interactive${specStr}`)
    } else if (diffs.length === 0 && missingElements.length === 0 && extraElements.length === 0) {
      console.log('MATCH')
    } else {
      const total = diffs.length + missingElements.length + extraElements.length + missingSections.length + extraSections.length
      console.log(`${total} issues (${critical}C ${high}H ${medium}M ${low}L) +${missingElements.length} missing +${extraElements.length} extra`)
    }

    // Print details
    if (options.verbose || diffs.some(d => d.severity === 'critical' || d.severity === 'high')) {
      // Print missing/extra sections
      for (const s of missingSections) {
        console.log(`    🔴 MISSING section: "${s}"`)
      }
      for (const s of extraSections) {
        console.log(`    🟡 EXTRA section: "${s}"`)
      }

      // Print missing/extra elements
      for (const el of missingElements) {
        console.log(`    🔴 MISSING <${el.tag}> in "${el.section}": "${el.text}"`)
      }
      for (const el of extraElements.slice(0, 10)) {
        console.log(`    🟡 EXTRA <${el.tag}> in "${el.section}": "${el.text}"`)
      }

      // Print style diffs
      const showDiffs = options.verbose
        ? diffs
        : diffs.filter(d => d.severity === 'critical' || d.severity === 'high')

      // Group by section
      const bySection = new Map<string, StyleDiff[]>()
      for (const d of showDiffs) {
        const list = bySection.get(d.section) || []
        list.push(d)
        bySection.set(d.section, list)
      }

      for (const [secName, secDiffs] of bySection) {
        console.log(`    [${secName}]`)
        for (const d of secDiffs) {
          const icon = d.severity === 'critical' ? '🔴' : d.severity === 'high' ? '🟠' : d.severity === 'medium' ? '🟡' : '⚪'
          console.log(`      ${icon} <${d.elementTag}> "${d.elementText}" — ${d.property}: "${d.gatsbyValue}" → "${d.nextjsValue}"`)
        }
      }
    }

    // Write JSON report
    if (options.json) {
      mkdirSync(REPORT_DIR, { recursive: true })
      // Write a compact version (without full element lists in gatsby/nextjs audits)
      const compactReport = {
        ...report,
        gatsby: gatsbyAudit ? {
          url: gatsbyAudit.url,
          totalElements: gatsbyAudit.totalElements,
          totalSections: gatsbyAudit.totalSections,
          totalInteractive: gatsbyAudit.totalInteractive,
          specialElements: gatsbyAudit.specialElements,
          sections: gatsbyAudit.sections.map(s => ({
            index: s.index,
            heading: s.heading,
            background: s.background,
            elementCount: s.elementCount,
            interactiveCount: s.interactiveCount,
          })),
        } : null,
        nextjs: {
          url: nextjsAudit.url,
          totalElements: nextjsAudit.totalElements,
          totalSections: nextjsAudit.totalSections,
          totalInteractive: nextjsAudit.totalInteractive,
          specialElements: nextjsAudit.specialElements,
          sections: nextjsAudit.sections.map(s => ({
            index: s.index,
            heading: s.heading,
            background: s.background,
            elementCount: s.elementCount,
            interactiveCount: s.interactiveCount,
          })),
        },
      }
      writeFileSync(
        join(REPORT_DIR, `${slug}.json`),
        JSON.stringify(compactReport, null, 2),
      )
    }

    return report
  } catch (err) {
    console.log(`ERROR: ${(err as Error).message}`)
    return null
  }
}

// ── Get all slugs for a section ────────────────────────────────────────────

function getVisionSlugs(): string[] {
  // Read from features.json
  const featuresPath = join(process.cwd(), 'src', 'data', 'features.json')
  if (existsSync(featuresPath)) {
    try {
      const features = JSON.parse(readFileSync(featuresPath, 'utf-8'))
      return features
        .filter((f: { link: string; externalLink?: boolean }) => !f.externalLink && f.link.startsWith('/vision/'))
        .map((f: { link: string }) => f.link.replace('/vision/', '').replace(/\/$/, ''))
    } catch {}
  }
  return VISION_PAGES_WITH_GATSBY
}

function getCaseStudySlugs(): string[] {
  // Try Gatsby case-study-order.json first
  const gatsbyOrderPath = join('C:', 'Users', 'quest', 'Programming', 'GoInvo', 'goinvo.com', 'src', 'data', 'case-study-order.json')
  if (existsSync(gatsbyOrderPath)) {
    try {
      const order = JSON.parse(readFileSync(gatsbyOrderPath, 'utf-8'))
      if (order.all && Array.isArray(order.all)) {
        return order.all as string[]
      }
    } catch {}
  }
  // Fallback hardcoded list
  return [
    'ipsos-facto', 'prior-auth', 'public-sector', 'all-of-us', 'mitre-shr',
    'maya-ehr', 'mass-snap', 'national-cancer-navigation', 'eligibility-engine',
    'wuxi-nextcode-familycode', 'augmented-clinical-decision-support',
    'mitre-state-of-us-healthcare', '3m-coderyte', 'determinants-of-health',
    'hgraph', 'partners-insight', 'mitre-flux-notes', 'commonhealth-smart-health-cards',
    'fastercures-health-data-basics', 'care-plans', 'mount-sinai-consent',
    'inspired-ehrs', 'ahrq-cds', 'infobionic-heart-monitoring',
    'personal-genome-project-vision', 'healthcare-dollars', 'staffplan',
    'care-cards', 'virtual-care', 'partners-geneinsight',
    'insidetracker-nutrition-science', 'ebola-care-guideline', 'paintrackr',
    'tabeeb-diagnostics',
  ]
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const screenshots = args.includes('--screenshots')
  const json = args.includes('--json')
  const verbose = args.includes('--verbose')
  const sectionArg = args.find(a => a === '--section')
  const sectionVal = sectionArg ? args[args.indexOf(sectionArg) + 1] : null
  const slugArg = args.find(a => !a.startsWith('--') && a !== sectionVal)

  let slugs: { slug: string; section: 'vision' | 'work' }[] = []

  if (slugArg) {
    // Single page mode
    const section = sectionVal === 'work' ? 'work' : 'vision'
    slugs = [{ slug: slugArg, section }]
  } else if (sectionVal === 'vision') {
    slugs = getVisionSlugs().map(s => ({ slug: s, section: 'vision' as const }))
  } else if (sectionVal === 'work') {
    slugs = getCaseStudySlugs().map(s => ({ slug: s, section: 'work' as const }))
  } else {
    console.log('Usage:')
    console.log('  npx tsx scripts/deep-audit.ts <slug>                    # single vision page')
    console.log('  npx tsx scripts/deep-audit.ts <slug> --section work     # single case study')
    console.log('  npx tsx scripts/deep-audit.ts --section vision          # all vision pages')
    console.log('  npx tsx scripts/deep-audit.ts --section work            # all case studies')
    console.log('  Options: --screenshots --json --verbose')
    process.exit(1)
  }

  console.log(`\n🔍 Deep Style Audit — ${slugs.length} page(s)`)
  console.log(`   Options: screenshots=${screenshots} json=${json} verbose=${verbose}\n`)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--window-size=1280,900', '--no-sandbox', '--disable-setuid-sandbox'],
  })

  const reports: PageReport[] = []
  let totalDiffs = 0

  for (const { slug, section } of slugs) {
    const report = await auditPage(browser, slug, section, { screenshots, json, verbose })
    if (report) {
      reports.push(report)
      totalDiffs += report.summary.totalDiffs + report.missingElements.length + report.extraElements.length
    }
  }

  await browser.close()

  // Summary
  if (reports.length > 1) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`SUMMARY: ${reports.length} pages audited, ${totalDiffs} total issues`)
    console.log(`${'═'.repeat(60)}`)

    // Sort by issue count
    const sorted = [...reports].sort((a, b) => {
      const aTotal = a.summary.totalDiffs + a.missingElements.length + a.extraElements.length
      const bTotal = b.summary.totalDiffs + b.missingElements.length + b.extraElements.length
      return bTotal - aTotal
    })

    for (const r of sorted) {
      const total = r.summary.totalDiffs + r.missingElements.length + r.extraElements.length
      if (total === 0) {
        console.log(`  ✅ ${r.slug}`)
      } else {
        console.log(`  ❌ ${r.slug}: ${total} issues (${r.summary.critical}C ${r.summary.high}H ${r.summary.medium}M ${r.summary.low}L) +${r.missingElements.length} missing +${r.extraElements.length} extra`)
      }
    }

    // Write summary JSON
    if (json) {
      mkdirSync(REPORT_DIR, { recursive: true })
      const summaryData = sorted.map(r => ({
        slug: r.slug,
        totalIssues: r.summary.totalDiffs + r.missingElements.length + r.extraElements.length,
        critical: r.summary.critical,
        high: r.summary.high,
        medium: r.summary.medium,
        low: r.summary.low,
        missingElements: r.missingElements.length,
        extraElements: r.extraElements.length,
        missingSections: r.missingSections,
        extraSections: r.extraSections,
      }))
      writeFileSync(join(REPORT_DIR, '_summary.json'), JSON.stringify(summaryData, null, 2))
      console.log(`\n📄 Reports saved to ${REPORT_DIR}/`)
    }
  }

  console.log()
}

main().catch(console.error)
