'use client'

import { useEffect } from 'react'
import { trackExternalLink } from '@/lib/analytics'

export function ExternalLinkTracker() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return

      const href = anchor.href
      if (!href) return

      const isMailto = href.startsWith('mailto:')
      const isExternal =
        href.startsWith('http') &&
        !href.includes(window.location.hostname) &&
        !href.includes('goinvo.com')

      if (isExternal || isMailto) {
        trackExternalLink({
          url: href,
          text: anchor.textContent?.trim() || '',
          location: window.location.pathname,
        })
      }
    }

    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])

  return null
}
