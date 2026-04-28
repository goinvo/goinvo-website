'use client'

import { featureBySlugQuery } from '@/sanity/lib/queries'
import { useLiveData } from '@/components/sanity/LiveData'
import { EmptyContentPlaceholder } from '@/components/sanity/EmptyContentPlaceholder'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { AboutGoInvo } from '@/components/ui/AboutGoInvo'
import { NewsletterSection } from '@/components/forms/NewsletterSection'
import { resolveSectionBackground } from '@/lib/sectionBackgrounds'
import { hasMeaningfulFeatureBody } from '@/lib/featureAuthoring'
import { findPortableHeading, stripAuthorHeading } from '@/lib/utils'
import type { Feature } from '@/types'
import type { PortableTextBlock } from '@portabletext/types'

type AuthorVariant =
  | 'equal'
  | 'stacked'
  | 'stacked-subheading'
  | 'primary-sidebar'
  | 'plain-list'
  | 'legacy-text-list'

type ReferenceBlock = PortableTextBlock & {
  _type: 'references'
}

interface GuidedFeatureContentProps {
  initialData: Feature
  slug: string
  isDraftMode?: boolean
}

export function GuidedFeatureContent({
  initialData,
  slug,
  isDraftMode,
}: GuidedFeatureContentProps) {
  const feature = useLiveData(initialData, featureBySlugQuery, { slug })
  const rawContent = feature.content || []
  const hasAuthors = Boolean(feature.authors && feature.authors.length > 0)
  const hasContributors = Boolean(feature.contributors && feature.contributors.length > 0)
  const authorHeading = hasAuthors
    ? findPortableHeading(rawContent, ['Authors', 'Author'])
    : undefined
  const content = hasAuthors
    ? stripAuthorHeading(rawContent, { stripContributors: hasContributors })
    : rawContent
  const hasContent = hasMeaningfulFeatureBody(content)

  const widthClass =
    feature.contentWidth === 'wide'
      ? ''
      : feature.contentWidth === 'narrow'
        ? 'max-width-sm'
        : 'max-width-md'
  const useLegacyFacesLayout = slug === 'faces-in-health-communication'
  const articleContainerClassName = useLegacyFacesLayout
    ? 'mx-auto px-4 lg:px-4'
    : `max-width ${widthClass} content-padding mx-auto`
  const articleContainerStyle = useLegacyFacesLayout ? { maxWidth: '680px' } : undefined
  const authorVariant = feature.authorLayout as AuthorVariant | undefined
  const contributorsVariant = feature.contributorsLayout as AuthorVariant | undefined
  const authorBackground = resolveSectionBackground(feature.authorBackground, 'white')
  const contributorsBackground = resolveSectionBackground(feature.contributorsBackground, 'white')
  const newsletterBackground = resolveSectionBackground(feature.newsletterBackground, 'white')
  const peopleSectionPosition = feature.peopleSectionPosition || 'beforeNewsletter'
  const renderAboutAfterNewsletter = feature.aboutGoInvoPosition === 'afterNewsletter'
  const specialThanksHeadingText =
    feature.specialThanksHeading ||
    (feature.contributors && feature.contributors.length > 0 ? 'Special thanks to...' : 'Contributors')
  const specialThanksHeadingStyle = feature.specialThanksHeadingStyle || 'subheading'

  const aboutGoInvoSection = feature.showAboutGoInvo ? (
    <section className="pb-12">
      <div className={articleContainerClassName} style={articleContainerStyle}>
        <AboutGoInvo variant={feature.aboutGoInvoVariant} />
      </div>
    </section>
  ) : null

  const peopleSections = (
    <>
      {feature.authors && feature.authors.length > 0 && (
        <section className="pb-12">
          <div className={articleContainerClassName} style={articleContainerStyle}>
            <AuthorSection
              authors={feature.authors}
              heading={authorHeading}
              variant={authorVariant}
              background={authorBackground}
            />
          </div>
        </section>
      )}

      {feature.contributors && feature.contributors.length > 0 && (
        <section className="pb-12">
          <div className={articleContainerClassName} style={articleContainerStyle}>
            <AuthorSection
              authors={feature.contributors}
              heading="Contributors"
              variant={contributorsVariant}
              background={contributorsBackground}
            />
          </div>
        </section>
      )}

      {feature.specialThanks && feature.specialThanks.length > 0 && (
        <section className="pb-12">
          <div className={articleContainerClassName} style={articleContainerStyle}>
            {specialThanksHeadingStyle === 'legacy-centered-h2' ? (
              <h2 className="header-lg mt-16 mb-5 text-center">{specialThanksHeadingText}</h2>
            ) : (
              <h3 className="header-md mt-8 mb-4">{specialThanksHeadingText}</h3>
            )}
            <PortableTextRenderer content={feature.specialThanks} />
          </div>
        </section>
      )}
    </>
  )

  if (content.length === 0) {
    return isDraftMode && !hasContent ? (
      <EmptyContentPlaceholder documentType="feature" documentId={feature._id} />
    ) : null
  }

  const mainContent = content.filter((block) => block._type !== 'references')
  const referencesContent = content.filter(
    (block): block is ReferenceBlock => block._type === 'references',
  )

  return (
    <>
      {isDraftMode && !hasContent && (
        <EmptyContentPlaceholder documentType="feature" documentId={feature._id} />
      )}

      <section className="pb-12">
        <div className={articleContainerClassName} style={articleContainerStyle}>
          <PortableTextRenderer
            content={mainContent}
            bulletStyle={feature.bulletStyle}
          />
        </div>
      </section>

      {peopleSectionPosition !== 'afterNewsletter' && peopleSections}

      {!renderAboutAfterNewsletter && aboutGoInvoSection}

      <NewsletterSection background={newsletterBackground} />

      {peopleSectionPosition === 'afterNewsletter' && peopleSections}

      {renderAboutAfterNewsletter && aboutGoInvoSection}

      {referencesContent.length > 0 && (
        <section className="pb-12">
          <div className={articleContainerClassName} style={articleContainerStyle}>
            <PortableTextRenderer content={referencesContent} />
          </div>
        </section>
      )}
    </>
  )
}
