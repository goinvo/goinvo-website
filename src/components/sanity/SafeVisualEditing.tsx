'use client'

import { VisualEditing } from 'next-sanity'
import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'

/**
 * Wraps next-sanity's VisualEditing with a custom refresh handler.
 *
 * The default handler calls revalidatePath('/', 'layout') (purges the
 * entire data cache) which is too aggressive for Presentation.
 *
 * Our custom handler:
 * - Manual refresh: router.refresh() (soft RSC re-render) immediately.
 * - Mutation-driven refresh: debounced router.refresh() so server
 *   components (e.g. vision pages) re-render after edits settle. The
 *   debounce prevents per-keystroke refresh storms while still giving
 *   server-rendered pages live updates.
 */
const MUTATION_REFRESH_DEBOUNCE_MS = 1500

export function SafeVisualEditing() {
  const router = useRouter()
  const mutationTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleRefresh = useCallback(
    (payload: { source: 'manual' | 'mutation'; livePreviewEnabled: boolean }) => {
      if (payload.source === 'mutation') {
        if (mutationTimeoutRef.current) {
          clearTimeout(mutationTimeoutRef.current)
        }
        mutationTimeoutRef.current = setTimeout(() => {
          router.refresh()
        }, MUTATION_REFRESH_DEBOUNCE_MS)
        return false
      }

      router.refresh()
      return Promise.resolve()
    },
    [router],
  )

  return <VisualEditing refresh={handleRefresh} />
}
