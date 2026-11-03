'use server'

import { revalidateTag } from 'next/cache'
import { client } from '@/sanity/lib/client'
import { previewToken } from '@/sanity/env'
import { caseStudyBySlugQuery, featureBySlugQuery } from '@/sanity/lib/queries'
import { draftMode } from 'next/headers'
import type { QueryParams } from '@sanity/client'
import { PUBLIC_SLUG } from './publicSlug'

/**
 * The only queries <LiveData> refetches. A server action's id ships in the public bundle, so this is callable by
 * anyone: it must never run a query the caller writes, or it reads the whole dataset with the server's token.
 */
const REFETCHABLE = new Set<string>([caseStudyBySlugQuery, featureBySlugQuery])

/**
 * Server action that fetches one of the page queries directly from the Sanity API, bypassing the Next.js data cache.
 * Used by <LiveData> to get fresh draft content without triggering a full-page RSC re-render.
 */
export async function refetchQuery(query: string, params?: QueryParams) {
  const slug = params?.slug
  const onlySlug = params ? Object.keys(params).every((key) => key === 'slug') : true
  if (!REFETCHABLE.has(query) || typeof slug !== 'string' || !PUBLIC_SLUG.test(slug) || !onlySlug) {
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

/**
 * A Sanity sync tag as the Live Content API sends it (`SyncTag` = `s1:${string}` in @sanity/client). The id is
 * base64, so '+', '/' and '=' are real characters: leaving them out silently dropped ~1 tag in 6, and a page whose
 * query carried one never refreshed after a publish.
 */
const SYNC_TAG = /^s1:[A-Za-z0-9+/=_-]{1,64}$/

/**
 * Revalidate Next.js cache tags for Sanity sync tags.
 * This triggers RSC re-renders for any sanityFetch calls that
 * were tagged with the matching sync tags.
 */
export async function revalidateSanityTags(tags: string[]) {
  const list = Array.isArray(tags) ? tags : []
  const valid = list.filter((tag) => typeof tag === 'string' && SYNC_TAG.test(tag)).slice(0, 200)
  // A dropped tag is a page that silently stays stale, so say so.
  if (valid.length < list.length) {
    console.warn(`revalidateSanityTags: ignored ${list.length - valid.length} of ${list.length} tag(s) that are not sync tags`)
  }
  if (!valid.length) return
  revalidateTag('sanity:fetch-sync-tags', { expire: 0 })
  for (const tag of valid) {
    revalidateTag(`sanity:${tag}`, { expire: 0 })
  }
}
