/**
 * Marqueta suggests marketing material — what to make next, and why.
 *
 * Drafting (`marquetaGenerate`) answers "write me X". This answers the question
 * before it: "what should we be putting out?" Three places an answer can come
 * from, and somebody picks which:
 *
 *   - `work`   — what the studio made: case studies, essays, proof points. The
 *                cheapest and most defensible material there is, and the most
 *                under-used.
 *   - `field`  — what the field is talking about right now that our work has
 *                something to say to: a live web search for current thought
 *                leadership, each piece tied back to something we made.
 *   - `custom` — the person's own brief, optionally with documents (attached
 *                to the Slack message, or linked) that say more.
 *
 * Every suggestion has to be ANCHORED. The model refers to our work and our
 * research by id (W1, R2, D1), never by URL; links are drawn from our own
 * records afterwards, so a suggestion cannot point at a case study that does
 * not exist. An external source survives only if its URL is one the web search
 * actually returned. A suggestion whose anchors all turn out to be invented is
 * dropped, and the card says how many were — a smaller true list beats a
 * bigger one that leans on nothing.
 *
 * Pure and SDK-free, like its drafting sibling: detection, prompt, parsing,
 * the idea mapping and the button values are all testable without a call.
 */

import { BRAND_VOICE_SYSTEM_POLICY } from './brandVoice'
import { ideaDocIdForMessage } from './ideaCapture'
import type { ResearchCitation } from './marquetaCitations'
import {
  extractJsonObject,
  FORMAT_LABEL,
  GENERATION_FORMATS,
  MAX_TOPIC_LENGTH,
  sanitizeTopic,
  type GenerationFormat,
} from './marquetaGenerate'
import { LABEL } from './marquetaStyle'

export type SuggestionSource = 'work' | 'field' | 'custom'

export const SUGGESTION_SOURCES: SuggestionSource[] = ['work', 'field', 'custom']

/** How each source is named back to people, in headers and confirmations. */
export const SOURCE_LABEL: Record<SuggestionSource, string> = {
  work: 'from our work',
  field: 'from the field',
  custom: 'from your brief',
}

/** At most this many suggestions on one card — five is already a lot to read on a phone. */
export const MAX_SUGGESTIONS = 5

/* ---------------------------------------------------------------------------
 * The trigger.
 * ------------------------------------------------------------------------- */

/**
 * The words that pick a source, longest first so "from our work" wins over
 * "work". Matched as whole words at the start of what follows the verb.
 */
const SOURCE_PHRASES: { phrase: string; source: Exclude<SuggestionSource, 'custom'> }[] = [
  { phrase: 'from our own work', source: 'work' },
  { phrase: 'from what we made', source: 'work' },
  { phrase: 'from what we’ve made', source: 'work' },
  { phrase: "from what we've made", source: 'work' },
  { phrase: 'from our work', source: 'work' },
  { phrase: 'from work', source: 'work' },
  { phrase: 'our work', source: 'work' },
  { phrase: 'work', source: 'work' },
  { phrase: 'from thought leadership', source: 'field' },
  { phrase: 'from the field', source: 'field' },
  { phrase: 'from the news', source: 'field' },
  { phrase: 'from trends', source: 'field' },
  { phrase: 'thought leadership', source: 'field' },
  { phrase: 'the field', source: 'field' },
  { phrase: 'field', source: 'field' },
  { phrase: 'trends', source: 'field' },
]

/** Words between the verb and the source that carry no meaning: "suggest some content ideas from our work". */
const FILLER = /^(?:me|us|a|an|the|some|a few|few|few more|more|marketing|content|post|posts|ideas?|material|things|something|anything|stuff)\b[\s,]*/i

const isWordChar = (character: string) => /[a-z0-9]/i.test(character || '')

/**
 * Is this message asking Marqueta for suggestions, and from where?
 *
 *     suggest from our work                  -> work
 *     suggest from our work: for HLTH week   -> work, details "for HLTH week"
 *     suggest from the field                 -> field
 *     suggest: a post for our 15th birthday  -> custom
 *     suggest a newsletter for October       -> custom (the words after the verb are the brief)
 *     suggest                                -> source null — she offers the three
 *
 * Anchored at the start and verb-led, like drafting, so "I'd suggest we wait"
 * in the middle of a sentence is never an instruction. The verb is `suggest`
 * alone: `suggestion(s)` is a noun people use about ideas she caught, and
 * claiming it would steal those questions.
 *
 * A null source is returned rather than a guess, because the three cost very
 * different amounts — `field` runs a live web search — and a bare "suggest"
 * says nothing about which was meant. The caller promotes it to `custom` when
 * the message carries documents, since those are the brief.
 */
