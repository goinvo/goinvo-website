'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

/**
 * Scroll-aware table wrapper that adds a shadow on the sticky first column
 * when the user scrolls horizontally. Matches the Gatsby PscaTable component.
 */
export function PscaTable({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrolling, setScrolling] = useState(false)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const isScrolled = el.scrollLeft > 0
    if (isScrolled !== scrolling) {
      setScrolling(isScrolled)
    }
  }, [scrolling])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-x-auto',
        scrolling && 'psca-table--shadow'
      )}
    >
      {children}
      <style>{`
        .psca-table--shadow td:first-child,
        .psca-table--shadow th:first-child {
          box-shadow: 4px 0 8px -2px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
