'use client'

import { useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CaseStudy } from '@/types'
import { urlForImage } from '@/sanity/lib/image'
import { usePageTransition } from '@/context/PageTransitionContext'

interface CaseStudyCardProps {
  caseStudy: CaseStudy
  className?: string
}

export function CaseStudyCard({ caseStudy, className }: CaseStudyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const ctx = usePageTransition()

  const imageUrl = caseStudy.image
    ? urlForImage(caseStudy.image).width(800).height(500).url()
    : undefined

  const href = `/work/${caseStudy.slug.current}`

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!ctx || !imageUrl || !cardRef.current) return

      const imageEl = cardRef.current.querySelector('[data-card-image]')
      if (!imageEl) return

      const rect = imageEl.getBoundingClientRect()
      e.preventDefault()
      ctx.triggerCardTransition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        image: imageUrl,
        href,
      })
    },
    [ctx, imageUrl, href]
  )

  return (
    <div ref={cardRef}>
      <Link href={href} onClick={handleClick}>
        <motion.article
          className={cn(
            'group bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-[var(--transition-card)]',
            className
          )}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.3 }}
        >
          {imageUrl && (
            <div data-card-image className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={imageUrl}
                alt={caseStudy.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-[var(--transition-card)]"
              />
            </div>
          )}
          <div className="p-6">
            {caseStudy.client && (
              <span className="text-xs uppercase tracking-wider text-gray font-semibold">
                {caseStudy.client}
              </span>
            )}
            <h3 className="font-serif text-xl mt-1 mb-2">{caseStudy.title}</h3>
            {caseStudy.caption && (
              <p className="text-gray text-md line-clamp-2">{caseStudy.caption}</p>
            )}
            {caseStudy.categories && caseStudy.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {caseStudy.categories.map((cat) => (
                  <span
                    key={cat._id}
                    className="text-xs uppercase tracking-wider text-gray bg-gray-light px-2 py-1"
                  >
                    {cat.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.article>
      </Link>
    </div>
  )
}
