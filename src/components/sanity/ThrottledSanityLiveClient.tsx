'use client'

import SanityLiveClientComponent from '@sanity/next-loader/client-components/live'
import type { SanityLiveProps } from '@sanity/next-loader/client-components/live'
import { useCallback, useRef } from 'react'
import type { SyncTag } from '@sanity/client'
import { revalidateSanityTags } from '@/lib/sanity-actions'

type Props = Omit<SanityLiveProps, 'requestTag' | 'revalidateSyncTags'>

const DEBOUNCE_MS = 2000

/**
 * Wraps the SanityLive client component with debounced revalidation.
 *
 * Instead of calling revalidateTag on every keystroke, we:
 * 1. Immediately dispatch a DOM event so useLiveData hooks can refetch
 *    their own data (fast, client-side only)
 * 2. Debounce actual cache revalidation so Next.js server components
 *    also get updated — but without hammering the server
 */
export function ThrottledSanityLiveClient(props: Props) {
  const eventTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const revalidateTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSyncTags = useCallback(async (tags: SyncTag[]) => {
    // Fast path: dispatch DOM event immediately (debounced 300ms) for useLiveData hooks
    if (eventTimeoutRef.current) clearTimeout(eventTimeoutRef.current)
    eventTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sanity:mutation'))
    }, 300)

    // Slow path: debounced cache revalidation for server components
    if (revalidateTimeoutRef.current) clearTimeout(revalidateTimeoutRef.current)
    revalidateTimeoutRef.current = setTimeout(() => {
      revalidateSanityTags(tags as string[]).catch(() => {
        // Ignore revalidation errors — not critical for preview
      })
    }, DEBOUNCE_MS)
  }, [])

  return (
    <SanityLiveClientComponent
      {...props}
      requestTag="next-loader.live"
      revalidateSyncTags={handleSyncTags}
    />
  )
}
