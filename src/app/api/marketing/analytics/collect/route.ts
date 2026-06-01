import { NextRequest, NextResponse } from 'next/server'
import { normalizeDrainPagePath } from '@/lib/marketing/vercelDrain'
import { getKvClient, kvCounterKey, kvCounterField, KV_FLAGS_KEY } from '@/lib/marketing/drainSink'

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
  const eventName = String(body.eventName ?? body.event ?? body.name ?? '').trim()
  const pagePath = normalizeDrainPagePath(String(body.page_path ?? body.pagePath ?? ''))
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
