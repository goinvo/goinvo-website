import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'
import { DisruptNav } from '../DisruptNav'
import { legacyImage } from '../disrupt-shared'

export const metadata: Metadata = {
  title: 'Disrupt! Part 2: From Horse to Horsepower',
  description:
    'To envision our future and the possible effects of technological disruption, it is helpful to consider the historical context of the Second Industrial Revolution.',
}

export default function DisruptPart2Page() {
  return (
    <div>
      <SetCaseStudyHero
        image={legacyImage('video_fallbacks/section-2-top.jpg')}
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

          {/* ===== PART 2: FROM HORSE TO HORSEPOWER ===== */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Part 2: From Horse to Horsepower
            </h2>

            <Image
              src={legacyImage('video_fallbacks/section-2-top.jpg')}
              alt="Historical image of early automobile era"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              To envision our future and the possible effects of technological
              disruption, both positive and negative, it is helpful to consider
              some of the recent historical context for humanity&apos;s ongoing
              relationship with technology.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Before the Second Industrial Revolution, personal travel was
              accomplished via feet, horse and buggy, or railroad. Communication
              happened through word of mouth, handwritten letters, and telegraph.
              Evening lighting came from candles, lanterns, or gas lamps. As new
              technologies become closely interwoven with our daily lives it
              becomes difficult to envision how people functioned without them.
            </p>

            <div className="bg-gray-lightest p-6 my-6">
              <h4 className="font-serif text-lg font-light mb-3">
                Automobile Adoption Rates
              </h4>
              <ul className="text-gray text-sm space-y-2">
                <li>
                  <strong>1910:</strong> Fewer than 500,000 autos in the United
                  States
                </li>
                <li>
                  <strong>1917:</strong> 5 million registered vehicles (10x
                  increase in 7 years)
                </li>
                <li>
                  <strong>1929:</strong> Approximately 27 million automobiles
                  (50x increase from 1917)
                </li>
              </ul>
            </div>

            <Image
              src={legacyImage('nytgraph.gif')}
              alt="Technology adoption rates chart from Nick Felton, New York Times"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-4 italic">
              Data visualization by Nick Felton, New York Times. By the 1930s,
              nearly 70% of U.S. households had electricity, 50% had
              automobiles, and 40% had telephones.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              The automobile transformed America, forcing the remaking of the
              American landscape. Roads and highways replaced natural terrain
              with asphalt and concrete, from sea to shining sea. The natural
              beauty of America was subjugated to the desire to move forward.
            </p>

            <Image
              src={legacyImage('section-2-highway-system.png')}
              alt="U.S. Highway System Plan, November 11, 1926"
              width={800}
              height={500}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-4 italic">
              U.S. Highway System Plan, November 11, 1926
            </p>

            <Image
              src={legacyImage('section-2-pijl.png')}
              alt="Karl Jilg's illustration representing a pedestrian's view of city streets"
              width={800}
              height={500}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-4 italic">
              Karl Jilg represents a pedestrian&apos;s view of city streets
              &mdash; public space was ceded in permanent fashion to one form of
              transportation only.
            </p>

            <Image
              src={legacyImage('section-2-standard-oil.png')}
              alt="1905 political cartoon showing Standard Oil's octopus-like influence"
              width={800}
              height={500}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-4 italic">
              John Rockefeller&apos;s Standard Oil had an octopus-like economic
              influence &mdash; natural resources and even national policy were
              subjected to the whims of big oil companies.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              In hindsight it&apos;s easy to question if these were the best
              outcomes. We received great benefits, no doubt, from the auto, and
              great detriments as well. Going forward, it&apos;s worth
              considering the trade-offs of emerging, disruptive technologies,
              for our environment, natural resources, and way of living.
            </p>
          </div>

          {/* Next Part Link */}
          <Link href="/vision/disrupt/part-3" className="block group">
            <div className="relative w-full h-48 md:h-64 overflow-hidden">
              <Image
                src={legacyImage('video_fallbacks/section-3-top.jpg')}
                alt="Next: The Coming Disruption"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <p className="text-white text-xl md:text-2xl font-serif font-light tracking-[0.15em]">
                  Next: Part 3 &mdash; The Coming Disruption &rarr;
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
