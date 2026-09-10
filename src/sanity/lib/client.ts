import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId, readToken, studioUrl } from '../env'

const isSanityConfigured = !!projectId

/**
 * The site's read client.
 *
 * `SANITY_API_READ_TOKEN` is what lets the public site keep rendering once the
 * dataset is switched to PRIVATE. Without it, published content is fetched
 * anonymously — which works only while the dataset is world-readable, and that
 * also exposes internal marketing documents (calendar, research, campaigns) to
 * anyone holding the project id from our JS bundle.
 *
 * Two details this configuration must not get wrong:
 *  - `perspective: 'published'` — an authenticated client would otherwise
 *    default to a perspective that can return draft documents, quietly
 *    publishing unfinished work. Draft previews still work: defineLive()
 *    overrides the perspective per request when draft mode is on.
 *  - the CDN is used only for anonymous reads; authenticated reads go direct,
 *    which is the unambiguously correct pairing for a private dataset.
 *
 * Server-only: every importer of this module is a server component, route
 * handler, or server action, so the token is never bundled for the browser.
 */
export const client = createClient({
  projectId: projectId || 'not-configured',
  dataset,
  apiVersion,
  useCdn: isSanityConfigured && !readToken,
  token: readToken || undefined,
  perspective: 'published',
  stega: isSanityConfigured
    ? { studioUrl }
    : false,
})
