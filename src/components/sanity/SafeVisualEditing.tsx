'use client'

import { VisualEditing } from 'next-sanity'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Wraps next-sanity's VisualEditing with a custom refresh handler.
 *
 * The default handler calls revalidatePath('/', 'layout') (purges the
 * entire data cache) when livePreviewEnabled is false. This causes
 * visible full-page refreshes in the Presentation Tool.
 *
 * Our custom handler:
 * - Manual refresh (user clicks Refresh): router.refresh() (soft RSC re-render)
 * - Mutation with live preview: skip (ThrottledSanityLiveClient handles it)
 * - Mutation without live preview: router.refresh() instead of nuclear option
 */
export function SafeVisualEditing() {
  const router = useRouter()

  const handleRefresh = useCallback(
    (payload: { source: 'manual' | 'mutation'; livePreviewEnabled: boolean }) => {
      if (payload.source === 'mutation' && payload.livePreviewEnabled) {
        // Live preview handles it via ThrottledSanityLiveClient → sanity:mutation event
        return false
      }
      // For manual refresh or mutation without live preview: soft re-render only
      router.refresh()
      return Promise.resolve()
    },
    [router],
  )

  return <VisualEditing refresh={handleRefresh} />
}
