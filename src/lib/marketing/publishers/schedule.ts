/**
 * Upstash QStash scheduling for exact-time social publishing.
 *
 * When an item is scheduled, enqueue a one-shot QStash message that POSTs the
 * publish endpoint at exactly publishAt (QStash's `Upstash-Not-Before`). QStash
 * retries on failure. The callback is authenticated by having QStash FORWARD our
 * MARKETING_API_KEY as the bearer (`Upstash-Forward-Authorization`), so it uses
 * the same auth as the rest of the API — no separate route or JWT verification.
 *
 * Env:
 *   QSTASH_TOKEN              — QStash publish token (Upstash console → QStash).
 *   MARKETING_PUBLIC_BASE_URL — optional absolute base for the callback URL;
 *                               otherwise the caller's request origin is used.
 *
 * Reschedule/cancel safety: the callback hits `/run?id=…&onlyIfDue=1`, which
 * re-checks the item is still due — so a stale message (item moved or canceled)
 * is a harmless no-op.
 */

const QSTASH_PUBLISH_BASE = 'https://qstash.upstash.io/v2/publish'

/** True when QStash can be used to enqueue (fail-closed otherwise). */
export function isQStashConfigured(): boolean {
  return Boolean((process.env.QSTASH_TOKEN || '').trim())
}

/** Unix seconds (floored) for a publishAt ISO string. */
export function notBeforeSeconds(publishAtIso: string): number {
  return Math.floor(new Date(publishAtIso).getTime() / 1000)
}

function resolveBaseUrl(baseUrl: string): string {
  const override = (process.env.MARKETING_PUBLIC_BASE_URL || '').trim()
  return (override || baseUrl).replace(/\/$/, '')
}

/** Builds the absolute callback URL QStash POSTs at publish time. */
export function buildCallbackUrl(baseUrl: string, itemId: string): string {
  const url = new URL('/api/marketing/publish/run', resolveBaseUrl(baseUrl))
  url.searchParams.set('id', itemId)
  url.searchParams.set('onlyIfDue', '1')
  return url.toString()
}

export interface SchedulePublishParams {
  itemId: string
  publishAtIso: string
  /** Absolute base URL of this deployment (where QStash should call back). */
  baseUrl: string
  /** The marketing API key QStash forwards as the callback's bearer auth. */
  forwardApiKey: string
  /** Max QStash retries (default 3). */
  retries?: number
}

export interface ScheduleResult {
  ok: boolean
  messageId?: string
  callbackUrl: string
  notBefore: number
  error?: string
}

interface EnqueueResult {
  ok: boolean
  messageId?: string
  error?: string
}

/**
 * Posts one one-shot message to QStash for a given callback URL + scheduling
 * headers (Upstash-Not-Before for absolute time, Upstash-Delay for relative).
 * The callback authenticates via a forwarded bearer (our MARKETING_API_KEY).
 * Never throws — returns an EnqueueResult.
 */
async function enqueueQStash(
  callbackUrl: string,
  schedulingHeaders: Record<string, string>,
  dedupId: string,
  forwardApiKey: string,
  retries = 3,
): Promise<EnqueueResult> {
  const token = (process.env.QSTASH_TOKEN || '').trim()
  if (!token) return { ok: false, error: 'QStash not configured: set QSTASH_TOKEN.' }
  if (!forwardApiKey) {
    return { ok: false, error: 'Cannot enqueue: MARKETING_API_KEY is unset (callback would be unauthenticated).' }
  }
  try {
    const res = await fetch(`${QSTASH_PUBLISH_BASE}/${callbackUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Upstash-Retries': String(retries),
        // Delivered to the callback as its Authorization header.
        'Upstash-Forward-Authorization': `Bearer ${forwardApiKey}`,
        'Upstash-Deduplication-Id': dedupId,
        ...schedulingHeaders,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    })
    if (!res.ok) return { ok: false, error: `QStash enqueue failed (${res.status}): ${await res.text()}` }
    const json = (await res.json().catch(() => ({}))) as { messageId?: string }
    return { ok: true, messageId: json.messageId }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'QStash error' }
  }
}

/** Enqueues the exact-time QStash publish callback. Never throws. */
export async function schedulePublish(params: SchedulePublishParams): Promise<ScheduleResult> {
  const callbackUrl = buildCallbackUrl(params.baseUrl, params.itemId)
  const notBefore = notBeforeSeconds(params.publishAtIso)
  const result = await enqueueQStash(
    callbackUrl,
    { 'Upstash-Not-Before': String(notBefore) },
    `publish-${params.itemId}-${notBefore}`,
    params.forwardApiKey,
    params.retries,
  )
  return { ok: result.ok, messageId: result.messageId, callbackUrl, notBefore, error: result.error }
}

export interface ScheduleFinalizeParams {
  itemId: string
  /** Relative delay before the re-check, in seconds. */
  delaySeconds: number
  /** Attempt number — part of the dedup id so each scheduled re-check is distinct. */
  attempt: number
  baseUrl: string
  forwardApiKey: string
  retries?: number
}

/** Builds the QStash finalize callback URL: /run?id=…&finalize=1. */
export function buildFinalizeCallbackUrl(baseUrl: string, itemId: string): string {
  const url = new URL('/api/marketing/publish/run', resolveBaseUrl(baseUrl))
  url.searchParams.set('id', itemId)
  url.searchParams.set('finalize', '1')
  return url.toString()
}

/**
 * Enqueues a delayed QStash re-check for an async (video) publish. The callback
 * hits /run?id=…&finalize=1, which calls the adapter's finalize() on the stored
 * container id. Never throws.
 */
export async function scheduleFinalize(params: ScheduleFinalizeParams): Promise<ScheduleResult> {
  const callbackUrl = buildFinalizeCallbackUrl(params.baseUrl, params.itemId)
  const delay = Math.max(1, Math.round(params.delaySeconds))
  const result = await enqueueQStash(
    callbackUrl,
    { 'Upstash-Delay': `${delay}s` },
    `finalize-${params.itemId}-${params.attempt}`,
    params.forwardApiKey,
    params.retries,
  )
  return { ok: result.ok, messageId: result.messageId, callbackUrl, notBefore: 0, error: result.error }
}
