import { createClient, type SanityClient } from '@sanity/client'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { generateClaudeText, isAnthropicConfigured, marketingClaudeModel, parseJsonObject, resolveMarketingModel } from '@/lib/marketing/anthropicJson'

// Citation / fact-check route for the marketing software. Given a page URL (or
// raw text), it extracts the page's factual + statistical claims and flags any
// that look inaccurate or that need a citation. Results are cached in Sanity
// keyed by a hash of the page content, so re-checking an unchanged page returns
// instantly and spends zero AI tokens (pass { refresh: true } to force a re-run).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const CITATION_CHECK_LIMITS = {
  bodyBytes: 128 * 1024,
  pageUrlCharacters: 2048,
  textCharacters: 64_000,
  fetchedPageBytes: 1024 * 1024,
  fetchTimeoutMs: 10_000,
  modelTimeoutMs: 60_000,
  modelTextCharacters: 14_000,
  claims: 25,
  summaryCharacters: 4000,
  claimCharacters: 1000,
  noteCharacters: 2000,
} as const

type Claim = {
  claim: string
  verdict: 'supported' | 'needsCitation' | 'questionable' | 'unverifiable' | string
  confidence: number
  note: string
  hasOnPageCitation: boolean
}
type CitationReport = { summary: string; claims: Claim[] }

type CitationCheckResult = {
  _type: 'marketingCitationCheck'
  pageUrl: string
  contentHash: string
  checkedAt: string
  summary: string
  claims: Claim[]
  model: string
}

class CitationCheckRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

let sanityClient: SanityClient | null = null
const inFlightChecks = new Map<string, Promise<CitationCheckResult>>()
function getSanityClient(): SanityClient | null {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  }
  return sanityClient
}

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|li|h[1-6]|section|article|div|blockquote)>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function citationJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set('Cache-Control', 'private, no-store')
  return NextResponse.json(body, { ...init, headers })
}

async function readBoundedRequestBody(request: Request): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > CITATION_CHECK_LIMITS.bodyBytes) {
    throw new CitationCheckRequestError('Citation-check request is too large.', 413)
  }
  if (!request.body) throw new CitationCheckRequestError('Invalid JSON body.', 400)

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let rawBody = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > CITATION_CHECK_LIMITS.bodyBytes) {
        await reader.cancel().catch(() => {})
        throw new CitationCheckRequestError('Citation-check request is too large.', 413)
      }
      rawBody += decoder.decode(value, { stream: true })
    }
    rawBody += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  let value: unknown
  try {
    value = JSON.parse(rawBody)
  } catch {
    throw new CitationCheckRequestError('Invalid JSON body.', 400)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CitationCheckRequestError('JSON body must be an object.', 400)
  }
  return value as Record<string, unknown>
}

function parseCitationCheckBody(body: Record<string, unknown>) {
  if (body.pageUrl !== undefined && typeof body.pageUrl !== 'string') {
    throw new CitationCheckRequestError('pageUrl must be a string.', 400)
  }
  if (body.text !== undefined && typeof body.text !== 'string') {
    throw new CitationCheckRequestError('text must be a string.', 400)
  }
  if (body.refresh !== undefined && typeof body.refresh !== 'boolean') {
    throw new CitationCheckRequestError('refresh must be a boolean.', 400)
  }

  const pageUrl = (body.pageUrl || '').trim() as string
  const text = (body.text || '').trim() as string
  if (pageUrl.length > CITATION_CHECK_LIMITS.pageUrlCharacters) {
    throw new CitationCheckRequestError('pageUrl is too long.', 413)
  }
  if (text.length > CITATION_CHECK_LIMITS.textCharacters) {
    throw new CitationCheckRequestError('text is too long.', 413)
  }
  if (!pageUrl && !text) {
    throw new CitationCheckRequestError('Provide pageUrl or text.', 400)
  }
  if (pageUrl) {
    let parsed: URL
    try {
      parsed = new URL(pageUrl)
    } catch {
      throw new CitationCheckRequestError('pageUrl must be a valid HTTP or HTTPS URL.', 400)
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new CitationCheckRequestError('pageUrl must be a valid HTTP or HTTPS URL.', 400)
    }
  }

  return { pageUrl, text, refresh: body.refresh === true }
}

