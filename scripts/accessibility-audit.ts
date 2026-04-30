/**
 * Accessibility Audit
 *
 * Runs axe-core in Puppeteer against rendered pages and adds a few pragmatic
 * checks axe does not reliably cover for this project: heading jumps, empty
 * headings, horizontal overflow, and tiny non-inline tap targets.
 *
 * Usage:
 *   npm run manage -- audit:a11y
 *   npm run manage -- audit:a11y --viewport mobile --section vision
 *   npm run manage -- audit:a11y --paths /,/work,/vision/human-centered-design-for-ai
 *   npm run manage -- audit:a11y --fail-on serious
 */

import axeCore from 'axe-core'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import puppeteer, { type Browser, type Page } from 'puppeteer'

type ViewportName = 'desktop' | 'mobile'
type Impact = 'minor' | 'moderate' | 'serious' | 'critical'
type FailOn = Impact | 'none'

type CustomFinding = {
  id: string
  impact: Impact
  message: string
  selector: string
  html?: string
}

type PageReport = {
  path: string
  url: string
  viewport: ViewportName
  status: number | null
  axeViolationCount: number
  axeNodeCount: number
  customFindingCount: number
  violations: Array<{
    id: string
    impact: Impact | null
    description: string
    help: string
    helpUrl: string
    nodes: Array<{
      target: string[]
      html: string
      failureSummary?: string
    }>
  }>
  customFindings: CustomFinding[]
  error?: string
}

const DEFAULT_BASE = process.env.NEXT_BASE_URL || 'http://localhost:3000'
const GOINVO_HOSTS = new Set(['localhost', '127.0.0.1', 'www.goinvo.com', 'goinvo.com'])
const IMPACT_RANK: Record<FailOn, number> = {
  none: 99,
  minor: 0,
  moderate: 1,
  serious: 2,
  critical: 3,
}

const VIEWPORTS: Record<ViewportName, { width: number; height: number; isMobile?: boolean }> = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true },
}

function getArgValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag)
  if (index === -1) return null
  const value = args[index + 1]
  return value && !value.startsWith('--') ? value : null
}

function parseList(value: string | null): string[] {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
}

function normalizePath(input: string): string {
  try {
    const parsed = new URL(input)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return input.startsWith('/') ? input : `/${input}`
  }
}

function selectViewports(value: string | null): ViewportName[] {
  if (!value || value === 'both') return ['desktop', 'mobile']
  if (value === 'desktop' || value === 'mobile') return [value]
  throw new Error(`Invalid --viewport "${value}". Expected desktop, mobile, or both.`)
}

function shouldFail(impact: Impact | null, failOn: FailOn): boolean {
  if (!impact || failOn === 'none') return false
  return IMPACT_RANK[impact] >= IMPACT_RANK[failOn]
}

async function getSitemapPaths(baseUrl: string): Promise<string[]> {
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString()
  const response = await fetch(sitemapUrl)
  if (!response.ok) {
    throw new Error(`Could not fetch sitemap at ${sitemapUrl}: HTTP ${response.status}`)
  }

  const xml = await response.text()
  const paths = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((match) => match[1])
    .map((loc) => {
      const parsed = new URL(loc)
      return `${parsed.pathname}${parsed.search}`
    })

  const unique = Array.from(new Set(paths)).sort()
  if (unique.length === 0) {
    throw new Error(`Sitemap at ${sitemapUrl} did not contain any <loc> entries`)
  }

  return unique
}

function filterPaths(paths: string[], section: string | null): string[] {
  if (!section || section === 'all') return paths
  if (section === 'vision') return paths.filter((pagePath) => pagePath === '/vision' || pagePath.startsWith('/vision/'))
  if (section === 'work') return paths.filter((pagePath) => pagePath === '/work' || pagePath.startsWith('/work/'))
  if (section === 'main') return paths.filter((pagePath) => !pagePath.startsWith('/vision/') && !pagePath.startsWith('/work/'))
  throw new Error(`Invalid --section "${section}". Expected all, vision, work, or main.`)
}

async function collectPaths(baseUrl: string, args: string[]): Promise<string[]> {
  const explicitPaths = [
    ...parseList(getArgValue(args, '--paths')),
    ...args.filter((arg, index) => {
      const previous = args[index - 1]
      return !arg.startsWith('--') && !['--base', '--paths', '--section', '--viewport', '--limit', '--output', '--fail-on', '--timeout-ms'].includes(previous)
    }),
  ]

  const paths = explicitPaths.length > 0
    ? explicitPaths.map(normalizePath)
    : await getSitemapPaths(baseUrl)

  const section = getArgValue(args, '--section')
  const limitValue = getArgValue(args, '--limit')
  const filtered = filterPaths(Array.from(new Set(paths)).sort(), section)

  if (limitValue) {
    const limit = Number(limitValue)
    if (!Number.isInteger(limit) || limit <= 0) throw new Error(`Invalid --limit "${limitValue}"`)
    return filtered.slice(0, limit)
  }

  return filtered
}

