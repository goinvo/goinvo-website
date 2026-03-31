import type { Metadata } from 'next'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import './disrupt.css'

const img = (path: string) =>
  `https://www.goinvo.com/old/images/features/disrupt/${path}`

export const metadata: Metadata = {
  title: 'Disrupt! Designing for Emerging Technologies',
  description:
    'Today, emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities.',
  keywords:
    'design future emerging technologies technology robotics genomics internet of things iot ux user experience synthetic biology',
  openGraph: {
    title: 'Disrupt: Designing for Emerging Technologies',
    description:
      'Today, emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities.',
    type: 'article',
    images: [img('twitter.jpg')],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@goinvo',
    title: 'Disrupt: Designing for Emerging Technologies',
    description:
      'Today, emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities.',
    images: [img('twitter.jpg')],
  },
}

export default function DisruptPage() {
  return (
    <div id="disrupt-legacy">
      <SetCaseStudyHero image={img('video_fallbacks/section-1-top.jpg')} />

      {/* ===== Section Navigation Bar ===== */}
      <div className="navigation" id="article-nav">
        <div className="mobile-menu">
          <div className="title">Disrupt!</div>
        </div>
        <ol>
          <li>
            <a href="#section-1">1. Emerging Technologies</a>
          </li>
          <li>
            <a href="#section-2">2. From Horse to Horsepower</a>
          </li>
          <li>
            <a href="#section-3">3. The Coming Disruption</a>
          </li>
          <li>
            <a href="#section-4">4. Crowdsourcing Innovation</a>
          </li>
          <li>
            <a href="#section-5">5. The Future of Design</a>
          </li>
          <li>
            <a href="#section-6">6. Fukushima and Fragility</a>
          </li>
        </ol>
      </div>

      {/* ===== ARTICLE ===== */}
      <article className="disrupt" id="feature-article">
        {/* ==================== PART 1: EMERGING TECHNOLOGIES ==================== */}
        <section className="article-section" id="section-1">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <h3>Emerging Technologies</h3>
                <p>
                  Over the next 30 years, there is little that humans can dream
                  that we won&apos;t be able to do &mdash; from hacking our DNA,
                  to embedding computers in our bodies, to printing replacement
                  organs. The fantastic visions of our science fiction today will
                  become the reality of tomorrow, as we redefine what it means to
                  be human. This period of technological advancement will alter
                  the way we live our lives in nearly every way &mdash; much like
                  the Second Industrial Revolution in America established the
                  modern age at the turn of the 20th century, when inventions
                  from electric power to the automobile first became prominent
                  and experienced widespread adoption.
                </p>

                {/* Sidebar images (desktop: float right) */}
                <div className="images sidebar right">
                  <div className="image">
                    <img
                      src={img('section-1-lockheed-martin.png')}
                      alt="Lockheed Martin's FORTIS exoskeleton"
                    />
                    <div className="caption">
                      Lockheed Martin&apos;s FORTIS exoskeleton
                    </div>
                  </div>
                  <div className="image">
                    <img
                      src={img('section-1-e-chromi.png')}
                      alt="The e.chromi disease monitoring system"
                    />
                    <div className="caption">
                      The e.chromi disease monitoring system
                    </div>
                  </div>
                </div>

                <p>
                  Today, emerging technologies from robotics to synthetic biology
                  to the Internet of Things are already opening up new
                  possibilities for extending our reach, enabling us to become
                  seemingly superhuman. As one example of this, the FORTIS
                  exoskeleton from Lockheed Martin gives its user tremendous
                  strength &mdash; allowing an operator to lift and use heavy
                  tools as if the objects were weightless by transferring the
                  weight loads through the exoskeleton to the ground. E. chromi
                  &mdash; the Grand Prize winner at the 2009 International
                  Genetically Engineered Machine Competition (iGEM) by Alexandra
                  Daisy Ginsberg and her collaborators &mdash; advances the
                  existing relationship we have with our microbiome, the
                  microorganisms living on and inside us. The genetically altered
                  e. chromi bacteria can serve as an early warning system for
                  disease, changing the color of human waste to indicate the
                  presence of a dangerous toxin or pathogen. For instance, if
                  drinking water were tainted, fecal matter could be colored a
                  brilliant red. In the future, a variety of day-glo colors might
                  indicate a dangerous array of contaminants from malaria to the
                  swine flu. Perhaps not what we all had in mind for a super
                  power, but amazing nonetheless.
                </p>

                {/* Sidebar images (mobile: stacked) */}
                <div className="images sidebar middle">
                  <div className="image">
                    <img
                      src={img('section-1-lockheed-martin.png')}
                      alt="Lockheed Martin's FORTIS exoskeleton"
                    />
                    <div className="caption">
                      Lockheed Martin&apos;s FORTIS exoskeleton
                    </div>
                  </div>
                  <div className="image">
                    <img
                      src={img('section-1-e-chromi.png')}
                      alt="The e.chromi disease monitoring system"
                    />
                    <div className="caption">
                      The e.chromi disease monitoring system
                    </div>
                  </div>
                </div>

                <p>
                  What does it mean to create products and services that have the
                  potential to disrupt our society and our economy? We will need
                  to rethink and remake our interactions, our infrastructure, and
                  maybe even our institutions. As we face a future where what it
                  means to be human could be inexorably changed, we desperately
                  need experience design to help frame our interactions with
                  emerging technologies that are already racing ahead of our
                  ability to process and manage them on an emotional, ethical, and
                  societal level. Whether we&apos;re struggling with fear and
                  loathing in reaction to genetically altered foods, the moral
                  issues of changing a child&apos;s traits to suit a
                  parent&apos;s preferences, the ethics guiding battlefield
                  robots, or the societal implications of a 150-year extended
                  lifetime, it&apos;s abundantly clear that the future of
                  experience design will be to envision humanity&apos;s
                  relationship to technology and each other.
                </p>

                <p>
                  The coming wave of technological change will make the tumult
                  and disruption of the past decade&apos;s digital and mobile
                  revolutions look like a minor blip by comparison. As we look
                  beyond the screen to the rich world of interactions and
                  experiences that need to be designed, we need to define new
                  areas of practice. Experience design will be a critical to tie
                  the technology to human use and benefit. For those asking
                  &ldquo;How can we do this?&rdquo; we must counter, &ldquo;Why
                  and for whose benefit?&rdquo;.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1 bottom hero */}
        <header className="sec-header bottom-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-1-bottom.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-1-bottom.jpg')}
              alt="Section 1 bottom"
            />
          </div>
        </header>

        {/* ==================== PART 2: FROM HORSE TO HORSEPOWER ==================== */}
        <header className="sec-header top-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-2-top.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-2-top.jpg')}
              alt="Section 2 top"
            />
          </div>
          <div className="title-container">
            <h3>From Horse to Horsepower</h3>
          </div>
        </header>

        <section className="article-section" id="section-2">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <h3>From Horse to Horsepower</h3>
                <p>
                  To envision our future and the possible effects of
                  technological disruption, both positive and negative, it is
                  helpful to consider some of the recent historical context for
                  humanity&apos;s ongoing relationship with technology.
                </p>
                <p>
                  Before the Second Industrial Revolution, personal travel was
                  accomplished via feet, horse and buggy, or railroad.
                  Communication happened through word of mouth, handwritten
                  letters, and telegraph. Evening lighting came from candles,
                  lanterns, or gas lamps. As new technologies become closely
                  interwoven with our daily lives it becomes difficult to
                  envision how people functioned without them.
                </p>
              </div>

              <div className="sub-sec">
                <h3>The Rise of the Automobile</h3>
                <p>
                  In a span of roughly 20 years, between 1910 and 1929, the
                  automobile went from a novelty to an absolute necessity for
                  most Americans. By 1929, there were approximately 27 million
                  automobiles on the road. This is one of the more well-known
                  disruptions in modern history, but consider how rapidly
                  technologies at the time expanded in the United States. By the
                  1930s, nearly 70% of U.S. households had electricity, 50% had
                  automobiles, and 40% had telephones.
                </p>
              </div>

              <div className="images center">
                <img
                  src={img('nytgraph.gif')}
                  alt="Technology adoption rates chart from Nick Felton, New York Times"
                />
                <div className="caption">
                  Data visualization by Nick Felton, New York Times
                </div>
              </div>

              <div className="sub-sec">
                <h3>Reshaping the Landscape</h3>
                <p>
                  The automobile transformed America, forcing the remaking of the
                  American landscape. Roads and highways replaced natural terrain
                  with asphalt and concrete, from sea to shining sea. The natural
                  beauty of America was subjugated to the desire to move forward.
                </p>
              </div>

              <div className="images center">
                <img
                  src={img('section-2-highway-system.png')}
                  alt="U.S. Highway System Plan, November 11, 1926"
                />
                <div className="caption">
                  U.S. Highway System Plan, November 11, 1926
                </div>
              </div>

              <div className="images center">
                <img
                  src={img('section-2-pijl.png')}
                  alt="Karl Jilg's illustration representing a pedestrian's view of city streets"
                />
                <div className="caption">
                  Karl Jilg represents a pedestrian&apos;s view of city streets
                  &mdash; public space was ceded in permanent fashion to one form
                  of transportation only.
                </div>
              </div>

              <div className="images center">
                <img
                  src={img('section-2-standard-oil.png')}
                  alt="1905 political cartoon showing Standard Oil's octopus-like influence"
                />
                <div className="caption">
                  John Rockefeller&apos;s Standard Oil had an octopus-like
                  economic influence &mdash; natural resources and even national
                  policy were subjected to the whims of big oil companies.
                </div>
              </div>

              <div className="sub-sec">
                <p>
                  In hindsight it&apos;s easy to question if these were the best
                  outcomes. We received great benefits, no doubt, from the auto,
                  and great detriments as well. Going forward, it&apos;s worth
                  considering the trade-offs of emerging, disruptive
                  technologies, for our environment, natural resources, and way
                  of living.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 bottom hero */}
        <header className="sec-header bottom-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-2-bottom.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-2-bottom.jpg')}
              alt="Section 2 bottom"
            />
          </div>
        </header>

        {/* ==================== PART 3: THE COMING DISRUPTION ==================== */}
        <header className="sec-header top-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-3-top.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-3-top.jpg')}
              alt="Section 3 top"
            />
          </div>
          <div className="title-container">
            <h3>The Coming Disruption</h3>
          </div>
        </header>

        <section className="article-section" id="section-3">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <h3>The Coming Disruption</h3>
                <p>
                  What is the nature and magnitude of the disruption before us?
                  Like the owner of the horse and buggy at the turn of the 20th
                  century, we cannot fully appreciate or completely anticipate
                  the entirety of the coming technological change that will
                  embrace nearly every aspect of our everyday lives. We can,
                  however, begin to understand the magnitude of that disruption
                  in areas as varied as the places we live, the food we eat, and
                  the work we do by emerging technologies like the Internet of
                  Things, robotics, genomics and synthetic biology.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Living</h3>
                <div className="images center">
                  <img
                    src={img('section-3-light-reeds.png')}
                    alt="Light Reeds project by Pensa design firm"
                  />
                </div>
                <p>
                  The places in which we live, work, and play will be created,
                  connected, and controlled in new ways &mdash; from the
                  architecture of buildings to the composition of public and
                  private spaces, to the infrastructure that binds it all
                  together. Already, our cities are being made
                  &ldquo;smarter&rdquo; by the connected sensors of the Internet
                  of Things (IoT). These systems can help save precious resources
                  by reorienting our day-to-day activities through the
                  optimization and coordination of elements like traffic flow
                  &mdash; reducing congestion, saving commuters time and fuel,
                  and helping to limit pollution.
                </p>
                <p>
                  One beautiful example of this increased awareness can be seen
                  in the Light Reeds project, created by New York design firm
                  Pensa, which provide viewers with a greater connection to the
                  water and waterways that flow around and through our cities.
                  Powered by an underwater turbine, the Light Reeds themselves
                  rely on the motion of the water for power; their glow is dim
                  or bright based on the degree of activity, while their color
                  can indicate water quality.
                </p>
                <div className="images center">
                  <img
                    src={img('section-3-bioluminescent-trees-1.png')}
                    alt="Bioluminescent trees visualization by Studio Roosegaarde"
                  />
                </div>
                <p>
                  Or consider the potential of our parks and open spaces to be
                  lit by light-emitting trees with a bioluminescent coating
                  instead of electric lights, illustrated beautifully in this
                  visualization by designers from Studio Roosegaarde. This might
                  seem far fetched, but glowing plants such as these are already
                  being created through synthetic biology.
                </p>
                <p>
                  Buildings of the future may be partially or entirely 3D
                  printed. In April 2014, WinSun, a Chinese engineering company,
                  reported that it could construct 10 single-story homes in a day
                  by using a specialized 3D printing technology that creates the
                  main structure and walls using an inexpensive combination of
                  concrete and construction waste materials.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Eating</h3>
                <p>
                  There&apos;s nothing more demonstrative of our connection to
                  the greater world around us than the food we put inside our
                  bodies. Genetically modified organisms (GMO) are prevalent
                  throughout the United States. Today the overwhelming majority
                  of commodity crops from soybeans to cotton to beets to corn are
                  genetically engineered. According to the ISAAA in 2014, a
                  record 181.5 million hectares of biotech crops were grown
                  globally.
                </p>
                <p>
                  Disruption in our food supply can begin with something as
                  mundane as improving the length of freshness of the humble
                  tomato. While naturally occurring tomato varieties begin to
                  soften and rot after a week on the shelves or two weeks in the
                  refrigerator, altering the genetic makeup of a tomato &mdash;
                  to suppress or &ldquo;silence&rdquo; certain characteristics
                  &mdash; enables the texture of the fruit to remain intact for
                  up to 45 days.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Working</h3>
                <p>
                  In the area of global manufacturing, emerging technologies like
                  advanced robotics and additive fabrication are changing the way
                  products are constructed. These changes threaten to completely
                  alter the nature and type of human labor required, with the
                  very strong possibility that millions of jobs worldwide will be
                  lost to agile, robotic manufacturing processes. Knowledge work
                  is similarly threatened by the automation of tasks by
                  computerized artificial intelligence. There will be no simple
                  answers to this. But if we believe that humans need meaningful
                  work to lead full lives, the need to find answers and design
                  solutions becomes of tremendous importance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 bottom hero */}
        <header className="sec-header bottom-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-3-bottom.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-3-bottom.jpg')}
              alt="Section 3 bottom"
            />
          </div>
        </header>

        {/* ==================== PART 4: CROWDSOURCING INNOVATION ==================== */}
        <header className="sec-header top-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-4-top.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-4-top.jpg')}
              alt="Section 4 top"
            />
          </div>
          <div className="title-container">
            <h3>Crowdsourcing Innovation</h3>
          </div>
        </header>

        <section className="article-section" id="section-4">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <h3>Crowdsourcing Innovation</h3>
                <p>
                  Development and adoption of emerging technologies is happening
                  at an unprecedented pace. Part of the reason is the
                  democratization of technological discovery and exploration,
                  plus the ease of sharing information globally.
                </p>
                <p>
                  Crowdsourcing innovation through citizen scientists, engineers,
                  designers and amateurs is increasing technological progress in
                  unprecedented ways. Research and development now happens in
                  garages, basements, and dorm rooms of interested explorers
                  &mdash; from biohackers to makers with 3D printers.
                </p>
                <p>
                  New IoT products and services will be driven partly by
                  designers and engineers prototyping interactive objects using
                  Arduino and Raspberry Pi controllers, inexpensive sensors, and
                  3D printed components. How this diffuse, decentralized system
                  &mdash; fueled by sharing and openness cultures &mdash;
                  advances emerging tech in genomics, robotics, and IoT remains
                  uncertain.
                </p>
              </div>

              {/* 20 Emerging Technologies Grid */}
              <div className="sub-sec" id="grid-section-container">
                <div id="grid-section">
                  <h3>20 Emerging Technologies</h3>
                  <p>
                    The following provides an overview of 20 emerging
                    technologies that are poised to disrupt how we live, work,
                    and play. Each of these areas represents a field where
                    designers can contribute to the human experience.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5em',
                    padding: '2em 5%',
                  }}
                >
                  {[
                    {
                      title: 'Artificial Intelligence',
                      image: 'slideshow/artificial-intelligence.jpg',
                      color: '#0396aa',
                    },
                    {
                      title: 'Connected Environments',
                      image: 'slideshow/connected-environments.jpg',
                      color: '#0396aa',
                    },
                    {
                      title: 'Genomics',
                      image: 'slideshow/genomics.jpg',
                      color: '#0396aa',
                    },
                    {
                      title: 'Crypto-Currencies',
                      image: 'slideshow/crypto-currencies.jpg',
                      color: '#0396aa',
                    },
                    {
                      title: '3D Printing',
                      image: 'slideshow/3d-printing.jpg',
                      color: '#82659b',
                    },
                    {
                      title: 'Materials Science',
                      image: 'slideshow/materials-science.jpg',
                      color: '#82659b',
                    },
                    {
                      title: 'Vertical Farming',
                      image: 'slideshow/vertical-farming.jpg',
                      color: '#82659b',
                    },
                    {
                      title: 'Smart Cities',
                      image: 'slideshow/smart-cities.jpg',
                      color: '#82659b',
                    },
                    {
                      title: 'Robotics',
                      image: 'slideshow/robotics.jpg',
                      color: '#0282c1',
                    },
                    {
                      title: 'Augmented Reality',
                      image: 'slideshow/augmented-reality.jpg',
                      color: '#0282c1',
                    },
                    {
                      title: 'Personalized Medicine',
                      image: 'slideshow/personalized-medicine.jpg',
                      color: '#0282c1',
                    },
                    {
                      title: 'Smart Clothing',
                      image: 'slideshow/smart-clothing.jpg',
                      color: '#0282c1',
                    },
                    {
                      title: 'Synthetic Biology',
                      image: 'slideshow/synthetic-biology.jpg',
                      color: '#dd2e64',
                    },
                    {
                      title: 'Artificial Organs',
                      image: 'slideshow/artificial-organs.jpg',
                      color: '#dd2e64',
                    },
                    {
                      title: 'Nanotech',
                      image: 'slideshow/nanotech.jpg',
                      color: '#dd2e64',
                    },
                    {
                      title: 'Bionic Implants',
                      image: 'slideshow/bionic-implants.jpg',
                      color: '#dd2e64',
                    },
                    {
                      title: 'Medical Nanobots',
                      image: 'slideshow/medical-nanobots.jpg',
                      color: '#e68b35',
                    },
                    {
                      title: 'Wearables',
                      image: 'slideshow/wearables.jpg',
                      color: '#e68b35',
                    },
                    {
                      title: 'Climate Engineering',
                      image: 'slideshow/climate-engineering.jpg',
                      color: '#e68b35',
                    },
                    {
                      title: 'The Internet of Things',
                      image: 'slideshow/internet-of-things.jpg',
                      color: '#e68b35',
                    },
                  ].map((topic) => (
                    <div
                      key={topic.title}
                      style={{
                        border: `4px solid ${topic.color}`,
                        backgroundColor: 'white',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={img(topic.image)}
                        alt={topic.title}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                      <div
                        style={{
                          padding: '0.75em 1em',
                          fontFamily: '"proxima-nova", sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.15em',
                          fontSize: '0.85em',
                          color: topic.color,
                          fontWeight: 600,
                        }}
                      >
                        {topic.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 bottom hero */}
        <header className="sec-header bottom-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-4-bottom.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-4-bottom.jpg')}
              alt="Section 4 bottom"
            />
          </div>
        </header>

        {/* ==================== PART 5: THE FUTURE OF DESIGN ==================== */}
        <header className="sec-header top-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-5-top.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-5-top.jpg')}
              alt="Section 5 top"
            />
          </div>
          <div className="title-container">
            <h3>The Future of Design</h3>
          </div>
        </header>

        <section className="article-section" id="section-5">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <h3>The Future of Design</h3>
                <p>
                  Designers have only just begun to think about the implications
                  of emerging technologies for the human condition. We can and
                  should be involved early with these emerging technologies as
                  they develop, representing the human side of the equation. And
                  while we can&apos;t anticipate all the possible outcomes,
                  thinking about how these technologies will act within a larger
                  ecosystem and how they might affect people in the short and
                  long term, will be time well spent.
                </p>
                <p>
                  As technologies begin to interact with the world in more
                  complicated ways, designers will be making decisions that
                  affect the most intimate parts of our lives.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Identify the Problems Correctly</h3>
                <p>
                  The gap between the problems we face as a species and the
                  seemingly unlimited potential of technologies ripe for
                  implementation begs for considered but agile design thinking
                  and practice. Designers should be problem identifiers, not just
                  problem solvers searching for a solution to a pre-established
                  set of parameters. We must seek to guide our technology, rather
                  than just allow it to guide us.
                </p>
                <div className="images center">
                  <img
                    src={img('section-5-MIT-tech-review.png')}
                    alt='MIT Technology Review cover featuring Buzz Aldrin'
                  />
                  <div className="caption">
                    MIT Technology Review, November/December 2012: &ldquo;You
                    Promised Me Mars Colonies. Instead I Got Facebook.&rdquo;
                    &mdash; We&apos;ve stopped solving big problems.
                  </div>
                </div>
                <p>
                  Chief concerns include environment (carbon reduction, new
                  energy sources, global population effects, limited resources),
                  human health (longer lifespans), manufacturing, food
                  production, and clean water. According to the UN &ldquo;World
                  Population Prospects: The 2012 Revision,&rdquo; global
                  population will grow from 7.2 billion to 9.6 billion by 2050
                  &mdash; an additional 2.4 billion over 35 years.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Learn Constantly</h3>
                <p>
                  The boundaries between product design and engineering for
                  software, hardware, and biotech are already blurring. Powerful
                  technologies are creating an environment of constant change for
                  creative class knowledge workers. Designers will need to
                  understand the implications of science and technology for
                  people.
                </p>
                <p>
                  Just as our understanding of and empathy for people allows us
                  to successfully design with a user&apos;s viewpoint in mind,
                  understanding our materials, whether they be pixels or
                  proteins, sensors or servos, enables us to bring a design into
                  the world. The ability to quickly learn new materials and
                  techniques has always been one of the most important of a
                  designer&apos;s core competencies. However, the speed at which
                  this is expected and at which technological change occurs is
                  the critical difference today.
                </p>
                <p>
                  <strong>
                    How we learn will soon become as important a consideration as
                    what we learn.
                  </strong>
                </p>
              </div>

              <div className="sub-sec">
                <h3>Think Systemically</h3>
                <p>
                  Increasingly, designers will also need to be system thinkers.
                  As we consider the fields of advanced robotics, synthetic
                  biology, or wearable technology, the design of the ecosystem
                  will be just as important as the design of the product or
                  service itself.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Work at a Variety of Scales</h3>
                <p>
                  Designers should be able to work at a variety of scales, from
                  the overall system view to the nitty-gritty details. Moving
                  between these levels will be important, too, as each one
                  informs the other &mdash; the macro view informs the micro,
                  and vice versa.
                </p>
                <p>
                  At the highest level, designers can work proactively with
                  politicians and policy makers to effectively regulate new
                  technology. From bioethics to industrial regulations governing
                  the use of robotics, designers will want and need to have input
                  into the realm of policy. Just as free markets cannot exist
                  without effective and enforceable contract law, so, too,
                  technological advancement cannot exist without sensible,
                  effective, and enforceable regulation with a long-term view.
                </p>
                <p>
                  <strong>
                    Designers will need a seat, not just at the computer or the
                    lab bench, but at the policy-making table, as well.
                  </strong>
                </p>
              </div>

              <div className="sub-sec">
                <h3>Connect People and Technology</h3>
                <p>
                  Design should provide the connective tissue between people and
                  technology. The seamless integration of a technology into our
                  lives is almost always an act of great design, coupled with
                  smart engineering; it&apos;s the &ldquo;why&rdquo; that makes
                  the &ldquo;what&rdquo; meaningful. It is through this humane
                  expression of technology that the designer ensures a product or
                  service is not just a functional experience, but one that is
                  also worthwhile.
                </p>
                <p>
                  It is the designer&apos;s duty to be a skeptic for the human
                  side of the equation. Why are we doing these things? How is
                  humanity represented against what&apos;s possible with
                  technology?
                </p>
                <div className="images center">
                  <img
                    src={img('section-5-packbot.png')}
                    alt="Rethink Robotics' Baxter and Sawyer"
                  />
                </div>
                <div className="images center">
                  <img
                    src={img('section-5-robot-arm.png')}
                    alt="Universal Robotics UR collaborative robot"
                  />
                </div>
                <div className="images center">
                  <img
                    src={img('section-5-robot-breakfast.png')}
                    alt="Yaskawa Motorman's Dexter Bot"
                  />
                  <div className="caption">
                    Collaborative robotics: Rethink Robotics&apos; Baxter and
                    Sawyer, Universal Robotics&apos; UR, and Yaskawa
                    Motorman&apos;s Dexter Bot &mdash; designed with human-like
                    characteristics and ease of programming for working in tandem
                    with human workers on the factory floor.
                  </div>
                </div>
                <p>
                  As robots take a greater role in manufacturing by automating
                  repetitive and dangerous tasks, as well as augmenting human
                  abilities, even though there are many benefits, there remains a
                  question as to how such robotic optimization can coexist with
                  meaningful work for people in the long term. In the
                  collaborative robotics model, human labor is augmented by, not
                  replaced with, the robotic technologies.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Provoke and Facilitate Change</h3>
                <p>
                  It is not only the designer&apos;s responsibility to smooth
                  transitions and find the best way to work things out between
                  people and the technology in their lives; it is also the
                  designer&apos;s duty to recognize when things are not working,
                  and, rather than smooth over problems, to provoke wholesale
                  change. Technological change is difficult and disruptive.
                  Designers can start the discussion and help lead the process of
                  transformation.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Work on Cross-Disciplinary Teams</h3>
                <p>
                  The challenges inherent in much of emerging technology are far
                  too great for an individual to encompass the requisite
                  cross-domain knowledge. It is a multidisciplinary mix of
                  scientists, engineers, and designers who are best positioned to
                  understand and take advantage of these technologies. And it is
                  crucial that these creative disciplines evolve together.
                </p>
                <div className="images center">
                  <img
                    src={img('section-5-wyss-institute.png')}
                    alt="The Wyss Institute at Harvard"
                  />
                  <div className="caption">
                    The Wyss Institute at Harvard is at the forefront of the
                    &ldquo;bioinspired&rdquo; design field, developing materials
                    and devices inspired by nature and biology.
                  </div>
                </div>
                <p>
                  From such collaborations new roles will be created: perhaps we
                  will soon see a great need for the synthetic biological systems
                  engineer or the human-robot interaction designer.
                  Forward-thinking design firms such as IDEO have also added
                  synthetic biology to their established practices of industrial
                  and digital design.
                </p>
              </div>

              <div className="sub-sec">
                <h3>Take Risks, Responsibly</h3>
                <p>
                  To find our way forward as designers, we must be willing to
                  take risks &mdash; relying upon a combination of our education,
                  experience, and intuition &mdash; which can be crucial to
                  innovation. We must always keep in mind both the benefits and
                  consequences for people using these new technologies, and be
                  prepared for mixed results.
                </p>
                <div className="images center">
                  <img
                    src={img('section-5-the-plant-man.png')}
                    alt="Antony Evans, Glowing Plant Kickstarter initiator"
                  />
                </div>
                <div className="images center">
                  <img
                    src={img('section-5-tobacco.png')}
                    alt="Glowing tobacco plant created via synthetic biology"
                  />
                </div>
                <p>
                  The Glowing Plant Kickstarter project is a good example of such
                  inspired risk taking in action. Seeing the opportunity to both
                  inspire and educate the public, a team of biochemists started a
                  project to generate a bioluminescent plant, which they touted
                  as &ldquo;the first step in creating sustainable natural
                  lighting.&rdquo; Financed on Kickstarter, the Glowing Plant
                  project generated so much grassroots excitement that it raised
                  $484,013 from 8,433 backers, far exceeding its initial goal of
                  $65,000.
                </p>
                <p>
                  However, soon after the Glowing Plant project finished its
                  campaign, Kickstarter, without any explanation, changed its
                  terms for project creators, banning genetically modified
                  organisms (GMOs) as rewards for online backers. Removing this
                  financial option for synthetic biology startups, in a seemingly
                  arbitrary decision, will have a chilling effect on future
                  innovators.
                </p>
                <p>
                  It&apos;s safe to say that until synthetic biology is better
                  understood, policy decisions such as this ban will continue to
                  happen. It might be that a willingness to push forward and to
                  take risks will be important to making the transition, to reach
                  public acceptance and ultimately help move the technology
                  forward.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 bottom hero */}
        <header className="sec-header bottom-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-5-bottom.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-5-bottom.jpg')}
              alt="Section 5 bottom"
            />
          </div>
        </header>

        {/* ==================== PART 6: FUKUSHIMA AND FRAGILITY ==================== */}
        <header className="sec-header top-vid">
          <div
            className="video-container"
            style={{
              backgroundImage: `url(${img('video_fallbacks/section-6-top.jpg')})`,
            }}
          >
            <img
              className="placeholder"
              src={img('video_fallbacks/section-6-top.jpg')}
              alt="Section 6 top"
            />
          </div>
          <div className="title-container">
            <h3>Fukushima and Fragility</h3>
          </div>
        </header>

        <section className="article-section" id="section-6">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <h3>Fukushima and Fragility</h3>
                <div className="images center">
                  <img
                    src={img('section-6-fukushima.png')}
                    alt="Radiation hotspot in Kashiwa, Japan"
                  />
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
                <div className="images center">
                  <img
                    src={img('section-6-irobot.png')}
                    alt="iRobot 710 Warrior robot used at Fukushima"
                  />
                </div>
                <p>
                  The current state of the art in robotics is not capable of
                  surviving the hostile, high-radiation environment of a nuclear
                  power plant meltdown and dealing with the complex tasks
                  required to assist a recovery effort. In the aftermath of
                  Fukushima, the Japanese government did not immediately have
                  access to hardened, radiation-resistant robots. A few robots
                  from American companies &mdash; tested on the modern
                  battlefields of Afghanistan and Iraq &mdash; including
                  iRobot&apos;s 710 Warrior and PackBot were able to survey the
                  plant. However, for many reasons, spanning political, cultural,
                  and systemic, before the Fukushima event, an investment in
                  robotic research was never seriously considered. The meltdown
                  was an unthinkable catastrophe, one that Japanese officials
                  thought could never happen.
                </p>
              </div>

              <div className="sub-sec">
                <h3>The DARPA Robotics Challenge</h3>
                <p>
                  The Fukushima catastrophe inspired the United States Defense
                  Advanced Research Projects Agency (DARPA) to create the
                  Robotics Challenge, the purpose of which is to accelerate
                  technological development for robotics in the area of disaster
                  recovery. Acknowledging the fragility of our human systems and
                  finding resilient solutions to catastrophes &mdash; whether
                  it&apos;s the next super storm, earthquake, or nuclear meltdown
                  &mdash; is a problem on which designers, engineers, and
                  technologists should focus.
                </p>
                <p className="quote">
                  &ldquo;History has repeatedly demonstrated that humans are
                  vulnerable to natural and man-made disasters, and there are
                  often limitations to what we can do to help remedy these
                  situations when they occur. Robots have the potential to be
                  useful assistants in situations in which humans cannot safely
                  operate, but despite the imaginings of science fiction, the
                  actual robots of today are not yet robust enough to function in
                  many disaster zones nor capable enough to perform the most
                  basic tasks required to help mitigate a crisis situation. The
                  goal of the DRC is to generate groundbreaking research and
                  development in hardware and software that will enable future
                  robots, in tandem with human counterparts, to perform the most
                  hazardous activities in disaster zones, thus reducing
                  casualties and saving lives.&rdquo;
                  <br />
                  &mdash; DARPA Mission Statement
                </p>
                <div className="images center">
                  <img
                    src={img('section-6-mit-robots.png')}
                    alt="Boston Dynamics Atlas, an agile anthropomorphic robot"
                  />
                  <div className="caption">
                    Boston Dynamics Atlas, an agile anthropomorphic robot. In the
                    2013 competition trials, robots from MIT, Carnegie Mellon,
                    and Schaft competed at tasks including driving cars,
                    traversing difficult terrain, climbing ladders, opening
                    doors, moving debris, cutting holes in walls, closing valves,
                    and unreeling hoses.
                  </div>
                </div>
              </div>

              <div className="sub-sec">
                <h3>Changing Design and Designing Change</h3>
                <p>
                  People are less interested in the science and engineering, the
                  mechanisms that make emerging technologies possible, but they
                  are deeply concerned with the outcomes. As these technologies
                  emerge, grow, and mature over the coming years, designers will
                  have the opportunity to bridge human needs and the miraculous
                  technological possibilities.
                </p>
                <p>
                  It will be a great and even intimidating challenge to involve
                  design early in the process of defining new products and
                  services, but it will be critical as we establish the practices
                  of the twenty-first century &mdash; from the design of
                  technology policy, to systems, to tactical interaction
                  frameworks and techniques. Policy design will involve advising
                  regulators and politicians on the possibilities and perils of
                  emerging tech; system design will demand clear understanding of
                  the broader interactions and implications; and framework design
                  will benefit our day-to-day tactical work.
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
                  uncharted territory.
                </p>
                <p>
                  Like the farmers who moved to the cities to participate in the
                  birth of the Industrial Revolution, we can&apos;t imagine all
                  of the outcomes of our work. However, if history is any
                  indicator, the convergence of these technologies will be
                  greater than the sum of its parts. If we are prepared to take
                  on such challenges, we only have to ask: &ldquo;What stands in
                  the way?&rdquo;
                </p>
              </div>

              {/* Book Reference */}
              <div className="sub-sec book">
                <h3>Designing for Emerging Technologies</h3>
                <p>
                  If you&apos;re interested in further exploration of this topic,
                  check out{' '}
                  <a
                    href="http://shop.oreilly.com/product/0636920030898.do"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <em>Designing for Emerging Technologies</em>
                  </a>{' '}
                  published by O&apos;Reilly Media, from which portions of this
                  article were excerpted. In this book, you will discover 20
                  essays, from designers, engineers, scientists and thinkers,
                  exploring areas of fast-moving, ground breaking technology in
                  desperate need of experience design &mdash; from genetic
                  engineering to neuroscience to wearables to biohacking.
                </p>
              </div>

              {/* References */}
              <ul className="refs">
                <li>
                  DRC. &ldquo;
                  <a
                    href="http://www.theroboticschallenge.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    DARPA Robotics Challenge
                  </a>
                  ,&rdquo; DARPA.
                </li>
                <li>
                  Koren, Marina. &ldquo;3 Robots That Braved Fukushima,&rdquo;
                  Popular Mechanics, March 9, 2012.
                </li>
                <li>
                  McKinsey Global Institute. &ldquo;
                  <a
                    href="http://www.mckinsey.com/business-functions/digital-mckinsey/our-insights/disruptive-technologies"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Disruptive technologies: Advances that will transform life,
                    business and the global economy
                  </a>
                  .&rdquo;
                </li>
                <li>
                  UN. &ldquo;World Population Prospects: The 2012
                  Revision.&rdquo;
                </li>
              </ul>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Contributions / Credits ===== */}
      <div className="contributions">
        <div className="cont-wrapper">
          <ul className="main-credits">
            <li className="author main">
              <div className="title-container">
                <div className="person">Jon Follett</div>
                <div className="title">Author</div>
              </div>
            </li>
            <li className="designer main">
              <div className="title-container">
                <div className="person">Brian Liston</div>
                <div className="title">Designer &amp; Illustrator</div>
              </div>
            </li>
            <li className="developer main">
              <div className="title-container">
                <div className="person">Craig McGinley</div>
                <div className="title">Developer</div>
              </div>
            </li>
            <li className="editor main">
              <div className="title-container">
                <div className="person">Emily Twaddell</div>
                <div className="title">Contributing Author</div>
              </div>
            </li>

            {/* Additional credits */}
            <li className="extra-credits" style={{ display: 'block', maxHeight: 'none' }}>
              <ul style={{ listStyle: 'none' }}>
                <li>
                  <span className="credit">
                    Writing and editorial contributions from Sharon Lee, Emily
                    Twaddell, and Juhan Sonin.
                  </span>
                </li>
                <li>
                  <span className="credit">
                    Illustration and design by Brian Liston.
                  </span>
                </li>
                <li>
                  <span className="credit">
                    Based on the book{' '}
                    <span className="link">
                      <a
                        href="http://shop.oreilly.com/product/0636920030898.do"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Designing for Emerging Technologies
                      </a>
                    </span>{' '}
                    edited by Jonathan Follett, published by O&apos;Reilly Media.
                  </span>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      {/* ===== Newsletter ===== */}
      <section
        style={{
          backgroundColor: '#f5f5f5',
          padding: '3em 0',
        }}
      >
        <div
          style={{
            maxWidth: '1020px',
            margin: '0 auto',
            padding: '0 1.5em',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              padding: '2em',
            }}
          >
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
