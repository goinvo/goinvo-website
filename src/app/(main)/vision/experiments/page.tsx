import type { Metadata } from 'next'
import Image from 'next/image'
import { ExperimentCard } from '@/components/vision/ExperimentCard'
import experiments from '@/data/vision/experiments.json'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'

export const metadata: Metadata = {
  title: 'Experiments in Design',
  description: 'A repo of our experiments in design.',
}

export default function ExperimentsPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-end">
        <Image
          src={cloudfrontImage(
            '/images/features/rethinking-ai-beyond-chat/design-experiments-hero.jpg'
          )}
          alt="Design Experiments"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative z-10 max-width content-padding py-12 w-full">
          <span className="text-primary-light text-sm uppercase tracking-wider font-semibold">
            Open Source
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-white mt-2">
            Experiments in Design
          </h1>
        </div>
      </section>

      {/* Grid */}
      <section className="py-12">
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
