/**
 * Reading registry records over the network.
 *
 * Kept apart from the pure rules so the thresholds stay testable without a
 * network, and so this file can be the only place that has to be careful about
 * timeouts and failure.
 *
 * Never throws. A registry being briefly unreachable must not fail the weekly
 * tick — but it must not be silently treated as "fine" either, so a failed
 * lookup comes back as `unknown` and gets reported as something to check by
 * hand.
 */
import { assessDomain, expiryFromRdap, rdapUrlFor, watchedDomains, type DomainStatus, type RdapPayload } from './domainWatch'

const TIMEOUT_MS = 8000

async function fetchExpiry(domain: string): Promise<{ expiresAt: string | null; error?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(rdapUrlFor(domain), {
      signal: controller.signal,
      headers: { accept: 'application/rdap+json' },
      // The fallback endpoint answers with a redirect to the registry.
      redirect: 'follow',
    })
    if (!response.ok) return { expiresAt: null, error: `registry returned ${response.status}` }
    const payload = (await response.json()) as RdapPayload
    const expiresAt = expiryFromRdap(payload)
    return expiresAt ? { expiresAt } : { expiresAt: null, error: 'no expiry in the registry record' }
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'timed out' : 'lookup failed'
    return { expiresAt: null, error: reason }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Check every watched domain.
 *
 * Free and keyless: RDAP is the registries' own service, there is no vendor,
 * no account and no model in the path. A handful of domains once a week is
 * nowhere near any published rate limit.
 */
export async function checkWatchedDomains(now: Date = new Date()): Promise<DomainStatus[]> {
  const domains = watchedDomains()
  const results = await Promise.all(
    domains.map(async (domain) => {
      const { expiresAt, error } = await fetchExpiry(domain)
      return assessDomain({ domain, expiresAt, error }, now)
    }),
  )
  return results
}
