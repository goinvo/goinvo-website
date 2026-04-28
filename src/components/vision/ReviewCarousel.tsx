'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Divider } from '@/components/ui/Divider'
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

const DIAMOND_SVG = `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCA4IDgiPjxwYXRoIGZpbGw9IiNlMzYyMTYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTQuMzc3IDBjLjIxNCAwIC40MjcuMTA1LjUzNC40Ny41MzQgMS43MjYuNTg3IDEuODMgMi42MTYgMi40NTguNDguMjEuNTM0LjM2Ni40MjcgMS4wNDYtLjE2LjQxOC0uMzIuNTIzLS40OC42MjctMS45NzYuOTQxLTIuMDMuOTk0LTIuNjE2IDMuMDMzQS42NTcuNjU3IDAgMCAxIDQuMjcgOGMtLjQ4IDAtMS4wNjgtLjMxNC0xLjIyOC0uNzMyLS40OC0xLjU2OS0uNzQ4LTIuMDQtMi4xODktMi41MUMuMzIgNC41NSAwIDQuMTMxIDAgMy41NTZjMC0uMzE0LjE2LS40NzEuMzItLjUyMyAxLjY1NS0uMzY2IDIuMjQyLS43ODUgMi43MjMtMi4wNEMzLjI1Ni40MTggMy43OSAwIDQuMzc3IDBaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=")`
const CARET_SVG = `url("data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTggMTAiIGZpbGw9IiNlMzYyMTYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0wLjY0NjQ0NyAwLjY0NjQ0N0MwLjg0MTcwOSAwLjQ1MTE4NCAxLjE1ODI5IDAuNDUxMTg0IDEuMzUzNTUgMC42NDY0NDdMOSA4LjI5Mjg5TDE2LjY0NjQgMC42NDY0NDdDMTYuODQxNyAwLjQ1MTE4NCAxNy4xNTgzIDAuNDUxMTg0IDE3LjM1MzYgMC42NDY0NDdDMTcuNTQ4OCAwLjg0MTcwOSAxNy41NDg4IDEuMTU4MjkgMTcuMzUzNiAxLjM1MzU1TDkgOS43MDcxMUwwLjY0NjQ0NyAxLjM1MzU1QzAuNDUxMTg0IDEuMTU4MjkgMC40NTExODQgMC44NDE3MDkgMC42NDY0NDcgMC42NDY0NDdaIiAvPjwvc3ZnPg==")`

interface ReviewCarouselProps {
  reviews: Review[]
}

export function ReviewCarousel({ reviews }: ReviewCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const active = reviews[activeIndex]
  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + reviews.length) % reviews.length)
  }
  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % reviews.length)
  }

  return (
    <div>
      {/* Heading */}
      <div className="max-width content-padding pt-8">
        <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light" style={{ margin: '30px 0' }}>
          Reviews for<span className="text-primary font-serif">...</span>
        </h2>
      </div>

      {/* Tabs */}
      <div className="max-width content-padding">
        <ul className="list-none p-0 flex flex-col lg:flex-row" style={{ margin: '1rem 0 2rem' }}>
          {reviews.map((review, index) => (
            <li
              key={review.id}
              className="relative flex"
              style={{
                borderTop: '1px solid #d0cfce',
                borderBottom: '1px solid #d0cfce',
                flex: '1 1 0%',
                marginRight: index !== reviews.length - 1 ? '1rem' : undefined,
              }}
            >
              <button
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'w-full bg-transparent border-0 cursor-pointer no-underline transition-colors',
                  index === activeIndex ? 'text-primary' : 'text-secondary hover:text-primary'
                )}
                style={{ textAlign: 'left', padding: '4px 0', fontSize: 15, lineHeight: '26px', fontWeight: 400 }}
              >
                {menuLabels[review.id] || review.id}
              </button>
              {index === activeIndex && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 bg-contain bg-no-repeat"
                  style={{ right: '1rem', width: '0.6rem', height: '0.6rem', backgroundImage: DIAMOND_SVG }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Gray area */}
      <div className="group bg-gray-light" data-review-container style={{ paddingBottom: 50 }}>
        {/* Content wrapper: position relative so image can use top:0 bottom:0
             The HEIGHT of this div = content flow only (no dots).
             Image matches this height exactly via absolute positioning. */}
        <div className="relative">
          <button
            type="button"
            onClick={goToPrevious}
            className="hidden lg:flex absolute left-0 top-1/2 z-20 h-[50px] w-[50px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
            aria-label="Previous review"
          >
            <span
              aria-hidden="true"
              className="block h-full w-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: CARET_SVG, transform: 'rotate(90deg)' }}
            />
          </button>
          <button
            type="button"
            onClick={goToNext}
            className="hidden lg:flex absolute right-0 top-1/2 z-20 h-[50px] w-[50px] -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto focus-visible:opacity-100 focus-visible:pointer-events-auto"
            aria-label="Next review"
          >
            <span
              aria-hidden="true"
              className="block h-full w-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: CARET_SVG, transform: 'rotate(-90deg)' }}
            />
          </button>

          {/* Mobile image: stacked above content */}
          <div className="relative overflow-hidden h-[300px] lg:hidden">
            <Image src={cloudfrontImage(active.image)} alt="" fill className="object-cover object-center" />
          </div>

          {/* Desktop image: absolute, full left half, height matches content */}
          <div className="hidden lg:block absolute top-0 bottom-0 left-0 right-[50%] overflow-hidden" data-review-image>
            <Image src={cloudfrontImage(active.image)} alt="" fill className="object-cover object-center" />
          </div>

          {/* Content: right half on desktop */}
          <div className="max-width content-padding">
            <div className="lg:ml-[50%] lg:pl-8">
              <div className="p-4">
                <div style={{ marginBottom: '3rem' }}><Divider /></div>
                <div className="relative">
                  <div className="absolute bg-contain bg-center bg-no-repeat" style={{ top: -25, left: 0, width: 20, height: 20, backgroundImage: 'url(/images/quote.svg)' }} />
                  <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light m-0">{active.quote}</p>
                  <p className="text-sm leading-snug mt-4 mb-0" style={{ color: '#787473' }}>
                    <span>{active.quotee}</span><br /><span>{active.quoteeSub}</span>
                  </p>
                  <div className="absolute bg-contain bg-center bg-no-repeat" style={{ bottom: -25, right: 0, width: 20, height: 20, backgroundImage: 'url(/images/quote.svg)', transform: 'rotateX(180deg) scaleX(-1)' }} />
                </div>
                <div style={{ marginTop: '2rem' }}><Divider /></div>
              </div>
              <Button href={active.ctaLink} variant="primary" external={active.ctaExternal} className="!flex w-full justify-center">
                {active.ctaText}
              </Button>
            </div>
          </div>
        </div>

        {/* Dots: OUTSIDE the relative div so they don't affect image height */}
        <div className="flex justify-center items-center py-4" style={{ gap: 14 }}>
          {reviews.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className="border-0 cursor-pointer p-0 rounded-full"
              style={{ width: 10, height: 10, backgroundColor: '#e36216', opacity: index === activeIndex ? 1 : 0.4 }}
              aria-label={`Review ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
