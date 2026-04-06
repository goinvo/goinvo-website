'use client'

import { cloudfrontImage } from '@/lib/utils'
import { ImageCarousel } from '@/components/ui/ImageCarousel'

const slides = Array.from({ length: 21 }, (_, i) => ({
  url: cloudfrontImage(`/images/features/augmented-clinical-decision-support/pregnancy-${i + 1}.jpg`),
  alt: `Pregnancy storyboard panel ${i + 1} of 21`,
}))

export function PregnancyCarousel() {
  return (
    <div className="max-width content-padding mx-auto">
      <ImageCarousel images={slides} />
    </div>
  )
}
