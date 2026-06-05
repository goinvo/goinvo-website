import { parse, type HTMLElement } from 'node-html-parser'
import {
  getGoogleAccessToken,
  getServiceAccount,
  ga4RunReport,
  type Ga4Row,
} from './googleServiceAccount'
import {
  DEFAULT_PRIORITY_WEIGHTS,
  fetchPageHtml,
  type SeoFinding,
  type SeoFindingSeverity,
} from './seoAudit'

// Conversion-rate layer for the SEO audit engine — the SEO Measurement &
// Growth lead's pick from the §12 backlog ("Conversion-rate checks on
// service/landing pages → new `conversion` category"). The rest of the engine
// answers "can this page be found and read"; this layer answers the orthogonal
// business question the score is otherwise blind to: "for the pages that are
// meant to turn a visitor into a lead, are they actually converting — and does
// the page's own design help or hurt that?".
//
// It runs ONLY on "money pages" — the ones whose job is to convert: a path
// matching /services, /work, /contact, or /about, OR any page whose HTML
// carries a form or a primary call-to-action button. For those, it:
//
//  (a) Asks GA4 (via the shared service-account auth + ga4RunReport) for this
//      landing page's sessions and key-events over a recent window, host-filtered
//      to www.goinvo.com, and derives a conversion rate (key-events / sessions).
//      It flags a WARNING when a page gets real organic traffic (sessions at or
//      above a floor) but converts far below a reasonable benchmark (~1%).
//
//  (b) Parses the HTML for the two design factors that most reliably depress
//      conversion: a long form (more than ~5 input fields) and multiple
//      competing primary calls-to-action (a single, clear primary action
//      converts better than several fighting for the click).
//
// HARD RULE (plan §8 reliability guardrails + the brief): this is GRACEFUL. No
// service account, a GA4 throw, a non-2xx, a timeout, or an HTML-parse failure
// ALL collapse to a single `notice` — never an exception. Because the GA4 call
// is a network round-trip it is OPT-IN (auditPage runs it only behind
// opts.includeConversion; the route enables it for the single ?url= mode).

// ---------------------------------------------------------------------------
// Config — mirror the env-var names the existing /api/marketing/seo route uses
// so the property / host stay consistent across the suite.
// ---------------------------------------------------------------------------

const GA4_PROPERTY_ID = process.env.GOINVO_GA4_PROPERTY_ID || '321528631'
const GA4_HOST = process.env.GOINVO_GA4_HOST || 'www.goinvo.com'

const GA4_TIMEOUT_MS = Number(
  process.env.MARKETING_SEO_GA4_TIMEOUT_MS || 15000,
)

// How far back to read GA4 (a recent window with enough sessions to be real).
const GA4_LOOKBACK_DAYS = Number(
  process.env.MARKETING_SEO_CONVERSION_LOOKBACK_DAYS || 28,
)

// A page needs at least this many sessions in the window before a low
// conversion rate is treated as a real signal rather than small-sample noise.
const MIN_SESSIONS = Number(
  process.env.MARKETING_SEO_CONVERSION_MIN_SESSIONS || 50,
)

// The benchmark a money page should clear. Below this, with real traffic, is a
// warning. ~1% is a deliberately conservative floor for a B2B services site —
// it exists to catch pages converting FAR below reasonable, not to grade fine
// differences.
const MIN_CONVERSION_RATE = Number(
  process.env.MARKETING_SEO_CONVERSION_MIN_RATE || 0.01,
)

// Design thresholds: a form longer than this many fields, or more than one
// primary call-to-action, are the two most reliable conversion drags.
const MAX_FORM_FIELDS = 5
const MAX_PRIMARY_CTAS = 1

// ---------------------------------------------------------------------------
// Finding builders — mirror the makeFinding helpers across the engine so the
// model and copy conventions stay uniform.
// ---------------------------------------------------------------------------

function findingId(check: string): string {
  return `conversion:${check}`
}

function makeFinding(
  url: string,
  severity: SeoFindingSeverity,
  check: string,
  what: string,
  why: string,
  howToFix: string,
  detectedAt: string,
  source: SeoFinding['source'],
): SeoFinding {
  return {
    id: findingId(check),
    category: 'conversion',
    severity,
    priorityWeight: DEFAULT_PRIORITY_WEIGHTS[severity],
    urlsAffected: 1,
    pctSite: 0, // single-page audit; the route fills this in across the set
    indexable: true,
    what,
    why,
    howToFix,
    affectedUrls: [url],
    source,
    status: 'open',
    detectedAt,
  }
}

