'use client'

import { useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CaseStudy, Feature } from '@/types'
import { urlForImage } from '@/sanity/lib/image'
import { usePageTransition } from '@/context/PageTransitionContext'
import { useHero } from '@/context/HeroContext'
import { trackCaseStudyClick } from '@/lib/analytics'

interface CaseStudyCardProps {
  caseStudy: CaseStudy | Feature
  className?: string
  variant?: 'default' | 'up-next'
}

export function CaseStudyCard({
  caseStudy,
  className,
  variant = 'default',
}: CaseStudyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const ctx = usePageTransition()
  const { setCaseStudyHero } = useHero()

  const hasHeroAsset = Boolean(caseStudy.image?.asset)

  // Honor the editor's chosen crop in the card: features use the heroPosition
  // dropdown, case studies use the image hotspot (crosshair). Fall back to the
  // historical 'center top'. The card URL keeps the image's natural aspect (no
  // forced server-side crop) so object-cover + objectPosition is the single,
  // predictable crop layer that the hotspot/position actually controls.
  const hotspot = caseStudy.image?.hotspot
  const heroPosition = (caseStudy as { heroPosition?: string }).heroPosition?.trim()
  const imagePosition =
    heroPosition ||
    (hotspot ? `${(hotspot.x * 100).toFixed(2)}% ${(hotspot.y * 100).toFixed(2)}%` : 'center top')

  // Source the card image large enough to stay crisp on retina at the widest
  // card size (the 2-col /work grid ~600px CSS px → ~1200 device px). Next/Image
  // can only downscale from this source, so 800px was upscaling/softening it.
  const imageUrl = hasHeroAsset
    ? urlForImage(caseStudy.image!).width(1600).fit('max').url()
    : null

  // Higher-res URL for the hero (overlay morph + PersistentHero).
  // Avoid pre-cropping here so UI screenshots stay crisp.
  const heroImageUrl = hasHeroAsset
    ? urlForImage(caseStudy.image!).width(2000).quality(95).url()
    : null

  const caseStudySlug = caseStudy.slug.current

  const isFeature = caseStudy._type === 'feature'
  const section = isFeature ? 'vision' : 'work'
  const externalLink = isFeature ? (caseStudy as Feature).externalLink : undefined
  const href = externalLink || `/${section}/${caseStudySlug}`
  const isExternal = Boolean(externalLink)
  const clientName = caseStudy.client?.trim()
  const showClient = variant === 'default' && section === 'work' && !!clientName
  const detailText = (
    isFeature ? (caseStudy as Feature).description : (caseStudy as CaseStudy).caption
  )
  const displayTitle = (isFeature ? undefined : (caseStudy as CaseStudy).heading) || caseStudy.title

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isExternal) return

      // No real hero asset: let the Link navigate normally so the
      // target page can render its own HeroEditPlaceholder. Pre-seeding
      // the hero with the placeholder URL would flash a broken image.
      if (!ctx || !heroImageUrl || !cardRef.current) return

      const imageEl = cardRef.current.querySelector('[data-card-image]')
      if (!imageEl) return

      const rect = imageEl.getBoundingClientRect()
      e.preventDefault()

      trackCaseStudyClick({
        case_study_title: displayTitle,
        case_study_slug: caseStudySlug,
        click_location: 'work_grid',
      })

      // Preload the hero-res image so PersistentHero can show it from cache
      const preload = new window.Image()
      preload.src = heroImageUrl

      // Set the hero image in HeroContext BEFORE navigation
      setCaseStudyHero(heroImageUrl)

      ctx.triggerCardTransition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        image: heroImageUrl,
        href,
      })
    },
    [caseStudySlug, ctx, displayTitle, heroImageUrl, href, isExternal, setCaseStudyHero]
  )

  return (
    <div ref={cardRef} className="h-full">
      <Link href={href} onClick={handleClick} className="no-underline h-full block">
        <motion.article
          className={cn(
            'group bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow h-full flex flex-col',
            'duration-500 ease-out',
            className
          )}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div data-card-image className="relative h-[260px] overflow-hidden bg-gray-medium [backface-visibility:hidden]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={displayTitle}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 620px"
                className={cn(
                  'object-cover [backface-visibility:hidden] transition-transform will-change-transform',
                  'duration-500 ease-out group-hover:scale-[1.025]',
                )}
                style={{ objectPosition: imagePosition }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray text-sm">
                No image
              </div>
            )}
          </div>
          <div className="p-4 [&>p]:m-0 [&>p]:mb-1 flex-grow">
            <p className="font-semibold text-black">{displayTitle}</p>
            {/* For vision features, "client" is just the literal "Feature" — skip it and show description instead */}
            {showClient && (
              <p className="text-gray">{clientName}</p>
            )}
            {detailText && (
              <p className="text-gray">{detailText}</p>
            )}
          </div>
        </motion.article>
      </Link>
    </div>
  )
}
