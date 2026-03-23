import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { featureBySlugQuery, allFeaturesQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
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

  return {
    title: feature.title,
    description: feature.metaDescription || feature.description,
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
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-end">
        {heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt={feature.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 max-width content-padding py-12 w-full">
          {feature.categories && feature.categories.length > 0 && (
            <span className="text-primary-light text-sm uppercase tracking-wider font-semibold">
              {feature.categories.join(' / ')}
            </span>
          )}
          <h1 className="font-serif text-3xl md:text-4xl text-white mt-2">
            {feature.title}
          </h1>
          {feature.date && (
            <span className="text-white/70 text-sm">{feature.date}</span>
          )}
        </div>
      </section>

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
    </div>
  )
}
