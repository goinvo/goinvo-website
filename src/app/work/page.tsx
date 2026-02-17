import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { client } from '@/sanity/lib/client'
import { allCaseStudiesQuery } from '@/sanity/lib/queries'
import { ProjectSearch } from '@/components/work/ProjectSearch'
import { Quote } from '@/components/ui/Quote'
import { Reveal } from '@/components/ui/Reveal'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'
import type { CaseStudy } from '@/types'

export const metadata: Metadata = {
  title: 'Case Studies by UX Design Agency GoInvo',
  description:
    'We design and ship beautiful software for healthcare organizations as far-reaching as 3M, Johnson & Johnson, and Walgreens, to leading startups.',
}

const upNext = [
  {
    title: 'Design for the Enterprise',
    description: 'Beautiful software design for the Enterprise to catapult your business forward.',
    image: '/images/enterprise/enterprise-hero-1.jpg',
    link: '/enterprise',
  },
  {
    title: 'Explore our research',
    description: 'We investigate the future of healthcare through our podcast, features, books, and articles. Check it out!',
    image: '/images/homepage/standardized-health-data-preview-2.jpg',
    link: '/vision',
  },
  {
    title: 'Meet the team',
    description: 'We bring together the very best people and deploy them on your hardest digital problems.',
    image: '/images/about/bowling.jpg',
    link: '/about',
  },
]

export default async function WorkPage() {
  const caseStudies = await client.fetch<CaseStudy[]>(allCaseStudiesQuery)

  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Case Studies with Filter */}
      <ProjectSearch caseStudies={caseStudies} />

      {/* Quote */}
      <Reveal style="scale">
        <section className="py-16">
          <div className="max-width content-padding">
            <Quote
              text="Invo beautifully helped shape our next generation clinician and patient experience."
              author="Igor Gershfang"
              role="Walgreens Emerging Tech Director"
            />
          </div>
        </section>
      </Reveal>

      {/* CTA */}
      <Reveal style="clip-up">
        <section
          className="relative py-16 bg-cover bg-center"
          style={{ backgroundImage: `url(${cloudfrontImage('/images/work/eric-comp.jpg')})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
          <div className="relative z-10 max-width content-padding text-center">
            <h2 className="font-serif text-2xl text-white mb-4">
              Want to take your healthcare product to the next level?
            </h2>
            <Link
              href="/contact"
              className="inline-block bg-white text-primary font-semibold px-8 py-3 hover:bg-white/90 transition-colors"
            >
              Get in touch
            </Link>
          </div>
        </section>
      </Reveal>

      {/* Contact Form */}
      <section className="py-16">
        <div className="max-width-md content-padding mx-auto">
          <ContactFormEmbed />
        </div>
      </section>

      {/* Up Next */}
      <Reveal style="slide-up">
        <section className="bg-gray-light py-16">
          <div className="max-width content-padding">
            <h2 className="font-serif text-2xl mb-8 text-center">Up next</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {upNext.map((item) => (
                <Link
                  key={item.title}
                  href={item.link}
                  className="group block bg-white  overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <Image
                      src={cloudfrontImage(item.image)}
                      alt={item.title}
                      width={500}
                      height={312}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-gray text-md">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  )
}
