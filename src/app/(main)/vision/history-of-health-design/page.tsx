import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'History of Health Design',
  description:
    'A 10,000-year timeline of healthcare innovation, from ancient medicine to modern digital health.',
}

export default function HistoryOfHealthDesignPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/history-of-health-design/hero.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">History of Health Design</h1>
          <p className="leading-relaxed mb-4">
            Early humans didn&apos;t know much about how our bodies worked. We
            had to come up with clever ways to treat illnesses and injuries,
            often with rituals and herbal remedies.
          </p>
          <p className="leading-relaxed mb-4">
            Over the past 10,000 years, we&apos;ve gone on a tear. As we&apos;ve
            learned more about science, the world around us, and our own
            minds, we&apos;ve invented tools, machines, and techniques that help
            us stay healthy and fix things that go wrong inside and out of
            our bodies. Soon enough, we&apos;ll be dictating how long we want to
            live.
          </p>
          <p className="leading-relaxed mb-4">
            Here&apos;s our evolving list of top healthcare innovations over
            the last 10,000 years, from the stone surgical knife to genetic &ldquo;scissors.&rdquo;
          </p>
          <p className="leading-relaxed mb-8">
            Let us know what we&apos;re missing at{' '}
            <a href="mailto:feedback@goinvo.com" className="text-primary hover:underline">feedback@goinvo.com</a>.
          </p>
        </div>

        {/* Timeline Embed */}
        <div className="max-width content-padding mx-auto">
          <iframe
            src="https://cdn.knightlab.com/libs/timeline3/latest/embed/index.html?source=1qa0ZwX09I8ON2YuHXaigZ8M7p_wnImQALPFyd8fVN98&font=Default&lang=en&initial_zoom=10&height=650&start_at_slide=1"
            className="w-full border-0"
            style={{ height: 650 }}
            allowFullScreen
            loading="lazy"
            title="History of Health Design Timeline"
          />
          <div className="text-center mt-6">
            <a
              href="https://docs.google.com/spreadsheets/d/1qa0ZwX09I8ON2YuHXaigZ8M7p_wnImQALPFyd8fVN98/edit#gid=301364053"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-secondary text-secondary hover:bg-secondary hover:text-white transition-colors uppercase text-sm tracking-wider"
            >
              Timeline Events and References
            </a>
          </div>
        </div>

        <div className="max-width max-width-md content-padding mx-auto mt-12">
          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Samantha Wuu" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo" />
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
