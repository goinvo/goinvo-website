'use client'

import { useEffect, useRef } from 'react'

/**
 * Activates sticky scroll navigation for the Oral History page.
 *
 * Behavior (matching legacy featurenav-scroll.js):
 * - When the user scrolls past the `.nav-wrapper.stuck` element,
 *   the `.nav-wrapper.scroll-nav` becomes visible (position: fixed via CSS).
 * - The nav link corresponding to the current section gets an `active` class.
 * - On screens <= 750px the scroll-nav stays hidden.
 */
export function ScrollNav() {
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const stuckNav = document.querySelector<HTMLElement>(
      '#oral-history-legacy .nav-wrapper.stuck'
    )
    const scrollNav = document.querySelector<HTMLElement>(
      '#oral-history-legacy .nav-wrapper.scroll-nav'
    )

    if (!stuckNav || !scrollNav) return

    const sectionClasses = ['one', 'two', 'three', 'four', 'five'] as const

    // Gather section headers and their corresponding nav links (in both navs)
    const sectionHeaders = sectionClasses.map((cls) =>
      document.querySelector<HTMLElement>(
        `#oral-history-legacy header.${cls}[id^="section"]`
      )
    )
    const navLinks = sectionClasses.map((cls) =>
      scrollNav.querySelectorAll<HTMLAnchorElement>(`.main-nav a.${cls}`)
    )
    // Also target the stuck nav links for active state
    const stuckLinks = sectionClasses.map((cls) =>
      stuckNav.querySelectorAll<HTMLAnchorElement>(`.main-nav a.${cls}`)
    )

    function onScroll() {
      const scrollY = window.scrollY
      const windowWidth = window.innerWidth

      // Show/hide scroll-nav based on scroll position and screen width
      if (windowWidth > 750) {
        const stuckTop = stuckNav!.getBoundingClientRect().top + scrollY
        if (scrollY >= stuckTop) {
          if (scrollNav!.style.display !== 'block') {
            scrollNav!.style.display = 'block'
          }
        } else {
          if (scrollNav!.style.display !== 'none') {
            scrollNav!.style.display = 'none'
          }
        }
      } else {
        if (scrollNav!.style.display !== 'none') {
          scrollNav!.style.display = 'none'
        }
      }

      // Determine active section based on scroll position
      for (let i = 0; i < sectionHeaders.length; i++) {
        const header = sectionHeaders[i]
        if (!header) continue

        const headerTop = header.getBoundingClientRect().top + scrollY
        const isLast = i === sectionHeaders.length - 1
        let isActive = false

        if (isLast) {
          isActive = scrollY >= headerTop
        } else {
          const nextHeader = sectionHeaders[i + 1]
          if (nextHeader) {
            const nextTop = nextHeader.getBoundingClientRect().top + scrollY
            isActive = scrollY >= headerTop && scrollY < nextTop
          } else {
            isActive = scrollY >= headerTop
          }
        }

        if (isActive) {
          // Remove active from all links in both navs
          for (const linkSet of [...navLinks, ...stuckLinks]) {
            linkSet.forEach((link) => link.classList.remove('active'))
          }
          // Set active on current section links
          navLinks[i]?.forEach((link) => link.classList.add('active'))
          stuckLinks[i]?.forEach((link) => link.classList.add('active'))
          break
        }
      }
    }

    function handleScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(onScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    // Run once on mount to set initial state
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return null
}
