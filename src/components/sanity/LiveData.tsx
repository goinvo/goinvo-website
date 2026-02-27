'use client'

import { useState, useEffect, useRef } from 'react'
import { refetchQuery } from '@/lib/sanity-actions'
import type { QueryParams } from '@sanity/client'

/**
 * Hook that provides live-updating Sanity data without full-page re-renders.
 *
 * On first render it returns `initialData` (server-fetched). When a
 * `sanity:mutation` event fires (dispatched by ThrottledSanityLiveClient),
 * it calls the `refetchQuery` server action to get fresh data and triggers
 * a re-render of only the component that called this hook.
 */
export function useLiveData<T>(
  initialData: T,
  query: string,
  params?: QueryParams,
): T {
  const [data, setData] = useState<T>(initialData)
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Keep data in sync if initialData changes (e.g. navigation)
  useEffect(() => {
    setData(initialData)
  }, [initialData])

  useEffect(() => {
    const handler = async () => {
      try {
        const result = await refetchQuery(query, paramsRef.current)
        setData(result as T)
      } catch (err) {
        console.error('useLiveData refetch failed:', err)
      }
    }

    window.addEventListener('sanity:mutation', handler)
    return () => window.removeEventListener('sanity:mutation', handler)
  }, [query])

  return data
}
