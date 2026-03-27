import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Killer Truths",
  description: "Killer Truths",
}

export default function KillerTruthsPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Killer Truths
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/killer-truths/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/killer-truths/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/killer-truths/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours Estimated number of deaths in USA from 2007-2014.</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <p className="leading-relaxed mb-4">GoInvo</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Sharon Lee</h2>
          <p className="leading-relaxed mb-4">Sharon is a designer with an eclectic background in engineering, medicine, and art. Passionate about healthcare, she has focused her efforts on human-centered software design. She joined Invo in 2016 </p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Contributors</h2>
          <p className="leading-relaxed mb-4">GoInvo</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Jennifer Patel</h2>
          <p className="leading-relaxed mb-4">Jennifer is a designer-developer hybrid specializing in user interface design and front-end development. She creates beautiful designs using big and small data, often for health and enterprise service</p>


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
