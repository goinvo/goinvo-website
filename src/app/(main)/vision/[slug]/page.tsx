import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { featureBySlugQuery, allFeaturesQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { stripAuthorHeading } from '@/lib/utils'
import type { Feature } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  try {
    const features = await client.fetch<Feature[]>(allFeaturesQuery)
    return features
      .filter((f) => !f.externalLink)
      .map((f) => ({
        slug: f.slug.current,
      }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: feature } = (await sanityFetch({
    query: featureBySlugQuery,
    params: { slug },
  })) as { data: Feature | null }

  if (!feature) {
    return { title: 'Vision Project Not Found' }
  }

  const ogImage = feature.image
    ? urlForImage(feature.image).width(1200).height(630).url()
    : undefined

  return {
    title: feature.title,
    description: feature.metaDescription || feature.description,
    openGraph: ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : undefined,
    twitter: ogImage ? { images: [ogImage] } : undefined,
  }
}

export default async function VisionFeaturePage({ params }: Props) {
  const { slug } = await params
  const { data: feature } = (await sanityFetch({
    query: featureBySlugQuery,
    params: { slug },
  })) as { data: Feature | null }

  if (!feature) {
    notFound()
  }

  const heroImageUrl = feature.image
    ? urlForImage(feature.image).width(1600).height(900).url()
    : null

  return (
    <div>
      {heroImageUrl && <SetCaseStudyHero image={heroImageUrl} />}

      <Reveal style="slide-up" duration={0.5}>
        <div className="max-width max-width-md content-padding mx-auto">
          <h1
            className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mt-8 mb-6"
            style={{ viewTransitionName: 'page-title' }}
          >
            {feature.title}
          </h1>
          {(feature.categories?.length || feature.date) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
              {feature.categories && feature.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {feature.categories.map((cat) => (
                    <span
                      key={cat}
                      className="text-xs uppercase tracking-wider text-gray bg-gray-light px-3 py-1"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              {feature.date && (
                <span className="text-gray text-sm">{feature.date}</span>
              )}
            </div>
          )}
        </div>
      </Reveal>

      {/* Content */}
      {feature.content && (
        <section className="py-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <PortableTextRenderer
              content={feature.authors && feature.authors.length > 0
                ? stripAuthorHeading(feature.content)
                : feature.content}
            />
          </div>
        </section>
      )}

      {/* Authors */}
      {feature.authors && feature.authors.length > 0 && (
        <section className="pb-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <AuthorSection authors={feature.authors} />
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
