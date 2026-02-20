import type { Metadata } from 'next'
import { ContactFormEmbed } from '@/components/forms/ContactFormEmbed'
import { siteConfig } from '@/lib/config'
import { cloudfrontImage } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Contact GoInvo | Healthcare UX Design Agency',
  description:
    'Contact us with new project opportunities, speaker requests, portfolio reviews, and more.',
}

export default function ContactPage() {
  return (
    <div className="pt-[var(--spacing-header-height)]">
      {/* Hero */}
      <section
        className="relative min-h-[40vh] flex items-end bg-cover bg-center"
        style={{ backgroundImage: `url(${cloudfrontImage('/images/contact/studio.jpg')})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-blue-light/90 to-transparent" />
      </section>

      {/* Contact Form */}
      <section className="bg-blue-light py-16 -mt-8">
        <div className="max-width-sm content-padding mx-auto">
          <ContactFormEmbed />
          <div className="mt-8 space-y-3">
            <a href={`mailto:${siteConfig.email.info}`} className="block">
              {siteConfig.email.info}
            </a>
            <a
              href={siteConfig.address.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              661 Massachusetts Ave, 3rd Floor,<br />
              Arlington, MA 02476
            </a>
            <a href="tel:617-803-7043" className="block">
              617-803-7043
            </a>
            <p className="text-gray text-sm">
              A subsidiary of We Create Goodness LLC
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
