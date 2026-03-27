import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "From Bathroom to Healthroom",
  description: "From Bathroom to Healthroom",
}

export default function BathroomToHealthroomPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            From Bathroom to Healthroom
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/from-bathroom-to-healthroom/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/from-bathroom-to-healthroom/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/from-bathroom-to-healthroom/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours 1. Bloodletting to bloodless. 2. The surveillance invasion. 3. Life first. Health a distant second. 4. Stag</p>
          <p className="leading-relaxed mb-4">juhan@goinvo.com</p>
          <p className="leading-relaxed mb-4">Bloodletting to bloodless. Technological and societal trends are converging and pushing design to the forefront of health. 1 Health, as an experience and idea, is undergoing an epic shift. For millenn</p>
          <p className="leading-relaxed mb-4">10,000 B.C.: The transition to agriculture was made necessary by gradually increasing population pressures due to the success of Homo sapiens&apos; prior hunting and gathering way of life. Also, at about t</p>
          <p className="leading-relaxed mb-4">Resource: http://www.beyondveg.com/nicholson-w/hb/hb-interview1c.shtml</p>
          <p className="leading-relaxed mb-4">4000 B.C.: Environmental opportunities and challenges led to the formation of human groups. Sharing food, caring for infants, and building social networks helped our ancestors meet the daily challenge</p>
          <p className="leading-relaxed mb-4">Resource: http://www2.sunysuffolk.edu/westn/humangroups.html</p>
          <p className="leading-relaxed mb-4">3000 B.C.: The earliest reports of surgical suture date back to 3000 BC in ancient Egypt, where physicians used stitches to close injuries, incisions and mummies.</p>
          <p className="leading-relaxed mb-4">Resource: http://en.wikipedia.org/wiki/Surgical_suture</p>
          <p className="leading-relaxed mb-4">400 B.C.: Hippocrates emphasizes the importance of water quality to health and recommends boiling and straining water.</p>


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
