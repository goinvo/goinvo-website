'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const SECTIONS = [
  { id: 'section1-medication', label: '1. Medication', className: 'one' },
  { id: 'section2-interfaces', label: '2. Talking to Tech', className: 'two' },
  { id: 'section3-predictive', label: '3. Prediction', className: 'three' },
  { id: 'section4-disease', label: '4. Detection', className: 'four' },
  { id: 'section5-careplan', label: '5. Care Planning', className: 'five' },
  { id: 'section6-records', label: '6. Computable Records', className: 'six' },
  { id: 'section7-patient', label: '7. Engagement', className: 'seven' },
  { id: 'section8-companion', label: '8. Virtual Helpers', className: 'eight' },
]

/** Offset (px) above each section target when scrolling to it or detecting active state */
const SCROLL_OFFSET = 200

/**
 * Adds 'visible' class to .item sections as they enter the viewport,
 * triggering the CSS fade-in/slide-up animation.
 */
export function SectionFadeIn() {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>(
      '.digital-healthcare .item',
    )
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target) // animate only once
          }
        })
      },
      { rootMargin: '-60px 0px', threshold: 0.1 },
    )

    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return null // render nothing — side-effect only
}

export function ScrollNav() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [isSticky, setIsSticky] = useState(false)
  const inlineNavRef = useRef<HTMLElement>(null)

  // ---------- scroll spy + sticky ----------
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const inlineNav = inlineNavRef.current
      if (!inlineNav) return

      // Sticky: show fixed copy when scrolled past the inline nav (desktop only)
      const navTop = inlineNav.getBoundingClientRect().top + scrollY
      const isDesktop = window.innerWidth > 768
      setIsSticky(isDesktop && scrollY >= navTop)

      // Scroll spy: find which section is current
      const sectionEls = SECTIONS.map((s) => document.getElementById(s.id))
      let currentIdx: number | null = null

      for (let i = 0; i < sectionEls.length; i++) {
        const el = sectionEls[i]
        if (!el) continue

        const top = el.getBoundingClientRect().top + scrollY - SCROLL_OFFSET
        if (i === sectionEls.length - 1) {
          // last section: active if scrolled past its top
          if (scrollY >= top) currentIdx = i
        } else {
          const nextEl = sectionEls[i + 1]
          if (!nextEl) continue
          const nextTop = nextEl.getBoundingClientRect().top + scrollY
          if (scrollY >= top && scrollY < nextTop) currentIdx = i
        }
      }

      // If above the first section, nothing is active
      const firstEl = sectionEls[0]
      if (firstEl) {
        const firstTop =
          firstEl.getBoundingClientRect().top + scrollY - SCROLL_OFFSET - 1
        if (scrollY < firstTop) currentIdx = null
      }

      setActiveIndex(currentIdx)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // initial check
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
      {/* Inline nav — sits in the document flow, used as the scroll threshold */}
      <nav ref={inlineNavRef} className="nav-wrapper nav-inline">
        {navLinks}
      </nav>

      {/* Fixed nav — shown when scrolled past the inline nav (desktop only) */}
      <nav
        className="nav-wrapper nav-fixed"
        style={{ display: isSticky ? 'block' : 'none' }}
      >
        {navLinks}
      </nav>
    </>
  )
}
