'use client'

import { useEffect } from 'react'

export function CarePlansStickyNav() {
  useEffect(() => {
    const root = document.querySelector('.legacy-careplans #feature-article')
    if (!root) return

    const hero = root.querySelector<HTMLElement>('.hero-image')
    const scrollNav = root.querySelector<HTMLElement>('header.nav-wrapper.scroll-nav')
    if (!scrollNav) return

    if (!hero) {
      scrollNav.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        scrollNav.classList.toggle('is-visible', !entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px' },
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return null
}
