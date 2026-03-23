import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { AuthorSection } from '@/components/ui/AuthorSection'
import { Reveal } from '@/components/ui/Reveal'
import { CaseStudyCard } from './CaseStudyCard'
import { cn, stripAuthorHeading } from '@/lib/utils'
import type { CaseStudy } from '@/types'

interface CaseStudyLayoutProps {
  caseStudy: CaseStudy
}

export function CaseStudyLayout({ caseStudy }: CaseStudyLayoutProps) {
  const hasAuthors = caseStudy.authors && caseStudy.authors.length > 0
  const content = hasAuthors && caseStudy.content
    ? stripAuthorHeading(caseStudy.content)
    : caseStudy.content

  return (
    <article>
      {/* Content */}
      {content && (
        <div className="max-width max-width-md content-padding mx-auto py-12">
          <PortableTextRenderer content={content} />
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
                {caseStudy.upNext.map((study) => (
                  <CaseStudyCard key={study._id} caseStudy={study} />
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}
    </article>
  )
}
