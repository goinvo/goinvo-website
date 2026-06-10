import { NextRequest, NextResponse } from 'next/server'
import { normalizeDrainPagePath } from '@/lib/marketing/vercelDrain'
import {
  getKvClient,
  kvCounterKey,
  kvCounterField,
  KV_FLAGS_KEY,
  ENG_SESSIONS_FIELD,
  ENG_VISIBLE_MS_FIELD,
  ENG_BOUNCES_FIELD,
} from '@/lib/marketing/drainSink'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * First-party A/B event collector. The site beacons each experiment-tagged
 * event here (via navigator.sendBeacon) because Vercel Web Analytics does not
 * forward custom events to our endpoint. We only increment per-variant counters
 * in Vercel KV — never store visitor identifiers — and the rollup cron turns
 * those counts into the readout signal.
 *
 * Always responds 204 (beacons ignore the body) and never throws, so a
 * collection hiccup can never affect the page. No-ops gracefully when KV is
 * not configured (local/dev).
 */
const noContent = () => new NextResponse(null, { status: 204 })

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> | null = null
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return noContent()
  }
  if (!body || typeof body !== 'object') return noContent()

  const flagKey = String(body.flag_key ?? body.flagKey ?? '').trim()
  const variant = String(body.variant ?? '').trim()
  const pagePath = normalizeDrainPagePath(String(body.page_path ?? body.pagePath ?? ''))
  const beaconType = String(body.type ?? '').trim()

  // First-party ENGAGEMENT beacon (time-on-page + bounce). Increments the
  // RESERVED `__eng_*` fields on the SAME per-flag hash so they can never collide
  // with event-count fields. Counts/durations only — never visitor identifiers.
  if (beaconType === 'engagement') {
    if (!flagKey || !variant) return noContent()
    const rawVisibleMs = Number(body.visibleMs)
    // Clamp/validate: ignore non-finite or negative durations.
    const visibleMs = Number.isFinite(rawVisibleMs) && rawVisibleMs > 0 ? Math.round(rawVisibleMs) : 0
    const engaged = body.engaged === true

    const kv = getKvClient()
    if (!kv) return noContent()

    try {
      const counterKey = kvCounterKey(flagKey)
      await kv.hincrby(counterKey, kvCounterField(variant, pagePath, ENG_SESSIONS_FIELD), 1)
      if (visibleMs > 0) {
        await kv.hincrby(counterKey, kvCounterField(variant, pagePath, ENG_VISIBLE_MS_FIELD), visibleMs)
      }
      await kv.hincrby(counterKey, kvCounterField(variant, pagePath, ENG_BOUNCES_FIELD), engaged ? 0 : 1)
      await kv.sadd(KV_FLAGS_KEY, flagKey)
    } catch {
      // Never surface collection errors to the page.
    }
    return noContent()
  }

  const eventName = String(body.eventName ?? body.event ?? body.name ?? '').trim()
  if (!flagKey || !variant || !eventName) return noContent()

  const kv = getKvClient()
  if (!kv) return noContent()

  try {
    await kv.hincrby(kvCounterKey(flagKey), kvCounterField(variant, pagePath, eventName), 1)
    await kv.sadd(KV_FLAGS_KEY, flagKey)
  } catch {
    // Never surface collection errors to the page.
  }
  return noContent()
}
