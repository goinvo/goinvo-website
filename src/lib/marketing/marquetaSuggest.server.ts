/**
 * Running suggestions: read any documents, gather the grounding, ask Claude,
 * and resolve what comes back against our own records.
 *
 * Server-only. Grounding is the studio's own catalogue — case studies and
 * essays from the public dataset, proof points and message pillars from the
 * private one — plus the VERIFIED organisation research the drafter uses, and
 * whatever is already on the calendar (so she does not suggest what is planned).
 * `field` adds a live web search; its sources are kept only when the search
 * really returned them (`parseSuggestions`).
 *
 * Documents arrive three ways: a Slack attachment (needs the `files:read`
 * scope), a link in the message (a public page, or a Google Doc shared with
 * "anyone with the link"), or — from the API — text and PDFs in the request.
 * A document that cannot be read is reported by name with the reason; it never
 * silently becomes a suggestion that ignored it.
 *
 * Fail-closed: no ANTHROPIC_API_KEY, no call.
 */

import { client } from '@/sanity/lib/client'
import { getSlackConfig } from '@/lib/chat/slack'
import { generateClaudeText, isAnthropicConfigured, resolveMarketingModel } from './anthropicJson'
import { brandVoicePromptContext, resolveMarketingBrandVoice } from './brandVoice'
import { getMarketingWriteClientFor } from './client'
import { buildResearchCitations } from './marquetaCitations'
import { fetchVerifiedResearch } from './marquetaGenerate.server'
import {
  buildSuggestionUserMessage,
  isFetchableUrl,
  isPdfDocument,
  isTextDocument,
  MAX_DOCUMENT_CHARS,
  MAX_DOCUMENTS,
  MAX_PDF_BYTES,
  numberResearch,
  numberWork,
  parseSuggestions,
  readableDocumentUrl,
  suggestionSystem,
  type DocumentProblem,
  type Suggestion,
  type SuggestionDocument,
  type SuggestionSource,
  type WorkItem,
} from './marquetaSuggest'
import { extractReadableText } from './sourceVerification'

/** A document somebody pointed at, before it is read. */
export type DocumentRequest =
  | { kind: 'slackFile'; name: string; mimetype: string; url: string; size?: number }
  | { kind: 'url'; url: string }
  | { kind: 'text'; name: string; text: string }
  | { kind: 'pdf'; name: string; base64: string }

export type SuggestionResult =
  | {
      ok: true
      source: SuggestionSource
      suggestions: Suggestion[]
      dropped: { title: string; reason: string }[]
      documentsRead: string[]
      documentProblems: DocumentProblem[]
      brandVoiceName?: string
      model: string
    }
  | { ok: false; reason: 'not-configured' | 'no-brief' | 'failed'; message: string; documentProblems?: DocumentProblem[] }

const DOCUMENT_TIMEOUT_MS = 15_000
const SITE_BASE = 'https://www.goinvo.com'

/* ---------------------------------------------------------------------------
 * Reading documents.
 * ------------------------------------------------------------------------- */

const clip = (text: string) =>
  text.length > MAX_DOCUMENT_CHARS ? `${text.slice(0, MAX_DOCUMENT_CHARS)}\n[…the rest was cut for length]` : text

/**
 * Fetch an untrusted URL, refusing any hop — including a redirect — to a host
 * `isFetchableUrl` would not allow. Following redirects blindly would let a
 * public link bounce the server into a private address.
 */
export async function fetchPublic(url: string, init: RequestInit = {}): Promise<Response | null> {
  let current = url
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isFetchableUrl(current)) return null
    const response = await fetch(current, {
      ...init,
      redirect: 'manual',
      signal: AbortSignal.timeout(DOCUMENT_TIMEOUT_MS),
      headers: { 'user-agent': 'GoInvo-Marqueta/1.0 (+https://www.goinvo.com)', ...(init.headers || {}) },
    })
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location')
      if (!next) return null
      current = new URL(next, current).toString()
      continue
    }
    return response
  }
  return null
}