// The graceful fallback finding — returned for every "we couldn't measure /
// parse" path so the engine never throws and a designer always gets a readable
// note.
function unavailableFinding(url: string, reason: string): SeoFinding {
  return makeFinding(
    url,
    'notice',
    'conversion-unavailable',
    'Conversion rate unavailable — the audit could not read this page’s visitor-to-lead numbers from Google Analytics, so it could not check whether this money page is converting the traffic it gets.',
    'Conversion rate is the share of visitors who take the action this page exists to drive — submitting the contact form, requesting a proposal, starting a project conversation. A page can rank and get traffic yet quietly fail to turn any of it into leads. This is a data-availability gap, not a confirmed problem with the page.',
    `Confirm the marketing Google service account has Google Analytics 4 access to this property and that the contact / proposal actions are registered as GA4 key events, then re-run the single-page audit. Diagnostic detail: ${reason}.`,
    new Date().toISOString(),
    'ga4',
  )
}

// ---------------------------------------------------------------------------
// Money-page + design parsing — pure (url, html). Exported so the classifier
// and the form/CTA parsing are unit-testable without any network.
// ---------------------------------------------------------------------------

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

// A money page is one whose JOB is to convert: a services / work / contact /
// about route, OR any page that carries a form or a primary call-to-action.
export function isMoneyPage(url: string, root: HTMLElement): boolean {
  const path = pathOf(url)
  if (/\/(services|service|work|contact|about)\b/i.test(path)) return true
  if (root.querySelector('form')) return true
  return countPrimaryCtas(root) > 0
}

// Count the real input fields in a page's form(s) — the controls a visitor must
// fill in. Hidden inputs, submit/reset/button controls, and CSRF-style hidden
// tokens don't count toward the "this form feels long" signal.
export function countFormFields(root: HTMLElement): number {
  const controls = root.querySelectorAll('form input, form textarea, form select')
  let count = 0
  for (const el of controls) {
    const tag = el.tagName?.toLowerCase()
    if (tag === 'textarea' || tag === 'select') {
      count++
      continue
    }
    const type = (el.getAttribute('type') || 'text').toLowerCase()
    if (['hidden', 'submit', 'reset', 'button', 'image'].includes(type)) continue
    count++
  }
  return count
}

