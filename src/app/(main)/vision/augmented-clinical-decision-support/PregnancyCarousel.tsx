'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, cloudfrontImage } from '@/lib/utils'

const slides = Array.from({ length: 21 }, (_, i) => ({
  src: `/images/features/augmented-clinical-decision-support/pregnancy-${i + 1}.jpg`,
  alt: `Pregnancy storyboard panel ${i + 1} of 21`,
}))

export function PregnancyCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= slides.length) return
      setDirection(i > activeIndex ? 1 : -1)
      setActiveIndex(i)
    },
    [activeIndex]
  )

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  return (
    <div className="max-width content-padding mx-auto">
      {/* Main slide */}
      <div className="max-w-[750px] mx-auto">
        <div className="relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={activeIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <Image
                src={cloudfrontImage(slides[activeIndex].src)}
                alt={slides[activeIndex].alt}
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Thumbnail navigation */}
      <div className="flex items-center mt-4 gap-1 max-w-[750px] mx-auto">
        {/* Prev button */}
        <button
          className={cn(
            'w-10 h-10 flex-shrink-0 flex items-center justify-center cursor-pointer transition-opacity',
            activeIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Previous slide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Scrollable thumbnails */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-1">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                className={cn(
                  'w-[100px] flex-shrink-0 p-0.5 cursor-pointer border-2 transition-colors',
                  activeIndex === i
                    ? 'border-primary bg-primary'
                    : 'border-transparent hover:border-gray-medium'
                )}
                onClick={() => goTo(i)}
                aria-label={`Go to panel ${i + 1}`}
              >
                <Image
                  src={cloudfrontImage(slide.src)}
                  alt=""
                  width={100}
                  height={67}
                  className="w-full h-auto block"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Next button */}
        <button
          className={cn(
            'w-10 h-10 flex-shrink-0 flex items-center justify-center cursor-pointer transition-opacity',
            activeIndex === slides.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Next slide"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
