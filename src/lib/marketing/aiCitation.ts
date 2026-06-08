// AI-citation share-of-voice tracker (marketingIdea seo-ai-citation-tracking).
//
// Goal: measure whether AI answer engines MENTION and CITE goinvo.com when a
// prospect asks about GoInvo's topics, tracked over time as a share-of-voice.
//
// v1 uses the OpenAI Responses API with the built-in `web_search` tool — the
// same endpoint + auth pattern the rest of the marketing suite uses
// (src/app/api/marketing/assist/route.ts, citation-check/route.ts):
//   POST https://api.openai.com/v1/responses
//   Authorization: Bearer $OPENAI_API_KEY
//   body { model, input, tools: [{ type: "web_search" }] }
//
// VERIFIED LIVE RESPONSE SHAPE (gpt-4.1 + web_search, status 200):
//   - There is NO top-level `output_text`; the answer text lives in
//     output[].content[] entries whose `type === "output_text"` (joined).
//   - URL citations live in output[].content[].annotations[] as
//     { type: "url_citation", url, title, start_index, end_index }.
//   - A web_search_call item precedes the message item (no text/citations).
//
// Detection (confirmed against two live prompts):
//   - GoInvo MENTIONED  = case-insensitive "goinvo" / "go invo" in the answer.
//   - GoInvo CITED      = any url_citation URL contains "goinvo.com".
//
// Everything here is graceful by design: a missing OPENAI_API_KEY or a failing
// call NEVER throws — checkAiCitation returns an `error`-flagged result and
// runAiCitationPanel returns a clearly-unavailable snapshot. The library does
// NOT stamp wall-clock time; the ROUTE injects/stamps `runDate` so the lib stays
// deterministic and unit-testable.

// ---------------------------------------------------------------------------
// The FIXED prompt panel. Fixed = trend-stable: the same questions every run so
// mention/citation rates are comparable over time (share-of-voice). These are
// the high-intent questions a prospect would actually ask an AI answer engine
// when looking for a studio in GoInvo's space.
// ---------------------------------------------------------------------------

export const AI_CITATION_PROMPTS: string[] = [
  'What are the best healthcare design agencies?',
  'Who are the top healthcare UX/UI design firms?',
  'What design firms specialize in open source healthcare software?',
  'Who does healthcare data visualization design?',
  'What agencies design FHIR or health IT / EHR interfaces?',
  'Best design firms for digital health startups?',
  'Who designs patient-facing healthcare apps and portals?',
  'What firms work on social determinants of health?',
  'Healthcare design or health UX consultancies near Boston?',
  'Best agencies for medical device software UX?',
  'What design studios focus on health equity and public health?',
  'Who are leading service design firms for healthcare systems?',
]

export const DEFAULT_AI_CITATION_MODEL = 'gpt-4.1'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const DEFAULT_TIMEOUT_MS = 45000
const DEFAULT_CONCURRENCY = 3

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PromptResult = {
  prompt: string
  answerText: string
  goinvoMentioned: boolean
  goinvoCited: boolean
  citedGoinvoUrls: string[]
  allCitedUrls: string[]
  competitorsMentioned: string[]
  // Set (with a human-readable message) when the call failed; the result is
  // still returned so the panel/aggregate can carry on with whatever succeeded.
  error?: string
}

export type CompetitorTally = { name: string; count: number }

export type PanelAggregate = {
  mentionedCount: number
  citedCount: number
  // Rates are over the prompts that actually returned an answer (errored prompts
  // are excluded from the denominator so a transient failure doesn't deflate the
  // trend). 0 when there were no answered prompts.
  mentionRate: number
  citationRate: number
  topCompetitors: CompetitorTally[]
}

export type PanelSnapshot = {
  // The library leaves runDate undefined; the route stamps it (see module note).
  runDate?: string
  model: string
  promptCount: number
  // Number of prompts that returned an answer (no error). Denominator for rates.
  answeredCount: number
  results: PromptResult[]
  aggregate: PanelAggregate
  // True when the panel could not run at all (e.g. no OPENAI_API_KEY). The
  // snapshot is still a valid, storable object — just an empty/unavailable one.
  unavailable?: boolean
  unavailableReason?: string
}

export type CheckAiCitationOptions = {
  model?: string
  timeoutMs?: number
  apiKey?: string
  // Injected for tests; defaults to the global fetch.
  fetchImpl?: typeof fetch
}

export type RunPanelOptions = CheckAiCitationOptions & {
  concurrency?: number
}

// ---------------------------------------------------------------------------
// OpenAI Responses payload shape (only the parts we read).
// ---------------------------------------------------------------------------

type ResponsesAnnotation = {
  type?: string
  url?: string
  title?: string
}

type ResponsesContent = {
  type?: string
  text?: string
  annotations?: ResponsesAnnotation[]
}

