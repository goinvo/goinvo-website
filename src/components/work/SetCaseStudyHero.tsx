'use client'

import { useEffect } from 'react'
import { useHero } from '@/context/HeroContext'

/**
 * Sets the PersistentHero image for a case study page.
 * For card-click navigation, the hero is already set by CaseStudyCard.
 * For direct URL access, this component sets it on mount so PersistentHero appears.
 */
export function SetCaseStudyHero({ image }: { image: string }) {
  const { setCaseStudyHero } = useHero()

  useEffect(() => {
    setCaseStudyHero(image)
  }, [image, setCaseStudyHero])

  return null
}
