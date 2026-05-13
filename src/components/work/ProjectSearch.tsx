'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { CategoriesList } from '@/components/ui/CategoriesList'
import { CaseStudyCard } from './CaseStudyCard'
import { NewDraftCard } from '@/components/ui/NewDraftCard'
import { DraftDeleteButton } from '@/components/ui/DraftDeleteButton'
import { useHero } from '@/context/HeroContext'
import type { CaseStudy, Category, Feature } from '@/types'

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

function categoryParamValue(category: string): string {
  return normalizeCategoryValue(category)
}

function normalizeCategoryValue(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function itemMatchesCategory(item: CaseStudy | Feature, category: string): boolean {
  const activeCategory = normalizeCategoryValue(category)
  const categories = (item.categories ?? []) as Array<Category | string>

  return categories.some((candidate) => {
    if (typeof candidate === 'string') {
      return normalizeCategoryValue(candidate) === activeCategory
    }

    return (
      normalizeCategoryValue(candidate.title) === activeCategory ||
      normalizeCategoryValue(candidate.slug?.current ?? '') === activeCategory
    )
  })
}

function resolveCategoryFromParam(
  value: string | null,
  categories: string[],
): string {
  if (!value) return 'All'

  const normalizedValue = value.trim().toLowerCase()
  return categories.find((category) => (
    category.toLowerCase() === normalizedValue ||
    categoryParamValue(category) === normalizedValue
  )) || 'All'
}

interface ProjectSearchProps {
  caseStudies: Array<CaseStudy | Feature>
  draftCaseStudies?: CaseStudy[]
  initialCategory?: string
  /** Main (filter-driving) categories, pre-sorted. Drives the filter chip row. */
  mainCategories: Category[]
}

export function ProjectSearch({
  caseStudies,
  draftCaseStudies = [],
  initialCategory,
  mainCategories,
}: ProjectSearchProps) {
  const pathname = usePathname()
  const router = useRouter()
  const filterCategories = useMemo(
    () => ['All', ...mainCategories.map((c) => c.title)],
    [mainCategories],
  )
  const [activeCategory, setActiveCategory] = useState(
    () => resolveCategoryFromParam(initialCategory || null, filterCategories),
  )
  const { overrideImage } = useHero()
  const prevIndexRef = useRef(0)
  const hasMountedRef = useRef(false)

  useEffect(() => {
    const prevIndex = prevIndexRef.current
    const nextIndex = filterCategories.indexOf(activeCategory)
    const direction = nextIndex > prevIndex ? 1 : -1
    prevIndexRef.current = nextIndex

    const images = categoryHeroImages[activeCategory] || categoryHeroImages.All
    const shouldAnimate = hasMountedRef.current
    hasMountedRef.current = true
    overrideImage(pickRandom(images), 'center top', direction, { animate: shouldAnimate })
  }, [activeCategory, filterCategories, overrideImage])

  const handleCategorySelect = useCallback((category: string) => {
    setActiveCategory(category)

    const nextParams = new URLSearchParams(window.location.search)

    if (category === 'All') {
      nextParams.delete('category')
    } else {
      nextParams.set('category', categoryParamValue(category))
    }

    const queryString = nextParams.toString()
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
  }, [pathname, router])

  useEffect(() => {
    const syncCategoryFromLocation = () => {
      const nextParams = new URLSearchParams(window.location.search)
      setActiveCategory(resolveCategoryFromParam(nextParams.get('category'), filterCategories))
    }

    window.addEventListener('popstate', syncCategoryFromLocation)
    return () => window.removeEventListener('popstate', syncCategoryFromLocation)
  }, [filterCategories])

  const filteredStudies = useMemo(() => {
    if (activeCategory === 'All') return caseStudies
    return caseStudies.filter((study) => itemMatchesCategory(study, activeCategory))
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
                <div key={study._id} className="group relative">
                  {study.slug?.current ? (
                    <CaseStudyCard caseStudy={study} />
                  ) : (
                    <div className="bg-white overflow-hidden shadow-card p-6 h-full flex flex-col justify-center items-center text-center">
                      <p className="font-semibold text-black mb-1">{study.title || 'Untitled'}</p>
                      <p className="text-gray text-sm">No slug set — generate one in the Studio to preview</p>
                    </div>
                  )}
                  <DraftDeleteButton
                    documentId={study._draftId}
                    type="caseStudy"
                    title={study.title || 'Untitled'}
                  />
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
