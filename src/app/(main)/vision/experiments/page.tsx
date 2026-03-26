import type { Metadata } from 'next'
import Image from 'next/image'
import { ExperimentCard } from '@/components/vision/ExperimentCard'
import experiments from '@/data/vision/experiments.json'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Experiments in Design',
  description: 'A repo of our experiments in design.',
}

export default function ExperimentsPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/rethinking-ai-beyond-chat/design-experiments-hero.jpg')} />

      {/* Grid */}
      <section className="py-12">
        <div className="max-width content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Experiments in Design</h1>
        </div>
        <div className="max-width content-padding mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiments.map((exp) => (
              <ExperimentCard
                key={exp.id}
                title={exp.title}
                image={exp.image}
                learnMoreLink={exp.learnMoreLink || undefined}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card px-10 py-4">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
