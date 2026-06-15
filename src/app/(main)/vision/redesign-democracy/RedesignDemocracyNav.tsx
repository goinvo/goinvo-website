'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Sticky table-of-contents scroll-nav for the Redesign Democracy article.
 *
 * The legacy page (`/features/redesign-democracy/`) had a sticky `.main-nav`
 * TOC that highlighted the active section on scroll and jumped to a section on
 * click; the Next port dropped it (the section `#section1..5` anchors survived,
 * the nav did not). This restores that behavior using the same scroll-spy +
 * sticky pattern the other ported vision pages use (digital-healthcare, zika).
 */

const SECTIONS = [
  { id: 'section1', label: '1. Intro' },
  { id: 'section2', label: '2. Origins' },
  { id: 'section3', label: '3. Better Democracy' },
  { id: 'section4', label: '4. Legislature' },
  { id: 'section5', label: '5. Digital Solution' },
]

/** Offset (px) above a section when clicking to scroll to it. */
const SCROLL_OFFSET = 120
/** Slightly more lenient line for *detecting* the active section, so a click
 *  that lands a section exactly at SCROLL_OFFSET still marks it active (avoids
 *  an off-by-one at the boundary). */
const ACTIVE_OFFSET = SCROLL_OFFSET + 8

export function RedesignDemocracyNav() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isSticky, setIsSticky] = useState(false)
  const inlineNavRef = useRef<HTMLElement>(null)

  // ---------- scroll spy + sticky ----------
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const inlineNav = inlineNavRef.current
      if (!inlineNav) return

      const navTop = inlineNav.getBoundingClientRect().top + scrollY
      const isDesktop = window.innerWidth > 768
      setIsSticky(isDesktop && scrollY >= navTop)

      const sectionEls = SECTIONS.map((s) => document.getElementById(s.id))
      let currentIdx: number | null = null

      for (let i = 0; i < sectionEls.length; i++) {
        const el = sectionEls[i]
        if (!el) continue
        const top = el.getBoundingClientRect().top + scrollY - ACTIVE_OFFSET
        if (i === sectionEls.length - 1) {
          if (scrollY >= top) currentIdx = i
        } else {
          const nextEl = sectionEls[i + 1]
          if (!nextEl) continue
          const nextTop = nextEl.getBoundingClientRect().top + scrollY
          if (scrollY >= top && scrollY < nextTop) currentIdx = i
        }
      }

      const firstEl = sectionEls[0]
      if (firstEl) {
        const firstTop =
          firstEl.getBoundingClientRect().top + scrollY - ACTIVE_OFFSET - 1
        if (scrollY < firstTop) currentIdx = null
      }

      setActiveIndex(currentIdx)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ---------- smooth scroll on click ----------
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault()
      const el = document.getElementById(sectionId)
      if (!el) return
      const top =
        el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
      window.scrollTo({ top, behavior: 'smooth' })
    },
    [],
  )

  const navLinks = (
    <>
      {SECTIONS.map((s, i) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={activeIndex === i ? 'active' : undefined}
          onClick={(e) => handleClick(e, s.id)}
        >
          {s.label}
        </a>
      ))}
    </>
  )

  return (
    <>
      <nav ref={inlineNavRef} className="nav-wrapper nav-inline">
        {navLinks}
      </nav>
      <nav
        className="nav-wrapper nav-fixed"
        style={{ display: isSticky ? 'block' : 'none' }}
      >
        {navLinks}
      </nav>
    </>
  )
}
