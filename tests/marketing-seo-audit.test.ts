import { describe, expect, it } from 'vitest'
import {
  auditOnPage,
  auditStructuredData,
  computeHealthScore,
  type SeoFinding,
} from '@/lib/marketing/seoAudit'

const URL = 'https://www.goinvo.com/test/'

// A fully clean content page: good title (30–60), good meta (70–160), one h1,
// ordered headings, canonical, OG, Twitter, alt text on every image, and valid
// Article JSON-LD. Used as the "no errors" baseline.
const CLEAN_HTML = `<!doctype html><html><head>
  <title>Healthcare Data Visualization Studio — GoInvo</title>
  <meta name="description" content="GoInvo is a healthcare design studio crafting open-source data visualizations and human-centered software for patients, clinicians, and researchers.">
  <link rel="canonical" href="${URL}">
  <meta property="og:title" content="Healthcare Data Visualization — GoInvo">
  <meta property="og:image" content="https://www.goinvo.com/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Article","headline":"Healthcare Data Visualization","author":{"@type":"Person","name":"Juhan Sonin"},"datePublished":"2024-01-01"}
  </script>
</head><body>
  <h1>Healthcare Data Visualization</h1>
  <h2>Our approach</h2>
  <p>We design open-source tools.</p>
  <h3>Process</h3>
  <img src="/diagram.png" alt="A data flow diagram showing patient data moving through GoInvo's pipeline">
</body></html>`

function idsOf(findings: SeoFinding[]): string[] {
  return findings.map((f) => f.id)
}

describe('auditOnPage', () => {
  it('flags a missing title as an onpage error', () => {
    const html = '<html><head></head><body><h1>Hi</h1></body></html>'
    const findings = auditOnPage(URL, html)
    const titleFinding = findings.find((f) => f.id === 'onpage:title-missing')
    expect(titleFinding).toBeDefined()
    expect(titleFinding?.category).toBe('onpage')
    expect(titleFinding?.severity).toBe('error')
  })

  it('flags an over-60-character title as a warning and quotes the length', () => {
    const longTitle = 'GoInvo Healthcare Design Studio for Patients Clinicians Researchers and Hospitals'
    const html = `<html><head><title>${longTitle}</title></head><body><h1>X</h1></body></html>`
    const findings = auditOnPage(URL, html)
    const f = findings.find((x) => x.id === 'onpage:title-too-long')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('warning')
    // §6: the finding must name the actual offending value.
    expect(f?.what).toContain(String(longTitle.length))
    expect(f?.what).toContain(longTitle)
  })

  it('flags a too-short title as a notice', () => {
    const html = '<html><head><title>GoInvo Home</title></head><body><h1>X</h1></body></html>'
    const findings = auditOnPage(URL, html)
    const f = findings.find((x) => x.id === 'onpage:title-too-short')
    expect(f?.severity).toBe('notice')
  })

  it('flags a missing meta description as a warning', () => {
    const html = '<html><head><title>A reasonable thirty plus character title here</title></head><body><h1>X</h1></body></html>'
    const findings = auditOnPage(URL, html)
    expect(idsOf(findings)).toContain('onpage:meta-description-missing')
  })

  it('flags an over-160-character meta description as a warning', () => {
    const desc = 'x'.repeat(180)
    const html = `<html><head><meta name="description" content="${desc}"></head><body><h1>X</h1></body></html>`
    const findings = auditOnPage(URL, html)
    const f = findings.find((x) => x.id === 'onpage:meta-description-too-long')
    expect(f?.severity).toBe('warning')
    expect(f?.what).toContain('180')
  })

  it('flags a missing h1 as an error', () => {
    const html = '<html><head><title>A reasonable thirty plus character title here</title></head><body><p>no heading</p></body></html>'
    const findings = auditOnPage(URL, html)
    const f = findings.find((x) => x.id === 'onpage:h1-missing')
    expect(f?.severity).toBe('error')
  })

  it('produces a multiple-h1 finding when a page has two h1 tags', () => {
    const html = '<html><head><title>A reasonable thirty plus character title here</title></head><body><h1>First</h1><h1>Second</h1></body></html>'
    const findings = auditOnPage(URL, html)
    const f = findings.find((x) => x.id === 'onpage:h1-multiple')
    expect(f).toBeDefined()
    expect(f?.what).toContain('2')
  })

  it('flags a skipped heading level (h2 -> h4)', () => {
    const html = '<html><head><title>A reasonable thirty plus character title here</title></head><body><h1>T</h1><h2>Section</h2><h4>Detail</h4></body></html>'
    const findings = auditOnPage(URL, html)
    const f = findings.find((x) => x.id === 'onpage:heading-order-skip')
    expect(f).toBeDefined()
    expect(f?.what).toContain('h4')
  })

  it('flags missing canonical, og:title, og:image and twitter:card', () => {
    const html = '<html><head><title>A reasonable thirty plus character title here</title></head><body><h1>T</h1></body></html>'
    const ids = idsOf(auditOnPage(URL, html))
    expect(ids).toContain('onpage:canonical-missing')
    expect(ids).toContain('onpage:og-title-missing')
    expect(ids).toContain('onpage:og-image-missing')
    expect(ids).toContain('onpage:twitter-card-missing')
  })

  it('reports image alt-text coverage with a percentage and example src', () => {
    const html =
      '<html><head><title>A reasonable thirty plus character title here</title></head><body><h1>T</h1>' +
      '<img src="/a.png" alt="ok"><img src="/b.png"><img src="/c.png"></body></html>'
    const findings = auditOnPage(URL, html)
    const f = findings.find((x) => x.id === 'onpage:image-alt-missing')
    expect(f).toBeDefined()
    expect(f?.what).toContain('2 of 3') // 2 of 3 missing
    expect(f?.what).toContain('67%')
    expect(f?.what).toContain('/b.png')
  })

  it('does not count an explicit empty alt="" as missing', () => {
    const html =
      '<html><head><title>A reasonable thirty plus character title here</title></head><body><h1>T</h1>' +
      '<img src="/decorative.png" alt=""></body></html>'
    const findings = auditOnPage(URL, html)
    expect(idsOf(findings)).not.toContain('onpage:image-alt-missing')
  })

  it('produces no onpage errors for a clean page', () => {
    const findings = auditOnPage(URL, CLEAN_HTML)
    const errors = findings.filter((f) => f.severity === 'error')
    expect(errors).toEqual([])
  })

  it('tags every finding with category onpage and source html-parse', () => {
    const findings = auditOnPage(URL, '<html><head></head><body></body></html>')
    expect(findings.length).toBeGreaterThan(0)
    for (const f of findings) {
      expect(f.category).toBe('onpage')
      expect(f.source).toBe('html-parse')
      expect(f.affectedUrls).toEqual([URL])
    }
  })
})

