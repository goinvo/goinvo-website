'use client'

import { usePathname } from 'next/navigation'
import { PREVIEW_SESSION_STORAGE_KEY } from '@/lib/draftPreview'

export function PreviewBanner() {
  const pathname = usePathname()

  // Explicit exit also ends this tab's preview session, otherwise the
  // DraftModeGuard marker would keep re-admitting a stale draft cookie here.
  const clearPreviewSession = () => {
    try {
      sessionStorage.removeItem(PREVIEW_SESSION_STORAGE_KEY)
    } catch {}
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-tertiary text-white px-4 py-2 flex items-center justify-between text-sm font-sans shadow-lg">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Preview Mode</span>
        <span className="hidden sm:inline opacity-70">
          — Viewing draft content
        </span>
      </div>
      <a
        href={`/api/draft-mode/disable?redirect=${encodeURIComponent(pathname)}`}
        onClick={clearPreviewSession}
        className="bg-white/15 hover:bg-white/25 text-white no-underline px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors"
      >
        Exit Preview
      </a>
    </div>
  )
}
