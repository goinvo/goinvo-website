/**
 * Server-side URL policy for the marketing SEO tools.
 *
 * These tools fetch and render user-supplied URLs, so accepting every http(s)
 * destination would turn the API into an SSRF proxy. Production is restricted
 * to the GoInvo origins by default. Extra exact hosts may be configured through
 * MARKETING_SEO_ALLOWED_HOSTS; a leading "*." explicitly opts into subdomains.
 * Localhost is available only in non-production with an explicit opt-in.
 */

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const DEFAULT_ALLOWED_HOSTS = ['goinvo.com', 'www.goinvo.com'] as const
const MAX_REDIRECTS = 5

export const SEO_RESPONSE_MAX_BYTES = 2 * 1024 * 1024

export class SeoTargetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeoTargetError'
  }
}

function configuredHosts(): string[] {
  const configured = (process.env.MARKETING_SEO_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ''))
    .filter(Boolean)
  return configured.length > 0 ? configured : [...DEFAULT_ALLOWED_HOSTS]
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function isNonPublicIpv4(address: string): boolean {
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return true
  }
  const [a, b, c] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  )
}

function isNonPublicIp(address: string): boolean {
  const version = isIP(address)
  if (version === 4) return isNonPublicIpv4(address)
  if (version !== 6) return true

  const normalized = address.toLowerCase()
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isNonPublicIpv4(mapped[1])
  if (normalized === '::' || normalized === '::1') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (/^fe[89ab]/.test(normalized) || normalized.startsWith('ff')) return true
  if (normalized.startsWith('2001:db8:')) return true

  // Public unicast IPv6 is currently allocated from 2000::/3.
  const first = Number.parseInt(normalized.split(':')[0] || '', 16)
  return !Number.isFinite(first) || first < 0x2000 || first > 0x3fff
}

function isLocalOrReservedHostname(hostname: string): boolean {
  const blockedSuffixes = ['.localhost', '.local', '.internal', '.home.arpa']
  return (
    isLocalHostname(hostname) ||
    hostname === 'metadata.google.internal' ||
    blockedSuffixes.some((suffix) => hostname.endsWith(suffix))
  )
}

/**
 * Resolve an arbitrary subresource host and reject private, loopback,
 * link-local, documentation, multicast, and otherwise reserved destinations.
 * Used by the Puppeteer request interceptor to prevent DNS-based SSRF.
 */
export async function assertPublicNetworkUrl(raw: string): Promise<void> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new SeoTargetError('Invalid outbound resource URL.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SeoTargetError('Only http and https resources are allowed.')
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (isLocalOrReservedHostname(hostname)) {
    throw new SeoTargetError('Local and private-network resources are not allowed.')
  }
  if (isIP(hostname)) {
    if (isNonPublicIp(hostname)) throw new SeoTargetError('Private-network resources are not allowed.')
    return
  }

  let timeout: ReturnType<typeof setTimeout> | undefined
  const addresses = await Promise.race([
    lookup(hostname, { all: true, verbatim: true }),
    new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => reject(new SeoTargetError('DNS validation timed out.')), 1500)
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout)
  })
  if (addresses.length === 0 || addresses.some(({ address }) => isNonPublicIp(address))) {
    throw new SeoTargetError('The resource resolves to a private or reserved network address.')
  }
}

function localDevelopmentIsAllowed(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.MARKETING_SEO_ALLOW_LOCALHOST === 'true'
  )
}

function matchesAllowedHost(hostname: string, rule: string): boolean {
  if (rule.startsWith('*.')) {
    const suffix = rule.slice(2)
    return Boolean(suffix) && hostname.endsWith(`.${suffix}`) && hostname !== suffix
  }
  return hostname === rule
}

/**
 * Parse and enforce the SEO target policy. Returns a canonical URL string.
 * IP literals, credentials, non-standard ports, and non-allowlisted hosts are
 * rejected before any network work begins.
 */
export function validateSeoTargetUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new SeoTargetError('Enter a valid absolute URL.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SeoTargetError('Only http and https URLs can be audited.')
  }
  if (url.username || url.password) {
    throw new SeoTargetError('URLs containing credentials are not allowed.')
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!hostname) throw new SeoTargetError('The URL must include a hostname.')

  if (isLocalHostname(hostname)) {
    if (!localDevelopmentIsAllowed()) {
      throw new SeoTargetError('Local and private-network URLs are not allowed.')
    }
  } else {
    // URL.hostname removes IPv6 brackets. Any remaining colon, or an all-numeric
    // dotted host, is an IP literal. SEO targets must be named, owned origins.
    const isIpLiteral = hostname.includes(':') || /^\d+(?:\.\d+){1,3}$/.test(hostname)
    if (isIpLiteral) {
      throw new SeoTargetError('IP-address targets are not allowed.')
    }

    if (isLocalOrReservedHostname(hostname)) {
      throw new SeoTargetError('Local and private-network URLs are not allowed.')
    }

    if (!configuredHosts().some((rule) => matchesAllowedHost(hostname, rule))) {
      throw new SeoTargetError(
        `SEO audits are restricted to approved hosts (${configuredHosts().join(', ')}).`,
      )
    }
  }

  const defaultPort =
    !url.port || (url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')
  if (!defaultPort && !isLocalHostname(hostname)) {
    throw new SeoTargetError('Non-standard ports are not allowed for SEO targets.')
  }

  url.hostname = hostname
  url.hash = ''
  return url.toString()
}

/** Fetch an approved SEO URL while validating every redirect destination. */
export async function fetchSeoResource(
  rawUrl: string,
  init: RequestInit = {},
): Promise<Response> {
  let current = validateSeoTargetUrl(rawUrl)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(current, { ...init, redirect: 'manual' })
    if (response.status < 300 || response.status >= 400) return response

    const location = response.headers.get('location')
    if (!location) return response
    if (redirects === MAX_REDIRECTS) {
      throw new SeoTargetError(`The URL redirected more than ${MAX_REDIRECTS} times.`)
    }
    current = validateSeoTargetUrl(new URL(location, current).toString())
  }

  throw new SeoTargetError('The URL could not be fetched safely.')
}

/** Read a response body without allowing an origin to exhaust server memory. */
export async function readResponseTextLimited(
  response: Response,
  maxBytes = SEO_RESPONSE_MAX_BYTES,
): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new SeoTargetError(`The response is larger than the ${maxBytes}-byte audit limit.`)
  }

  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {})
        throw new SeoTargetError(`The response is larger than the ${maxBytes}-byte audit limit.`)
      }
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally {
    reader.releaseLock()
  }
}
