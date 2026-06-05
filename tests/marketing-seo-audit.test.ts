import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  auditAiCrawlerAccess,
  auditAiReadiness,
  auditEeat,
  auditIndexation,
  auditOnPage,
  auditRenderGap,
  auditStructuredData,
  computeHealthScore,
  mapInspection,
  mapRenderGap,
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

  // --- §12 structured-data corrections ------------------------------------

  it('recommends Dataset schema on a page that looks like open data', () => {
    const html =
      '<html><head><title>Open data visualizations</title></head><body><h1>Determinants of Health</h1>' +
      '<p>An open-source dataset and visualization of the social determinants of health.</p></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/vision/determinants-of-health/', html)
    expect(idsOf(findings)).toContain('structured-data:schema-dataset-missing')
  })

  it('does NOT frame FAQPage as a rich-result win (it is demoted to GEO/AI extraction)', () => {
    const html =
      '<html><head></head><body><h2>What is GoInvo?</h2><p>A studio.</p><h2>Where is GoInvo?</h2><p>Boston.</p><h2>Who runs GoInvo?</h2><p>Juhan.</p></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/about/', html)
    const faq = findings.find((f) => f.id === 'structured-data:schema-faqpage-missing')
    expect(faq).toBeDefined()
    // The whole finding (what/why/how) must not promise a rich result; it must
    // say the rich result is retired and frame the value as AI extraction.
    const blob = `${faq?.what} ${faq?.why} ${faq?.howToFix}`.toLowerCase()
    expect(blob).toContain('retired')
    expect(blob).toContain('ai answer engines')
    expect(faq?.why).not.toMatch(/can show your questions and answers directly in search results/i)
  })

  it('validates missing Article required properties (author + date)', () => {
    const html =
      '<html><head><title>x</title><script type="application/ld+json">' +
      '{"@context":"https://schema.org","@type":"Article","headline":"A headline"}' +
      '</script></head><body><h1>Body</h1></body></html>'
    const findings = auditStructuredData(URL, html)
    const f = findings.find((x) => x.id === 'structured-data:schema-article-incomplete')
    expect(f).toBeDefined()
    expect(f?.what).toContain('author')
    expect(f?.what).toContain('datePublished or dateModified')
    expect(f?.what).not.toContain('headline') // headline IS present
  })

  it('validates missing Organization required properties', () => {
    const html =
      '<html><head><script type="application/ld+json">' +
      '{"@context":"https://schema.org","@type":"Organization","name":"GoInvo"}' +
      '</script></head><body><h1>GoInvo</h1></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/', html)
    const f = findings.find((x) => x.id === 'structured-data:schema-organization-incomplete')
    expect(f).toBeDefined()
    expect(f?.what).toContain('url')
    expect(f?.what).toContain('logo')
  })

  it('recommends a BreadcrumbList on a non-home page that lacks it', () => {
    const html = '<html><head><title>x</title></head><body><h1>Page</h1></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/about/', html)
    expect(idsOf(findings)).toContain('structured-data:schema-breadcrumb-missing')
  })

  // --- §12 Dataset tighten: the homepage must NOT get a Dataset notice, but a
  // genuine data essay (the determinants page) still must. Exercised through
  // auditStructuredData since looksLikeDataPage is an internal helper.
  it('does NOT recommend Dataset schema on the homepage even when its copy mentions open data', () => {
    // Homepage overview copy that name-drops GoInvo's open-source data + viz —
    // exactly the language that used to over-flag the root path.
    const html =
      '<html><head><title>GoInvo — Healthcare Design Studio</title></head><body><h1>GoInvo</h1>' +
      '<p>GoInvo is a healthcare design studio. We build open-source datasets and data visualizations ' +
      'of the social determinants of health for clinicians, patients, and researchers.</p></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/', html)
    expect(idsOf(findings)).not.toContain('structured-data:schema-dataset-missing')
  })

  it('STILL recommends Dataset schema on the determinants-of-health essay', () => {
    const html =
      '<html><head><title>Determinants of Health</title></head><body><h1>Determinants of Health</h1>' +
      '<p>An open-source dataset and visualization of the social determinants of health.</p></body></html>'
    const findings = auditStructuredData('https://www.goinvo.com/vision/determinants-of-health/', html)
    expect(idsOf(findings)).toContain('structured-data:schema-dataset-missing')
  })
})

