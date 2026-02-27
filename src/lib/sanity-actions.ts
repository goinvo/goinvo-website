'use server'

import { client } from '@/sanity/lib/client'
import { draftMode } from 'next/headers'
import type { QueryParams } from '@sanity/client'

/**
 * Server action that fetches a GROQ query directly from the Sanity API,
 * bypassing Next.js data cache. Used by <LiveData> to get fresh draft content
 * without triggering a full-page RSC re-render.
 */
export async function refetchQuery(query: string, params?: QueryParams) {
  const { isEnabled } = await draftMode()

  return client
    .withConfig({
      token: process.env.SANITY_API_READ_TOKEN,
      useCdn: false,
      perspective: isEnabled ? 'drafts' : 'published',
    })
    .fetch(query, params ?? {})
}
