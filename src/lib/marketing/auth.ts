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
import { isOutreachWriterRole } from '@/lib/marketing/outreachEnums'
import { readValidOutreachSessionCookie } from '@/lib/marketing/outreachSession'

// Marketing routes operate with the server's Sanity write token after this
// check. A valid Studio login alone is therefore not sufficient: passing a
// Viewer or Contributor session through would silently elevate that member to
// the service token's privileges. Keep this list deliberately narrower than
// "every project member" and aligned with Sanity's write-capable built-in
// project roles.
type SanitySessionUser = {
  id?: unknown
  /** Current Sanity /users/me responses expose the project role here. */
  role?: unknown
  /** Also accept the richer current-user shape used by some Sanity clients. */
  roles?: unknown
}

/** Thrown when a request does not present a valid marketing API key. */
export class MarketingAuthError extends Error {
  readonly status: number

  constructor(message = 'Unauthorized: invalid or missing marketing credentials.', status = 401) {
    super(message)
    this.name = 'MarketingAuthError'
    this.status = status
  }
}

/** A real Studio member who is authenticated but cannot use write-token-backed operations. */
export class MarketingPermissionError extends MarketingAuthError {
  constructor(message = 'Forbidden: your Studio role cannot perform this marketing operation.') {
    super(message, 403)
    this.name = 'MarketingPermissionError'
  }
}

/** Extract candidate keys without allowing one malformed header to hide another valid one. */
function readProvidedKeys(req: Request): string[] {
  const keys: string[] = []
  const authorization = req.headers.get('authorization')
  if (authorization) {
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    const token = (match ? match[1] : authorization).trim()
    if (token) keys.push(token)
  }

  const headerKey = req.headers.get('x-marketing-api-key')
  if (headerKey) {
    const trimmed = headerKey.trim()
    if (trimmed) keys.push(trimmed)
  }

  return keys
}

/**
 * Asserts the request carries a valid marketing API key. Throws MarketingAuthError
 * when MARKETING_API_KEY is unset or the provided key does not match (fail closed).
 */
export function assertMarketingApiKey(req: Request): void {
  const expected = process.env.MARKETING_API_KEY
  const provided = readProvidedKeys(req)

  if (!expected || !provided.includes(expected)) {
    throw new MarketingAuthError()
  }
}

/** True when the request presents a valid MARKETING_API_KEY (same rule as assertMarketingApiKey). */
function hasValidApiKey(req: Request): boolean {
  const expected = process.env.MARKETING_API_KEY
  if (!expected) return false
  return readProvidedKeys(req).includes(expected)
}

/**
 * Extract role names from both Sanity current-user response shapes. This is
 * intentionally strict: malformed entries never become an authorization grant.
 */
function readSanityRoleNames(user: SanitySessionUser): string[] {
  const names: string[] = []
  if (typeof user.role === 'string') names.push(user.role)

  if (Array.isArray(user.roles)) {
    for (const entry of user.roles) {
      if (typeof entry === 'string') names.push(entry)
      else if (entry && typeof entry === 'object' && 'name' in entry) {
        const name = (entry as { name?: unknown }).name
        if (typeof name === 'string') names.push(name)
      }
    }
  }

  return names.map((name) => name.trim().toLowerCase()).filter(Boolean)
}

/**
 * Validates a Sanity user session against the project's users/me endpoint.
 * Authorization is intentionally handled by the calling guard: ordinary
 * marketing reads accept any project member, while private write-token-backed
 * Outreach operations additionally check the member's role.
 */
async function readSanitySessionUser(token: string): Promise<SanitySessionUser | null> {
  const trimmed = token.trim()
  if (!trimmed || !projectId) return null
  try {
    const res = await fetch(`https://${projectId}.api.sanity.io/v2021-06-07/users/me`, {
      headers: { Authorization: `Bearer ${trimmed}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const user = (await res.json()) as SanitySessionUser | null
    if (!user || typeof user !== 'object' || typeof user.id !== 'string' || !user.id.trim()) {
      return null
    }
    return user
  } catch {
    return null
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
  if (session && (await readSanitySessionUser(session))) return

  throw new MarketingAuthError()
}

/**
 * Guard for routes that continue with the server write token against private
 * Outreach data. A valid Studio identity is required first, then a built-in
 * write-capable role; insufficient roles receive a truthful 403.
 */
export async function assertStudioWriterOrApiKey(req: Request): Promise<void> {
  if (hasValidApiKey(req)) return

  // Cookie-mode Studio auth does not expose a bearer token to JavaScript. The
  // short-lived cookie is issued only after the server consumes a one-time
  // private-dataset proof and verifies its Sanity transaction author.
  const cookieSession = readValidOutreachSessionCookie(req)
  if (cookieSession && isOutreachWriterRole(cookieSession.role)) return

  const session = req.headers.get('x-sanity-session')
  if (!session) throw new MarketingAuthError()
  const user = await readSanitySessionUser(session)
  if (!user) throw new MarketingAuthError()
  if (readSanityRoleNames(user).some(isOutreachWriterRole)) return

  throw new MarketingPermissionError()
}
