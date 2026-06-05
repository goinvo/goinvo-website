import {
  getGoogleAccessToken,
  getServiceAccount,
} from './googleServiceAccount'
import {
  DEFAULT_PRIORITY_WEIGHTS,
  type SeoFinding,
  type SeoFindingSeverity,
} from './seoAudit'

// Indexation layer for the SEO audit engine — Phase 1 of the SEO-suite revamp
// (see docs/seo-suite-revamp-plan.md §4 "Indexation" row). The on-page +
// structured-data checks in seoAudit.ts answer "what is wrong with this page's
// HTML"; this layer answers the orthogonal question Google alone can answer:
// "is this page actually indexed, and does Google agree with how the page
// describes itself (canonical, robots, fetch)".
//
// It uses the SAME service-account auth the existing /api/marketing/seo route
// uses for GSC searchAnalytics (getServiceAccount + getGoogleAccessToken with
// the webmasters.readonly scope), then calls the GSC URL Inspection API:
//   POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
//   { inspectionUrl, siteUrl }
// and maps inspectionResult.indexStatusResult to `indexation` findings.
//
// HARD RULE (plan §8 reliability guardrails + the brief): this is GRACEFUL.
// No service account, a non-2xx response, a throw, or a timeout ALL collapse to
// a single `notice` finding — never an exception. The audit engine must never
// explode because GSC is unreachable.

// ---------------------------------------------------------------------------
// Shape of the slice of the URL Inspection response we read. Everything is
// optional because Google omits fields that don't apply, and we treat any
// missing field as "unknown, don't flag".
// ---------------------------------------------------------------------------

type IndexStatusResult = {
  verdict?: string // 'PASS' | 'PARTIAL' | 'FAIL' | 'NEUTRAL' | 'VERDICT_UNSPECIFIED'
  coverageState?: string // e.g. 'Submitted and indexed', 'Crawled - currently not indexed'
  robotsTxtState?: string // 'ALLOWED' | 'DISALLOWED' | ...
  indexingState?: string // 'INDEXING_ALLOWED' | 'BLOCKED_BY_META_TAG' | 'BLOCKED_BY_HTTP_HEADER' | 'BLOCKED_BY_ROBOTS_TXT'
  pageFetchState?: string // 'SUCCESSFUL' | 'SOFT_404' | 'BLOCKED_ROBOTS_TXT' | 'NOT_FOUND' | ...
  googleCanonical?: string
  userCanonical?: string
  lastCrawlTime?: string
}

type UrlInspectionResponse = {
  inspectionResult?: {
    indexStatusResult?: IndexStatusResult
  }
}

const INDEX_INSPECT_URL =
  'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

const INSPECT_TIMEOUT_MS = Number(
  process.env.MARKETING_SEO_INSPECT_TIMEOUT_MS || 12000,
)

// A `coverageState` is "indexed" when Google says so. We don't enumerate every
// possible not-indexed string (Google evolves them); instead we treat anything
// that isn't an affirmative "indexed" state, on a page whose verdict isn't PASS,
// as not-indexed and quote the literal coverageState back to the designer.
function looksIndexed(coverageState: string): boolean {
  return /\bindexed\b/i.test(coverageState) && !/not\s+indexed/i.test(coverageState)
}

function findingId(check: string): string {
  return `indexation:${check}`
}

function makeFinding(
  url: string,
  severity: SeoFindingSeverity,
  check: string,
  what: string,
  why: string,
  howToFix: string,
  detectedAt: string,
  indexable: boolean,
): SeoFinding {
  return {
    id: findingId(check),
    category: 'indexation',
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: 1,
    pctSite: 0, // single-page audit; the route fills this in across the set
    indexable,
    what,
    why,
    howToFix,
    affectedUrls: [url],
    source: 'gsc',
    status: 'open',
    detectedAt,
  }
}

// The graceful fallback finding — returned for every "we couldn't ask Google"
// path so the engine never throws and a designer always gets a readable note.
function unavailableFinding(url: string, reason: string): SeoFinding {
  return makeFinding(
    url,
    'notice',
    'status-unavailable',
    'Index status unavailable (GSC URL Inspection not reachable).',
    'Live index status comes from Google Search Console. It is currently unreachable, so this audit cannot confirm whether Google has this page indexed or which canonical it chose. This is a data-availability gap, not a problem with the page itself.',
    `Confirm the marketing Google service account is configured and has Search Console access to this property, then re-run the audit. Diagnostic: ${reason}.`,
    new Date().toISOString(),
    true,
  )
}