// ---------------------------------------------------------------------------
// Indexation layer (GSC URL Inspection). mapInspection is the pure mapper and
// is tested directly; auditIndexation is tested by stubbing global fetch so we
// never hit Google. A throwaway-but-valid RSA key lets getGoogleAccessToken
// sign a JWT before the (stubbed) token exchange.
// ---------------------------------------------------------------------------

// A self-signed test private key (PKCS#8). Not a real credential — only used so
// the JWT signing in getGoogleAccessToken succeeds against a stubbed token URL.
const TEST_PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDWQ3QYD+qXIb1N\nb2KAvPBh8Ve9S5q6ITBAmib4QVlpmz2PHdvzyhYQ0Cv7tcspZQoIIOnoR7mOVSCo\nje5NI96cd3uDNwwiT5UtQ2q7T9UFBZZfkOs5nCvUMJXk+247y0T0EFASn4iucwBD\nKjxZHJmYEji/ubyJm5TY/F0u5isaTbAqVy/yu3ZqwHnwpvChWLSgbUwv2I4LTe0m\nQmhyoinX4SAWa77gR4F7OuaMf5zh6Pq74F5n4buF2a7hFlQ43XMTpRdzFAuO8xxF\nqaQkjxpl5cx8u6MX1ONp2dOOuOdPHAnud9lfhyakSOGhcEXI0Rd2yDhALxWbjBBZ\n2q1wB4tBAgMBAAECggEADlAZ0iR4cjMVr08/ACsrtac54+vIGlUh1Fbxca9pdr86\nvzPQuYbcFX09sVLyD0HwIYRG8jZqxBuWRgKaxiCcyMzHsLq9i6ppF5Z20hKhplqH\nf1SYQG3Y+0cDMSiSMw1ZMSKVbsELqarSyPadas7lyPC13ymo2UDOEl0KKBosPyJZ\n6wNJwHYcGFeUxbTldsyD6Jg7+SWULZdjbzPXVbu9vPut4wewQbJg21TfwWXDu4qn\npcTIuGeN1QJcQUvn2xg+e5v7nj42T1Zi8TeIrJPSk0E/EDxvSow+VK/nlxQBFifV\nMr42rpG4fNZjnFWl4EwACwgdr9+9Py9xzGiRx8gTjwKBgQDxxSDh6lwG4AxQeAHE\nzTs6cf6yvsiJeKGnYHdBEd73sNPzIrP/V720BoRQxvtXhpALH/XAq62x9IOWW8o9\nZBhcMblDnLgGNW59fEmn+Ft66o8MGmBmRU5MwV1O0KM/h7AVCcGC2wcMXSHVa5pG\nj4+Oj2Nd+ioL54BTP0iAZtEV3wKBgQDi3966ZAwQWLJmqqfB7f9kJDDB7mPezKvB\np0/MKdr5RaCWmuUXQ9nUO460m3u50/ixFex+bZQdymup5LPMXk3n5+86qj/lnLNm\n4MK9MaDdJsI0foYvrxZpCiNxr7SugAub9BuxL1SlasP2xZO4XcH/UKD/3LcltK8J\n05DoW/5C3wKBgE1mc6l/suiMj8SvNrm/jmeemRC2XVMNaItCKcuOIhif5qrfAEsN\n1vCsaW3G1i5mKPU2zSFalOf0xK+9QRi4U8goLwyDPrLWJkJMKPR6YScPsq4IP7Ze\nF7wg53NU/f5XvTpu/iGbZz1BD5TYtvJCAY59Py2V6iIXghCkoNxijit3AoGAbM+C\nO1MQliZ0KdlfbBuBib3xxJFZRNpU5iQgmYLZiwRh6NmRVn8sUiXeY7DOvmlztTsW\nmexkRYV37ZvKwBHau4b5reFJlA573LOfsq3CwU59hj/Ii8YlsWszZKsotSikaL/D\nKE/TASMbqZdJKfuNt64sCYsKLANkkAnwTgERCXECgYAGXQF5HXc/T1V7Aw4bV0Gb\nbZqCwBacPB1ekhz1mD9jk5sG0qwAMUkLQxsIe9XquQApa2AkRFCR5GcyWyesB8vy\n2Nk7E4KSsHLTfo3v5OETP8ezxgFUouYXjxRgEaBL4vVkWB2BGGEtUoHwaoJV2aNr\npJAhiE02LE+GXApVMfAiZg==\n-----END PRIVATE KEY-----\n'

