'use client'

import { useState, useCallback, Children } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CarouselProps {
  menuItems?: string[]
  children: React.ReactNode
  className?: string
  dots?: boolean
  /** Array of thumbnail image URLs. When provided, replaces dots with a thumbnail strip. */
  thumbnails?: string[]
}

export function Carousel({
  menuItems,
  children,
  className,
  dots = true,
  thumbnails,
}: CarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const slides = Children.toArray(children)

  const goTo = useCallback(
    (i: number) => {
      setDirection(i > activeIndex ? 1 : -1)
      setActiveIndex(i)
    },
    [activeIndex]
  )

  const goNext = useCallback(() => {
    setDirection(1)
    setActiveIndex((prev) => (prev + 1) % slides.length)
  }, [slides.length])

  const goPrev = useCallback(() => {
    setDirection(-1)
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }, [slides.length])

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
    <div className={cn('carousel', className)}>
      {/* Menu items (tab navigation) */}
      {menuItems && menuItems.length > 0 && (
        <div className="max-width content-padding">
          <ul className="flex flex-wrap gap-1 list-none p-0 mb-4">
            {menuItems.map((item, i) => (
              <li key={item} className="relative">
                <button
                  className={cn(
                    'px-4 py-2 text-md font-semibold uppercase tracking-[2px] bg-transparent border-none cursor-pointer transition-colors',
                    i === activeIndex
                      ? 'text-primary'
                      : 'text-gray hover:text-black'
                  )}
                  onClick={() => goTo(i)}
                >
                  {item}
                </button>
                {i === activeIndex && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary"
                    layoutId="carousel-indicator"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Slide area */}
      <div className="relative overflow-hidden bg-gray-light">
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
            {slides[activeIndex]}
          </motion.div>
        </AnimatePresence>

        {/* Prev/Next arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-card cursor-pointer transition-colors z-10"
              aria-label="Previous slide"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow-card cursor-pointer transition-colors z-10"
              aria-label="Next slide"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {thumbnails && thumbnails.length > 1 && (
        <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
          {thumbnails.map((src, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'flex-shrink-0 w-[80px] h-[50px] border-2 cursor-pointer transition-all overflow-hidden bg-gray-light',
                i === activeIndex ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-80'
              )}
              aria-label={`Go to slide ${i + 1}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Dots (shown when no thumbnails) */}
      {!thumbnails && dots && slides.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'w-2.5 h-2.5 rounded-full border-none cursor-pointer transition-colors',
                i === activeIndex ? 'bg-primary' : 'bg-gray-medium hover:bg-gray'
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
