'use client'

import Image from 'next/image'
import { Carousel } from '@/components/ui/Carousel'
import { cloudfrontImage } from '@/lib/utils'

const slides = Array.from({ length: 21 }, (_, i) => ({
  src: `/images/features/augmented-clinical-decision-support/pregnancy-${i + 1}.jpg`,
  alt: `Pregnancy storyboard panel ${i + 1} of 21`,
}))

export function PregnancyCarousel() {
  return (
    <div className="max-width content-padding mx-auto">
      <Carousel dots>
        {slides.map((slide) => (
          <div key={slide.src} className="flex items-center justify-center">
            <Image
              src={cloudfrontImage(slide.src)}
              alt={slide.alt}
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </div>
        ))}
      </Carousel>
    </div>
  )
}