async function fetchBoundedPageText(pageUrl: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CITATION_CHECK_LIMITS.fetchTimeoutMs)
  try {
    const response = await fetch(pageUrl, {
      headers: { 'User-Agent': 'GoInvo marketing citation-check (+https://www.goinvo.com)' },
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new CitationCheckRequestError(`Could not fetch ${pageUrl} (${response.status}).`, 502)
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    if (contentType && !['text/html', 'text/plain', 'application/xhtml+xml'].some((type) => contentType.startsWith(type))) {
      throw new CitationCheckRequestError(`Could not read ${pageUrl}: unsupported content type.`, 502)
    }
    const contentLength = Number(response.headers.get('content-length') || '0')
    if (Number.isFinite(contentLength) && contentLength > CITATION_CHECK_LIMITS.fetchedPageBytes) {
      throw new CitationCheckRequestError(`Could not read ${pageUrl}: page is too large.`, 502)
    }
    if (!response.body) return ''

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytes = 0
    let html = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > CITATION_CHECK_LIMITS.fetchedPageBytes) {
          controller.abort()
          throw new CitationCheckRequestError(`Could not read ${pageUrl}: page is too large.`, 502)
        }
        html += decoder.decode(value, { stream: true })
      }
      html += decoder.decode()
      return htmlToText(html)
    } finally {
      await reader.cancel().catch(() => {})
    }
  } catch (error) {
    if (error instanceof CitationCheckRequestError) throw error
    if (controller.signal.aborted) {
      throw new CitationCheckRequestError(`Could not fetch ${pageUrl}: request timed out.`, 504)
    }
    throw new CitationCheckRequestError(`Could not fetch ${pageUrl}.`, 502)
  } finally {
    clearTimeout(timeout)
  }
}


async function checkClaims(text: string, pageUrl: string, model?: string): Promise<CitationReport> {
  const system = [
    'You are a meticulous fact-checker reviewing a web page for factual accuracy and citation integrity.',
    'Extract the specific factual and statistical claims: numbers, percentages, dollar amounts, named studies or organizations, dates, and superlatives ("most", "highest", "only"). Ignore opinions, calls to action, and navigation text.',
    'For each claim set verdict to one of: "supported" (well-established consensus fact), "needsCitation" (plausible but should cite a source), "questionable" (appears inaccurate, outdated, internally inconsistent, or disputed), or "unverifiable".',
    'Set hasOnPageCitation true only if the page text shows a source, footnote, or reference supporting that specific claim.',
    'Be strict about questionable and needsCitation so a human reviews them; do not rubber-stamp.',
    'Return ONLY a JSON object: {"summary": string, "claims": [{"claim": string, "verdict": string, "confidence": number between 0 and 1, "note": string, "hasOnPageCitation": boolean}]}. Include at most 25 claims, most important first.',
  ].join('\n')

  const { text: out } = await generateClaudeText({
    system,
    user: JSON.stringify({ pageUrl, pageText: text.slice(0, CITATION_CHECK_LIMITS.modelTextCharacters) }),
    maxTokens: 2600,
    model,
    timeoutMs: CITATION_CHECK_LIMITS.modelTimeoutMs,
  })
  const parsed = parseJsonObject<CitationReport>(out)
  if (!parsed) throw new Error('Claude response did not include parseable JSON.')
  const allowedVerdicts = new Set(['supported', 'needsCitation', 'questionable', 'unverifiable'])
  const claims = Array.isArray(parsed.claims)
    ? parsed.claims
      .filter((claim): claim is Claim => Boolean(claim && typeof claim === 'object' && !Array.isArray(claim)))
      .map((claim) => {
        const verdict = typeof claim.verdict === 'string' && allowedVerdicts.has(claim.verdict)
          ? claim.verdict
          : 'unverifiable'
        const confidence = typeof claim.confidence === 'number' && Number.isFinite(claim.confidence)
          ? Math.min(1, Math.max(0, claim.confidence))
          : 0
        return {
          claim: typeof claim.claim === 'string' ? claim.claim.trim().slice(0, CITATION_CHECK_LIMITS.claimCharacters) : '',
          verdict,
          confidence,
          note: typeof claim.note === 'string' ? claim.note.trim().slice(0, CITATION_CHECK_LIMITS.noteCharacters) : '',
          hasOnPageCitation: claim.hasOnPageCitation === true,
        }
      })
      .filter((claim) => claim.claim)
      .slice(0, CITATION_CHECK_LIMITS.claims)
    : []
  return {
    summary: typeof parsed.summary === 'string'
      ? parsed.summary.trim().slice(0, CITATION_CHECK_LIMITS.summaryCharacters)
      : '',
    claims,
  }
}

