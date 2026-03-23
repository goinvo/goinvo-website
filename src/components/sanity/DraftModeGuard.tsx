'use client'

import { useEffect } from 'react'

/**
 * Auto-disables draft mode when the page is NOT loaded inside an iframe
 * (i.e., not in the Sanity Studio Presentation tab).
 *
 * This prevents stale draft-mode cookies from leaking draft content
 * into normal site browsing after a Presentation session.
 */
export function DraftModeGuard() {
  useEffect(() => {
    // If we're inside an iframe (Presentation tool preview), keep draft mode on
    if (window.self !== window.top) return

    // Never disable draft mode on Studio pages — the Presentation tool manages it
    if (window.location.pathname.startsWith('/studio')) return

    // Not in an iframe and not in Studio — draft mode cookie is stale, disable it
    fetch('/api/draft-mode/disable', { redirect: 'manual' }).then(() => {
      window.location.reload()
    })
  }, [])

  return null
}
