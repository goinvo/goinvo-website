import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/who-uses-my-health-data/references.json'

export const metadata: Metadata = {
  title: 'Who Uses my Health Data - GoInvo',
  description:
    'The health data trade has quietly grown with little patient or doctor knowledge',
}

const pdfUrl = cloudfrontImage(
  '/pdf/vision/health-data-use/health-data-use-poster-medium.pdf'
)

export default function WhoUsesMyHealthDataPage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/health-data-use/health-data-use-hero-2.jpg'
        )}
      />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Who Uses My Health Data?
          </h1>
          <p className="text-gray leading-relaxed mb-0">
            With all of the data they have about us, the U.S. tech giants
            (Facebook, Google, Amazon, etc) wield market power that other
            companies can only imagine. It is easy for that imagination to
            run wild, as companies consider how similar insights could
            transform their own business. The allure of bigger data, better
            machine learning, and more powerful analytics may stem from a
            vision for the future or perhaps a fear of falling behind.
            Either way, the market for data on consumers is thriving. A slew
            of companies have capitalized on the mining and brokering of
            this data.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            We consumers may grow to expect some data tracking. However, we
            may not realize that our healthcare data, collected behind the
            safely closed doors of our doctor&apos;s office, travels through many
            hands for the profit of others.
          </p>
        </div>

        {/* Poster */}
        <div className="my-8">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage(
                '/images/features/health-data-use/health-data-use-poster-thin.jpg'
              )}
              alt="Who Uses My Health Data poster"
              width={1600}
              height={900}
              className="w-full h-auto"
            />
          </a>
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          {/* Download Button */}
          <div className="flex flex-col lg:flex-row gap-4 my-8">
            <Button
              href={pdfUrl}
              variant="secondary"
              size="lg"
              external
            >
              Download Poster
            </Button>
          </div>

          <p className="text-sm text-gray leading-relaxed mb-4">
            Note: In the visual above, we have done our best to trace the
            web of connections, but our map is not comprehensive. Please
            reach out with suggestions, insights, or questions.
          </p>

          {/* HIPAA Section */}
          <h2 className="font-serif text-2xl mt-16 mb-2">
            HIPAA Limitations and Re-identification
          </h2>
          <p className="text-gray leading-relaxed mt-0">
            Within the healthcare system, patient health information (PHI)
            must be de-identified when traded, as mandated by HIPAA. But it
            does not prohibit the sale of your data, require that your
            health data is only used for your health care, or protect your
            health data outside of the health system. In fact, consumer
            companies such as DNA testing and analysis services are not
            required to de-identify your data if they sell it to data
            brokers.
            <sup>
              <a href="#references">13</a>
            </sup>{' '}
            Even de-identified, data miners and brokers use systems that
            replace your name, SSN, and a few other &ldquo;identifying&rdquo; data with
            a unique code in order to create a longitudinal record of your
            health.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            Re-identifying de-identified profiles has become much easier
            since the HIPAA laws were first established. It is easy to
            imagine how combining information such as GPS data with past
            appointment times and dates would pinpoint an individual. Past
            studies have found that &ldquo;63% of the population can be uniquely
            identified by the combination of their gender, date of birth,
            and zip code alone.&rdquo;
            <sup>
              <a href="#references">3</a>
            </sup>
          </p>

          {/* Patients Section */}
          <h2 className="font-serif text-2xl mt-16 mb-2">
            Patients need Insight, Control, and Ownership
          </h2>
          <p className="text-gray leading-relaxed mt-0">
            Many companies value health-related data whether it&apos;s
            de-identified or directly linked to patient names and addresses.
            For some of these purposes, we patients may have zero
            objections. Some patients are eager to share data with
            researchers if it supports a cure for them or their legacy.
            Patients may object to other uses of their health data such as
            targeted advertising or profiling. However, the missing thread
            across all of these uses is patient consent.
          </p>
          <p className="text-gray leading-relaxed mb-4">
            We patients need ownership over our health data, which is often
            the most sensitive information about our lives. We need
            authority over its access and use. At the very least, we need to
            know who is using and viewing our data. For those of us who are
            healthy and in a financial position to entertain a myriad of
            health/fitness services and organic food, we may not be
            negatively impacted. If we have any kind of medical condition or
            are in a similar demographic to those that struggle with their
            health, we may more strongly feel the intrusion of our privacy
            and even experience discrimination via profiling.
          </p>
        </div>

        {/* Authors */}
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center">
            Authors
          </h2>
          <Author name="Sharon Lee" />
          <h3 className="header-md mt-8">Contributors</h3>
          <Author name="Juhan Sonin" />
          <Divider />
        </div>

        {/* Newsletter */}
        <div className="bg-gray-light py-12 mt-8">
          <div className="max-width max-width-md content-padding mx-auto">
            <NewsletterForm />
          </div>
        </div>

        {/* References */}
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={refs} />
        </div>
      </section>
    </div>
  )
}
