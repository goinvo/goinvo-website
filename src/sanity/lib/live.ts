import { defineLive } from 'next-sanity'
import { client } from './client'
import { projectId, readToken } from '../env'

export const token = readToken || undefined

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

export const _SanityLive = live.SanityLive
