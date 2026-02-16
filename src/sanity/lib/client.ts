import { createClient, type QueryParams } from 'next-sanity'
import { apiVersion, dataset, projectId, useCdn } from '../env'

const isSanityConfigured = !!projectId

const sanityClient = isSanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion,
      useCdn,
    })
  : null

export const client = {
  fetch: async <T>(query: string, params?: QueryParams): Promise<T> => {
    if (!sanityClient) {
      return [] as unknown as T
    }
    if (params) {
      return sanityClient.fetch<T>(query, params)
    }
    return sanityClient.fetch<T>(query)
  },
}
