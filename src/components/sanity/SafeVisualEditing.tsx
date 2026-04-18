'use client'

import { VisualEditing } from 'next-sanity'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Wraps next-sanity's VisualEditing with a custom refresh handler.
 *
 * The default handler calls revalidatePath('/', 'layout') (purges the
 * entire data cache) when livePreviewEnabled is false. Even our earlier
 * router.refresh() fallback was still too aggressive for Presentation:
 * repeated mutations during typing could hammer the preview route and
 * stall the Studio.
 *
 * Our custom handler:
 * - Manual refresh (user clicks Refresh): router.refresh() (soft RSC re-render)
 * - Any mutation-driven refresh: skip and let the page's live data hooks
 *   settle before updating
 */
export function SafeVisualEditing() {
  const router = useRouter()

  const handleRefresh = useCallback(
    (payload: { source: 'manual' | 'mutation'; livePreviewEnabled: boolean }) => {
      if (payload.source === 'mutation') {
        // Prevent per-keystroke refresh storms in the Presentation iframe.
        return false
      }

      // Manual refresh still forces a soft re-render on demand.
      router.refresh()
      return Promise.resolve()
    },
    [router],
  )

  return <VisualEditing refresh={handleRefresh} />
}
