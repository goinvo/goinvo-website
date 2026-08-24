import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { datasetForType } from '@/lib/marketing/datasetRouting'
import { verifyDrainAuthorization } from '@/lib/marketing/drainAuth'
import {
  aggregateDrainEvents,
  extractExperimentDimensions,
  parseVercelDrainPayload,
  type DrainAggregate,
  type DrainEvent,
} from '@/lib/marketing/vercelDrain'
import { upsertDrainSignalForFlag } from '@/lib/marketing/drainSink'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const VERCEL_DRAIN_LIMITS = {
  bodyBytes: 1024 * 1024,
  events: 1000,
  flagKeys: 50,
  eventNameCharacters: 128,
  experimentIdCharacters: 128,
  flagKeyCharacters: 128,
  variantCharacters: 128,
  pagePathCharacters: 2048,
  countPerEvent: 1_000_000,
} as const

type DrainResponseBody = {
  received: number
  aggregated: number
  updatedSignals: number
  flagKeys?: string[]
  warnings: string[]
}

class DrainPayloadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

let sanityClient: SanityClient | null = null
const inFlightDeliveries = new Map<string, Promise<DrainResponseBody>>()

function getSanityClient() {
  if (!writeToken || !projectId) return null
  if (!sanityClient) {
    sanityClient = createClient({
      projectId,
      dataset: datasetForType('marketingExperiment', dataset),
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return sanityClient
}

function drainJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set('Cache-Control', 'private, no-store')
  return NextResponse.json(body, { ...init, headers })
}

async function readRawBody(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (Number.isFinite(declaredLength) && declaredLength > VERCEL_DRAIN_LIMITS.bodyBytes) {
    throw new DrainPayloadError('Drain payload is too large.', 413)
  }
  if (!request.body) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let rawBody = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > VERCEL_DRAIN_LIMITS.bodyBytes) {
        await reader.cancel().catch(() => {})
        throw new DrainPayloadError('Drain payload is too large.', 413)
      }
      rawBody += decoder.decode(value, { stream: true })
    }
    rawBody += decoder.decode()
    return rawBody
  } finally {
    reader.releaseLock()
  }
}

function assertBoundedEvents(events: DrainEvent[]) {
  if (events.length > VERCEL_DRAIN_LIMITS.events) {
    throw new DrainPayloadError(`Drain payload may contain at most ${VERCEL_DRAIN_LIMITS.events} events.`, 413)
  }

  const flagKeys = new Set<string>()
  for (const event of events) {
    if (event.eventName && event.eventName.length > VERCEL_DRAIN_LIMITS.eventNameCharacters) {
      throw new DrainPayloadError('Drain event name is too long.', 413)
    }
    if (!Number.isFinite(event.count) || event.count < 0 || event.count > VERCEL_DRAIN_LIMITS.countPerEvent) {
      throw new DrainPayloadError('Drain event count is outside the supported range.', 413)
    }

    const dimensions = extractExperimentDimensions(event)
    if (!dimensions) continue
    if (dimensions.experimentId.length > VERCEL_DRAIN_LIMITS.experimentIdCharacters) {
      throw new DrainPayloadError('Drain experiment id is too long.', 413)
    }
    if (dimensions.flagKey.length > VERCEL_DRAIN_LIMITS.flagKeyCharacters) {
      throw new DrainPayloadError('Drain flag key is too long.', 413)
    }
    if (dimensions.variant.length > VERCEL_DRAIN_LIMITS.variantCharacters) {
      throw new DrainPayloadError('Drain variant is too long.', 413)
    }
    if (dimensions.pagePath.length > VERCEL_DRAIN_LIMITS.pagePathCharacters) {
      throw new DrainPayloadError('Drain page path is too long.', 413)
    }
    if (dimensions.flagKey) flagKeys.add(dimensions.flagKey)
  }

  if (flagKeys.size > VERCEL_DRAIN_LIMITS.flagKeys) {
    throw new DrainPayloadError(`Drain payload may contain at most ${VERCEL_DRAIN_LIMITS.flagKeys} flag keys.`, 413)
  }
}

async function processDrainPayload(rawBody: string, client: SanityClient): Promise<DrainResponseBody> {
  let payload: unknown = rawBody
  try {
    payload = JSON.parse(rawBody)
  } catch {
    payload = rawBody // parser also handles NDJSON / raw strings
  }

  const events = parseVercelDrainPayload(payload)
  assertBoundedEvents(events)
  const aggregates = aggregateDrainEvents(events)

  if (aggregates.length === 0) {
    return { received: events.length, aggregated: 0, updatedSignals: 0, warnings: ['No experiment-tagged events found in payload.'] }
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

  return {
    received: events.length,
    aggregated: aggregates.length,
    updatedSignals,
    flagKeys: Array.from(byFlagKey.keys()),
    warnings,
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  if (!secret) {
    return drainJson(
      { error: 'MARKETING_VERCEL_DRAIN_SECRET is not configured.' },
      { status: 500 },
    )
  }

  let rawBody: string
  try {
    rawBody = await readRawBody(request)
  } catch (error) {
    if (error instanceof DrainPayloadError) {
      return drainJson({ error: error.message }, { status: error.status })
    }
    throw error
  }
  const authorized = verifyDrainAuthorization({
    secret,
    authorizationHeader: request.headers.get('authorization'),
    signatureHeader: request.headers.get('x-vercel-signature'),
    rawBody,
  })
  if (!authorized) {
    return drainJson({ error: 'Unauthorized drain request.' }, { status: 401 })
  }

  const client = getSanityClient()
  if (!client) {
    return drainJson({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  try {
    // Coalesce exact concurrent Vercel retries. Without this, two deliveries can
    // both observe an unlinked experiment and append the same signal reference.
    const deliveryHash = createHash('sha256').update(rawBody).digest('hex')
    let work = inFlightDeliveries.get(deliveryHash)
    if (!work) {
      work = processDrainPayload(rawBody, client)
      inFlightDeliveries.set(deliveryHash, work)
      void work.finally(() => {
        if (inFlightDeliveries.get(deliveryHash) === work) inFlightDeliveries.delete(deliveryHash)
      }).catch(() => {})
    }
    return drainJson(await work)
  } catch (error) {
    if (error instanceof DrainPayloadError) {
      return drainJson({ error: error.message }, { status: error.status })
    }
    console.error('Vercel analytics drain failed:', error)
    return drainJson({ error: 'Vercel analytics drain failed. Nothing was saved.' }, { status: 503 })
  }
}
