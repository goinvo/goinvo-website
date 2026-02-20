'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import type { StaticFeature } from '@/types'

const INITIAL_COUNT = 12
const LOAD_MORE_COUNT = 9

function isVideo(src: string) {
  return ['.mp4', '.webm', '.ogg', '.mov'].some((ext) =>
    src.toLowerCase().endsWith(ext)
  )
}

function FeatureCard({ feature }: { feature: StaticFeature }) {
  const isExternal = feature.externalLink
  const href = feature.link

  const cardContent = (
    <>
      <div className="h-[260px] overflow-hidden bg-gray-medium">
        {feature.video || isVideo(feature.image) ? (
          <video
            src={cloudfrontImage(feature.video || feature.image)}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            style={{
              objectPosition: feature.imagePosition || 'center center',
            }}
          />
        ) : (
          <Image
            src={cloudfrontImage(feature.image)}
            alt={feature.title}
            width={400}
            height={260}
            className="w-full h-full object-cover"
            style={{
              objectPosition: feature.imagePosition || 'center center',
            }}
          />
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-black mb-1 leading-snug">
          {feature.title}
        </p>
        <p className="text-gray text-sm mb-1">
          {feature.client}
          {feature.client && feature.date ? ' | ' : ''}
          {feature.date}
        </p>
        {feature.caption && (
          <p className="text-gray text-sm">{feature.caption}</p>
        )}
      </div>
    </>
  )

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-[var(--transition-card)] no-underline"
      >
        {cardContent}
      </a>
    )
  }

  return (
    <Link
      href={href}
      className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-[var(--transition-card)] no-underline"
    >
      {cardContent}
    </Link>
  )
}

interface VisionGridProps {
  features: StaticFeature[]
}

export function VisionGrid({ features }: VisionGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const remaining = features.length - visibleCount
  const hasMore = remaining > 0
  const visibleFeatures = features.slice(0, visibleCount)

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, features.length))
  }, [features.length])

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleFeatures.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>

      {hasMore && (
        <>
          <div ref={sentinelRef} className="h-1" />
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="inline-block bg-white border border-gray-medium text-gray font-semibold px-8 py-3 hover:border-secondary hover:text-secondary transition-colors"
            >
              Load More Features ({remaining} remaining)
            </button>
          </div>
        </>
      )}

      {features.length === 0 && (
        <p className="text-center text-gray py-12">
          No features available.
        </p>
      )}
    </>
  )
}
