import { createClient, type SanityClient } from '@sanity/client'
import { NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { runAiCitationPanel, type PanelSnapshot } from '@/lib/marketing/aiCitation'
import { resolveMarketingModel } from '@/lib/marketing/anthropicJson'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'

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
  topCompetitors,
  "results": results[]{ prompt, goinvoMentioned, goinvoCited, citedGoinvoUrls, competitorsMentioned }
}`

export async function POST(req: Request) {
  try {
    await assertStudioOrApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  const sanity = getSanityClient()
  const model = sanity ? await resolveMarketingModel(sanity) : undefined

  let snapshot: PanelSnapshot
  try {
    snapshot = await runAiCitationPanel(undefined, { model })
  } catch (error) {
    // runAiCitationPanel is graceful, but never let an unexpected throw 500 the
    // route without a clear message.
    console.error('AI citation panel run failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI citation panel run failed.' },
      { status: 500 },
    )
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
  if (sanity) {
    try {
      const created = await sanity.create(doc)
      storedId = created._id
    } catch (storeError) {
      // Best-effort store: still return the snapshot so the caller sees the run.
      console.error('AI citation snapshot store failed:', storeError)
    }
  }

  return NextResponse.json({
    stored: Boolean(storedId),
    storedId,
    snapshot: stamped,
    ...(sanity ? {} : { storeWarning: 'Sanity write token is not configured, so the snapshot was not stored.' }),
  })
}

export async function GET(request: Request) {
  const sanity = getSanityClient()
  if (!sanity) {
    return NextResponse.json({ error: 'Sanity write token is not configured.', snapshots: [] }, { status: 500 })
  }

  const url = new URL(request.url)
  const parsed = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 50) : 10

  try {
    const snapshots = await sanity.fetch(SNAPSHOT_LIST_QUERY, { limit })
    return NextResponse.json({ snapshots: snapshots || [] })
  } catch (error) {
    console.error('AI citation snapshot fetch failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI citation snapshot fetch failed.', snapshots: [] },
      { status: 500 },
    )
  }
}