function setTestServiceAccount(): void {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    client_email: 'test-sa@example.iam.gserviceaccount.com',
    private_key: TEST_PRIVATE_KEY,
  })
}

// Build a fetch stub that returns an access token for the OAuth token endpoint
// and `inspectionPayload` for the URL Inspection endpoint.
function stubInspectFetch(inspectionPayload: unknown) {
  return vi.fn(async (input: unknown) => {
    const reqUrl = typeof input === 'string' ? input : String((input as { url?: string })?.url)
    if (reqUrl.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'test-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (reqUrl.includes('urlInspection/index:inspect')) {
      return new Response(JSON.stringify(inspectionPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw new Error(`unexpected fetch in test: ${reqUrl}`)
  })
}

describe('mapInspection (pure GSC URL-Inspection mapping)', () => {
  it('flags a not-indexed page as an indexation error quoting the coverageState', () => {
    const findings = mapInspection(URL, {
      inspectionResult: {
        indexStatusResult: {
          verdict: 'NEUTRAL',
          coverageState: 'Crawled - currently not indexed',
          pageFetchState: 'SUCCESSFUL',
        },
      },
    })
    const f = findings.find((x) => x.id === 'indexation:not-indexed')
    expect(f).toBeDefined()
    expect(f?.category).toBe('indexation')
    expect(f?.severity).toBe('error')
    expect(f?.source).toBe('gsc')
    expect(f?.what).toContain('Crawled - currently not indexed')
  })

  it('flags a noindex meta-tag block as a warning', () => {
    const findings = mapInspection(URL, {
      inspectionResult: {
        indexStatusResult: {
          verdict: 'PASS',
          coverageState: 'Submitted and indexed',
          indexingState: 'BLOCKED_BY_META_TAG',
          pageFetchState: 'SUCCESSFUL',
        },
      },
    })
    const f = findings.find((x) => x.id === 'indexation:noindex')
    expect(f?.severity).toBe('warning')
  })

  it('flags a robots.txt disallow as a warning', () => {
    const findings = mapInspection(URL, {
      inspectionResult: {
        indexStatusResult: {
          verdict: 'PASS',
          coverageState: 'Indexed, though blocked by robots.txt',
          robotsTxtState: 'DISALLOWED',
          pageFetchState: 'SUCCESSFUL',
        },
      },
    })
    const f = findings.find((x) => x.id === 'indexation:robots-blocked')
    expect(f?.severity).toBe('warning')
  })

  it('flags a canonical mismatch as a warning quoting BOTH urls', () => {
    const googleCanonical = 'https://www.goinvo.com/canonical-google/'
    const userCanonical = 'https://www.goinvo.com/canonical-declared/'
    const findings = mapInspection(URL, {
      inspectionResult: {
        indexStatusResult: {
          verdict: 'PASS',
          coverageState: 'Submitted and indexed',
          pageFetchState: 'SUCCESSFUL',
          googleCanonical,
          userCanonical,
        },
      },
    })
    const f = findings.find((x) => x.id === 'indexation:canonical-mismatch')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('warning')
    expect(f?.what).toContain(googleCanonical)
    expect(f?.what).toContain(userCanonical)
  })

  it('flags a failed page fetch (soft 404) as an error quoting the state', () => {
    const findings = mapInspection(URL, {
      inspectionResult: {
        indexStatusResult: {
          verdict: 'NEUTRAL',
          coverageState: 'Submitted and indexed',
          pageFetchState: 'SOFT_404',
        },
      },
    })
    const f = findings.find((x) => x.id === 'indexation:fetch-failed')
    expect(f?.severity).toBe('error')
    expect(f?.what).toContain('SOFT_404')
  })

  it('returns a single notice when the page is cleanly indexed', () => {
    const findings = mapInspection(URL, {
      inspectionResult: {
        indexStatusResult: {
          verdict: 'PASS',
          coverageState: 'Submitted and indexed',
          robotsTxtState: 'ALLOWED',
          indexingState: 'INDEXING_ALLOWED',
          pageFetchState: 'SUCCESSFUL',
        },
      },
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('indexation:indexed-ok')
    expect(findings[0].severity).toBe('notice')
  })

  it('falls back to the unavailable notice when there is no result block', () => {
    const findings = mapInspection(URL, {})
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('indexation:status-unavailable')
    expect(findings[0].severity).toBe('notice')
  })
})

describe('auditIndexation (graceful GSC layer — never throws)', () => {
  const realFetch = globalThis.fetch
  const realSa = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = realFetch
    if (realSa === undefined) delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    else process.env.GOOGLE_SERVICE_ACCOUNT_JSON = realSa
  })

  it('returns the unavailable notice (no throw) when no service account is set', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    const findings = await auditIndexation(URL)
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('indexation:status-unavailable')
    expect(findings[0].severity).toBe('notice')
  })

  it('maps a stubbed inspection payload: not-indexed → error', async () => {
    setTestServiceAccount()
    vi.stubGlobal(
      'fetch',
      stubInspectFetch({
        inspectionResult: {
          indexStatusResult: {
            verdict: 'NEUTRAL',
            coverageState: 'Crawled - currently not indexed',
            pageFetchState: 'SUCCESSFUL',
          },
        },
      }),
    )
    const findings = await auditIndexation(URL)
    const f = findings.find((x) => x.id === 'indexation:not-indexed')
    expect(f?.severity).toBe('error')
    expect(f?.what).toContain('Crawled - currently not indexed')
  })

  it('maps a stubbed canonical mismatch → warning quoting both urls', async () => {
    setTestServiceAccount()
    const googleCanonical = 'https://www.goinvo.com/g/'
    const userCanonical = 'https://www.goinvo.com/u/'
    vi.stubGlobal(
      'fetch',
      stubInspectFetch({
        inspectionResult: {
          indexStatusResult: {
            verdict: 'PASS',
            coverageState: 'Submitted and indexed',
            pageFetchState: 'SUCCESSFUL',
            googleCanonical,
            userCanonical,
          },
        },
      }),
    )
    const findings = await auditIndexation(URL)
    const f = findings.find((x) => x.id === 'indexation:canonical-mismatch')
    expect(f?.severity).toBe('warning')
    expect(f?.what).toContain(googleCanonical)
    expect(f?.what).toContain(userCanonical)
  })

  it('returns the graceful notice (no throw) when the inspect fetch fails', async () => {
    setTestServiceAccount()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => {
        const reqUrl = typeof input === 'string' ? input : String((input as { url?: string })?.url)
        if (reqUrl.includes('oauth2.googleapis.com/token')) {
          return new Response(JSON.stringify({ access_token: 'test-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        // URL Inspection returns a 500 → must degrade to the notice, not throw.
        return new Response('upstream boom', { status: 500 })
      }),
    )
    const findings = await auditIndexation(URL)
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('indexation:status-unavailable')
    expect(findings[0].severity).toBe('notice')
  })

  it('returns the graceful notice when fetch throws outright', async () => {
    setTestServiceAccount()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const findings = await auditIndexation(URL)
    expect(findings[0].id).toBe('indexation:status-unavailable')
    expect(findings[0].what).toContain('Index status unavailable')
  })
})

// ---------------------------------------------------------------------------
// GEO / AI-readiness pack — parse-based `geo` and `eeat` findings. Pure
// (url, html) so no network stubbing is needed except auditAiCrawlerAccess,
// which fetches robots.txt and is tested with a stubbed global fetch.
// ---------------------------------------------------------------------------

// A long content page with enough prose to clear the isContentPage gate, an
// uncited statistic, no author, no authoritative citation, and no date.
function geoBodyText(extra = ''): string {
  const filler = 'GoInvo designs open-source healthcare software and data tools for clinicians and patients. '
  return filler.repeat(20) + extra
}

describe('auditAiReadiness (geo findings)', () => {
  it('flags a quotable statistic that has no inline source', () => {
    const html =
      '<html><head><title>x</title></head><body><h1>Healthcare costs</h1>' +
      `<p>${geoBodyText()}</p>` +
      '<p>Roughly 30% of US healthcare spending is wasteful overhead.</p>' +
      '</body></html>'
    const findings = auditAiReadiness('https://www.goinvo.com/vision/cost/', html)
    const f = findings.find((x) => x.id === 'geo:stats-uncited')
    expect(f).toBeDefined()
    expect(f?.category).toBe('geo')
    expect(f?.what).toContain('30%')
  })

  it('does NOT flag a statistic that sits next to an inline citation link', () => {
    const html =
      '<html><head><title>x</title></head><body><h1>Healthcare costs</h1>' +
      `<p>${geoBodyText()}</p>` +
      '<p>Roughly 30% of US healthcare spending is wasteful <a href="https://www.nih.gov/study">(source)</a>.</p>' +
      '</body></html>'
    const findings = auditAiReadiness('https://www.goinvo.com/vision/cost/', html)
    expect(idsOf(findings)).not.toContain('geo:stats-uncited')
  })

  it('flags missing freshness when there is no visible date and no schema date', () => {
    const html =
      '<html><head><title>x</title></head><body><h1>Healthcare guidance</h1>' +
      `<p>${geoBodyText()}</p></body></html>`
    const findings = auditAiReadiness('https://www.goinvo.com/vision/guidance/', html)
    const f = findings.find((x) => x.id === 'geo:freshness-missing')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('notice')
  })

  it('does NOT flag freshness when dateModified is present in schema', () => {
    const html =
      '<html><head><title>x</title>' +
      '<script type="application/ld+json">{"@type":"Article","dateModified":"2026-01-01"}</script>' +
      '</head><body><h1>Healthcare guidance</h1>' +
      `<p>${geoBodyText()}</p></body></html>`
    const findings = auditAiReadiness('https://www.goinvo.com/vision/guidance/', html)
    expect(idsOf(findings)).not.toContain('geo:freshness-missing')
  })

  it('does not hold the homepage to the content-page GEO bar', () => {
    const html = '<html><head><title>x</title></head><body><h1>GoInvo</h1><p>15% growth.</p></body></html>'
    const findings = auditAiReadiness('https://www.goinvo.com/', html)
    // No content-page findings on the homepage.
    expect(idsOf(findings)).not.toContain('geo:stats-uncited')
    expect(idsOf(findings)).not.toContain('geo:freshness-missing')
  })
})

describe('auditEeat (eeat findings)', () => {
  it('flags a content page with no named author', () => {
    const html =
      '<html><head><title>x</title></head><body><h1>Healthcare guidance</h1>' +
      `<p>${geoBodyText()}</p>` +
      '<p>We cite <a href="https://www.cdc.gov/data">the CDC</a>.</p></body></html>'
    const findings = auditEeat('https://www.goinvo.com/vision/guidance/', html)
    const f = findings.find((x) => x.id === 'eeat:author-missing')
    expect(f).toBeDefined()
    expect(f?.category).toBe('eeat')
    expect(f?.severity).toBe('warning')
  })

  it('flags a content page with no authoritative citation', () => {
    const html =
      '<html><head><title>x</title></head><body><h1>Healthcare guidance</h1>' +
      '<p class="byline">By Juhan Sonin</p>' +
      `<p>${geoBodyText()}</p>` +
      '<p>See <a href="https://example.com/blog">this blog</a>.</p></body></html>'
    const findings = auditEeat('https://www.goinvo.com/vision/guidance/', html)
    const f = findings.find((x) => x.id === 'eeat:citations-missing')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('warning')
  })

  it('does NOT flag missing citations when an authoritative source is linked', () => {
    const html =
      '<html><head><title>x</title></head><body><h1>Healthcare guidance</h1>' +
      '<p class="byline">By Juhan Sonin</p>' +
      `<p>${geoBodyText()}</p>` +
      '<p>Per <a href="https://pubmed.ncbi.nlm.nih.gov/12345/">PubMed</a>.</p></body></html>'
    const findings = auditEeat('https://www.goinvo.com/vision/guidance/', html)
    expect(idsOf(findings)).not.toContain('eeat:citations-missing')
    expect(idsOf(findings)).toContain('eeat:citations-present')
  })
})

describe('auditAiCrawlerAccess (geo — graceful robots.txt audit)', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    vi.unstubAllGlobals()
    globalThis.fetch = realFetch
  })

  function stubRobots(body: string, status = 200) {
    return vi.fn(async () => new Response(body, { status }))
  }

  it('errors when a search/citation bot (PerplexityBot) is fully disallowed', async () => {
    vi.stubGlobal('fetch', stubRobots('User-agent: PerplexityBot\nDisallow: /\n'))
    const findings = await auditAiCrawlerAccess('https://www.goinvo.com/')
    const f = findings.find((x) => x.id === 'geo:ai-search-bot-blocked')
    expect(f).toBeDefined()
    expect(f?.category).toBe('geo')
    expect(f?.severity).toBe('error')
    expect(f?.what).toContain('PerplexityBot')
  })

  it('only notices (not errors) when a training bot (GPTBot) is disallowed', async () => {
    vi.stubGlobal('fetch', stubRobots('User-agent: GPTBot\nDisallow: /\n'))
    const findings = await auditAiCrawlerAccess('https://www.goinvo.com/')
    const f = findings.find((x) => x.id === 'geo:ai-training-bot-blocked')
    expect(f).toBeDefined()
    expect(f?.severity).toBe('notice')
    expect(f?.what).toContain('GPTBot')
    // It must NOT be escalated to the search-bot error.
    expect(idsOf(findings)).not.toContain('geo:ai-search-bot-blocked')
  })

  it('returns the access-OK notice when nothing is blocked', async () => {
    vi.stubGlobal('fetch', stubRobots('User-agent: *\nDisallow:\n'))
    const findings = await auditAiCrawlerAccess('https://www.goinvo.com/')
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('geo:ai-crawler-access-ok')
  })

  it('degrades to a graceful notice (no throw) when the robots fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    const findings = await auditAiCrawlerAccess('https://www.goinvo.com/')
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('geo:ai-crawler-access-unavailable')
    expect(findings[0].severity).toBe('notice')
  })

  it('degrades to the graceful notice on a non-2xx robots response', async () => {
    vi.stubGlobal('fetch', stubRobots('not found', 404))
    const findings = await auditAiCrawlerAccess('https://www.goinvo.com/')
    expect(findings[0].id).toBe('geo:ai-crawler-access-unavailable')
  })
})

