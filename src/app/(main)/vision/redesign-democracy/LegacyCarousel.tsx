'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

interface LegacyCarouselProps {
  /** Label for each tab button */
  tabs: string[]
  /** Optional color class per tab (e.g. 'slide0', 'slide1') */
  tabColors?: string[]
  /** Accent color for the active state (CSS color value) */
  accentColor?: string
  /** One child per slide */
  children: ReactNode[]
  /** Extra class on the root wrapper */
  className?: string
  /** Whether to show prev/next arrow buttons (default true) */
  showArrows?: boolean
}

export function LegacyCarousel({
  tabs,
  tabColors,
  accentColor,
  children,
  className = '',
  showArrows = true,
}: LegacyCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  return (
    <div className={`legacy-carousel ${className}`}>
      {/* Tab navigation */}
      <nav className="legacy-carousel__tabs">
        {tabs.map((label, i) => {
          const isActive = i === selectedIndex
          const colorClass = tabColors?.[i] ?? `slide${i}`
          return (
            <button
              key={i}
              type="button"
              className={`legacy-carousel__tab ${colorClass}${isActive ? ' active' : ''}`}
              onClick={() => scrollTo(i)}
              aria-label={label}
              dangerouslySetInnerHTML={{ __html: label }}
            />
          )
        })}
      </nav>

      {/* Slider viewport */}
      <div className="legacy-carousel__viewport-wrapper">
        {showArrows && (
          <button
            type="button"
            className="legacy-carousel__arrow legacy-carousel__arrow--prev"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Previous slide"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div className="legacy-carousel__viewport" ref={emblaRef}>
          <div className="legacy-carousel__container">
            {(Array.isArray(children) ? children : [children]).map((child, i) => (
              <div className="legacy-carousel__slide" key={i}>
                {child}
              </div>
            ))}
          </div>
        </div>

        {showArrows && (
          <button
            type="button"
            className="legacy-carousel__arrow legacy-carousel__arrow--next"
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Next slide"
          >
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>

      {/* Dot indicators */}
      <div className="legacy-carousel__dots">
        {tabs.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`legacy-carousel__dot${i === selectedIndex ? ' active' : ''}`}
            onClick={() => scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
