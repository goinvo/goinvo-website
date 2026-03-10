'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface GalleryImage {
  src: string
  alt?: string
}

interface LightboxGalleryProps {
  /** Single image mode */
  image?: string
  alt?: string
  /** Gallery mode */
  images?: GalleryImage[]
  className?: string
}

export function LightboxGallery({
  image,
  alt = '',
  images,
  className,
}: LightboxGalleryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const isSingle = !!image
  const allImages: GalleryImage[] = isSingle
    ? [{ src: image, alt }]
    : images || []

  const open = (index: number) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }

  const close = () => setIsOpen(false)

  const goNext = () =>
    setCurrentIndex((prev) => (prev + 1) % allImages.length)
  const goPrev = () =>
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length)

  return (
    <>
      <div className={cn('lightbox-gallery', className)}>
        {isSingle ? (
          <button
            onClick={() => open(0)}
            className="cursor-pointer border-none bg-transparent p-0 w-full"
          >
            <Image
              src={image}
              alt={alt}
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </button>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => open(i)}
                className="cursor-pointer border-none bg-transparent p-0"
              >
                <Image
                  src={img.src}
                  alt={img.alt || ''}
                  width={600}
                  height={400}
                  className="w-full h-auto"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white bg-transparent border-none cursor-pointer text-2xl hover:text-gray-medium z-10"
            aria-label="Close lightbox"
          >
            &times;
          </button>

          {/* Navigation */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 border-none rounded-full cursor-pointer z-10"
                aria-label="Previous image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 border-none rounded-full cursor-pointer z-10"
                aria-label="Next image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={allImages[currentIndex].src}
              alt={allImages[currentIndex].alt || ''}
              width={1600}
              height={1200}
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}
