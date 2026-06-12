import { NextResponse } from 'next/server'
import {
  assertMarketingApiKey,
  buildClaimPatch,
  buildFailedPatch,
  buildPublishContent,
  buildPublishedPatch,
  DUE_ITEMS_QUERY,
  getMarketingWriteClient,
  getPublisher,
  resolveSocialPlatform,
  SINGLE_ITEM_QUERY,
  type PublishableItem,
} from '@/lib/marketing'

// Publish worker for the marketing calendar's social auto-publishing.
//
//   GET|POST /api/marketing/publish/run
//
// Triggered two ways, both authorized:
//   1. Vercel Cron — GET with `Authorization: Bearer ${CRON_SECRET}` (see vercel.json).
//   2. Manual / Studio — any request carrying a valid MARKETING_API_KEY.
//
// It loads due items (autoPublish + scheduled + past publishAt + not already
// claimed/published), claims each with an optimistic revision lock so overlapping
// runs can't double-post, publishes via the platform adapter, and writes the
// result back. Fail-closed: with no credentials a platform is "skipped", never
// published. Query params: ?dryRun=1 (preview, no writes), ?id=<docId> (publish
// one item now, bypassing the due filter).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ITEMS_PER_RUN = 25

type ResultEntry = {
  id: string
  title?: string | null
  platform?: string
  outcome: 'published' | 'skipped' | 'failed' | 'would-publish'
  reason?: string
  externalId?: string
  permalink?: string
}

/** Authorizes a cron call (CRON_SECRET bearer) or a keyed manual call. */
function authorize(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) {
    return true
  }
  try {
    assertMarketingApiKey(req)
    return true
  } catch {
    return false
  }
}

async function readParams(req: Request): Promise<{ id?: string; dryRun: boolean }> {
  const url = new URL(req.url)
  let id = url.searchParams.get('id') || undefined
  let dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true'

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { id?: unknown; dryRun?: unknown }
      if (typeof body?.id === 'string' && body.id.trim()) id = body.id.trim()
      if (body?.dryRun === true) dryRun = true
    } catch {
      // No / invalid body is fine for POST; fall back to query params.
    }
  }
  return { id, dryRun }
}

async function handle(req: Request): Promise<NextResponse> {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized publish request.' }, { status: 401 })
  }

  let client: ReturnType<typeof getMarketingWriteClient>
  try {
    client = getMarketingWriteClient()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sanity write client unavailable.' },
      { status: 500 },
    )
  }

  const { id, dryRun } = await readParams(req)
  const nowIso = new Date().toISOString()

  let items: PublishableItem[]
  try {
    items = id
      ? ([await client.fetch<PublishableItem | null>(SINGLE_ITEM_QUERY, { id })].filter(
          Boolean,
        ) as PublishableItem[])
      : await client.fetch<PublishableItem[]>(DUE_ITEMS_QUERY, { now: nowIso })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load calendar items.' },
      { status: 500 },
    )
  }

  const batch = items.slice(0, MAX_ITEMS_PER_RUN)
  const results: ResultEntry[] = []

  for (const item of batch) {
    const platform = resolveSocialPlatform(item)
    if (!platform) {
      results.push({
        id: item._id,
        title: item.title,
        outcome: 'skipped',
        reason: `No social adapter for channel "${item.channelKey ?? 'unknown'}".`,
      })
      continue
    }

    const publisher = getPublisher(platform)
    if (!publisher.isConnected()) {
      // Not an error: leave the item untouched so a future run picks it up once
      // credentials are set.
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'skipped',
        reason: `${platform} not connected (missing ${publisher.missingConfig().join(', ')}).`,
      })
      continue
    }

    const content = buildPublishContent(item)

    if (dryRun) {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'would-publish',
        reason: `caption ${content.text.length} chars, ${content.media.length} image(s)${
          content.link ? ', link' : ''
        }`,
      })
      continue
    }

    // Claim the item with an optimistic revision lock. If another run already
    // claimed it the revision won't match and this throws — skip it.
    try {
      const claim = buildClaimPatch(nowIso)
      await client.patch(item._id).ifRevisionId(item._rev).set(claim.set!).commit({
        autoGenerateArrayKeys: false,
      })
    } catch {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'skipped',
        reason: 'Already claimed by a concurrent run.',
      })
      continue
    }

    const outcome = await publisher.publish(content)
    const patch = outcome.ok
      ? buildPublishedPatch(outcome.result, nowIso)
      : buildFailedPatch(outcome.error, nowIso)

    try {
      const tx = client.patch(item._id)
      if (patch.set) tx.set(patch.set)
      if (patch.unset) tx.unset(patch.unset)
      await tx.commit()
    } catch (error) {
      console.error(`Publish write-back failed for ${item._id}:`, error)
    }

    if (outcome.ok) {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'published',
        externalId: outcome.result.externalId,
        permalink: outcome.result.permalink,
      })
    } else {
      results.push({
        id: item._id,
        title: item.title,
        platform,
        outcome: 'failed',
        reason: outcome.error,
      })
    }
  }

  const summary = {
    ranAt: nowIso,
    dryRun,
    considered: items.length,
    processed: results.length,
    published: results.filter((r) => r.outcome === 'published').length,
    failed: results.filter((r) => r.outcome === 'failed').length,
    skipped: results.filter((r) => r.outcome === 'skipped').length,
    results,
  }
  return NextResponse.json(summary)
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
