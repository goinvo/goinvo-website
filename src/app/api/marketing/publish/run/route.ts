import { NextResponse } from 'next/server'
import { assertMarketingApiKey, getMarketingWriteClient } from '@/lib/marketing'
import { runPublish, scheduleFinalize } from '@/lib/marketing/publishers'
import {
  assertBoundedJson,
  isPlainRecord,
  isValidMarketingDocumentId,
  MarketingRequestError,
  readBoundedJson,
} from '@/lib/marketing/apiBoundary'
import { privateMarketingJson } from '@/lib/marketing/privateResponse'

// Publish worker endpoint for the marketing calendar's social auto-publishing.
//
//   GET|POST /api/marketing/publish/run
//
// Triggered three ways, all authorized:
//   1. QStash exact-time callback — POST with `?id=<doc>&onlyIfDue=1`; QStash
//      forwards `Authorization: Bearer ${MARKETING_API_KEY}` for us.
//   2. Manual / Studio — any request carrying a valid MARKETING_API_KEY.
//   3. Optional sweep (external cron/pinger) — same auth, no id (publishes all due).
//
// Loads due items (autoPublish + scheduled + past publishAt + not already
// handled), claims each with an optimistic revision lock so overlapping runs
// can't double-post, publishes via the platform adapter, and writes the result
// back. Fail-closed: with no credentials a platform is "skipped", never posted.
//
// Params: ?dryRun=1 (preview, no writes), ?id=<docId> (one item), ?onlyIfDue=1
// (with id, only act if the item is still due — used by the QStash callback so a
// stale/rescheduled message is a safe no-op).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Authorizes a cron call (CRON_SECRET bearer) or any keyed/forwarded call. */
function authorize(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.MARKETING_VERCEL_DRAIN_SECRET || ''
  if (cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`) {
    return true
  }
  try {
    assertMarketingApiKey(req)
    return true
  } catch {
    return false
  }
}

const PUBLISH_RUN_BODY_LIMIT = 16 * 1024
const RUN_QUERY_FIELDS = new Set(['id', 'dryRun', 'onlyIfDue', 'finalize'])
const RUN_BODY_FIELDS = new Set(['id', 'dryRun', 'onlyIfDue', 'finalize'])

function parseQueryBoolean(params: URLSearchParams, name: string): boolean | undefined {
  const values = params.getAll(name)
  if (values.length > 1) {
    throw new MarketingRequestError(`Query parameter \`${name}\` may only be provided once.`, 400)
  }
  if (values.length === 0) return undefined
  if (values[0] === '1' || values[0] === 'true') return true
  if (values[0] === '0' || values[0] === 'false') return false
  throw new MarketingRequestError(`Query parameter \`${name}\` must be 1, 0, true, or false.`, 400)
}

function mergeParam<T>(name: string, queryValue: T | undefined, bodyValue: T | undefined): T | undefined {
  if (queryValue !== undefined && bodyValue !== undefined && queryValue !== bodyValue) {
    throw new MarketingRequestError(`Conflicting \`${name}\` values were provided in the query and body.`, 400)
  }
  return bodyValue ?? queryValue
}

