'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn, cloudfrontImage } from '@/lib/utils'

const slides = Array.from({ length: 21 }, (_, i) => ({
  src: `/images/features/augmented-clinical-decision-support/pregnancy-${i + 1}.jpg`,
  alt: `Pregnancy storyboard panel ${i + 1} of 21`,
}))

export function PregnancyCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= slides.length) return
    setActiveIndex(i)
  }, [])

  return (
    <div className="max-width content-padding mx-auto">
      {/* Main slide — instant swap, no animation collapse */}
      <div className="max-w-[750px] mx-auto">
        <Image
          src={cloudfrontImage(slides[activeIndex].src)}
          alt={slides[activeIndex].alt}
          width={1200}
          height={800}
          className="w-full h-auto"
          priority
        />
      </div>

      {/* Thumbnail navigation — matching Gatsby's small dot-style thumbnails */}
      <div className="flex items-center mt-3 gap-0.5 max-w-[750px] mx-auto">
        {/* Prev button */}
        <button
          className={cn(
            'w-8 h-8 flex-shrink-0 flex items-center justify-center cursor-pointer transition-opacity',
            activeIndex === 0 ? 'opacity-30 pointer-events-none' : 'opacity-100'
          )}
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Previous slide"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Thumbnails — small, no scrollbar */}
        <div className="flex flex-1 gap-0.5 flex-wrap justify-center">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              className={cn(
                'w-[30px] h-[20px] flex-shrink-0 p-0 cursor-pointer border transition-colors overflow-hidden',
                activeIndex === i
                  ? 'border-primary'
                  : 'border-gray-light hover:border-gray-medium'
              )}
              onClick={() => goTo(i)}
              aria-label={`Go to panel ${i + 1}`}
            >
              <Image
                src={cloudfrontImage(slide.src)}
                alt=""
                width={30}
                height={20}
                className="w-full h-full object-cover block"
              />
            </button>
          ))}
        </div>

        {/* Next button */}
        <button
          className={cn(
            'w-8 h-8 flex-shrink-0 flex items-center justify-center cursor-pointer transition-opacity',
            activeIndex === slides.length - 1 ? 'opacity-30 pointer-events-none' : 'opacity-100'
          )}
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Next slide"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
