/**
 * redirects.json → Next redirect rules. The site serves paths without a trailing slash, so a destination written
 * with one ("/vision/x/") costs every visitor a second 308; it is trimmed here, keeping any ?query or #fragment.
 */
export interface RedirectRule {
  source: string
  destination: string
  permanent: true
}

export function redirectDestination(destination: string): string {
  if (!destination.startsWith('/') || destination.startsWith('//')) return destination
  const suffixAt = destination.search(/[?#]/)
  const path = suffixAt >= 0 ? destination.slice(0, suffixAt) : destination
  const suffix = suffixAt >= 0 ? destination.slice(suffixAt) : ''
  return (path.replace(/\/+$/, '') || '/') + suffix
}

export function toRedirectRules(map: Record<string, string>): RedirectRule[] {
  return Object.entries(map).map(([source, destination]) => ({
    source: source.startsWith('/') ? source : `/${source}`,
    destination: redirectDestination(destination),
    permanent: true,
  }))
}
