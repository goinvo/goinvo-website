import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verifies that a Vercel Web Analytics drain request is authorized. Supports
 * three configurations so it works with both Vercel's signed log drains and a
 * simple shared-secret setup:
 *
 * 1. `Authorization: Bearer <secret>` header
 * 2. `?secret=<secret>` query token
 * 3. `x-vercel-signature` HMAC of the raw body (sha1 or sha256 hex)
 *
 * All comparisons are constant-time. Returns false when the secret is missing
 * so the route can decide how to respond.
 */
export interface DrainAuthorizationInput {
  secret: string
  authorizationHeader?: string | null
  signatureHeader?: string | null
  queryToken?: string | null
  rawBody?: string
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

function hmacHex(algorithm: 'sha1' | 'sha256', secret: string, rawBody: string): string {
  return createHmac(algorithm, secret).update(rawBody, 'utf8').digest('hex')
}

export function verifyDrainAuthorization(input: DrainAuthorizationInput): boolean {
  const secret = input.secret?.trim()
  if (!secret) return false

  const bearer = input.authorizationHeader?.trim()
  if (bearer) {
    const token = bearer.replace(/^Bearer\s+/i, '').trim()
    if (token && safeEqual(token, secret)) return true
  }

  const queryToken = input.queryToken?.trim()
  if (queryToken && safeEqual(queryToken, secret)) return true

  const signature = input.signatureHeader?.trim()
  if (signature && typeof input.rawBody === 'string') {
    // Vercel log drains sign with HMAC-SHA1; accept sha256 too for flexibility.
    const normalized = signature.replace(/^sha(1|256)=/i, '')
    if (safeEqual(normalized, hmacHex('sha1', secret, input.rawBody))) return true
    if (safeEqual(normalized, hmacHex('sha256', secret, input.rawBody))) return true
  }

  return false
}
