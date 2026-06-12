import { NextResponse } from 'next/server'
import { assertMarketingApiKey, getMarketingWriteClient, schedulePublish } from '@/lib/marketing'
import {
  buildCalendarItemFields,
  downloadRendomatAsset,
  getRendomatExport,
  isRendomatConfigured,
  listCompletedVideos,
} from '@/lib/marketing/rendomat'

// POST /api/marketing/rendomat/ingest — pull completed Rendomat renders that
// carry a publish_at, create scheduled auto-publishing Instagram-Reel calendar
// items (video uploaded to Sanity for a stable public URL), and enqueue their
// exact-time publish via QStash. Deduped by rendomatVideoId so re-runs are safe.
//
// Auth: cron-secret bearer OR MARKETING_API_KEY (so a QStash schedule / cron /
// manual call all work). Fail-closed: nothing ingests unless RENDOMAT_API_BASE +
// RENDOMAT_API_KEY are set. ?dryRun=1 previews without writing; ?days=N sets the
// look-ahead window (default 30).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEDUPE_QUERY = `*[_type == "marketingCalendarItem" && rendomatVideoId == $rid][0]{ _id }`

function authorize(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) return true
  try {
    assertMarketingApiKey(req)
    return true
  } catch {
    return false
  }
}

type IngestResult = {
  rendomatVideoId: number
  action: 'ingested' | 'skipped' | 'would-ingest' | 'error'
  reason?: string
  title?: string
  publishAt?: string | null
  itemId?: string
  scheduled?: boolean
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized ingest request.' }, { status: 401 })
  }
  if (!isRendomatConfigured()) {
    return NextResponse.json(
      { error: 'Rendomat not configured (set RENDOMAT_API_BASE + RENDOMAT_API_KEY).' },
      { status: 503 },
    )
  }

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true'
  const daysRaw = Number.parseInt(url.searchParams.get('days') || '30', 10)
  const windowDays = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 365) : 30
  const limitRaw = Number.parseInt(url.searchParams.get('limit') || '50', 10)
  const limit = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50, 200)

  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000
  // Only a small "slightly past" buffer so an item scheduled a few minutes ago
  // still ingests (and fires immediately) without sweeping in genuinely old
  // renders that an editor never expected to publish now.
  const publishAfter = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
  const publishBefore = new Date(now.getTime() + windowDays * dayMs).toISOString()

  let videos
  try {
    videos = await listCompletedVideos({ publishAfter, publishBefore, limit })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rendomat list failed.' },
      { status: 502 },
    )
  }

  const client = getMarketingWriteClient()
  const baseUrl = `${url.protocol}//${url.host}`
  const forwardApiKey = process.env.MARKETING_API_KEY || ''
  const results: IngestResult[] = []

  for (const video of videos) {
    if (!video.publish_at || Number.isNaN(Date.parse(video.publish_at))) {
      results.push({ rendomatVideoId: video.id, action: 'skipped', reason: 'Missing or invalid publish_at.' })
      continue
    }

    const rid = String(video.id)
    const existing = (await client.fetch<{ _id: string } | null>(DEDUPE_QUERY, { rid })) ?? null
    if (existing?._id) {
      results.push({ rendomatVideoId: video.id, action: 'skipped', reason: 'Already ingested.', itemId: existing._id })
      continue
    }

    if (dryRun) {
      results.push({
        rendomatVideoId: video.id,
        action: 'would-ingest',
        title: video.title,
        publishAt: video.publish_at,
      })
      continue
    }

    try {
      const manifest = await getRendomatExport(video.id)
      const videoUrl = manifest.assets?.video
      if (!videoUrl) {
        results.push({ rendomatVideoId: video.id, action: 'skipped', reason: 'Export has no video asset.' })
        continue
      }

      // Download from Rendomat → re-upload to Sanity for a stable public URL that
      // Instagram can fetch (independent of Rendomat uptime at publish time).
      const { buffer, contentType } = await downloadRendomatAsset(videoUrl)
      const asset = await client.assets.upload('file', Buffer.from(new Uint8Array(buffer)), {
        filename: `rendomat-${video.id}.mp4`,
        contentType: contentType || 'video/mp4',
      })

      const created = await client.create({
        _type: 'marketingCalendarItem',
        ...buildCalendarItemFields(video),
        socialVideo: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
      })

      // Enqueue the exact-time publish (best-effort; a Sanity webhook on the new
      // item would also schedule it).
      const scheduled = await schedulePublish({
        itemId: created._id,
        publishAtIso: video.publish_at,
        baseUrl,
        forwardApiKey,
      })

      results.push({
        rendomatVideoId: video.id,
        action: 'ingested',
        title: video.title,
        publishAt: video.publish_at,
        itemId: created._id,
        scheduled: scheduled.ok,
        ...(scheduled.ok ? {} : { reason: `scheduled enqueue failed: ${scheduled.error}` }),
      })
    } catch (error) {
      results.push({
        rendomatVideoId: video.id,
        action: 'error',
        reason: error instanceof Error ? error.message : 'Ingest failed.',
      })
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    dryRun,
    window: { publishAfter, publishBefore },
    considered: videos.length,
    ingested: results.filter((r) => r.action === 'ingested').length,
    skipped: results.filter((r) => r.action === 'skipped').length,
    errors: results.filter((r) => r.action === 'error').length,
    results,
  })
}
