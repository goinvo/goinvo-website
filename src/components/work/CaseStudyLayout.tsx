import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { Reveal } from '@/components/ui/Reveal'
import { CaseStudyCard } from './CaseStudyCard'
import { cn, stripAuthorHeading, stripTitleHeading } from '@/lib/utils'
import type { CaseStudy } from '@/types'
import type { PortableTextBlock } from '@portabletext/types'

interface CaseStudyLayoutProps {
  caseStudy: CaseStudy
}

function getMetadataInsertIndex(content: PortableTextBlock[]): number {
  const firstDividerIndex = content.findIndex((block) => block._type === 'divider')
  if (firstDividerIndex >= 0) return firstDividerIndex

  const firstSectionHeadingIndex = content.findIndex((block) => {
    if (block._type !== 'block') return false
    return ['h2', 'h2Large', 'h2LargeCentered', 'sectionTitle'].includes(block.style || '')
  })
  if (firstSectionHeadingIndex > 0) return firstSectionHeadingIndex

  return content.length
}

function CaseStudyMetadata({ caseStudy }: { caseStudy: CaseStudy }) {
  if (!caseStudy.time && !caseStudy.categories?.length) return null

  return (
    <div>
      {caseStudy.time && (
        <p className="text-gray mt-0 mb-8">
          <span className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray">
            Time:
          </span>{' '}
          {caseStudy.time}
        </p>
      )}
      {caseStudy.categories && caseStudy.categories.length > 0 && (
        <p className="text-gray mt-0 mb-8">
          <span className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray">
            Tags:
          </span>{' '}
          {caseStudy.categories.map((category) => category.title).join(', ')}
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
  const showMetadata = Boolean(caseStudy.time || caseStudy.categories?.length)

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
                {caseStudy.upNext.filter(Boolean).map((study) => (
                  <CaseStudyCard key={study._id} caseStudy={study} variant="up-next" />
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      {/* References (after Up Next, matching Gatsby order) */}
      {referencesBlock && (
        <div className="bg-gray-lightest py-8">
          <div className="max-width max-width-md content-padding mx-auto">
            <PortableTextRenderer content={[referencesBlock]} variant="case-study" />
          </div>
        </div>
      )}
    </article>
  )
}
