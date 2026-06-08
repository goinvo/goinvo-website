import {
  DEFAULT_PRIORITY_WEIGHTS,
  type SeoFinding,
  type SeoFindingSeverity,
} from './seoAudit'

// Core Web Vitals layer for the SEO audit engine — Phase 1 of the SEO-suite
// revamp (see docs/seo-suite-revamp-plan.md §12, "Core Web Vitals: use CrUX
// field data (PageSpeed Insights API, free) as PRIMARY, not TextFocus lab — the
// plan had it backwards. Label provenance (field vs lab)").
//
// The on-page / structured-data / GEO packs answer "what is in this page's
// HTML"; this layer answers the orthogonal question only real-world measurement
// can: "how fast does this page actually load and respond for real people?".
//
// It calls Google's free PageSpeed Insights API:
//   GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
//        ?url=<enc>&strategy=mobile&category=performance
//   (append &key=<GOOGLE_PAGESPEED_API_KEY> only when that env var is set —
//    the API works keyless at a lower quota, so the key is optional.)
//
// PRIMARY source = CrUX FIELD data (`loadingExperience.metrics`): the real
// 28-day Chrome-user distribution for this URL — LARGEST_CONTENTFUL_PAINT_MS,
// CUMULATIVE_LAYOUT_SHIFT_SCORE, INTERACTION_TO_NEXT_PAINT. Findings built from
// it are LABELED "field data (real Chrome users, CrUX)".
//
// FALLBACK = LAB data (`lighthouseResult.audits`): a single simulated
// Lighthouse run, used only when the URL has too little traffic to have field
// data. Findings built from it are LABELED "lab data (simulated)" so the team
// knows the number is a lab estimate, not what users experienced.
//
// HARD RULE (plan §8 reliability guardrails + the brief): this is GRACEFUL.
// A non-2xx response, a throw, a timeout, or a payload with neither field nor
// lab data ALL collapse to a single `notice` finding — never an exception. The
// audit engine must never explode because PageSpeed Insights is unreachable.
// Because it is a network round-trip it is OPT-IN (auditPage runs it only behind
// opts.includeCwv; the route enables it for the single ?url= mode only).

// ---------------------------------------------------------------------------
// Shape of the slice of the PageSpeed Insights response we read. Everything is
// optional because Google omits sections that don't apply (e.g. no field data
// for a low-traffic URL), and we treat any missing piece as "unknown".
// ---------------------------------------------------------------------------

type CruxMetric = {
  percentile?: number // the page's value (LCP/INP in ms, CLS ×100)
  category?: string // 'FAST' | 'AVERAGE' | 'SLOW' (Good / Needs-Improvement / Poor)
}

type LoadingExperience = {
  metrics?: {
    LARGEST_CONTENTFUL_PAINT_MS?: CruxMetric
    CUMULATIVE_LAYOUT_SHIFT_SCORE?: CruxMetric
    INTERACTION_TO_NEXT_PAINT?: CruxMetric
  }
}

type LighthouseAudit = {
  numericValue?: number // raw measured value (LCP/INP in ms, CLS unitless)
  displayValue?: string // e.g. "2.7 s", "0.12"
}

type PageSpeedResponse = {
  loadingExperience?: LoadingExperience
  lighthouseResult?: {
    audits?: Record<string, LighthouseAudit | undefined>
  }
}

const PAGESPEED_URL =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

const PAGESPEED_TIMEOUT_MS = Number(
  process.env.MARKETING_SEO_PAGESPEED_TIMEOUT_MS || 20000,
)

// Core Web Vitals "good" thresholds (Google's official bars). A metric is Good
// at or below the first number, Needs-Improvement up to the second, and Poor
// above it.
const LCP_GOOD_MS = 2500
const LCP_POOR_MS = 4000
const CLS_GOOD = 0.1
const CLS_POOR = 0.25
const INP_GOOD_MS = 200
const INP_POOR_MS = 500

// ---------------------------------------------------------------------------
// Small finding builders — mirror the makeFinding helpers in the indexation /
// render packs so the model and copy conventions stay uniform.
// ---------------------------------------------------------------------------

function findingId(check: string): string {
  return `performance:${check}`
}

function makeFinding(
  url: string,
  severity: SeoFindingSeverity,
  check: string,
  what: string,
  why: string,
  howToFix: string,
  detectedAt: string,
): SeoFinding {
  return {
    id: findingId(check),
    category: 'performance',
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: 1,
    pctSite: 0, // single-page audit; the route fills this in across the set
    indexable: true,
    what,
    why,
    howToFix,
    affectedUrls: [url],
    source: 'html-parse',
    status: 'open',
    detectedAt,
  }
}