// ---------------------------------------------------------------------------
// Render-diff pack — raw HTML vs hydrated DOM. mapRenderGap is the pure mapper
// (no browser, no fetch). auditRenderGap is tested with injected raw/rendered
// HTML sources so we never launch headless Chrome: the `rendered` stub returns
// canned post-JavaScript HTML, or throws to exercise the graceful path.
// ---------------------------------------------------------------------------

// A bare server shell — almost no body text, no H1, no JSON-LD, no body links —
// standing in for what a no-JavaScript crawler sees on a client-rendered page.
const RAW_SHELL =
  '<!doctype html><html><head><title>GoInvo</title></head><body><div id="root"></div></body></html>'

// The same page AFTER hydration: real heading, lots of prose, structured data,
// and in-content links — everything that only exists once JavaScript runs.
const RENDERED_FULL =
  '<!doctype html><html><head><title>GoInvo</title>' +
  '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Healthcare data"}</script>' +
  '</head><body><main><h1>Healthcare Data Visualization</h1>' +
  '<p>GoInvo designs open-source healthcare software and data tools for clinicians and patients. ' +
  'We publish original datasets and visualizations of the social determinants of health, and we ' +
  'build human-centered software for hospitals, researchers, and the people they serve every day.</p>' +
  '<p>See our <a href="/vision/determinants-of-health/">determinants of health</a> work.</p>' +
  '</main></body></html>'