describe('auditStructuredData', () => {
  it('emits a structured-data error for invalid JSON-LD', () => {
    const html =
      '<html><head><script type="application/ld+json">{ not: valid json, }</script></head><body></body></html>'
    const findings = auditStructuredData(URL, html)
    const f = findings.find((x) => x.category === 'structured-data' && x.severity === 'error')
    expect(f).toBeDefined()
    expect(f?.id).toContain('json-ld-invalid')
  })

  it('parses valid JSON-LD and finds no error, collecting @type', () => {
    const findings = auditStructuredData(URL, CLEAN_HTML)
    expect(findings.filter((f) => f.severity === 'error')).toEqual([])
    // Article schema present, so the content page should NOT flag a missing one.
    expect(idsOf(findings)).not.toContain('structured-data:schema-article-missing')
  })

  it('flags a missing Article schema on a content page', () => {
    const html = '<html><head><title>x</title></head><body><h1>Article body</h1></body></html>'
    const findings = auditStructuredData(URL, html)
    expect(idsOf(findings)).toContain('structured-data:schema-article-missing')
  })

  it('flags a missing Organization schema on the homepage', () => {
    const findings = auditStructuredData('https://www.goinvo.com/', '<html><head></head><body><h1>GoInvo</h1></body></html>')
    expect(idsOf(findings)).toContain('structured-data:schema-organization-missing')
  })

  it('flags a missing FAQPage schema on FAQ-like content', () => {
    const html =
      '<html><head></head><body><h2>What is GoInvo?</h2><p>A studio.</p><h2>Where is GoInvo?</h2><p>Boston.</p><h2>Who runs GoInvo?</h2><p>Juhan.</p></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/about/', html)
    expect(idsOf(findings)).toContain('structured-data:schema-faqpage-missing')
  })

  it('handles @graph and @type arrays when collecting types', () => {
    const html =
      '<html><head><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"GoInvo"}]}</script></head><body><h1>GoInvo</h1></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/', html)
    // Organization was found inside @graph, so no missing-Organization finding.
    expect(idsOf(findings)).not.toContain('structured-data:schema-organization-missing')
  })
})

describe('computeHealthScore (§5: only errors move the score)', () => {
  it('scores a clean page 100 / Excellent', () => {
    const findings = auditOnPage(URL, CLEAN_HTML)
    const score = computeHealthScore(findings, 1)
    expect(score.score).toBe(100)
    expect(score.band).toBe('Excellent')
    expect(score.errors).toBe(0)
  })

  it('is unaffected by warnings and notices', () => {
    const warningsAndNotices: SeoFinding[] = [
      { ...stub('warning'), affectedUrls: [URL] },
      { ...stub('notice'), affectedUrls: [URL] },
    ]
    const score = computeHealthScore(warningsAndNotices, 1)
    expect(score.score).toBe(100)
    expect(score.warnings).toBe(1)
    expect(score.notices).toBe(1)
  })

  it('drops to 0 on a single page that has any error', () => {
    const findings: SeoFinding[] = [{ ...stub('error'), affectedUrls: [URL] }]
    const score = computeHealthScore(findings, 1)
    expect(score.score).toBe(0)
    expect(score.band).toBe('Weak')
  })

  it('uses the Ahrefs errorless-URL ratio across multiple pages', () => {
    // 4 pages, 1 has an error → 3/4 errorless → 75 → Good.
    const findings: SeoFinding[] = [{ ...stub('error'), affectedUrls: ['https://x/1'] }]
    const score = computeHealthScore(findings, 4)
    expect(score.score).toBe(75)
    expect(score.band).toBe('Good')
  })

  it('assigns the correct bands at boundaries', () => {
    expect(computeHealthScore([{ ...stub('error'), affectedUrls: ['u'] }], 10).band).toBe('Good') // 90
    expect(computeHealthScore([], 10).band).toBe('Excellent') // 100
  })
})

function stub(severity: SeoFinding['severity']): SeoFinding {
  return {
    id: `test:${severity}`,
    category: 'onpage',
    severity,
    priorityWeight: 1,
    urlsAffected: 1,
    pctSite: 0,
    indexable: true,
    what: 'x',
    why: 'x',
    howToFix: 'x',
    affectedUrls: [],
    source: 'html-parse',
    status: 'open',
    detectedAt: new Date().toISOString(),
  }
}
