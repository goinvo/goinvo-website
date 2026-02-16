import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { visionProjectBySlugQuery, visionProjectsQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import type { VisionProject } from '@/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const projects = await client.fetch<VisionProject[]>(visionProjectsQuery)
  return projects.map((project) => ({
    slug: project.slug.current,
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = await client.fetch<VisionProject>(visionProjectBySlugQuery, { slug })

  if (!project) {
    return { title: 'Vision Project Not Found' }
  }

  return {
    title: project.title,
  }
}

export default async function VisionProjectPage({ params }: Props) {
  const { slug } = await params
  const project = await client.fetch<VisionProject>(visionProjectBySlugQuery, { slug })

  if (!project) {
    notFound()
  }

  const heroImageUrl = project.image
    ? urlForImage(project.image).width(1600).height(900).url()
    : null

  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-end">
        {heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt={project.title}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 max-width content-padding py-12 w-full">
          {project.category && (
            <span className="text-primary-light text-sm uppercase tracking-wider font-semibold">
              {project.category}
            </span>
          )}
          <h1 className="font-serif text-3xl md:text-4xl text-white mt-2">
            {project.title}
          </h1>
        </div>
      </section>

      {/* Content */}
      {project.content && (
        <section className="py-12">
          <div className="max-width content-padding">
            <PortableTextRenderer content={project.content} />
          </div>
        </section>
      )}
    </div>
  )
}
