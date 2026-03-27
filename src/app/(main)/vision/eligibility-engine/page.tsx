import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Quote } from '@/components/ui/Quote'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { EligibilityVideos } from './EligibilityVideos'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Transforming Service Access in Massachusetts',
  description:
    'A centralized MA resident database for better service accessibility.',
}

export default function EligibilityEnginePage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/eligibility/hero-image.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-6">
            Transforming Service Access in Massachusetts
          </h1>
          <p className="leading-relaxed mb-4">
            The current benefit system in Massachusetts is fragmented and inefficient, leading to low utilization rates. Residents struggle to navigate the complex application process, while caseworkers are overwhelmed.
          </p>
          <p className="leading-relaxed mb-4">
            To solve this, a centralized resident database and integrated benefit application system could be implemented. This would enable proactive service recommendations, streamlined applications, and automated benefit renewals.
          </p>
          <p className="leading-relaxed mb-4">
            The goal of the proposed system is to increase access to services for residents and improve efficiency for government agencies. By simplifying the process and providing personalized guidance, the system could lead to higher benefit utilization rates and improved program outcomes.
          </p>

          <Divider />

          {/* Challenges section */}
          <div className="py-2 px-4 mb-8">
            <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center">
              Challenges of Accessing Services in Massachusetts
            </h2>
          </div>
          <p className="leading-relaxed mb-4">
            The Commonwealth of Massachusetts demonstrates a strong commitment to its residents by investing substantial resources in providing a wide array of services, ranging from healthcare and food assistance to housing and educational programs. The full spectrum of these services can be explored on the official Mass.gov website. However, despite these efforts, a significant portion of eligible residents, over 50%, are not receiving the benefits they qualify for, such as MassHealth and SNAP.<sup><a href="#references">1</a></sup>{' '}<sup><a href="#references">2</a></sup>
          </p>
          <p className="leading-relaxed mb-4">
            One of the primary reasons for this gap is the difficulty in navigating the complex network of available services. Residents often face challenges in identifying programs that are relevant to their needs, understanding the eligibility criteria, and gathering the necessary information and documents to apply. The current service application process, which often involves manual data entry and document uploads on multiple agency-specific portals, can be time-consuming and overwhelming.
          </p>

          {/* Current Application Process - image with caption, no heading */}
          <div className="my-8">
            <a
              href={cloudfrontImage('/images/features/eligibility/current-process-2.jpg')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={cloudfrontImage('/images/features/eligibility/current-process-2.jpg')}
                alt="Current application process for MA benefits"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </a>
            <p className="text-center text-sm mt-2">
              Current Application Process
            </p>
          </div>

          {/* Journey Map - clickable image + download button */}
          <a
            href="https://www.goinvo.com/pdf/vision/eligibility/journey-map.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage('/images/features/eligibility/journey-map-preview.jpg')}
              alt="Journey map of applying for benefits in Massachusetts"
              width={1200}
              height={800}
              className="w-full h-auto"
            />
          </a>
          <div className="mt-8 mb-8">
            <Button
              href="https://www.goinvo.com/pdf/vision/eligibility/journey-map.pdf"
              variant="secondary"
              external
              className="w-full"
            >
              Download full applicant journey map
            </Button>
          </div>

          <p className="leading-relaxed mb-4">
            Furthermore, the high caseloads faced by caseworkers can lead to delays in processing applications and providing much-needed support to residents. This creates a frustrating experience for individuals seeking assistance and hinders the effectiveness of the programs themselves.
          </p>

          <Quote
            text="Although many residents have previously applied for benefits, they often feel surprised and caught off guard by the verification requirements. Without clear and customized guidance, residents find themselves guessing what is needed and submitting wrong or outdated paperwork."
            author="Streamlining Access to Public Benefits in Michigan"
          />
          <p className="text-right text-sm text-gray -mt-4 mb-8">
            <sup><a href="#references">3</a></sup>
          </p>

          {/* Common Data Elements section */}
          <div className="py-2 px-4 mb-8">
            <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center">
              Common Data Elements for MA Residents
            </h2>
          </div>
          <p className="leading-relaxed mb-4">
            The creation of a centralized database containing common data elements of Massachusetts residents could significantly improve the current situation. Residents would need to provide the information only once and this database would enable a more proactive and efficient approach to service delivery, where eligible residents are automatically informed about and even can be pre-approved for relevant programs.
          </p>
          <p className="leading-relaxed mb-4">
            From a government perspective, a unified record of MA residents would streamline the eligibility verification process, reduce administrative burdens, and enable more targeted and effective program implementation.
          </p>
          <p className="leading-relaxed mb-4">
            The Commonwealth of Massachusetts already collects essential identification information, including names, birth dates, Social Security numbers, and addresses, through the driver&apos;s license and state ID registration process. By incorporating additional data elements like income and household information, this core dataset could be leveraged to assess eligibility for a wide range of benefits and services.
          </p>

          {/* Data Required image - clickable, caption only */}
          <div className="my-8">
            <a
              href={cloudfrontImage('/images/features/eligibility/application-data-2.jpg')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={cloudfrontImage('/images/features/eligibility/application-data-2.jpg')}
                alt="Data required for a Massachusetts benefit application"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </a>
            <p className="text-center text-sm mt-2">
              Data required for major MA benefit application
            </p>
          </div>

          {/* Google Sheets iframe + button */}
          <div className="mb-8">
            <iframe
              src="https://docs.google.com/spreadsheets/d/e/2PACX-1vT2dKnbphA4iq9sL7br2RkPHMbZkdFecELfz14-q3rSN9KB2Xv0HYoTP7jeCGsEG4Yr6SeTVh4LY_4_/pubhtml?widget=true&headers=false"
              className="w-full border border-gray-medium rounded"
              style={{ height: 600 }}
              loading="lazy"
              title="Eligibility Engine Research Table"
            />
            <div className="mt-8 mb-2">
              <Button
                href="https://docs.google.com/spreadsheets/d/1SRI5Tz5pJLIEr_ibwOj32J4cwN0Ry1cgbXNAXfiBWfk/edit?usp=sharing"
                variant="secondary"
                external
                className="w-full"
              >
                View Common data for MA services
              </Button>
            </div>
          </div>

          <Divider />

          {/* The Power of a Centralized Resident Database */}
          <div className="py-2 px-4 mb-8">
            <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center">
              The Power of a Centralized Resident Database
            </h2>
          </div>
          <p className="leading-relaxed mb-4">
            <strong>Introduce Mila - Massachusetts Integrated Life Assistant</strong>
          </p>
          <p className="leading-relaxed mb-4">
            We propose an integrated benefit management system, called Mila, that utilizes a single resident database to enhance the user experience for both residents and agencies. This approach could serve as a model for improving the delivery of other services provided by Massachusetts in the future.
          </p>

          {/* Streamlined Process image - clickable, caption only */}
          <div className="my-8">
            <a
              href={cloudfrontImage('/images/features/eligibility/streamlined-process-2.jpg')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={cloudfrontImage('/images/features/eligibility/streamlined-process-2.jpg')}
                alt="Streamlined application process with resident database"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </a>
            <p className="text-center text-sm mt-2">
              Streamlined Application Process with Resident Database
            </p>
          </div>

          <p className="leading-relaxed mb-4">
            <strong>Proactive Service Recommendations</strong>
          </p>
          <p className="leading-relaxed mb-4">
            The system would actively analyze the information about residents in the database. By doing so, it could identify and suggest benefits they might be eligible for but haven&apos;t yet applied to. This saves residents the time and effort of having to search for programs themselves.
          </p>
        </div>

        {/* Video Features */}
        <EligibilityVideos />

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          {/* Anticipated Impact */}
          <div className="py-2 px-4 mb-8">
            <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center">
              Anticipated Impact
            </h2>
          </div>
          <p className="leading-relaxed mb-4">
            A service/benefit management system built on a centralized MA resident database could offer the following advantages
          </p>

          <p className="leading-relaxed mb-2">
            <strong>For MA Resident</strong>
          </p>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-6 leading-relaxed">
            <li>
              <strong>Greater Access to Services: </strong>Proactive recommendations and a simplified application process would make it easier for residents to discover and access a wider range of services they qualify for.
            </li>
            <li>
              <strong>Timely Communication and Support: </strong>The system could provide real-time updates and notifications about benefit eligibility, renewal deadlines, and other important information, ensuring residents stay informed and receive the support they need.
            </li>
          </ul>

          <p className="leading-relaxed mb-2">
            <strong>For Government/ Agencies</strong>
          </p>
          <ul className="list-disc list-outside pl-6 space-y-2 mb-8 leading-relaxed">
            <li>
              <strong>Increased Efficiency and Resource Optimization: </strong>Automating eligibility verification and renewal processes would reduce administrative costs and allow staff to focus on other critical tasks.
            </li>
            <li>
              <strong>Data-Driven Insights: </strong>The centralized database would provide valuable data on program usage and effectiveness, enabling agencies to make informed decisions about program improvements and resource allocation.
            </li>
          </ul>

          <Divider />

          {/* Footnotes */}
          <div className="py-2 px-4 mb-8">
            <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center">
              Footnotes
            </h2>
          </div>
          <p className="leading-relaxed mb-4">
            Here is a record of the efforts made so far to address the service gap in Massachusetts in response to the Integrated Eligibility System (IES) initiative for the Commonwealth of Massachusetts.<sup><a href="#references">4</a></sup>
          </p>

          <div className="my-8">
            <a
              href={cloudfrontImage('/images/features/eligibility/footprint.jpg')}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={cloudfrontImage('/images/features/eligibility/footprint.jpg')}
                alt="IES initiative footprint"
                width={1200}
                height={800}
                className="w-full h-auto"
              />
            </a>
          </div>

          <Divider />

          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center mt-8 mb-4">Authors</h2>
          <Author name="Malia Hong" company="GoInvo" />
          <Author name="Sue Park" company="GoInvo" />
          <Author name="Eric Benoit" company="GoInvo" />
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

      {/* References */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto" id="references">
          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center mb-6">References</h2>
          <ol className="list-decimal list-outside pl-6 space-y-2 text-sm text-gray">
            <li>
              Massachusetts Department of Transitional Assistance. (2023).{' '}
              <a href="https://www.mass.gov/doc/annual-department-of-transitional-assistance-organizational-report-november-2023/download" target="_blank" rel="noopener noreferrer">
                Annual Department of Transitional Assistance Organizational Report
              </a>.
            </li>
            <li>
              Kelsey Waddill. (2023).{' '}
              <a href="https://healthpayerintelligence.com/news/4-barriers-to-coverage-among-uninsured-individuals-in-massachusetts" target="_blank" rel="noopener noreferrer">
                4 Barriers to Coverage Among Uninsured Individuals in Massachusetts
              </a>.
            </li>
            <li>
              Civilla and Code for America. (2019).{' '}
              <a href="https://s3-us-west-1.amazonaws.com/codeforamerica-cms1/documents/Streamlining-Access-Report_Integrated-Benefits-Initiative-Civilla_Code-for-America_March-2019.pdf" target="_blank" rel="noopener noreferrer">
                Streamlining Access to Public Benefits in Michigan
              </a>.
            </li>
            <li>
              The Commonwealth of Massachusetts Executive Office of Health and Human Services Office of Medicaid. (2015).{' '}
              <a href="https://www.mass.gov/doc/integrated-eligibility-implementation-plan-october-2015" target="_blank" rel="noopener noreferrer">
                Integrated Eligibility Implementation Plan
              </a>.
            </li>
          </ol>
        </div>
      </section>
    </div>
  )
}