type ResponsesOutputItem = {
  type?: string
  content?: ResponsesContent[]
}

type ResponsesPayload = {
  output_text?: unknown
  output?: ResponsesOutputItem[]
}

// ---------------------------------------------------------------------------
// Payload parsing — pure, exported so tests can exercise it directly against a
// mocked Responses payload without any network.
// ---------------------------------------------------------------------------

// The answer text: prefer a top-level output_text if one is ever present (it
// was undefined in the live gpt-4.1 + web_search response), otherwise join the
// output_text content blocks across the output items.
export function extractAnswerText(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''
  const p = payload as ResponsesPayload
  if (typeof p.output_text === 'string' && p.output_text.trim()) return p.output_text
  return (p.output || [])
    .flatMap((item) => item.content || [])
    .filter((c) => c.type === 'output_text' && typeof c.text === 'string')
    .map((c) => c.text as string)
    .join('\n')
}

// Every url_citation URL across all annotations, de-duplicated in order.
export function extractCitedUrls(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null) return []
  const p = payload as ResponsesPayload
  const urls: string[] = []
  for (const item of p.output || []) {
    for (const c of item.content || []) {
      for (const a of c.annotations || []) {
        if (a.type === 'url_citation' && typeof a.url === 'string' && a.url.trim()) {
          urls.push(a.url.trim())
        }
      }
    }
  }
  return [...new Set(urls)]
}

// Case-insensitive "goinvo" or "go invo" anywhere in the answer text.
export function detectGoinvoMention(answerText: string): boolean {
  return /go\s?invo/i.test(answerText)
}

// A URL counts as a goinvo.com citation if its host (or the raw string, when it
// won't parse) contains goinvo.com.
export function detectGoinvoCitation(citedUrls: string[]): string[] {
  return citedUrls.filter((u) => {
    let host = u
    try {
      host = new URL(u).hostname
    } catch {
      // keep raw url for the substring test
    }
    return /(^|\.)goinvo\.com$/i.test(host) || /goinvo\.com/i.test(u)
  })
}

// ---------------------------------------------------------------------------
// Competitor extraction — best-effort, deliberately simple. Pull capitalized
// multi-word (or known single-word) brand/firm names that appear near
// design/agency/firm/studio context, minus GoInvo itself and generic phrases.
// This is a heuristic signal for "who else is in the answer", not a ground
// truth; the route stores it but the headline metric is GoInvo's own
// mention/citation rate.
// ---------------------------------------------------------------------------

// Words that, capitalized, are NOT firm names even though they pass the casing
// test (section headers, geographies, generic nouns common in these answers).
const COMPETITOR_STOPWORDS = new Set(
  [
    'goinvo',
    'go invo',
    'the',
    'this',
    'that',
    'these',
    'those',
    'their',
    'they',
    'there',
    'here',
    'best',
    'top',
    'leading',
    'design',
    'designs',
    'designer',
    'designers',
    'agency',
    'agencies',
    'firm',
    'firms',
    'studio',
    'studios',
    'company',
    'companies',
    'consultancy',
    'consultancies',
    'healthcare',
    'health',
    'digital',
    'data',
    'visualization',
    'open',
    'source',
    'software',
    'patient',
    'patients',
    'medical',
    'device',
    'devices',
    'startup',
    'startups',
    'product',
    'products',
    'service',
    'services',
    'system',
    'systems',
    'equity',
    'public',
    'ux',
    'ui',
    'experience',
    'overview',
    'summary',
    'notable',
    'expertise',
    'projects',
    'project',
    'category',
    'categories',
    'below',
    'updated',
    'renowned',
    'known',
    'award',
    'awards',
    'winning',
    'based',
    'boston',
    'usa',
    'us',
    'united',
    'states',
    'america',
    'american',
    'europe',
    'european',
    'global',
    'worldwide',
    'note',
    'finally',
    'first',
    'second',
    'third',
    'additionally',
    'however',
    'meanwhile',
    'overall',
    'pros',
    'cons',
    'they',
    'while',
    'about',
    'with',
    'from',
    'each',
    'all',
    'and',
    'for',
    'their',
  ].map((w) => w.toLowerCase()),
)

// "Near design context": these prompts are entirely about firms, so we only run
// the heuristic at all when the answer talks about agencies/firms/studios.
const FIRM_CONTEXT = /\b(agenc|firm|studio|consultanc|design|company|companies|lab|labs|group|partners|collective)\b/i

// A capitalized name token: starts uppercase, allows internal caps/digits/&/.,
// e.g. "Koru UX", "IDEO", "Fjord", "ZS Associates", "Mad-Pow".
const NAME_TOKEN = "[A-Z][A-Za-z0-9&.'’-]*"
const NAME_PHRASE = new RegExp(`^(${NAME_TOKEN}(?:\\s+${NAME_TOKEN}){0,3})(.*)$`)

