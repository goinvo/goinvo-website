import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'
import { DisruptNav } from '../DisruptNav'
import { legacyImage } from '../disrupt-shared'

export const metadata: Metadata = {
  title: 'Disrupt! Part 6: Fukushima and Fragility',
  description:
    'The Fukushima catastrophe revealed the fragility of our systems and the need for resilient design solutions to disasters.',
}

export default function DisruptPart6Page() {
  return (
    <div>
      <SetCaseStudyHero
        image={legacyImage('video_fallbacks/section-6-top.jpg')}
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

          {/* ===== PART 6: FUKUSHIMA AND FRAGILITY ===== */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Part 6: Fukushima and Fragility
            </h2>

            <Image
              src={legacyImage('section-6-fukushima.png')}
              alt="Radiation hotspot in Kashiwa, Japan"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              On March 11, 2011, a 9.0 magnitude earthquake and subsequent
              tsunami damaged the Fukushima Daiichi nuclear reactors in Japan.
              Over the course of 24 hours, crews tried desperately to fix the
              reactors. However, as, one by one, the back-up safety measures
              failed, the fuel rods in the nuclear reactor overheated, releasing
              dangerous amounts of radiation into the surrounding area. As
              radiation levels became far too high for humans, emergency teams at
              the plant were unable to enter key areas to complete the tasks
              required for recovery. Three hundred thousand people had to be
              evacuated from their homes, some of whom have yet to return.
            </p>

            <Image
              src={legacyImage('section-6-irobot.png')}
              alt="iRobot 710 Warrior robot used at Fukushima"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              The current state of the art in robotics is not capable of
              surviving the hostile, high-radiation environment of a nuclear
              power plant meltdown and dealing with the complex tasks required to
              assist a recovery effort. In the aftermath of Fukushima, the
              Japanese government did not immediately have access to hardened,
              radiation-resistant robots. A few robots from American companies
              &mdash; tested on the modern battlefields of Afghanistan and Iraq
              &mdash; including iRobot&apos;s 710 Warrior and PackBot were able
              to survey the plant. However, for many reasons, spanning political,
              cultural, and systemic, before the Fukushima event, an investment
              in robotic research was never seriously considered. The meltdown
              was an unthinkable catastrophe, one that Japanese officials thought
              could never happen.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              The DARPA Robotics Challenge
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              The Fukushima catastrophe inspired the United States Defense
              Advanced Research Projects Agency (DARPA) to create the Robotics
              Challenge, the purpose of which is to accelerate technological
              development for robotics in the area of disaster recovery.
              Acknowledging the fragility of our human systems and finding
              resilient solutions to catastrophes &mdash; whether it&apos;s the
              next super storm, earthquake, or nuclear meltdown &mdash; is a
              problem on which designers, engineers, and technologists should
              focus.
            </p>

            <div className="bg-gray-lightest p-6 my-6 border-l-4 border-primary">
              <p className="text-gray leading-relaxed text-sm italic">
                &ldquo;History has repeatedly demonstrated that humans are
                vulnerable to natural and man-made disasters, and there are often
                limitations to what we can do to help remedy these situations
                when they occur. Robots have the potential to be useful
                assistants in situations in which humans cannot safely operate,
                but despite the imaginings of science fiction, the actual robots
                of today are not yet robust enough to function in many disaster
                zones nor capable enough to perform the most basic tasks required
                to help mitigate a crisis situation. The goal of the DRC is to
                generate groundbreaking research and development in hardware and
                software that will enable future robots, in tandem with human
                counterparts, to perform the most hazardous activities in
                disaster zones, thus reducing casualties and saving
                lives.&rdquo;
              </p>
              <p className="text-sm text-gray mt-2">&mdash; DARPA Mission Statement</p>
            </div>

            <Image
              src={legacyImage('section-6-mit-robots.png')}
              alt="Boston Dynamics Atlas, an agile anthropomorphic robot"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-6 italic">
              Boston Dynamics Atlas, an agile anthropomorphic robot. In the 2013
              competition trials, robots from MIT, Carnegie Mellon, and Schaft
              competed at tasks including driving cars, traversing difficult
              terrain, climbing ladders, opening doors, moving debris, cutting
              holes in walls, closing valves, and unreeling hoses.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Changing Design and Designing Change
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              People are less interested in the science and engineering, the
              mechanisms that make emerging technologies possible, but they are
              deeply concerned with the outcomes. As these technologies emerge,
              grow, and mature over the coming years, designers will have the
              opportunity to bridge human needs and the miraculous technological
              possibilities.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              It will be a great and even intimidating challenge to involve
              design early in the process of defining new products and services,
              but it will be critical as we establish the practices of the
              twenty-first century &mdash; from the design of technology policy,
              to systems, to tactical interaction frameworks and techniques.
              Policy design will involve advising regulators and politicians on
              the possibilities and perils of emerging tech; system design will
              demand clear understanding of the broader interactions and
              implications; and framework design will benefit our day-to-day
              tactical work.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Understanding new technologies, their potential usage, and how they
              will impact people in the short and long term will require
              education and collaboration, resulting in new design
              specializations, many of which we have not yet even considered. In
              the coming years, as the boundaries between design and engineering
              for software, hardware, and biotechnology continue to blur, those
              who began their professional lives as industrial designers,
              computer engineers, UX practitioners, and scientists will find that
              the trajectory of their careers takes them into uncharted
              territory.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Like the farmers who moved to the cities to participate in the
              birth of the Industrial Revolution, we can&apos;t imagine all of
              the outcomes of our work. However, if history is any indicator, the
              convergence of these technologies will be greater than the sum of
              its parts. If we are prepared to take on such challenges, we only
              have to ask: &ldquo;What stands in the way?&rdquo;
            </p>

            {/* Book Reference */}
            <div className="bg-gray-lightest p-6 my-6">
              <h4 className="font-serif text-lg font-light mb-3">
                Designing for Emerging Technologies
              </h4>
              <p className="text-gray text-sm leading-relaxed">
                If you&apos;re interested in further exploration of this topic,
                check out &ldquo;Designing for Emerging Technologies&rdquo;
                published by O&apos;Reilly Media, from which portions of this
                article were excerpted. In this book, you will discover 20
                essays, from designers, engineers, scientists and thinkers,
                exploring areas of fast-moving, ground breaking technology in
                desperate need of experience design &mdash; from genetic
                engineering to neuroscience to wearables to biohacking.
              </p>
            </div>
          </div>

          <Divider />

          {/* Author & Contributors */}
          <div className="mt-8">
            <h2 className="font-serif text-2xl font-light mb-6">
              Author &amp; Contributors
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="font-semibold">Jon Follett</p>
                <p className="text-gray">Author</p>
              </div>
              <div>
                <p className="font-semibold">Brian Liston</p>
                <p className="text-gray">Designer &amp; Illustrator</p>
              </div>
              <div>
                <p className="font-semibold">Craig McGinley</p>
                <p className="text-gray">Developer</p>
              </div>
              <div>
                <p className="font-semibold">Emily Twaddell</p>
                <p className="text-gray">Contributing Author</p>
              </div>
            </div>

            <h4 className="font-serif text-base font-light mt-6 mb-2">
              References
            </h4>
            <ul className="text-gray text-sm space-y-1 list-disc pl-5">
              <li>
                DRC. DARPA Robotics Challenge, DARPA.
              </li>
              <li>
                Koren, Marina. &ldquo;3 Robots That Braved Fukushima,&rdquo;
                Popular Mechanics, March 9, 2012
              </li>
              <li>
                McKinsey Global Institute. &ldquo;Disruptive technologies:
                Advances that will transform life, business and the global
                economy&rdquo;
              </li>
              <li>
                UN. &ldquo;World Population Prospects: The 2012 Revision&rdquo;
              </li>
            </ul>
          </div>
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
