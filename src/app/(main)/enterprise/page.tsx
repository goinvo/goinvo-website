import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ClientLogos } from '@/components/ui/ClientLogos'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { Button } from '@/components/ui/Button'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Design for Enterprise Software',
  description:
    'Beautiful software design for the Enterprise to catapult your business forward.',
}

const reasons = [
  {
    title: 'Software Design Velocity',
    description: 'Start fast with a team experienced working together compared to hiring.',
    stat: '100+',
    statLabel: 'software design projects since 2010',
    image: '/images/open_source/innovation.png',
  },
  {
    title: 'Large-Scale Enterprise Design',
    description: 'Make design and innovation a key influence in your organization.',
    stat: '160M+',
    statLabel: 'people impacted by GoInvo designs',
    image: '/images/open_source/public-good.png',
  },
  {
    title: 'Feature Finding for Profits',
    description: 'We discover opportunities that keep clients coming back for more.',
    stat: '90%',
    statLabel: 'of clients repeat business with GoInvo',
    image: '/images/open_source/trust.png',
  },
]

const results = [
  'Cost savings through a more productive workforce or customers.',
  'Transforming software acquisitions into a seamless suite-like experience.',
  'Re-imagining the software to meet evolving customer needs.',
  'Validating an idea before investing in a full development cycle.',
  'Convincing investors.',
  'A vision to rally the company.',
]

export default function EnterprisePage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative h-[450px] bg-cover bg-top-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/enterprise/enterprise-hero-1.jpg')})` }}
      >
        <div className="relative h-full max-width">
          <div className="absolute bottom-0 left-0 w-full lg:w-[385px] bg-white content-padding py-8">
            <h1 className="header-xl m-0">
              Enterprise software is complicated.
              <br />
              We know how to do it<span className="text-primary font-serif">.</span>
            </h1>
            <p className="text-gray mt-4 mb-4">
              Beautiful software design for the Enterprise to catapult your business forward.
            </p>
            <Button href="/contact" variant="primary" size="md">
              Let&apos;s discuss your project
            </Button>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-primary-lightest py-16 text-tertiary">
        <div className="max-width content-padding">
          <h2 className="header-xl text-tertiary mt-0 mb-8">What results are you looking for?</h2>
          <ul className="ul grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-none pl-0">
            {results.map((result) => (
              <li key={result} className="text-tertiary">{result}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why Choose GoInvo */}
      <section className="py-16 text-tertiary">
        <div className="max-width content-padding text-center">
          <h2 className="header-xl text-tertiary mt-0 mb-12">Why choose GoInvo?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {reasons.map((reason) => (
              <div key={reason.title}>
                <Image
                  src={cloudfrontImage(reason.image)}
                  alt={reason.title}
                  width={200}
                  height={200}
                  className="mx-auto mb-4 max-w-[80%]"
                />
                <p className="mb-4">
                  <strong>{reason.title}</strong>
                  <br />
                  {reason.description}
                </p>
                <p>
                  <span className="font-serif text-3xl text-primary block leading-none mb-2">{reason.stat}</span>
                  <span className="text-gray text-md">{reason.statLabel}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Logos */}
      <section className="py-8 text-tertiary">
        <div className="max-width content-padding text-center">
          <p className="mb-4">
            <strong>Trusted by ambitious startups and Fortune 500&apos;s</strong>
          </p>
          <ClientLogos variant="enterprise" />
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-primary-lightest py-16 text-tertiary">
        <div className="max-width content-padding text-center">
          <h2 className="header-xl text-tertiary mt-0 mb-8">
            Driving results for Enterprise software<span className="text-primary font-serif">.</span>
          </h2>
          <Button href="/contact" variant="primary" size="md" className="mb-12">
            Let&apos;s discuss your project
          </Button>

          {/* 3M Case Study */}
          <Link
            href="/work/3m-coderyte"
            className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow mb-8 text-left no-underline"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="p-8 lg:p-12">
                <h4 className="header-xl text-tertiary mt-0 mb-4">
                  A 200% productivity gain
                  <br />= $146M exit.
                </h4>
                <p className="header-lg text-tertiary mt-0 mb-4">
                  &ldquo;We needed to make sure we could do this. Invo proved we could. We needed
                  to make sure we could sell this. Invo gave us the tools to do that, too.&rdquo;
                </p>
                <p className="text-tertiary mb-4">
                  George Moon
                  <br />
                  VP of Product, CodeRyte Inc.
                </p>
                <p className="text-secondary">Read Case Study</p>
              </div>
              <div className="flex items-center justify-center px-8 py-10 lg:px-0 lg:py-0">
                <Image
                  src={cloudfrontImage('/images/case-studies/coderyte/coderyte-mockup2.jpg')}
                  alt="3M CodeRyte"
                  width={400}
                  height={270}
                  className="h-auto w-full max-w-[400px] object-contain"
                />
              </div>
            </div>
          </Link>

          {/* InfoBionic Case Study */}
          <Link
            href="/work/infobionic-heart-monitoring"
            className="block bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow text-left no-underline"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="p-8 lg:p-12">
                <h4 className="header-xl text-tertiary mt-0 mb-4">
                  A vision to secure $17M Series B.
                </h4>
                <p className="header-lg text-tertiary mt-0 mb-4">
                  &ldquo;We absolutely love everything GoInvo has created for us, it has by far
                  exceeded our expectations.&rdquo;
                </p>
                <p className="text-tertiary mb-4">
                  Serban Georgescu MD
                  <br />
                  Director of Business and Clinical Development, InfoBionic
                </p>
                <p className="text-secondary">Read Case Study</p>
              </div>
              <div className="flex items-center justify-center px-8 py-10 lg:px-0 lg:py-0">
                <Image
                  src={cloudfrontImage('/images/case-studies/infobionic/infobionic-dashboard.jpg')}
                  alt="InfoBionic"
                  width={400}
                  height={285}
                  className="h-auto w-full max-w-[400px] object-contain"
                />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* CTA + Contact */}
      <section className="bg-blue-light py-16">
        <div className="max-width-md content-padding mx-auto text-center text-tertiary">
          <p className="header-xl text-tertiary mb-2">
            We ship software that works.
            <br />
            Let&apos;s build together!
          </p>
          <p className="text-gray mb-8">Reach out to learn how GoInvo can help.</p>
          <ContactFormEmbed />
        </div>
      </section>
    </div>
  )
}
