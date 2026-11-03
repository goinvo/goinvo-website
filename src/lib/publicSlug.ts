/** The slugs the public site can serve and refresh: lowercase letters, digits and hyphens. */
export const PUBLIC_SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/

/**
 * Why a work or vision slug would leave its page broken or hidden, or null when it is fine. The Studio shows this
 * as an error, so the problem is caught where it is made rather than discovered on the site.
 */
export function publicSlugProblem(slug: string | undefined): string | null {
  if (!slug) return null
  if (slug.startsWith('untitled-')) {
    return 'Rename this slug: pages whose slug starts with "untitled-" are left out of every listing, Spotlight and the sitemap.'
  }
  if (!PUBLIC_SLUG.test(slug)) {
    return 'Use only lowercase letters, numbers and hyphens (live preview cannot refresh other slugs).'
  }
  return null
}
