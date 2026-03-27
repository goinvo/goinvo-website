import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Button } from '@/components/ui/Button'
import { Quote } from '@/components/ui/Quote'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Health Design Thinking Book',
  description:
    'GoInvo Studio\'s practice is highlighted in the diverse case studies that make up the new book "Health Design Thinking," co-written by Ellen Lupton and Dr. Bon Ku.',
}

const featuredItems = [
  {
    href: '/work/hgraph',
    image: '/images/case-studies/goinvo/hgraph/hgraph-hero2.jpg',
    title: 'hGraph, page 46',
    caption: 'Your health in one picture.',
  },
  {
    href: '/vision/care-plans',
    image: '/images/features/care-plans/care-plans-featured2.jpg',
    title: 'Care Plans, page 100-103',
    caption:
      'A patient guide to manage day-to-day health based on health concerns, goals, and interventions.',
    external: false,
  },
  {
    href: '/work/mitre-shr',
    image: '/images/case-studies/mitre/SHR/shr-header2.jpg',
    title: 'Standard Health Record, page 107',
    caption:
      'Prototyping and envisioning future applications of a national health data standard to drive its development.',
  },
]

export default function HealthDesignThinkingPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/health-design-thinking/health-design-thinking-book-hero-6.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Health Design Thinking
          </h1>
          <h3 className="header-md">
            Creating products and services for better health.
          </h3>
          <p className="text-gray leading-relaxed mb-4">
            Work from the past decade of the GoInvo Studio&apos;s practice is
            highlighted in the diverse case studies that make up the new
            book &ldquo;
            <a
              href="https://mitpress.mit.edu/books/health-design-thinking-second-edition"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Health Design Thinking
            </a>
            ,&rdquo; co-written by Ellen Lupton and Dr. Bon Ku, and published by
            Cooper Hewitt, Smithsonian Design Museum and MIT Press in
            February 2022.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            These include artifacts and examples from GoInvo&apos;s innovative,
            human-centered design approach to solving healthcare challenges
            &mdash; drawings, photographs, storyboards, and visualizations &mdash; such
            as an infovis of the{' '}
            <Link href="/vision/determinants-of-health" className="text-primary hover:underline">
              Social Determinants of Health
            </Link>
            , and instructional design work for{' '}
            <a
              href="https://www.goinvo.com/features/ebola-care-guideline"
              className="text-primary hover:underline"
            >
              Ebola medical team preparedness
            </a>
            .
          </p>
        </div>

        {/* Featured In The Book */}
        <div className="max-width max-width-md content-padding mx-auto">
          <h3 className="header-md mb-2">
            Featured In The Book
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {featuredItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block"
              >
                <div className="overflow-hidden">
                  <Image
                    src={cloudfrontImage(item.image)}
                    alt={item.title}
                    width={600}
                    height={400}
                    className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <p className="font-semibold mt-2 group-hover:text-primary transition-colors">
                  {item.title}
                </p>
                <p className="text-gray text-sm">{item.caption}</p>
              </Link>
            ))}
          </div>

          <Divider />

          {/* Order Button */}
          <div className="my-8">
            <Button
              href="https://mitpress.mit.edu/books/health-design-thinking-second-edition"
              variant="secondary"
              external
            >
              Order At MIT Press
            </Button>
          </div>
        </div>
      </section>

      {/* Quote */}
      <Quote
        text="GoInvo's influential user experience work and visualizations of the future of healthcare provide excellent examples of the real-world impact of health design. We're delighted they were able to contribute work to Health Design Thinking (First Edition)."
        author="Bon Ku, MD"
        role="A practicing emergency physician, is Assistant Dean for Health and Design at Sidney Kimmel Medical College at Thomas Jefferson University, where he is also Director of the Health Design Lab."
        background="gray"
      />

      {/* Newsletter */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <NewsletterForm />
        </div>
      </section>

      {/* About GoInvo */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h3 className="header-md mb-2 mt-8">
            About GoInvo
          </h3>
          <p className="text-gray leading-relaxed">
            GoInvo&apos;s human centered design practice is dedicated to
            innovation in healthcare &mdash; to improve people&apos;s lives and enable
            us all to live a healthier future. Over the past 15 years,
            GoInvo has created digital health products and services for
            patients, clinicians, researchers, and administrators - working
            with organizations as far-reaching as AstraZeneca, Johnson and
            Johnson, 3M, and the U.S. Department of Health and Human
            Services.
          </p>
        </div>
      </section>
    </div>
  )
}
