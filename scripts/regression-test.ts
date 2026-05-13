#!/usr/bin/env tsx

/**
 * Live-site regression checks for handoff-safe visual parity.
 *
 * The source of truth is the current Gatsby/live site, not a local snapshot
 * that can drift without anyone noticing. Intentional accessibility color
 * changes are encoded below so old live orange can map to the approved
 * accessible token while retired colors still fail if they remain locally.
 *
 * Usage:
 *   npx tsx scripts/regression-test.ts
 *   npx tsx scripts/regression-test.ts --section main
 *   npx tsx scripts/regression-test.ts --all-viewports
 *   npx tsx scripts/regression-test.ts --path /services
 *
 * Requires: Next.js server on localhost:3000 unless --candidate-base is set.
 */

import puppeteer, { type Browser, type Page } from 'puppeteer'

type Section = 'main' | 'vision' | 'work'
type Severity = 'critical' | 'warning'
type ViewportName = 'desktop' | 'mobile'

interface RegressionPage {
  path: string
  label: string
  section: Section
  sourcePath?: string
  notes?: string
}

interface ViewportPreset {
  name: ViewportName
  width: number
  height: number
  isMobile?: boolean
  hasTouch?: boolean
  deviceScaleFactor?: number
}

interface ElementStyles {
  fontSize: string
  fontWeight: string
  fontFamily: string
  fontFamilyKind: 'serif' | 'sans' | 'other'
  color: string
  backgroundColor: string
  textTransform: string
  letterSpacing: string
  lineHeight: string
  textDecorationLine: string
  textDecorationColor: string
  borderTopWidth: string
  borderTopColor: string
  borderBottomWidth: string
  borderBottomColor: string
  listStyleType: string
  listStyleImage: string
  markerColor: string
  beforeContent: string
  beforeColor: string
  beforeBackgroundColor: string
  afterContent: string
  afterColor: string
  afterBackgroundColor: string
  display: string
}

interface ElementSample {
  group: string
  key: string
  tag: string
  index: number
  text: string
  src: string
  href: string
  rect: { width: number; height: number }
  styles: ElementStyles
}

interface ElementGroupSnapshot {
  selector: string
  count: number
  samples: ElementSample[]
}

interface PageSnapshot {
  url: string
  label: string
  viewport: ViewportName
  pageHeight: number
  rootVars: Record<string, string>
  groups: Record<string, ElementGroupSnapshot>
}

interface Regression {
  page: string
  viewport: ViewportName
  element: string
  property: string
  source: string
  candidate: string
  severity: Severity
}

const SOURCE_BASE_URL = 'https://www.goinvo.com'
const CANDIDATE_BASE_URL = 'http://localhost:3000'

