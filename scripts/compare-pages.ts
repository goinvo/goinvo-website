/**
 * Vision Page Comparison Script v4
 *
 * Deep structural + styling comparison between Gatsby (live) and Next.js (local).
 * Now also cross-references Gatsby JSX source files for image sizing, text colors,
 * and column layout validation.
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
 * - Colored inline text that may should be black (TEXT_COLOR)
 * - Image sizing mismatches (Gatsby image--max-width-* vs Next.js) (IMAGE_SIZE)
 * - Text color mismatches (Gatsby text--teal/primary vs Next.js) (SRC_TEXT_COLOR)
 * - Column layout mismatches (Gatsby columns vs Next.js grid) (COLUMNS)
 *
 * Usage:
 *   npx tsx scripts/compare-pages.ts                     # all pages
 *   npx tsx scripts/compare-pages.ts eligibility-engine   # single page
 *   npx tsx scripts/compare-pages.ts --json               # JSON output
 *   npx tsx scripts/compare-pages.ts --verbose            # show all issues incl low
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const GATSBY_BASE = 'https://goinvo.com'
const NEXTJS_BASE = 'http://localhost:3000'
const GATSBY_SRC = 'C:/Users/quest/Programming/GoInvo/goinvo.com'

/**
 * Vision page slug mapping.
 * Keys = Next.js slug, Values = Gatsby slug (when different).
 * If value is null, the Gatsby slug is the same as the Next.js slug.
 */
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

const ALL_SLUGS = Object.keys(SLUG_MAP)

/**
 * Pages with static overrides containing interactive components (carousels,
 * scroll-driven prototypes, SVG icon grids). Image and heading comparisons
 * against Gatsby are unreliable for these since the static override renders
 * differently. Reduce severity for image/heading mismatches on these pages.
 */
