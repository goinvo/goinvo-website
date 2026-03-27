'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { cloudfrontImage } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Review {
  id: string
  quote: string
  quotee: string
  quoteeSub: string
  image: string
  ctaText: string
  ctaLink: string
  ctaExternal: boolean
}

const menuLabels: Record<string, string> = {
  'inspired-ehrs': 'Inspired EHRs',
  'emerging-tech': 'Designing for Emerging Technologies',
  determinants: 'Determinants of Health',
  healthroom: 'Bathroom to Healthroom',
}

/** Orange diamond indicator SVG matching the Gatsby carousel__selected-indicator */
function Diamond() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="8"
      height="8"
      fill="none"
      viewBox="0 0 8 8"
      className="w-[0.6rem] h-[0.6rem] absolute right-4 top-1/2 -translate-y-1/2"
    >
      <path
        fill="#e36216"
        fillRule="evenodd"
        d="M4.377 0c.214 0 .427.105.534.47.534 1.726.587 1.83 2.616 2.458.48.21.534.366.427 1.046-.16.418-.32.523-.48.627-1.976.941-2.03.994-2.616 3.033A.657.657 0 0 1 4.27 8c-.48 0-1.068-.314-1.228-.732-.48-1.569-.748-2.04-2.189-2.51C.32 4.55 0 4.131 0 3.556c0-.314.16-.471.32-.523 1.655-.366 2.242-.785 2.723-2.04C3.256.418 3.79 0 4.377 0Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

interface ReviewCarouselProps {
  reviews: Review[]
}

export function ReviewCarousel({ reviews }: ReviewCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = reviews[activeIndex]

  return (
    <div>
      {/* Heading */}
      <div className="max-width content-padding pt-8">
        <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-0">
          Reviews for
          <span className="text-primary font-serif">...</span>
        </h2>
      </div>

      {/* Tab selector - matches Gatsby carousel__menu-items */}
      <div className="max-width content-padding">
        <ul className="list-none m-0 p-0 flex flex-col lg:flex-row">
          {reviews.map((review, index) => (
            <li
              key={review.id}
              className={cn(
                'relative border-t border-gray-medium lg:flex-1 lg:mr-4 last:lg:mr-0',
                index === reviews.length - 1 && 'border-b lg:border-b'
              )}
            >
              <button
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'w-full text-left lg:text-center bg-transparent border-0 cursor-pointer py-3 pr-8 lg:pr-4 text-sm no-underline transition-colors',
                  index === activeIndex
                    ? 'text-primary font-semibold'
                    : 'text-black hover:text-primary'
                )}
              >
                {menuLabels[review.id] || review.id}
              </button>
              {/* Orange diamond indicator on active tab */}
              {index === activeIndex && <Diamond />}
            </li>
          ))}
        </ul>
      </div>

      {/* Active review content */}
      <div className="bg-gray-light">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Image */}
            <div className="h-[260px] lg:h-[360px] overflow-hidden">
              <Image
                src={cloudfrontImage(active.image)}
                alt=""
                width={510}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quote + CTA */}
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <blockquote className="font-serif text-lg leading-relaxed italic text-black m-0">
                &ldquo;{active.quote}&rdquo;
              </blockquote>
              <p className="text-sm mt-4 mb-0">
                <span className="font-semibold">{active.quotee}</span>
                <br />
                <span className="text-gray">{active.quoteeSub}</span>
              </p>
              <div className="mt-6">
                <Button
                  href={active.ctaLink}
                  variant="primary"
                  external={active.ctaExternal}
                >
                  {active.ctaText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 py-4">
        {reviews.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={cn(
              'w-3 h-3 rounded-full border-0 cursor-pointer transition-opacity',
              index === activeIndex
                ? 'bg-primary opacity-100'
                : 'bg-primary opacity-50'
            )}
            aria-label={`Review ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
