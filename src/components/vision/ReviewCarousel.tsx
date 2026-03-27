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
      {/* Heading: header--xl, pad-top--double, margin-bottom--none */}
      <div className="max-width content-padding pt-8">
        <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light m-0">
          Reviews for<span className="text-primary font-serif">...</span>
        </h2>
      </div>

      {/* Tabs: carousel__menu-items
           margin: 1rem 0 2rem; display: flex (desktop)
           Each li: border-top 1px #d0cfce, flex: 1 1, position relative
           Desktop: border-bottom on all, margin-right 1rem between
           Button: text-align left, padding 4px 0, width 100%, font 15px/26px, weight 400 */}
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
                style={{
                  textAlign: 'left',
                  padding: '4px 0',
                  fontSize: 15,
                  lineHeight: '26px',
                  fontWeight: 400,
                }}
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

      {/* Content: background--gray, padding-bottom 50px for dots
           Image: 300px mobile (full-bleed), absolute left half desktop
           Content: margin-left 2rem on desktop */}
      <div className="bg-gray-light relative" style={{ paddingBottom: 50 }}>
        <div className="max-width content-padding">
          <div className="relative">
            {/* Image: gradient-image-columns__image
                 mobile: h-300, width calc(100% + 2rem), margin-left -1rem
                 desktop: absolute top:0 bottom:0 left:0 right:50% */}
            <div
              className="review-slide-image relative overflow-hidden h-[300px] lg:absolute lg:top-0 lg:bottom-0 lg:left-0 lg:right-[50%] lg:h-auto lg:!w-auto lg:!ml-0"
              style={{ width: 'calc(100% + 2rem)', marginLeft: '-1rem' }}
            >
              <Image
                src={cloudfrontImage(active.image)}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(min-width: 864px) 50vw, 100vw"
              />
            </div>

            {/* Right column: content
                 desktop: margin-left ~50% + 2rem padding */}
            <div className="lg:ml-[50%] lg:pl-8">
              <div className="p-4">
                {/* Divider: margin-bottom 3rem */}
                <div style={{ marginBottom: '3rem' }}>
                  <Divider />
                </div>

                {/* Quote text with SVG quote marks */}
                <div className="relative">
                  {/* Opening quote: 20x20 absolute, top -25px */}
                  <div
                    className="absolute bg-contain bg-center bg-no-repeat"
                    style={{ top: -25, left: 0, width: 20, height: 20, backgroundImage: 'url(/images/quote.svg)' }}
                  />
                  <p className="font-serif text-[1.5rem] leading-[2.125rem] font-light m-0">
                    {active.quote}
                  </p>
                  {/* Attribution */}
                  <p className="text-sm leading-snug mt-4 mb-0" style={{ color: '#787473' }}>
                    <span>{active.quotee}</span><br />
                    <span>{active.quoteeSub}</span>
                  </p>
                  {/* Closing quote: 20x20 absolute, bottom -25px, right 0, flipped */}
                  <div
                    className="absolute bg-contain bg-center bg-no-repeat"
                    style={{ bottom: -25, right: 0, width: 20, height: 20, backgroundImage: 'url(/images/quote.svg)', transform: 'rotateX(180deg) scaleX(-1)' }}
                  />
                </div>

                {/* Divider: margin-top 2rem */}
                <div style={{ marginTop: '2rem' }}>
                  <Divider />
                </div>
              </div>

              {/* CTA: button--primary button--lg button--block
                   display block, width 100%, bg #e36216, text white center
                   font 15px/26px weight 600, uppercase tracking, padding 6px 16px
                   desktop: min-width 330px, width auto */}
              <a
                href={active.ctaLink}
                target={active.ctaExternal ? '_blank' : undefined}
                rel={active.ctaExternal ? 'noopener noreferrer' : undefined}
                className="no-underline transition-colors hover:bg-primary-dark hover:border-primary-dark"
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  backgroundColor: '#e36216',
                  color: '#fff',
                  border: '1px solid #e36216',
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: '26px',
                  padding: '6px 16px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  textDecoration: 'none',
                }}
              >
                {active.ctaText}
              </a>
            </div>
          </div>
        </div>

        {/* Dots: slick-dots
             full width, absolute bottom -37px (inside 50px padding)
             text-align center, list items inline-block margin 0 5px
             buttons: 20x20 with 5px padding, font-size 0 (hidden text)
             dot color: #e36216, opacity 0.5 inactive, 1 active */}
        <div
          className="absolute left-0 right-0 text-center"
          style={{ bottom: 13 }}
        >
          {reviews.map((_, index) => (
            <span
              key={index}
              className="inline-block"
              style={{ margin: '0 5px' }}
            >
              <button
                onClick={() => setActiveIndex(index)}
                className="cursor-pointer border-0 bg-transparent block"
                style={{
                  width: 20,
                  height: 20,
                  padding: 5,
                  fontSize: 0,
                  lineHeight: 0,
                  color: 'transparent',
                  position: 'relative',
                }}
                aria-label={`Review ${index + 1}`}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    fontSize: 12,
                    color: '#e36216',
                    opacity: index === activeIndex ? 1 : 0.5,
                  }}
                >
                  •
                </span>
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