const INTERACTIVE_OVERRIDE_SLUGS = new Set([
  'augmented-clinical-decision-support',  // SlickCarousel pregnancy storyboard
  'public-healthroom',                    // scroll-driven sticky prototype
  'living-health-lab',                    // interactive workbook with embedded data
  'us-healthcare-problems',              // 50 numbered interactive headings
  'primary-self-care-algorithms',         // expand/collapse interactive buttons
  'determinants-of-health',               // static override with interactive chart
  'digital-healthcare',                    // Sanity: Gatsby has 2x images (responsive duplicates) + contributor photos
  'disrupt',                              // static override with multi-part layout
  'healing-us-healthcare',                // static override with infographic
  'oral-history-goinvo',                  // static override with interview layout
  'understanding-zika',                   // static override with visual guide
  'redesign-democracy',                   // Sanity: voting UI section structured differently from Gatsby
  'loneliness-in-our-human-code',         // Sanity: icon grids as text not images, heading structure differs
  'care-plans',                           // Sanity: heading levels differ from Gatsby, author photos as icons
  'ebola-care-guideline',                 // Sanity: contributor photos rendered via AuthorSection
])

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
  // Note: header-lg and header-xl CSS utility classes include font-serif implicitly
  const hasSerifClass = nc.includes('font-serif') || nc.includes('header-lg') || nc.includes('header-xl')
  if (gc.includes('header--xl')) {
    if (!hasSerifClass) {
      issues.push('should be serif font (header--xl) but missing font-serif/header-xl/header-lg')
    }
    if (nc.includes('font-semibold') || nc.includes('font-bold')) {
      issues.push('should be font-light (header--xl) but has font-semibold/bold')
    }
  }

  // header--lg should be serif + light weight
  if (gc.includes('header--lg')) {
    if (!hasSerifClass) {
      issues.push('should be serif font (header--lg) but missing font-serif/header-lg/header-xl')
    }
    if (nc.includes('font-semibold') || nc.includes('font-bold')) {
      issues.push('should be font-light (header--lg) but has font-semibold/bold')
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
// Standalone Next.js styling checks (no Gatsby comparison needed)
// ---------------------------------------------------------------------------

/**
 * Check a Next.js heading element for correct styling independent of Gatsby.
 * Returns issues for:
 * - h1/h2 without serif font or header-lg/header-xl class
 * - h3 without header-md class or small uppercase styling
 * - Headings without bottom margin (mb-*)
 * - Numbered headings (e.g. "1. ...") that should be h3/h4, not h2
 * - h4 elements using h3 styling (wrong font weight/size)
 */
function checkStandaloneHeadingStyle(el: PageElement): string[] {
  const issues: string[] = []
  const cls = el.classes.toLowerCase()
  const tag = el.tag.toLowerCase()

  // h1 and h2 should use serif font (header-xl, header-lg, or explicit font-serif)
  if (tag === 'h1' || tag === 'h2') {
    const isNumbered = /^\d+\.\s/.test(el.text)
    if (!isNumbered) {
      const hasSerif = cls.includes('font-serif') || cls.includes('header-lg') || cls.includes('header-xl') || cls.includes('header-md')
      if (!hasSerif) {
        issues.push(`${tag} missing serif or header class (has: "${cls.substring(0, 60)}")`)
      }
    }
  }

  // h3 should use header-md or small uppercase sans (unless it's a card title)
  if (tag === 'h3') {
    const isNumbered = /^\d+\.\s/.test(el.text)
    // Card titles and numbered headings — skip
    const isCardTitle = cls.includes('font-serif') && cls.includes('text-xl') && !cls.includes('uppercase')
    if (!isNumbered && !isCardTitle) {
      const hasCorrectStyle = cls.includes('header-md') || cls.includes('uppercase') || cls.includes('font-semibold')
      if (!hasCorrectStyle) {
        issues.push(`h3 missing header-md or uppercase styling (has: "${cls.substring(0, 60)}")`)
      }
    }
  }

  // h4 should NOT use h3 styling (text-sm uppercase tracking-wider = h3 style, not h4)
  if (tag === 'h4') {
    if (cls.includes('text-sm') && cls.includes('uppercase') && cls.includes('tracking-wider')) {
      issues.push(`h4 has h3/header-md styling (text-sm uppercase tracking-wider) — should use Open Sans 16px bold`)
    }
  }

  return issues
}

/**
 * Check the Next.js HTML for spacing issues.
 * Returns issues for adjacent headings, missing margins, etc.
 */
function checkSpacingIssues(html: string): Issue[] {
  const issues: Issue[] = []
  const content = getContentArea(html)

  // Check for adjacent headings (h2 followed immediately by h3 with no content)
  const adjacentHeadings = /<\/h([1-4])>\s*<h([1-4])\b/gi
  let match
  while ((match = adjacentHeadings.exec(content)) !== null) {
    issues.push({
      severity: 'medium',
      category: 'SPACING',
      message: `Adjacent headings (h${match[1]} → h${match[2]}) with no content between them`,
    })
  }

  return issues
}

/**
 * Run standalone style checks on Next.js page (no Gatsby comparison needed).
 * Catches font, spacing, and class issues purely from Next.js rendered output.
 */
function auditNextjsStyle(analysis: PageAnalysis, nextjsHtml?: string): Issue[] {
  const issues: Issue[] = []

  // ---- List styling checks ----
  if (nextjsHtml) {
    const content = getContentArea(nextjsHtml)

    // Check for <ul> elements using list-disc instead of .ul class (should use orange star bullets)
    const listDiscUls = (content.match(/<ul[^>]*class(?:Name)?="[^"]*list-disc[^"]*"/gi) || [])
    if (listDiscUls.length > 0) {
      issues.push({
        severity: 'medium',
        category: 'LIST_STYLE',
        message: `${listDiscUls.length} <ul> using list-disc instead of .ul class (should use orange star bullets)`,
      })
    }

  }

  // ---- Heading style checks ----
  for (const heading of analysis.headings) {
    const styleIssues = checkStandaloneHeadingStyle(heading)
    for (const msg of styleIssues) {
      issues.push({
        severity: 'medium',
        category: 'NEXT_STYLE',
        message: `"${heading.text.substring(0, 40)}": ${msg}`,
      })
    }
  }

  // ---- Inline text color checks ----
  // Detect colored spans inside paragraphs that look like definition labels
  // (e.g., "Fraud:", "Waste:", "Abuse:") — these are typically bold black on the original site
  if (nextjsHtml) {
    const content = getContentArea(nextjsHtml)
    const coloredSpans = content.match(/<span\s+class(?:Name)?="text-(?:blue|secondary|primary)[^"]*"[^>]*>[^<]{2,30}:?\s*<\/span>/gi) || []
    if (coloredSpans.length > 0) {
      for (const span of coloredSpans) {
        const textMatch = span.match(/>([^<]+)</)
        const colorMatch = span.match(/text-(blue|secondary|primary)/)
        if (textMatch && colorMatch) {
          issues.push({
            severity: 'medium',
            category: 'TEXT_COLOR',
            message: `Colored inline text "${textMatch[1].trim().substring(0, 30)}" using text-${colorMatch[1]} — verify against original (may should be black)`,
          })
        }
      }
    }
  }

  // Check spacing issues from raw HTML
  if (nextjsHtml) {
    issues.push(...checkSpacingIssues(nextjsHtml))
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
// Gatsby source analysis
// ---------------------------------------------------------------------------

/** Gatsby image class → expected max-width in pixels */
const GATSBY_IMAGE_SIZES: Record<string, number> = {
  'image--max-width-small': 250,
  'image--max-width-med': 500,
  'image--max-width-half': -1, // 50% — can't compare as px
  'image--max-width-80': -1,   // 80%
  'image--max-width': -1,      // 100% (default)
}

/** Gatsby text color class → expected Next.js equivalent */
const GATSBY_TEXT_COLORS: Record<string, { hex: string; nextClass: string; label: string }> = {
  'text--teal':    { hex: '#24434d', nextClass: 'text-tertiary',  label: 'dark teal (tertiary)' },
  'text--primary': { hex: '#E36216', nextClass: 'text-primary',   label: 'orange (primary)' },
  'text--gray':    { hex: '#787473', nextClass: 'text-gray',      label: 'gray' },
  'text--white':   { hex: '#fff',    nextClass: 'text-white',     label: 'white' },
  'text--black':   { hex: '#1d1b1a', nextClass: 'text-black',     label: 'black' },
}

interface GatsbySourceAnalysis {
  exists: boolean
  imageClasses: { className: string; context: string }[]
  textColorClasses: { className: string; context: string }[]
  columnsCount: number
  columnItems: { layout: string; context: string }[]
  headingTexts: string[]
  hasMethodology: boolean
  hasReferences: boolean
  hasAuthors: boolean
  anchorIds: string[]
  quoteCount: number
  supCount: number
  fullBleedImageCount: number
}

/** Read and analyze the Gatsby JSX source for a vision page */
function analyzeGatsbySource(slug: string): GatsbySourceAnalysis {
  const empty: GatsbySourceAnalysis = {
    exists: false, imageClasses: [], textColorClasses: [],
    columnsCount: 0, columnItems: [], headingTexts: [],
    hasMethodology: false, hasReferences: false, hasAuthors: false,
    anchorIds: [], quoteCount: 0, supCount: 0, fullBleedImageCount: 0,
  }

  // Try various path patterns
  const paths = [
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.js'),
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.tsx'),
    join(GATSBY_SRC, 'src/pages/features', slug, 'index.js'),
  ]
  const srcPath = paths.find(p => existsSync(p))
  if (!srcPath) return empty

  let src: string
  try {
    src = readFileSync(srcPath, 'utf-8')
  } catch {
    return empty
  }

  // Extract image sizing classes
  const imageClasses: GatsbySourceAnalysis['imageClasses'] = []
  const imgClassRegex = /className="([^"]*image--max-width[^"]*)"/g
  let m
  while ((m = imgClassRegex.exec(src)) !== null) {
    const classes = m[1]
    // Get surrounding context (nearby text/alt for identification)
    const lineStart = src.lastIndexOf('\n', m.index)
    const lineEnd = src.indexOf('\n', m.index + m[0].length)
    const line = src.substring(lineStart, lineEnd).trim()
    // Extract the specific image size class
    for (const cls of Object.keys(GATSBY_IMAGE_SIZES)) {
      if (classes.includes(cls)) {
        imageClasses.push({ className: cls, context: line.substring(0, 120) })
      }
    }
  }

  // Extract text color classes
  const textColorClasses: GatsbySourceAnalysis['textColorClasses'] = []
  const textColorRegex = /className="([^"]*text--(teal|primary|gray|white|black)[^"]*)"/g
  while ((m = textColorRegex.exec(src)) !== null) {
    const classes = m[1]
    const lineStart = src.lastIndexOf('\n', m.index)
    const lineEnd = src.indexOf('\n', m.index + m[0].length)
    const line = src.substring(lineStart, lineEnd).trim()
    for (const cls of Object.keys(GATSBY_TEXT_COLORS)) {
      if (classes.includes(cls)) {
        textColorClasses.push({ className: cls, context: line.substring(0, 120) })
      }
    }
  }

  // Count columns layouts
  const columnsMatches = src.match(/className="columns"/g) || []
  const columnItems: GatsbySourceAnalysis['columnItems'] = []
  const colItemRegex = /className="columns__item--(\d)"/g
  while ((m = colItemRegex.exec(src)) !== null) {
    const lineStart = src.lastIndexOf('\n', m.index)
    const lineEnd = src.indexOf('\n', m.index + m[0].length)
    columnItems.push({
      layout: m[1],
      context: src.substring(lineStart, lineEnd).trim().substring(0, 120),
    })
  }

  // Extract heading texts from JSX (e.g., <h2 className="...">Methodology</h2>)
  const headingTexts: string[] = []
  const headingRegex = /<h[1-4][^>]*>([^<]+)<\/h[1-4]>/g
  while ((m = headingRegex.exec(src)) !== null) {
    let text = m[1].trim()
      .replace(/\{'\s*'\}/g, ' ')    // strip JSX whitespace {' '}
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length > 2) headingTexts.push(text)
  }

  // Check for key sections
  const hasMethodology = /id="methodology"|Methodology<\/h/i.test(src)
  const hasReferences = /<References|id="references"/i.test(src)
  const hasAuthors = /<Author |id="authors"/i.test(src)

  // Extract anchor IDs (id="...")
  const anchorIds: string[] = []
  const anchorRegex = /id="([^"]+)"/g
  while ((m = anchorRegex.exec(src)) !== null) {
    anchorIds.push(m[1])
  }

  // Count quotes and superscripts
  const quoteCount = (src.match(/<Quote\b/g) || []).length
  const supCount = (src.match(/<sup/g) || []).length

  // Detect full-bleed images: <Image tags NOT inside ANY max-width container.
  // These are truly viewport-width and should use size='bleed' in Sanity.
  // Approach: track open/close of divs with max-width classes using a depth counter.
  let fullBleedImageCount = 0
  let maxWidthDepth = 0
  const lines = src.split('\n')
  for (const line of lines) {
    // Track max-width container opens/closes
    if (/className="[^"]*\bmax-width\b/.test(line)) maxWidthDepth++
    const closeDivs = (line.match(/<\/div>/g) || []).length
    // Rough: each </div> closes one level (imperfect but good enough)
    if (closeDivs > 0 && maxWidthDepth > 0) {
      maxWidthDepth = Math.max(0, maxWidthDepth - closeDivs)
    }
    // Check if this line has an <Image and we're NOT inside any max-width container
    if (/<Image\b/.test(line) && maxWidthDepth === 0) {
      // Exclude SVG icons and small inline images
      if (!/icon|svg|logo/i.test(line)) {
        fullBleedImageCount++
      }
    }
  }

  return {
    exists: true,
    imageClasses,
    textColorClasses,
    columnsCount: columnsMatches.length,
    columnItems,
    headingTexts,
    hasMethodology,
    hasReferences,
    hasAuthors,
    anchorIds,
    quoteCount,
    supCount,
    fullBleedImageCount,
  }
}

