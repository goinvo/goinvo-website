'use client'

import { urlForImage } from '@/sanity/lib/image'
import { caseStudyBySlugQuery } from '@/sanity/lib/queries'
import { useLiveData } from '@/components/sanity/LiveData'
import { CaseStudyLayout } from '@/components/work/CaseStudyLayout'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import type { CaseStudy } from '@/types'

interface Props {
  initialData: CaseStudy
  slug: string
}

export function CaseStudyContent({ initialData, slug }: Props) {
  const caseStudy = useLiveData(initialData, caseStudyBySlugQuery, { slug })

  if (!caseStudy) return null

  // Hero is 1280x450 (~2.84:1) so use a closer aspect than 16:9 to
  // minimize top/bottom cropping at desktop widths
  const heroImageUrl = caseStudy.image?.asset
    ? urlForImage(caseStudy.image).width(1600).height(564).url()
    : null

  return (
    <div>
      {heroImageUrl && <SetCaseStudyHero image={heroImageUrl} />}

      <Reveal style="slide-up" duration={0.5}>
        <div className="max-width max-width-md content-padding mx-auto">
          <h1
            className="header-xl mt-8 mb-6"
            style={{ viewTransitionName: 'page-title' }}
          >
            {caseStudy.heading || caseStudy.title}
          </h1>
          {(caseStudy.categories?.length || caseStudy.time) && (
            <div className="mb-4">
              {caseStudy.time && (
                <p className="text-gray m-0">
                  <span className="font-sans text-xs font-semibold uppercase tracking-[2px] text-gray">Time:</span>{' '}
                  {caseStudy.time}
                </p>
              )}
              {caseStudy.categories && caseStudy.categories.length > 0 && (
                <p className="text-gray m-0">
                  <span className="font-sans text-xs font-semibold uppercase tracking-[2px] text-gray">Tags:</span>{' '}
                  {caseStudy.categories.map((cat) => cat.title).join(', ')}
                </p>
              )}
            </div>
          )}
        </div>
      </Reveal>

      <CaseStudyLayout caseStudy={caseStudy} />
    </div>
  )
}
