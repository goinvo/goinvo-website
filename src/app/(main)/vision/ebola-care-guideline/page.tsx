import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Ebola Care Guideline",
  description: "Ebola Care Guideline",
}

export default function EbolaCareGuidelinePage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Ebola Care Guideline
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/ebola-care-guideline/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/ebola-care-guideline/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/ebola-care-guideline/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours Ebola Care Guideline An Illustrated Process on Personal Protective Equipment The recommended Personal Prote</p>
          <p className="leading-relaxed mb-4">Email stopebola@goinvo.com to provide feedback and help evolve this document.</p>
          <p className="leading-relaxed mb-4">Share this article:</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Author</h2>
          <h2 className="font-serif text-2xl mt-8 mb-4">Xinyu Liu</h2>
          <p className="leading-relaxed mb-4">Xinyu is a designer with a background in crafting physical objects, conducting research, and influencing human behavior. She leverages invisible sensing tech, composes emotional feedback loops, and cr</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">Editor</h2>
          <p className="leading-relaxed mb-4">Emily Twaddell@mimitwaddell</p>
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
