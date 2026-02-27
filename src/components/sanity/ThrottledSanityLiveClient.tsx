'use client'

import SanityLiveClientComponent from '@sanity/next-loader/client-components/live'
import type { SanityLiveProps } from '@sanity/next-loader/client-components/live'
import { useCallback, useRef } from 'react'
import type { SyncTag } from '@sanity/client'

type Props = Omit<SanityLiveProps, 'requestTag' | 'revalidateSyncTags'>

const DEBOUNCE_MS = 1000

/**
 * Wraps the SanityLive client component with a custom revalidateSyncTags that
 * dispatches a DOM event instead of calling the default server action.
 *
 * This prevents full-page RSC re-renders on every Sanity mutation. Instead,
 * individual <LiveData> components listen for the event and refetch only their
 * own query via a targeted server action.
 */
export function ThrottledSanityLiveClient(props: Props) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSyncTags = useCallback(async (_tags: SyncTag[]) => {
    // Debounce rapid-fire mutations into a single event
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sanity:mutation'))
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