/** Turn a fetched body into a document, or say why it is not one. */
async function documentFromResponse(
  response: Response,
  input: { id: string; name: string; sourceUrl?: string; expectHtml: boolean },
): Promise<SuggestionDocument | DocumentProblem> {
  const type = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  const length = Number(response.headers.get('content-length') || 0)

  if (type === 'application/pdf' || isPdfDocument(type, input.name)) {
    if (length > MAX_PDF_BYTES) return { name: input.name, reason: 'the PDF is over 10 MB' }
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.byteLength > MAX_PDF_BYTES) return { name: input.name, reason: 'the PDF is over 10 MB' }
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return { name: input.name, reason: 'it isn’t really a PDF' }
    return { id: input.id, name: input.name, pdfBase64: bytes.toString('base64'), sourceUrl: input.sourceUrl }
  }

  if (type === 'text/html' && !input.expectHtml) {
    // Slack answers an attachment it will not hand over with its sign-in page.
    return { name: input.name, reason: 'Slack wouldn’t hand it over — I need the files:read permission' }
  }

  if (type.startsWith('text/') || isTextDocument(type, input.name)) {
    const raw = await response.text()
    const text = type === 'text/html' ? extractReadableText(raw) : raw.replace(/\r\n/g, '\n').trim()
    if (/accounts\.google\.com/.test(response.url) || /^Sign in\b/.test(text)) {
      return { name: input.name, reason: 'it isn’t shared — set it to anyone with the link, or attach it' }
    }
    if (text.length < 40) return { name: input.name, reason: 'there was almost nothing in it to read' }
    return { id: input.id, name: input.name, text: clip(text), sourceUrl: input.sourceUrl }
  }

  return { name: input.name, reason: `I can’t read ${type || 'that kind of file'} yet — a PDF, a Google Doc or pasted text works` }
}

function nameFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'docs.google.com') return 'Google Doc'
    const last = parsed.pathname.split('/').filter(Boolean).pop()
    return last ? `${parsed.hostname}/…/${decodeURIComponent(last)}`.slice(0, 80) : parsed.hostname
  } catch {
    return 'a link'
  }
}

/**
 * Read up to `MAX_DOCUMENTS` documents, in the order given. Never throws: each
 * failure becomes a named problem.
 */
