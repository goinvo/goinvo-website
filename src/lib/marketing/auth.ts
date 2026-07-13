/**
 * Fail-closed API key authentication for the marketing CMS API.
 *
 * The expected key comes from the MARKETING_API_KEY env var. If that var is
 * unset (or the provided key does not match), every request is rejected — an
 * unconfigured deployment exposes nothing. The provided key may arrive either as
 * a bearer token in the Authorization header or in the x-marketing-api-key
 * header.
 */

import { projectId } from '@/sanity/env'

/** Thrown when a request does not present a valid marketing API key. */
export class MarketingAuthError extends Error {
  constructor(message = 'Unauthorized: invalid or missing marketing API key.') {
    super(message)
    this.name = 'MarketingAuthError'
  }
}

/** Extracts the candidate key from the Authorization bearer or x-marketing-api-key header. */
function readProvidedKey(req: Request): string | undefined {
  const authorization = req.headers.get('authorization')
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    const token = (match ? match[1] : authorization).trim()
    if (token) return token
  }

  const headerKey = req.headers.get('x-marketing-api-key')
  if (headerKey) {
    const trimmed = headerKey.trim()
    if (trimmed) return trimmed
  }

  return undefined
}

/**
 * Asserts the request carries a valid marketing API key. Throws MarketingAuthError
 * when MARKETING_API_KEY is unset or the provided key does not match (fail closed).
 */
export function assertMarketingApiKey(req: Request): void {
  const expected = process.env.MARKETING_API_KEY
  const provided = readProvidedKey(req)

  if (!expected || provided !== expected) {
    throw new MarketingAuthError()
  }
}

/** True when the request presents a valid MARKETING_API_KEY (same rule as assertMarketingApiKey). */
function hasValidApiKey(req: Request): boolean {
  const expected = process.env.MARKETING_API_KEY
  if (!expected) return false
  return readProvidedKey(req) === expected
}

/**
 * Validates a Sanity user session token against the project's users/me endpoint.
 * Returns true only when Sanity replies 200 with a user object (a real, logged-in
 * Studio user). Any network error, non-200, or empty token fails closed.
 */
async function validateSanitySession(token: string): Promise<boolean> {
  const trimmed = token.trim()
  if (!trimmed || !projectId) return false
  try {
    const res = await fetch(`https://${projectId}.api.sanity.io/v2021-06-07/users/me`, {
      headers: { Authorization: `Bearer ${trimmed}` },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const user = (await res.json()) as { id?: string } | null
    return Boolean(user && typeof user === 'object' && user.id)
  } catch {
    return false
  }
}

/**
 * Fail-closed guard for protected marketing routes that are called either server-to-server
 * (with MARKETING_API_KEY) OR client-side from the Sanity Studio by a logged-in
 * user. Passes when EITHER a valid marketing API key is present OR an
 * `x-sanity-session` header carries a token that validates against Sanity.
 * Throws MarketingAuthError otherwise.
 */
export async function assertStudioOrApiKey(req: Request): Promise<void> {
  if (hasValidApiKey(req)) return

  const session = req.headers.get('x-sanity-session')
  if (session && (await validateSanitySession(session))) return

  throw new MarketingAuthError()
}
