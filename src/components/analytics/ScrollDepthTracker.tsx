'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackScrollDepth } from '@/lib/analytics'

const MILESTONES = [25, 50, 75, 100]

export function ScrollDepthTracker() {
  const pathname = usePathname()
  const reached = useRef(new Set<number>())

  useEffect(() => {
    reached.current = new Set()
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return

      const percent = Math.round((scrollTop / docHeight) * 100)

      for (const milestone of MILESTONES) {
        if (percent >= milestone && !reached.current.has(milestone)) {
          reached.current.add(milestone)
          trackScrollDepth({ percent: milestone, page_path: pathname })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  return null
}
