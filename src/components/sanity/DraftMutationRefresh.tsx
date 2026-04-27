'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { createDebouncedRefresh } from './refreshScheduler'

const MUTATION_REFRESH_DEBOUNCE_MS = 900

export function DraftMutationRefresh() {
  const router = useRouter()
  const refresh = useMemo(
    () => createDebouncedRefresh(() => router.refresh(), MUTATION_REFRESH_DEBOUNCE_MS),
    [router],
  )

  useEffect(() => {
    const handleMutation = () => {
      void refresh.schedule().catch((error) => {
        console.error('Draft mutation refresh failed:', error)
      })
    }

    window.addEventListener('sanity:mutation', handleMutation)
    return () => {
      window.removeEventListener('sanity:mutation', handleMutation)
      refresh.cancel()
    }
  }, [refresh])

  return null
}