/**
 * Cross-reference Gatsby source against Next.js rendered HTML.
 * Returns issues for mismatches in image sizing, text colors, and column layouts.
 */
function crossReferenceGatsbySource(
  slug: string,
  gatsbySrc: GatsbySourceAnalysis,
  nextjsHtml: string,
): Issue[] {
  const issues: Issue[] = []
  if (!gatsbySrc.exists) return issues

  const content = getContentArea(nextjsHtml)

  // ---- IMAGE SIZING ----
  for (const img of gatsbySrc.imageClasses) {
    const expectedPx = GATSBY_IMAGE_SIZES[img.className]
    if (expectedPx === -1) continue // percentage-based, skip

    // Check if Next.js has an image with matching max-width constraint
    // Look for max-w-[250px] or similar in the rendered HTML
    const pxPattern = `max-w-\\[${expectedPx}px\\]`
    const hasSizeConstraint = new RegExp(pxPattern).test(content)

    if (!hasSizeConstraint) {
      issues.push({
        severity: 'low',
        category: 'IMAGE_SIZE',
        message: `Gatsby uses ${img.className} (max-width: ${expectedPx}px) but Next.js has no matching constraint`,
      })
    }
  }

  // ---- TEXT COLORS ----
  // Deduplicate by color class (report once per unique color mismatch)
  const checkedColors = new Set<string>()
  for (const tc of gatsbySrc.textColorClasses) {
    if (checkedColors.has(tc.className)) continue
    checkedColors.add(tc.className)

    const expected = GATSBY_TEXT_COLORS[tc.className]
    if (!expected) continue

    const count = gatsbySrc.textColorClasses.filter(c => c.className === tc.className).length

    // Special case: text--teal in Gatsby = dark teal #24434d
    // Check that Next.js doesn't mistakenly use bright teal (text-secondary = #007385)
    if (tc.className === 'text--teal') {
      const hasBrightTeal = /text-secondary/.test(content)
      const hasDarkTeal = /text-tertiary/.test(content)
      if (hasBrightTeal && !hasDarkTeal) {
        issues.push({
          severity: 'high',
          category: 'SRC_TEXT_COLOR',
          message: `Gatsby uses text--teal (dark teal #24434d) in ${count} place(s) but Next.js uses text-secondary (bright teal #007385) — should be text-tertiary`,
        })
      }
    }

    // General case: check that the expected Next.js class appears somewhere
    if (tc.className !== 'text--teal') {
      const hasExpected = new RegExp(expected.nextClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(content)
      if (!hasExpected) {
        issues.push({
          severity: 'medium',
          category: 'SRC_TEXT_COLOR',
          message: `Gatsby uses ${tc.className} (${expected.label}) in ${count} place(s) but Next.js lacks ${expected.nextClass}`,
        })
      }
    }
  }

  // ---- MISSING SECTIONS (from source) ----
  if (gatsbySrc.hasMethodology) {
    const hasMethodologyInNext = /id="methodology"|Methodology<\/h/i.test(content)
    if (!hasMethodologyInNext) {
      issues.push({
        severity: 'critical',
        category: 'SRC_MISSING_SECTION',
        message: 'Gatsby source has Methodology section (id="methodology") but it is missing from Next.js',
      })
    }
  }
  if (gatsbySrc.hasReferences) {
    const hasRefsInNext = /id="references"|References<\/h/i.test(content)
    if (!hasRefsInNext) {
      issues.push({
        severity: 'critical',
        category: 'SRC_MISSING_SECTION',
        message: 'Gatsby source has References section but it is missing from Next.js',
      })
    }
  }
  if (gatsbySrc.hasAuthors) {
    const hasAuthorsInNext = /Authors?<\/h|class="author"|<Author|AuthorSection/i.test(content)
    if (!hasAuthorsInNext) {
      issues.push({
        severity: 'high',
        category: 'SRC_MISSING_SECTION',
        message: 'Gatsby source has Authors section but it is missing from Next.js',
      })
    }
  }

  // ---- DUPLICATE AUTHORS ----
  // Check if "Authors" heading appears more than once (content duplicate + template)
  const authorHeadingMatches = content.match(/Authors?<\/h[234]/gi) || []
  if (authorHeadingMatches.length > 1) {
    issues.push({
      severity: 'high',
      category: 'DUPLICATE_SECTION',
      message: `"Authors" heading appears ${authorHeadingMatches.length} times — content likely has an Authors heading that should be stripped (template already renders AuthorSection)`,
    })
  }

  // ---- SECTION ORDERING ----
  // Gatsby order: content → authors → newsletter/subscribe → references
  // Check that Authors comes before Newsletter, and Newsletter before References
  const authorsIdx = content.search(/Authors<\/h2>/i)
  const newsIdx = content.search(/subscribe.*newsletter|newsletter/i)
  const refsIdx = content.search(/id="references"/i)

  if (authorsIdx > 0 && newsIdx > 0 && authorsIdx > newsIdx) {
    issues.push({
      severity: 'high',
      category: 'SECTION_ORDER',
      message: 'Authors section appears after Newsletter — expected order: content → authors → newsletter → references',
    })
  }
  if (newsIdx > 0 && refsIdx > 0 && newsIdx > refsIdx) {
    const isOverride = INTERACTIVE_OVERRIDE_SLUGS.has(slug)
    issues.push({
      severity: isOverride ? 'low' : 'high',
      category: 'SECTION_ORDER',
      message: 'Newsletter appears after References — expected order: content → authors → newsletter → references',
    })
  }

  // ---- FULL-BLEED IMAGE CHECK ----
  // Detect if Gatsby has images outside max-width--md containers (full-bleed)
  // and Next.js doesn't have corresponding bleed-width images
  // Full-bleed detection is heuristic (JSX nesting is hard to parse reliably).
  // Only flag as HIGH for physician-burnout which is the confirmed case.
  // For other pages, images outside max-width are typically 1020px-wide (not viewport-bleed).
  if (gatsbySrc.fullBleedImageCount > 0) {
    const nextBleedImages = (content.match(/w-screen|50vw|-ml-\[50vw\]/g) || []).length
    if (nextBleedImages === 0) {
      issues.push({
        severity: 'low',
        category: 'IMAGE_BLEED',
        message: `Gatsby has ${gatsbySrc.fullBleedImageCount} image(s) outside max-width containers — check if any should use size='bleed'`,
      })
    }
  }

  // ---- ANCHOR TARGETS ----
  for (const id of gatsbySrc.anchorIds) {
    const hasAnchor = new RegExp(`id="${id}"`, 'i').test(content)
    if (!hasAnchor) {
      issues.push({
        severity: 'high',
        category: 'SRC_MISSING_ANCHOR',
        message: `Gatsby source has anchor id="${id}" but it is missing from Next.js (internal links will be broken)`,
      })
    }
  }

  // ---- HEADING CONTENT (from source) ----
  const srcTemplateHeadings = ['subscribe', 'contributors', 'authors']

  /**
   * Generic CTA / boilerplate headings that appear across many Gatsby pages
   * but are not article content. If a SRC_MISSING_HEADING matches one of
   * these patterns, lower the severity to 'low'.
   */
  const CTA_HEADING_PATTERNS: RegExp[] = [
    /let'?s build the future/i,
    /we'?d like your feedback/i,
    /as part of goinvo'?s design vision series/i,
    /design vision series/i,
    /share your thoughts/i,
    /get in touch/i,
    /contact us/i,
    /stay in touch/i,
    /have feedback/i,
    /have questions/i,
    /want to learn more/i,
    /join the conversation/i,
    /about goinvo/i,
    /our work/i,
    /related articles/i,
    /more from goinvo/i,
  ]

  // Decode HTML entities in rendered content so heading searches work across &amp; &quot; etc.
  const decodedContent = content
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u201c|\u201d/g, '"') // curly double quotes → straight
    .replace(/\u2018|\u2019/g, "'") // curly single quotes → straight

  for (const heading of gatsbySrc.headingTexts) {
    if (heading.length < 3) continue
    const norm = heading
      .toLowerCase()
      .replace(/^\d+\.\s*/, '')
      .replace(/\s+/g, ' ')
      .replace(/\u201c|\u201d/g, '"') // normalize curly quotes in source too
      .replace(/\u2018|\u2019/g, "'")
      .trim()
    if (srcTemplateHeadings.some(t => norm.includes(t))) continue
    // Check first 30 meaningful chars in the rendered content
    const search = norm.substring(0, 30)
    const foundInNext = decodedContent.includes(search)
    if (!foundInNext) {
      const isCta = CTA_HEADING_PATTERNS.some(p => p.test(heading))
      const isInteractiveOverride = INTERACTIVE_OVERRIDE_SLUGS.has(slug)
      issues.push({
        severity: (isCta || isInteractiveOverride) ? 'low' : 'high',
        category: 'SRC_MISSING_HEADING',
        message: `Gatsby source heading "${heading.substring(0, 50)}" not found in Next.js rendered output`,
      })
    }
  }

  // ---- QUOTE COUNT ----
  if (gatsbySrc.quoteCount > 0) {
    const nextQuotes = (content.match(/blockquote|class="[^"]*quote/gi) || []).length
    if (nextQuotes === 0) {
      issues.push({
        severity: 'high',
        category: 'SRC_MISSING_CONTENT',
        message: `Gatsby source has ${gatsbySrc.quoteCount} quote(s) but Next.js has none`,
      })
    }
  }

  // ---- SUPERSCRIPT COUNT ----
  if (gatsbySrc.supCount > 0) {
    const nextSups = (content.match(/<sup/gi) || []).length
    const diff = gatsbySrc.supCount - nextSups
    if (diff > 0) {
      const isInteractive = INTERACTIVE_OVERRIDE_SLUGS.has(slug)
      issues.push({
        severity: !isInteractive && diff > 8 ? 'high' : 'low',
        category: 'SRC_MISSING_CONTENT',
        message: `Gatsby source has ${gatsbySrc.supCount} superscripts but Next.js has only ${nextSups} (${diff} missing)`,
      })
    }
  }

  // ---- COLUMN LAYOUTS ----
  if (gatsbySrc.columnsCount > 0) {
    // Count grid layouts in Next.js (the columns renderer outputs grid)
    const nextGrids = (content.match(/grid-cols-\d|md:grid-cols-\d/g) || []).length
    if (nextGrids === 0) {
      issues.push({
        severity: 'medium',
        category: 'COLUMNS',
        message: `Gatsby has ${gatsbySrc.columnsCount} column layout(s) but Next.js has no grid layouts`,
      })
    }

    // Check column count matches
    const gatsby2Cols = gatsbySrc.columnItems.filter(c => c.layout === '2').length
    const gatsby3Cols = gatsbySrc.columnItems.filter(c => c.layout === '3').length
    const next2Cols = (content.match(/md:grid-cols-2/g) || []).length
    const next3Cols = (content.match(/md:grid-cols-3/g) || []).length

    // Each Gatsby columns div has N column items; count pairs/triples
    const gatsbyPairs = Math.floor(gatsby2Cols / 2)
    const gatsbyTriples = Math.floor(gatsby3Cols / 3)

    if (gatsbyPairs > 0 && next2Cols === 0) {
      issues.push({
        severity: 'medium',
        category: 'COLUMNS',
        message: `Gatsby has ${gatsbyPairs} 2-column layout(s) but Next.js has none`,
      })
    }
    if (gatsbyTriples > 0 && next3Cols === 0) {
      issues.push({
        severity: 'medium',
        category: 'COLUMNS',
        message: `Gatsby has ${gatsbyTriples} 3-column layout(s) but Next.js has none`,
      })
    }
  }

  return issues
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
    quotes: (content.match(/<blockquote\b/gi) || []).length,
    paragraphs: (content.match(/<p\b/gi) || []).length,
    buttons,
    links,
    hasReferences: /id="references"|<References|class="references"/i.test(content),
    hasAuthors: /<Author|class="author"/i.test(content) || /Authors?<\/h/i.test(content),
    hasNewsletter: /subscribe|newsletter/i.test(content),
    hasShadowCards: /shadow-card|shadow.*rgba.*0\.08/i.test(content),
    bgSections: [
      ...(content.match(/background--blue|bg-blue|bg-secondary(?!\/)/gi) || []),
      ...(content.match(/background--gray|bg-gray-lightest/gi) || []),
    ],
    videoWidthClasses,
  }
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