// A firm name leads a LIST ENTRY in these answers — a bullet, a numbered item,
// or a bolded lead-in ("**Koru UX** — ..."). We only harvest from those entries
// (taking the leading name phrase), which keeps prose sentences — and the
// sentence-initial words / acronyms they start with ("Ensure ...", "FDA ...",
// "Here's ...") — from being mistaken for competitors. This is deliberately
// conservative best-effort: better to miss a firm than to invent one.
const LIST_ENTRY = /^(?:[-*•]\s+|\d+[.)]\s+|\*\*)/

// A real firm entry separates the NAME from its description with a boundary: an
// em/en/hyphen dash, a colon, a comma, a parenthesis, or the name simply being
// the whole short entry. A verb-led description bullet ("Specializes in EHR
// design", "Provides FHIR interfaces") has the leading word run straight into a
// lowercase continuation with no such boundary — so requiring the boundary
// rejects those without a hand-maintained verb list.
const NAME_BOUNDARY = /^(?:\s*$|\s*[—–\-:,(].*|\s+\(.*)$/

// All-caps acronyms that show up in healthcare/regulatory prose but are NOT
// firms; harvested single tokens are checked against this set too.
const ACRONYM_STOPWORDS = new Set([
  'EHR',
  'EHRS',
  'EMR',
  'EMRS',
  'FHIR',
  'FDA',
  'HHS',
  'CMS',
  'HIPAA',
  'IEC',
  'ISO',
  'API',
  'APIS',
  'UX',
  'UI',
  'AI',
  'IT',
  'US',
  'USA',
  'EU',
  'SDOH',
  'YMYL',
])

export function extractCompetitors(answerText: string, limit = 12): string[] {
  if (!answerText || !FIRM_CONTEXT.test(answerText)) return []

  const found = new Map<string, string>() // lowerKey -> display name
  const lines = answerText.split(/\r?\n/)

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    // Only firm LIST ENTRIES are trustworthy sources of a firm name.
    if (!LIST_ENTRY.test(trimmed)) continue

    // Strip the leading list marker (bullet / number), but note whether the
    // name itself was BOLDED — a bolded lead-in ("**Koru UX** — ...") is a
    // strong firm-name signal on its own.
    const afterMarker = trimmed
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .trim()
    if (!afterMarker) continue
    const boldMatch = afterMarker.match(/^\*\*\s*([^*]+?)\s*\*\*(.*)$/)

    // Strip emphasis markers so the firm name leads the entry.
    const entry = afterMarker.replace(/\*\*|__|`/g, '').trim()
    if (!entry) continue

    // Take the LEADING capitalized phrase only (the firm name), then the rest of
    // the entry so we can confirm it's separated from a description like a real
    // firm name (and not a verb-led description bullet).
    const match = entry.match(NAME_PHRASE)
    if (!match) continue
    const name = normalizeCompetitorName(match[1])
    const rest = match[2] || ''
    if (!name) continue

    // Accept when the name was bolded (strong signal) OR is followed by a
    // name/description boundary. Verb-led bullets ("Specializes in ...") fail
    // both and are dropped.
    const wasBolded = Boolean(boldMatch && normalizeCompetitorName(boldMatch[1]).toLowerCase() === name.toLowerCase())
    if (!wasBolded && !NAME_BOUNDARY.test(rest)) continue

    const key = name.toLowerCase()
    if (COMPETITOR_STOPWORDS.has(key)) continue
    // Drop names that are entirely stopwords (e.g. "Healthcare Design").
    if (key.split(/\s+/).every((w) => COMPETITOR_STOPWORDS.has(w))) continue
    // A bare single token must be a plausible brand: a known firm acronym is
    // out, and a 1–2 char token is out. Multi-word phrases are kept.
    if (!name.includes(' ')) {
      if (name.length < 3) continue
      if (ACRONYM_STOPWORDS.has(name.toUpperCase())) continue
    }
    if (!found.has(key)) found.set(key, name)
  }

  return [...found.values()].slice(0, limit)
}

function normalizeCompetitorName(raw: string): string {
  return raw
    .replace(/[.,;:’'"()]+$/g, '')
    .replace(/^[.,;:’'"()]+/g, '')
    .trim()
}

// ---------------------------------------------------------------------------
// checkAiCitation — one OpenAI web-search call for one prompt. NEVER throws.
// ---------------------------------------------------------------------------

export async function checkAiCitation(
  prompt: string,
  opts: CheckAiCitationOptions = {},
): Promise<PromptResult> {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY
  const model = opts.model || process.env.AI_CITATION_MODEL || DEFAULT_AI_CITATION_MODEL
  const fetchImpl = opts.fetchImpl ?? fetch

  const empty: PromptResult = {
    prompt,
    answerText: '',
    goinvoMentioned: false,
    goinvoCited: false,
    citedGoinvoUrls: [],
    allCitedUrls: [],
    competitorsMentioned: [],
  }

  if (!apiKey) {
    return { ...empty, error: 'OPENAI_API_KEY is not configured.' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  try {
    const res = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: prompt,
        tools: [{ type: 'web_search' }],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ...empty, error: `OpenAI returned ${res.status}: ${body.slice(0, 200)}` }
    }

    const payload = await res.json()
    return buildPromptResult(prompt, payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error'
    return { ...empty, error: `AI citation call failed: ${message}` }
  } finally {
    clearTimeout(timeout)
  }
}

// Pure: turn a (prompt, payload) pair into a PromptResult. Exported so tests can
// drive detection directly off a mocked Responses payload.
export function buildPromptResult(prompt: string, payload: unknown): PromptResult {
  const answerText = extractAnswerText(payload)
  const allCitedUrls = extractCitedUrls(payload)
  const citedGoinvoUrls = detectGoinvoCitation(allCitedUrls)
  return {
    prompt,
    answerText,
    goinvoMentioned: detectGoinvoMention(answerText),
    goinvoCited: citedGoinvoUrls.length > 0,
    citedGoinvoUrls,
    allCitedUrls,
    competitorsMentioned: extractCompetitors(answerText),
  }
}

// ---------------------------------------------------------------------------
// Aggregate — pure tally of mention/citation rates + a competitor leaderboard.
// Rates are over ANSWERED prompts (errored ones excluded from the denominator).
// Exported for tests.
// ---------------------------------------------------------------------------

export function aggregateResults(results: PromptResult[]): PanelAggregate & { answeredCount: number } {
  const answered = results.filter((r) => !r.error)
  const answeredCount = answered.length
  const mentionedCount = answered.filter((r) => r.goinvoMentioned).length
  const citedCount = answered.filter((r) => r.goinvoCited).length

  const tally = new Map<string, number>()
  for (const r of answered) {
    for (const name of r.competitorsMentioned) {
      const key = name.toLowerCase()
      tally.set(key, (tally.get(key) || 0) + 1)
    }
  }
  // Preserve a stable display name (first-seen casing) for each key.
  const displayByKey = new Map<string, string>()
  for (const r of answered) {
    for (const name of r.competitorsMentioned) {
      const key = name.toLowerCase()
      if (!displayByKey.has(key)) displayByKey.set(key, name)
    }
  }
  const topCompetitors: CompetitorTally[] = [...tally.entries()]
    .map(([key, count]) => ({ name: displayByKey.get(key) || key, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 15)

  return {
    answeredCount,
    mentionedCount,
    citedCount,
    mentionRate: answeredCount ? round2(mentionedCount / answeredCount) : 0,
    citationRate: answeredCount ? round2(citedCount / answeredCount) : 0,
    topCompetitors,
  }
}

function round2(n: number): number {
  return Math.round(n * 10000) / 10000
}

// ---------------------------------------------------------------------------
// runAiCitationPanel — run the fixed panel with small concurrency, aggregate.
// Graceful: missing OPENAI_API_KEY → a clearly-unavailable snapshot, no throw.
// The library does NOT stamp runDate; the route does.
// ---------------------------------------------------------------------------

export async function runAiCitationPanel(
  prompts: string[] = AI_CITATION_PROMPTS,
  opts: RunPanelOptions = {},
): Promise<PanelSnapshot> {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY
  const model = opts.model || process.env.AI_CITATION_MODEL || DEFAULT_AI_CITATION_MODEL
  const panelPrompts = prompts.length ? prompts : AI_CITATION_PROMPTS

  if (!apiKey) {
    return {
      model,
      promptCount: panelPrompts.length,
      answeredCount: 0,
      results: [],
      aggregate: {
        mentionedCount: 0,
        citedCount: 0,
        mentionRate: 0,
        citationRate: 0,
        topCompetitors: [],
      },
      unavailable: true,
      unavailableReason: 'OPENAI_API_KEY is not configured, so the AI citation panel could not run.',
    }
  }

  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY)
  const results = await runWithConcurrency(panelPrompts, concurrency, (prompt) =>
    checkAiCitation(prompt, { ...opts, apiKey, model }),
  )

  const { answeredCount, ...aggregate } = aggregateResults(results)

  return {
    model,
    promptCount: panelPrompts.length,
    answeredCount,
    results,
    aggregate,
  }
}

// Run an async mapper over items with a fixed worker-pool size, preserving input
// order in the output. Keeps us under OpenAI rate limits (default 3 in flight).
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = next++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}
