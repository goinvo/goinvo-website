'use client'

import { startTransition, useEffect, useRef, useState } from 'react'
import { refetchQuery } from '@/lib/sanity-actions'
import type { QueryParams } from '@sanity/client'

const LIVE_REFETCH_DEBOUNCE_MS = 1200

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const requestVersionRef = useRef(0)
  const mountedRef = useRef(false)
  paramsRef.current = params

  // Keep data in sync if initialData changes (e.g. navigation)
  useEffect(() => {
    requestVersionRef.current += 1
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
    setData(initialData)
  }, [initialData])

  useEffect(() => {
    mountedRef.current = true

    const handler = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(async () => {
        const requestVersion = requestVersionRef.current + 1
        requestVersionRef.current = requestVersion

        try {
          const result = await refetchQuery(query, paramsRef.current)
          if (!mountedRef.current || requestVersion !== requestVersionRef.current) {
            return
          }

          startTransition(() => {
            setData(result as T)
          })
        } catch (err) {
          console.error('useLiveData refetch failed:', err)
        }
      }, LIVE_REFETCH_DEBOUNCE_MS)
    }

    window.addEventListener('sanity:mutation', handler)
    return () => {
      mountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = undefined
      }
      window.removeEventListener('sanity:mutation', handler)
    }
  }, [query])

  return data
}
