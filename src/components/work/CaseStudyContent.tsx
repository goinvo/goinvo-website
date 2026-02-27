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

  const heroImageUrl = caseStudy.image
    ? urlForImage(caseStudy.image).width(1600).height(900).url()
    : null

  return (
    <div>
      {heroImageUrl && <SetCaseStudyHero image={heroImageUrl} />}

      <Reveal style="slide-up" duration={0.5}>
        <div className="max-width max-width-md content-padding mx-auto">
          <h1
            className="font-serif text-3xl md:text-4xl mt-8 mb-2"
            style={{ viewTransitionName: 'page-title' }}
          >
            {caseStudy.title}
          </h1>
          {caseStudy.categories && caseStudy.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {caseStudy.categories.map((cat) => (
                <span
                  key={cat._id}
                  className="text-xs uppercase tracking-wider text-gray bg-gray-light px-3 py-1"
                >
                  {cat.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      <CaseStudyLayout caseStudy={caseStudy} />
    </div>
  )
}