export function detectSuggestionRequest(
  rawText: string,
): { source: SuggestionSource | null; details: string } | null {
  const text = String(rawText || '').trim()
  if (!text) return null

  const working = text
    .replace(/^(please|hey|hi|ok|okay)\b[\s,]*/i, '')
    .replace(/^(can|could|would|will)\s+you\s+/i, '')
    .trim()

  const verb = /^suggest(?![a-z0-9])/i.exec(working)
  if (!verb) return null

  const afterVerb = working.slice(verb[0].length)
  // "suggest: <brief>" — the colon makes everything after it the brief.
  const colon = /^\s*:/.exec(afterVerb)
  if (colon) {
    const details = afterVerb.slice(colon[0].length).trim()
    return { source: details ? 'custom' : null, details }
  }

  let rest = afterVerb.trim()
  for (let guard = 0; guard < 6; guard += 1) {
    const filler = FILLER.exec(rest)
    if (!filler || !filler[0]) break
    rest = rest.slice(filler[0].length)
  }

  const lower = rest.toLowerCase()
  const match = SOURCE_PHRASES.find(
    (candidate) => lower.startsWith(candidate.phrase) && !isWordChar(lower[candidate.phrase.length] || ''),
  )
  if (match) {
    const details = rest.slice(match.phrase.length).replace(/^[\s:,—–-]+/, '').trim()
    return { source: match.source, details }
  }

  if (!rest.trim()) return { source: null, details: '' }
  // Anything else after the verb is the brief itself, as typed.
  return { source: 'custom', details: afterVerb.trim() }
}

/** Every phrase that reaches suggestions, for the help text and the collision test. */
export const SUGGEST_TRIGGER_EXAMPLES = ['suggest from our work', 'suggest from the field', 'suggest: <brief>']

/**
 * Her answer to a bare "suggest": the three ways to ask, one line each. No
 * model call — the cheapest reply to an ambiguous request is a question.
 */
export function suggestMenuText(ask: (command: string) => string): string {
  return [
    'Happy to — where should I look?',
    `${ask('suggest from our work')} — things we made that deserve more airtime.`,
    `${ask('suggest from the field')} — what people are discussing now that our work speaks to.`,
    `${ask('suggest: a post for our birthday')} — your own brief; attach or link documents for more detail.`,
  ].join('\n')
}

/* ---------------------------------------------------------------------------
 * Documents: links pulled from the raw message, and which are safe to fetch.
 * ------------------------------------------------------------------------- */

/**
 * Every http(s) link in a RAW Slack message.
 *
 * Must run on the raw text: decoding turns `<https://x|label>` into `label`,
 * and the URL is gone. Slack wraps every link it recognises in angle brackets,
 * so those are the source of truth; a bare URL is accepted too, for the API.
 */
