import { NextRequest, NextResponse } from 'next/server'
import { normalizeDrainPagePath } from '@/lib/marketing/vercelDrain'
import {
  getKvClient,
  kvCounterKey,
  kvCounterField,
  kvSourceKey,
  kvSourceField,
  sanitizeAttributionSource,
  KV_FLAGS_KEY,
  ENG_SESSIONS_FIELD,
  ENG_VISIBLE_MS_FIELD,
  ENG_BOUNCES_FIELD,
} from '@/lib/marketing/drainSink'
import { sendGa4MpEvents } from '@/lib/marketing/ga4MeasurementProtocol'
import { isLikelyBot } from '@/lib/marketing/botFilter'

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

// Public endpoint hardening. /collect is unauthenticated by necessity (beacons
// can't carry auth), and paid traffic attracts crawlers + click-fraud. We drop
// obvious bots (UA) and rate-limit per IP so invalid hits can't inflate the A/B
// counters. Both are fail-OPEN — a limiter hiccup never blocks a real beacon.
const RL_PREFIX = 'marketing:abdrain:rl:'
const RATE_LIMIT_PER_MINUTE = 120

function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || ''
  return request.headers.get('x-real-ip')?.trim() || ''
}

async function isRateLimited(kv: ReturnType<typeof getKvClient>, ip: string): Promise<boolean> {
  if (!kv || !ip) return false
  try {
    const bucket = Math.floor(Date.now() / 60000)
    const key = `${RL_PREFIX}${ip}:${bucket}`
    const count = await kv.incr(key)
    if (count === 1) await kv.expire(key, 120)
    return count > RATE_LIMIT_PER_MINUTE
  } catch {
    return false // fail-open: never block a real beacon on a limiter error
  }
}

export async function POST(request: NextRequest) {
  // Drop obvious bots before any work (UA-based, conservative — see botFilter).
  if (isLikelyBot(request.headers.get('user-agent'))) return noContent()

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
  const experimentId = String(body.experiment_id ?? body.experimentId ?? '').trim()
  // The visitor's GA client_id (from their own _ga cookie, or the marketing
  // visitor cookie when _ga is blocked) and, when present, their GA session_id.
  // Only used to forward EVENT beacons to GA4 via the Measurement Protocol.
  const gaClientId = String(body.ga_client_id ?? body.gaClientId ?? '').trim()
  const gaSessionId = String(body.ga_session_id ?? body.gaSessionId ?? '').trim()
  // Campaign attribution (utm_*/gclid) so a conversion can be tied to the ad that
  // drove it. Written to a PARALLEL source counter below; the per-variant counters
  // are unaffected.
  const utmSource = String(body.utm_source ?? '').trim()
  const utmCampaign = String(body.utm_campaign ?? '').trim()
  const utmContent = String(body.utm_content ?? '').trim()
  const gclid = String(body.gclid ?? '').trim()

  // One KV client for the whole request + a per-IP rate limit (fail-open).
  const kv = getKvClient()
  if (await isRateLimited(kv, clientIp(request))) return noContent()

  // First-party ENGAGEMENT beacon (time-on-page + bounce). Increments the
  // RESERVED `__eng_*` fields on the SAME per-flag hash so they can never collide
  // with event-count fields. Counts/durations only — never visitor identifiers.
  if (beaconType === 'engagement') {
    if (!flagKey || !variant || !kv) return noContent()
    const rawVisibleMs = Number(body.visibleMs)
    // Clamp/validate: ignore non-finite or negative durations.
    const visibleMs = Number.isFinite(rawVisibleMs) && rawVisibleMs > 0 ? Math.round(rawVisibleMs) : 0
    const engaged = body.engaged === true

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

  if (kv) {
    try {
      await kv.hincrby(kvCounterKey(flagKey), kvCounterField(variant, pagePath, eventName), 1)
      await kv.sadd(KV_FLAGS_KEY, flagKey)
      // Per-source attribution (parallel counter): tie this event to the ad/channel
      // that drove the visit. Organic traffic (no utm/gclid) adds nothing here.
      const attrSource =
        sanitizeAttributionSource([utmSource, utmCampaign, utmContent].filter(Boolean).join('.')) ||
        (gclid ? 'gclid' : '')
      if (attrSource) {
        await kv.hincrby(kvSourceKey(flagKey), kvSourceField(attrSource, variant, eventName), 1)
      }
    } catch {
      // Never surface collection errors to the page.
    }
  }

  // Forward the EVENT to GA4 via the Measurement Protocol so experiment events
  // recover the ~95% that the client gtag loses to blockers. Inert until
  // GA4_MP_API_SECRET is set (sendGa4MpEvents returns false). Best-effort: a
  // short awaited call wrapped in try/catch so it can never throw or change the
  // 204 response. The client gtag is skipped for these events, so MP is their
  // single path to GA4 (no double-count). The engagement beacon is NOT forwarded.
  try {
    // Stable fallback id so a forward still groups when ga_client_id is absent;
    // GA4 requires a non-empty client_id. Counts only — no new identifier minted.
    const clientId = gaClientId || `${flagKey}.${variant}`
    await sendGa4MpEvents(clientId, [
      {
        name: eventName,
        params: {
          variant,
          flag_key: flagKey,
          experiment_id: experimentId,
          page_path: pagePath,
          ...(gaSessionId ? { session_id: gaSessionId } : {}),
          engagement_time_msec: 1,
        },
      },
    ])
  } catch {
    // Best-effort: a GA4 forward failure must never affect the 204 response.
  }

  return noContent()
}
