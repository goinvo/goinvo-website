'use client'

import { useEffect } from 'react'
import { PREVIEW_SESSION_HASH, PREVIEW_SESSION_STORAGE_KEY } from '@/lib/draftPreview'

/**
 * Decides whether a page rendered in draft mode OUTSIDE the Studio's
 * Presentation iframe should keep showing drafts.
 *
 * Kept: tabs that arrived through /api/draft-mode/enable (Presentation
 * "Share" links, "open preview in new tab"). The enable route tags its
 * redirect with #sanity-preview; we promote that to a per-tab sessionStorage
 * marker so draft mode survives navigation within the tab.
 *
 * Killed: any other tab — a draft-mode cookie left over from a Studio
 * Presentation session must not leak draft content into normal browsing.
 * sessionStorage is per-tab, so a share-link tab and a stale normal tab can
 * share the same cookie yet be told apart.
 */
export function DraftModeGuard() {
  useEffect(() => {
    // Inside the Presentation iframe the tool manages draft mode itself
    if (window.self !== window.top) return

    // Never disable draft mode on Studio pages
    if (window.location.pathname.startsWith('/studio')) return

    if (window.location.hash === `#${PREVIEW_SESSION_HASH}`) {
      // Best-effort: with sessionStorage blocked the landing page still
      // previews, but draft mode drops on the next navigation in this tab.
      try {
        sessionStorage.setItem(PREVIEW_SESSION_STORAGE_KEY, '1')
      } catch {}
      history.replaceState(null, '', window.location.pathname + window.location.search)
      return
    }

    try {
      if (sessionStorage.getItem(PREVIEW_SESSION_STORAGE_KEY) === '1') return
    } catch {}

    // Not a preview-session tab — the draft cookie is stale, disable it
    fetch('/api/draft-mode/disable', { redirect: 'manual' }).then(() => {
      window.location.reload()
    })
  }, [])

  return null
}