describe('mapRenderGap (pure raw-vs-rendered comparison)', () => {
  it('flags body text, H1, structured data, and links that exist only after render', () => {
    const findings = mapRenderGap(URL, RAW_SHELL, RENDERED_FULL)
    const ids = idsOf(findings)
    expect(ids).toContain('geo:text-only-after-render')
    expect(ids).toContain('geo:h1-only-after-render')
    expect(ids).toContain('geo:schema-only-after-render')
    expect(ids).toContain('geo:links-only-after-render')
    // §3/§5: text/H1/schema gaps are warnings; the link gap is the softer notice.
    expect(findings.find((f) => f.id === 'geo:text-only-after-render')?.severity).toBe('warning')
    expect(findings.find((f) => f.id === 'geo:h1-only-after-render')?.severity).toBe('warning')
    expect(findings.find((f) => f.id === 'geo:schema-only-after-render')?.severity).toBe('warning')
    expect(findings.find((f) => f.id === 'geo:links-only-after-render')?.severity).toBe('notice')
    for (const f of findings) {
      expect(f.category).toBe('geo')
      expect(f.affectedUrls).toEqual([URL])
    }
  })

  it('produces no render-gap findings when raw and rendered already match', () => {
    const findings = mapRenderGap(URL, RENDERED_FULL, RENDERED_FULL)
    expect(findings).toEqual([])
  })
})

