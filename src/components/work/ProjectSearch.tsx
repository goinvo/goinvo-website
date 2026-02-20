'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { CategoriesList } from '@/components/ui/CategoriesList'
import { CaseStudyCard } from './CaseStudyCard'
import { useHero } from '@/context/HeroContext'
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
  const { overrideImage } = useHero()
  const prevIndexRef = useRef(0)

  const handleCategorySelect = useCallback((category: string) => {
    const prevIndex = prevIndexRef.current
    const nextIndex = filterCategories.indexOf(category)
    const direction = nextIndex > prevIndex ? 1 : -1
    prevIndexRef.current = nextIndex

    setActiveCategory(category)

    const images = categoryHeroImages[category] || categoryHeroImages.All
    overrideImage(pickRandom(images), 'center top', direction)
  }, [overrideImage])

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
      {/* Categories band — gray background */}
      <div className="bg-gray-light">
        <div className="max-width content-padding pt-4 pb-8">
          <CategoriesList
            categories={filterCategories}
            activeCategory={activeCategory}
            onSelect={handleCategorySelect}
          />
        </div>
      </div>

      {/* Case study grid — white background */}
      <div className="max-width content-padding py-8 lg:py-8">
        <div className="lg:mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredStudies.map((study) => (
              <CaseStudyCard key={study._id} caseStudy={study} />
            ))}
          </div>
          {filteredStudies.length === 0 && (
            <p className="text-center text-gray py-12">No projects found in this category.</p>
          )}
        </div>
      </div>
    </div>
  )
}
