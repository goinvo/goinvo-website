'use client'

import { useEffect } from 'react'
import { useHero, type HeroEditTarget } from '@/context/HeroContext'

/**
 * Sets the PersistentHero image for a case study / vision page.
 * For card-click navigation, the hero is already set by CaseStudyCard.
 * For direct URL access, this component sets it on mount so PersistentHero appears.
 *
 * Pass `editTarget` in draft mode when the image is a placeholder to
 * make the hero click-through to the Sanity Presentation edit panel
 * for the image field.
 */
export function SetCaseStudyHero({
  image,
  expandAfterSlide,
  bgPosition,
  editTarget,
}: {
  image: string
  expandAfterSlide?: boolean
  /** CSS object-position value (e.g. "top center", "bottom center", "center") */
  bgPosition?: string
  editTarget?: HeroEditTarget
}) {
  const { setCurrentHero } = useHero()

  // Stable JSON so useEffect deps don't rerun every render from a fresh object
  const editTargetKey = editTarget
    ? `${editTarget.documentType}:${editTarget.documentId}:${editTarget.fieldPath}`
    : ''

  useEffect(() => {
    setCurrentHero(image, bgPosition, expandAfterSlide, editTarget)
    // editTargetKey is a stable serialization of editTarget
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, bgPosition, expandAfterSlide, editTargetKey, setCurrentHero])

  return null
}
