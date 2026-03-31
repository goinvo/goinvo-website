import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'
import { DisruptNav } from '../DisruptNav'
import { legacyImage } from '../disrupt-shared'

export const metadata: Metadata = {
  title: 'Disrupt! Part 3: The Coming Disruption',
  description:
    'What is the nature and magnitude of the disruption before us? Emerging technologies like IoT, robotics, genomics, and synthetic biology will transform every aspect of our lives.',
}

export default function DisruptPart3Page() {
  return (
    <div>
      <SetCaseStudyHero
        image={legacyImage('video_fallbacks/section-3-top.jpg')}
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

          {/* ===== PART 3: THE COMING DISRUPTION ===== */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Part 3: The Coming Disruption
            </h2>

            <p className="text-gray leading-relaxed mb-4">
              What is the nature and magnitude of the disruption before us? Like
              the owner of the horse and buggy at the turn of the 20th century,
              we cannot fully appreciate or completely anticipate the entirety of
              the coming technological change that will embrace nearly every
              aspect of our everyday lives. We can, however, begin to understand
              the magnitude of that disruption in areas as varied as the places
              we live, the food we eat, and the work we do by emerging
              technologies like the Internet of Things, robotics, genomics and
              synthetic biology.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Living
            </h3>

            <Image
              src={legacyImage('section-3-light-reeds.png')}
              alt="Light Reeds project by Pensa design firm"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              The places in which we live, work, and play will be created,
              connected, and controlled in new ways &mdash; from the architecture
              of buildings to the composition of public and private spaces, to
              the infrastructure that binds it all together. Already, our cities
              are being made &ldquo;smarter&rdquo; by the connected sensors of
              the Internet of Things (IoT). These systems can help save precious
              resources by reorienting our day-to-day activities through the
              optimization and coordination of elements like traffic flow &mdash;
              reducing congestion, saving commuters time and fuel, and helping to
              limit pollution.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              One beautiful example of this increased awareness can be seen in
              the Light Reeds project, created by New York design firm Pensa,
              which provide viewers with a greater connection to the water and
              waterways that flow around and through our cities. Powered by an
              underwater turbine, the Light Reeds themselves rely on the motion
              of the water for power; their glow is dim or bright based on the
              degree of activity, while their color can indicate water quality.
            </p>

            <Image
              src={legacyImage('section-3-bioluminescent-trees-1.png')}
              alt="Bioluminescent trees visualization by Studio Roosegaarde"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              Or consider the potential of our parks and open spaces to be lit by
              light-emitting trees with a bioluminescent coating instead of
              electric lights, illustrated beautifully in this visualization by
              designers from Studio Roosegaarde. This might seem far fetched, but
              glowing plants such as these are already being created through
              synthetic biology.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Buildings of the future may be partially or entirely 3D printed.
              In April 2014, WinSun, a Chinese engineering company, reported
              that it could construct 10 single-story homes in a day by using a
              specialized 3D printing technology that creates the main structure
              and walls using an inexpensive combination of concrete and
              construction waste materials.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Eating
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              There&apos;s nothing more demonstrative of our connection to the
              greater world around us than the food we put inside our bodies.
              Genetically modified organisms (GMO) are prevalent throughout the
              United States. Today the overwhelming majority of commodity crops
              from soybeans to cotton to beets to corn are genetically
              engineered. According to the ISAAA in 2014, a record 181.5 million
              hectares of biotech crops were grown globally.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Disruption in our food supply can begin with something as mundane
              as improving the length of freshness of the humble tomato. While
              naturally occurring tomato varieties begin to soften and rot after
              a week on the shelves or two weeks in the refrigerator, altering
              the genetic makeup of a tomato &mdash; to suppress or
              &ldquo;silence&rdquo; certain characteristics &mdash; enables the
              texture of the fruit to remain intact for up to 45 days.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Working
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              In the area of global manufacturing, emerging technologies like
              advanced robotics and additive fabrication are changing the way
              products are constructed. These changes threaten to completely alter
              the nature and type of human labor required, with the very strong
              possibility that millions of jobs worldwide will be lost to agile,
              robotic manufacturing processes. Knowledge work is similarly
              threatened by the automation of tasks by computerized artificial
              intelligence. There will be no simple answers to this. But if we
              believe that humans need meaningful work to lead full lives, the
              need to find answers and design solutions becomes of tremendous
              importance.
            </p>
          </div>

          {/* Next Part Link */}
          <Link href="/vision/disrupt/part-4" className="block group">
            <div className="relative w-full h-48 md:h-64 overflow-hidden">
              <Image
                src={legacyImage('video_fallbacks/section-4-top.jpg')}
                alt="Next: Crowdsourcing Innovation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <p className="text-white text-xl md:text-2xl font-serif font-light tracking-[0.15em]">
                  Next: Part 4 &mdash; Crowdsourcing Innovation &rarr;
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
