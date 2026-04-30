import { defineLive } from 'next-sanity'
import { client } from './client'
import { previewToken, projectId, readToken } from '../env'

export const serverToken = previewToken || undefined
export const browserToken = readToken || undefined

const live = defineLive({
  client,
  serverToken,
  browserToken,
})

/**
 * Wraps the defineLive sanityFetch to gracefully handle unconfigured Sanity.
 * Returns empty data when no project ID is set.
 */
export const sanityFetch: typeof live.sanityFetch = projectId
  ? live.sanityFetch
  : async () => ({ data: [] as never, sourceMap: null, tags: [] })

export const _SanityLive = live.SanityLive
