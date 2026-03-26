import type { Metadata } from 'next'
import Image from 'next/image'
import { cloudfrontImage } from '@/lib/utils'
import { Divider } from '@/components/ui/Divider'
import { Author } from '@/components/ui/Author'
import { Button } from '@/components/ui/Button'
import { Video } from '@/components/ui/Video'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'

export const metadata: Metadata = {
  title: 'Precision Autism',
  description:
    'An open-source visual depiction of the history of autism and how precision medicine will help define, manage, and treat the condition.',
}

export default function PrecisionAutismPage() {
  return (
    <div>
      <SetCaseStudyHero image={cloudfrontImage('/images/features/precision-autism/hero-precision-autism-2.jpg')} />

      {/* Content */}
      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light">Precision Autism</h1>
          <p className="leading-relaxed mb-4">
            Living with autism looks different for every family. By capturing real-world data and tailoring insights to the individual, a thoughtfully designed tool can support more personalized care, better communication with caregivers, educators, and providers. And ultimately, provide families with a more empowered and proactive approach for living with autism.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <a
              href="https://www.handsfilm.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-primary-light text-primary hover:bg-primary-lightest transition-colors uppercase text-sm tracking-[2px] font-semibold no-underline"
            >
              Check out the Documentary
            </a>
          </div>
        </div>

        {/* Video */}
        <div className="max-width max-width-md content-padding mx-auto mb-8">
          <Video
            poster={cloudfrontImage('/images/features/precision-autism/autism_data_display_spacey_v2.jpg')}
            sources={[
              { src: cloudfrontImage('/videos/features/precision-autism/autism_atmosphere_10_720.mp4'), format: 'mp4' },
              { src: cloudfrontImage('/videos/features/precision-autism/autism_atmosphere_10_720.webm'), format: 'webm' },
            ]}
            loop
          />
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <a
              href="https://github.com/openAutism/openautism.github.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-primary-light text-primary hover:bg-primary-lightest transition-colors uppercase text-sm tracking-[2px] font-semibold no-underline"
            >
              Github
            </a>
            <a
              href="https://openautism.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-primary-light text-primary hover:bg-primary-lightest transition-colors uppercase text-sm tracking-[2px] font-semibold no-underline"
            >
              Concepts and Sketches
            </a>
          </div>

          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">A Brief History of Precision Medicine and Autism</h2>
          <a
            href="https://www.goinvo.com/pdf/vision/precision-autism/Precision-Autism-25.Aug.2020.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={cloudfrontImage('/images/features/precision-autism/precision-autism.jpg')}
              alt="Precision Autism poster"
              width={1200}
              height={800}
              className="w-full h-auto hover:opacity-90 transition-opacity"
            />
          </a>
          <div className="text-center mt-4 mb-4">
            <a
              href="https://www.goinvo.com/pdf/vision/precision-autism/Precision-Autism-25.Aug.2020.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-primary-light text-primary hover:bg-primary-lightest transition-colors uppercase text-sm tracking-[2px] font-semibold no-underline"
            >
              Download Poster
            </a>
          </div>
          <p className="text-center text-sm text-gray mb-8">
            Licensed under Creative Commons Attribution v4
          </p>
        </div>

        {/* Timeline Embed */}
        <div className="max-width content-padding mx-auto my-8">
          <iframe
            src="https://cdn.knightlab.com/libs/timeline3/latest/embed/index.html?source=1UaJB6GqmCOJ9mAaNzEark9Of4AIb7wTx346E7gNlhGE&font=Default&lang=en&initial_zoom=2&height=650"
            className="w-full border-0"
            style={{ height: 650 }}
            allowFullScreen
            loading="lazy"
            title="Precision Autism Timeline"
          />
          <div className="text-center mt-6">
            <a
              href="https://docs.google.com/spreadsheets/d/1UaJB6GqmCOJ9mAaNzEark9Of4AIb7wTx346E7gNlhGE/edit?ts=5c6f2046"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 border border-primary-light text-primary hover:bg-primary-lightest transition-colors uppercase text-sm tracking-[2px] font-semibold no-underline"
            >
              Timeline Events and References
            </a>
          </div>
        </div>

        <div className="max-width max-width-md content-padding mx-auto">
          <Divider />

          <h2 className="font-serif text-2xl mt-8 mb-4">Authors</h2>
          <Author name="Parsuree Vatanasirisuk" company="GoInvo" />
          <Author name="Sharon Lee" company="GoInvo" />
          <Author name="Juhan Sonin" company="GoInvo" />

          <h3 className="header-md mt-8 mb-3">Special thanks to...</h3>
          <ul className="list-disc list-outside pl-6 space-y-1 mb-8">
            <li>Elizabeth Horn</li>
            <li>Clare Southern</li>
            <li>Michael Snyder</li>
          </ul>
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
