import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Author } from '@/components/ui/Author'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { References } from '@/components/ui/References'
import refs from '@/data/vision/killer-truths/references.json'

export const metadata: Metadata = {
  title: 'Killer Truths',
  description:
    'Estimated number of deaths in the USA from 2007-2014. A data visualization exploring the leading causes of death in America.',
}

export default function KillerTruthsPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/old/images/features/killer-truths/killer_truths_title.png')} />

      {/* Hero Poster */}
      <section className="py-12">
        <div className="max-width content-padding mx-auto">
          <Image
            src={cloudfrontImage('/old/images/features/killer-truths/killer_truths_title.png')}
            alt="Killer Truths - Estimated number of deaths in USA from 2007-2014"
            width={1600}
            height={900}
            className="w-full h-auto mb-8"
          />
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">
            Killer Truths
          </h1>
          <p className="text-gray leading-relaxed mb-8">
            Estimated number of deaths in USA from 2007-2014.
          </p>

          {/* Action Links */}
          <div className="flex flex-wrap gap-6 mb-12 text-sm">
            <a
              href="https://github.com/goinvo/killertruths"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on GitHub
            </a>
            <a
              href={cloudfrontImage('/old/images/features/killer-truths/Killer_Truths_Slide.png')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Download Poster
            </a>
            <a
              href="https://docs.google.com/spreadsheets/d/1dE0CATyI9hDNp3WlgueY7d6bJOiw7HEiyi-MEzHgDig/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Raw Data
            </a>
            <a
              href="mailto:info@goinvo.com"
              className="text-primary hover:underline"
            >
              Connect
            </a>
          </div>
        </div>
      </section>

      {/* Authors */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h2 className="font-serif text-[2.25rem] leading-[2.625rem] font-light text-center">
            Authors
          </h2>
          <Author name="Sharon Lee" company="GoInvo" />

          <h2 className="font-serif text-[1.5rem] leading-[2.125rem] font-light text-center mt-12">
            Contributors
          </h2>
          <Author name="Jen Patel" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo, MIT" />
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
        <div className="max-width max-width-md content-padding mx-auto">
          <References items={refs} />
        </div>
      </section>
    </div>
  )
}
