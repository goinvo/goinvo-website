'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Mounts its children once they are on screen (or near it). While the review switch
 * renders two versions of a page and CSS hides one, the hidden version never
 * intersects, so a heavy embed in it (the Calendly scheduler) never loads twice.
 */
export function WhenShown({ children, minHeight }: { children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node || shown) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setShown(true)
    }, { rootMargin: '800px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [shown])
  return <div ref={ref} style={shown ? undefined : { minHeight }}>{shown ? children : null}</div>
}
