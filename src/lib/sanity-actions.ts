'use server'

import { revalidateTag } from 'next/cache'
import { client } from '@/sanity/lib/client'
import { previewToken } from '@/sanity/env'
import { caseStudyBySlugQuery, featureBySlugQuery } from '@/sanity/lib/queries'
import { draftMode } from 'next/headers'
import type { QueryParams } from '@sanity/client'

/**
 * The only queries <LiveData> refetches. A server action's id ships in the public bundle, so this is callable by
 * anyone: it must never run a query the caller writes, or it reads the whole dataset with the server's token
 * (task_2160: an anonymous POST counted 20 chat threads this way).
 */
const REFETCHABLE = new Set<string>([caseStudyBySlugQuery, featureBySlugQuery])
const SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/

/**
 * Server action that fetches one of the page queries directly from the Sanity API, bypassing the Next.js data cache.
 * Used by <LiveData> to get fresh draft content without triggering a full-page RSC re-render.
 */
export async function refetchQuery(query: string, params?: QueryParams) {
  const slug = params?.slug
  const onlySlug = params ? Object.keys(params).every((key) => key === 'slug') : true
  if (!REFETCHABLE.has(query) || typeof slug !== 'string' || !SLUG.test(slug) || !onlySlug) {
    throw new Error('This query cannot be refetched.')
  }
  const { isEnabled } = await draftMode()

  return client
    .withConfig({
      token: previewToken,
      useCdn: false,
      perspective: isEnabled ? 'drafts' : 'published',
    })
    .fetch(query, { slug })
}

/** A Sanity sync tag as the Live Content API sends it (`SyncTag` = `s1:${string}` in @sanity/client). */
const SYNC_TAG = /^s1:[A-Za-z0-9_-]{1,64}$/

/**
 * Revalidate Next.js cache tags for Sanity sync tags.
 * This triggers RSC re-renders for any sanityFetch calls that
 * were tagged with the matching sync tags.
 */
export async function revalidateSanityTags(tags: string[]) {
  const valid = Array.isArray(tags) ? tags.filter((tag) => typeof tag === 'string' && SYNC_TAG.test(tag)).slice(0, 200) : []
  if (!valid.length) return
  revalidateTag('sanity:fetch-sync-tags', { expire: 0 })
  for (const tag of valid) {
    revalidateTag(`sanity:${tag}`, { expire: 0 })
  }
}