const VIEWPORTS: Record<ViewportName, ViewportPreset> = {
  desktop: { name: 'desktop', width: 1280, height: 900 },
  mobile: {
    name: 'mobile',
    width: 375,
    height: 812,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
}

const SAMPLE_LIMIT_PER_GROUP = 12
const SIZE_TOLERANCE_PX = 1
const COUNT_WARNING_RATIO = 0.5

const RETIRED_LOCAL_COLORS = new Set([
  '#e36216',
  '#f26522',
  '#ffb992',
])

const ACCESSIBLE_COLOR_REPLACEMENTS = new Map<string, string>([
  ['#e36216', '#b84a0e'],
  ['#f26522', '#b84a0e'],
  ['#ffb992', '#b84a0e'],
  ['#787473', '#6f6b6a'],
])

const ROOT_COLOR_VARS = [
  '--color-primary',
  '--color-primary-accessible',
  '--color-primary-dark',
  '--color-primary-light',
  '--color-secondary',
  '--color-tertiary',
]

const REGRESSION_PAGES: RegressionPage[] = [
  { path: '/', label: 'Home', section: 'main' },
  { path: '/work', label: 'Work listing', section: 'main' },
  { path: '/vision', label: 'Vision listing', section: 'main' },
  { path: '/about', label: 'About', section: 'main' },
  { path: '/services', label: 'Services', section: 'main' },
  { path: '/contact', label: 'Contact', section: 'main' },
  { path: '/open-source-health-design', label: 'Open Source Health Design', section: 'main' },

  { path: '/vision/vapepocolypse', label: 'Vision: vapepocolypse', section: 'vision' },
  { path: '/vision/healthcare-ai', label: 'Vision: healthcare-ai', section: 'vision' },
  { path: '/vision/coronavirus', label: 'Vision: coronavirus', section: 'vision' },
  { path: '/vision/ai-design-certification', label: 'Vision: ai-design-certification', section: 'vision' },
  { path: '/vision/health-design-thinking', label: 'Vision: health-design-thinking', section: 'vision' },
  { path: '/vision/fraud-waste-abuse-in-healthcare', label: 'Vision: fraud-waste-abuse', section: 'vision' },
  { path: '/vision/health-visualizations', label: 'Vision: health-visualizations', section: 'vision' },
  { path: '/vision/augmented-clinical-decision-support', label: 'Vision: acds', section: 'vision' },
  { path: '/vision/living-health-lab', label: 'Vision: living-health-lab', section: 'vision' },
  { path: '/vision/public-healthroom', label: 'Vision: public-healthroom', section: 'vision' },
  { path: '/vision/primary-self-care-algorithms', label: 'Vision: self-care-algorithms', section: 'vision' },
  {
    path: '/vision/bathroom-to-healthroom',
    sourcePath: '/features/from-bathroom-to-healthroom',
    label: 'Vision: bathroom-to-healthroom',
    section: 'vision',
    notes: 'Gatsby route lives under /features with a different slug.',
  },
  {
    path: '/vision/understanding-zika',
    sourcePath: '/features/zika',
    label: 'Vision: understanding-zika',
    section: 'vision',
    notes: 'Gatsby route lives under /features/zika.',
  },
  {
    path: '/vision/killer-truths',
    sourcePath: '/features/killer-truths',
    label: 'Vision: killer-truths',
    section: 'vision',
    notes: 'Gatsby route lives under /features.',
  },

  { path: '/work/hgraph', label: 'Work: hgraph', section: 'work' },
  { path: '/work/maya-ehr', label: 'Work: maya-ehr', section: 'work' },
  { path: '/work/tabeeb-diagnostics', label: 'Work: tabeeb-diagnostics', section: 'work' },
]

function getArgValue(args: string[], name: string): string | null {
  const index = args.indexOf(name)
  if (index === -1) return null
  return args[index + 1] || null
}

function hasArg(args: string[], name: string): boolean {
  return args.includes(name)
}

function printHelp(): void {
  console.log(`
Live-site regression checks

Usage:
  npm run manage -- regression [options]

Options:
  --candidate-base <url>   Local/preview site to check. Default: ${CANDIDATE_BASE_URL}
  --source-base <url>      Source site to compare against. Default: ${SOURCE_BASE_URL}
  --section <name>         main, vision, or work
  --path <path>            Run a single candidate path, e.g. /services
  --mobile                 Run mobile viewport only
  --all-viewports          Run desktop and mobile
  --limit <n>              Limit pages for smoke-testing the runner
  --json                   Print JSON results
  --fail-on-warnings       Exit non-zero on warnings too
  --list                   List pages in the regression set
  --baseline, --update     Retired; ignored because live site is the baseline
  --help                   Show this help
`)
}

function normalizePath(pathname: string): string {
  if (!pathname.startsWith('/')) return `/${pathname}`
  return pathname
}

function buildUrl(base: string, pathname: string): string {
  const url = new URL(normalizePath(pathname), ensureTrailingSlash(base))
  return url.toString()
}

function ensureTrailingSlash(base: string): string {
  return base.endsWith('/') ? base : `${base}/`
}

function sourcePathFor(page: RegressionPage): string {
  return page.sourcePath || page.path
}

function selectPages(args: string[]): RegressionPage[] {
  const section = getArgValue(args, '--section') as Section | null
  const singlePath = getArgValue(args, '--path')
  const limit = Number.parseInt(getArgValue(args, '--limit') || '', 10)

  let pages = REGRESSION_PAGES

  if (section) {
    if (!['main', 'vision', 'work'].includes(section)) {
      throw new Error(`Unknown section "${section}". Expected main, vision, or work.`)
    }
    pages = pages.filter(page => page.section === section)
  }

  if (singlePath) {
    const normalized = normalizePath(singlePath).replace(/\/$/, '') || '/'
    pages = pages.filter(page => page.path === normalized)
    if (pages.length === 0) {
      throw new Error(`No regression page configured for ${singlePath}`)
    }
  }

  if (Number.isFinite(limit) && limit > 0) {
    pages = pages.slice(0, limit)
  }

  return pages
}

function selectViewports(args: string[]): ViewportPreset[] {
  if (hasArg(args, '--all-viewports') && hasArg(args, '--mobile')) {
    throw new Error('Use either --all-viewports or --mobile, not both.')
  }
  if (hasArg(args, '--all-viewports')) return [VIEWPORTS.desktop, VIEWPORTS.mobile]
  if (hasArg(args, '--mobile')) return [VIEWPORTS.mobile]
  return [VIEWPORTS.desktop]
}

async function verifyCandidate(baseUrl: string): Promise<void> {
  const res = await fetch(buildUrl(baseUrl, '/'))
  if (!res.ok) {
    throw new Error(`Candidate site returned ${res.status} at ${baseUrl}`)
  }
}

async function newPage(browser: Browser, viewport: ViewportPreset): Promise<Page> {
  const page = await browser.newPage()
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    deviceScaleFactor: viewport.deviceScaleFactor,
  })
  return page
}

