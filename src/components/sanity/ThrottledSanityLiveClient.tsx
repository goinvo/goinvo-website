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
 * In draft mode (Presentation Tool): only dispatches DOM events so
 * useLiveData hooks refetch their own data. No server-side revalidation
 * (which would POST to the Studio page and cause reloads).
 *
 * In production: also does debounced revalidateTag calls so the
 * Next.js ISR cache updates when published content changes.
 */
export function ThrottledSanityLiveClient(props: Props) {
  const eventTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const revalidateTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const isDraftMode = props.draftModeEnabled

  const handleSyncTags = useCallback(async (tags: SyncTag[]) => {
    // Fast path: dispatch DOM event (debounced 300ms) for useLiveData hooks
    if (eventTimeoutRef.current) clearTimeout(eventTimeoutRef.current)
    eventTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sanity:mutation'))
    }, 300)

    // Slow path: debounced cache revalidation — only in production mode.
    // In draft mode, useLiveData handles updates via DOM events and
    // revalidateTag would POST to the Studio page causing reloads.
    if (!isDraftMode) {
      if (revalidateTimeoutRef.current) clearTimeout(revalidateTimeoutRef.current)
      revalidateTimeoutRef.current = setTimeout(() => {
        revalidateSanityTags(tags as string[]).catch(() => {
          // Ignore revalidation errors
        })
      }, DEBOUNCE_MS)
    }
  }, [isDraftMode])

  return (
    <SanityLiveClientComponent
      {...props}
      requestTag="next-loader.live"
      revalidateSyncTags={handleSyncTags}
    />
  )
}
