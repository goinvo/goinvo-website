import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Where are they now?",
  description: "Where are they now?",
}

export default function OralHistoryGoinvoPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Where are they now?
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/an-oral-history/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/an-oral-history/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/an-oral-history/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours An Oral History of GoInvo Origins Andrei Herasimchuk and Dirk Knemeyer incorporated GoInvo in Palo Alto, Ca</p>
          <p className="leading-relaxed mb-4">Andrei dropped out of Amherst College in 1990 to join Specular International, an early digital graphics company, as a founding member. In 1995 he left to join Adobe as their first interface designer. </p>
          <p className="leading-relaxed mb-4">“Usability Guy” Jakob Nielsen was the premier thought leader in UX-related disciplines prior to the emergence of Jeffrey Zeldman Dirk predicted the decline of Nielsen and his left-brained approach to </p>
          <p className="leading-relaxed mb-4">Bob Baxley authored one of the first books on interaction design, “Making the Web Work”. After noodling around at Invo for a few months he moved on to Director-level design roles at Yahoo! and then Ap</p>
          <p className="leading-relaxed mb-4">Andrei’s logo design for Syntex was later donated to the W3C.</p>
          <p className="leading-relaxed mb-4">Like any good design firm, our first business cards were designed to impress.</p>
          <p className="leading-relaxed mb-4">Notoriously avoiding photographs, Dave Bedingfield is one of the best digital designers alive. He was part of Invo Silicon Valley from its earliest days.</p>
          <p className="leading-relaxed mb-4">Before being ready to hire full-time staff, GoInvo worked with top guns like Josh Williams and Jeff Croft. Williams was the founder of Gowalla; Croft wrote Pro CSS Techniques.</p>
          <p className="leading-relaxed mb-4">PROTRADE was re-branded to Citizen Sports, then purchased by Yahoo! Sports for more than $40M.</p>
          <p className="leading-relaxed mb-4">Jeff Ma was one of the leaders of the infamous MIT blackjack team and the real person behind protagonist “Kevin Lewis” in the best-selling book, Bringing Down the House.</p>


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
