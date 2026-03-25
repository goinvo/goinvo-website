import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import { sanityFetch } from '@/sanity/lib/live'
import { client } from '@/sanity/lib/client'
import { allCaseStudiesQuery, draftCaseStudiesQuery } from '@/sanity/lib/queries'
import { ProjectSearch } from '@/components/work/ProjectSearch'
import { Quote } from '@/components/ui/Quote'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { cloudfrontImage } from '@/lib/utils'
import type { CaseStudy } from '@/types'

export const metadata: Metadata = {
  title: 'Case Studies by UX Design Agency',
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
  const { data: caseStudies } = await sanityFetch({ query: allCaseStudiesQuery }) as { data: CaseStudy[] }

  // Fetch draft-only case studies when in preview mode
  let draftCaseStudies: CaseStudy[] = []
  const { isEnabled: isDraftMode } = await draftMode()
  if (isDraftMode) {
    try {
      const rawClient = client.withConfig({
        token: process.env.SANITY_API_READ_TOKEN,
        useCdn: false,
      })
      const { drafts, publishedIds } = await rawClient.fetch(draftCaseStudiesQuery)
      draftCaseStudies = (drafts as (CaseStudy & { _id: string })[])
        .filter((d) => !publishedIds.includes(d._id.replace('drafts.', '')))
        .map((d) => ({ ...d, _id: d._id.replace('drafts.', '') }))
    } catch (e) {
      console.error('Failed to fetch draft case studies:', e)
    }
  }

  return (
    <div>
      <div className="sr-only">
        <h1>Design that Delivers — Healthcare UX Case Studies</h1>
      </div>
      {/* Case Studies with Filter */}
      <ProjectSearch caseStudies={caseStudies} draftCaseStudies={draftCaseStudies} />

      {/* Quote */}
      <Quote
        text="Invo beautifully helped shape our next generation clinician and patient experience."
        author="Igor Gershfang"
        role="Walgreens Emerging Tech Director"
        background="gray"
      />

      {/* CTA + Contact Form */}
      <section className="relative bg-black">
        <div className="max-width content-padding">
          <div className="lg:flex">
            {/* Content — left side */}
            <div className="relative z-10 lg:w-1/2 py-8 lg:py-12 lg:pr-8 lg:-mb-24">
              <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-white mb-8">
                Want to take your healthcare product to the next level?
              </h2>
              <ContactFormEmbed />
            </div>
            {/* Image — right side */}
            <div className="relative lg:w-1/2 h-[300px] lg:h-auto lg:absolute lg:top-0 lg:bottom-0 lg:right-0 lg:left-1/2 -mx-4 lg:mx-0">
              <Image
                src={cloudfrontImage('/images/work/eric-comp.jpg')}
                alt="GoInvo team collaborating on healthcare design"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent lg:bg-gradient-to-r lg:from-black lg:via-transparent lg:to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Up Next */}
      <section className="bg-blue-light pt-28 pb-4 lg:pt-32 lg:pb-16">
        <div className="max-width content-padding">
          <h4 className="font-sans text-sm lg:text-[15px] font-semibold uppercase tracking-[2px] text-gray leading-[1.1875rem] lg:leading-[1.375rem] mb-4">Up next</h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {upNext.map((item) => (
              <Link
                key={item.title}
                href={item.link}
                className="group block bg-white text-black no-underline shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="relative h-[250px] overflow-hidden">
                  <Image
                    src={cloudfrontImage(item.image)}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-[var(--transition-card)]"
                  />
                </div>
                <div className="p-4">
                  <p className="font-semibold mb-1">{item.title}</p>
                  <p className="text-gray mb-0">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
