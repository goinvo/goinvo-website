'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { CategoriesList } from '@/components/ui/CategoriesList'
import { CaseStudyCard } from './CaseStudyCard'
import { NewDraftCard } from '@/components/ui/NewDraftCard'
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
  draftCaseStudies?: CaseStudy[]
}

export function ProjectSearch({ caseStudies, draftCaseStudies = [] }: ProjectSearchProps) {
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
      {/* Draft-only case studies — visible only in preview mode */}
      {draftCaseStudies.length > 0 && (
        <div className="relative border-b border-gray-medium">
          <div
            className="absolute left-0 top-0 bottom-0 w-3"
            style={{
              background: 'repeating-linear-gradient(180deg, #f59e0b 0px, #f59e0b 8px, white 8px, white 16px)',
              maskImage: 'linear-gradient(to right, black, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, black, transparent)',
            }}
          />
          <div className="max-width content-padding py-8">
            <h3 className="font-sans text-sm font-semibold uppercase tracking-[2px] text-tertiary m-0 mb-6">
              Drafts ({draftCaseStudies.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {draftCaseStudies.map((study) => (
                <div key={study._id} className="relative">
                  {study.slug?.current ? (
                    <CaseStudyCard caseStudy={study} />
                  ) : (
                    <div className="bg-white overflow-hidden shadow-card p-6 h-full flex flex-col justify-center items-center text-center">
                      <p className="font-semibold text-black mb-1">{study.title || 'Untitled'}</p>
                      <p className="text-gray text-sm">No slug set — generate one in the Studio to preview</p>
                    </div>
                  )}
                </div>
              ))}
              {/* New draft card */}
              <NewDraftCard type="caseStudy" label="New Case Study" />
            </div>
          </div>
        </div>
      )}

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
