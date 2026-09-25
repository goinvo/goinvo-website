'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The rendered width of an element, so a chart draws at real pixels (text
 * stays 12px on a phone instead of shrinking with a viewBox). Server renders
 * and the first paint use `fallback`.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const next = Math.round(element.getBoundingClientRect().width)
      if (next > 0) setWidth((current) => (Math.abs(current - next) >= 1 ? next : current))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}
