import type { Metadata } from 'next'
import Image from 'next/image'
import { CalendlyEmbed } from '@/components/forms/CalendlyEmbed'
import { siteConfig } from '@/lib/config'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Open Office Hours for UX Design at GoInvo',
  description:
    'Our UX design company is open to anyone seeking advice on design, from students to startups. Sign up!',
}

const helpTopics = [
  'Company and/or product strategy',
  'Startup guidance',
  'Digital software design methods',
  'Product critiques',
  'Direction for building in-house design teams',
  'Portfolio reviews for engineers & designers',
  'Simply meeting the team',
]

export default function OpenOfficeHoursPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[60vh] flex items-center bg-cover bg-right-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/about/open-office-hours/whiteboard.jpg')})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-width content-padding py-16">
          <h1 className="font-serif text-3xl md:text-4xl text-white">
            Enjoy fresh ideas with a side of coffee<span className="text-primary font-serif">.</span>
          </h1>
        </div>
      </section>

      {/* Info */}
      <section className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-serif text-2xl mb-4">Open office hours</h2>
              <p className="text-gray mb-6">
                Our studio is open to anyone seeking advice on design, from students to
                startups, or chat with our passionate team on design for good on spaceship
                earth.
              </p>
              <a
                href="#calendly"
                className="inline-flex items-center bg-secondary text-white font-semibold uppercase tracking-wider px-6 py-3 hover:bg-tertiary transition-colors"
              >
                Choose a time to chat
              </a>
            </div>
            <div className="bg-blue-light p-8">
              <a
                href={siteConfig.address.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary block mb-4"
              >
                661 Massachusetts Ave, 3rd Floor,<br />
                Arlington, MA 02476
              </a>
              <p className="text-gray text-md">
                Parking is available on the street and in a public lot behind our building.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Can We Help */}
      <section className="py-16">
        <div className="max-width content-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <Image
                src={cloudfrontImage('/images/about/beckett-working.jpg')}
                alt="Beckett working"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
            <div className="bg-blue-light p-8">
              <h2 className="font-serif text-2xl mb-6">
                How can we help<span className="text-primary font-serif">?</span>
              </h2>
              <ul className="space-y-3">
                {helpTopics.map((topic) => (
                  <li key={topic} className="text-gray text-md">
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Calendly */}
      <section className="py-16" id="calendly">
        <div className="max-width content-padding">
          <h2 className="font-serif text-2xl text-center mb-8">Choose a Time</h2>
          <CalendlyEmbed />
        </div>
      </section>
    </div>
  )
}
