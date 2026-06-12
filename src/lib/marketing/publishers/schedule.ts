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

/** Enqueues the delayed QStash callback. Never throws — returns a ScheduleResult. */
export async function schedulePublish(params: SchedulePublishParams): Promise<ScheduleResult> {
  const callbackUrl = buildCallbackUrl(params.baseUrl, params.itemId)
  const notBefore = notBeforeSeconds(params.publishAtIso)
  const token = (process.env.QSTASH_TOKEN || '').trim()
  if (!token) {
    return { ok: false, callbackUrl, notBefore, error: 'QStash not configured: set QSTASH_TOKEN.' }
  }
  if (!params.forwardApiKey) {
    return { ok: false, callbackUrl, notBefore, error: 'Cannot schedule: MARKETING_API_KEY is unset (callback would be unauthenticated).' }
  }

  try {
    const res = await fetch(`${QSTASH_PUBLISH_BASE}/${callbackUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Upstash-Not-Before': String(notBefore),
        'Upstash-Retries': String(params.retries ?? 3),
        // Delivered to the callback as its Authorization header.
        'Upstash-Forward-Authorization': `Bearer ${params.forwardApiKey}`,
        // De-dupes re-saves of the same item+time within QStash's dedup window.
        'Upstash-Deduplication-Id': `publish-${params.itemId}-${notBefore}`,
      },
      body: JSON.stringify({ id: params.itemId }),
      cache: 'no-store',
    })
    if (!res.ok) {
      return { ok: false, callbackUrl, notBefore, error: `QStash publish failed (${res.status}): ${await res.text()}` }
    }
    const json = (await res.json().catch(() => ({}))) as { messageId?: string }
    return { ok: true, messageId: json.messageId, callbackUrl, notBefore }
  } catch (error) {
    return { ok: false, callbackUrl, notBefore, error: error instanceof Error ? error.message : 'QStash error' }
  }
}