async function runAxe(page: Page) {
  await page.addScriptTag({ content: axeCore.source })
  return page.evaluate(async () => {
    const axe = (window as typeof window & { axe: typeof import('axe-core') }).axe
    return axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
      resultTypes: ['violations'],
    })
  })
}

async function runCustomChecks(page: Page): Promise<CustomFinding[]> {
  return page.evaluate(() => {
    type Finding = {
      id: string
      impact: 'minor' | 'moderate' | 'serious' | 'critical'
      message: string
      selector: string
      html?: string
    }

    const findings: Finding[] = []

    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }

    const selectorFor = (element: Element) => {
      if (element.id) return `#${CSS.escape(element.id)}`
      const parts: string[] = []
      let current: Element | null = element
      while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
        const tag = current.tagName.toLowerCase()
        const parent = current.parentElement
        if (!parent) {
          parts.unshift(tag)
          break
        }
        const siblings = Array.from(parent.children).filter((sibling) => sibling.tagName === current?.tagName)
        const index = siblings.indexOf(current) + 1
        parts.unshift(`${tag}:nth-of-type(${index})`)
        current = parent
      }
      return parts.join(' > ')
    }

    const root = document.querySelector('main') || document.body
    const headings = Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible)
    let previousLevel = 0
    for (const heading of headings) {
      const level = Number(heading.tagName.slice(1))
      const text = (heading.textContent || '').replace(/\s+/g, ' ').trim()
      if (!text) {
        findings.push({
          id: 'empty-heading',
          impact: 'moderate',
          message: 'Visible heading has no accessible text.',
          selector: selectorFor(heading),
          html: heading.outerHTML.slice(0, 300),
        })
      }
      if (previousLevel > 0 && level > previousLevel + 1) {
        findings.push({
          id: 'heading-order',
          impact: 'moderate',
          message: `Heading jumps from h${previousLevel} to h${level}.`,
          selector: selectorFor(heading),
          html: heading.outerHTML.slice(0, 300),
        })
      }
      previousLevel = level
    }

    const overflowPx = Math.round(document.documentElement.scrollWidth - window.innerWidth)
    if (overflowPx > 3) {
      findings.push({
        id: 'horizontal-overflow',
        impact: 'serious',
        message: `Document overflows viewport horizontally by ${overflowPx}px.`,
        selector: 'html',
      })
    }

    const controls = Array.from(
      document.querySelectorAll('a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])')
    ).filter((element) => visible(element) && !element.closest('[aria-hidden="true"], [hidden]'))

    for (const control of controls) {
      const style = getComputedStyle(control)
      const rect = control.getBoundingClientRect()
      const isVisuallyHidden =
        control.classList.contains('sr-only') ||
        (style.position === 'absolute' && rect.width <= 1 && rect.height <= 1 && style.overflow === 'hidden')
      if (isVisuallyHidden) continue

      const tagName = control.tagName.toLowerCase()
      const className = control.getAttribute('class') || ''
      const isButtonLikeLink =
        tagName === 'a' &&
        (control.getAttribute('role') === 'button' || /\b(btn|button)\b/.test(className))
      if (tagName === 'a' && !isButtonLikeLink) continue

      const isInlineTextLink = control.tagName.toLowerCase() === 'a' && style.display === 'inline' && Boolean(control.closest('p, li, figcaption'))
      if (isInlineTextLink) continue

      if (rect.width < 24 || rect.height < 24) {
        findings.push({
          id: 'small-tap-target',
          impact: 'moderate',
          message: `Interactive target is ${Math.round(rect.width)}x${Math.round(rect.height)}px; non-inline targets should be at least 24x24px.`,
          selector: selectorFor(control),
          html: control.outerHTML.slice(0, 300),
        })
      }
    }

    return findings
  })
}

