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

interface BlockChild {
  _key?: string
  marks?: string[]
  text?: string
}

export function CaseStudyContent({ initialData, slug }: Props) {
  const caseStudy = useLiveData(initialData, caseStudyBySlugQuery, { slug })

  if (!caseStudy) return null

  const firstContentBlock = caseStudy.content?.[0]
  const firstContentChildren: BlockChild[] =
    firstContentBlock?._type === 'block' ? (firstContentBlock.children as BlockChild[]) || [] : []
  const firstContentText = firstContentChildren
    .map((child) => child.text || '')
    .join('')
    .trim()
  const hasLeadingClientSubtitle =
    !!caseStudy.client &&
    firstContentText.toLowerCase() === `for ${caseStudy.client}`.toLowerCase()
  const showClientSubtitle =
    !!caseStudy.client &&
    caseStudy.client !== 'GoInvo' &&
    !caseStudy.hideClientSubtitle
  const normalizedCaseStudy = hasLeadingClientSubtitle
    ? { ...caseStudy, content: caseStudy.content?.slice(1) }
    : caseStudy

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
            className="header-xl mt-8 mb-2"
            style={{ viewTransitionName: 'page-title' }}
          >
            {caseStudy.heading || caseStudy.title}
          </h1>
          {showClientSubtitle && (
            <p className="text-gray mt-0 mb-8">
              {hasLeadingClientSubtitle
                ? firstContentChildren.map((child, index) => {
                    const text = child.text || ''
                    if (!text) return null

                    let content = <>{text}</>
                    if (child.marks?.includes('strong')) {
                      content = <strong>{content}</strong>
                    }
                    if (child.marks?.includes('em')) {
                      content = <em>{content}</em>
                    }

                    return <span key={child._key || `${index}-${text}`}>{content}</span>
                  })
                : <>for {caseStudy.client}</>}
            </p>
          )}
        </div>
      </Reveal>

      <CaseStudyLayout caseStudy={normalizedCaseStudy} />
    </div>
  )
}
