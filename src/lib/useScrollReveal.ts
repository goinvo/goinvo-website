'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

/**
 * Scroll-reveal state that never hides first-screen content behind JavaScript.
 *
 * The server HTML renders the content visible (callers pass initial={false}), so text
 * and images above the fold paint without waiting for hydration. After mount, content
 * already on screen stays as it is; content that starts off screen is hidden there,
 * unseen, and `shown` flips to true as it scrolls into view. `instant` is true while
 * hiding, so the hide is a jump nobody sees rather than a fade.
 *
 * Found 2026-09-28: every scroll reveal shipped at opacity 0 until hydration, which held
 * back case-study titles and intros (see scripts/check-hidden-until-hydration.mjs).
 */
export function useScrollReveal<T extends Element>({
  once = true,
  margin = '-60px',
}: { once?: boolean; margin?: string } = {}) {
  const ref = useRef<T>(null)
  const isInView = useInView(ref, { once, margin: margin as `${number}px` })
  const [startedOffScreen, setStartedOffScreen] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.top >= window.innerHeight || rect.bottom <= 0) setStartedOffScreen(true)
  }, [])

  const shown = !startedOffScreen || isInView
  return { ref, shown, instant: !shown }
}
