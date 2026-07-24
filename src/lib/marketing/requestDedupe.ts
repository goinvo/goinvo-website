import { createHash } from 'node:crypto'

import { MarketingRequestError } from '@/lib/marketing/apiBoundary'

const DEFAULT_TTL_MS = 2 * 60 * 1000
const DEFAULT_MAX_IDEMPOTENCY_ENTRIES = 128

type IdempotencyEntry<T> = {
  fingerprint: string
  promise: Promise<T>
  expiresAt: number
}

/**
 * Read an optional, opaque retry key without allowing an attacker to turn an
 * arbitrarily large header into a long-lived cache key.
 */
export function readMarketingIdempotencyKey(request: Request): string | undefined {
  const value = request.headers.get('idempotency-key')?.trim() || ''
  if (!value) return undefined
  if (value.length < 8 || value.length > 100 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new MarketingRequestError(
      'Idempotency-Key must be 8-100 letters, numbers, dots, colons, underscores, or hyphens.',
      400,
    )
  }
  return value
}

/** Fingerprint already-parsed JSON without retaining the sensitive request. */
export function marketingRequestFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('base64url')
}

/**
 * Same-instance protection for expensive AI work.
 *
 * Exact concurrent requests coalesce even when an older caller does not send
 * an idempotency key. Callers that do provide a key also get a short replay
 * window, while reuse of that key for different JSON fails closed. Nothing in
 * the request body is retained as a map key.
 */
export function createMarketingRequestDeduper<T>(options?: {
  ttlMs?: number
  maxIdempotencyEntries?: number
}) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS
  const maxEntries = options?.maxIdempotencyEntries ?? DEFAULT_MAX_IDEMPOTENCY_ENTRIES
  const inFlight = new Map<string, Promise<T>>()
  const idempotency = new Map<string, IdempotencyEntry<T>>()

  const prune = (now: number) => {
    for (const [key, entry] of idempotency) {
      if (entry.expiresAt <= now) idempotency.delete(key)
    }
  }

  return async function runDeduped(
    fingerprint: string,
    idempotencyKey: string | undefined,
    work: () => Promise<T>,
  ): Promise<T> {
    const now = Date.now()
    prune(now)

    if (idempotencyKey) {
      const existing = idempotency.get(idempotencyKey)
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw new MarketingRequestError(
            'This idempotency key was already used for different request data.',
            409,
          )
        }
        return existing.promise
      }
      if (idempotency.size >= maxEntries) {
        throw new MarketingRequestError('Too many recent idempotent requests. Try again shortly.', 429)
      }
    }

    let promise = inFlight.get(fingerprint)
    if (!promise) {
      promise = Promise.resolve().then(work)
      inFlight.set(fingerprint, promise)
      void promise
        .finally(() => {
          if (inFlight.get(fingerprint) === promise) inFlight.delete(fingerprint)
        })
        .catch(() => undefined)
    }

    if (idempotencyKey) {
      const entry: IdempotencyEntry<T> = {
        fingerprint,
        promise,
        expiresAt: now + ttlMs,
      }
      idempotency.set(idempotencyKey, entry)
      void promise.catch(() => {
        if (idempotency.get(idempotencyKey) === entry) idempotency.delete(idempotencyKey)
      })
    }

    return promise
  }
}
