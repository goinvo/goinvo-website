import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'
import { DisruptNav } from '../DisruptNav'
import { legacyImage } from '../disrupt-shared'

export const metadata: Metadata = {
  title: 'Disrupt! Part 5: The Future of Design',
  description:
    'Designers have only just begun to think about the implications of emerging technologies for the human condition. We can and should be involved early.',
}

export default function DisruptPart5Page() {
  return (
    <div>
      <SetCaseStudyHero
        image={legacyImage('video_fallbacks/section-5-top.jpg')}
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

          {/* ===== PART 5: THE FUTURE OF DESIGN ===== */}
          <div className="mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Part 5: The Future of Design
            </h2>

            <Image
              src={legacyImage('video_fallbacks/section-5-top.jpg')}
              alt="The Future of Design"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />

            <p className="text-gray leading-relaxed mb-4">
              Designers have only just begun to think about the implications of
              emerging technologies for the human condition. We can and should be
              involved early with these emerging technologies as they develop,
              representing the human side of the equation. And while we
              can&apos;t anticipate all the possible outcomes, thinking about how
              these technologies will act within a larger ecosystem and how they
              might affect people in the short and long term, will be time well
              spent.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              As technologies begin to interact with the world in more
              complicated ways, designers will be making decisions that affect
              the most intimate parts of our lives.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Identify the Problems Correctly
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              The gap between the problems we face as a species and the seemingly
              unlimited potential of technologies ripe for implementation begs
              for considered but agile design thinking and practice. Designers
              should be problem identifiers, not just problem solvers searching
              for a solution to a pre-established set of parameters. We must seek
              to guide our technology, rather than just allow it to guide us.
            </p>

            <Image
              src={legacyImage('section-5-MIT-tech-review.png')}
              alt="MIT Technology Review cover featuring Buzz Aldrin"
              width={600}
              height={400}
              className="w-full max-w-md h-auto my-6"
            />
            <p className="text-sm text-gray mb-6 italic">
              MIT Technology Review, November/December 2012: &ldquo;You Promised
              Me Mars Colonies. Instead I Got Facebook.&rdquo; &mdash;
              We&apos;ve stopped solving big problems.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Chief concerns include environment (carbon reduction, new energy
              sources, global population effects, limited resources), human
              health (longer lifespans), manufacturing, food production, and
              clean water. According to the UN &ldquo;World Population
              Prospects: The 2012 Revision,&rdquo; global population will grow
              from 7.2 billion to 9.6 billion by 2050 &mdash; an additional 2.4
              billion over 35 years.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Learn Constantly
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              The boundaries between product design and engineering for software,
              hardware, and biotech are already blurring. Powerful technologies
              are creating an environment of constant change for creative class
              knowledge workers. Designers will need to understand the
              implications of science and technology for people.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Just as our understanding of and empathy for people allows us to
              successfully design with a user&apos;s viewpoint in mind,
              understanding our materials, whether they be pixels or proteins,
              sensors or servos, enables us to bring a design into the world. The
              ability to quickly learn new materials and techniques has always
              been one of the most important of a designer&apos;s core
              competencies. However, the speed at which this is expected and at
              which technological change occurs is the critical difference today.
            </p>

            <p className="text-gray leading-relaxed mb-4 font-semibold">
              How we learn will soon become as important a consideration as what
              we learn.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Think Systemically
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              Increasingly, designers will also need to be system thinkers. As we
              consider the fields of advanced robotics, synthetic biology, or
              wearable technology, the design of the ecosystem will be just as
              important as the design of the product or service itself.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Work at a Variety of Scales
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              Designers should be able to work at a variety of scales, from the
              overall system view to the nitty-gritty details. Moving between
              these levels will be important, too, as each one informs the
              other &mdash; the macro view informs the micro, and vice versa.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              At the highest level, designers can work proactively with
              politicians and policy makers to effectively regulate new
              technology. From bioethics to industrial regulations governing the
              use of robotics, designers will want and need to have input into
              the realm of policy. Just as free markets cannot exist without
              effective and enforceable contract law, so, too, technological
              advancement cannot exist without sensible, effective, and
              enforceable regulation with a long-term view.
            </p>

            <p className="text-gray leading-relaxed mb-4 font-semibold">
              Designers will need a seat, not just at the computer or the lab
              bench, but at the policy-making table, as well.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Connect People and Technology
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              Design should provide the connective tissue between people and
              technology. The seamless integration of a technology into our lives
              is almost always an act of great design, coupled with smart
              engineering; it&apos;s the &ldquo;why&rdquo; that makes the
              &ldquo;what&rdquo; meaningful. It is through this humane expression
              of technology that the designer ensures a product or service is not
              just a functional experience, but one that is also worthwhile.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              It is the designer&apos;s duty to be a skeptic for the human side
              of the equation. Why are we doing these things? How is humanity
              represented against what&apos;s possible with technology?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
              <Image
                src={legacyImage('section-5-packbot.png')}
                alt="Rethink Robotics' Baxter and Sawyer"
                width={400}
                height={300}
                className="w-full h-auto"
              />
              <Image
                src={legacyImage('section-5-robot-arm.png')}
                alt="Universal Robotics UR collaborative robot"
                width={400}
                height={300}
                className="w-full h-auto"
              />
              <Image
                src={legacyImage('section-5-robot-breakfast.png')}
                alt="Yaskawa Motorman's Dexter Bot"
                width={400}
                height={300}
                className="w-full h-auto"
              />
            </div>
            <p className="text-sm text-gray mb-6 italic">
              Collaborative robotics: Rethink Robotics&apos; Baxter and Sawyer,
              Universal Robotics&apos; UR, and Yaskawa Motorman&apos;s Dexter
              Bot &mdash; designed with human-like characteristics and ease of
              programming for working in tandem with human workers on the factory
              floor.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              As robots take a greater role in manufacturing by automating
              repetitive and dangerous tasks, as well as augmenting human
              abilities, even though there are many benefits, there remains a
              question as to how such robotic optimization can coexist with
              meaningful work for people in the long term. In the collaborative
              robotics model, human labor is augmented by, not replaced with, the
              robotic technologies.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Provoke and Facilitate Change
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              It is not only the designer&apos;s responsibility to smooth
              transitions and find the best way to work things out between people
              and the technology in their lives; it is also the designer&apos;s
              duty to recognize when things are not working, and, rather than
              smooth over problems, to provoke wholesale change. Technological
              change is difficult and disruptive. Designers can start the
              discussion and help lead the process of transformation.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Work on Cross-Disciplinary Teams
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              The challenges inherent in much of emerging technology are far too
              great for an individual to encompass the requisite cross-domain
              knowledge. It is a multidisciplinary mix of scientists, engineers,
              and designers who are best positioned to understand and take
              advantage of these technologies. And it is crucial that these
              creative disciplines evolve together.
            </p>

            <Image
              src={legacyImage('section-5-wyss-institute.png')}
              alt="The Wyss Institute at Harvard"
              width={800}
              height={400}
              className="w-full h-auto my-6"
            />
            <p className="text-sm text-gray mb-6 italic">
              The Wyss Institute at Harvard is at the forefront of the
              &ldquo;bioinspired&rdquo; design field, developing materials and
              devices inspired by nature and biology.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              From such collaborations new roles will be created: perhaps we will
              soon see a great need for the synthetic biological systems engineer
              or the human-robot interaction designer. Forward-thinking design
              firms such as IDEO have also added synthetic biology to their
              established practices of industrial and digital design.
            </p>

            <h3 className="font-serif text-xl font-light mt-8 mb-4">
              Take Risks, Responsibly
            </h3>

            <p className="text-gray leading-relaxed mb-4">
              To find our way forward as designers, we must be willing to take
              risks &mdash; relying upon a combination of our education,
              experience, and intuition &mdash; which can be crucial to
              innovation. We must always keep in mind both the benefits and
              consequences for people using these new technologies, and be
              prepared for mixed results.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              <Image
                src={legacyImage('section-5-the-plant-man.png')}
                alt="Antony Evans, Glowing Plant Kickstarter initiator"
                width={400}
                height={300}
                className="w-full h-auto"
              />
              <Image
                src={legacyImage('section-5-tobacco.png')}
                alt="Glowing tobacco plant created via synthetic biology"
                width={400}
                height={300}
                className="w-full h-auto"
              />
            </div>

            <p className="text-gray leading-relaxed mb-4">
              The Glowing Plant Kickstarter project is a good example of such
              inspired risk taking in action. Seeing the opportunity to both
              inspire and educate the public, a team of biochemists started a
              project to generate a bioluminescent plant, which they touted as
              &ldquo;the first step in creating sustainable natural
              lighting.&rdquo; Financed on Kickstarter, the Glowing Plant
              project generated so much grassroots excitement that it raised
              $484,013 from 8,433 backers, far exceeding its initial goal of
              $65,000.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              However, soon after the Glowing Plant project finished its
              campaign, Kickstarter, without any explanation, changed its terms
              for project creators, banning genetically modified organisms (GMOs)
              as rewards for online backers. Removing this financial option for
              synthetic biology startups, in a seemingly arbitrary decision, will
              have a chilling effect on future innovators.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              It&apos;s safe to say that until synthetic biology is better
              understood, policy decisions such as this ban will continue to
              happen. It might be that a willingness to push forward and to take
              risks will be important to making the transition, to reach public
              acceptance and ultimately help move the technology forward.
            </p>
          </div>

          {/* Next Part Link */}
          <Link href="/vision/disrupt/part-6" className="block group">
            <div className="relative w-full h-48 md:h-64 overflow-hidden">
              <Image
                src={legacyImage('video_fallbacks/section-6-top.jpg')}
                alt="Next: Fukushima and Fragility"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <p className="text-white text-xl md:text-2xl font-serif font-light tracking-[0.15em]">
                  Next: Part 6 &mdash; Fukushima and Fragility &rarr;
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
