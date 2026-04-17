'use client'

import { useEffect } from 'react'

/**
 * Re-implements the scroll-driven effects from the legacy
 * from-bathroom-to-healthroom.js:
 *
 *   1. Aside-media caption slide-ins. Each caption (#hgraphCaption,
 *      #sleeper-caption) starts with `initial-margin` (offset 50% right) and
 *      its paired video (#hgraph, #sleeper-video) starts with `initial-hide`
 *      (collapsed + transparent). When the caption enters the viewport, both
 *      classes are removed simultaneously so the CSS transition slides the
 *      caption left and reveals the video.
 *
 *   2. Inline video play-on-view. The video tags inside #hgraph,
 *      #sleeper-video, #eye-tracking, #crane already auto-play (the React
 *      <video> uses `autoPlay`), so this is best-effort: re-trigger play()
 *      when each enters the viewport in case auto-play was suppressed (some
 *      browsers pause off-screen videos to save resources).
 */
const ASIDE_PAIRS = [
  { caption: 'hgraphCaption', video: 'hgraph' },
  { caption: 'sleeper-caption', video: 'sleeper-video' },
] as const

const VIDEO_IDS = ['hgraph', 'sleeper-video', 'eye-tracking', 'crane'] as const

const PIN_PAIRS = [
  { wrapper: 'blade-runner-wrapper', empty: 'blade-empty', margin: 'blade-margin' },
  { wrapper: 'crane-wrapper', empty: 'crane-empty', margin: 'crane-margin' },
] as const

const PIN_MIN_VIEWPORT = 1000 // legacy n>1e3 desktop guard

export function BathroomScrollEffects() {
  useEffect(() => {
    // ---- Caption slide-ins ----
    const observers: IntersectionObserver[] = []

    for (const pair of ASIDE_PAIRS) {
      const captionEl = document.getElementById(pair.caption)
      const videoEl = document.getElementById(pair.video)
      if (!captionEl) continue

      // Apply initial state once we're sure JS is running. (If we set this
      // server-side the captions would be hidden for users with JS disabled.)
      captionEl.classList.add('initial-margin')
      videoEl?.classList.add('initial-hide')

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              captionEl.classList.remove('initial-margin')
              videoEl?.classList.remove('initial-hide')
              observer.disconnect() // animate only once
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
      )
      observer.observe(captionEl)
      observers.push(observer)
    }

    // ---- Re-trigger play() when videos enter view ----
    for (const id of VIDEO_IDS) {
      const wrapper = document.getElementById(id)
      const video = wrapper?.querySelector('video')
      if (!video) continue

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && video.paused) {
              video.play().catch(() => {
                // Browser blocked play() (e.g. autoplay policy) — ignore.
              })
            }
          }
        },
        { threshold: 0.1 },
      )
      observer.observe(wrapper!)
      observers.push(observer)
    }

    // ---- Scroll-pin shrinking ----
    // For each pinned pair, capture the wrapper's natural top + height once
    // (after layout settles), then watch scroll to:
    //   - Pin the wrapper (position: fixed) when the viewport reaches its
    //     top edge, expand the empty placeholder to take its place in flow.
    //   - Shrink the wrapper as the user scrolls past the paired margin
    //     paragraph; grow it back when scrolling up.
    //   - Unpin once scrolled back above the wrapper's original top.
    type PinState = {
      wrapper: HTMLElement
      empty: HTMLElement
      margin: HTMLElement
      initialTop: number
      initialHeight: number
    }
    const pinStates: PinState[] = []
    let lastScroll = window.scrollY
    let scheduled = false

    const measure = () => {
      pinStates.length = 0
      for (const pair of PIN_PAIRS) {
        const wrapper = document.getElementById(pair.wrapper)
        const empty = document.getElementById(pair.empty)
        const margin = document.getElementById(pair.margin)
        if (!wrapper || !empty || !margin) continue
        // Reset to natural state before measuring so we get the un-pinned size.
        wrapper.classList.remove('fix-me')
        wrapper.style.height = ''
        wrapper.style.top = ''
        empty.style.height = '0'
        const rect = wrapper.getBoundingClientRect()
        pinStates.push({
          wrapper,
          empty,
          margin,
          initialTop: rect.top + window.scrollY,
          initialHeight: rect.height,
        })
      }
    }

    const onScroll = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        if (window.innerWidth <= PIN_MIN_VIEWPORT) {
          // Reset on narrow viewports — legacy never pinned below 1000px.
          for (const s of pinStates) {
            s.wrapper.classList.remove('fix-me')
            s.wrapper.style.height = ''
            s.wrapper.style.top = ''
            s.empty.style.height = '0'
          }
          lastScroll = window.scrollY
          return
        }

        const scrollY = window.scrollY
        // Header height; fall back to 50 if the CSS var isn't set yet.
        const headerHeight =
          parseInt(
            getComputedStyle(document.documentElement)
              .getPropertyValue('--spacing-header-height')
              .trim()
              .replace('px', ''),
            10,
          ) || 50
        const trigger = scrollY + headerHeight

        for (const s of pinStates) {
          const wrapperBottom = s.initialTop + s.initialHeight
          const isPinned = s.wrapper.classList.contains('fix-me')
          const currentHeight = s.wrapper.getBoundingClientRect().height

          // Pin when viewport hits the top, unpin when scrolled back above.
          if (trigger >= s.initialTop && !isPinned && wrapperBottom > trigger) {
            s.empty.style.height = `${s.wrapper.offsetHeight + 36}px`
            s.wrapper.classList.add('fix-me')
            s.wrapper.style.top = `${headerHeight}px`
          } else if (s.initialTop > trigger && isPinned) {
            s.wrapper.classList.remove('fix-me')
            s.wrapper.style.top = ''
            s.empty.style.height = '0'
          }

          // Shrink when scrolling down past the margin paragraph;
          // grow back when scrolling up.
          const marginTop = s.margin.getBoundingClientRect().top + scrollY
          if (scrollY > lastScroll && currentHeight > 0) {
            const wrapperTopInDoc =
              s.wrapper.getBoundingClientRect().top + scrollY - headerHeight
            if (scrollY >= wrapperTopInDoc) {
              const next = currentHeight - (scrollY - lastScroll)
              s.wrapper.style.height = `${Math.max(0, next)}px`
            }
          } else if (
            lastScroll > scrollY &&
            wrapperBottom > scrollY &&
            s.initialHeight > currentHeight &&
            trigger < marginTop - 36
          ) {
            const next = currentHeight + (lastScroll - scrollY)
            s.wrapper.style.height = `${Math.min(s.initialHeight, next)}px`
          }
        }
        lastScroll = scrollY
      })
    }

    // Defer initial measurement so layout has settled (videos loaded etc).
    const measureHandle = window.setTimeout(measure, 200)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)

    return () => {
      observers.forEach((o) => o.disconnect())
      window.clearTimeout(measureHandle)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return null
}
