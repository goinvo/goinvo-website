'use client'

import { useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CaseStudy } from '@/types'
import { urlForImage } from '@/sanity/lib/image'
import { usePageTransition } from '@/context/PageTransitionContext'
import { useHero } from '@/context/HeroContext'
import { trackCaseStudyClick } from '@/lib/analytics'

interface CaseStudyCardProps {
  caseStudy: CaseStudy
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

  const imageUrl = caseStudy.image?.asset
    ? urlForImage(caseStudy.image).width(800).height(500).url()
    : undefined

  // Higher-res URL for the hero (overlay morph + PersistentHero)
  // Hero is 1280x450 (~2.84:1) so use a closer aspect than 16:9 to
  // minimize top/bottom cropping at desktop widths
  const heroImageUrl = caseStudy.image?.asset
    ? urlForImage(caseStudy.image).width(1600).height(564).url()
    : undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const section = (caseStudy as any)._type === 'feature' ? 'vision' : 'work'
  const href = `/${section}/${caseStudy.slug.current}`
  const showClient = variant === 'default' && section === 'work' && !!caseStudy.client
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detailText = caseStudy.caption || (caseStudy as any).description

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!ctx || !heroImageUrl || !cardRef.current) return

      const imageEl = cardRef.current.querySelector('[data-card-image]')
      if (!imageEl) return

      const rect = imageEl.getBoundingClientRect()
      e.preventDefault()

      trackCaseStudyClick({
        case_study_title: caseStudy.title,
        case_study_slug: caseStudy.slug.current,
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
    [ctx, heroImageUrl, href, setCaseStudyHero]
  )

  return (
    <div ref={cardRef} className="h-full">
      <Link href={href} onClick={handleClick} className="no-underline h-full block">
        <motion.article
          className={cn(
            'group bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-[var(--transition-card)] h-full flex flex-col',
            className
          )}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.3 }}
        >
          {imageUrl && (
            <div data-card-image className="relative h-[260px] overflow-hidden [backface-visibility:hidden]">
              <Image
                src={imageUrl}
                alt={caseStudy.title}
                fill
                className="object-cover [backface-visibility:hidden] group-hover:scale-105 transition-transform duration-[var(--transition-card)]"
                style={{ objectPosition: 'center top' }}
              />
            </div>
          )}
          <div className="p-4 [&>p]:m-0 [&>p]:mb-1 flex-grow">
            <p className="font-semibold text-black">{caseStudy.title}</p>
            {/* For vision features, "client" is just the literal "Feature" — skip it and show description instead */}
            {showClient && (
              <p className="text-gray">{caseStudy.client}</p>
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
