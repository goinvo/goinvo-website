import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "Understanding Zika",
  description: "Understanding Zika",
}

export default function UnderstandingZikaPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Understanding Zika
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/zika/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/zika/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/zika/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours &amp;equiv; ZIKA Overview Infected Areas Transmission Prevention Symptoms Guillain Barr&amp;eacute Syndrome Treatme</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">How it Spreads</h2>
          <p className="leading-relaxed mb-4">Person &amp;rarr; mosquito &amp;rarr; person</p>
          <p className="leading-relaxed mb-4">Mother &amp;rarr; unborn child</p>
          <p className="leading-relaxed mb-4">Man &amp;rarr; sexual partner</p>
          <p className="leading-relaxed mb-4">Person &amp;rarr; blood bank &amp;rarr; person</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">How to Prevent it</h2>
          <h2 className="font-serif text-2xl mt-8 mb-4">When to Tell Your Doctor</h2>
          <p className="leading-relaxed mb-4">If you have been exposed to a Zika-infected area, watch for these signs of Zika Disease.</p>


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
