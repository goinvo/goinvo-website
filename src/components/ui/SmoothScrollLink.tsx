'use client'

import type { ReactNode, MouseEvent, CSSProperties } from 'react'

interface SmoothScrollLinkProps {
  /** In-page target, e.g. "#book". Non-hash hrefs fall back to normal navigation. */
  href: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Anchor that smoothly slides to an in-page target instead of the browser's
 * instant hash jump — the same behavior as the 2026 homepage concept CTAs
 * (see HomeConceptCtaLink). Honors prefers-reduced-motion and updates the URL
 * hash without adding a history entry. Pair with `scroll-margin-top` on the
 * target so it lands below the sticky site header.
 */
export function SmoothScrollLink({ href, className, style, children }: SmoothScrollLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      !href.startsWith('#') ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    const target = document.getElementById(href.slice(1))
    if (!target) return
    event.preventDefault()
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' })
    const hadTabIndex = target.hasAttribute('tabindex')
    if (!hadTabIndex) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
    if (!hadTabIndex) {
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
    }
    window.history.replaceState(null, '', href)
  }

  return (
    <a href={href} className={className} style={style} onClick={handleClick}>
      {children}
    </a>
  )
}
