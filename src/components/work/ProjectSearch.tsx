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
      {/* Hero with white text box */}
      <div
        className="relative h-[220px] lg:h-[450px] bg-cover bg-center"
        style={{
          backgroundImage: `url(${cloudfrontImage(heroImage)})`,
        }}
      >
        <div className="absolute bottom-0 left-0 w-full lg:w-auto">
          <div className="max-width content-padding">
            <div
              className="bg-white/80 backdrop-blur-sm px-8 py-6 lg:w-[385px]"
              style={{ viewTransitionName: 'page-title' }}
            >
              <h1 className="font-serif text-3xl md:text-4xl text-black mb-2">
                Design that Delivers<span className="text-primary font-serif">.</span>
              </h1>
              <p className="text-black/70 text-lg font-serif">
                Real projects, real users, real business outcomes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories band — gray background */}
      <div className="bg-gray-light">
        <div className="max-width content-padding py-8">
          <CategoriesList
            categories={filterCategories}
            activeCategory={activeCategory}
            onSelect={handleCategorySelect}
          />
        </div>
      </div>

      {/* Case study grid — white background */}
      <div className="max-width content-padding py-12">
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
  )
}
