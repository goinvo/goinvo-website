import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: "The Care Plan Series",
  description: "The Care Plan Series",
}

export default function CarePlansPage() {
  return (
    <div>
      

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            The Care Plan Series
          </h1>

          {/* TODO: Port full content from https://www.goinvo.com/features/careplans/ */}
          <p className="text-gray leading-relaxed mb-4">
            This page is being migrated from the legacy site.
            Original content available at{' '}
            <a href="https://www.goinvo.com/features/careplans/" target="_blank" rel="noopener noreferrer">
              https://www.goinvo.com/features/careplans/
            </a>
          </p>

          <p className="leading-relaxed mb-4">Work Services About Vision Contact Home Work Services About Vision Careers Open Office Hours Part1Overview Part2Landscape Part3Future Part1Overview Part2Landscape Part3Future DownloadeBook</p>
          <p className="leading-relaxed mb-4">DownloadeBook</p>
          <p className="leading-relaxed mb-4">DownloadPresentation</p>
          <h2 className="font-serif text-2xl mt-8 mb-4">The Care Plan Series</h2>
          <p className="leading-relaxed mb-4">Overwhelmed. It is how most patients feel at one point or another as they leave that sterile-smelling, fluorescent-lit doctor’s office. They have just spent 10-25 minutes being hastily examined, diagn</p>
          <p className="leading-relaxed mb-4">There is a loose, under-utilized semblance of a &quot;plan of care&quot; in most health data sets. You&apos;ll find them mentioned in the standard Continuity of Care Document (CCD), the FHIR framework, and CMS&apos;s rec</p>
          <p className="leading-relaxed mb-4">The first feature examines how the concept of a care plan came to be and our understanding of it today.</p>
          <p className="leading-relaxed mb-4">The second feature visualizes the current care planning process and limitations, and evaluates existing care plan- related services.</p>
          <p className="leading-relaxed mb-4">The third feature explores what these findings mean for the future of care plans and our shifting healthcare system, and proposes a call to action.</p>
          <p className="leading-relaxed mb-4">Our feature series has three goals. We aim to spread both awareness to the general public about the benefit of care planning, as well as empowerment to demand such practices from doctors. We aim to in</p>


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