export function linksInSlackText(raw: string): string[] {
  const text = String(raw || '')
  const found: string[] = []
  const add = (url: string) => {
    const cleaned = url.replace(/&amp;/g, '&').trim()
    if (/^https?:\/\//i.test(cleaned) && !found.includes(cleaned)) found.push(cleaned)
  }
  for (const match of text.matchAll(/<(https?:\/\/[^|>\s]+)(?:\|[^>]*)?>/gi)) add(match[1])
  const unwrapped = text.replace(/<[^>]*>/g, ' ')
  for (const match of unwrapped.matchAll(/\bhttps?:\/\/[^\s<>"')]+/gi)) add(match[0].replace(/[.,;:!?]+$/, ''))
  return found
}

/**
 * May the server fetch this URL on somebody's behalf?
 *
 * The link comes from a chat message, so it is untrusted: only http(s), only a
 * named public host — no localhost, no bare IP addresses, no internal names.
 * A bare IP is refused outright rather than range-checked; a real document
 * worth reading lives behind a hostname.
 */
export function isFetchableUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  if (!host.includes('.')) return false
  if (/^\[|^[\d.]+$/.test(host)) return false
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(host)) return false
  if (host.endsWith('.goinvo.internal') || host === 'metadata.google.internal') return false
  return true
}

/**
 * A Google Doc shared "anyone with the link" can be read as plain text from its
 * export URL; the page itself is a JavaScript app with nothing in it to read.
 * Returns the URL unchanged when it is not a Doc.
 */
export function readableDocumentUrl(raw: string): string {
  const doc = /^https:\/\/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)/.exec(raw)
  if (doc) return `https://docs.google.com/document/d/${doc[1]}/export?format=txt`
  const slides = /^https:\/\/docs\.google\.com\/presentation\/d\/([A-Za-z0-9_-]+)/.exec(raw)
  if (slides) return `https://docs.google.com/presentation/d/${slides[1]}/export/txt`
  return raw
}

/** At most this many documents per request, and this much text from each. */
export const MAX_DOCUMENTS = 4
export const MAX_DOCUMENT_CHARS = 24_000
/** Claude reads PDFs up to 32 MB; a Slack upload of a deck rarely nears this. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024

/** A document as read, ready for the prompt. Text documents carry text; PDFs travel as attachments. */
export type SuggestionDocument = {
  id: string
  name: string
  text?: string
  pdfBase64?: string
  sourceUrl?: string
}

/** A document that could not be read, and the reason in a person's words. */
export type DocumentProblem = { name: string; reason: string }

/** Is this mimetype or filename something we can read as text? */
export function isTextDocument(mimetype: string, name = ''): boolean {
  const type = String(mimetype || '').toLowerCase()
  if (type.startsWith('text/')) return true
  if (/^application\/(json|xml|x-yaml|yaml|markdown)/.test(type)) return true
  return /\.(txt|md|markdown|csv|tsv|json|html?|xml|ya?ml)$/i.test(name)
}

export function isPdfDocument(mimetype: string, name = ''): boolean {
  return String(mimetype || '').toLowerCase() === 'application/pdf' || /\.pdf$/i.test(name)
}

/* ---------------------------------------------------------------------------
 * The grounding, as the model sees it.
 * ------------------------------------------------------------------------- */

/** One thing we made. `id` is what the model cites (W1…); `url` is never shown to it. */
export type WorkItem = {
  id: string
  title: string
  url: string
  kind: 'case study' | 'essay' | 'proof point'
  summary?: string
}

/** A verified research signal, numbered for the model (R1…). */
export type ResearchItem = { id: string; citation: ResearchCitation }

export function numberWork(
  rows: { title: string; url: string; kind: WorkItem['kind']; summary?: string }[],
): WorkItem[] {
  return rows.map((row, index) => ({ ...row, id: `W${index + 1}` }))
}

export function numberResearch(citations: ResearchCitation[]): ResearchItem[] {
  return citations
    .filter((citation) => citation.verified && citation.quote)
    .map((citation, index) => ({ id: `R${index + 1}`, citation }))
}

const SYSTEM_COMMON = [
  'You suggest marketing material for GoInvo, a Boston healthcare design studio: clinical',
  'software, human factors for regulated products, data visualisation, and open-source health',
  'work. GoInvo ships things — the voice is "we made this and here is what we learned", not',
  '"we offer capabilities". Suggestions are for a small team with a few hours a week, so',
  'favour things that are quick to make from what already exists.',
  '',
  'Every suggestion must say WHY GOINVO can credibly say it, by citing our work by id',
  '(W1, W2…). Refer to research by id (R1…) and documents by id (D1…). Never write a URL for',
  'our work or research — links are added afterwards from our records. Never invent a',
  'statistic, client, date or outcome that is not in what you were given.',
  '',
  'Vary the formats across suggestions where it makes sense: outline (an article),',
  'script (a short video), post (social, including carousels), email (outreach or newsletter).',
  'Do not suggest anything already listed in alreadyPlanned.',
  'Reply with ONLY a JSON object in the shape of outputContract.',
]

export function suggestionSystem(source: SuggestionSource): string {
  const specific: Record<SuggestionSource, string[]> = {
    work: [
      'SOURCE: OUR WORK. Find the pieces in ourWork with a story still worth telling — a result,',
      'a method, a visual, a lesson — and suggest material that puts them in front of the',
      'people who buy this kind of work. Every suggestion cites at least one W id.',
    ],
    field: [
      'SOURCE: THE FIELD. Use web search to find what healthcare, health IT and clinical-AI',
      'leaders are discussing NOW (roughly the last 90 days): reports, essays, talks, policy',
      'shifts. Pick pieces our brand genuinely resonates with, and for each suggest material',
      'that joins that conversation by showing our related work. Every suggestion cites at',
      'least one W id AND at least one external source (title + the exact URL from your search',
      'results) or an R id. Do not cite a URL you did not get from search.',
    ],
    custom: [
      'SOURCE: THE BRIEF. Follow the person’s brief in `request`. Read any documents closely —',
      'they are the detail behind the brief — and ground suggestions in them (D ids) and in our',
      'work (W ids) wherever it fits.',
    ],
  }
  return [...SYSTEM_COMMON, '', ...specific[source]].join('\n')
}

export function suggestionOutputContract(source: SuggestionSource): Record<string, unknown> {
  return {
    suggestions: [
      {
        title: 'A working title for the piece',
        format: `one of: ${GENERATION_FORMATS.join(', ')}`,
        angle: 'One or two sentences: the argument or hook, and who it is for',
        whyUs: 'One sentence: what in our work makes this ours to say',
        ...(source === 'field' ? { whyNow: 'One sentence: the live conversation it joins' } : {}),
        work: ['W1'],
        research: ['R1'],
        documents: ['D1'],
        ...(source === 'field' ? { sources: [{ title: 'External piece title', url: 'https://… exactly as searched' }] } : {}),
      },
    ],
  }
}

export function buildSuggestionUserMessage(input: {
  source: SuggestionSource
  details: string
  work: WorkItem[]
  research: ResearchItem[]
  pillars?: { title: string; coreClaim?: string }[]
  documents?: SuggestionDocument[]
  alreadyPlanned?: string[]
  brandVoice?: { name?: string; guidance?: string | null; do?: string[]; avoid?: string[]; examples?: string[] } | null
}): string {
  const documents = input.documents || []
  return JSON.stringify({
    task: `Suggest up to ${MAX_SUGGESTIONS} pieces of marketing material ${SOURCE_LABEL[input.source]}.`,
    source: input.source,
    request: input.details || null,
    ourWork: input.work.map((item) => ({ id: item.id, kind: item.kind, title: item.title, summary: item.summary })),
    verifiedResearch: input.research.map((item) => ({
      id: item.id,
      organization: item.citation.organization,
      signal: item.citation.signal,
      quote: item.citation.quote,
    })),
    messagePillars: (input.pillars || []).slice(0, 8),
    documents: documents.map((doc) =>
      doc.pdfBase64
        ? { id: doc.id, name: doc.name, attachedAsPdf: `the PDF titled "${doc.id}: ${doc.name}"` }
        : { id: doc.id, name: doc.name, text: doc.text },
    ),
    alreadyPlanned: (input.alreadyPlanned || []).slice(0, 30),
    ...(input.brandVoice ? { approvedBrandVoice: input.brandVoice, brandVoicePolicy: BRAND_VOICE_SYSTEM_POLICY } : {}),
    outputContract: suggestionOutputContract(input.source),
  })
}

/* ---------------------------------------------------------------------------
 * The model's answer, resolved against what we actually hold.
 * ------------------------------------------------------------------------- */

export type Suggestion = {
  title: string
  format: GenerationFormat
  angle: string
  whyUs: string
  whyNow?: string
  work: WorkItem[]
  research: ResearchCitation[]
  documents: SuggestionDocument[]
  /** External pieces, kept only when the web search really returned them. */
  sources: { title: string; url: string }[]
}

export type ParsedSuggestions = {
  suggestions: Suggestion[]
  /** What was thrown away, and why — said out loud on the card, never hidden. */
  dropped: { title: string; reason: string }[]
}

const asString = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')
const asIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asString).map((id) => id.toUpperCase()).filter(Boolean) : []

/**
 * A URL reduced to what identifies the page: no fragment, no tracking
 * parameters, no trailing slash, host in lower case. Two spellings of the same
 * search result must compare equal, or a real source is thrown away as invented.
 */
export function comparableUrl(raw: string): string {
  try {
    const url = new URL(raw)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key)
    }
    const path = url.pathname.replace(/\/+$/, '')
    return `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search}`
  } catch {
    return String(raw || '').trim()
  }
}

