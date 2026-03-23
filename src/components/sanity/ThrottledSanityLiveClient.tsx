'use client'

import SanityLiveClientComponent from '@sanity/next-loader/client-components/live'
import type { SanityLiveProps } from '@sanity/next-loader/client-components/live'
import { useCallback, useRef } from 'react'
import type { SyncTag } from '@sanity/client'

type Props = Omit<SanityLiveProps, 'requestTag' | 'revalidateSyncTags'>

const DEBOUNCE_MS = 2000

/**
 * Wraps the SanityLive client component with a no-op revalidateSyncTags
 * to prevent the default behavior (full-page RSC re-renders on every
 * Sanity mutation).
 *
 * Instead, it dispatches a lightweight DOM event that useLiveData hooks
 * listen for to refetch only their own data. The Presentation tool's
 * VisualEditing component handles real-time preview updates separately
 * via its own postMessage channel.
 */
export function ThrottledSanityLiveClient(props: Props) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSyncTags = useCallback(async (_tags: SyncTag[]) => {
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