// Count the PRIMARY calls-to-action on the page. We treat a CTA as "primary"
// when it is a real action target (a button, a submit input, or a link styled
// as a button) whose label reads like a conversion action ("contact us", "get
// started", "request a proposal", "book a call", "hire us"…). A page that fires
// several of these at once splits the visitor's attention.
const PRIMARY_CTA_LABEL =
  /\b(contact|get started|get in touch|request|proposal|quote|rfp|book(?: a)?(?: call| demo)?|schedule|hire|work with|start (?:a |your )?project|let'?s talk|reach out|sign up|get a)\b/i

export function countPrimaryCtas(root: HTMLElement): number {
  const candidates = root.querySelectorAll(
    'a, button, input[type="submit"], [role="button"]',
  )
  const seen = new Set<string>()
  let count = 0
  for (const el of candidates) {
    const tag = el.tagName?.toLowerCase()
    // Text from the label, plus value/aria-label for inputs.
    const label = (
      (el.getAttribute('value') || '') +
      ' ' +
      (el.getAttribute('aria-label') || '') +
      ' ' +
      el.text
    )
      .replace(/\s+/g, ' ')
      .trim()
    if (!label) continue
    const looksPrimary =
      PRIMARY_CTA_LABEL.test(label) ||
      // A class/href hint that the element is the styled primary button.
      /\bbtn-primary\b|\bcta\b|\bprimary\b/i.test(el.getAttribute('class') || '') ||
      (tag === 'a' && /\/(contact|get-started|request|proposal|quote)\b/i.test(el.getAttribute('href') || ''))
    if (!looksPrimary) continue
    // De-dupe identical labels so a sticky header + footer "Contact us" pair
    // doesn't read as two competing primary actions.
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    count++
  }
  return count
}

// ---------------------------------------------------------------------------
// mapConversion — the PURE mapping from (url, html, GA4 numbers) to findings.
// Exported so the rate-threshold logic and the form/CTA design checks are
// unit-testable without stubbing fetch or GA4 at all. `ga4` is null when the
// GA4 read was unavailable — then we only run the parse-based design checks and,
// if neither GA4 nor a design issue produced anything, surface the unavailable
// notice so the section never reads as a silent pass.
// ---------------------------------------------------------------------------

export type ConversionGa4 = { sessions: number; keyEvents: number } | null

export function mapConversion(
  url: string,
  html: string,
  ga4: ConversionGa4,
): SeoFinding[] {
  const detectedAt = new Date().toISOString()
  const root = parse(html, { comment: false })

  // Only money pages are held to the conversion bar.
  if (!isMoneyPage(url, root)) return []

  const findings: SeoFinding[] = []
  const make = (
    severity: SeoFindingSeverity,
    check: string,
    what: string,
    why: string,
    howToFix: string,
    source: SeoFinding['source'] = 'html-parse',
  ): SeoFinding => makeFinding(url, severity, check, what, why, howToFix, detectedAt, source)

  // --- (a) GA4 conversion rate -------------------------------------------
  if (ga4 && ga4.sessions >= MIN_SESSIONS) {
    const rate = ga4.sessions > 0 ? ga4.keyEvents / ga4.sessions : 0
    if (rate < MIN_CONVERSION_RATE) {
      findings.push(
        make(
          'warning',
          'low-conversion-rate',
          `This page is a money page that gets real traffic — ${ga4.sessions} sessions in the last ${GA4_LOOKBACK_DAYS} days — but only ${(rate * 100).toFixed(2)}% of those visits convert (${ga4.keyEvents} lead${ga4.keyEvents === 1 ? '' : 's'}), well below the ~${(MIN_CONVERSION_RATE * 100).toFixed(0)}% a page like this should reasonably clear.`,
          'A page whose job is to turn visitors into leads, that draws traffic yet converts almost none of it, is leaking the most valuable thing the site produces. Unlike a ranking gap, the audience is already arriving — the loss is happening on the page itself, which is usually the cheapest place to fix.',
          'Tighten the page toward a single, obvious next step: lead with the value proposition, make one primary call-to-action unmistakable, shorten any form to only what you truly need, and add the proof (work samples, client names, outcomes) a visitor needs before they act. Then A/B test the change through the existing experiment system.',
          'ga4',
        ),
      )
    } else {
      // Healthy — surface once so the section reads as "checked and clear".
      findings.push(
        make(
          'notice',
          'conversion-rate-ok',
          `This money page converts ${(rate * 100).toFixed(2)}% of its visits into leads (${ga4.keyEvents} lead${ga4.keyEvents === 1 ? '' : 's'} from ${ga4.sessions} sessions over the last ${GA4_LOOKBACK_DAYS} days), at or above the ~${(MIN_CONVERSION_RATE * 100).toFixed(0)}% benchmark.`,
          'A money page converting at or above benchmark is doing its job — the traffic it earns is turning into leads. This is the healthy state.',
          'No action needed. Re-check after any redesign of the form, the call-to-action, or the page’s lead copy, since those changes most directly move conversion.',
          'ga4',
        ),
      )
    }
  } else if (ga4 && ga4.sessions > 0 && ga4.sessions < MIN_SESSIONS) {
    // Real but thin traffic — say so rather than flag a noisy rate.
    findings.push(
      make(
        'notice',
        'conversion-low-traffic',
        `This money page had only ${ga4.sessions} session${ga4.sessions === 1 ? '' : 's'} in the last ${GA4_LOOKBACK_DAYS} days — too few to judge its conversion rate reliably.`,
        'Conversion rate on a handful of sessions is statistically noisy: one extra lead swings it wildly. The page may convert fine; there just isn’t enough traffic yet to tell.',
        'Grow this page’s traffic first (the ranking and AI-readiness findings elsewhere in this audit are the levers), then re-check its conversion rate once it clears a meaningful session count.',
        'ga4',
      ),
    )
  }

  // --- (b) Form length ----------------------------------------------------
  const formFields = countFormFields(root)
  if (formFields > MAX_FORM_FIELDS) {
    findings.push(
      make(
        'notice',
        'form-too-long',
        `The form on this page asks for ${formFields} fields — more than the ~${MAX_FORM_FIELDS} at which drop-off climbs sharply.`,
        'Every extra form field is another reason a visitor abandons before submitting. Long forms measurably depress conversion; for a first-contact form, each field beyond the essentials costs you leads who would have started a conversation with fewer.',
        `Cut the form to only what you genuinely need to start the conversation (often just a name, an email, and a message — about ${MAX_FORM_FIELDS} fields or fewer). Move any nice-to-have questions to a later step once the lead is engaged.`,
      ),
    )
  }

  // --- (c) Competing primary calls-to-action ------------------------------
  const primaryCtas = countPrimaryCtas(root)
  if (primaryCtas > MAX_PRIMARY_CTAS) {
    findings.push(
      make(
        'notice',
        'multiple-primary-ctas',
        `This page presents ${primaryCtas} competing primary calls-to-action (distinct conversion buttons or links, e.g. "Contact us", "Request a proposal", "Book a call").`,
        'When several primary actions fight for attention, the visitor has to choose — and a visitor who has to choose often chooses nothing. A single, clear primary action consistently converts better than several competing ones.',
        'Pick the one action this page should drive and make it the unmistakable primary button. Demote the others to secondary styling, or remove them, so there is one obvious next step.',
      ),
    )
  }

  // If this money page produced no finding at all AND we had no GA4 numbers to
  // judge it by, surface the unavailable notice so it doesn't silently pass the
  // conversion section by virtue of GA4 being unreachable.
  if (findings.length === 0 && !ga4) {
    return [
      unavailableFinding(
        url,
        'No GA4 session/key-event data was available for this landing page',
      ),
    ]
  }

  return findings
}

// ---------------------------------------------------------------------------
// GA4 read — sessions + key-events for THIS landing page, host-filtered to
// production. Tries the `keyEvents` metric (current GA4 name) and falls back to
// the legacy `conversions` metric, and the `landingPagePlusQueryString`
// dimension with a `pagePath` fallback — mirroring ga4KeyEventsByPage in the
// existing seo route. Returns null on any failure so the caller degrades.
// ---------------------------------------------------------------------------

async function readGa4Conversion(
  url: string,
): Promise<ConversionGa4> {
  const sa = getServiceAccount()
  if (!sa) return null

  const path = pathOf(url)
  const now = new Date()
  const startDate = new Date(now.getTime() - GA4_LOOKBACK_DAYS * 86400000)
    .toISOString()
    .slice(0, 10)
  const endDate = now.toISOString().slice(0, 10)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GA4_TIMEOUT_MS)
  try {
    const token = await getGoogleAccessToken(sa, [
      'https://www.googleapis.com/auth/analytics.readonly',
    ])

    const metricNames = ['keyEvents', 'conversions']
    const dimensionNames = ['landingPagePlusQueryString', 'pagePath']
    for (const metric of metricNames) {
      for (const dimension of dimensionNames) {
        try {
          const rows: Ga4Row[] = await ga4RunReport(token, GA4_PROPERTY_ID, {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: dimension }],
            metrics: [{ name: 'sessions' }, { name: metric }],
            dimensionFilter: {
              andGroup: {
                expressions: [
                  {
                    filter: {
                      fieldName: 'hostName',
                      stringFilter: { matchType: 'EXACT', value: GA4_HOST },
                    },
                  },
                  {
                    filter: {
                      fieldName: dimension,
                      stringFilter: { matchType: 'EXACT', value: path },
                    },
                  },
                ],
              },
            },
            limit: 5,
          })
          // Sum across any trailing-slash / query-string variants GA returns.
          let sessions = 0
          let keyEvents = 0
          for (const row of rows) {
            sessions += Number(row.metricValues?.[0]?.value || 0)
            keyEvents += Number(row.metricValues?.[1]?.value || 0)
          }
          // A successful call (even zero rows) for the current metric name is
          // authoritative — return it rather than trying the legacy fallback,
          // unless the page genuinely has no rows, in which case try the next
          // dimension before giving up.
          if (sessions > 0) return { sessions, keyEvents }
        } catch {
          // unknown metric/dimension (400) or transient — try the next combo
        }
      }
    }
    // No combination returned session data for this page.
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// auditConversion — the public entry point. Fetches the page HTML, reads GA4,
// and maps the result. Returns `conversion` findings, or a single `notice` if
// the page can't be loaded or it's a money page with no GA4 data. NEVER throws.
// ---------------------------------------------------------------------------

export async function auditConversion(url: string): Promise<SeoFinding[]> {
  let html: string
  try {
    html = await fetchPageHtml(url)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown fetch error'
    return [unavailableFinding(url, `the page could not be loaded (${reason})`)]
  }

  // Cheap parse-time guard: if it isn't a money page, emit nothing (no need to
  // spend a GA4 call on it).
  try {
    const root = parse(html, { comment: false })
    if (!isMoneyPage(url, root)) return []
  } catch {
    return [unavailableFinding(url, 'the page HTML could not be parsed')]
  }

  const ga4 = await readGa4Conversion(url)
  return mapConversion(url, html, ga4)
}
