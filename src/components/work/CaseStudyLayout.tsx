import { PortableTextRenderer } from '@/components/portable-text/PortableTextRenderer'
import { Results } from '@/components/ui/Results'
import { References } from '@/components/ui/References'
import { CaseStudyCard } from './CaseStudyCard'
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
        <div className="max-width content-padding">
          <Results items={caseStudy.results} />
        </div>
      )}

      {/* References */}
      {caseStudy.references && caseStudy.references.length > 0 && (
        <div className="max-width content-padding">
          <References items={caseStudy.references} />
        </div>
      )}

      {/* Up Next */}
      {caseStudy.upNext && caseStudy.upNext.length > 0 && (
        <section className="bg-gray-light py-16">
          <div className="max-width content-padding">
            <h2 className="font-serif text-2xl mb-8 text-center">Up Next</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {caseStudy.upNext.map((study) => (
                <CaseStudyCard key={study._id} caseStudy={study} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  )
}