async function readParams(
  req: Request,
): Promise<{ id?: string; dryRun: boolean; onlyIfDue: boolean; finalize: boolean }> {
  const url = new URL(req.url)
  for (const key of url.searchParams.keys()) {
    if (!RUN_QUERY_FIELDS.has(key)) {
      throw new MarketingRequestError(`Unknown query parameter \`${key}\`.`, 400)
    }
  }

  const queryIds = url.searchParams.getAll('id')
  if (queryIds.length > 1) {
    throw new MarketingRequestError('Query parameter `id` may only be provided once.', 400)
  }
  const queryId = queryIds[0]?.trim() || undefined
  const queryDryRun = parseQueryBoolean(url.searchParams, 'dryRun')
  const queryOnlyIfDue = parseQueryBoolean(url.searchParams, 'onlyIfDue')
  const queryFinalize = parseQueryBoolean(url.searchParams, 'finalize')

  let bodyId: string | undefined
  let bodyDryRun: boolean | undefined
  let bodyOnlyIfDue: boolean | undefined
  let bodyFinalize: boolean | undefined

  if (req.method === 'POST') {
    const declaredLength = req.headers.get('content-length')
    const hasBody = req.body !== null && declaredLength !== '0'
    if (hasBody) {
      const raw = await readBoundedJson(req, PUBLISH_RUN_BODY_LIMIT)
      assertBoundedJson(raw, {
        maxArrayItems: 0,
        maxObjectKeys: RUN_BODY_FIELDS.size,
        maxDepth: 1,
        maxStringLength: 128,
        maxNodes: 8,
      })
      if (!isPlainRecord(raw)) {
        throw new MarketingRequestError('Request body must be a JSON object.', 400)
      }
      for (const key of Object.keys(raw)) {
        if (!RUN_BODY_FIELDS.has(key)) {
          throw new MarketingRequestError(`Unknown request field \`${key}\`.`, 400)
        }
      }
      if (raw.id !== undefined) {
        if (typeof raw.id !== 'string' || !raw.id.trim()) {
          throw new MarketingRequestError('`id` must be a non-empty document ID.', 400)
        }
        bodyId = raw.id.trim()
      }
      for (const name of ['dryRun', 'onlyIfDue', 'finalize'] as const) {
        if (raw[name] !== undefined && typeof raw[name] !== 'boolean') {
          throw new MarketingRequestError(`\`${name}\` must be a boolean.`, 400)
        }
      }
      bodyDryRun = raw.dryRun as boolean | undefined
      bodyOnlyIfDue = raw.onlyIfDue as boolean | undefined
      bodyFinalize = raw.finalize as boolean | undefined
    }
  }

  const id = mergeParam('id', queryId, bodyId)
  const dryRun = mergeParam('dryRun', queryDryRun, bodyDryRun) ?? false
  const onlyIfDue = mergeParam('onlyIfDue', queryOnlyIfDue, bodyOnlyIfDue) ?? false
  const finalize = mergeParam('finalize', queryFinalize, bodyFinalize) ?? false

  if (id && !isValidMarketingDocumentId(id)) {
    throw new MarketingRequestError('`id` is not a valid marketing document ID.', 400)
  }
  if ((onlyIfDue || finalize) && !id) {
    throw new MarketingRequestError('`onlyIfDue` and `finalize` require an `id`.', 400)
  }
  if (onlyIfDue && finalize) {
    throw new MarketingRequestError('`onlyIfDue` and `finalize` cannot be combined.', 400)
  }

  return { id, dryRun, onlyIfDue, finalize }
}

async function handle(req: Request): Promise<NextResponse> {
  if (!authorize(req)) {
    return privateMarketingJson({ error: 'Unauthorized publish request.' }, { status: 401 })
  }

  let params: Awaited<ReturnType<typeof readParams>>
  try {
    params = await readParams(req)
  } catch (error) {
    if (error instanceof MarketingRequestError) {
      return privateMarketingJson({ error: error.message }, { status: error.status })
    }
    throw error
  }

  let client: ReturnType<typeof getMarketingWriteClient>
  try {
    client = getMarketingWriteClient()
  } catch (error) {
    return privateMarketingJson(
      { error: error instanceof Error ? error.message : 'Sanity write client unavailable.' },
      { status: 500 },
    )
  }

  const { id, dryRun, onlyIfDue, finalize } = params

  try {
    const summary = await runPublish(client, {
      now: new Date().toISOString(),
      id,
      dryRun,
      onlyIfDue,
      finalizeOnly: finalize,
    })

    // Schedule QStash re-checks for any async (video) publish still processing.
    if (!dryRun) {
      const url = new URL(req.url)
      const baseUrl = `${url.protocol}//${url.host}`
      const forwardApiKey = process.env.MARKETING_API_KEY || ''
      for (const result of summary.results) {
        if (!result.finalize) continue
        const scheduled = await scheduleFinalize({
          itemId: result.id,
          delaySeconds: result.finalize.delaySec,
          attempt: result.finalize.attempt,
          baseUrl,
          forwardApiKey,
        })
        result.finalizeScheduled = scheduled.ok
        if (!scheduled.ok) {
          result.finalizeScheduleError = (scheduled.error || 'Finalize re-check enqueue failed.').slice(0, 500)
          console.warn(`Finalize re-check enqueue failed for ${result.id}: ${result.finalizeScheduleError}`)
        }
      }
    }

    return privateMarketingJson(summary)
  } catch (error) {
    return privateMarketingJson(
      { error: error instanceof Error ? error.message : 'Publish run failed.' },
      { status: 500 },
    )
  }
}

export async function GET(req: Request) {
  return handle(req)
}

export async function POST(req: Request) {
  return handle(req)
}
