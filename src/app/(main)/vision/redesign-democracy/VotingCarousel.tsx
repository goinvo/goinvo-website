'use client'

import Image from 'next/image'
import { LegacyCarousel } from './LegacyCarousel'

const IMG = (path: string) =>
  `https://www.goinvo.com/old/images/features/democracy/${path}`

interface VotingSlide {
  title: string
  subtitle?: string
  text: string
  text2?: string
  images: string[]
}

export function VotingCarousel({ slides }: { slides: VotingSlide[] }) {
  const tabs = slides.map((s) => s.subtitle ?? s.title)

  return (
    <LegacyCarousel
      tabs={tabs}
      className="voting-carousel"
    >
      {slides.map((slide, idx) => (
        <div key={idx} className="voting-slide">
          <header>
            <h3 className="font-serif text-[1.25rem] leading-tight sm:text-[1.75rem]">
              {slide.title}
            </h3>
            <hr className="section-hr" style={{ borderColor: '#aaa' }} />
          </header>
          {slide.subtitle && (
            <h5 className="font-semibold mb-2">{slide.subtitle}</h5>
          )}
          <p>{slide.text}</p>
          {slide.text2 && <p>{slide.text2}</p>}
          {slide.images.length > 0 && (
            <div
              className={`image-group${slide.images.length === 3 ? ' three' : ''}`}
            >
              {slide.images.map((img, i) => (
                <Image
                  key={i}
                  src={IMG(img)}
                  alt={slide.title}
                  width={400}
                  height={700}
                  className="h-auto"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </LegacyCarousel>
  )
}
