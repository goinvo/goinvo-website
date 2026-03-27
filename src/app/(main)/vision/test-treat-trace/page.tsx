import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/test-treat-trace/references.json'

export const metadata: Metadata = {
  title:
    'Test. Treat. Trace. The strategy to defeat pandemic viruses like COVID-19.',
  description:
    'As new treatments and vaccines are developed, containing virus spread is critical. We need a comprehensive approach of testing, treating, and tracing as a core backbone to response.',
}

const pdfUrl = cloudfrontImage(
  '/pdf/vision/test-treat-trace/Test-Treat-Trace-18Jun2020.pdf'
)

export default function TestTreatTracePage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/test-treat-trace/test-treat-trace-header-2.jpg'
        )}
      />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Test. Treat. Trace.
          </h1>
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
                '/images/features/test-treat-trace/test-treat-trace-2.jpg'
              )}
              alt="Test. Treat. Trace. poster"
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
        </div>

        {/* Authors */}
        <div className="py-8">
          <div className="max-width max-width-md content-padding mx-auto">
            <Divider />
            <div className="py-8">
              <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center">
                Authors
              </h2>
              <Author name="Parsuree Vatanasirisuk" />
              <Author name="Juhan Sonin" />
            </div>
            <h2 className="font-serif text-xl text-center mt-8">
              Thank you for the feedback from...
            </h2>
            <ul className="list-disc pl-6 space-y-1 mt-4">
              <li>Peter Jones</li>
              <li>Danny van Leeuwen</li>
              <li>Dafna Gold Melchior</li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="bg-gray-light py-12">
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
