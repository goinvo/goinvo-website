// Small retry helper for transient failures when talking to social platform APIs.
//
// IMPORTANT — only wrap IDEMPOTENT operations (status/permalink GETs, media
// container creation where a dangling duplicate is harmless). Never wrap the
// final "publish" call: a network error after the platform already processed the
// request would otherwise double-post.

export interface RetryOptions {
  /** Total attempts including the first (default 3). */
  attempts?: number
  /** Base backoff in ms; doubles each retry (default 300 → 300, 600, …). */
  baseDelayMs?: number
  /** Decide whether an error is worth retrying (default: transient network / 429 / 5xx). */
  isRetryable?: (error: unknown) => boolean
  /** Injectable sleep so tests don't actually wait. */
  sleep?: (ms: number) => Promise<void>
}

/**
 * Retries `fn` on transient errors with exponential backoff. Re-throws the last
 * error once attempts are exhausted or the error is non-retryable.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3)
  const baseDelayMs = opts.baseDelayMs ?? 300
  const isRetryable = opts.isRetryable ?? isTransientError
  const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)))

  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= attempts || !isRetryable(error)) throw error
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }
  throw lastError
}

/**
 * Default retry predicate: retry on connection-level failures and on transient
 * HTTP statuses (429 rate-limit, 5xx server errors), but NOT on 4xx (auth, bad
 * request) which won't get better by retrying. The platform adapters throw
 * `Error` whose message carries the status (e.g. "… failed (503)"), so we match
 * on that as well as common network-error signatures.
 */
export function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/\b(429|5\d\d)\b/.test(message)) return true
  if (/(fetch failed|network|socket hang up|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR)/i.test(message)) return true
  return false
}
