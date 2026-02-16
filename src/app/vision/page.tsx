import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { client } from '@/sanity/lib/client'
import { visionProjectsQuery } from '@/sanity/lib/queries'
import { Button } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { SubscribeForm } from '@/components/forms/SubscribeForm'
import { VisionGrid } from '@/components/vision/VisionGrid'
import { cloudfrontImage } from '@/lib/utils'
import type { VisionProject } from '@/types'

export const metadata: Metadata = {
  title: 'Our vision on the future of health',
  description:
    'Our vision projects explore the future of healthcare design, from determinants of health to open source health tools.',
}

const publications = [
  {
    title: 'Designing for Emerging Technologies',
    description: 'UX for Genomics, Robotics, and the Internet of Things',
    link: 'https://www.amazon.com/Designing-Emerging-Technologies-Genomics-Robotics/dp/1449370519',
    type: 'Book',
  },
  {
    title: 'The Future of Product Design',
    description: 'Designing for Emerging Technologies',
    link: 'https://www.oreilly.com/library/view/the-future-of/9781491922286/',
    type: 'Book',
  },
  {
    title: 'Creative Next',
    description: 'A podcast exploring the impact of AI on creative work.',
    link: 'https://podcasts.apple.com/us/podcast/creative-next/id1489090879',
    type: 'Podcast',
  },
  {
    title: 'The Digital Life',
    description: 'A podcast about our digital world.',
    link: 'https://soundcloud.com/thedigitallife',
    type: 'Podcast',
  },
]

const mediaLogos = [
  'NPR',
  'Forbes',
  'The Atlantic',
  'TED',
  'The Lancet',
  'New Scientist',
  'Wired',
]

const reviews = [
  {
    text: 'It is unusual to find a group of people so devoted to making EHR design better.',
    author: 'Janet Campbell',
    role: 'Epic',
    project: 'Inspired EHRs',
  },
  {
    text: 'A fantastic overview of cutting-edge design methods.',
    author: 'Dan Saffer',
    role: 'Author, Microinteractions',
    project: 'Designing for Emerging Technologies',
  },
  {
    text: 'Determinants of Health is an extraordinary visualization of the forces shaping our well-being.',
    author: 'Toyin Ajayi',
    role: 'Cityblock Health',
    project: 'Determinants of Health',
  },
  {
    text: "A beautiful, compelling vision of what's possible when we empower people to manage their own health.",
    author: 'Eric Topol',
    role: 'Scripps Research Translational Institute',
    project: 'Bathroom to Healthroom',
  },
]

export default async function VisionPage() {
  const projects = await client.fetch<VisionProject[]>(visionProjectsQuery)

  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Illustration Hero */}
      <section className="py-8 md:py-12">
        <div className="max-width content-padding">
          <div className="hidden md:grid grid-cols-2 gap-4">
            <Image
              src={cloudfrontImage('/images/vision/vision-illustration-desktop-left.jpg')}
              alt="Healthcare vision illustration"
              width={600}
              height={500}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage('/images/vision/vision-illustration-desktop-right.jpg')}
              alt="Healthcare vision illustration"
              width={600}
              height={500}
              className="w-full h-auto"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            <Image
              src={cloudfrontImage('/images/vision/vision-illustration-mobile-home.jpg')}
              alt="Healthcare vision - home"
              width={600}
              height={400}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage('/images/vision/vision-illustration-mobile-practice.jpg')}
              alt="Healthcare vision - practice"
              width={600}
              height={400}
              className="w-full h-auto"
            />
            <Image
              src={cloudfrontImage('/images/vision/vision-illustration-mobile-country.jpg')}
              alt="Healthcare vision - country"
              width={600}
              height={400}
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Spotlight */}
      <Reveal style="slide-up">
        <section className="py-16">
          <div className="max-width content-padding">
            <h3 className="font-serif text-2xl mb-8">Spotlight</h3>
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
              <a
                href="https://doodletodemo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="aspect-video overflow-hidden bg-gray-light">
                  <video
                    src={cloudfrontImage('/videos/features/doodle-to-demo/Video_R4-C.mp4')}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <span className="text-xs uppercase tracking-wider text-gray font-semibold">
                    Feature
                  </span>
                  <h4 className="font-serif text-xl mt-1 mb-2 group-hover:text-primary transition-colors">
                    Doodle to Demo
                  </h4>
                  <p className="text-gray text-md">
                    Using generative AI as our storytelling partner
                  </p>
                </div>
              </a>
              <Link
                href="/vision/health-visualizations"
                className="group block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <Image
                    src={cloudfrontImage('/images/features/posters/health-viz-vision-preview-2.jpg')}
                    alt="Health Visualizations"
                    width={400}
                    height={250}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h4 className="font-serif text-xl mt-1 mb-2 group-hover:text-primary transition-colors">
                    Health Visualizations
                  </h4>
                  <p className="text-gray text-md">
                    Open source visualizations on health and the healthcare industry.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Projects Grid */}
      <section className="py-16 bg-gray-light">
        <div className="max-width content-padding">
          <VisionGrid projects={projects} />
        </div>
      </section>

      {/* Publications */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">Publications & Podcasts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {publications.map((pub) => (
              <a
                key={pub.title}
                href={pub.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-6 bg-gray-light  hover:shadow-md transition-shadow"
              >
                <span className="text-xs uppercase tracking-wider text-gray font-semibold">
                  {pub.type}
                </span>
                <h3 className="font-semibold mt-1 mb-2 group-hover:text-primary transition-colors">
                  {pub.title}
                </h3>
                <p className="text-gray text-md">{pub.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Featured In */}
      <section className="py-12 bg-gray-light">
        <div className="max-width content-padding text-center">
          <p className="text-gray font-semibold mb-6">Featured in</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {mediaLogos.map((name) => (
              <span key={name} className="text-gray text-lg font-serif">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">What people are saying</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reviews.map((review) => (
              <div key={review.project} className="border-l-4 border-primary pl-6">
                <p className="text-gray text-md italic mb-3">
                  &ldquo;{review.text}&rdquo;
                </p>
                <p className="font-semibold text-sm">{review.author}</p>
                <p className="text-gray text-sm">{review.role}</p>
                <p className="text-primary text-sm mt-1">{review.project}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe */}
      <section className="bg-gray-light py-16">
        <div className="max-width-md content-padding mx-auto">
          <SubscribeForm />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-secondary py-16 text-center">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl text-white mb-4">
            Designing the future of healthcare
          </h2>
          <p className="text-white/80 mb-8">
            Have a vision project idea? We&apos;d love to hear about it.
          </p>
          <Button href="/contact" variant="primary" size="lg">
            Get in touch
          </Button>
        </div>
      </section>
    </div>
  )
}
