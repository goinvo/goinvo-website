import { cn } from '@/lib/utils'
import { type } from '@/components/ui/type'
import { Section } from '@/components/ui/Section'
import { InlineLink } from '@/components/ui/TextLink'
import { ContactComposer } from '@/components/forms/ContactComposer'
import { siteConfig } from '@/lib/config'

/**
 * The contact page in the homepage study's design (?design=human): the question on the
 * left, the one-step form on the right. No studio photo above it: the form is the page.
 */
export function ContactHuman() {
  return (
    <div className="bg-white text-black">
      <Section spacing="none" aria-labelledby="contact-title" className="pb-24 pt-[calc(var(--spacing-header-height)+2rem)] md:pb-36 md:pt-[calc(var(--spacing-header-height)+3rem)]">
        {/* A phone reads title, composer, then the address; a desktop keeps the address under the title. */}
        <div className="grid gap-x-24 gap-y-12 lg:grid-cols-[0.8fr_1.2fr] lg:grid-rows-[auto_1fr]">
          <div className="lg:col-start-1 lg:row-start-1">
            <h1 id="contact-title" className="m-0 max-w-[12ch] font-serif text-page-title font-normal">Tell us the result you’re after.</h1>
            <p className={cn('mb-0 mt-6 max-w-[30ch]', type.lead)}>A question or a rough idea is enough. No meeting required.</p>
          </div>
          {/* One group: InlineLink's 48px touch height is for a link on its own line; stacked
              here it pushed the three apart, so here they drop it and sit together as one block,
              whose last line rests level with the bottom of the Send button. */}
          <address data-contact-details className={cn('grid content-start justify-items-start not-italic max-lg:order-3 lg:col-start-1 lg:row-start-2 lg:self-end', type.body)}>
            <InlineLink href={`mailto:${siteConfig.email.info}`} className="!min-h-0 py-0.5">{siteConfig.email.info}</InlineLink>
            <InlineLink href="tel:617-803-7043" className="!min-h-0 py-0.5">617-803-7043</InlineLink>
            <a href={siteConfig.address.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-gray no-underline hover:text-black hover:underline">661 Massachusetts Ave, 3rd Floor<br />Arlington, MA 02476</a>
          </address>
          <ContactComposer className="max-lg:order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1" />
        </div>
      </Section>
    </div>
  )
}
