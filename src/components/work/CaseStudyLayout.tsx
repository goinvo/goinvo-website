import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { Reveal } from '@/components/ui/Reveal'
import { CaseStudyCard } from './CaseStudyCard'
import { cn, stripAuthorHeading, stripTitleHeading } from '@/lib/utils'
import type { CaseStudy } from '@/types'

interface CaseStudyLayoutProps {
  caseStudy: CaseStudy
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

  return (
    <article>
      {/* Content (without references) */}
      {content && (
        <div className="max-width max-width-md content-padding mx-auto py-12">
          <PortableTextRenderer content={content} variant="case-study" />
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
