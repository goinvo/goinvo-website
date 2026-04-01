'use client'

import {
  ColorScrollWrapper,
  DisruptHeroVideo,
  DisruptNavBar,
  BottomNav,
} from '../DisruptClient'
import { legacyImage } from '../disrupt-shared'

/**
 * Disrupt Part 5: The Future of Design
 *
 * Directly translated from:
 * - /c/tmp/legacy-features/disrupt/part-5.html (structure)
 * - Legacy disrupt.css (styles via ../disrupt.css)
 * - Legacy disrupt.js (effects via DisruptClient.tsx)
 *
 * Layout: nav → top hero with title overlay → intro → sci-fi full-bleed image →
 *         8 sub-sections with sidebar images → bottom hero → next-part link
 */
export function Part5Client() {
  return (
    <ColorScrollWrapper partIndex={4}>
      {/* ===== Fixed Article Navigation ===== */}
      <DisruptNavBar currentPart={5} />

      {/* ===== Top Hero with Title Overlay ===== */}
      <header className="sec-header top-vid" id="top">
        <div className="video-container" data-page="5">
          <DisruptHeroVideo partNumber={5} position="top" />
        </div>
        <div className="title-container">
          <h3>The Future</h3>
          <h3>of Design</h3>
        </div>
      </header>

      {/* ===== Intro Section ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-5">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <p>
                  Designers have only just begun to think about the implications of
                  emerging technologies for the human condition. We can and should
                  be involved early with these emerging technologies as they
                  develop, representing the human side of the equation. And while
                  we can&apos;t anticipate all the possible outcomes, thinking
                  about how these technologies will act within a larger ecosystem
                  and how they might effect people in the short and long term, will
                  be time well spent.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Sci-fi Full-bleed Image with Caption ===== */}
      <div className="sci-fi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          sizes="100vw"
          srcSet={`${legacyImage('insane-800.jpg')} 800w, ${legacyImage('insane-1280.jpg')} 1280w, ${legacyImage('insane-2880.jpg')} 2880w`}
          alt="Science fiction concept art"
        />
        <article className="disrupt">
          <div className="caption">
            As technologies begin to interact with the world in more complicated
            ways, designers will be making decisions that affect the most intimate
            parts of our lives.
          </div>
        </article>
      </div>

      {/* ===== Main Article Content ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-5">
          <div className="section-content">
            <div className="content">
              {/* --- 1. Identify the Problems Correctly --- */}
              <div className="sub-sec">
                <h3>Identify the Problems Correctly</h3>
                <p>
                  The gap between the problems we face as a species and the
                  seemingly unlimited potential of technologies ripe for
                  implementation begs for considered but agile design thinking and
                  practice. Designers should be problem identifiers, not just
                  problem solvers searching for a solution to a pre-established set
                  of parameters. We must seek to guide our technology, rather than
                  just allow it to guide us.
                </p>

                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-MIT-tech-review.png')}
                      alt="Section 5 MIT tech review"
                    />
                    <div className="caption">
                      MIT Technology Review November/December 2012
                    </div>
                  </div>
                </div>

                <p>
                  On the cover of the November/December 2012 issue of MIT
                  Technology Review, the shortcomings of the past decade&apos;s
                  technological achievements are expressed in the damning headline
                  dramatically superimposed in white type over the bemused portrait
                  of astronaut Buzz Aldrin: &ldquo;You Promised Me Mars Colonies.
                  Instead I Got Facebook.&rdquo; The subhead elaborates
                  tellingly:&ldquo;We&apos;ve stopped solving big problems. Meet
                  the technologists who refuse to give up.&rdquo; The accompanying
                  article &ldquo;Why We Can&apos;t Solve Big Problems&rdquo;
                  details some of the current limitations in American culture,
                  finance, and politics that, since the Apollo moonshot, have
                  relegated big thinking and technical aspirations to the
                  sidelines.
                </p>

                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-MIT-tech-review.png')}
                      alt="Section 5 MIT tech review"
                    />
                    <div className="caption">
                      MIT Technology Review November/December 2012
                    </div>
                  </div>
                </div>

                <p>
                  We are on the cusp of a new technological age, saddled with the
                  problems of the previous one, demanding that as we step forward
                  we do not make the same mistakes. To do this, we must identify
                  the right challenges to take on: the significant and valuable
                  ones. Chief among our concerns must be the environment, not only
                  in reducing the carbon we release as a result of consumption and
                  seeking new sources of energy, but also in understanding the
                  effects of a growing global population, against the backdrop of
                  limited resources. We must also improve human health and consider
                  the ramifications as humans live longer lives. And, we must find
                  new ways to manufacture goods and produce food and clean water
                  for a planet currently with 7.2 billion inhabitants&mdash;a
                  population that is projected to explode in the next 35 years by
                  an additional 2.4 billion, reaching 9.6 billion by 2050,
                  according to the UN report,&ldquo;World Population Prospects:
                  The 2012 Revision.&rdquo; Recognizing these major challenges for
                  humanity in the twenty-first century and seeking proactive
                  solutions, even in significant areas such as the environment,
                  energy, health, manufacturing, agriculture, and water usage, will
                  not be an obvious or easy task.
                </p>
              </div>

              {/* --- 2. Learn Constantly --- */}
              <div className="sub-sec">
                <h3>Learn Constantly</h3>
                <p>
                  The boundaries between product design and engineering for
                  software, hardware, and biotech are already blurring. Powerful
                  technologies are creating an environment of constant change for
                  the creative class knowledge workers. In the coming years, those
                  who began their professional lives as industrial designers,
                  computer engineers, user experience practitioners, scientists,
                  and system thinkers, will find that the trajectory of their
                  careers takes them into uncharted territory as the
                  cross-pollination and evolution of these fields in parallel
                  creates new possibilities for influencing humanity&apos;s
                  progress.
                </p>
                <p>
                  Designers will need to understand the implications of science and
                  technology for people. To do this effectively, we must be able to
                  immerse ourselves in new technical domains and learn them quickly.
                  Just as our understanding of and empathy for people allows us to
                  successfully design with a user&apos;s viewpoint in mind,
                  understanding our materials, whether they be pixels or proteins,
                  sensors or servos, enables us to bring a design into the world.
                  To achieve this, designers need to be early adopters of
                  technology, learning constantly.
                </p>
                <p>
                  The ability to quickly learn new materials and techniques has
                  always been one of the most important of a designer&apos;s core
                  competencies. However, the speed at which this is expected and at
                  which technological change occurs is the critical difference
                  today. How we learn will soon become as important a consideration
                  as what we learn. To prepare designers for the new roles that
                  emerging technology will bring, schools will need to develop
                  curricula that emphasize continuous learning as a core competency
                  and provide tools and methods to enable it.
                </p>
              </div>

              {/* --- 3. Think Systemically --- */}
              <div className="sub-sec">
                <h3>Think Systemically</h3>
                <p>
                  Increasingly, designers will also need to be system thinkers. As
                  we consider the fields of advanced robotics, synthetic biology, or
                  wearable technology, the design of the ecosystem will be just as
                  important as the design of the product or service itself.
                </p>
              </div>

              {/* --- 4. Work at a Variety of Scales --- */}
              <div className="sub-sec">
                <h3>Work at a Variety of Scales</h3>
                <p>
                  Designers should be able work at a variety of scales, from the
                  aforementioned overall system view, to the nitty-gritty details.
                  Moving between these levels will be important, too, as each one
                  informs the other&mdash;the macro view informs the micro, and
                  vice versa.
                </p>
                <p>
                  At the highest level, designers can work proactively with
                  politicians and policy makers to effectively regulate new
                  technology. As one example of this, in September 2013, the FDA
                  released final guidance on mobile medical apps, which was crafted
                  with input from industry experts. From bioethics to industrial
                  regulations governing the use of robotics, designers will want
                  and need to have input into the realm of policy. Just as free
                  markets cannot exist without effective and enforceable contract
                  law, so, too, technological advancement cannot exist without
                  sensible, effective, and enforceable regulation with a long-term
                  view. Designers will need a seat, not just at the computer or the
                  lab bench, but at the policy-making table, as well.
                </p>
              </div>

              {/* --- 5. Connect People and Technology --- */}
              <div className="sub-sec">
                <h3>Connect People and Technology</h3>
                <p>
                  Design should provide the connective tissue between people and
                  technology. The seamless integration of a technology into our
                  lives is almost always an act of great design, coupled with smart
                  engineering; it&apos;s the &ldquo;why&rdquo; that makes the
                  &ldquo;what&rdquo; meaningful. It is through this humane
                  expression of technology that the designer ensures a product or
                  service is not just a functional experience, but one that is also
                  worthwhile. We must consider the outputs of these
                  technologies&mdash;what people need and want. The designer should
                  ask:&ldquo;Why are we doing these things? How is humanity
                  represented against what&apos;s possible with technology?&rdquo;
                  It is the designer&apos;s duty to be a skeptic for the human side
                  of the equation.
                </p>

                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-packbot.png')}
                      alt="Section 5 packbot"
                    />
                    <div className="caption">
                      Rethink Robotics&apos; Baxter and Sawyer
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-robot-arm.png')}
                      alt="Section 5 robot arm"
                    />
                    <div className="caption">
                      Universal Robotics&apos; UR
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-robot-breakfast.png')}
                      alt="Section 5 robot breakfast"
                    />
                    <div className="caption">
                      Yaskawa Motorman&apos;s Dexter Bot
                    </div>
                  </div>
                </div>

                <p>
                  For instance, as robots take a greater role in the fields such as
                  manufacturing by automating repetitive and dangerous tasks, as
                  well as augmenting human abilities, we can see that even though
                  there are many benefits, there remains a question as to how such
                  robotic optimization can coexist with meaningful work for people
                  in the long term. At first glance, the combination of
                  collaborative robotics and agile manufacturing seems to be one
                  potential answer to this problem. Rethink Robotics&apos; Baxter,
                  Yaskawa Motoman&apos;s Dexter Bot, and Universal Robotics&apos;
                  UR are examples of collaborative robots designed with human-like
                  characteristics, flexibility regarding the tasks they can execute,
                  and ease of programming, opening up new possibilities for working
                  in tandem with human workers on the factory floor. In this model,
                  human labor is augmented by, not replaced with, the robotic
                  technologies.
                </p>

                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-packbot.png')}
                      alt="Section 5 packbot"
                    />
                    <div className="caption">
                      Rethink Robotics&apos; Baxter and Sawyer
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-robot-arm.png')}
                      alt="Section 5 robot arm"
                    />
                    <div className="caption">
                      Universal Robotics&apos; UR
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-robot-breakfast.png')}
                      alt="Section 5 robot breakfast"
                    />
                    <div className="caption">
                      Yaskawa Motorman&apos;s Dexter Bot
                    </div>
                  </div>
                </div>

                <p>
                  Advanced collaborative robotics could readily provide the
                  flexible systems required to meet the demands of agile
                  manufacturing. A key advantage to robotic manufacturing is its
                  adaptability: robotic production lines can be easily modified to
                  accommodate shorter-run, customized products. We could soon see
                  robots replace expensive dedicated industrial machinery made for
                  specific production processes, which can be extremely difficult
                  to repurpose when changes to a process are required. As a part of
                  this agile manufacturing paradigm, robots with the ability to
                  work in collaboration with human beings&mdash;in factories,
                  warehouses, and other industrial settings&mdash;will be a
                  critical component. Human workers will be responsible for
                  programming, monitoring, supervising, and otherwise interacting
                  with a robotic workforce that is repurposed regularly to handle
                  the creation of custom, short-run production.
                </p>
              </div>

              {/* --- 6. Provoke and Facilitate Change --- */}
              <div className="sub-sec">
                <h3>Provoke and Facilitate Change</h3>
                <p>
                  It is not only the designer&apos;s responsibility to smooth
                  transitions and find the best way to work things out between
                  people and the technology in their lives; it is also the
                  designer&apos;s duty to recognize when things are not working,
                  and, rather than smooth over problems, to provoke wholesale
                  change. Technological change is difficult and disruptive. Even
                  today, there are countless examples of technologies outpacing the
                  frameworks for controlling them, resulting in a sense of unease
                  in people about the seemingly unprecedented and unchecked
                  advances, from digital surveillance encroaching on our privacy to
                  genetically modified foods filling our grocery stores. Designers
                  can start the discussion and help lead the process of
                  transformation.
                </p>
              </div>

              {/* --- 7. Work Effectively on Cross-Disciplinary Teams --- */}
              <div className="sub-sec">
                <h3>Work Effectively on Cross-Disciplinary Teams</h3>
                <p>
                  The challenges inherent in much of emerging technology are far
                  too great for an individual to encompass the requisite
                  cross-domain knowledge. For this kind of work, then, the team
                  becomes paramount. It is a multidisciplinary mix of scientists,
                  engineers, and designers who are best positioned to understand
                  and take advantage of these technologies. And, it is crucial that
                  these creative disciplines evolve together.
                </p>

                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-wyss-institute.png')}
                      alt="Section 5 wyss institute"
                    />
                    <div className="caption">
                      The Wyss Institute is at the forefront of the
                      &ldquo;bioinspired&rdquo; design field
                    </div>
                  </div>
                </div>

                <p>
                  From such collaborations new roles will be created: perhaps we
                  will soon see a great need for the synthetic biological systems
                  engineer or the human-robot interaction designer. This
                  cross-pollination of science, design, and engineering is already
                  happening at organizations such as the Wyss Institute at Harvard,
                  whose mission is to develop materials and devices inspired by
                  nature and biology. Wyss structures itself around
                  multidisciplinary teams. Forward-thinking design firms such as
                  IDEO have also added synthetic biology to their established
                  practices of industrial and digital design.
                </p>

                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-wyss-institute.png')}
                      alt="Section 5 wyss institute"
                    />
                    <div className="caption">
                      The Wyss Institute is at the forefront of the
                      &ldquo;bioinspired&rdquo; design field
                    </div>
                  </div>
                </div>
              </div>

              {/* --- 8. Take Risks, Responsibly --- */}
              <div className="sub-sec">
                <h3>Take Risks, Responsibly</h3>
                <p>
                  To find our way forward as designers, we must be willing to take
                  risks&mdash;relying upon a combination of our education,
                  experience, and intuition&mdash;which can be crucial to
                  innovation. We must always keep in mind both the benefits and
                  consequences for people using these new technologies, and be
                  prepared for mixed results.
                </p>

                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-the-plant-man.png')}
                      alt="Section 5 the plant man"
                    />
                    <div className="caption">
                      Antony Evans started the Glowing Plant Kickstarter.
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-tobacco.png')}
                      alt="Section 5 tobacco"
                    />
                    <div className="caption">Glowing tobacco plant.</div>
                  </div>
                </div>

                <p>
                  The Glowing Plant Kickstarter project is a good example of such
                  inspired risk taking in action. There is perhaps no technology
                  more fraught with perceived peril than genomics and synthetic
                  biology. Seeing the opportunity to both inspire and educate the
                  public, a team of biochemists started a project to generate a
                  bioluminescent plant, which they touted as &ldquo;the first step
                  in creating sustainable natural lighting.&rdquo; Financed on the
                  crowd-funding website Kickstarter, the Glowing Plant project
                  generated so much grassroots excitement that it raised $484,013
                  from 8,433 backers, far exceeding its initial goal of $65,000.
                </p>

                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-the-plant-man.png')}
                      alt="Section 5 the plant man"
                    />
                    <div className="caption">
                      Antony Evans started the Glowing Plant Kickstarter.
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-5-tobacco.png')}
                      alt="Section 5 tobacco"
                    />
                    <div className="caption">Glowing tobacco plant.</div>
                  </div>
                </div>

                <p>
                  However, soon after the Glowing Plant project finished its
                  campaign, Kickstarter, without any explanation, changed its terms
                  for project creators, banning genetically modified organisms
                  (GMOs) as rewards for online backers. Glowing Plant, with its
                  project financing already in place, might be the last example of
                  crowd-funded synthetic biology for a while. Although this
                  incident, in and of itself, might seem minor, it&apos;s worth
                  remembering that Kickstarter is the primary resource for
                  crowd-funding in the United States. Removing this financial
                  option for synthetic biology startups, in a seemingly arbitrary
                  decision, will have a chilling effect on future innovators.
                </p>

                <p>
                  The results of the Glowing Plant crowd-funding project illustrate
                  the promise and perils of designing for such a disruptive
                  technology as synthetic biology. How do we evaluate the risk and
                  reward, in this case, knowing the outcome? Even though the team
                  initially received immense grassroots enthusiasm and financial
                  backing, they also caused the Kickstarter ban, as an established
                  corporate entity reacted with fear. During this transition time
                  between fear and acceptance, designers of genetically modified
                  organisms, like the team behind the Glowing Plant project, will
                  continue to push the envelope of what companies, regulators, and
                  the government find acceptable. It&apos;s safe to say that until
                  synthetic biology is better understood, policy decisions such as
                  this ban will continue to happen. It might be that a willingness
                  to push forward and to take risks will be important to making the
                  transition, to reach public acceptance and ultimately help move
                  the technology forward.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Bottom Hero ===== */}
      <header className="sec-header bottom-vid" id="bottom">
        <div className="video-container" data-page="5">
          <DisruptHeroVideo partNumber={5} position="bottom" />
        </div>
      </header>

      {/* ===== Next Part Navigation ===== */}
      <BottomNav
        nextHref="/vision/disrupt/part-6"
        nextTitle="fukushima and fragility"
        color="#0396AA"
      />
    </ColorScrollWrapper>
  )
}
