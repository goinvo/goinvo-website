import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ClientLogos } from '@/components/ui/ClientLogos'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { Button } from '@/components/ui/Button'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Software Design for Government Services',
  description:
    'Beautiful software design for government and state services for smoother processes and happy residents.',
}

const reasons = [
  {
    title: 'Long Term Mission Support',
    description: 'We support your long term mission and objectives with digital tools that are scalable and increase accessibility.',
    image: '/images/open_source/innovation.png',
  },
  {
    title: 'Transformative Change for the Public Good',
    description: 'We design seamless, human-centered experiences that transform complex needs into seamless and equitable services, reducing burden and building trust.',
    image: '/images/open_source/public-good.png',
  },
  {
    title: 'Rapid Iteration and Testing',
    description: "Validated design, research, and rapid prototyping to showcase your agency's vision, build support, and prove value before investing time and budget.",
    image: '/images/open_source/trust.png',
  },
]

const stats = [
  { stat: '33', label: 'government-sponsored design projects since 2009' },
  { stat: '160M+', label: 'people impacted by GoInvo designs' },
  { stat: '15', label: "agencies we've worked with" },
]

const results = [
  'Transformed outdated systems into cutting-edge solutions.',
  'Smoother processes for happier government employees and residents.',
  'Re-imagined software and services to meet evolving needs at scale.',
  'Validated ideas before investing in a full development cycle.',
  'Improved accessibility for wider resident needs.',
  'Strategy and vision to rally support.',
]

export default function GovernmentPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative h-[450px] bg-cover bg-top-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/case-studies/mass/snap/snap-cover.jpg')})` }}
      >
        <div className="relative h-full max-width">
          <div className="absolute bottom-0 left-0 w-full lg:w-[800px] bg-white/90 content-padding py-8">
            <h1 className="header-xl m-0 mb-4">
              Software for government services is complicated.<br />
              We know how to do it<span className="text-primary font-serif">.</span>
            </h1>
            <Button href="/contact" variant="primary" size="lg">
              Let&apos;s discuss your project
            </Button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-primary-lightest py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-8">What results are you looking for?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((result) => (
              <p key={result} className="font-semibold">{result}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose GoInvo */}
      <section className="py-16">
        <div className="max-width content-padding text-center">
          <h2 className="font-serif text-2xl mb-12">Why choose GoInvo?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {reasons.map((reason) => (
              <div key={reason.title}>
                <Image
                  src={cloudfrontImage(reason.image)}
                  alt={reason.title}
                  width={200}
                  height={200}
                  className="mx-auto mb-4 max-w-[80%]"
                />
                <p className="font-semibold mb-2">{reason.title}</p>
                <p className="text-gray text-md">{reason.description}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-serif text-3xl text-primary">{s.stat}</div>
                <p className="text-gray text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-8">
        <div className="max-width content-padding text-center">
          <p className="font-semibold mb-4">
            Trusted by ambitious state agencies and for-public partners
          </p>
          <ClientLogos variant="government" />
          <p className="text-gray text-md mt-4">
            Our <strong>ITS81</strong> and <strong>GSA 47QTCA26D001W</strong> contracts
            prequalify us for IT professional services&mdash;streamlining government
            procurement and validating our expertise as a trusted vendor for both
            Massachusetts state and federal agencies.
          </p>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-primary-lightest py-16">
        <div className="max-width content-padding text-center">
          <h2 className="font-serif text-2xl mb-8">
            Our work drives results for government services.
          </h2>
          <Button href="/contact" variant="primary" size="lg" className="mb-12">
            Let&apos;s discuss your project
          </Button>

          <Link href="/work/mass-snap" className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow mb-8 text-left no-underline">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 lg:p-12">
                <h3 className="font-serif text-2xl mb-4">
                  1,107,790 Massachusetts residents were recipients of SNAP food benefits in 2024.
                </h3>
                <p className="text-gray mb-4">
                  Up from 750,000 residents in 2017. The redesigned application was deployed in
                  July 2018, and for the first time ever at the MA DTA, the volume of online
                  applications exceeded that of applications completed in person.
                </p>
                <p className="text-secondary">Read Case Study</p>
              </div>
              <div className="relative aspect-[4/3] lg:aspect-auto">
                <Image
                  src={cloudfrontImage('/images/case-studies/public-sector/pubDesign_SNAP.jpg')}
                  alt="Massachusetts SNAP"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </Link>

          <Link href="/work/all-of-us" className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow mb-8 text-left no-underline">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 lg:p-12">
                <h3 className="font-serif text-2xl mb-4">
                  NIH&apos;s All of Us Research Program
                </h3>
                <p className="text-gray mb-4">
                  Through participant-focused design leadership and research, we delivered
                  experiences and strategies that impacted an NIH research program, aiming to
                  build the largest medical data repository for research.
                </p>
                <p className="text-secondary">Read Case Study</p>
              </div>
              <div className="relative aspect-[4/3] lg:aspect-auto">
                <Image
                  src={cloudfrontImage('/images/case-studies/aou/01-hero-image-2.jpg')}
                  alt="All of Us"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </Link>

          <Link href="/work/ahrq-cds" className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow mb-8 text-left no-underline">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 lg:p-12">
                <h3 className="font-serif text-2xl mb-4">
                  National Clinical Decision Support Tool
                </h3>
                <p className="text-gray mb-4">
                  GoInvo designed CDS Connect, an AHRQ-funded (Agency for Healthcare Research and Quality)
                  national repository for providers, health IT vendors, and researchers to create and share
                  CDS tools (clinical decision support tools) to improve clinical decision making and quality of care.
                </p>
                <p className="text-secondary">Read Case Study</p>
              </div>
              <div className="relative aspect-[4/3] lg:aspect-auto">
                <Image
                  src={cloudfrontImage('/images/case-studies/ahrq/CDS_connect_hero-2.jpg')}
                  alt="AHRQ Clinical Decision Support"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA + Contact */}
      <section className="bg-blue-light py-16">
        <div className="max-width-md content-padding mx-auto text-center">
          <p className="font-serif text-2xl mb-2">
            We ship software that works.<br />
            Let&apos;s build together!
          </p>
          <p className="text-gray mb-8">Reach out to learn how GoInvo can help.</p>
          <ContactFormEmbed />
        </div>
      </section>

      {/* Contracts and Certifications */}
      <section className="py-16">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl mb-4">
            Contracts and Certifications
          </h2>
          <ul className="list-disc list-inside text-gray space-y-2">
            <li>State of MA: <strong>ITS81</strong></li>
            <li>Federal: <strong>GSA 47QTCA26D001W</strong></li>
          </ul>
        </div>
      </section>
    </div>
  )
}
