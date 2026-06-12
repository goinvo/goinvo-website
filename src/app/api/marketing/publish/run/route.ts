import { NextResponse } from 'next/server'
import { assertMarketingApiKey, getMarketingWriteClient, runPublish, scheduleFinalize } from '@/lib/marketing'

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

async function readParams(
  req: Request,
): Promise<{ id?: string; dryRun: boolean; onlyIfDue: boolean; finalize: boolean }> {
  const url = new URL(req.url)
  let id = url.searchParams.get('id') || undefined
  let dryRun = url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true'
  const onlyIfDue = url.searchParams.get('onlyIfDue') === '1' || url.searchParams.get('onlyIfDue') === 'true'
  const finalize = url.searchParams.get('finalize') === '1' || url.searchParams.get('finalize') === 'true'

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { id?: unknown; dryRun?: unknown }
      if (typeof body?.id === 'string' && body.id.trim()) id = body.id.trim()
      if (body?.dryRun === true) dryRun = true
    } catch {
      // No / invalid body is fine; fall back to query params.
    }
  }
  return { id, dryRun, onlyIfDue, finalize }
}

async function handle(req: Request): Promise<NextResponse> {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'Unauthorized publish request.' }, { status: 401 })
  }

  let client: ReturnType<typeof getMarketingWriteClient>
  try {
    client = getMarketingWriteClient()
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sanity write client unavailable.' },
      { status: 500 },
    )
  }

  const { id, dryRun, onlyIfDue, finalize } = await readParams(req)

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
        if (!scheduled.ok) {
          console.warn(`Finalize re-check enqueue failed for ${result.id}: ${scheduled.error}`)
        }
      }
    }

    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
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