// The graceful fallback finding — returned for every "we couldn't measure"
// path so the engine never throws and a designer always gets a readable note.
function unavailableFinding(url: string, reason: string): SeoFinding {
  return makeFinding(
    url,
    'notice',
    'cwv-unavailable',
    'Core Web Vitals data unavailable — Google’s PageSpeed Insights could not be reached for this page, so its loading-speed and responsiveness scores could not be measured.',
    'Core Web Vitals are Google’s real-world speed and stability measurements (how fast the main content paints, how much the layout jumps, how quickly the page responds to a tap). They are a ranking factor and a direct driver of whether visitors stay. This is a data-availability gap, not a confirmed problem with the page.',
    `Re-run the single-page audit to retry. If it keeps failing, confirm the page is publicly reachable and, for higher quota, set the GOOGLE_PAGESPEED_API_KEY environment variable to a free Google PageSpeed Insights API key. Diagnostic detail: ${reason}.`,
    new Date().toISOString(),
  )
}

// ---------------------------------------------------------------------------
// Metric helpers — provenance-aware copy. Each metric reports the value, the
// Good/Needs-Improvement/Poor verdict, the severity it maps to, and a label
// naming the data source (field vs lab) so the team trusts the number (§7
// "Label data provenance").
// ---------------------------------------------------------------------------

const FIELD_LABEL = 'field data (real Chrome users, CrUX)'
const LAB_LABEL = 'lab data (simulated)'