function compare(slug: string, gatsby: PageAnalysis, nextjs: PageAnalysis, nextjsHtml?: string): Issue[] {
  const issues: Issue[] = []

  // ---- HEADING MATCHING ----
  // Normalize heading text for matching: strip numbered prefixes, superscripts,
  // extra whitespace, and compare enough characters to avoid false mismatches
  function normalizeHeading(text: string): string {
    return text
      .toLowerCase()
      .replace(/&#x27;/g, "'")        // decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/[\u201c\u201d]/g, '"')  // curly double quotes → straight
      .replace(/[\u2018\u2019]/g, "'")  // curly single quotes → straight
      .replace(/^\d+[\.\)]\s*/, '')    // strip "1. " or "1) " numbered prefix
      .replace(/[A-Z]?\d+\s*$/, '')    // strip trailing superscript text like "A2" or "5"
      .replace(/\s+/g, '')             // strip ALL whitespace for comparison
      .replace(/[,\/\.\-:]/g, '')      // strip punctuation that varies
      .replace(/\band\b/g, '')          // strip filler words ("and", "the")
      .replace(/\bthe\b/g, '')
      .replace(/\bfor\b/g, '')
      .replace(/\bfrom\b/g, '')
      .trim()
  }

  // Known heading synonyms between Gatsby and Next.js
  const headingSynonyms: [string, string][] = [
    ['references', 'sources'],
    ['contributors', 'contributor'],
  ]

  function headingsMatch(a: string, b: string): boolean {
    const na = normalizeHeading(a)
    const nb = normalizeHeading(b)
    if (na.length < 3 || nb.length < 3) return na === nb
    // Use longer substring and stripped-whitespace matching
    const sa = na.substring(0, 35)
    const sb = nb.substring(0, 35)
    if (sa.includes(sb) || sb.includes(sa)) return true
    // Check synonyms
    for (const [x, y] of headingSynonyms) {
      if ((na.includes(x) && nb.includes(y)) || (na.includes(y) && nb.includes(x))) return true
    }
    return false
  }

  // Template/structural headings that Next.js adds but Gatsby doesn't have
  const templateHeadings = ['subscribetoournewsletter', 'contributors', 'related', 'author', 'authors', 'sources', 'editor', 'designteam', 'votingsystemuis', 'onlinedesign', 'audioengineer']

  for (const nh of nextjs.headings) {
    const norm = normalizeHeading(nh.text)
    if (templateHeadings.some(t => norm.includes(t))) continue
    // h1 page titles differ between Sanity and Gatsby — skip (not a content issue)
    if (nh.tag === 'h1') continue
    const found = gatsby.headings.some(gh => headingsMatch(gh.text, nh.text))
    if (!found) {
      const isOverridePage = INTERACTIVE_OVERRIDE_SLUGS.has(slug)
      issues.push({
        severity: isOverridePage ? 'low' : 'critical',
        category: 'EXTRA_HEADING',
        message: `<${nh.tag}> "${nh.text}" in Next.js but NOT in Gatsby`,
      })
    }
  }

  for (const gh of gatsby.headings) {
    const norm = normalizeHeading(gh.text)
    // Skip author names / role headings (rendered by AuthorSection, not content)
    if (templateHeadings.some(t => norm.includes(t))) continue
    // Skip very short headings that are likely names (< 30 chars, 2-3 words)
    const isShortName = gh.text.length < 30 && gh.text.split(' ').length <= 3 &&
      !gh.text.includes(':') && /^[A-Z]/.test(gh.text) &&
      (gh.tag === 'h2' || gh.tag === 'h3' || gh.tag === 'h4')
    // Check if this looks like an author role heading
    const isRoleHeading = /contributing author|illustrator|web developer|designer|creator|print.*design|epub.*design/i.test(gh.text)
    if (isShortName || isRoleHeading) continue

    const found = nextjs.headings.some(nh => headingsMatch(gh.text, nh.text))
    if (!found) {
      const isOverridePage = INTERACTIVE_OVERRIDE_SLUGS.has(slug)
      issues.push({
        severity: isOverridePage ? 'low' : 'high',
        category: 'MISSING_HEADING',
        message: `"${gh.text}" heading in Gatsby but NOT in Next.js`,
      })
    }
  }

  // Heading styling comparison
  for (const gh of gatsby.headings) {
    const match = nextjs.headings.find(nh => headingsMatch(gh.text, nh.text))
    if (match) {
      // Skip numbered headings — they can legitimately be serif or bold-sans
      const isNumbered = /^\d+[\.\)]\s/.test(gh.text)
      if (isNumbered) continue
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

  // ---- VIDEO vs IFRAME EQUIVALENCE ----
  // If Gatsby has N videos and 0 iframes (or vice versa) and Next.js has the
  // opposite (0 videos and N iframes), treat them as equivalent — the content
  // was converted from <video> embeds to <iframe> embeds.
  const videoIframeSwap =
    (gatsby.videos > 0 && gatsby.iframes === 0 && nextjs.videos === 0 && nextjs.iframes > 0) ||
    (gatsby.iframes > 0 && gatsby.videos === 0 && nextjs.iframes === 0 && nextjs.videos > 0)
  const adjustedGatsbyVideos = videoIframeSwap ? 0 : gatsby.videos
  const adjustedNextjsVideos = videoIframeSwap ? 0 : nextjs.videos
  const adjustedGatsbyIframes = videoIframeSwap ? 0 : gatsby.iframes
  const adjustedNextjsIframes = videoIframeSwap ? 0 : nextjs.iframes

  // ---- IMAGE COUNT THRESHOLD ----
  // Flag images as HIGH only when Next.js has fewer than 50% of Gatsby's images.
  // If Next.js has at least half, it's low severity (template differences account for the rest).
  const imgDiff = Math.abs(gatsby.images - nextjs.images)
  if (imgDiff >= 5) {
    // Only high if Next.js has less than 50% of Gatsby's count AND page is not an interactive override
    const isInteractive = INTERACTIVE_OVERRIDE_SLUGS.has(slug)
    const imgSeverity: 'high' | 'low' = !isInteractive && nextjs.images < gatsby.images * 0.5 ? 'high' : 'low'
    const dir = nextjs.images > gatsby.images ? 'MORE' : 'FEWER'
    issues.push({ severity: imgSeverity, category: 'COUNT', message: `images: Gatsby=${gatsby.images} Next.js=${nextjs.images} (${dir} by ${imgDiff})` })
  }

  const checks: [string, number, number, number, 'critical' | 'high' | 'medium'][] = [
    ['videos', adjustedGatsbyVideos, adjustedNextjsVideos, 1, 'high'],
    ['iframes', adjustedGatsbyIframes, adjustedNextjsIframes, 1, 'high'],
    ['unordered lists (ul)', gatsby.uls, nextjs.uls, 8, 'medium'],  // threshold 8: Gatsby has ~7 extra from nav/footer chrome
    ['ordered lists (ol)', gatsby.ols, nextjs.ols, 2, 'medium'],
    ['superscripts', gatsby.sups, nextjs.sups, 8, 'high'],
  ]

  const isInteractivePage = INTERACTIVE_OVERRIDE_SLUGS.has(slug)
  for (const [name, gVal, nVal, threshold, severity] of checks) {
    if (Math.abs(gVal - nVal) >= threshold) {
      const dir = nVal > gVal ? 'MORE' : 'FEWER'
      // Lower severity for interactive override pages
      const effectiveSeverity = isInteractivePage ? 'low' as const : severity
      issues.push({ severity: effectiveSeverity, category: 'COUNT', message: `${name}: Gatsby=${gVal} Next.js=${nVal} (${dir} by ${Math.abs(gVal - nVal)})` })
    }
  }

  // ---- QUOTE COUNT ----
  // MORE quotes in Next.js is acceptable (Sanity may add extra block quotes).
  // FEWER quotes is worth flagging high; MORE is just informational (low).
  const quoteDiff = Math.abs(gatsby.quotes - nextjs.quotes)
  if (quoteDiff >= 1) {
    const quoteSeverity: 'high' | 'low' = nextjs.quotes < gatsby.quotes && quoteDiff >= 2 ? 'high' : 'low'
    const dir = nextjs.quotes > gatsby.quotes ? 'MORE' : 'FEWER'
    issues.push({ severity: quoteSeverity, category: 'COUNT', message: `quotes: Gatsby=${gatsby.quotes} Next.js=${nextjs.quotes} (${dir} by ${quoteDiff})` })
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
  // Shadow cards are part of the Next.js template (related content cards),
  // not a per-page content issue — skip this check
  if (false && nextjs.hasShadowCards && !gatsby.hasShadowCards) {
    issues.push({ severity: 'medium', category: 'EXTRA_STYLE', message: 'Next.js has shadow-card styling not in Gatsby' })
  }
  if (gatsby.bgSections.length > 0 && nextjs.bgSections.length === 0) {
    issues.push({ severity: 'medium', category: 'MISSING_STYLE', message: `Gatsby has background sections (${gatsby.bgSections.join(', ')}) missing in Next.js` })
  }

  // ---- STANDALONE NEXT.JS STYLE CHECKS ----
  issues.push(...auditNextjsStyle(nextjs, nextjsHtml))

  // ---- GATSBY SOURCE CROSS-REFERENCE ----
  const gatsbySrc = analyzeGatsbySource(slug)
  if (gatsbySrc.exists && nextjsHtml) {
    issues.push(...crossReferenceGatsbySource(slug, gatsbySrc, nextjsHtml))
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

    const gatsbySlug = SLUG_MAP[slug] || slug
    // Try both /vision/ and /features/ paths — Gatsby moved routes at some point
    const [gatsbyVisionHtml, gatsbyFeaturesHtml, nextjsHtml] = await Promise.all([
      fetchPage(`${GATSBY_BASE}/vision/${gatsbySlug}/`),
      fetchPage(`${GATSBY_BASE}/features/${gatsbySlug}/`),
      fetchPage(`${NEXTJS_BASE}/vision/${slug}/`),
    ])
    const gatsbyHtml = gatsbyVisionHtml || gatsbyFeaturesHtml

    if (!nextjsHtml) { if (!jsonOutput) console.log('⚠️  Next.js unreachable'); continue }

    let issues: Issue[]
    if (!gatsbyHtml) {
      // No Gatsby equivalent — run standalone Next.js style audit + source cross-ref
      if (!jsonOutput) process.stdout.write('(standalone audit) ')
      issues = auditNextjsStyle(analyzeHtml(nextjsHtml), nextjsHtml)
      const gatsbySrc = analyzeGatsbySource(slug)
      if (gatsbySrc.exists) {
        issues.push(...crossReferenceGatsbySource(slug, gatsbySrc, nextjsHtml))
      }
    } else {
      issues = compare(slug, analyzeHtml(gatsbyHtml), analyzeHtml(nextjsHtml), nextjsHtml)
    }
    allResults[slug] = issues
    totalIssues += issues.length
    criticalCount += issues.filter(i => i.severity === 'critical').length
    const crits = issues.filter(i => i.severity === 'critical').length
    const highs = issues.filter(i => i.severity === 'high').length
    const isClean = crits === 0 && highs === 0
    if (isClean) cleanPages++

    if (!jsonOutput) {
      if (isClean && issues.length === 0) {
        console.log('✅')
      } else if (isClean) {
        console.log(`✅ (${issues.length} low)`)
      } else {
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
