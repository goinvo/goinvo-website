import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { caseStudyBySlugQuery, allCaseStudiesQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { CaseStudyLayout } from '@/components/work/CaseStudyLayout'
import type { CaseStudy } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const caseStudies = await client.fetch<CaseStudy[]>(allCaseStudiesQuery)
  return caseStudies.map((study) => ({
    slug: study.slug.current,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const caseStudy = await client.fetch<CaseStudy>(caseStudyBySlugQuery, { slug })

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
  const caseStudy = await client.fetch<CaseStudy>(caseStudyBySlugQuery, { slug })

  if (!caseStudy) {
    notFound()
  }

  const heroImageUrl = caseStudy.image
    ? urlForImage(caseStudy.image).width(1600).height(900).url()
    : null

  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[50vh] flex items-end"
        style={{ viewTransitionName: 'hero-image' }}
      >
        {heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt={caseStudy.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 max-width content-padding py-12 w-full">
          {caseStudy.client && (
            <span className="text-primary-light text-sm uppercase tracking-wider font-semibold">
              {caseStudy.client}
            </span>
          )}
          <h1
            className="font-serif text-3xl md:text-4xl text-white mt-2 mb-3"
            style={{ viewTransitionName: 'page-title' }}
          >
            {caseStudy.title}
          </h1>
          {caseStudy.caption && (
            <p className="text-white/80 text-lg max-w-2xl">{caseStudy.caption}</p>
          )}
          {caseStudy.categories && caseStudy.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {caseStudy.categories.map((cat) => (
                <span
                  key={cat._id}
                  className="text-xs uppercase tracking-wider text-white/70 bg-white/10 px-3 py-1"
                >
                  {cat.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Case Study Content */}
      <CaseStudyLayout caseStudy={caseStudy} />
    </div>
  )
}
