import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId, readToken, studioUrl } from '../env'

const isSanityConfigured = !!projectId

/**
 * The site's read client. With a read token it can read a private dataset (task_1008: the production dataset goes
 * private), so it pins the published perspective — an authenticated client would otherwise see drafts. Draft previews
 * are unaffected: defineLive() overrides the perspective per request in draft mode, and the preview-only clients set
 * their own. CDN only for anonymous reads. With no token set this behaves exactly as before.
 */
export const client = createClient({
  projectId: projectId || 'not-configured',
  dataset,
  apiVersion,
  useCdn: isSanityConfigured && !readToken,
  ...(readToken ? { token: readToken, perspective: 'published' as const } : {}),
  stega: isSanityConfigured
    ? { studioUrl }
    : false,
})
