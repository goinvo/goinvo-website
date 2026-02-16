'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { VisionProject } from '@/types'

const INITIAL_COUNT = 12
const LOAD_MORE_COUNT = 9

interface VisionGridProps {
  projects: VisionProject[]
}

export function VisionGrid({ projects }: VisionGridProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const remaining = projects.length - visibleCount
  const hasMore = remaining > 0
  const visibleProjects = projects.slice(0, visibleCount)

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + LOAD_MORE_COUNT, projects.length))
  }, [projects.length])

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleProjects.map((project) => (
          <Link
            key={project._id}
            href={`/vision/${project.slug.current}`}
            className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-[var(--transition-card)]"
          >
            <div className="aspect-[16/10] bg-gray-medium" />
            <div className="p-6">
              {project.category && (
                <span className="text-xs uppercase tracking-wider text-gray font-semibold">
                  {project.category}
                </span>
              )}
              <h3 className="font-serif text-xl mt-1 group-hover:text-primary transition-colors">
                {project.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <>
          {/* Intersection Observer sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {/* Fallback button */}
          <div className="text-center mt-8">
            <button
              onClick={loadMore}
              className="inline-block bg-white border border-gray-medium text-gray font-semibold px-8 py-3 hover:border-primary hover:text-primary transition-colors"
            >
              Load More Features ({remaining} remaining)
            </button>
          </div>
        </>
      )}

      {projects.length === 0 && (
        <p className="text-center text-gray py-12">
          Vision projects will appear here once added to the CMS.
        </p>
      )}
    </>
  )
}