// Map a value to a verdict + severity for a "lower is better" metric with the
// given Good/Poor cutoffs. Good → no finding (handled by caller), Needs-
// Improvement → notice, Poor → warning.
function verdictFor(
  value: number,
  goodMax: number,
  poorMin: number,
): { verdict: 'Good' | 'Needs-Improvement' | 'Poor'; severity: SeoFindingSeverity } {
  if (value <= goodMax) return { verdict: 'Good', severity: 'notice' }
  if (value <= poorMin) return { verdict: 'Needs-Improvement', severity: 'notice' }
  return { verdict: 'Poor', severity: 'warning' }
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`
}

// ---------------------------------------------------------------------------
// mapCwv — the PURE mapping from a PageSpeed payload to findings. Exported so
// the field-vs-lab decision and the threshold logic are unit-testable without
// stubbing fetch at all. Prefers CrUX field data; falls back to Lighthouse lab
// data; returns the unavailable notice if the payload carries neither.
// ---------------------------------------------------------------------------

export function mapCwv(url: string, payload: PageSpeedResponse): SeoFinding[] {
  const detectedAt = new Date().toISOString()
  const make = (
    severity: SeoFindingSeverity,
    check: string,
    what: string,
    why: string,
    howToFix: string,
  ): SeoFinding => makeFinding(url, severity, check, what, why, howToFix, detectedAt)

  const fieldMetrics = payload?.loadingExperience?.metrics
  const hasField = Boolean(
    fieldMetrics &&
      (fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS ||
        fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE ||
        fieldMetrics.INTERACTION_TO_NEXT_PAINT),
  )

  // --- PRIMARY: CrUX field data ------------------------------------------
  if (hasField && fieldMetrics) {
    const findings: SeoFinding[] = []

    const lcp = fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile
    if (typeof lcp === 'number') {
      const { verdict, severity } = verdictFor(lcp, LCP_GOOD_MS, LCP_POOR_MS)
      if (verdict !== 'Good') {
        findings.push(
          make(
            severity,
            'lcp-slow',
            `Largest Contentful Paint — how long until the main content of the page is visible — is ${formatSeconds(lcp)}, which Google rates "${verdict}" (the goal is under ${formatSeconds(LCP_GOOD_MS)}). This is ${FIELD_LABEL}.`,
            'Largest Contentful Paint measures how quickly the biggest piece of content (usually the hero image or headline) appears. A slow value means visitors stare at a blank or half-loaded page; it is one of Google’s three Core Web Vitals ranking signals and a direct cause of people leaving before the page loads.',
            'Speed up the largest element: compress and correctly size the hero image (use a modern format like WebP/AVIF), serve it from the CDN, preload it, and remove render-blocking scripts and fonts so the main content paints sooner.',
          ),
        )
      }
    }

    const cls = fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
    if (typeof cls === 'number') {
      // CrUX reports CLS as the score ×100 (an integer), so divide back.
      const clsScore = cls / 100
      const { verdict, severity } = verdictFor(clsScore, CLS_GOOD, CLS_POOR)
      if (verdict !== 'Good') {
        findings.push(
          make(
            severity,
            'cls-high',
            `Cumulative Layout Shift — how much the page jumps around as it loads — is ${clsScore.toFixed(3)}, which Google rates "${verdict}" (the goal is under ${CLS_GOOD}). This is ${FIELD_LABEL}.`,
            'Cumulative Layout Shift measures unexpected movement of content while the page loads — text reflowing, buttons sliding away as an image or ad pops in. A high value makes people mis-tap and feels broken; it is one of Google’s three Core Web Vitals ranking signals.',
            'Reserve space for anything that loads in: set explicit width and height (or an aspect-ratio) on images, videos, and embeds; avoid inserting banners or ads above existing content; and load web fonts in a way that doesn’t reflow text once they arrive.',
          ),
        )
      }
    }

    const inp = fieldMetrics.INTERACTION_TO_NEXT_PAINT?.percentile
    if (typeof inp === 'number') {
      const { verdict, severity } = verdictFor(inp, INP_GOOD_MS, INP_POOR_MS)
      if (verdict !== 'Good') {
        findings.push(
          make(
            severity,
            'inp-slow',
            `Interaction to Next Paint — how quickly the page responds after a tap or click — is ${Math.round(inp)}ms, which Google rates "${verdict}" (the goal is under ${INP_GOOD_MS}ms). This is ${FIELD_LABEL}.`,
            'Interaction to Next Paint measures how long the page takes to visibly react when someone taps, clicks, or types. A slow value makes the page feel frozen and unresponsive; it is one of Google’s three Core Web Vitals ranking signals (it replaced First Input Delay in 2024).',
            'Reduce the JavaScript that runs in response to clicks: break up long tasks, defer or remove non-essential third-party scripts, and avoid heavy work on the main thread during interactions so the page can paint a response quickly.',
          ),
        )
      }
    }

    // All three metrics are Good (or absent) — report the healthy field-data
    // state explicitly so the section isn't silently empty.
    if (findings.length === 0) {
      findings.push(
        make(
          'notice',
          'cwv-good',
          `This page passes all three Core Web Vitals — loading speed (Largest Contentful Paint), visual stability (Cumulative Layout Shift), and responsiveness (Interaction to Next Paint) are all in Google’s "Good" range. This is ${FIELD_LABEL}.`,
          'Core Web Vitals are Google’s real-world measurements of loading speed, visual stability, and responsiveness — a ranking factor and a driver of whether visitors stay. All three passing for real users is the healthy state.',
          'No action needed. Re-check after major page, image, or script changes, since regressions here are easy to introduce.',
        ),
      )
    }

    return findings
  }

  // --- FALLBACK: Lighthouse lab data -------------------------------------
  const audits = payload?.lighthouseResult?.audits
  if (audits) {
    const findings: SeoFinding[] = []

    const lcpAudit = audits['largest-contentful-paint']
    if (typeof lcpAudit?.numericValue === 'number') {
      const lcp = lcpAudit.numericValue
      const { verdict, severity } = verdictFor(lcp, LCP_GOOD_MS, LCP_POOR_MS)
      if (verdict !== 'Good') {
        findings.push(
          make(
            severity,
            'lcp-slow',
            `Largest Contentful Paint — how long until the main content of the page is visible — is ${formatSeconds(lcp)}, which Google rates "${verdict}" (the goal is under ${formatSeconds(LCP_GOOD_MS)}). This page has too little real-world traffic for field data, so this is ${LAB_LABEL} — a single simulated run, not what visitors actually experienced.`,
            'Largest Contentful Paint measures how quickly the biggest piece of content (usually the hero image or headline) appears. A slow value means visitors stare at a blank or half-loaded page; it is one of Google’s three Core Web Vitals ranking signals and a direct cause of people leaving before the page loads.',
            'Speed up the largest element: compress and correctly size the hero image (use a modern format like WebP/AVIF), serve it from the CDN, preload it, and remove render-blocking scripts and fonts so the main content paints sooner.',
          ),
        )
      }
    }

    const clsAudit = audits['cumulative-layout-shift']
    if (typeof clsAudit?.numericValue === 'number') {
      const cls = clsAudit.numericValue
      const { verdict, severity } = verdictFor(cls, CLS_GOOD, CLS_POOR)
      if (verdict !== 'Good') {
        findings.push(
          make(
            severity,
            'cls-high',
            `Cumulative Layout Shift — how much the page jumps around as it loads — is ${cls.toFixed(3)}, which Google rates "${verdict}" (the goal is under ${CLS_GOOD}). This page has too little real-world traffic for field data, so this is ${LAB_LABEL} — a single simulated run, not what visitors actually experienced.`,
            'Cumulative Layout Shift measures unexpected movement of content while the page loads — text reflowing, buttons sliding away as an image or ad pops in. A high value makes people mis-tap and feels broken; it is one of Google’s three Core Web Vitals ranking signals.',
            'Reserve space for anything that loads in: set explicit width and height (or an aspect-ratio) on images, videos, and embeds; avoid inserting banners or ads above existing content; and load web fonts in a way that doesn’t reflow text once they arrive.',
          ),
        )
      }
    }

    // Lighthouse's lab proxy for responsiveness is Total Blocking Time (INP
    // can't be simulated without real interaction), so we read it instead and
    // say so plainly.
    const tbtAudit = audits['total-blocking-time']
    if (typeof tbtAudit?.numericValue === 'number') {
      const tbt = tbtAudit.numericValue
      // TBT "good" is under 200ms; "poor" is over 600ms (Lighthouse scoring).
      const { verdict, severity } = verdictFor(tbt, 200, 600)
      if (verdict !== 'Good') {
        findings.push(
          make(
            severity,
            'inp-slow',
            `Total Blocking Time — a lab stand-in for how responsive the page is to taps and clicks — is ${Math.round(tbt)}ms, which Google rates "${verdict}". This page has too little real-world traffic for field responsiveness data (Interaction to Next Paint), so this is ${LAB_LABEL} — a single simulated run, not what visitors actually experienced.`,
            'Responsiveness measures how long the page takes to visibly react when someone taps, clicks, or types. The real-world metric (Interaction to Next Paint) is a Core Web Vitals ranking signal; in the lab it is estimated from how long the main thread is blocked while loading. A high value means the page will feel frozen during early interactions.',
            'Reduce the JavaScript that runs while the page loads and on interaction: break up long tasks, defer or remove non-essential third-party scripts, and avoid heavy work on the main thread so the page can respond quickly.',
          ),
        )
      }
    }

    if (findings.length === 0) {
      findings.push(
        make(
          'notice',
          'cwv-good',
          `This page’s Core Web Vitals look healthy in a simulated test — loading speed, visual stability, and responsiveness are all in Google’s "Good" range. This page has too little real-world traffic for field data, so this is ${LAB_LABEL}, not what visitors actually experienced.`,
          'Core Web Vitals are Google’s measurements of loading speed, visual stability, and responsiveness — a ranking factor and a driver of whether visitors stay. A passing lab run is a good sign, though only real-user (field) data confirms the experience.',
          'No action needed now. Once the page gets more traffic, re-check it against real-user (field) data, which is the value Google actually ranks on.',
        ),
      )
    }

    return findings
  }

  // Neither field nor lab data in the payload — treat as unavailable rather
  // than silently passing.
  return [
    unavailableFinding(
      url,
      'PageSpeed Insights returned neither field (CrUX) nor lab (Lighthouse) data',
    ),
  ]
}

// ---------------------------------------------------------------------------
// auditCwv — the public entry point. Calls the PageSpeed Insights API and maps
// the result. Returns `performance` findings, or a single `notice` if PageSpeed
// is unreachable. NEVER throws.
// ---------------------------------------------------------------------------

export async function auditCwv(url: string): Promise<SeoFinding[]> {
  const params = new URLSearchParams({
    url,
    strategy: 'mobile',
    category: 'performance',
  })
  // The API works keyless at a lower quota; only append the key when set.
  const key = process.env.GOOGLE_PAGESPEED_API_KEY
  if (key) params.set('key', key)
  const requestUrl = `${PAGESPEED_URL}?${params.toString()}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PAGESPEED_TIMEOUT_MS)
  try {
    const res = await fetch(requestUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GoInvo marketing SEO audit (+https://www.goinvo.com)',
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return [
        unavailableFinding(
          url,
          `PageSpeed Insights API returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
        ),
      ]
    }
    const payload = (await res.json()) as PageSpeedResponse
    return mapCwv(url, payload)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    return [unavailableFinding(url, reason)]
  } finally {
    clearTimeout(timeout)
  }
}
