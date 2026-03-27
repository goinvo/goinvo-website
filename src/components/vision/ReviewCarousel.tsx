'use client'

import { useState } from 'react'
import Image from 'next/image'
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
          Reviews for<span className="text-primary font-serif">...</span>
        </h2>
      </div>

      {/* Tabs */}
      <div className="max-width content-padding">
        <ul className="list-none m-0 p-0 my-4 mb-8 flex flex-col lg:flex-row">
          {reviews.map((review, index) => (
            <li
              key={review.id}
              className={cn(
                'relative border-t border-gray-medium flex',
                'lg:flex-1 lg:border-b lg:border-gray-medium',
                index !== reviews.length - 1 && 'lg:mr-4',
                index === reviews.length - 1 && 'border-b'
              )}
            >
              <button
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'w-full text-left bg-transparent border-0 cursor-pointer py-1 pr-8 text-sm no-underline transition-colors font-normal',
                  index === activeIndex ? 'text-primary' : 'text-secondary hover:text-primary'
                )}
              >
                {menuLabels[review.id] || review.id}
              </button>
              {index === activeIndex && (
                <span
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-[0.6rem] h-[0.6rem] bg-contain bg-no-repeat"
                  style={{ backgroundImage: DIAMOND_SVG }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Review content */}
      <div className="bg-gray-light relative" style={{ paddingBottom: 50 }}>
        <div className="max-width content-padding">
          <div className="relative flex flex-col lg:flex-row">

            {/* Image: 300px mobile full-bleed; desktop: absolute left half */}
            <div className="relative h-[300px] lg:h-auto overflow-hidden -mx-4 lg:mx-0 lg:absolute lg:top-0 lg:bottom-0 lg:left-[-2rem] lg:right-[50%]">
              <Image
                src={cloudfrontImage(active.image)}
                alt=""
                fill
                className="object-cover object-center"
              />
            </div>

            {/* Content: right half on desktop */}
            <div className="w-full lg:w-1/2 lg:ml-auto lg:pl-8">
              <div className="p-4">
                {/* Divider: margin-bottom 3rem */}
                <div className="mb-12"><Divider /></div>

                {/* Quote with decorative SVG marks */}
                <div className="relative py-6">
                  {/* Opening quote: 20x20, positioned top -25px */}
                  <div
                    className="absolute w-5 h-5 bg-contain bg-center bg-no-repeat"
                    style={{ top: -25, left: 0, backgroundImage: 'url(/images/quote.svg)' }}
                  />
                  <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light m-0">
                    {active.quote}
                  </p>
                  <p className="text-sm text-gray mt-4 mb-0 leading-snug">
                    <span>{active.quotee}</span><br />
                    <span>{active.quoteeSub}</span>
                  </p>
                  {/* Closing quote: 20x20, bottom -25px, right 0, flipped */}
                  <div
                    className="absolute right-0 w-5 h-5 bg-contain bg-center bg-no-repeat"
                    style={{ bottom: -25, backgroundImage: 'url(/images/quote.svg)', transform: 'rotateX(180deg) scaleX(-1)' }}
                  />
                </div>

                {/* Divider: margin-top 2rem */}
                <div className="mt-8"><Divider /></div>
              </div>

              {/* CTA button: full-width block, lg: min-w-330 auto */}
              <a
                href={active.ctaLink}
                target={active.ctaExternal ? '_blank' : undefined}
                rel={active.ctaExternal ? 'noopener noreferrer' : undefined}
                className="block w-full text-center bg-primary text-white border border-primary hover:bg-primary-dark hover:border-primary-dark font-semibold uppercase tracking-[2px] text-[15px] leading-[1.625rem] py-1.5 no-underline transition-colors lg:min-w-[330px] lg:w-auto lg:inline-block"
              >
                {active.ctaText}
              </a>
            </div>
          </div>
        </div>

        {/* Dots: inside gray area, orange, 12px, gap 10px */}
        <div className="absolute bottom-3 left-0 right-0 flex justify-center" style={{ gap: 10 }}>
          {reviews.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'w-3 h-3 rounded-full border-0 cursor-pointer p-0 transition-opacity',
                index === activeIndex ? 'bg-primary opacity-100' : 'bg-primary opacity-50'
              )}
              aria-label={`Review ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
