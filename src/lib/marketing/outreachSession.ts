import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  OUTREACH_SESSION_AUDIENCE,
  OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS,
  OUTREACH_SESSION_COOKIE_NAME,
  OUTREACH_SESSION_SECRET_ENV,
} from '@/lib/marketing/outreachSessionContract'

export {
  OUTREACH_SESSION_AUDIENCE,
  OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS,
  OUTREACH_SESSION_COOKIE_NAME,
  OUTREACH_SESSION_SECRET_ENV,
} from '@/lib/marketing/outreachSessionContract'

const OUTREACH_SESSION_TOKEN_VERSION = 'v1'
const MAX_CLOCK_SKEW_MS = 30_000
const MIN_SIGNING_SECRET_BYTES = 32

export type OutreachSessionClaims = {
  v: 1
  aud: typeof OUTREACH_SESSION_AUDIENCE
  sub: string
  role: string
  iat: number
  exp: number
}

export class OutreachSessionConfigurationError extends Error {
  constructor(
    message = `${OUTREACH_SESSION_SECRET_ENV} (or MARKETING_API_KEY fallback) must contain at least ${MIN_SIGNING_SECRET_BYTES} bytes.`,
  ) {
    super(message)
    this.name = 'OutreachSessionConfigurationError'
  }
}

function signingSecret(): string | null {
  const value = process.env[OUTREACH_SESSION_SECRET_ENV] || process.env.MARKETING_API_KEY || ''
  return Buffer.byteLength(value, 'utf8') >= MIN_SIGNING_SECRET_BYTES ? value : null
}

function signatureFor(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${OUTREACH_SESSION_TOKEN_VERSION}.${encodedPayload}`)
    .digest('base64url')
}

function signaturesMatch(expected: string, provided: string): boolean {
  try {
    const expectedBytes = Buffer.from(expected, 'base64url')
    const providedBytes = Buffer.from(provided, 'base64url')
    return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
  } catch {
    return false
  }
}

export function assertOutreachSessionSigningConfigured(): void {
  if (!signingSecret()) throw new OutreachSessionConfigurationError()
}

export function issueOutreachSessionToken(
  identity: { subject: string; role: string },
  nowMs = Date.now(),
): string {
  const secret = signingSecret()
  if (!secret) throw new OutreachSessionConfigurationError()

  const iat = Math.floor(nowMs / 1000)
  const claims: OutreachSessionClaims = {
    v: 1,
    aud: OUTREACH_SESSION_AUDIENCE,
    sub: identity.subject,
    role: identity.role,
    iat,
    exp: iat + OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS,
  }
  const encodedPayload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url')
  return `${OUTREACH_SESSION_TOKEN_VERSION}.${encodedPayload}.${signatureFor(encodedPayload, secret)}`
}

export function verifyOutreachSessionToken(token: string, nowMs = Date.now()): OutreachSessionClaims | null {
  const secret = signingSecret()
  if (!secret || !token || token.length > 4096) return null

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== OUTREACH_SESSION_TOKEN_VERSION) return null
  const [, encodedPayload, providedSignature] = parts
  if (!signaturesMatch(signatureFor(encodedPayload, secret), providedSignature)) return null

  try {
    const claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<OutreachSessionClaims>
    const now = Math.floor(nowMs / 1000)
    if (
      claims.v !== 1 ||
      claims.aud !== OUTREACH_SESSION_AUDIENCE ||
      typeof claims.sub !== 'string' ||
      !claims.sub.trim() ||
      typeof claims.role !== 'string' ||
      !claims.role.trim() ||
      typeof claims.iat !== 'number' ||
      !Number.isInteger(claims.iat) ||
      typeof claims.exp !== 'number' ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= now ||
      claims.exp - claims.iat !== OUTREACH_SESSION_COOKIE_MAX_AGE_SECONDS ||
      claims.iat > now + Math.ceil(MAX_CLOCK_SKEW_MS / 1000)
    ) {
      return null
    }
    return claims as OutreachSessionClaims
  } catch {
    return null
  }
}

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue
    const value = part.slice(separator + 1).trim()
    try {
      return decodeURIComponent(value)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Cookies are accepted only on same-origin browser requests. SameSite=Strict is
 * the primary CSRF boundary; this Fetch Metadata/Origin check also rejects a
 * same-site sibling origin attempting to drive the private API.
 */
export function isSameOriginOutreachRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') return false

  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return false
    } catch {
      return false
    }
  }

  return fetchSite === 'same-origin' || Boolean(origin)
}

export function readValidOutreachSessionCookie(
  request: Request,
  nowMs = Date.now(),
): OutreachSessionClaims | null {
  if (!isSameOriginOutreachRequest(request)) return null
  const token = cookieValue(request, OUTREACH_SESSION_COOKIE_NAME)
  return token ? verifyOutreachSessionToken(token, nowMs) : null
}
