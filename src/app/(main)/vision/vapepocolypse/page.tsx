import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/vapepocolypse/references.json'

export const metadata: Metadata = {
  title: 'Vapepocolypse',
  description: 'Vapepocolypse',
}

const pdfUrl = cloudfrontImage(
  '/pdf/vision/vapepocolypse/Vapepocolypse.pdf'
)

export default function VapepocolypsePage() {
  return (
    <div>
      <SetCaseStudyHero
        image={cloudfrontImage(
          '/images/features/vapepocolypse/vapepocolypse-hero.jpg'
        )}
      />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Vapepocolypse
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
                '/images/features/vapepocolypse/vapepocolypse-full.jpg'
              )}
              alt="Vapepocolypse poster"
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

          <Divider />

          {/* Authors */}
          <div className="py-8">
            <h2 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light text-center">
              Authors
            </h2>
            <Author name="Colleen Tang Poy" />
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
