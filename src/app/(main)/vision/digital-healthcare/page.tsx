import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Digital Healthcare: 2016 and Beyond",
  description: "Digital Healthcare: 2016 and Beyond",
}

export default function DigitalHealthcarePage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Digital Healthcare: 2016 and Beyond
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/digital-healthcare/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/digital-healthcare/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/digital-healthcare/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours Digital Healthcare: 2016 and Beyond Your business will be obsolete if you aren’t engaging in these 8 things</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Contributing Author</h2>
          <p className="leading-relaxed mb-4">Jon Follett@jonfollett</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Web Developer &amp; Designer</h2>
          <p className="leading-relaxed mb-4">Courtney McGorrill@court_mcgort</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Contributing Author</h2>
          <p className="leading-relaxed mb-4">Juhan Sonin@jsonin</p>


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
