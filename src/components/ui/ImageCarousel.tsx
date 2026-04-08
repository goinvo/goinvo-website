'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageCarouselProps {
  images: { url: string; alt?: string }[]
  /** Optional caption displayed below the carousel */
  caption?: string
  /** Thumbnail size: 'sm' (30x20), 'md' (60x40), 'lg' (100x65) */
  thumbnailSize?: 'sm' | 'md' | 'lg'
}

const thumbSizes = {
  sm: { w: 30, h: 20, cls: 'w-[30px] h-[20px]', cover: true },
  md: { w: 60, h: 40, cls: 'w-[60px] h-[40px]', cover: true },
  lg: { w: 100, h: 65, cls: 'w-[100px]', cover: false },
}

export function ImageCarousel({ images, caption, thumbnailSize = 'sm' }: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= images.length) return
    setActiveIndex(i)
  }, [images.length])

  if (!images || images.length === 0) return null

  // Single image — no carousel needed
  if (images.length === 1) {
    return (
      <figure className="my-8">
        <Image
          src={images[0].url}
          alt={images[0].alt || ''}
          width={1200}
          height={800}
          className="w-full h-auto"
        />
        {caption && (
          <figcaption className="mt-2 text-base text-gray text-center">{caption}</figcaption>
        )}
      </figure>
    )
  }

  return (
    <div className="my-8">
      {/* Main slide */}
      <div className="max-w-[750px] mx-auto">
        <Image
          src={images[activeIndex].url}
          alt={images[activeIndex].alt || ''}
          width={1200}
          height={800}
          className="w-full h-auto"
          priority
        />
      </div>

      {/* Thumbnail navigation */}
      <div className="flex items-center mt-3 gap-0.5 max-w-[750px] mx-auto">
        {/* Prev */}
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

        {/* Thumbnails */}
        <div className="flex flex-1 gap-0.5 flex-wrap justify-center">
          {images.map((img, i) => (
            <button
              key={img.url}
              className={cn(
                `${thumbSizes[thumbnailSize].cls} flex-shrink-0 p-0 cursor-pointer border transition-colors overflow-hidden`,
                activeIndex === i
                  ? 'border-primary'
                  : 'border-gray-light hover:border-gray-medium'
              )}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            >
              {thumbSizes[thumbnailSize].cover ? (
                <Image
                  src={img.url}
                  alt=""
                  width={thumbSizes[thumbnailSize].w}
                  height={thumbSizes[thumbnailSize].h}
                  className="w-full h-full object-cover block"
                />
              ) : (
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-auto block"
                />
              )}
            </button>
          ))}
        </div>

        {/* Next */}
        <button
          className={cn(
            'w-8 h-8 flex-shrink-0 flex items-center justify-center cursor-pointer transition-opacity',
            activeIndex === images.length - 1 ? 'opacity-30 pointer-events-none' : 'opacity-100'
          )}
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Next slide"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {caption && (
        <p className="mt-2 text-base text-gray text-center">{caption}</p>
      )}
    </div>
  )
}
