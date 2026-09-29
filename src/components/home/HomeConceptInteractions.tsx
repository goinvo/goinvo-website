'use client'

import { useLayoutEffect } from 'react'

export function HomeConceptInteractions() {
  // The reveal rule below applies only once this has run (data-home-concept-js on <html>),
  // so the server HTML paints every section visible. Elements already on screen are marked
  // visible first and never hide; the rest are hidden off screen and fade up as they arrive.
  useLayoutEffect(() => {
    const root = document.documentElement
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-home-concept-reveal]'))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canObserve = 'IntersectionObserver' in window && !reducedMotion
    const pending = elements.filter((element) => {
      const rect = element.getBoundingClientRect()
      const onScreen = rect.top < window.innerHeight && rect.bottom > 0
      if (onScreen || !canObserve) element.dataset.homeConceptVisible = 'true'
      return !onScreen && canObserve
    })
    root.dataset.homeConceptJs = 'true'
    if (pending.length === 0) {
      return () => {
        delete root.dataset.homeConceptJs
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const target = entry.target as HTMLElement
          target.dataset.homeConceptVisible = 'true'
          observer.unobserve(target)
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px' },
    )

    pending.forEach((element) => {
      observer.observe(element)
    })

    return () => {
      observer.disconnect()
      delete root.dataset.homeConceptJs
    }
  }, [])

  return (
    <style>{`
      section[id] {
        scroll-margin-top: 84px;
      }

      .home-concept-link-text::after {
        transform-origin: left center;
        transition: transform 460ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .home-concept-link-text:hover::after {
        animation: home-concept-underline-swipe 720ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes home-concept-underline-swipe {
        0% {
          transform: scaleX(1);
          transform-origin: right center;
        }
        45% {
          transform: scaleX(0);
          transform-origin: right center;
        }
        46% {
          transform: scaleX(0);
          transform-origin: left center;
        }
        100% {
          transform: scaleX(1);
          transform-origin: left center;
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        [data-home-concept-js] [data-home-concept-reveal] {
          opacity: 0;
          transform: translateY(30px);
          transition:
            opacity 700ms cubic-bezier(0.25, 0.1, 0.25, 1),
            transform 700ms cubic-bezier(0.25, 0.1, 0.25, 1);
          transition-delay: calc(var(--home-concept-reveal-index, 0) * 70ms);
        }

        [data-home-concept-js] [data-home-concept-visible='true'] {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .home-concept-link-text::after {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  )
}