export async function readSuggestionDocuments(
  requests: DocumentRequest[],
): Promise<{ documents: SuggestionDocument[]; problems: DocumentProblem[] }> {
  const documents: SuggestionDocument[] = []
  const problems: DocumentProblem[] = []
  const taken = requests.slice(0, MAX_DOCUMENTS)
  for (const skipped of requests.slice(MAX_DOCUMENTS)) {
    problems.push({ name: requestName(skipped), reason: `I read the first ${MAX_DOCUMENTS} only` })
  }

  const results = await Promise.all(
    taken.map(async (request, index): Promise<SuggestionDocument | DocumentProblem> => {
      const id = `D${index + 1}`
      const name = requestName(request)
      try {
        if (request.kind === 'text') {
          const text = String(request.text || '').trim()
          return text ? { id, name, text: clip(text) } : { name, reason: 'it was empty' }
        }
        if (request.kind === 'pdf') {
          const bytes = Buffer.from(String(request.base64 || ''), 'base64')
          if (!bytes.byteLength) return { name, reason: 'it was empty' }
          if (bytes.byteLength > MAX_PDF_BYTES) return { name, reason: 'the PDF is over 10 MB' }
          return { id, name, pdfBase64: bytes.toString('base64') }
        }
        if (request.kind === 'slackFile') {
          if (request.size && request.size > MAX_PDF_BYTES) return { name, reason: 'it is over 10 MB' }
          if (!isPdfDocument(request.mimetype, request.name) && !isTextDocument(request.mimetype, request.name)) {
            return { name, reason: `I can’t read ${request.mimetype || 'that kind of file'} yet — a PDF, a Google Doc or pasted text works` }
          }
          const { botToken } = getSlackConfig()
          if (!botToken || !/^https:\/\/files\.slack\.com\//.test(request.url)) return { name, reason: 'Slack didn’t give me a way to open it' }
          const response = await fetch(request.url, {
            headers: { authorization: `Bearer ${botToken}` },
            signal: AbortSignal.timeout(DOCUMENT_TIMEOUT_MS),
          })
          if (!response.ok) return { name, reason: 'Slack wouldn’t hand it over — I need the files:read permission' }
          return documentFromResponse(response, { id, name, expectHtml: /\.html?$/i.test(request.name) })
        }
        const target = readableDocumentUrl(request.url)
        const response = await fetchPublic(target)
        if (!response) return { name, reason: 'I can only open public web links' }
        if (!response.ok) {
          return {
            name,
            reason: response.status === 401 || response.status === 403 ? 'it isn’t public' : `the page answered ${response.status}`,
          }
        }
        return documentFromResponse(response, { id, name, sourceUrl: request.url, expectHtml: true })
      } catch (error) {
        const timedOut = error instanceof Error && /timeout|abort/i.test(error.name)
        return { name, reason: timedOut ? 'it took too long to load' : 'it wouldn’t load' }
      }
    }),
  )

  for (const result of results) {
    if ('id' in result) documents.push(result)
    else problems.push(result)
  }
  return { documents, problems }
}

function requestName(request: DocumentRequest): string {
  if (request.kind === 'url') return nameFromUrl(request.url)
  return String(request.name || 'a document').slice(0, 80)
}

/* ---------------------------------------------------------------------------
 * The grounding.
 * ------------------------------------------------------------------------- */

const WORK_QUERY = `{
  "caseStudies": *[_type == "caseStudy" && !hidden && title != "Untitled" && !(slug.current match "untitled-*")]
    | order(orderRank asc)[0...30]{ title, "slug": slug.current, "summary": coalesce(metaDescription, heading, description) },
  "features": *[_type == "feature" && title != "Untitled" && !(slug.current match "untitled-*")]
    | order(coalesce(date, _updatedAt) desc)[0...30]{ title, "slug": slug.current, "summary": description }
}`

type Row = { title?: string; slug?: string; summary?: string }

/** Everything we made that a suggestion may stand on, numbered W1… for the model. */
export async function fetchOurWork(): Promise<WorkItem[]> {
  const [site, proofs] = await Promise.all([
    client.fetch<{ caseStudies?: Row[]; features?: Row[] }>(WORK_QUERY).catch(() => ({}) as { caseStudies?: Row[]; features?: Row[] }),
    getMarketingWriteClientFor('marketingProofPoint')
      .fetch<{ title?: string; claim?: string; sourceUrl?: string }[]>(
        `*[_type == "marketingProofPoint" && defined(title)] | order(_updatedAt desc)[0...20]{ title, claim, sourceUrl }`,
      )
      .catch(() => []),
  ])
  const page = (rows: Row[] | undefined, prefix: string, kind: WorkItem['kind']) =>
    (rows || [])
      .filter((row) => row.title && row.slug)
      .map((row) => ({
        title: String(row.title),
        url: `${SITE_BASE}${prefix}/${row.slug}`,
        kind,
        summary: row.summary ? String(row.summary).slice(0, 240) : undefined,
      }))
  return numberWork([
    ...page(site.caseStudies, '/work', 'case study'),
    ...page(site.features, '/vision', 'essay'),
    ...(proofs || [])
      .filter((proof) => proof.title)
      .map((proof) => ({
        title: String(proof.title),
        url: proof.sourceUrl && /^https?:\/\//.test(proof.sourceUrl) ? proof.sourceUrl : '',
        kind: 'proof point' as const,
        summary: proof.claim ? String(proof.claim).slice(0, 240) : undefined,
      })),
  ])
}

async function fetchPillars(): Promise<{ title: string; coreClaim?: string }[]> {
  try {
    const rows = await getMarketingWriteClientFor('marketingMessagePillar').fetch<{ title?: string; coreClaim?: string }[]>(
      `*[_type == "marketingMessagePillar" && defined(title)][0...8]{ title, coreClaim }`,
    )
    return rows.filter((row) => row.title).map((row) => ({ title: String(row.title), coreClaim: row.coreClaim || undefined }))
  } catch {
    return []
  }
}

/** Titles already in the pipeline, so nothing planned is suggested again. */
async function fetchAlreadyPlanned(): Promise<string[]> {
  try {
    const titles = await getMarketingWriteClientFor('marketingCalendarItem').fetch<string[]>(
      `*[_type == "marketingCalendarItem" && status in ["idea", "drafting", "review", "scheduled"] && defined(title)]
         | order(_updatedAt desc)[0...30].title`,
    )
    return (titles || []).filter(Boolean)
  } catch {
    return []
  }
}

/* ---------------------------------------------------------------------------
 * The run.
 * ------------------------------------------------------------------------- */

function timeoutFor(source: SuggestionSource): number {
  // A live search is several round trips; the rest is one call.
  return source === 'field' ? 180_000 : 75_000
}

export async function runMarquetaSuggestions(input: {
  source: SuggestionSource
  details: string
  documents?: DocumentRequest[]
  brandVoiceKey?: string
}): Promise<SuggestionResult> {
  if (!isAnthropicConfigured()) {
    return {
      ok: false,
      reason: 'not-configured',
      message: 'I can’t suggest anything right now — the AI key isn’t set.',
    }
  }

  const { documents, problems } = await readSuggestionDocuments(input.documents || [])
  const details = String(input.details || '').trim()
  if (input.source === 'custom' && !details && documents.length === 0) {
    const why = problems.length ? ` I couldn’t read ${problems.map((p) => `${p.name} (${p.reason})`).join(', ')}.` : ''
    return {
      ok: false,
      reason: 'no-brief',
      message: `What should the suggestions be for?${why}`,
      documentProblems: problems,
    }
  }

  try {
    const [work, verified, pillars, alreadyPlanned, model, resolvedVoice] = await Promise.all([
      fetchOurWork(),
      fetchVerifiedResearch(),
      fetchPillars(),
      fetchAlreadyPlanned(),
      resolveMarketingModel(client),
      resolveMarketingBrandVoice(client, input.brandVoiceKey).catch(() => null),
    ])
    if (work.length === 0) {
      return { ok: false, reason: 'failed', message: 'I couldn’t read our case studies just now, so I have nothing to stand on. Try again in a moment.' }
    }

    const research = numberResearch(buildResearchCitations(verified, { limit: 8 }))
    const brandVoice = brandVoicePromptContext(resolvedVoice)
    const webSearch = input.source === 'field'

    const result = await generateClaudeText({
      feature: 'marqueta-suggest',
      model,
      maxTokens: 3200,
      timeoutMs: timeoutFor(input.source),
      webSearch,
      system: suggestionSystem(input.source),
      pdfs: documents.filter((doc) => doc.pdfBase64).map((doc) => ({ title: `${doc.id}: ${doc.name}`, base64: doc.pdfBase64! })),
      user: buildSuggestionUserMessage({
        source: input.source,
        details,
        work,
        research,
        pillars,
        documents,
        alreadyPlanned,
        brandVoice: brandVoice
          ? { name: brandVoice.name, guidance: brandVoice.guidance, do: brandVoice.do, avoid: brandVoice.avoid, examples: brandVoice.examples }
          : null,
      }),
    })

    if (result.stopReason === 'max_tokens') {
      return { ok: false, reason: 'failed', message: 'My answer ran too long and got cut off. Try again, or narrow the brief.' }
    }

    const parsed = parseSuggestions(result.text, {
      source: input.source,
      work,
      research,
      documents,
      searchedUrls: webSearch ? result.sources.map((source) => source.url) : [],
    })
    if (!parsed) {
      return { ok: false, reason: 'failed', message: 'I came up with something but it came back unreadable. Try again?' }
    }

    return {
      ok: true,
      source: input.source,
      suggestions: parsed.suggestions,
      dropped: parsed.dropped,
      documentsRead: documents.map((doc) => doc.name),
      documentProblems: problems,
      brandVoiceName: brandVoice?.name,
      model,
    }
  } catch (error) {
    console.error('[marqueta] suggestions failed', error instanceof Error ? error.name : 'UnknownError')
    return { ok: false, reason: 'failed', message: 'Something went wrong putting suggestions together. Try again in a moment.' }
  }
}
