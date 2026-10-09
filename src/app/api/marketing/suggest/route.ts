import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { isPlainRecord, MarketingRequestError, readBoundedJson } from '@/lib/marketing/apiBoundary'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { sanitizeTopic } from '@/lib/marketing/marquetaGenerate'
import { MAX_DOCUMENTS, SUGGESTION_SOURCES, type SuggestionSource } from '@/lib/marketing/marquetaSuggest'
import { runMarquetaSuggestions, type DocumentRequest } from '@/lib/marketing/marquetaSuggest.server'

// A field run is a live web search plus a long structured answer; the others
// are one call. Declared so Vercel does not cut a slow run off mid-stream.
export const maxDuration = 300

/**
 * Under Vercel's 4.5 MB request-body cap, so an oversized upload gets our 413
 * rather than the platform's. Base64 inflates a PDF by about a third, so a
 * bigger document should be sent as a `url` instead.
 */
const SUGGEST_REQUEST_BYTES = 4 * 1024 * 1024

const STATUS_FOR_REASON: Record<string, number> = {
  'no-brief': 400,
  'not-configured': 503,
  failed: 502,
}

/** Documents from the body: `{ name, text }`, `{ name, pdfBase64 }`, or `{ url }`. */
function readDocuments(value: unknown): DocumentRequest[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new MarketingRequestError('`documents` must be an array.', 400)
  if (value.length > MAX_DOCUMENTS) throw new MarketingRequestError(`Send at most ${MAX_DOCUMENTS} documents.`, 400)
  return value.map((entry, index) => {
    if (!isPlainRecord(entry)) throw new MarketingRequestError(`documents[${index}] must be an object.`, 400)
    const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim().slice(0, 80) : `Document ${index + 1}`
    if (typeof entry.text === 'string') return { kind: 'text' as const, name, text: entry.text }
    if (typeof entry.pdfBase64 === 'string') return { kind: 'pdf' as const, name, base64: entry.pdfBase64 }
    if (typeof entry.url === 'string') return { kind: 'url' as const, url: entry.url }
    throw new MarketingRequestError(`documents[${index}] needs text, pdfBase64 or url.`, 400)
  })
}

/**
 * Marqueta suggests marketing material — from our work, from the field, or
 * from a brief with optional documents.
 *
 * The headless twin of `Marqueta, suggest …` in Slack: the same core, so what
 * this returns is exactly what she would post. Gated like every AI route here
 * (a Studio session or MARKETING_API_KEY) because each call spends credits.
 */
export async function POST(request: Request) {
  try {
    await assertStudioOrApiKey(request)

    const body = await readBoundedJson(request, SUGGEST_REQUEST_BYTES)
    if (!isPlainRecord(body)) throw new MarketingRequestError('Request must be a JSON object.', 400)

    const source = body.source
    if (typeof source !== 'string' || !SUGGESTION_SOURCES.includes(source as SuggestionSource)) {
      throw new MarketingRequestError(`Choose a source: ${SUGGESTION_SOURCES.join(', ')}.`, 400)
    }
    const brandVoiceKey =
      typeof body.brandVoiceKey === 'string' && /^[A-Za-z0-9_-]{1,96}$/.test(body.brandVoiceKey)
        ? body.brandVoiceKey
        : undefined

    const result = await runMarquetaSuggestions({
      source: source as SuggestionSource,
      details: sanitizeTopic(body.details),
      documents: readDocuments(body.documents),
      brandVoiceKey,
    })

    if (!result.ok) {
      return privateMarketingJson(
        { error: result.message, reason: result.reason, documentProblems: result.documentProblems || [] },
        { status: STATUS_FOR_REASON[result.reason] || 400 },
      )
    }

    return privateMarketingJson({
      usedAi: true,
      model: result.model,
      source: result.source,
      brandVoice: result.brandVoiceName || null,
      suggestions: result.suggestions.map((suggestion) => ({
        title: suggestion.title,
        format: suggestion.format,
        angle: suggestion.angle,
        whyUs: suggestion.whyUs,
        whyNow: suggestion.whyNow || null,
        work: suggestion.work.map((item) => ({ title: item.title, url: item.url, kind: item.kind })),
        research: suggestion.research.map((citation) => ({
          organization: citation.organization,
          quote: citation.quote,
          sourceUrl: citation.sourceUrl,
        })),
        documents: suggestion.documents.map((doc) => doc.name),
        sources: suggestion.sources,
      })),
      dropped: result.dropped,
      documentsRead: result.documentsRead,
      documentProblems: result.documentProblems,
    })
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status || 401 })
    }
    if (error instanceof MarketingRequestError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    console.error('Marqueta suggestions route failed.', error instanceof Error ? error.name : 'UnknownError')
    return privateMarketingJson({ error: 'Suggestions failed.' }, { status: 500 })
  }
}
