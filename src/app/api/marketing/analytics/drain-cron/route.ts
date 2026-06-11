import { createClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import {
  aggregatesFromKvHash,
  getKvClient,
  kvCounterKey,
  upsertDrainSignalForFlag,
  variantEngagementFromKvHash,
  KV_FLAGS_KEY,
} from '@/lib/marketing/drainSink'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Rollup cron for the first-party A/B collector. Vercel Cron calls this on a
 * schedule (see vercel.json) with `Authorization: Bearer ${CRON_SECRET}`. It
 * reads the cumulative per-variant counters from Vercel KV and upserts one
 * deterministic readout signal per flag — the same sink the batch drain uses.
 *
 * Counters are cumulative, so the signal is a running total; KV is not cleared.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET (or MARKETING_VERCEL_DRAIN_SECRET) is not configured.' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request.' }, { status: 401 })
  }

  const kv = getKvClient()
  if (!kv) {
    return NextResponse.json({ error: 'Vercel KV is not configured (set KV_REST_API_URL and KV_REST_API_TOKEN).' }, { status: 500 })
  }
  if (!writeToken || !projectId) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const client = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  const flagKeys = ((await kv.smembers(KV_FLAGS_KEY)) as string[]) || []

  const metricDate = new Date().toISOString().slice(0, 10)
  const warnings: string[] = []
  let updatedSignals = 0

  for (const flagKey of flagKeys) {
    const hash = (await kv.hgetall(kvCounterKey(flagKey))) as Record<string, unknown> | null
    const aggregates = aggregatesFromKvHash(flagKey, hash)
    if (aggregates.length === 0) continue
    // First-party per-variant engagement (time-on-page + bounce) from the same
    // hash's reserved `__eng_*` fields. This is the sole writer of engagement on
    // the signal (the retired GA4 A/B route no longer exists).
    const variantEngagement = variantEngagementFromKvHash(hash)
    const result = await upsertDrainSignalForFlag(client, flagKey, aggregates, { metricDate, variantEngagement })
    warnings.push(...result.warnings)
    if (result.updated) updatedSignals += 1
  }

  return NextResponse.json({ flagKeys: flagKeys.length, updatedSignals, warnings })
}
