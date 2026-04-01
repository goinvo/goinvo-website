'use client'

import { useState } from 'react'
import {
  ColorScrollWrapper,
  DisruptHeroVideo,
  DisruptNavBar,
} from '../DisruptClient'
import { legacyImage } from '../disrupt-shared'

/**
 * Disrupt Part 6: Fukushima and Fragility
 *
 * Directly translated from:
 * - /c/tmp/legacy-features/disrupt/part-6.html (structure)
 * - Legacy disrupt.css (styles)
 * - Legacy disrupt.js (effects -> DisruptClient.tsx)
 *
 * Part 6 is the last part, so it has:
 * - NO bottom hero
 * - NO BottomNav
 * - Contributions section (purple #82659b) as the bottom element
 */
export function Part6Client() {
  const [attributionsOpen, setAttributionsOpen] = useState(false)

  return (
    <ColorScrollWrapper partIndex={5}>
      {/* ===== Fixed Article Navigation ===== */}
      <DisruptNavBar currentPart={6} />

      {/* ===== Top Hero ===== */}
      <header className="sec-header top-vid" id="top">
        <div className="video-container" data-page="6">
          <DisruptHeroVideo partNumber={6} position="top" />
        </div>
        <div className="title-container">
          <h3>Fukushima</h3>
          <h3>and Fragility</h3>
        </div>
      </header>

      {/* ===== Article Content ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-6">
          <div className="section-content">
            <div className="content">
              {/* Opening sub-section */}
              <div className="sub-sec">
                {/* Desktop sidebar images (float right) */}
                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-6-fukushima.png')}
                      alt="Section 6 fukushima"
                    />
                    <div className="caption">
                      Radiation hotspot in Kashiwa, Japan
                    </div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-6-irobot.png')}
                      alt="Section 6 irobot"
                    />
                    <div className="caption">iRobot 710 Warrior</div>
                  </div>
                </div>

                <p>
                  On March 11, 2011, a 9.0 magnitude earthquake and subsequent
                  tsunami damaged the Fukushima Daiichi nuclear reactors in
                  Japan. Over the course of 24 hours, crews tried desperately to
                  fix the reactors. However, as, one by one, the back-up safety
                  measures failed, the fuel rods in the nuclear reactor
                  overheated, releasing dangerous amounts of radiation into the
                  surrounding area. As radiation levels became far too high for
                  humans, emergency teams at the plant were unable to enter key
                  areas to complete the tasks required for recovery. Three
                  hundred thousand people had to be evacuated from their homes,
                  some of whom have yet to return.
                </p>

                {/* Mobile inline image (fukushima) */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-6-fukushima.png')}
                      alt="Section 6 fukushima"
                    />
                    <div className="caption">
                      Radiation hotspot in Kashiwa, Japan
                    </div>
                  </div>
                </div>

                <p>
                  The current state of the art in robotics is not capable of
                  surviving the hostile, high-radiation environment of a nuclear
                  power plant meltdown and dealing with the complex tasks
                  required to assist a recovery effort. In the aftermath of
                  Fukushima, the Japanese government did not immediately have
                  access to hardened, radiation-resistant robots. A few robots
                  from American companies&mdash;tested on the modern battlefields
                  of Afghanistan and Iraq&mdash;including iRobot&apos;s 710
                  Warrior and PackBot were able to survey the plant. The
                  potential for recovery-related tasks that can and should be
                  handled by advanced robotics is far greater than this. However,
                  for many reasons, spanning political, cultural, and systemic,
                  before the Fukushima event, an investment in robotic research
                  was never seriously considered. The meltdown was an unthinkable
                  catastrophe, one that Japanese officials thought could never
                  happen, and as such, it was not even acknowledged as a possible
                  scenario for which planning was needed.
                </p>

                {/* Mobile inline image (irobot) */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-6-irobot.png')}
                      alt="Section 6 irobot"
                    />
                    <div className="caption">iRobot 710 Warrior</div>
                  </div>
                </div>
              </div>

              {/* The DARPA Robotics Competition */}
              <div className="sub-sec">
                <h3>The Darpa Robotics Competition</h3>

                <p>
                  The Fukushima catastrophe inspired the United States Defense
                  Advanced Research Projects Agency (DARPA) to create the{' '}
                  <a
                    href="http://www.theroboticschallenge.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Robotics Challenge
                  </a>
                  , the purpose of which is to accelerate technological
                  development for robotics in the area of disaster recovery.
                  Acknowledging the fragility of our human systems and finding
                  resilient solutions to catastrophes&mdash;whether it&apos;s the
                  next super storm, earthquake, or nuclear meltdown&mdash;is a
                  problem on which designers, engineers, and technologists should
                  focus.
                </p>

                <p>
                  In the DARPA competition mission statement, we can see the
                  framing of the challenge in human terms.
                </p>

                <p className="quote">
                  History has repeatedly demonstrated that humans are vulnerable
                  to natural and man-made disasters, and there are often
                  limitations to what we can do to help remedy these situations
                  when they occur. Robots have the potential to be useful
                  assistants in situations in which humans cannot safely operate,
                  but despite the imaginings of science fiction, the actual robots
                  of today are not yet robust enough to function in many disaster
                  zones nor capable enough to perform the most basic tasks
                  required to help mitigate a crisis situation. The goal of the
                  DRC is to generate groundbreaking research and development in
                  hardware and software that will enable future robots, in tandem
                  with human counterparts, to perform the most hazardous
                  activities in disaster zones, thus reducing casualties and
                  saving lives.
                </p>

                {/* Desktop sidebar image (mit-robots) */}
                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-6-mit-robots.png')}
                      alt="Section 6 mit robots"
                    />
                    <div className="caption">
                      Boston Dynamics Atlas, an agile anthropomorphic robot
                    </div>
                  </div>
                </div>

                <p>
                  The competition, so far, has been successful in its mission to
                  encourage innovation in advanced robotics. In the competition
                  trials held in December 2013, robots from MIT, Carnegie Mellon,
                  and the Google-owned Japanese firm, Schaft, Inc., competed at a
                  variety of tasks related to disaster recovery, which included
                  driving cars, traversing difficult terrain, climbing ladders,
                  opening doors, moving debris, cutting holes in walls, closing
                  valves, and unreeling hoses.
                </p>

                {/* Mobile inline image (mit-robots) */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-6-mit-robots.png')}
                      alt="Section 6 mit robots"
                    />
                    <div className="caption">
                      Boston Dynamics Atlas, an agile anthropomorphic robot
                    </div>
                  </div>
                </div>
              </div>

              {/* Changing Design and Designing Change */}
              <div className="sub-sec">
                <h3>Changing Design and Designing Change</h3>

                <p>
                  People are less interested in the science and engineering, the
                  mechanisms that make emerging technologies such as advanced
                  robotics, synthetic biology, and the IoT possible, but they are
                  deeply concerned with the outcomes. As these technologies
                  emerge, grow, and mature over the coming years, designers will
                  have the opportunity to bridge human needs and the miraculous
                  technological possibilities.
                </p>

                <p>
                  It will be a great and even intimidating challenge to involve
                  design early in the process of defining new products and
                  services, but it will be critical as we establish the practices
                  of the twenty-first century&mdash;from the design of technology
                  policy, to systems, to tactical interaction frameworks and
                  techniques. Policy design will involve advising regulators and
                  politicians on the possibilities and perils of emerging tech;
                  system design will demand clear understanding of the broader
                  interactions and implications that surround the immediate
                  details of a product; and framework design will benefit our
                  day-to-day tactical work, providing a foundation for designers
                  and design practice to come. What all of these technologies
                  will create, as they evolve together, remains to be seen. But,
                  the most interesting discoveries will be at the intersections.
                </p>

                <p>
                  Understanding new technologies, their potential usage, and how
                  they will impact people in the short and long term will require
                  education and collaboration, resulting in new design
                  specializations, many of which we have not yet even considered.
                  In the coming years, as the boundaries between design and
                  engineering for software, hardware, and biotechnology continue
                  to blur, those who began their professional lives as industrial
                  designers, computer engineers, UX practitioners, and scientists
                  will find that the trajectory of their careers takes them into
                  uncharted territory. Like the farmers who moved to the cities
                  to participate in the birth of the Industrial Revolution, we
                  can&apos;t imagine all of the outcomes of our work. However, if
                  history is any indicator, the convergence of these technologies
                  will be greater than the sum of its parts. If we are prepared
                  to take on such challenges, we only have to ask: &ldquo;What
                  stands in the way?&rdquo;
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Bottom Hero ===== */}
      <header className="sec-header bottom-vid">
        <div className="video-container" data-page="6">
          <DisruptHeroVideo partNumber={6} position="bottom" />
        </div>
      </header>

      {/* ===== Closer Section (Book + References) ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="closer">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec book">
                <h3>Designing for Emerging Technologies</h3>
                <p>
                  If you&apos;re interested in further exploration of this topic,
                  check out{' '}
                  <a
                    href="http://www.amazon.com/Designing-Emerging-Technologies-Genomics-Robotics/dp/1449370519"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    &ldquo;Designing for Emerging Technologies&rdquo;
                  </a>{' '}
                  published by O&apos;Reilly Media, from which portions of this
                  article were excerpted. In this book, you will discover 20
                  essays, from designers, engineers, scientists and thinkers,
                  exploring areas of fast-moving, ground breaking technology in
                  desperate need of experience design &mdash; from genetic
                  engineering to neuroscience to wearables to biohacking &mdash;
                  and discussing frameworks and techniques they&apos;ve used in
                  the burgeoning practice area of UX for emerging technologies.
                </p>
              </div>

              <div className="sub-sec">
                <h3>References</h3>
                <ul className="refs">
                  <li>
                    DRC.{' '}
                    <a
                      href="http://www.theroboticschallenge.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DARPA Robotics Challenge
                    </a>
                    , DARPA.
                  </li>
                  <li>
                    Felton, Nick.{' '}
                    <a
                      href="http://www.nytimes.com/imagepages/2008/02/10/opinion/10op.graphic.ready.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Consumption Spreads Faster Today
                    </a>
                    , The New York Times
                  </li>
                  <li>
                    Geere, Duncan.{' '}
                    <a
                      href="http://www.theverge.com/2013/8/2/4583562/kickstarter-bans-project-creators-from-giving-GMO-rewards"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Kickstarter bans project creators from giving away
                      genetically-modified organisms
                    </a>
                    , The Verge, August 2, 2013
                  </li>
                  <li>
                    Koren, Marina.{' '}
                    <a
                      href="http://www.popularmechanics.com/technology/robots/g795/3-robots-that-braved-fukushima-7223185/?slide=1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      3 Robots That Braved Fukushima
                    </a>
                    , Popular Mechanics, March 9th, 2012
                  </li>
                  <li>
                    Manyika, James, Michael Chui, Jacques Bughin, Richard Dobbs,
                    Peter Bisson, and Alex Marrs.{' '}
                    <a
                      href="http://www.mckinsey.com/insights/business_technology/disruptive_technologies"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Disruptive technologies: Advances that will transform life,
                      business, and the global economy
                    </a>
                    , McKinsey Global Institute Report, May 2013
                  </li>
                  <li>
                    News From Elsewhere.{' '}
                    <a
                      href="http://www.bbc.com/news/blogs-news-from-elsewhere-27156775"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      China: Firm 3D prints 10 full-sized houses in a day
                    </a>
                    , BBC News, April 25, 2014
                  </li>
                  <li>
                    Pallister, Jasmes.{' '}
                    <a
                      href="http://www.dezeen.com/2014/03/24/movie-sxsw-daan-roosegarde-glow-in-dark-trees/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Glowing trees could be used &apos;instead of street
                      lighting&apos; says Daan Roosegaarde
                    </a>
                    , Dezeen, March 24, 2014
                  </li>
                  <li>
                    Pontin, Jaso.{' '}
                    <a
                      href="http://www.technologyreview.com/featuredstory/429690/why-we-cant-solve-big-problems/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Why We Can&apos;t Solve Big Problems
                    </a>
                    , MIT Technology Review, October 24, 2012
                  </li>
                  <li>
                    United Nations Department of Economic and Social Affairs,
                    Population Division (2013).{' '}
                    <a
                      href="http://esa.un.org/wpp/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      World Population Prospects: The 2012 Revision
                    </a>
                    , 2012
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Contributions Section (purple background) ===== */}
      <div className="contributions" id="bottom">
        <div className="cont-wrapper">
          <ul className="main-credits">
            {/* Jon Follett - Author */}
            <li className="main author">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={legacyImage('credits/jon-follett.png')}
                alt="Jon Follett"
              />
              <div className="title-container">
                <div className="person">Jon Follett</div>
                <div className="title">Author</div>
              </div>
            </li>

            {/* Brian Liston - Designer and Illustrator */}
            <li className="main designer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={legacyImage('credits/brian-liston.png')}
                alt="Brian Liston"
              />
              <div className="title-container">
                <div className="person">Brian Liston</div>
                <div className="title">Designer and Illustrator</div>
              </div>
            </li>

            {/* Craig McGinley - Developer */}
            <li className="main developer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={legacyImage('credits/craig-mcginley.png')}
                alt="Craig McGinley"
              />
              <div className="title-container">
                <div className="person">Craig McGinley</div>
                <div className="title">Developer</div>
              </div>
            </li>

            {/* Emily Twaddell - Contributing Author */}
            <li className="main editor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={legacyImage('credits/emily-twaddell.png')}
                alt="Emily Twaddell"
              />
              <div className="title-container">
                <div className="person">Emily Twaddell</div>
                <div className="title">Contributing Author</div>
              </div>
            </li>

            {/* Attributions toggle */}
            <li className="main special">
              <div
                id="thanks"
                className={attributionsOpen ? 'open' : ''}
                onClick={() => setAttributionsOpen(!attributionsOpen)}
              >
                Attributions{' '}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={legacyImage('credits-util.png')}
                  alt="Toggle attributions"
                />
              </div>
              <ul
                className={`extra-credits${attributionsOpen ? ' open' : ''}`}
              >
                <li>
                  <div className="credit">Robin Zebrowski</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/firepile/438125743/in/set-72157600033515390" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Peter Weemeeuw</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/weemeeuw/2789442655/" target="_blank" rel="noopener noreferrer">FLickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Ashley Van Haeften</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/wikimediacommons/16372820048/" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Creative Tools</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/creative_tools/8121256525/" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">anyjazz65</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/49024304@N00/2834109194" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Fjioera Lynn</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=Xm4huNBW0Ho" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">MakerBot</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=WT3772yhr0o" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">ingen ost</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=G0_oqCDOFOUjjaandj" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">fccysf</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=aAWyRlX3tcQ" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Marines</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=IIbtwn8jwwc" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">rwg42985</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=J1MfcS1PLWE" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">TWiT Netcast Network</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=9y5X06fFCs4" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Nova Carlisle</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=4ee0fX7jl0o" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Travel Magazine</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=kbeEGGFS1Qs" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Samuel Pine</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=hnC7FeUdLXw" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Electronica de Invierno</div>
                  <div className="link">
                    <a href="https://www.youtube.com/watch?v=UULS4CB_j3A" target="_blank" rel="noopener noreferrer">YouTube</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Lockheed Martin</div>
                  <div className="link">
                    <a href="http://www.lockheedmartin.com/us/news/features/2014/mfc-103114-relief-daily-grind-industrial-exoskeletons-work.html" target="_blank" rel="noopener noreferrer">lockheedmartin.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">e.chromi</div>
                  <div className="link">
                    <a href="http://www.echromi.com/" target="_blank" rel="noopener noreferrer">echromi.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">U.S. Department of Agriculture</div>
                  <div className="link">
                    <a href="http://commons.wikimedia.org/wiki/File:1926us.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Karl Jilg</div>
                  <div className="link">
                    <a href="http://www.vox.com/xpress/2014/11/18/7236471/cars-pedestrians-roads" target="_blank" rel="noopener noreferrer">Swedish Road Administration</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Udo J. Keppler</div>
                  <div className="link">
                    <a href="http://commons.wikimedia.org/wiki/File:Standard_oil_octopus_loc_color.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Pensa</div>
                  <div className="link">
                    <a href="http://blog.pensanyc.com/post/22358402448/light-reeds-is-pensas-concept-for-an-urban" target="_blank" rel="noopener noreferrer">pensanyc.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Studio Roosegarde</div>
                  <div className="link">
                    <a href="https://www.studioroosegaarde.net/" target="_blank" rel="noopener noreferrer">studioroosegarde.net</a>
                  </div>
                </li>
                <li>
                  <div className="credit">MIT Technology Review</div>
                  <div className="link">
                    <a href="http://www.technologyreview.com/magazine/2012/11/" target="_blank" rel="noopener noreferrer">technologyreview.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Rethink Robotics</div>
                  <div className="link">
                    <a href="http://www.rethinkrobotics.com/press/" target="_blank" rel="noopener noreferrer">rethinkrobotics.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Universal Robotics</div>
                  <div className="link">
                    <a href="http://www.universal-robots.com/en/media/downloads/" target="_blank" rel="noopener noreferrer">universal-robots.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Yaskawa Motoman</div>
                  <div className="link">
                    <a href="http://todaysmachiningworld.com/industry_news/motoman-robotics-begins-new-headquarters-construction/" target="_blank" rel="noopener noreferrer">Motoman Robotics</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Glowing Plant Project</div>
                  <div className="link">
                    <a href="http://www.glowingplant.com/" target="_blank" rel="noopener noreferrer">glowingplant.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Wikiwand</div>
                  <div className="link">
                    <a href="http://www.wikiwand.com/en/Radiation_effects_from_the_Fukushima_Daiichi_nuclear_disaster" target="_blank" rel="noopener noreferrer">wikiwand.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">iRobot</div>
                  <div className="link">
                    <a href="http://media.irobot.com/" target="_blank" rel="noopener noreferrer">irobot.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Boston Dynamics</div>
                  <div className="link">
                    <a href="http://drc.mit.edu/challenge/" target="_blank" rel="noopener noreferrer">mit.edu</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Jean Nicholas Buache</div>
                  <div className="link">
                    <a href="http://commons.wikimedia.org/wiki/File:1807_Buache_Map_of_Boston,_Massachusetts_-_Geographicus_-_Boston-buache-1807.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">brewbooks</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/brewbooks/3318600273" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Spotify</div>
                  <div className="link">
                    <a href="http://spotify-wewerethere.com/" target="_blank" rel="noopener noreferrer">spotify-wewerethere.com</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Jer Thorp</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/blprnt/3694704325" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Live Bitcoin News</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/127069763@N07/16673431158" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Kyle Pearce</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/keepitsurreal/6107889555" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Adelphi Lab Center</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/adelphilabcenter/5999582062" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Ryan Somma</div>
                  <div className="link">
                    <a href="http://en.wikipedia.org/wiki/File:Awesome_Green_Roof.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Cities Unlocked</div>
                  <div className="link">
                    <a href="http://www.cityofsound.com/blog/2014/11/cities-unlocked.html" target="_blank" rel="noopener noreferrer">City of Sound</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Global Panorama</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/121483302@N02/14696937320" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Nan Palmero</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/nanpalmero/13013107993" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Ricardipus</div>
                  <div className="link">
                    <a href="http://en.wikipedia.org/wiki/File:Affymetrix_5.0_microarray.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Textile Interactions Lab</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/78336251@N03/6941062654/" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">HIA~commonswiki</div>
                  <div className="link">
                    <a href="http://en.wikipedia.org/wiki/File:Herzklappe.JPG" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">7asmin</div>
                  <div className="link">
                    <a href="http://de.wikipedia.org/wiki/Datei:R%C3%B6ntgenbild_nach_Kunstherzimplantation.JPG" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">National Cancer Institute</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/ncimedia/8009859593" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">David Shankbone</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/shankbone/10662254555" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Machinehien</div>
                  <div className="link">
                    <a href="http://commons.wikimedia.org/wiki/File:Foglet_stimulacra.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Intel Free Press</div>
                  <div className="link">
                    <a href="https://www.flickr.com/photos/intelfreepress/11458183003" target="_blank" rel="noopener noreferrer">Flickr</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Michael Kleiman</div>
                  <div className="link">
                    <a href="http://en.wikipedia.org/wiki/File:HAARP20l.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
                <li>
                  <div className="credit">Light Warrior</div>
                  <div className="link">
                    <a href="http://en.wikipedia.org/wiki/File:Microchip_rfid_rice.jpg" target="_blank" rel="noopener noreferrer">Wikimedia</a>
                  </div>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </ColorScrollWrapper>
  )
}
