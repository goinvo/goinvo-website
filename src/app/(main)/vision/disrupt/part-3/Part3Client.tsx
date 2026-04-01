'use client'

import {
  ColorScrollWrapper,
  DisruptHeroVideo,
  HeroSection,
  DisruptNavBar,
  BottomNav,
} from '../DisruptClient'
import { legacyImage } from '../disrupt-shared'

/**
 * Disrupt Part 3: The Coming Disruption
 *
 * Directly translated from:
 * - /c/tmp/legacy-features/disrupt/part-3.html (structure)
 * - Legacy disrupt.css (styles, scoped under #disrupt-legacy)
 *
 * Layout: nav -> top hero with title -> intro paragraph -> sci-fi image ->
 *         Living/Eating/Working sub-sections -> bottom hero -> next-part nav
 */
export function Part3Client() {
  return (
    <ColorScrollWrapper partIndex={2}>
      {/* ===== Fixed Article Navigation ===== */}
      <DisruptNavBar currentPart={3} />

      {/* ===== Top Hero with Title ===== */}
      <header className="sec-header top-vid" id="top">
        <div className="video-container" data-page="3">
          <DisruptHeroVideo partNumber={3} position="top" />
        </div>
        <div className="title-container">
          <h3>The Coming</h3>
          <h3>Disruption</h3>
        </div>
      </header>

      {/* ===== Intro Article Section ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-3">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <p>
                  What is the nature and magnitude of the disruption before us?
                  Like the owner of the horse and buggy at the turn of the 20th
                  century, we can not fully appreciate or completely anticipate
                  the entirety of the coming technological change that will
                  embrace nearly every aspect of our everyday lives. We can,
                  however, begin to understand the magnitude of that disruption
                  in areas as varied as the places we live, the food we eat, and
                  the work we do by emerging technologies like the Internet of
                  Things, robotics, genomics and synthetic biology.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Sci-Fi Caption Image ===== */}
      <div className="sci-fi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          sizes="100vw"
          srcSet={`${legacyImage('freaky-800.jpg')} 800w, ${legacyImage('freaky-1280.jpg')} 1280w, ${legacyImage('freaky-2880.jpg')} 2880w`}
          alt="Sci-fi criticism of emerging technologies"
        />
        <article className="disrupt">
          <div className="caption">
            While criticism of the uses to which emerging technologies are put
            is necessary, many critics make the mistake of rejecting
            technological innovations entirely.
          </div>
        </article>
      </div>

      {/* ===== Main Content: Living, Eating, Working ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-3">
          <div className="section-content">
            <div className="content">
              {/* --- Living --- */}
              <div className="sub-sec">
                <h3>Living</h3>

                {/* Sidebar images — float right on desktop */}
                <div className="images sidebar right">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-light-reeds.png')}
                      alt="Section 3 light reeds"
                    />
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-light-reeds-2.png')}
                      alt="Section 3 light reeds 2"
                    />
                    <div className="caption">Light Reeds by Pensa</div>
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-bioluminescent-trees-1.png')}
                      alt="Section 3 bioluminescent trees 1"
                    />
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-bioluminescent-trees-2.png')}
                      alt="Section 3 bioluminescent trees 2"
                    />
                    <div className="caption">
                      Bioluminescent Trees by Studio Roosegaarde
                    </div>
                  </div>
                </div>

                <p>
                  The places in which we live, work, and play, will be created,
                  connected, and controlled in new ways &mdash; from the
                  architecture of buildings to the composition of public and
                  private spaces, to the infrastructure that binds it all
                  together. Our relationship with these places will change as
                  well. Already, our cities are being made &ldquo;smarter&rdquo;
                  by the connected sensors of the Internet of Things (IoT).
                  These systems can help save precious resources by reorienting
                  our day-to-day activities through the optimization and
                  coordination of elements like traffic flow &mdash; reducing
                  congestion, saving commuters time and fuel, and helping to
                  limit pollution &mdash; and municipal services such as police
                  dispatch, snow removal, and public works, to adjust to
                  evolving patterns. The IoT also has the potential to put us
                  into more substantial contact with our surroundings, whether
                  it be at work, in transit, or at home, by adding a digital
                  layer to our physical infrastructure. One beautiful example of
                  this increased awareness can be seen in the Light Reeds
                  project, created by New York design firm Pensa, which provide
                  viewers with a greater connection to the water and waterways
                  that flow around and through our cities. Powered by an
                  underwater turbine, the Light Reeds themselves rely on the
                  motion of the water for power; their glow is dim or bright
                  based on the degree of activity, while their color can
                  indicate water quality.
                </p>

                {/* Mobile-only: Light Reeds images */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-light-reeds.png')}
                      alt="Section 3 light reeds"
                    />
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-light-reeds-2.png')}
                      alt="Section 3 light reeds 2"
                    />
                    <div className="caption">Light Reeds by Pensa</div>
                  </div>
                </div>

                <p>
                  Or consider the potential of our parks and open spaces to be
                  lit by light-emitting trees with a bioluminescent coating
                  instead of electric lights, illustrated beautifully in this
                  visualization by designers from Studio Roosegaarde, as seen
                  on{' '}
                  <a
                    href="http://www.dezeen.com/2014/03/24/movie-sxsw-daan-roosegarde-glow-in-dark-trees"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dezeen.com
                  </a>
                  . This might seem far fetched, but glowing plants such as
                  these are already being created through synthetic biology.
                </p>

                {/* Mobile-only: Bioluminescent Trees images */}
                <div className="images sidebar middle">
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-bioluminescent-trees-1.png')}
                      alt="Section 3 bioluminescent trees 1"
                    />
                  </div>
                  <div className="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={legacyImage('section-3-bioluminescent-trees-2.png')}
                      alt="Section 3 bioluminescent trees 2"
                    />
                    <div className="caption">
                      Bioluminescent Trees by Studio Roosegaarde
                    </div>
                  </div>
                </div>

                <p>
                  Buildings of the future may be partially or entirely 3D
                  printed. Today, additive fabrication is already changing
                  architecture and construction. In April 2014,{' '}
                  <a
                    href="http://www.bbc.com/news/blogs-news-from-elsewhere-27156775"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WinSun
                  </a>
                  , a Chinese engineering company, reported that it could
                  construct 10 single-story homes in a day by using a
                  specialized 3D printing technology that creates the main
                  structure and walls using an inexpensive combination of
                  concrete and construction waste materials.
                </p>
              </div>

              {/* --- Eating --- */}
              <div className="sub-sec">
                <h3>Eating</h3>

                <p>
                  There&apos;s nothing more demonstrative of our connection to
                  the greater world around us than the food we put inside our
                  bodies. Genetically modified organisms (GMO) are prevalent
                  throughout the United States. Today the overwhelming majority
                  of commodity crops from soybeans to cotton to beets to corn
                  are genetically engineered. Foods can be genetically altered
                  for a variety of reasons &mdash; to resist pesticides, enhance
                  shelf life, and even improve appearance or introduce novel
                  variants. According to the{' '}
                  <a
                    href="http://www.isaaa.org/resources/publications/briefs/49/executivesummary/default.asp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    International Service for the Acquisition of Agri-biotech
                    Applications (ISAAA)
                  </a>{' '}
                  in 2014, a record 181.5 million hectares of biotech crops were
                  grown globally.
                </p>

                <p>
                  Disruption in our food supply can begin with something as
                  mundane as improving the length of freshness of the humble
                  tomato. For instance, while naturally occurring tomato
                  varieties begin to soften and rot after a week on the shelves
                  or two weeks in the refrigerator, altering the genetic makeup
                  of a tomato &mdash; to suppress or &ldquo;silence&rdquo;
                  certain characteristics &mdash; enables the texture of the
                  fruit to remain intact for up to 45 days. Genetically modified
                  crops have caused grave concerns about the long-term safety of
                  the food. In the United States, there are currently no laws
                  that require the labeling of such GMO foods, which further
                  compounds the problem. Despite this, genomics, is already
                  upending the trillion dollar agriculture industry worldwide,
                  according to the McKinsey Global Institute
                  Report,&ldquo;Disruptive technologies: Advances that will
                  transform life, business and the global economy&rdquo;.
                </p>

                {/* Tomato GIF */}
                <div id="tomato">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={legacyImage('tomato.gif')}
                    alt="Tomato"
                  />
                </div>

                <p>
                  In 2010, scientists at the National Institute of Plant Genome
                  Research in New Delhi, India, identified the genes that drive
                  the ripening of the fruit and applied RNA-interference to
                  silence them.
                </p>
              </div>

              {/* --- Working --- */}
              <div className="sub-sec">
                <h3>Working</h3>

                <p>
                  In the area of global manufacturing, emerging technologies
                  like advanced robotics and additive fabrication are changing
                  the way products are constructed. These changes threaten to
                  completely alter the nature and type of human labor required,
                  with the very strong possibility that millions of jobs
                  worldwide will be lost to agile, robotic manufacturing
                  processes. Knowledge work is similarly threatened by the
                  automation of tasks by computerized artificial intelligence.
                  There will be no simple answers to this. But if we believe
                  that humans need meaningful work to lead full lives, the need
                  to find answers and design solutions becomes of tremendous
                  importance.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Bottom Hero ===== */}
      <header className="sec-header bottom-vid" id="bottom">
        <div className="video-container" data-page="3">
          <DisruptHeroVideo partNumber={3} position="bottom" />
        </div>
      </header>

      {/* ===== Next Part Navigation ===== */}
      <BottomNav
        nextHref="/vision/disrupt/part-4"
        nextTitle="crowdsourcing innovation"
        color="#0282C1"
      />
    </ColorScrollWrapper>
  )
}
