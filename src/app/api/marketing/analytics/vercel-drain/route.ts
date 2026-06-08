import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { verifyDrainAuthorization } from '@/lib/marketing/drainAuth'
import {
  aggregateDrainEvents,
  parseVercelDrainPayload,
  type DrainAggregate,
} from '@/lib/marketing/vercelDrain'
import { upsertDrainSignalForFlag } from '@/lib/marketing/drainSink'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

let sanityClient: SanityClient | null = null

function getSanityClient() {
  if (!writeToken || !projectId) return null
  if (!sanityClient) {
    sanityClient = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  }
  return sanityClient
}

export async function POST(request: NextRequest) {
  const secret = process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  if (!secret) {
    return NextResponse.json(
      { error: 'MARKETING_VERCEL_DRAIN_SECRET is not configured.' },
      { status: 500 },
    )
  }

  const rawBody = await request.text()
  const authorized = verifyDrainAuthorization({
    secret,
    authorizationHeader: request.headers.get('authorization'),
    signatureHeader: request.headers.get('x-vercel-signature'),
    queryToken: request.nextUrl.searchParams.get('secret'),
    rawBody,
  })
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized drain request.' }, { status: 401 })
  }

  const client = getSanityClient()
  if (!client) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  let payload: unknown = rawBody
  try {
    payload = JSON.parse(rawBody)
  } catch {
    payload = rawBody // parser also handles NDJSON / raw strings
  }

  const events = parseVercelDrainPayload(payload)
  const aggregates = aggregateDrainEvents(events)

  if (aggregates.length === 0) {
    return NextResponse.json({ received: events.length, aggregated: 0, updatedSignals: 0, warnings: ['No experiment-tagged events found in payload.'] })
  }

  const byFlagKey = new Map<string, DrainAggregate[]>()
  for (const aggregate of aggregates) {
    if (!aggregate.flagKey) continue
    byFlagKey.set(aggregate.flagKey, [...(byFlagKey.get(aggregate.flagKey) || []), aggregate])
  }

  const today = new Date().toISOString().slice(0, 10)
  const warnings: string[] = []
  let updatedSignals = 0

  for (const [flagKey, flagAggregates] of byFlagKey) {
    const result = await upsertDrainSignalForFlag(client, flagKey, flagAggregates, { metricDate: today })
    warnings.push(...result.warnings)
    if (result.updated) updatedSignals += 1
  }

  return NextResponse.json({
    received: events.length,
    aggregated: aggregates.length,
    updatedSignals,
    flagKeys: Array.from(byFlagKey.keys()),
    warnings,
  })
}