// ---------------------------------------------------------------------------
// auditIndexation — the public entry point. Returns `indexation` findings, or a
// single `notice` if GSC is unreachable. NEVER throws.
// ---------------------------------------------------------------------------

export async function auditIndexation(
  url: string,
  siteUrl = 'https://www.goinvo.com/',
): Promise<SeoFinding[]> {
  const sa = getServiceAccount()
  if (!sa) {
    return [unavailableFinding(url, 'GOOGLE_SERVICE_ACCOUNT_JSON is not set')]
  }

  let payload: UrlInspectionResponse
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), INSPECT_TIMEOUT_MS)
  try {
    const token = await getGoogleAccessToken(sa, [
      'https://www.googleapis.com/auth/webmasters.readonly',
    ])
    const res = await fetch(INDEX_INSPECT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl }),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return [
        unavailableFinding(
          url,
          `URL Inspection API returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
        ),
      ]
    }
    payload = (await res.json()) as UrlInspectionResponse
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    return [unavailableFinding(url, reason)]
  } finally {
    clearTimeout(timeout)
  }

  return mapInspection(url, payload)
}

// ---------------------------------------------------------------------------
// mapInspection — pure mapping from an inspection payload to findings. Exported
// so the mapping is unit-testable without stubbing fetch. Every finding quotes
// the actual state/URLs Google returned (§6 actionability).
// ---------------------------------------------------------------------------

export function mapInspection(
  url: string,
  payload: UrlInspectionResponse,
): SeoFinding[] {
  const status = payload?.inspectionResult?.indexStatusResult
  const detectedAt = new Date().toISOString()

  // No usable result block — treat as unavailable rather than silently passing.
  if (!status) {
    return [
      unavailableFinding(
        url,
        'URL Inspection response contained no indexStatusResult',
      ),
    ]
  }

  const findings: SeoFinding[] = []

  const verdict = (status.verdict || '').toUpperCase()
  const coverageState = status.coverageState || ''
  const robotsTxtState = (status.robotsTxtState || '').toUpperCase()
  const indexingState = (status.indexingState || '').toUpperCase()
  const pageFetchState = (status.pageFetchState || '').toUpperCase()
  const googleCanonical = status.googleCanonical || ''
  const userCanonical = status.userCanonical || ''

  // --- Not indexed -----------------------------------------------------------
  // A normal content page that Google has not indexed earns its keep nowhere —
  // it cannot receive a single organic visit. Flag as an error and quote the
  // literal coverageState so the designer sees Google's own words.
  const indexed = coverageState ? looksIndexed(coverageState) : verdict === 'PASS'
  if (verdict !== 'PASS' || !indexed) {
    const stateLabel = coverageState || `verdict ${verdict || 'UNKNOWN'}`
    findings.push(
      makeFinding(
        url,
        'error',
        'not-indexed',
        `Google has not indexed this page. Search Console reports: "${stateLabel}".`,
        'A page that is not in Google\'s index cannot appear in search results at all — it receives zero organic traffic no matter how good the content is. This is the single most consequential SEO state.',
        `Open this URL in Search Console\'s URL Inspection tool and read the coverage reason ("${stateLabel}"). Common causes: the page is too new (request indexing), Google judged it low-value/duplicate (improve depth or consolidate), it is blocked by noindex/robots (see other findings), or it returns a soft 404. Fix the named cause, then request indexing.`,
        detectedAt,
        false,
      ),
    )
  }

  // --- Blocked by noindex meta tag / HTTP header -----------------------------
  if (indexingState === 'BLOCKED_BY_META_TAG' || indexingState === 'BLOCKED_BY_HTTP_HEADER') {
    const mechanism =
      indexingState === 'BLOCKED_BY_META_TAG'
        ? 'a <meta name="robots" content="noindex"> tag'
        : 'an X-Robots-Tag: noindex HTTP header'
    findings.push(
      makeFinding(
        url,
        'warning',
        'noindex',
        `This page tells Google not to index it via ${mechanism} (indexingState: ${indexingState}).`,
        'A noindex directive deliberately keeps the page out of search results. That is correct for thank-you/admin pages but a silent traffic killer if it is on a page you actually want found.',
        `If this page SHOULD rank, remove the noindex ${indexingState === 'BLOCKED_BY_META_TAG' ? 'meta tag from the page <head>' : 'from the server\'s X-Robots-Tag response header'} and re-request indexing. If it is intentionally hidden, no action needed.`,
        detectedAt,
        false,
      ),
    )
  }

  // --- Blocked by robots.txt -------------------------------------------------
  if (robotsTxtState === 'DISALLOWED' || indexingState === 'BLOCKED_BY_ROBOTS_TXT') {
    findings.push(
      makeFinding(
        url,
        'warning',
        'robots-blocked',
        `robots.txt is blocking Google from crawling this page (robotsTxtState: ${robotsTxtState || 'DISALLOWED'}).`,
        'A robots.txt Disallow stops Google from fetching the page, so it cannot read the content or reliably index it. Unlike noindex, the URL can still appear as a bare, descriptionless result.',
        `Check robots.txt for a Disallow rule that matches this URL and remove or narrow it if this page should be crawlable. If you only want it out of search, use noindex instead of a robots.txt block (a blocked page can\'t even be told it has noindex).`,
        detectedAt,
        false,
      ),
    )
  }

  // --- Canonical mismatch ----------------------------------------------------
  // Quote BOTH URLs: Google chose X, you declared Y. This is the classic
  // "why isn't my page ranking — Google folded it into another URL" cause.
  if (googleCanonical && userCanonical && googleCanonical !== userCanonical) {
    findings.push(
      makeFinding(
        url,
        'warning',
        'canonical-mismatch',
        `Google\'s chosen canonical disagrees with yours. Google chose "${googleCanonical}", but this page declares "${userCanonical}".`,
        'When Google ignores your declared canonical and picks a different URL, ranking signals consolidate onto Google\'s pick, not yours — your preferred URL may never be the one shown or ranked.',
        `Decide which URL is truly canonical. If "${userCanonical}" is correct, strengthen the signal (consistent internal links, sitemap entry, identical canonical on duplicates) so Google trusts it over "${googleCanonical}". If Google\'s pick "${googleCanonical}" is actually the better URL, update this page\'s canonical to match it.`,
        detectedAt,
        true,
      ),
    )
  }

  // --- Page fetch failure ----------------------------------------------------
  // Anything other than SUCCESSFUL means Google couldn't load the page cleanly
  // (soft 404, server error, redirect, blocked) — a hard indexing blocker.
  if (pageFetchState && pageFetchState !== 'SUCCESSFUL') {
    findings.push(
      makeFinding(
        url,
        'error',
        'fetch-failed',
        `Google could not successfully fetch this page (pageFetchState: ${pageFetchState}).`,
        'If Googlebot cannot load the page, Google cannot index its content. A soft 404, server error, or redirect at fetch time blocks the page from ranking regardless of its quality.',
        `Reproduce what Googlebot saw: ${pageFetchState === 'SOFT_404' ? 'the page returned a 200 but looks empty/like a "not found" page — add real content or return a proper 404/redirect' : pageFetchState === 'NOT_FOUND' ? 'the page returns 404 — restore the page or redirect the URL' : `the fetch state was ${pageFetchState} — check the server response, redirects, and any crawler block`}. Then use URL Inspection\'s "Test Live URL" to confirm a clean fetch.`,
        detectedAt,
        false,
      ),
    )
  }

  // If nothing tripped, return a single PASS notice so the designer sees an
  // explicit "Google has this indexed" rather than an empty section.
  if (findings.length === 0) {
    findings.push(
      makeFinding(
        url,
        'notice',
        'indexed-ok',
        `Google has this page indexed${coverageState ? ` ("${coverageState}")` : ''}.`,
        'The page is in Google\'s index with no noindex, robots block, canonical conflict, or fetch problem — the healthy state for a page you want found.',
        'No action needed. Re-check after major content or URL changes.',
        detectedAt,
        true,
      ),
    )
  }

  return findings
}
