import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId, studioUrl } from '../env'

const isSanityConfigured = !!projectId

export const client = createClient({
  projectId: projectId || 'not-configured',
  dataset,
  apiVersion,
  useCdn: isSanityConfigured,
  stega: isSanityConfigured
    ? { studioUrl }
    : false,
})
