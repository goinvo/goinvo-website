/**
 * Fail-closed API key authentication for the marketing CMS API.
 *
 * The expected key comes from the MARKETING_API_KEY env var. If that var is
 * unset (or the provided key does not match), every request is rejected — an
 * unconfigured deployment exposes nothing. The provided key may arrive either as
 * a bearer token in the Authorization header or in the x-marketing-api-key
 * header.
 */

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
