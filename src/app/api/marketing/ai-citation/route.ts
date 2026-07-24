import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { runAiCitationPanel, type PanelSnapshot } from '@/lib/marketing/aiCitation'
import { resolveMarketingModel } from '@/lib/marketing/anthropicJson'
import { MarketingRequestError } from '@/lib/marketing/apiBoundary'
import {
  assertStudioOrApiKey,
  assertStudioWriterOrApiKey,
  MarketingAuthError,
} from '@/lib/marketing/auth'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'
import {
  createMarketingRequestDeduper,
  marketingRequestFingerprint,
  readMarketingIdempotencyKey,
} from '@/lib/marketing/requestDedupe'

// AI-citation share-of-voice tracker route (marketingIdea seo-ai-citation-tracking).
//
//   POST → run the fixed prompt panel through Claude web_search,
//          stamp runDate, store an `aiCitationSnapshot`, and return it.
//   GET  → return the most recent snapshots (last 10, newest first) for the
//          trend chart.
//
// Mirrors the marketing-suite conventions: the Sanity WRITE client is created
// from src/sanity/env (research/run + citation-check pattern), and everything
// degrades gracefully — runAiCitationPanel never throws, so a missing
// ANTHROPIC_API_KEY yields a clearly-unavailable (but still storable) snapshot.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const runDedupedCitationPanel = createMarketingRequestDeduper<Record<string, unknown>>()

let sanityClient: SanityClient | null = null
function getSanityClient(): SanityClient | null {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  }
  return sanityClient
}

// GROQ projection for the trend read — keep the heavy per-prompt answerText out
// of the list payload; the aggregate + flags are what the trend needs.
const SNAPSHOT_LIST_QUERY = `*[_type == "aiCitationSnapshot"]|order(runDate desc)[0...$limit]{
  _id,
  runDate,
  model,
  promptCount,
  answeredCount,
  mentionRate,
  citationRate,
  mentionedCount,
  citedCount,
  unavailable,
  "topCompetitors": topCompetitors[0...15],
  "results": results[0...12]{
    prompt,
    goinvoMentioned,
    goinvoCited,
    "citedGoinvoUrls": citedGoinvoUrls[0...8],
    "competitorsMentioned": competitorsMentioned[0...12]
  }
}`

function textValue(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max)
  return text || undefined
}

function numberValue(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : undefined
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function boundedSnapshots(value: unknown, limit: number) {
  if (!Array.isArray(value)) return []
  return value.slice(0, limit).flatMap((item) => {
    const snapshot = recordValue(item)
    if (!snapshot) return []
    const topCompetitors = Array.isArray(snapshot.topCompetitors)
      ? snapshot.topCompetitors.slice(0, 15).flatMap((item) => {
          const competitor = recordValue(item)
          const name = textValue(competitor?.name, 160)
          if (!name) return []
          return [{ name, count: numberValue(competitor?.count, 0, 1_000) ?? 0 }]
        })
      : []
    const results = Array.isArray(snapshot.results)
      ? snapshot.results.slice(0, 12).flatMap((item) => {
          const result = recordValue(item)
          const prompt = textValue(result?.prompt, 500)
          if (!prompt) return []
          const citedGoinvoUrls = Array.isArray(result?.citedGoinvoUrls)
            ? result.citedGoinvoUrls
                .slice(0, 8)
                .map((url) => textValue(url, 512))
                .filter((url): url is string => Boolean(url))
            : []
          const competitorsMentioned = Array.isArray(result?.competitorsMentioned)
            ? result.competitorsMentioned
                .slice(0, 12)
                .map((name) => textValue(name, 160))
                .filter((name): name is string => Boolean(name))
            : []
          return [{
            prompt,
            goinvoMentioned: result?.goinvoMentioned === true,
            goinvoCited: result?.goinvoCited === true,
            citedGoinvoUrls,
            competitorsMentioned,
          }]
        })
      : []
    return [{
      _id: textValue(snapshot._id, 128),
      runDate: textValue(snapshot.runDate, 40),
      model: textValue(snapshot.model, 128),
      promptCount: numberValue(snapshot.promptCount, 0, 50) ?? 0,
      answeredCount: numberValue(snapshot.answeredCount, 0, 50) ?? 0,
      mentionRate: numberValue(snapshot.mentionRate, 0, 1) ?? 0,
      citationRate: numberValue(snapshot.citationRate, 0, 1) ?? 0,
      mentionedCount: numberValue(snapshot.mentionedCount, 0, 50) ?? 0,
      citedCount: numberValue(snapshot.citedCount, 0, 50) ?? 0,
      unavailable: snapshot.unavailable === true,
      topCompetitors,
      results,
    }]
  })
}

function assertNoControls(request: Request) {
  const url = new URL(request.url)
  if ([...url.searchParams.keys()].length > 0) {
    throw new MarketingRequestError('AI citation runs do not accept query parameters.', 400)
  }
  if (request.body !== null) {
    throw new MarketingRequestError('AI citation runs do not accept a request body.', 400)
  }
}

function snapshotLimit(request: Request): number {
  const url = new URL(request.url)
  const keys = [...url.searchParams.keys()]
  if (keys.some((key) => key !== 'limit') || url.searchParams.getAll('limit').length > 1) {
    throw new MarketingRequestError('Unknown or repeated AI citation query parameter.', 400)
  }
  const raw = url.searchParams.get('limit')
  if (raw === null) return 10
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new MarketingRequestError('AI citation limit must be an integer from 1 to 50.', 400)
  }
  const limit = Number(raw)
  if (!Number.isSafeInteger(limit) || limit > 50) {
    throw new MarketingRequestError('AI citation limit must be an integer from 1 to 50.', 400)
  }
  return limit
}