function countFlagged(claims: Claim[]): number {
  return claims.filter((c) => c.verdict === 'questionable' || c.verdict === 'needsCitation').length
}

async function runCitationCheck(
  text: string,
  pageUrl: string,
  contentHash: string,
  cacheId: string,
  sanity: SanityClient | null,
): Promise<CitationCheckResult> {
  const model = sanity ? await resolveMarketingModel(sanity) : marketingClaudeModel()
  const report = await checkClaims(text, pageUrl, model)
  const result: CitationCheckResult = {
    _type: 'marketingCitationCheck',
    pageUrl,
    contentHash,
    checkedAt: new Date().toISOString(),
    summary: report.summary,
    claims: report.claims,
    model,
  }
  // Best-effort cache write so the same content is not re-checked.
  if (sanity) {
    try {
      await sanity.createOrReplace({ _id: cacheId, ...result })
    } catch (cacheError) {
      console.error('Citation check cache write failed:', cacheError)
    }
  }
  return result
}

export async function POST(request: Request) {
  try {
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return citationJson({ error: error.message }, { status: 401 })
    }
    throw error
  }

  let body: ReturnType<typeof parseCitationCheckBody>
  try {
    body = parseCitationCheckBody(await readBoundedRequestBody(request))
  } catch (error) {
    if (error instanceof CitationCheckRequestError) {
      return citationJson({ error: error.message }, { status: error.status })
    }
    throw error
  }
  const { pageUrl } = body
  let { text } = body

  if (!text && pageUrl) {
    try {
      text = await fetchBoundedPageText(pageUrl)
    } catch (error) {
      if (error instanceof CitationCheckRequestError) {
        return citationJson({ error: error.message }, { status: error.status })
      }
      throw error
    }
  }

  const contentHash = createHash('sha256').update(`${pageUrl}\n${text}`).digest('hex').slice(0, 40)
  const cacheId = `citationCheck.${contentHash}`
  const sanity = getSanityClient()

  // Cache hit: identical page content was already checked → no tokens spent.
  if (sanity && !body.refresh) {
    const cached = await sanity
      .fetch<{ pageUrl?: string; contentHash?: string; checkedAt?: string; summary?: string; claims?: Claim[]; model?: string } | null>(
        `*[_id == $id][0]{ pageUrl, contentHash, checkedAt, summary, claims, model }`,
        { id: cacheId },
      )
      .catch(() => null)
    if (cached) {
      return citationJson({ cached: true, flagged: countFlagged(cached.claims || []), ...cached })
    }
  }

  if (!isAnthropicConfigured()) {
    return citationJson({
      cached: false,
      configured: false,
      error: 'ANTHROPIC_API_KEY is not configured, so claims could not be checked.',
      pageUrl,
      claims: [],
    })
  }

  try {
    // Two uncached requests for the same content share one Claude invocation and
    // one cache write. The entry is removed after settlement so refresh remains
    // a real refresh rather than a process-lifetime cache.
    let work = inFlightChecks.get(contentHash)
    const coalesced = Boolean(work)
    if (!work) {
      work = runCitationCheck(text, pageUrl, contentHash, cacheId, sanity)
      inFlightChecks.set(contentHash, work)
      void work.finally(() => {
        if (inFlightChecks.get(contentHash) === work) inFlightChecks.delete(contentHash)
      }).catch(() => {})
    }
    const result = await work
    return citationJson({ cached: false, coalesced, flagged: countFlagged(result.claims), ...result })
  } catch (error) {
    console.error('Marketing citation check failed:', error)
    return citationJson(
      { error: error instanceof Error ? error.message : 'Citation check failed.', pageUrl, claims: [] },
      { status: 500 },
    )
  }
}
