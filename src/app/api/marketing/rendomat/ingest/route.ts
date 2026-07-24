import { NextResponse } from 'next/server'
import type { SanityClient } from '@sanity/client'
import { assertMarketingApiKey, getMarketingWriteClient } from '@/lib/marketing'
import { schedulePublish } from '@/lib/marketing/publishers'
import {
  buildCalendarItemFields,
  downloadRendomatAsset,
  getRendomatExport,
  isRendomatConfigured,
  listCompletedVideos,
  rendomatCalendarItemId,
  type RendomatVideo,
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

const INGEST_ITEM_QUERY = `*[
  _type == "marketingCalendarItem" && (_id == $itemId || rendomatVideoId == $rid)
][0]{
  _id,
  _rev,
  title,
  status,
  publishAt,
  rendomatVideoId,
  rendomatIngestState,
  rendomatIngestClaim,
  rendomatIngestClaimedAt,
  rendomatScheduledAt,
  "assetId": socialVideo.asset._ref
}`

const CLAIM_TTL_MS = 10 * 60 * 1000

type RendomatIngestItem = {
  _id: string
  _rev: string
  title?: string
  status?: string
  publishAt?: string
  rendomatVideoId?: string
  rendomatIngestState?: 'ingesting' | 'scheduling' | 'scheduleFailed' | 'scheduled' | 'failed'
  rendomatIngestClaim?: string
  rendomatIngestClaimedAt?: string
  rendomatScheduledAt?: string
  assetId?: string
}

type AcquiredItem =
  | { action: 'ingest'; item: RendomatIngestItem; claim: string }
  | { action: 'schedule'; item: RendomatIngestItem; claim: string }
  | { action: 'complete'; item: RendomatIngestItem }
  | { action: 'busy'; item: RendomatIngestItem }

function claimToken(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isRevisionConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { statusCode?: unknown; status?: unknown; response?: { statusCode?: unknown } }
  return candidate.statusCode === 409 || candidate.status === 409 || candidate.response?.statusCode === 409
}

async function fetchIngestItem(
  client: SanityClient,
  videoId: number,
): Promise<RendomatIngestItem | null> {
  return client.fetch<RendomatIngestItem | null>(INGEST_ITEM_QUERY, {
    itemId: rendomatCalendarItemId(videoId),
    rid: String(videoId),
  })
}

async function acquireIngestItem(
  client: SanityClient,
  video: RendomatVideo,
  now: Date,
): Promise<AcquiredItem> {
  const token = claimToken()
  let item = await fetchIngestItem(client, video.id)
  if (!item) {
    const candidate = await client.createIfNotExists({
      _id: rendomatCalendarItemId(video.id),
      _type: 'marketingCalendarItem',
      title: video.title || `Rendomat render ${video.id}`,
      status: 'drafting',
      autoPublish: false,
      channel: 'instagram',
      contentType: 'reel',
      publishAt: video.publish_at,
      rendomatVideoId: String(video.id),
      rendomatIngestState: 'ingesting',
      rendomatIngestClaim: token,
      rendomatIngestClaimedAt: now.toISOString(),
    }) as RendomatIngestItem
    if (candidate.rendomatIngestClaim === token) return { action: 'ingest', item: candidate, claim: token }
    // `createIfNotExists` returns the winner's stored document, but computed
    // projection aliases such as assetId are only available through the query.
    item = await fetchIngestItem(client, video.id) || candidate
  }

  if (item.rendomatIngestState === 'scheduled' && item.rendomatScheduledAt) {
    return { action: 'complete', item }
  }

  const claimedAt = Date.parse(item.rendomatIngestClaimedAt || '')
  const activeClaim =
    (item.rendomatIngestState === 'ingesting' || item.rendomatIngestState === 'scheduling') &&
    Number.isFinite(claimedAt) &&
    now.getTime() - claimedAt < CLAIM_TTL_MS
  if (activeClaim) return { action: 'busy', item }

  const action = item.assetId ? 'schedule' : 'ingest'
  try {
    const claimed = await client
      .patch(item._id)
      .ifRevisionId(item._rev)
      .set({
        rendomatIngestState: action === 'schedule' ? 'scheduling' : 'ingesting',
        rendomatIngestClaim: token,
        rendomatIngestClaimedAt: now.toISOString(),
        rendomatScheduleError: '',
      })
      .commit() as RendomatIngestItem
    return { action, item: claimed, claim: token }
  } catch (error) {
    if (!isRevisionConflict(error)) throw error
    const winner = await fetchIngestItem(client, video.id)
    if (!winner) throw error
    return winner.rendomatIngestState === 'scheduled' && winner.rendomatScheduledAt
      ? { action: 'complete', item: winner }
      : { action: 'busy', item: winner }
  }
}

async function releaseFailedClaim(
  client: SanityClient,
  videoId: number,
  token: string,
  message: string,
): Promise<void> {
  const latest = await fetchIngestItem(client, videoId)
  if (!latest || latest.rendomatIngestClaim !== token) return
  await client
    .patch(latest._id)
    .ifRevisionId(latest._rev)
    .set({
      rendomatIngestState: latest.assetId ? 'scheduleFailed' : 'failed',
      rendomatIngestClaim: '',
      rendomatIngestClaimedAt: '',
      rendomatScheduleError: message.slice(0, 2000),
    })
    .commit()
}

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

    if (dryRun) {
      const existing = await fetchIngestItem(client, video.id)
      if (existing?.rendomatIngestState === 'scheduled' && existing.rendomatScheduledAt) {
        results.push({
          rendomatVideoId: video.id,
          action: 'skipped',
          reason: 'Already ingested and scheduled.',
          itemId: existing._id,
        })
        continue
      }
      results.push({
        rendomatVideoId: video.id,
        action: 'would-ingest',
        title: video.title,
        publishAt: video.publish_at,
      })
      continue
    }

    let acquired: AcquiredItem
    try {
      acquired = await acquireIngestItem(client, video, now)
    } catch (error) {
      results.push({
        rendomatVideoId: video.id,
        action: 'error',
        reason: error instanceof Error ? error.message : 'Failed to claim Rendomat item.',
      })
      continue
    }
    if (acquired.action === 'complete') {
      results.push({
        rendomatVideoId: video.id,
        action: 'skipped',
        reason: 'Already ingested and scheduled.',
        itemId: acquired.item._id,
        scheduled: true,
      })
      continue
    }
    if (acquired.action === 'busy') {
      results.push({
        rendomatVideoId: video.id,
        action: 'skipped',
        reason: 'Another ingest request currently owns this video.',
        itemId: acquired.item._id,
      })
      continue
    }

    const acquiredClaim = acquired.claim
    let item = acquired.item
    let asset: { _id: string } | null = null
    let assetAttached = Boolean(item.assetId)
    try {
      if (acquired.action === 'ingest') {
        const manifest = await getRendomatExport(video.id)
        const videoUrl = manifest.assets?.video
        if (!videoUrl) throw new Error('Export has no video asset.')

        // Only the atomic-claim owner downloads/uploads the video. Concurrent
        // losers cannot create duplicate, orphaned assets.
        const { buffer, contentType } = await downloadRendomatAsset(videoUrl)
        asset = await client.assets.upload('file', Buffer.from(new Uint8Array(buffer)), {
          filename: `rendomat-${video.id}.mp4`,
          contentType: contentType || 'video/mp4',
        })

        item = await client
          .patch(item._id)
          .ifRevisionId(item._rev)
          .set({
            ...buildCalendarItemFields(video),
            socialVideo: { _type: 'file', asset: { _type: 'reference', _ref: asset._id } },
            rendomatIngestState: 'scheduling',
            rendomatIngestClaim: acquiredClaim,
            rendomatIngestClaimedAt: now.toISOString(),
            rendomatScheduleError: '',
          })
          .commit() as RendomatIngestItem
        assetAttached = true
      }

      // schedulePublish itself uses a deterministic QStash deduplication id.
      // A failed enqueue remains explicitly retryable without re-uploading.
      const scheduled = await schedulePublish({
        itemId: item._id,
        publishAtIso: video.publish_at,
        baseUrl,
        forwardApiKey,
      })
      await client
        .patch(item._id)
        .ifRevisionId(item._rev)
        .set({
          rendomatIngestState: scheduled.ok ? 'scheduled' : 'scheduleFailed',
          rendomatIngestClaim: '',
          rendomatIngestClaimedAt: '',
          rendomatScheduledAt: scheduled.ok ? new Date().toISOString() : '',
          rendomatScheduleError: scheduled.ok
            ? ''
            : (scheduled.error || 'QStash enqueue failed.').slice(0, 2000),
        })
        .commit()

      results.push({
        rendomatVideoId: video.id,
        action: 'ingested',
        title: video.title,
        publishAt: video.publish_at,
        itemId: item._id,
        scheduled: scheduled.ok,
        ...(scheduled.ok ? {} : { reason: `scheduled enqueue failed: ${scheduled.error}` }),
      })
    } catch (error) {
      let reason = error instanceof Error ? error.message : 'Ingest failed.'
      if (asset?._id && !assetAttached) {
        try {
          await client.delete(asset._id)
        } catch (cleanupError) {
          reason += ` Unattached asset cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}.`
        }
      }
      try {
        await releaseFailedClaim(client, video.id, acquiredClaim, reason)
      } catch (recoveryError) {
        reason += ` Retry-state recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}.`
      }
      results.push({
        rendomatVideoId: video.id,
        action: 'error',
        reason,
        itemId: item._id,
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
