'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useHero, type HeroEditTarget } from '@/context/HeroContext'
import { heroImageSrc } from '@/components/layout/PersistentHero'

/**
 * Sets the PersistentHero image for a case study / vision page.
 * For card-click navigation, the hero is already set by CaseStudyCard.
 * For direct URL access, this component sets it on mount so PersistentHero appears.
 *
 * Until then it renders a stand-in with the hero's exact geometry, so the server HTML
 * already shows the image. Without it the hero arrived only after hydration and pushed
 * the whole page down (a 0.33 layout shift on direct loads). The stand-in sits at the top
 * of the page out of flow, and globals.css reserves its height as padding on <body>, i.e.
 * OUTSIDE <main>: the real hero is inserted before <main>, so a space held inside <main>
 * would still let <main>'s own box move, which Chrome counts as a shift. The same rules
 * drop the padding and hide the stand-in in the frame the real hero mounts.
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

  // A draft's click-to-edit placeholder is left to PersistentHero.
  if (editTarget) return null

  return (
    <div data-hero-ssr aria-hidden className="absolute inset-x-0 top-0 pt-[var(--spacing-header-height)]">
      <div className="relative overflow-hidden h-[220px] lg:h-[450px]">
        <Image
          src={heroImageSrc(image)}
          alt=""
          fill
          className="object-cover"
          style={{ objectPosition: bgPosition ?? 'center' }}
          quality={95}
          sizes="100vw"
          priority
        />
      </div>
    </div>
  )
}
