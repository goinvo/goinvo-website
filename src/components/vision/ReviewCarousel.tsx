'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { cloudfrontImage } from '@/lib/utils'

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

interface ReviewCarouselProps {
  reviews: Review[]
}

export function ReviewCarousel({ reviews }: ReviewCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = reviews[activeIndex]

  return (
    <div>
      <div className="max-width content-padding pt-16">
        <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-0">
          Reviews for
          <span className="text-primary font-serif">...</span>
        </h2>
      </div>

      {/* Tab selector */}
      <div className="max-width content-padding">
        <div className="flex flex-wrap gap-0 border-b border-gray-medium">
          {reviews.map((review, index) => (
            <button
              key={review.id}
              onClick={() => setActiveIndex(index)}
              className={`py-3 px-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                index === activeIndex
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray hover:text-black'
              }`}
            >
              {menuLabels[review.id] || review.id}
            </button>
          ))}
        </div>
      </div>

      {/* Active review */}
      <div className="bg-gray-light">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="h-[260px] lg:h-[360px] overflow-hidden">
              <Image
                src={cloudfrontImage(active.image)}
                alt=""
                width={510}
                height={360}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-8 lg:p-12">
              <blockquote className="text-gray font-serif text-lg leading-relaxed italic m-0">
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
                  size="lg"
                  external={active.ctaExternal}
                >
                  {active.ctaText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