async function snapshotPage(
  page: Page,
  url: string,
  label: string,
  viewport: ViewportName,
  timeoutMs: number,
): Promise<PageSnapshot> {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs })
  const status = response?.status() ?? 0
  if (status >= 400 || status === 0) {
    throw new Error(`Navigation failed (${status}) for ${url}`)
  }
  await page.waitForNetworkIdle({ idleTime: 400, timeout: Math.min(2500, timeoutMs) }).catch(() => undefined)
  await page.addScriptTag({ content: 'window.__name = function(fn) { return fn; };' })
  await page.evaluate(() => document.fonts?.ready)
  await new Promise(resolve => setTimeout(resolve, 250))

  return page.evaluate((snapshotLabel: string, snapshotUrl: string, viewportName: ViewportName, rootVarNames: string[], maxSamples: number) => {
    const selectors: Record<string, string> = {
      headings: 'h1,h2,h3,h4',
      bodyText: 'p,blockquote,figcaption',
      lists: 'ul,ol,li',
      linksAndButtons: 'a,button',
      formControls: 'label,input,textarea,select',
      surfacedControls: 'a[class*="border"],a[class*="bg-"],button,[role="button"],input,textarea,select,li[class*="border"],li[class*="bg-"],[class*="text-primary"],[class*="border-primary"]',
    }

    function normalizeText(value: string): string {
      return value.replace(/\s+/g, ' ').trim()
    }

    function normalizeKey(value: string): string {
      return normalizeText(value)
        .toLowerCase()
        .replace(/[^\w\s/-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 90)
    }

    function hexColor(value: string): string {
      if (!value || value === 'transparent') return 'transparent'
      const rgba = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/)
      if (!rgba) return value
      const [, r, g, b, alpha] = rgba
      if (alpha !== undefined && Number(alpha) === 0) return 'transparent'
      return `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`.toLowerCase()
    }

    function fontKind(fontFamily: string): 'serif' | 'sans' | 'other' {
      const family = fontFamily.toLowerCase()
      if (family.includes('jenson') || family.includes('georgia') || family.includes('serif')) return 'serif'
      if (family.includes('open sans') || family.includes('arial') || family.includes('sans')) return 'sans'
      return 'other'
    }

    function srcFor(el: Element): string {
      if (el instanceof HTMLImageElement || el instanceof HTMLIFrameElement || el instanceof HTMLVideoElement) {
        return el.currentSrc || el.src || ''
      }
      const source = el.querySelector('source')
      return source instanceof HTMLSourceElement ? source.src : ''
    }

    function hrefFor(el: Element): string {
      return el instanceof HTMLAnchorElement ? el.href : ''
    }

    function cleanUrlPart(value: string): string {
      if (!value) return ''
      try {
        const parsed = new URL(value)
        return parsed.pathname.split('/').pop() || parsed.pathname
      } catch {
        return value.split('/').pop() || value
      }
    }

    function readStyles(el: Element): ElementStyles {
      const cs = getComputedStyle(el)
      const before = getComputedStyle(el, '::before')
      const after = getComputedStyle(el, '::after')
      const marker = getComputedStyle(el, '::marker')
      const fontFamily = cs.fontFamily.split(',')[0].replace(/"/g, '').trim()

      return {
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontFamily,
        fontFamilyKind: fontKind(cs.fontFamily),
        color: hexColor(cs.color),
        backgroundColor: hexColor(cs.backgroundColor),
        textTransform: cs.textTransform,
        letterSpacing: cs.letterSpacing,
        lineHeight: cs.lineHeight,
        textDecorationLine: cs.textDecorationLine,
        textDecorationColor: hexColor(cs.textDecorationColor),
        borderTopWidth: cs.borderTopWidth,
        borderTopColor: hexColor(cs.borderTopColor),
        borderBottomWidth: cs.borderBottomWidth,
        borderBottomColor: hexColor(cs.borderBottomColor),
        listStyleType: cs.listStyleType,
        listStyleImage: cs.listStyleImage === 'none' ? '' : 'custom',
        markerColor: hexColor(marker.color),
        beforeContent: before.content,
        beforeColor: hexColor(before.color),
        beforeBackgroundColor: hexColor(before.backgroundColor),
        afterContent: after.content,
        afterColor: hexColor(after.color),
        afterBackgroundColor: hexColor(after.backgroundColor),
        display: cs.display,
      }
    }

    const root = document.querySelector('main') || document.querySelector('.app__body') || document.body
    const rootStyle = getComputedStyle(document.documentElement)
    const rootVars: Record<string, string> = {}
    for (const name of rootVarNames) {
      rootVars[name] = rootStyle.getPropertyValue(name).trim().toLowerCase()
    }

    const groups: Record<string, ElementGroupSnapshot> = {}

    for (const [group, selector] of Object.entries(selectors)) {
      const all = Array.from(root.querySelectorAll(selector))
      const visible = all.filter(el => {
        const rect = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') return false
        if (rect.width === 0 && rect.height === 0 && el.tagName.toLowerCase() !== 'img') return false
        return true
      })
      const samples: ElementSample[] = []

      for (let i = 0; i < Math.min(maxSamples, visible.length); i++) {
        const el = visible[i]
        const rect = el.getBoundingClientRect()
        const text = normalizeText((el.textContent || '').substring(0, 160))
        const src = cleanUrlPart(srcFor(el))
        const href = hrefFor(el)
        const hrefPath = href ? new URL(href, window.location.href).pathname : ''
        const tag = el.tagName.toLowerCase()
        const semanticKey = normalizeKey(text || src || hrefPath || `${tag}-${i}`)
        const key = `${group}:${tag}:${semanticKey}`

        samples.push({
          group,
          key,
          tag,
          index: i,
          text,
          src,
          href: hrefPath,
          rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
          styles: readStyles(el),
        })
      }

      groups[group] = { selector, count: visible.length, samples }
    }

    return {
      url: snapshotUrl,
      label: snapshotLabel,
      viewport: viewportName,
      pageHeight: document.documentElement.scrollHeight,
      rootVars,
      groups,
    }
  }, label, url, viewport, ROOT_COLOR_VARS, SAMPLE_LIMIT_PER_GROUP)
}

