import Image from 'next/image'
import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { Reveal } from '@/components/ui/Reveal'
import { CaseStudyCard } from './CaseStudyCard'
import { cn, stripAuthorHeading, stripTitleHeading } from '@/lib/utils'
import { urlForImage } from '@/sanity/lib/image'
import { resolveSectionBackground, getSectionBandClassName, type SectionBackground } from '@/lib/sectionBackgrounds'
import type { CaseStudy, ExternalUpNextItem } from '@/types'
import type { PortableTextBlock } from '@portabletext/types'

function isExternalUpNextItem(item: CaseStudy | ExternalUpNextItem): item is ExternalUpNextItem {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (item as any)?._type === 'externalUpNextItem'
}

function ExternalUpNextCard({ item }: { item: ExternalUpNextItem }) {
  const imageUrl = item.image?.asset
    ? urlForImage(item.image).width(800).height(500).url()
    : undefined
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline h-full block group bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-[var(--transition-card)] flex flex-col"
    >
      {imageUrl && (
        <div className="relative h-[260px] overflow-hidden">
          <Image
            src={imageUrl}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-[var(--transition-card)]"
            style={{ objectPosition: 'center top' }}
          />
        </div>
      )}
      <div className="p-4 [&>p]:m-0 [&>p]:mb-1 flex-grow">
        <p className="font-semibold text-black">{item.title}</p>
        {item.caption && <p className="text-gray">{item.caption}</p>}
      </div>
    </a>
  )
}

interface CaseStudyLayoutProps {
  caseStudy: CaseStudy
}

function getMetadataInsertIndex(content: PortableTextBlock[]): number {
  const firstButtonGroupIndex = content.findIndex((block) => block._type === 'buttonGroup')
  const firstDividerIndex = content.findIndex((block) => block._type === 'divider')
  if (
    firstButtonGroupIndex >= 0 &&
    (firstDividerIndex === -1 || firstButtonGroupIndex < firstDividerIndex) &&
    firstButtonGroupIndex <= 8
  ) {
    return firstButtonGroupIndex
  }
  if (firstDividerIndex >= 0) return firstDividerIndex

  const firstSectionHeadingIndex = content.findIndex((block) => {
    if (block._type !== 'block') return false
    return ['h2', 'h2Large', 'h2LargeCentered', 'sectionTitle'].includes(block.style || '')
  })
  if (firstSectionHeadingIndex > 0) return firstSectionHeadingIndex

  return content.length
}

function CaseStudyMetadata({ caseStudy }: { caseStudy: CaseStudy }) {
  if (!caseStudy.time && !caseStudy.displayTags) return null

  const metadataLayout = caseStudy.metadataLayout || 'stacked'
  const hasTime = Boolean(caseStudy.time)
  const hasTags = Boolean(caseStudy.displayTags)

  if (metadataLayout === 'inline' && hasTime && hasTags) {
    return (
      <div>
        <p className="text-gray mt-0 mb-8">
          <span className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray">
            Time:
          </span>{' '}
          {caseStudy.time}{' '}
          <span className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray">
            Tags:
          </span>{' '}
          {caseStudy.displayTags}
        </p>
      </div>
    )
  }

  return (
    <div>
      {hasTime && (
        <p className="text-gray mt-0 mb-8">
          <span className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray">
            Time:
          </span>{' '}
          {caseStudy.time}
        </p>
      )}
      {hasTags && (
        <p className="text-gray mt-0 mb-8">
          <span className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray">
            Tags:
          </span>{' '}
          {caseStudy.displayTags}
        </p>
      )}
    </div>
  )
}

export function CaseStudyLayout({ caseStudy }: CaseStudyLayoutProps) {
  const hasAuthors = caseStudy.authors && caseStudy.authors.length > 0
  let rawContent = caseStudy.content
  if (rawContent) rawContent = stripTitleHeading(rawContent, caseStudy.title)
  if (hasAuthors && rawContent) rawContent = stripAuthorHeading(rawContent)

  // Gatsby order: content → Up Next → References
  // Split references out of content so we can render them after Up Next
  const referencesBlock = rawContent?.find((b: any) => b._type === 'references') // eslint-disable-line @typescript-eslint/no-explicit-any
  const content = referencesBlock
    ? rawContent?.filter((b: any) => b._type !== 'references') // eslint-disable-line @typescript-eslint/no-explicit-any
    : rawContent
  const metadataInsertIndex = content ? getMetadataInsertIndex(content) : 0
  const contentBeforeMetadata = content?.slice(0, metadataInsertIndex) || []
  const contentAfterMetadata = content?.slice(metadataInsertIndex) || []
  const showMetadata = Boolean(caseStudy.time || caseStudy.displayTags)

  return (
    <article>
      {/* Content (without references) */}
      {content && (
        <div className="max-width max-width-md content-padding mx-auto py-12">
          {contentBeforeMetadata.length > 0 && (
            <PortableTextRenderer content={contentBeforeMetadata} variant="case-study" />
          )}
          {showMetadata && <CaseStudyMetadata caseStudy={caseStudy} />}
          {contentAfterMetadata.length > 0 && (
            <PortableTextRenderer content={contentAfterMetadata} variant="case-study" />
          )}
        </div>
      )}

      {/* Authors */}
      {caseStudy.authors && caseStudy.authors.length > 0 && (
        <Reveal style="slide-up">
          <div className="max-width max-width-md content-padding mx-auto">
            <AuthorSection authors={caseStudy.authors} />
          </div>
        </Reveal>
      )}

      {/* Up Next */}
      {caseStudy.upNext && caseStudy.upNext.length > 0 && (
        <Reveal style="slide-up">
          <section className="bg-blue-light py-8 pb-16">
            <div className="max-width content-padding">
              <h3 className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.375rem] mb-8">Up next</h3>
              <div
                className={cn(
                  'grid grid-cols-1 gap-8',
                  caseStudy.upNext.length === 1
                    ? 'max-w-sm mx-auto'
                    : caseStudy.upNext.length === 2
                      ? 'md:grid-cols-2 max-w-3xl mx-auto'
                      : 'md:grid-cols-2 lg:grid-cols-3'
                )}
              >
                {caseStudy.upNext.filter(Boolean).map((item) =>
                  isExternalUpNextItem(item) ? (
                    <ExternalUpNextCard key={item._id} item={item} />
                  ) : (
                    <CaseStudyCard key={item._id} caseStudy={item} variant="up-next" />
                  ),
                )}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* References (after Up Next, matching Gatsby order). Background uses
          the references block's `background` field if set; otherwise defaults
          to gray for parity with the legacy case-study layout. */}
      {referencesBlock && (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blockBackground = (referencesBlock as any).background as SectionBackground | undefined
        const resolved = resolveSectionBackground(blockBackground, 'gray')
        const bandClass = getSectionBandClassName(resolved) || 'bg-gray-lightest'
        return (
          <div className={cn(bandClass, 'py-8')}>
            <div className="max-width max-width-md content-padding mx-auto">
              <PortableTextRenderer content={[referencesBlock]} variant="case-study" />
            </div>
          </div>
        )
      })()}
    </article>
  )
}
