'use client'

import { VisualEditing } from 'next-sanity'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'
import { createDebouncedRefresh } from './refreshScheduler'

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
 *   returned promise lets Presentation perform its extra consistency
 *   refresh instead of assuming live loaders handled everything already.
 */
const MUTATION_REFRESH_DEBOUNCE_MS = 1500

export function SafeVisualEditing() {
  const router = useRouter()
  const mutationRefresh = useMemo(
    () => createDebouncedRefresh(() => router.refresh(), MUTATION_REFRESH_DEBOUNCE_MS),
    [router],
  )

  useEffect(() => () => {
    mutationRefresh.cancel()
  }, [mutationRefresh])

  const handleRefresh = useCallback(
    (payload: { source: 'manual' | 'mutation'; livePreviewEnabled: boolean }) => {
      if (payload.source === 'mutation') {
        return mutationRefresh.schedule()
      }

      router.refresh()
      return Promise.resolve()
    },
    [mutationRefresh, router],
  )

  return <VisualEditing refresh={handleRefresh} />
}