/**
 * Parse the model's suggestions and resolve every reference against our sets.
 *
 * - Ids that are not ours (a W9 when we sent eight) are dropped silently from
 *   the suggestion; the suggestion survives on whatever anchors remain.
 * - An external URL survives only if the web search returned it.
 * - A `work` or `field` suggestion left with no real anchor is dropped and
 *   reported: "highlights our work" is the whole point of those two sources.
 */
export function parseSuggestions(
  text: string,
  context: {
    source: SuggestionSource
    work: WorkItem[]
    research: ResearchItem[]
    documents?: SuggestionDocument[]
    /** Every URL the web search returned. Absent = no search ran, so no external source can be real. */
    searchedUrls?: string[]
  },
): ParsedSuggestions | null {
  const parsed = extractJsonObject<{ suggestions?: unknown }>(text)
  if (!parsed || !Array.isArray(parsed.suggestions)) return null

  const workById = new Map(context.work.map((item) => [item.id, item]))
  const researchById = new Map(context.research.map((item) => [item.id, item.citation]))
  const docsById = new Map((context.documents || []).map((doc) => [doc.id.toUpperCase(), doc]))
  const searched = new Set((context.searchedUrls || []).map(comparableUrl))

  const suggestions: Suggestion[] = []
  const dropped: ParsedSuggestions['dropped'] = []

  for (const raw of parsed.suggestions) {
    const row = (raw || {}) as Record<string, unknown>
    const title = asString(row.title)
    const angle = asString(row.angle)
    if (!title || !angle) continue

    const formatText = asString(row.format).toLowerCase() as GenerationFormat
    const format = GENERATION_FORMATS.includes(formatText) ? formatText : 'post'

    const work = unique(asIds(row.work)).map((id) => workById.get(id)).filter((item): item is WorkItem => Boolean(item))
    const research = unique(asIds(row.research))
      .map((id) => researchById.get(id))
      .filter((item): item is ResearchCitation => Boolean(item))
    const documents = unique(asIds(row.documents))
      .map((id) => docsById.get(id))
      .filter((doc): doc is SuggestionDocument => Boolean(doc))

    const claimedSources = Array.isArray(row.sources) ? row.sources : []
    const sources: Suggestion['sources'] = []
    let invented = 0
    for (const candidate of claimedSources) {
      const source = (candidate || {}) as Record<string, unknown>
      const url = asString(source.url)
      if (!url) continue
      if (!searched.has(comparableUrl(url))) {
        invented += 1
        continue
      }
      if (!sources.some((existing) => comparableUrl(existing.url) === comparableUrl(url))) {
        sources.push({ title: asString(source.title) || url, url })
      }
    }

    if (context.source !== 'custom' && work.length === 0) {
      dropped.push({ title, reason: 'it named none of our work' })
      continue
    }
    if (context.source === 'field' && sources.length === 0 && research.length === 0) {
      dropped.push({
        title,
        reason: invented ? 'its source was not one the search returned' : 'it cited nothing from the field',
      })
      continue
    }

    suggestions.push({
      title: title.slice(0, 160),
      format,
      angle: angle.slice(0, 600),
      whyUs: asString(row.whyUs).slice(0, 400),
      ...(asString(row.whyNow) ? { whyNow: asString(row.whyNow).slice(0, 400) } : {}),
      work,
      research,
      documents,
      sources,
    })
    if (suggestions.length >= MAX_SUGGESTIONS) break
  }

  return { suggestions, dropped }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

/* ---------------------------------------------------------------------------
 * From a suggestion to the next step: a draft, or an idea on the list.
 * ------------------------------------------------------------------------- */

/**
 * Where a suggestion's outputs live. Each suggestion on a card gets its own
 * keys, derived from the card's message — and the idea and the draft get
 * DIFFERENT keys, because the one discard button tries the idea first: shared
 * keys would make "Not for the calendar" on a draft bin the saved idea instead.
 */
export const suggestionIdeaKey = (cardTs: string, index: number) => `${cardTs}-s${index}`
export const suggestionDraftKey = (cardTs: string, index: number) => `${cardTs}-d${index}`

/**
 * The topic handed to the drafter when somebody presses Draft it: the title,
 * the angle and the work it should stand on, inside the drafter's own limit.
 */
export function suggestionTopic(input: { title: string; angle: string; workTitles?: string[]; sourceTitle?: string }): string {
  const parts = [
    `${input.title}.`,
    input.angle,
    input.workTitles?.length ? `Ground it in our work: ${input.workTitles.join('; ')}.` : '',
    input.sourceTitle ? `It responds to: ${input.sourceTitle}.` : '',
  ].filter(Boolean)
  return sanitizeTopic(parts.join(' ')).slice(0, MAX_TOPIC_LENGTH)
}

/** What a Draft it / Save as idea button carries: enough to act with no read and no model. */
export type SuggestionValue = {
  channel: string
  /** The card's own message ts — the keys for the draft and the idea derive from it. */
  cardTs: string
  index: number
  format: GenerationFormat
  title: string
  angle: string
  why: string
  workTitles: string[]
  sourceTitle?: string
  sourceUrl?: string
}

const BUTTON_VALUE_BUDGET = 1900

/**
 * Encode a suggestion for a button.
 *
 * The card's ts is not known until the card is posted, so builders encode a
 * placeholder and the route reads the real ts from the press payload
 * (`message.ts`) — see `withCardTs`. Long fields are trimmed, angle last and
 * hardest, until the value fits Slack's 2,000-character cap.
 */
export function encodeSuggestionValue(value: SuggestionValue): string {
  const shape = (angleMax: number, whyMax: number, workMax: number) =>
    JSON.stringify({
      c: value.channel,
      ts: value.cardTs,
      i: value.index,
      f: value.format,
      t: value.title.slice(0, 160),
      a: value.angle.slice(0, angleMax),
      y: value.why.slice(0, whyMax),
      w: value.workTitles.slice(0, 3).map((title) => title.slice(0, workMax)),
      ...(value.sourceTitle ? { st: value.sourceTitle.slice(0, 160) } : {}),
      ...(value.sourceUrl && value.sourceUrl.length <= 400 ? { su: value.sourceUrl } : {}),
    })
  for (const [angleMax, whyMax, workMax] of [
    [600, 400, 120],
    [400, 240, 80],
    [240, 120, 60],
    [120, 0, 40],
  ]) {
    const encoded = shape(angleMax, whyMax, workMax)
    if (encoded.length <= BUTTON_VALUE_BUDGET) return encoded
  }
  return shape(60, 0, 20).slice(0, BUTTON_VALUE_BUDGET)
}

export function decodeSuggestionValue(raw: string | undefined): SuggestionValue | null {
  try {
    const parsed = JSON.parse(String(raw || '')) as Record<string, unknown>
    const channel = asString(parsed.c)
    const index = Number(parsed.i)
    const format = asString(parsed.f) as GenerationFormat
    const title = asString(parsed.t)
    if (!channel || !Number.isInteger(index) || index < 0 || !GENERATION_FORMATS.includes(format) || !title) return null
    return {
      channel,
      cardTs: asString(parsed.ts),
      index,
      format,
      title,
      angle: asString(parsed.a),
      why: asString(parsed.y),
      workTitles: Array.isArray(parsed.w) ? parsed.w.map(asString).filter(Boolean) : [],
      ...(asString(parsed.st) ? { sourceTitle: asString(parsed.st) } : {}),
      ...(asString(parsed.su) ? { sourceUrl: asString(parsed.su) } : {}),
    }
  } catch {
    return null
  }
}

/** The value with the card's real ts filled in from the press. */
export function withCardTs(value: SuggestionValue, messageTs: string | undefined): SuggestionValue {
  return value.cardTs || !messageTs ? value : { ...value, cardTs: messageTs }
}

/**
 * The idea a saved suggestion becomes.
 *
 * `needsReview: false` — unlike a caught idea, nobody is guessing here: a
 * person read it and chose to keep it. Its id comes from `ideaDocIdForMessage`
 * so the existing "Not an idea" button (and its handler) can reverse the save.
 */
export function suggestionToIdea(input: { value: SuggestionValue; personName: string; permalink?: string }) {
  const { value } = input
  const summary = [
    value.angle,
    value.why ? `Why us: ${value.why}` : '',
    value.workTitles.length ? `Our work: ${value.workTitles.join('; ')}` : '',
    value.sourceTitle ? `Responds to: ${value.sourceTitle}${value.sourceUrl ? ` (${value.sourceUrl})` : ''}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  return {
    _id: ideaDocIdForMessage({ channel: value.channel, ts: suggestionIdeaKey(value.cardTs, value.index) }),
    _type: 'marketingIdea' as const,
    title: value.title.slice(0, 160),
    summary,
    category: 'content',
    status: 'idea',
    priority: 'medium',
    nextAction: `Draft the ${FORMAT_LABEL[value.format]} — press ${LABEL.SUGGEST_DRAFT} on the suggestion in Slack.`,
    ...(input.permalink ? { relatedUrl: input.permalink } : value.sourceUrl ? { relatedUrl: value.sourceUrl } : {}),
    source: `Marqueta suggestion — saved by ${input.personName || 'someone'}`,
    needsReview: false,
  }
}