async function auditPage(browser: Browser, baseUrl: string, pagePath: string, viewport: ViewportName, timeoutMs: number): Promise<PageReport> {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument('window.__name = (target) => target')
  const viewportConfig = VIEWPORTS[viewport]
  await page.setViewport({
    width: viewportConfig.width,
    height: viewportConfig.height,
    isMobile: Boolean(viewportConfig.isMobile),
  })

  const url = new URL(pagePath, baseUrl).toString()

  try {
    const parsedUrl = new URL(url)
    if (!GOINVO_HOSTS.has(parsedUrl.hostname)) {
      throw new Error(`Refusing to audit non-GoInvo URL: ${url}`)
    }

    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs })
    await new Promise((resolve) => setTimeout(resolve, 250))
    await page.evaluate('window.__name = (target) => target')

    const axeResult = await runAxe(page)
    const customFindings = await runCustomChecks(page)

    return {
      path: pagePath,
      url,
      viewport,
      status: response?.status() ?? null,
      axeViolationCount: axeResult.violations.length,
      axeNodeCount: axeResult.violations.reduce((sum, violation) => sum + violation.nodes.length, 0),
      customFindingCount: customFindings.length,
      violations: axeResult.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact || null,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      })),
      customFindings,
    }
  } catch (error) {
    return {
      path: pagePath,
      url,
      viewport,
      status: null,
      axeViolationCount: 0,
      axeNodeCount: 0,
      customFindingCount: 0,
      violations: [],
      customFindings: [],
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    await page.close()
  }
}

function summarize(reports: PageReport[], failOn: FailOn): number {
  const errors = reports.filter((report) => report.error)
  const axeNodes = reports.reduce((sum, report) => sum + report.axeNodeCount, 0)
  const customFindings = reports.reduce((sum, report) => sum + report.customFindingCount, 0)
  const byImpact: Record<string, number> = {}

  for (const report of reports) {
    for (const violation of report.violations) {
      const impact = violation.impact || 'unknown'
      byImpact[impact] = (byImpact[impact] || 0) + violation.nodes.length
    }
    for (const finding of report.customFindings) {
      byImpact[finding.impact] = (byImpact[finding.impact] || 0) + 1
    }
  }

  console.log('\nAccessibility audit summary')
  console.log(`  Page/viewport checks: ${reports.length}`)
  console.log(`  Axe affected nodes: ${axeNodes}`)
  console.log(`  Custom findings: ${customFindings}`)
  console.log(`  Errors: ${errors.length}`)
  console.log(`  Impact counts: ${JSON.stringify(byImpact)}`)

  const notable = reports
    .filter((report) => report.error || report.axeNodeCount > 0 || report.customFindingCount > 0)
    .slice(0, 12)

  for (const report of notable) {
    console.log(`\n${report.viewport} ${report.path}`)
    if (report.error) {
      console.log(`  ERROR: ${report.error}`)
      continue
    }
    for (const violation of report.violations.slice(0, 5)) {
      console.log(`  axe ${violation.impact || 'unknown'} ${violation.id}: ${violation.nodes.length} node(s) - ${violation.help}`)
    }
    for (const finding of report.customFindings.slice(0, 5)) {
      console.log(`  custom ${finding.impact} ${finding.id}: ${finding.message} (${finding.selector})`)
    }
  }

  if (errors.length > 0) return 1
  if (failOn === 'none') return 0

  return reports.some((report) =>
    report.violations.some((violation) => shouldFail(violation.impact, failOn)) ||
    report.customFindings.some((finding) => shouldFail(finding.impact, failOn))
  ) ? 1 : 0
}

async function main() {
  const args = process.argv.slice(2)
  const baseUrl = getArgValue(args, '--base') || DEFAULT_BASE
  const output = getArgValue(args, '--output') || path.join('.audit', 'accessibility-report.json')
  const failOn = (getArgValue(args, '--fail-on') || 'none') as FailOn
  const timeoutMs = Number(getArgValue(args, '--timeout-ms') || 60_000)

  if (!(failOn in IMPACT_RANK)) {
    throw new Error(`Invalid --fail-on "${failOn}". Expected none, minor, moderate, serious, or critical.`)
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid --timeout-ms "${getArgValue(args, '--timeout-ms')}"`)
  }

  const paths = await collectPaths(baseUrl, args)
  if (paths.length === 0) throw new Error('No pages selected for accessibility audit')

  const viewports = selectViewports(getArgValue(args, '--viewport'))
  console.log(`Auditing ${paths.length} path(s) across ${viewports.join(', ')} viewport(s) from ${baseUrl}`)

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  const reports: PageReport[] = []

  try {
    for (const viewport of viewports) {
      for (const pagePath of paths) {
        process.stderr.write(`Checking ${viewport} ${pagePath}\n`)
        reports.push(await auditPage(browser, baseUrl, pagePath, viewport, timeoutMs))
      }
    }
  } finally {
    await browser.close()
  }

  mkdirSync(path.dirname(output), { recursive: true })
  writeFileSync(output, JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl,
    viewports,
    paths,
    reports,
  }, null, 2))

  console.log(`\nWrote ${output}`)
  process.exitCode = summarize(reports, failOn)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