function px(value: string): number | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/)
  return match ? Number(match[1]) : null
}

function valuesDiffer(property: string, source: string, candidate: string): boolean {
  if (source === candidate) return false

  if (['fontSize', 'lineHeight', 'letterSpacing'].includes(property)) {
    const sourcePx = px(source)
    const candidatePx = px(candidate)
    if (sourcePx !== null && candidatePx !== null) {
      return Math.abs(sourcePx - candidatePx) > SIZE_TOLERANCE_PX
    }
  }

  if (isAllowedAccessibleReplacement(source, candidate)) return false
  return true
}

function isAllowedAccessibleReplacement(source: string, candidate: string): boolean {
  const expected = ACCESSIBLE_COLOR_REPLACEMENTS.get(source.toLowerCase())
  return expected === candidate.toLowerCase()
}

function severityFor(group: string, property: string): Severity {
  if (property === 'fontFamilyKind') return 'critical'
  if (property === 'fontWeight' && group === 'headings') return 'critical'
  if (property === 'fontSize' && group === 'headings') return 'critical'
  if (property.includes('Color')) return 'critical'
  if (property === 'color') return 'critical'
  if (property === 'display') return 'warning'
  return 'warning'
}

function labelForSample(sample: ElementSample): string {
  const text = sample.text || sample.src || sample.href || sample.key
  return `${sample.group} ${sample.tag}[${sample.index}] "${text.substring(0, 36)}"`
}

