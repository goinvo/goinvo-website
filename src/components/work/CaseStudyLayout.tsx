import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { Results } from '@/components/ui/Results'
import { References } from '@/components/ui/References'
import { Reveal } from '@/components/ui/Reveal'
import { CaseStudyCard } from './CaseStudyCard'
import { cn } from '@/lib/utils'
import type { CaseStudy } from '@/types'

interface CaseStudyLayoutProps {
  caseStudy: CaseStudy
}

export function CaseStudyLayout({ caseStudy }: CaseStudyLayoutProps) {
  return (
    <article>
      {/* Content */}
      {caseStudy.content && (
        <div className="max-width content-padding py-12">
          <PortableTextRenderer content={caseStudy.content} />
        </div>
      )}

      {/* Results */}
      {caseStudy.results && caseStudy.results.length > 0 && (
        <Reveal style="slide-up">
          <div className="max-width content-padding">
            <Results items={caseStudy.results} />
          </div>
        </Reveal>
      )}

      {/* References */}
      {caseStudy.references && caseStudy.references.length > 0 && (
        <Reveal style="slide-up">
          <div className="max-width content-padding">
            <References items={caseStudy.references} />
          </div>
        </Reveal>
      )}

      {/* Up Next */}
      {caseStudy.upNext && caseStudy.upNext.length > 0 && (
        <Reveal style="slide-up">
          <section className="bg-blue-light py-8 pb-16">
            <div className="max-width content-padding">
              <h3 className="font-serif text-2xl mb-8">Up next</h3>
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