describe('auditRenderGap (graceful — never throws)', () => {
  it('maps a stubbed rendered source where rendered text >> raw → warning', async () => {
    const findings = await auditRenderGap(URL, {
      raw: async () => RAW_SHELL,
      rendered: async () => RENDERED_FULL,
    })
    const f = findings.find((x) => x.id === 'geo:text-only-after-render')
    expect(f).toBeDefined()
    expect(f?.category).toBe('geo')
    expect(f?.severity).toBe('warning')
    // §6: the designer-facing copy must spell out the no-JavaScript risk.
    expect(f?.why.toLowerCase()).toContain('in the initial html')
    expect(f?.why.toLowerCase()).toContain("don’t run javascript".toLowerCase())
  })

  it('degrades to a single graceful notice (no throw) when the renderer throws', async () => {
    const findings = await auditRenderGap(URL, {
      raw: async () => RAW_SHELL,
      rendered: async () => {
        throw new Error('headless Chrome failed to launch')
      },
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('geo:render-check-unavailable')
    expect(findings[0].severity).toBe('notice')
    // The diagnostic reason is surfaced for debugging.
    expect(findings[0].howToFix).toContain('headless Chrome failed to launch')
  })

  it('degrades to the graceful notice when the raw fetch throws', async () => {
    const findings = await auditRenderGap(URL, {
      raw: async () => {
        throw new Error('raw fetch 500')
      },
      rendered: async () => RENDERED_FULL,
    })
    expect(findings).toHaveLength(1)
    expect(findings[0].id).toBe('geo:render-check-unavailable')
    expect(findings[0].severity).toBe('notice')
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
