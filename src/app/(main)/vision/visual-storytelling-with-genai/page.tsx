import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { featureBySlugQuery } from '@/sanity/lib/queries'
import { urlForImage } from '@/sanity/lib/image'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Reveal } from '@/components/ui/Reveal'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { stripAuthorHeading, stripTitleHeading } from '@/lib/utils'
import { ModelViewerSection } from './ModelViewerSection'
import type { Feature } from '@/types'

const SLUG = 'visual-storytelling-with-genai'

export const metadata: Metadata = {
  title: 'Reimagining Visual Storytelling with GenAI',
  description:
    'How GoInvo uses 3D modeling and GenAI to transform healthcare visual storytelling.',
}

export default async function VisualStorytellingPage() {
  const { data: feature } = (await sanityFetch({
    query: featureBySlugQuery,
    params: { slug: SLUG },
  })) as { data: Feature | null }

  if (!feature) notFound()

  const heroImageUrl = feature.image
    ? urlForImage(feature.image).width(1600).height(900).url()
    : null

  let content = feature.content || []
  content = stripTitleHeading(content, feature.title)
  if (feature.authors?.length) {
    content = stripAuthorHeading(content, {
      stripContributors: (feature.contributors?.length ?? 0) > 0,
    })
  }

  // Split content: find the 3D model overview image (right before the model viewer)
  // Skip this image since the ModelViewerSection renders its own version
  const splitIdx = content.findIndex((b: any, i: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (b._type !== 'block') return false
    const text = (b.children || []).map((c: any) => c.text || '').join('') // eslint-disable-line @typescript-eslint/no-explicit-any
    return text.includes('developing a digital library of 3D environments')
  })
  // Split after the "developing a digital library" paragraph
  const actualSplit = splitIdx >= 0 ? splitIdx + 1 : -1

  // Skip the 3D overview image (shown by ModelViewerSection) — it's right after the split
  let afterStart = actualSplit
  if (afterStart >= 0 && content[afterStart]?._type === 'image') afterStart++ // skip duplicate image
  const beforeModel = actualSplit > 0 ? content.slice(0, actualSplit) : content
  const afterModel = actualSplit > 0 ? content.slice(afterStart) : []
  const mainBefore = beforeModel.filter((b: any) => b._type !== 'references') // eslint-disable-line @typescript-eslint/no-explicit-any
  const mainAfter = afterModel.filter((b: any) => b._type !== 'references') // eslint-disable-line @typescript-eslint/no-explicit-any
  const referencesContent = content.filter((b: any) => b._type === 'references') // eslint-disable-line @typescript-eslint/no-explicit-any

  return (
    <div>
      {heroImageUrl && (
        <SetCaseStudyHero image={heroImageUrl} bgPosition={feature.heroPosition} />
      )}

      <Reveal style="slide-up" duration={0.5}>
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="header-xl mt-8 mb-6" style={{ viewTransitionName: 'page-title' }}>
            {feature.title}
          </h1>
          {(feature.categories?.length || feature.date) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-4">
              {feature.categories?.map((cat) => (
                <span key={cat} className="text-xs uppercase tracking-wider text-gray bg-gray-light px-3 py-1">
                  {cat}
                </span>
              ))}
              {feature.date && <span className="text-gray text-sm">{feature.date}</span>}
            </div>
          )}
        </div>
      </Reveal>

      {/* Content before 3D model viewer */}
      <section className="pb-6">
        <div className="max-width max-width-md content-padding mx-auto">
          <PortableTextRenderer content={mainBefore} />
        </div>
      </section>

      {/* 3D Model Viewer */}
      <ModelViewerSection />

      {/* Content after 3D model viewer */}
      {mainAfter.length > 0 && (
        <section className="pb-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <PortableTextRenderer content={mainAfter} />
          </div>
        </section>
      )}

      {/* Authors */}
      {feature.authors && feature.authors.length > 0 && (
        <section className="pb-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <AuthorSection authors={feature.authors} variant={feature.authorLayout as 'equal' | 'primary-sidebar' | undefined} />
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

      {/* References */}
      {referencesContent.length > 0 && (
        <section className="pb-12">
          <div className="max-width max-width-md content-padding mx-auto">
            <PortableTextRenderer content={referencesContent} />
          </div>
        </section>
      )}
    </div>
  )
}
