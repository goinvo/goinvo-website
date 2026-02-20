import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { caseStudyBySlugQuery, allCaseStudiesQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { CaseStudyLayout } from '@/components/work/CaseStudyLayout'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import type { CaseStudy } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    const caseStudies = await client.fetch<CaseStudy[]>(allCaseStudiesQuery)
    return caseStudies.map((study) => ({
      slug: study.slug.current,
    }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: caseStudy } = await sanityFetch({ query: caseStudyBySlugQuery, params: { slug } }) as { data: CaseStudy | null }

  if (!caseStudy) {
    return { title: 'Case Study Not Found' }
  }

  return {
    title: caseStudy.title,
    description: caseStudy.metaDescription || caseStudy.caption || undefined,
  }
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params
  const { data: caseStudy } = await sanityFetch({ query: caseStudyBySlugQuery, params: { slug } }) as { data: CaseStudy | null }

  if (!caseStudy) {
    notFound()
  }

  const heroImageUrl = caseStudy.image
    ? urlForImage(caseStudy.image).width(1600).height(900).url()
    : null

  return (
    <div>
      {/* Set the hero in PersistentHero (outside AnimatePresence).
          For card-click nav this is already set; for direct URL access
          this fires on mount so the hero appears. */}
      {heroImageUrl && <SetCaseStudyHero image={heroImageUrl} />}

      {/* Title & metadata — below PersistentHero */}
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

      {/* Case Study Content */}
      <CaseStudyLayout caseStudy={caseStudy} />
    </div>
  )
}