export async function POST(req: Request) {
  try {
    await assertStudioWriterOrApiKey(req)
    assertNoControls(req)
    const payload = await runDedupedCitationPanel(
      marketingRequestFingerprint({ operation: 'run-ai-citation-panel' }),
      readMarketingIdempotencyKey(req),
      async () => {
        const sanity = getSanityClient()
        const model = sanity ? await resolveMarketingModel(sanity) : undefined

        let snapshot: PanelSnapshot
        try {
          snapshot = await runAiCitationPanel(undefined, { model })
        } catch {
          throw new MarketingRequestError('AI citation panel could not complete.', 502)
        }

        // The route owns the clock (the lib stays deterministic).
        const runDate = new Date().toISOString()
        const stamped: PanelSnapshot = { ...snapshot, runDate }
        const doc = {
          _type: 'aiCitationSnapshot' as const,
          runDate,
          model: stamped.model,
          promptCount: stamped.promptCount,
          answeredCount: stamped.answeredCount,
          unavailable: stamped.unavailable ?? false,
          mentionRate: stamped.aggregate.mentionRate,
          citationRate: stamped.aggregate.citationRate,
          mentionedCount: stamped.aggregate.mentionedCount,
          citedCount: stamped.aggregate.citedCount,
          topCompetitors: stamped.aggregate.topCompetitors.map((c) => ({
            _type: 'competitorTally' as const,
            name: c.name,
            count: c.count,
          })),
          results: stamped.results.map((r) => ({
            _type: 'aiCitationPromptResult' as const,
            prompt: r.prompt,
            goinvoMentioned: r.goinvoMentioned,
            goinvoCited: r.goinvoCited,
            citedGoinvoUrls: r.citedGoinvoUrls,
            competitorsMentioned: r.competitorsMentioned,
            answerText: r.answerText,
            ...(r.error ? { error: r.error } : {}),
          })),
        }

        let storedId: string | null = null
        let storeWarning: string | undefined
        if (sanity) {
          try {
            const created = await sanity.create(doc)
            storedId = textValue(created?._id, 128) || null
          } catch {
            storeWarning = 'The panel ran, but its snapshot could not be stored.'
          }
        } else {
          storeWarning = 'Snapshot storage is unavailable.'
        }

        return {
          stored: Boolean(storedId),
          storedId,
          snapshot: stamped,
          ...(storeWarning ? { storeWarning } : {}),
        }
      },
    )
    return privateMarketingJson(payload)
  } catch (error) {
    if (error instanceof MarketingAuthError || error instanceof MarketingRequestError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    console.error('AI citation panel route failed.', error instanceof Error ? error.name : 'UnknownError')
    return privateMarketingJson({ error: 'AI citation panel could not complete.' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    await assertStudioOrApiKey(request)
    const limit = snapshotLimit(request)
    const sanity = getSanityClient()
    if (!sanity) {
      return privateMarketingJson(
        { error: 'AI citation snapshot storage is unavailable.', snapshots: [] },
        { status: 503 },
      )
    }

    const snapshots = await sanity.fetch(SNAPSHOT_LIST_QUERY, { limit })
    return privateMarketingJson({ snapshots: boundedSnapshots(snapshots, limit) })
  } catch (error) {
    if (error instanceof MarketingAuthError || error instanceof MarketingRequestError) {
      return privateMarketingJson({ error: error.message, snapshots: [] }, { status: error.status })
    }
    console.error('AI citation snapshot fetch failed.', error instanceof Error ? error.name : 'UnknownError')
    return privateMarketingJson({ error: 'AI citation snapshots could not be loaded.', snapshots: [] }, { status: 502 })
  }
}