function pushRegression(
  regressions: Regression[],
  snapshot: PageSnapshot,
  element: string,
  property: string,
  source: string,
  candidate: string,
  severity: Severity,
): void {
  regressions.push({
    page: snapshot.label,
    viewport: snapshot.viewport,
    element,
    property,
    source,
    candidate,
    severity,
  })
}

function compareSnapshots(source: PageSnapshot, candidate: PageSnapshot): Regression[] {
  const regressions: Regression[] = []

  compareRootVars(source, candidate, regressions)
  compareGroups(source, candidate, regressions)
  scanRetiredCandidateColors(candidate, regressions)

  const heightDelta = Math.abs(candidate.pageHeight - source.pageHeight)
  if (source.pageHeight > 0 && heightDelta > source.pageHeight * 0.5) {
    pushRegression(
      regressions,
      candidate,
      'page',
      'height',
      `${source.pageHeight}px`,
      `${candidate.pageHeight}px`,
      'warning',
    )
  }

  return regressions
}

function compareRootVars(source: PageSnapshot, candidate: PageSnapshot, regressions: Regression[]): void {
  for (const [name, candidateValue] of Object.entries(candidate.rootVars)) {
    if (RETIRED_LOCAL_COLORS.has(candidateValue)) {
      pushRegression(regressions, candidate, ':root', name, 'not retired', candidateValue, 'critical')
    }
  }

  for (const name of ROOT_COLOR_VARS) {
    const sourceValue = source.rootVars[name]
    const candidateValue = candidate.rootVars[name]
    if (!sourceValue || !candidateValue) continue
    if (valuesDiffer(name, sourceValue, candidateValue)) {
      pushRegression(regressions, candidate, ':root', name, sourceValue, candidateValue, 'warning')
    }
  }
}

function compareGroups(source: PageSnapshot, candidate: PageSnapshot, regressions: Regression[]): void {
  for (const [groupName, sourceGroup] of Object.entries(source.groups)) {
    const candidateGroup = candidate.groups[groupName]
    if (!candidateGroup) {
      pushRegression(regressions, candidate, groupName, 'exists', `${sourceGroup.count}`, '0', 'critical')
      continue
    }

    if (sourceGroup.count > 0 && candidateGroup.count === 0) {
      pushRegression(regressions, candidate, groupName, 'count', `${sourceGroup.count}`, '0', 'critical')
    } else if (sourceGroup.count > 2 && Math.abs(candidateGroup.count - sourceGroup.count) > sourceGroup.count * COUNT_WARNING_RATIO) {
      pushRegression(regressions, candidate, groupName, 'count', `${sourceGroup.count}`, `${candidateGroup.count}`, 'warning')
    }

    const candidateByKey = new Map(candidateGroup.samples.map(sample => [sample.key, sample]))
    for (const sourceSample of sourceGroup.samples) {
      const candidateSample = candidateByKey.get(sourceSample.key)
      if (!candidateSample) {
        pushRegression(regressions, candidate, labelForSample(sourceSample), 'sample', 'present', 'missing', 'warning')
        continue
      }
      compareSample(sourceSample, candidateSample, candidate, regressions)
    }
  }
}

