'use client'

import { useState, useMemo, useCallback } from 'react'
import { CategoriesList } from '@/components/ui/CategoriesList'
import { CaseStudyCard } from './CaseStudyCard'
import { cloudfrontImage } from '@/lib/utils'
import type { CaseStudy } from '@/types'

const filterCategories = ['All', 'Healthcare', 'Enterprise', 'Government', 'AI']

const categoryHeroImages: Record<string, string[]> = {
  All: ['/images/work/dr-emily.jpg'],
  Healthcare: [
    '/images/homepage/precision-autism-hero.jpg',
    '/images/homepage/common_health_hero.jpg',
    '/images/features/living-health-lab/hero.jpg',
    '/images/homepage/open-source-bgd-9.jpg',
    '/images/homepage/doh-hero-fallback.jpg',
  ],
  Government: [
    '/images/homepage/hero-critical-mass-5.jpg',
    '/images/homepage/mitre_open_health_dashboard_demo_3.jpg',
  ],
  Enterprise: ['/images/enterprise/enterprise-hero-1.jpg'],
  AI: ['/images/case-studies/ipsos/facto/cover-2_xsm.jpg'],
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

interface ProjectSearchProps {
  caseStudies: CaseStudy[]
}

export function ProjectSearch({ caseStudies }: ProjectSearchProps) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [heroImage, setHeroImage] = useState('/images/work/dr-emily.jpg')

  const handleCategorySelect = useCallback((category: string) => {
    setActiveCategory(category)
    const images = categoryHeroImages[category] || categoryHeroImages.All
    setHeroImage(pickRandom(images))
  }, [])

  const filteredStudies = useMemo(() => {
    if (activeCategory === 'All') return caseStudies
    return caseStudies.filter((study) =>
      study.categories?.some(
        (cat) => cat.title.toLowerCase() === activeCategory.toLowerCase()
      )
    )
  }, [caseStudies, activeCategory])

  return (
    <div>
      {/* Dynamic Hero */}
      <div
        className="relative min-h-[50vh] flex items-center bg-cover bg-center -mx-[var(--spacing-content-padding)] -mt-12 mb-12"
        style={{
          backgroundImage: `url(${cloudfrontImage(heroImage)})`,
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-width content-padding py-16">
          <h1
            className="font-serif text-3xl md:text-4xl text-white mb-4"
            style={{ viewTransitionName: 'page-title' }}
          >
            Design that Delivers<span className="text-primary font-serif">.</span>
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Real projects, real users, real business outcomes.
          </p>
        </div>
      </div>

      <CategoriesList
        categories={filterCategories}
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
        className="mb-8"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredStudies.map((study) => (
          <CaseStudyCard key={study._id} caseStudy={study} />
        ))}
      </div>
      {filteredStudies.length === 0 && (
        <p className="text-center text-gray py-12">No projects found in this category.</p>
      )}
    </div>
  )
}
