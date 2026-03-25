import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { caseStudyBySlugQuery, allCaseStudiesQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { CaseStudyContent } from '@/components/work/CaseStudyContent'
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

  const ogImage = caseStudy.image
    ? urlForImage(caseStudy.image).width(1200).height(630).url()
    : undefined

  return {
    title: caseStudy.title,
    description: caseStudy.metaDescription || caseStudy.caption || undefined,
    openGraph: ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
    twitter: ogImage ? { images: [ogImage] } : undefined,
  }
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params
  const { data: caseStudy } = await sanityFetch({ query: caseStudyBySlugQuery, params: { slug } }) as { data: CaseStudy | null }

  if (!caseStudy) {
    notFound()
  }

  return <CaseStudyContent initialData={caseStudy} slug={slug} />
}