function compareSample(
  sourceSample: ElementSample,
  candidateSample: ElementSample,
  candidateSnapshot: PageSnapshot,
  regressions: Regression[],
): void {
  const comparableProps: (keyof ElementStyles)[] = [
    'fontSize',
    'fontWeight',
    'fontFamilyKind',
    'color',
    'backgroundColor',
    'textTransform',
    'letterSpacing',
    'lineHeight',
    'textDecorationLine',
    'textDecorationColor',
    'borderTopWidth',
    'borderTopColor',
    'borderBottomWidth',
    'borderBottomColor',
    'listStyleType',
    'listStyleImage',
    'markerColor',
    'beforeContent',
    'beforeColor',
    'beforeBackgroundColor',
    'afterContent',
    'afterColor',
    'afterBackgroundColor',
    'display',
  ]

  for (const prop of comparableProps) {
    if (!shouldCompareStyleProp(sourceSample, candidateSample, prop)) continue
    const sourceValue = String(sourceSample.styles[prop])
    const candidateValue = String(candidateSample.styles[prop])
    if (!valuesDiffer(prop, sourceValue, candidateValue)) continue

    pushRegression(
      regressions,
      candidateSnapshot,
      labelForSample(sourceSample),
      prop,
      sourceValue,
      candidateValue,
      severityFor(sourceSample.group, prop),
    )
  }
}

function shouldCompareStyleProp(sourceSample: ElementSample, candidateSample: ElementSample, prop: keyof ElementStyles): boolean {
  if (sourceSample.group === 'surfacedControls') {
    return [
      'color',
      'backgroundColor',
      'borderTopWidth',
      'borderTopColor',
      'borderBottomWidth',
      'borderBottomColor',
      'beforeBackgroundColor',
      'afterBackgroundColor',
    ].includes(prop)
  }

  if (prop === 'display') return sourceSample.group === 'linksAndButtons' || sourceSample.group === 'formControls'

  if (prop === 'textDecorationColor') {
    return sourceSample.styles.textDecorationLine !== 'none' || candidateSample.styles.textDecorationLine !== 'none'
  }

  if (prop === 'markerColor' || prop === 'listStyleImage' || prop === 'listStyleType') {
    return sourceSample.group === 'lists'
  }

  if (prop === 'borderTopColor') {
    return sourceSample.styles.borderTopWidth !== '0px' || candidateSample.styles.borderTopWidth !== '0px'
  }

  if (prop === 'borderBottomColor') {
    return sourceSample.styles.borderBottomWidth !== '0px' || candidateSample.styles.borderBottomWidth !== '0px'
  }

  if (prop === 'beforeColor' || prop === 'beforeBackgroundColor' || prop === 'beforeContent') {
    return hasPseudoContent(sourceSample.styles.beforeContent) || hasPseudoContent(candidateSample.styles.beforeContent)
  }

  if (prop === 'afterColor' || prop === 'afterBackgroundColor' || prop === 'afterContent') {
    return hasPseudoContent(sourceSample.styles.afterContent) || hasPseudoContent(candidateSample.styles.afterContent)
  }

  return sourceSample.group !== 'surfacedControls'
}

function hasPseudoContent(content: string): boolean {
  return content !== 'none' && content !== 'normal' && content !== '""' && content !== ''
}

function scanRetiredCandidateColors(candidate: PageSnapshot, regressions: Regression[]): void {
  for (const group of Object.values(candidate.groups)) {
    for (const sample of group.samples) {
      for (const [property, value] of Object.entries(sample.styles)) {
        if (!shouldScanRetiredColor(sample, property as keyof ElementStyles)) continue
        if (typeof value === 'string' && RETIRED_LOCAL_COLORS.has(value.toLowerCase())) {
          pushRegression(
            regressions,
            candidate,
            labelForSample(sample),
            `retired ${property}`,
            'not retired',
            value,
            'critical',
          )
        }
      }
    }
  }
}

function shouldScanRetiredColor(sample: ElementSample, property: keyof ElementStyles): boolean {
  if (property === 'borderTopColor') return sample.styles.borderTopWidth !== '0px'
  if (property === 'borderBottomColor') return sample.styles.borderBottomWidth !== '0px'
  if (property === 'markerColor') return sample.group === 'lists'
  if (property === 'beforeColor' || property === 'beforeBackgroundColor') return hasPseudoContent(sample.styles.beforeContent)
  if (property === 'afterColor' || property === 'afterBackgroundColor') return hasPseudoContent(sample.styles.afterContent)
  return property.toLowerCase().includes('color')
}

function formatRegression(regression: Regression): string {
  const icon = regression.severity === 'critical' ? 'CRITICAL' : 'WARN'
  return `${icon} [${regression.viewport}] ${regression.page} - ${regression.element} ${regression.property}: "${regression.source}" -> "${regression.candidate}"`
}

