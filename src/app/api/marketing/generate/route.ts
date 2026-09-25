import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { isPlainRecord, MarketingRequestError, readBoundedJson } from '@/lib/marketing/apiBoundary'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import { formatCitationsForSlack } from '@/lib/marketing/marquetaCitations'
import { GENERATION_FORMATS, sanitizeTopic, type GenerationFormat } from '@/lib/marketing/marquetaGenerate'
import { runMarquetaGeneration } from '@/lib/marketing/marquetaGenerate.server'

// A grounded draft is one Claude call over the studio's research + site content
// (up to ~2200 output tokens). Like its AI siblings it declares a window so
// Vercel does not kill the function mid-stream and silently drop the result.
export const maxDuration = 120

const GENERATE_REQUEST_BYTES = 8_000

/** Which HTTP status each failure reason deserves. */
const STATUS_FOR_REASON: Record<string, number> = {
  'no-topic': 400,
  'not-configured': 503,
  failed: 502,
}

/**
 * Marqueta drafts an outline / script / social post / outreach email.
 *
 * Gated like every other AI route here (a Studio session or the MARKETING_API_KEY)
 * because each call spends Claude credits. This is the testable, headless twin of
 * the Slack `@Marqueta outline …` path — both run the same core, so what the API
 * returns is exactly what she posts.
 */
export async function POST(request: Request) {
  try {
    await assertStudioOrApiKey(request)

    const body = await readBoundedJson(request, GENERATE_REQUEST_BYTES)
    if (!isPlainRecord(body)) {
      throw new MarketingRequestError('Request must be a JSON object.', 400)
    }

    const format = body.format
    if (typeof format !== 'string' || !GENERATION_FORMATS.includes(format as GenerationFormat)) {
      throw new MarketingRequestError(`Choose a format: ${GENERATION_FORMATS.join(', ')}.`, 400)
    }

    const topic = sanitizeTopic(body.topic)
    const brandVoiceKey =
      typeof body.brandVoiceKey === 'string' && /^[A-Za-z0-9_-]{1,96}$/.test(body.brandVoiceKey)
        ? body.brandVoiceKey
        : undefined

    const result = await runMarquetaGeneration({
      format: format as GenerationFormat,
      topic,
      brandVoiceKey,
    })

    if (!result.ok) {
      return privateMarketingJson(
        { error: result.message, reason: result.reason },
        { status: STATUS_FOR_REASON[result.reason] || 400 },
      )
    }

    return privateMarketingJson({
      usedAi: true,
      model: result.model,
      brandVoice: result.brandVoiceName || null,
      generated: result.generated,
      citations: result.citations.map((citation) => ({
        organization: citation.organization,
        signal: citation.signal,
        quote: citation.quote,
        sourceUrl: citation.sourceUrl,
        verified: citation.verified,
      })),
      citationsMarkdown: formatCitationsForSlack(result.citations),
    })
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return privateMarketingJson({ error: error.message }, { status: error.status || 401 })
    }
    if (error instanceof MarketingRequestError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    console.error('Marqueta generation route failed.', error instanceof Error ? error.name : 'UnknownError')
    return privateMarketingJson({ error: 'Generation failed.' }, { status: 500 })
  }
}
