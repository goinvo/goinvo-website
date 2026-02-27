import { defineLive } from 'next-sanity'
import { client } from './client'
import { projectId } from '../env'

export const token = process.env.SANITY_API_READ_TOKEN

const live = defineLive({
  client,
  serverToken: token,
  browserToken: token,
})

/**
 * Wraps the defineLive sanityFetch to gracefully handle unconfigured Sanity.
 * Returns empty data when no project ID is set.
 */
export const sanityFetch: typeof live.sanityFetch = projectId
  ? live.sanityFetch
  : async () => ({ data: [] as never, sourceMap: null, tags: [] })

// SanityLive is NOT exported here — use ThrottledSanityLive instead,
// which wraps the client component with debounced revalidation to
// prevent full-page re-renders on every keystroke in the editor.
export const _SanityLive = live.SanityLive
