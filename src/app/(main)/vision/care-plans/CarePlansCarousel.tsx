'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

interface CarePlansCarouselProps {
  children: ReactNode[]
  className?: string
}

/**
 * Simple prev/next carousel for the care-plans part-3 page.
 * Shows one slide at a time with arrow navigation and dot indicators.
 */
export function CarePlansCarousel({
  children,
  className = '',
}: CarePlansCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    containScroll: 'trimSnaps',
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index)
    },
    [emblaApi],
  )

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

  const slides = Array.isArray(children) ? children : [children]

  return (
    <div className={`cp-carousel ${className}`}>
      <div className="cp-carousel__viewport-wrapper">
        <button
          type="button"
          className="cp-carousel__arrow cp-carousel__arrow--prev"
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          aria-label="Previous slide"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="cp-carousel__viewport" ref={emblaRef}>
          <div className="cp-carousel__container">
            {slides.map((child, i) => (
              <div className="cp-carousel__slide" key={i}>
                {child}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="cp-carousel__arrow cp-carousel__arrow--next"
          onClick={scrollNext}
          disabled={!canScrollNext}
          aria-label="Next slide"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Dot indicators */}
      <div className="cp-carousel__dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`cp-carousel__dot${i === selectedIndex ? ' active' : ''}`}
            onClick={() => scrollTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Slide counter */}
      <p className="cp-carousel__counter">
        {selectedIndex + 1} / {slides.length}
      </p>
    </div>
  )
}
