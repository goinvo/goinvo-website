import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'
import { DisruptNav } from './DisruptNav'
import { legacyImage } from './disrupt-shared'

export const metadata: Metadata = {
  title: 'Disrupt! Emerging Technologies',
  description:
    'Emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities for extending our reach, enabling us to become seemingly superhuman.',
}

export default function DisruptPage() {
  return (
    <div>
      <SetCaseStudyHero
        image={legacyImage('video_fallbacks/section-1-top.jpg')}
      />

      <section className="py-12">
        <div className="max-width max-width-md content-padding mx-auto">
          {/* Title */}
          <h1 className="font-serif text-[1.75rem] leading-[2.0625rem] lg:text-[2.25rem] lg:leading-[2.625rem] font-light mb-1">
            Disrupt!
          </h1>
          <h3 className="font-serif text-base font-light text-gray mb-6">
            Emerging technologies from robotics to synthetic biology to the
            Internet of Things
          </h3>

          {/* Section Navigation */}
          <DisruptNav />

          <Divider />

          {/* ===== PART 1: EMERGING TECHNOLOGIES ===== */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Part 1: Emerging Technologies
            </h2>

            <p className="text-gray leading-relaxed mb-4">
              Over the next 30 years, there is little that humans can dream that
              we won&apos;t be able to do &mdash; from hacking our DNA, to
              embedding computers in our bodies, to printing replacement organs.
              The fantastic visions of our science fiction today will become the
              reality of tomorrow, as we redefine what it means to be human. This
              period of technological advancement will alter the way we live our
              lives in nearly every way &mdash; much like the Second Industrial
              Revolution in America established the modern age at the turn of the
              20th century, when inventions from electric power to the automobile
              first became prominent and experienced widespread adoption.
            </p>

            <Image
              src={legacyImage('section-1-lockheed-martin.png')}
              alt="FORTIS exoskeleton from Lockheed Martin"
              width={800}
              height={500}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              Today, emerging technologies from robotics to synthetic biology to
              the Internet of Things are already opening up new possibilities for
              extending our reach, enabling us to become seemingly superhuman. As
              one example of this, the FORTIS exoskeleton from Lockheed Martin
              gives its user tremendous strength &mdash; allowing an operator to
              lift and use heavy tools as if the objects were weightless by
              transferring the weight loads through the exoskeleton to the
              ground. E. chromi &mdash; the Grand Prize winner at the 2009
              International Genetically Engineered Machine Competition (iGEM) by
              Alexandra Daisy Ginsberg and her collaborators &mdash; advances the
              existing relationship we have with our microbiome, the
              microorganisms living on and inside us. The genetically altered e.
              chromi bacteria can serve as an early warning system for disease,
              changing the color of human waste to indicate the presence of a
              dangerous toxin or pathogen. For instance, if drinking water were
              tainted, fecal matter could be colored a brilliant red. In the
              future, a variety of day-glo colors might indicate a dangerous
              array of contaminants from malaria to the swine flu. Perhaps not
              what we all had in mind for a super power, but amazing nonetheless.
            </p>

            <Image
              src={legacyImage('section-1-e-chromi.png')}
              alt="E. chromi bacteria color indicators"
              width={800}
              height={300}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              What does it mean to create products and services that have the
              potential to disrupt our society and our economy? We will need to
              rethink and remake our interactions, our infrastructure, and maybe
              even our institutions. As we face a future where what it means to
              be human could be inexorably changed, we desperately need
              experience design to help frame our interactions with emerging
              technologies that are already racing ahead of our ability to
              process and manage them on an emotional, ethical, and societal
              level. Whether we&apos;re struggling with fear and loathing in
              reaction to genetically altered foods, the moral issues of changing
              a child&apos;s traits to suit a parent&apos;s preferences, the
              ethics guiding battlefield robots, or the societal implications of
              a 150-year extended lifetime, it&apos;s abundantly clear that the
              future of experience design will be to envision humanity&apos;s
              relationship to technology and each other.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              The coming wave of technological change will make the tumult and
              disruption of the past decade&apos;s digital and mobile revolutions
              look like a minor blip by comparison. As we look beyond the screen
              to the rich world of interactions and experiences that need to be
              designed, we need to define new areas of practice. Experience design
              will be critical to tie the technology to human use and benefit. For
              those asking &ldquo;How can we do this?&rdquo; we must counter,
              &ldquo;Why and for whose benefit?&rdquo;
            </p>
          </div>

          {/* Next Part Link */}
          <Link href="/vision/disrupt/part-2" className="block group">
            <div className="relative w-full h-48 md:h-64 overflow-hidden">
              <Image
                src={legacyImage('video_fallbacks/section-2-top.jpg')}
                alt="Next: From Horse to Horsepower"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <p className="text-white text-xl md:text-2xl font-serif font-light tracking-[0.15em]">
                  Next: Part 2 &mdash; From Horse to Horsepower &rarr;
                </p>
              </div>
            </div>
          </Link>
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
