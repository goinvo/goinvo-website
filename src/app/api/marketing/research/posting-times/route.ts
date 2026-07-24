import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'
import { assertStudioOrApiKey, MarketingAuthError } from '@/lib/marketing/auth'
import { resolveMarketingModel } from '@/lib/marketing/anthropicJson'
import {
  applyPostingTimeResearch,
  buildPostingTimePlan,
  isPostingTimeResearchConfigured,
  researchChannelPostingTimes,
  type PostingTimeChannel,
} from '@/lib/marketing/postingTimeResearch'
import {
  assertBoundedJson,
  isPlainRecord,
  isRevisionConflict,
  isValidMarketingDocumentId,
  MarketingRequestError,
  readBoundedJson,
} from '@/lib/marketing/apiBoundary'

export const dynamic = 'force-dynamic'
// Live web research per channel can take ~60–90s; allow headroom for a batch.
export const maxDuration = 300

let sanityClient: SanityClient | null = null
function getSanityClient() {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({ projectId, dataset, token: writeToken, apiVersion, useCdn: false })
  }
  return sanityClient
}

const CHANNEL_PROJECTION = `{
  _id, _rev, title, key, platform, contentTypes[]{ label, value }
}`

const MAX_CHANNEL_BATCH = 12
const MAX_RESEARCH_CONCURRENCY = 3
const POSTING_TIME_BODY_LIMIT = 32 * 1024
const MAX_CONTEXT_LENGTH = 2_000

type RequestBody = {
  channelId?: string
  all?: boolean
  dryRun?: boolean
  audience?: string
  goal?: string
  model?: string
}

type PostingTimeResult = {
  channelId: string
  title?: string
  outcome: 'dry-run' | 'researched' | 'conflict' | 'failed'
  plan?: ReturnType<typeof buildPostingTimePlan>
  summary?: string
  slots?: unknown[]
  sourceCount?: number
  model?: string
  error?: string
}

const postingTimeInFlight = new Map<string, Promise<PostingTimeResult>>()

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index])
    }
  })
  await Promise.all(runners)
  return results
}

function cleanOptionalContext(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new MarketingRequestError(`${field} must be a string.`, 400)
  const clean = value.trim()
  if (clean.length > MAX_CONTEXT_LENGTH) {
    throw new MarketingRequestError(`${field} exceeds the ${MAX_CONTEXT_LENGTH}-character limit.`, 413)
  }
  return clean || undefined
}

export async function POST(request: NextRequest) {
  try {
    await assertStudioOrApiKey(request)
  } catch (error) {
    if (error instanceof MarketingAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    throw error
  }

  if (!isPostingTimeResearchConfigured()) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured — posting-time research is disabled.' },
      { status: 503 },
    )
  }

  const client = getSanityClient()
  if (!client) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const url = new URL(request.url)
  let body: RequestBody
  try {
    const parsed = await readBoundedJson(request, POSTING_TIME_BODY_LIMIT)
    assertBoundedJson(parsed, { maxArrayItems: 0, maxStringLength: MAX_CONTEXT_LENGTH })
    if (!isPlainRecord(parsed)) throw new MarketingRequestError('Request body must be a JSON object.', 400)
    const unknown = Object.keys(parsed).filter(
      (key) => !['channelId', 'all', 'dryRun', 'audience', 'goal', 'model'].includes(key),
    )
    if (unknown.length) throw new MarketingRequestError(`Unknown request field(s): ${unknown.join(', ')}`, 400)
    for (const key of ['all', 'dryRun'] as const) {
      if (parsed[key] !== undefined && typeof parsed[key] !== 'boolean') {
        throw new MarketingRequestError(`${key} must be a boolean.`, 400)
      }
    }
    body = {
      channelId: cleanOptionalContext(parsed.channelId, 'channelId'),
      audience: cleanOptionalContext(parsed.audience, 'audience'),
      goal: cleanOptionalContext(parsed.goal, 'goal'),
      model: cleanOptionalContext(parsed.model, 'model'),
      all: parsed.all as boolean | undefined,
      dryRun: parsed.dryRun as boolean | undefined,
    }
  } catch (error) {
    if (error instanceof MarketingRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
  const channelId = body.channelId || url.searchParams.get('id') || undefined
  const all = body.all || url.searchParams.get('all') === '1'
  const dryRun = body.dryRun || url.searchParams.get('dryRun') === '1'

  if (!channelId && !all) {
    return NextResponse.json(
      { error: 'Provide a channelId, or all=true to research every channel.' },
      { status: 400 },
    )
  }
  if (channelId && !isValidMarketingDocumentId(channelId)) {
    return NextResponse.json({ error: 'Invalid channelId.' }, { status: 400 })
  }

  const channels = await client.fetch<PostingTimeChannel[]>(
    channelId
      ? `*[_type == "marketingChannel" && _id == $channelId]${CHANNEL_PROJECTION}`
      : `*[_type == "marketingChannel" && status != "archived"]|order(title asc)[0...${MAX_CHANNEL_BATCH + 1}]${CHANNEL_PROJECTION}`,
    { channelId: channelId || '' },
  )

  if (channels.length === 0) {
    return NextResponse.json({ error: 'No matching channel(s) found.' }, { status: 404 })
  }
  if (channels.length > MAX_CHANNEL_BATCH) {
    return NextResponse.json(
      { error: `A posting-time batch is limited to ${MAX_CHANNEL_BATCH} channels. Research a specific channel or archive unused channels.` },
      { status: 413 },
    )
  }

  const model = await resolveMarketingModel(client, body.model)
  const opts = { audience: body.audience, goal: body.goal, model }

  // Research channels concurrently — each call is independent and bounded by its
  // own timeout; the batch is bounded by maxDuration.
  const results = await mapWithConcurrency(
    channels,
    MAX_RESEARCH_CONCURRENCY,
    async (channel): Promise<PostingTimeResult> => {
      const operationKey = JSON.stringify([
        channel._id,
        channel._rev || '',
        dryRun,
        opts.audience || '',
        opts.goal || '',
        opts.model || '',
      ])
      const existing = postingTimeInFlight.get(operationKey)
      if (existing) return existing
      const operation = (async (): Promise<PostingTimeResult> => {
      try {
        if (dryRun) {
          return { channelId: channel._id, title: channel.title, outcome: 'dry-run', plan: buildPostingTimePlan(channel, opts) }
        }
        const rec = await researchChannelPostingTimes(channel, opts)
        await applyPostingTimeResearch(client, channel._id, rec, channel._rev)
        return {
          channelId: channel._id,
          title: channel.title,
          outcome: 'researched',
          summary: rec.summary,
          slots: rec.slots,
          sourceCount: rec.sources.length,
          model: rec.model,
        }
      } catch (err) {
        return {
          channelId: channel._id,
          title: channel.title,
          outcome: isRevisionConflict(err) ? 'conflict' : 'failed',
          error: err instanceof Error ? err.message : 'Research failed.',
        }
      }
      })()
      postingTimeInFlight.set(operationKey, operation)
      try {
        return await operation
      } finally {
        if (postingTimeInFlight.get(operationKey) === operation) postingTimeInFlight.delete(operationKey)
      }
    },
  )

  const failures = results.filter((result) => result.outcome === 'failed' || result.outcome === 'conflict')
  return NextResponse.json({
    dryRun,
    researched: results.filter((result) => result.outcome === 'researched').length,
    planned: results.filter((result) => result.outcome === 'dry-run').length,
    failed: failures.length,
    results,
  })
}