async function run(): Promise<void> {
  const args = process.argv.slice(2)
  if (hasArg(args, '--help') || hasArg(args, '-h')) {
    printHelp()
    return
  }

  const candidateBase = getArgValue(args, '--candidate-base') || process.env.REGRESSION_CANDIDATE_BASE_URL || CANDIDATE_BASE_URL
  const sourceBase = getArgValue(args, '--source-base') || process.env.REGRESSION_SOURCE_BASE_URL || SOURCE_BASE_URL
  const timeoutMs = Number.parseInt(getArgValue(args, '--timeout') || '', 10) || 30000
  const pages = selectPages(args)
  const viewports = selectViewports(args)
  const jsonOutput = hasArg(args, '--json')
  const failOnWarnings = hasArg(args, '--fail-on-warnings')
  const retiredBaselineFlag = hasArg(args, '--baseline') || hasArg(args, '--update')

  if (hasArg(args, '--list')) {
    for (const page of pages) {
      console.log(`${page.section.padEnd(6)} ${page.path} <= ${sourcePathFor(page)} ${page.notes ? `(${page.notes})` : ''}`)
    }
    return
  }

  await verifyCandidate(candidateBase)

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const allRegressions: Regression[] = []
  const failures: string[] = []

  try {
    if (!jsonOutput) {
      console.log(`\nLive regression check - ${pages.length} pages, ${viewports.map(v => v.name).join('+')}`)
      console.log(`Source:    ${sourceBase}`)
      console.log(`Candidate: ${candidateBase}\n`)
      if (retiredBaselineFlag) {
        console.log('Note: --baseline/--update is retired; this runner uses the live site as the baseline.\n')
      }
    }

    for (const viewport of viewports) {
      const sourcePage = await newPage(browser, viewport)
      const candidatePage = await newPage(browser, viewport)

      try {
        for (const regressionPage of pages) {
          const sourceUrl = buildUrl(sourceBase, sourcePathFor(regressionPage))
          const candidateUrl = buildUrl(candidateBase, regressionPage.path)

          if (!jsonOutput) process.stdout.write(`  [${viewport.name}] ${regressionPage.label}... `)
          try {
            const [sourceSnapshot, candidateSnapshot] = await Promise.all([
              snapshotPage(sourcePage, sourceUrl, regressionPage.label, viewport.name, timeoutMs),
              snapshotPage(candidatePage, candidateUrl, regressionPage.label, viewport.name, timeoutMs),
            ])
            const regressions = compareSnapshots(sourceSnapshot, candidateSnapshot)
            allRegressions.push(...regressions)
            if (!jsonOutput) {
              const critical = regressions.filter(r => r.severity === 'critical').length
              const warnings = regressions.length - critical
              console.log(critical || warnings ? `${critical} critical, ${warnings} warnings` : 'OK')
            }
          } catch (error) {
            const message = `${regressionPage.label} [${viewport.name}]: ${(error as Error).message}`
            failures.push(message)
            if (!jsonOutput) console.log(`ERROR: ${(error as Error).message}`)
          }
        }
      } finally {
        await sourcePage.close()
        await candidatePage.close()
      }
    }
  } finally {
    await browser.close()
  }

  const critical = allRegressions.filter(r => r.severity === 'critical')
  const warnings = allRegressions.filter(r => r.severity === 'warning')

  if (jsonOutput) {
    console.log(JSON.stringify({ critical, warnings, failures, pagesChecked: pages.length, viewports: viewports.map(v => v.name) }, null, 2))
  } else {
    console.log(`\nSummary: ${critical.length} critical, ${warnings.length} warnings, ${failures.length} capture failures`)
    for (const failure of failures) console.log(`ERROR ${failure}`)
    for (const regression of critical.slice(0, 80)) console.log(formatRegression(regression))
    if (critical.length > 80) console.log(`... and ${critical.length - 80} more critical findings`)
    for (const regression of warnings.slice(0, 40)) console.log(formatRegression(regression))
    if (warnings.length > 40) console.log(`... and ${warnings.length - 40} more warnings`)
  }

  if (failures.length > 0 || critical.length > 0 || (failOnWarnings && warnings.length > 0)) {
    process.exit(1)
  }
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
