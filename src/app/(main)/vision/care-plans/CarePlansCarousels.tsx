'use client'

import { useEffect } from 'react'

/**
 * Activates Bootstrap-style `.carousel` widgets in the legacy Care Plans
 * HTML without loading Bootstrap JS.
 *
 * Two carousels on Part 2: `#carousel-barriers` (The Barriers to Care
 * Planning — 6 slides with indicator circles) and `#carousel-mobile`
 * (mobile journey-map equivalent). Same machinery:
 *   - `.carousel-indicators li[data-slide-to="N"]` — click to jump
 *   - `a.left.control[data-slide="prev"]` / `a.right.control[data-slide="next"]`
 *   - Active slide is the `.carousel-inner > .item.active`
 *   - Active indicator is `.carousel-indicators > li.active`
 */
export function CarePlansCarousels() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.legacy-careplans')
    if (!root) return

    const cleanups: Array<() => void> = []

    const carousels = root.querySelectorAll<HTMLElement>('.carousel')
    carousels.forEach((carousel) => {
      const inner = carousel.querySelector<HTMLElement>('.carousel-inner')
      const items = inner ? Array.from(inner.querySelectorAll<HTMLElement>(':scope > .item')) : []
      const indicators = Array.from(carousel.querySelectorAll<HTMLElement>('.carousel-indicators > li'))
      const prev = carousel.querySelector<HTMLAnchorElement>('a.control[data-slide="prev"], a.left[data-slide="prev"]')
      const next = carousel.querySelector<HTMLAnchorElement>('a.control[data-slide="next"], a.right[data-slide="next"]')
      if (items.length === 0) return

      const setActive = (nextIndex: number) => {
        const clamped = (nextIndex + items.length) % items.length
        items.forEach((it, i) => it.classList.toggle('active', i === clamped))
        indicators.forEach((li, i) => li.classList.toggle('active', i === clamped))
      }

      const onIndicatorClick = (e: Event) => {
        e.preventDefault()
        const li = (e.currentTarget as HTMLElement)
        const idx = parseInt(li.getAttribute('data-slide-to') || '0', 10)
        setActive(Number.isFinite(idx) ? idx : 0)
      }

      const currentIndex = () => items.findIndex((it) => it.classList.contains('active'))
      const onPrev = (e: Event) => {
        e.preventDefault()
        setActive(currentIndex() - 1)
      }
      const onNext = (e: Event) => {
        e.preventDefault()
        setActive(currentIndex() + 1)
      }

      indicators.forEach((li) => {
        li.style.cursor = 'pointer'
        li.addEventListener('click', onIndicatorClick)
      })
      prev?.addEventListener('click', onPrev)
      next?.addEventListener('click', onNext)

      cleanups.push(() => {
        indicators.forEach((li) => li.removeEventListener('click', onIndicatorClick))
        prev?.removeEventListener('click', onPrev)
        next?.removeEventListener('click', onNext)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return null
}
