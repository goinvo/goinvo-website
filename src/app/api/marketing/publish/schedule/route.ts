import { NextResponse } from 'next/server'
import {
  assertMarketingApiKey,
  getMarketingWriteClient,
  isQStashConfigured,
  MarketingAuthError,
  resolveSocialPlatform,
  runPublish,
  schedulePublish,
} from '@/lib/marketing'

// POST /api/marketing/publish/schedule — enqueue an exact-time QStash callback
// for one calendar item (or publish immediately if it is already due).
//
// Designed to be called by a Sanity webhook on marketingCalendarItem
// create/update (recommended — zero Studio code), or manually / from a Studio
// action. Key-gated (MARKETING_API_KEY). ?dryRun=1 previews without enqueueing.
//
// Accepts the id from ?id=, body.id/_id/documentId, so a Sanity webhook posting
// the document (its _id) works as-is.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScheduleSource {
  _id?: string
  status?: string
  autoPublish?: boolean
  publishAt?: string
  channelKey?: string | null
}

const SOURCE_QUERY = `*[_type == "marketingCalendarItem" && _id == $id][0]{
  _id,
  status,
  autoPublish,
  publishAt,
  "channelKey": coalesce(channelRef->key, channel)
}`

function readId(body: unknown, url: URL): string | undefined {
  const fromQuery = url.searchParams.get('id')
  if (fromQuery && fromQuery.trim()) return fromQuery.trim()
  const record = (body ?? {}) as Record<string, unknown>
  for (const key of ['id', '_id', 'documentId']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

export async function POST(req: Request) {
  try {
    assertMarketingApiKey(req)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true'

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = undefined
  }
  const id = readId(body, url)
  if (!id) {
    return NextResponse.json(
      { error: 'Provide an item id via ?id=, body.id, or a Sanity webhook payload (_id).' },
      { status: 400 },
    )
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

  let item: ScheduleSource | null
  try {
    item = await client.fetch<ScheduleSource | null>(SOURCE_QUERY, { id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load item.' },
      { status: 500 },
    )
  }
  if (!item) {
    return NextResponse.json({ id, scheduled: false, reason: 'Item not found.' }, { status: 404 })
  }

  if (!item.autoPublish || item.status !== 'scheduled' || !item.publishAt) {
    return NextResponse.json({
      id,
      scheduled: false,
      reason: 'Not an auto-publish scheduled item (needs autoPublish, status "scheduled", and a publishAt).',
    })
  }

  const platform = resolveSocialPlatform({ channelKey: item.channelKey })
  if (!platform) {
    return NextResponse.json({
      id,
      scheduled: false,
      reason: `No social adapter for channel "${item.channelKey ?? 'unknown'}".`,
    })
  }

  const dueMs = new Date(item.publishAt).getTime()
  const nowMs = Date.now()

  // Already due (scheduled in the past, or saved right at publish time) → post now.
  if (dueMs <= nowMs) {
    if (dryRun) {
      return NextResponse.json({ id, platform, action: 'publish-now', dryRun: true })
    }
    const summary = await runPublish(client, { now: new Date().toISOString(), id, onlyIfDue: true })
    return NextResponse.json({ id, platform, action: 'publish-now', summary })
  }

  // Future → enqueue an exact-time QStash callback.
  if (dryRun) {
    // Preview works regardless of QStash config; surface that config as a field.
    return NextResponse.json({
      id,
      platform,
      action: 'schedule',
      when: item.publishAt,
      dryRun: true,
      qstashConfigured: isQStashConfigured(),
    })
  }

  if (!isQStashConfigured()) {
    return NextResponse.json(
      { id, platform, scheduled: false, reason: 'QStash not configured (set QSTASH_TOKEN).' },
      { status: 503 },
    )
  }

  const result = await schedulePublish({
    itemId: id,
    publishAtIso: item.publishAt,
    baseUrl: `${url.protocol}//${url.host}`,
    forwardApiKey: process.env.MARKETING_API_KEY || '',
  })

  if (!result.ok) {
    return NextResponse.json({ id, platform, scheduled: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json({
    id,
    platform,
    scheduled: true,
    when: item.publishAt,
    messageId: result.messageId,
    callbackUrl: result.callbackUrl,
  })
}
