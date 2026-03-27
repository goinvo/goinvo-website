import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'

const legacyImage = (path: string) =>
  `https://www.goinvo.com/old/images/features/disrupt/${path}`

export const metadata: Metadata = {
  title: 'Disrupt! Emerging Technologies',
  description:
    'Emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities for extending our reach, enabling us to become seemingly superhuman.',
}

const techTopics = [
  {
    title: 'Artificial Intelligence',
    image: 'slideshow/artificial-intelligence.jpg',
    text: 'Nothing fascinates and scares us more than the idea that we can create machines that are smarter than we are. AI comprises highly technical disciplines spanning mathematics, computer science, psychology, and philosophy. Researchers pursue logic-based paradigms, neurology, cybernetics, creativity, and social intelligence. Designers must consider the ethical ramifications of AI products.',
  },
  {
    title: 'Connected Environments',
    image: 'slideshow/connected-environments.jpg',
    text: "Integrated physical-digital spaces are transforming how we experience events and everyday life. Interdisciplinary design teams integrate platforms and technologies, combining physical and digital dimensions via real-time data. Xbox Kinect Sports demonstrates remote competitive gaming using motion-sensing and machine learning for facial, voice, and gesture recognition.",
  },
  {
    title: 'Genomics',
    image: 'slideshow/genomics.jpg',
    text: "Genomics aims at identifying gene functions and regulations by comparing individual genome data to millions globally. Potential includes genome-based disease detection, diagnosis, treatment strategies, and understanding DNA variations and environmental interactions. Genomic advances promise a health care revolution but require addressing ethical, legal, and social considerations preventing misuse.",
  },
  {
    title: 'Crypto-Currencies',
    image: 'slideshow/crypto-currencies.jpg',
    text: 'Digital currency usable worldwide with fluctuating value, stored in digital "wallets." Bitcoin exemplifies this \u2014 "free, open source software that supports a decentralized payment network where money can be exchanged peer-to-peer." Transactions use unique cryptographic signatures; miners verify transactions in a public ledger providing mathematical proof.',
  },
  {
    title: '3D Printing',
    image: 'slideshow/3d-printing.jpg',
    text: "Additive fabrication using sequential material deposition, building layer-by-layer. Since the 1980s, CAD and 3D printing replaced traditional model-making. New technologies include material extrusion and sintering, expanding capabilities to metals and polymers. Applications span industrial design, engineering, biotech, dentistry, medicine, fashion, and jewelry.",
  },
  {
    title: 'Materials Science',
    image: 'slideshow/materials-science.jpg',
    text: "Studies materials' origins, composition, uses, modification, and creation. Currently, 300,000+ known materials exist \u2014 naturally occurring (copper, bone) and manufactured (Kevlar, carbon fiber). Descended from Enlightenment science, the field integrates physics, biology, chemistry, mineralogy, and engineering.",
  },
  {
    title: 'Vertical Farming',
    image: 'slideshow/vertical-farming.jpg',
    text: "Growing food continuously in tall urban buildings provides fresh, agrochemical-free access without long-distance shipping's economic and environmental impacts. Crops gain weather protection; traditional farmland recovers ecologically. Benefits include reduced agricultural runoff, fossil fuel use, methane generation for energy, and water recycling technologies.",
  },
  {
    title: 'Smart Cities',
    image: 'slideshow/smart-cities.jpg',
    text: "Integrate cloud services, sensors, RFID, smartphones, and smart meters improving efficiency and life quality. Headsets can augment blind users' experiences with 3D soundscapes from digital beacons on streetlights, combined with transit schedules, indicating correct bus stops and arrival times. Projects engage local government and citizens in open innovation and co-design.",
  },
  {
    title: 'Robotics',
    image: 'slideshow/robotics.jpg',
    text: 'Ideal for repetitive, physically demanding, hazardous jobs with opportunities in energy, health, manufacturing. It remains to be seen if robot labor generates the kind of negative societal, economic, and political change depicted in the more pessimistic musings of our culture\'s science fiction. Ensuring positive outcomes represents highest-order design challenges.',
  },
  {
    title: 'Augmented Reality',
    image: 'slideshow/augmented-reality.jpg',
    text: "Integrates computer-generated sensory input \u2014 graphics, sounds, tactile, olfactory \u2014 with real-world experience. Applications range from Yelp's Monocle restaurant overlay to fitness apps like Zombies, Run! to Autodesk's interactive 3D CAD walk-throughs and retail virtual try-on apps. Challenges include small screens, limited GPS accuracy, and privacy concerns.",
  },
  {
    title: 'Personalized Medicine',
    image: 'slideshow/personalized-medicine.jpg',
    text: "Molecular diagnostics identify genetic disease markers before symptom onset, enabling prevention or early intervention. Pharmacogenomics determines optimal drug protocols, reduces trial-and-error prescribing, and avoids adverse reactions. Complex genetic screening identifies cancer patients benefiting from chemotherapy. Increases quality of care, accessibility, and affordability.",
  },
  {
    title: 'Smart Clothing',
    image: 'slideshow/smart-clothing.jpg',
    text: "E-textiles integrate fabrics with digital and electronic components collecting, analyzing, and using personalized data in fashion, interior design, and medical applications. Smart fabrics communicate, conduct energy, and change size. Athletic and medical clothing monitors vital signs, heart rate, respiration, temperature, activity, and posture.",
  },
  {
    title: 'Synthetic Biology',
    image: 'slideshow/synthetic-biology.jpg',
    text: 'Applies engineering principles to nature and biology, making living systems design material. Scientists create custom-built DNA from standardized parts \u2014 "sort of like building machines with Legos." Potentially produces life-saving drugs from engineered cell chemicals, biodegradable adaptive clothing grown from living material. Synbio is truly science fiction coming \u2014 literally \u2014 to life.',
  },
  {
    title: 'Artificial Organs',
    image: 'slideshow/artificial-organs.jpg',
    text: "Organ replacement is turning to bioengineered tissues grown from patients' cells or amniotic stem cells, sometimes combined with artificial materials. 3D printing creates natural and artificial scaffolds for cell seeding into kidneys, tracheas, and bladders. Functional human implantation remains experimental, but tissue engineering holds significant possibilities.",
  },
  {
    title: 'Nanotech',
    image: 'slideshow/nanotech.jpg',
    text: 'Applied science and engineering at nanometer scale \u2014 one billionth of a meter. "If a typical marble were a nanometer, one meter would be the size of the Earth." At this scale, properties like melting point and electrical conductivity change due to quantum effects. Applications include polymer composites, thin films, food storage, cosmetics, computing, sustainable energy, and environmental remediation.',
  },
  {
    title: 'Bionic Implants',
    image: 'slideshow/bionic-implants.jpg',
    text: 'Combines biological methods and systems with engineering, design, and technology. Neuroscientists develop battery-powered brain implants recognizing depression and PTSD symptom activity, stimulating healthier brain output. Cuff electrodes interface with human nerves, enabling electrical signal passage between bionic prosthetics and limbs. As Jim Moran of Draper Laboratory notes: "Everything comes down to space and power."',
  },
  {
    title: 'Medical Nanobots',
    image: 'slideshow/medical-nanobots.jpg',
    text: "Nanorobotics develops molecular and nanoscale devices (0.1\u201310 micrometers). Blood cell-sized \"swarms\" could operate in the human bloodstream using sensors to find specific molecules for disease diagnosis and treatment. AI algorithms provide \"swarm intelligence\" for independent yet collaborative functioning. Applications include cancer cell-killing electrodes, kidney stone breakup, and diagnostic micro-cameras.",
  },
  {
    title: 'Wearables',
    image: 'slideshow/wearables.jpg',
    text: "Small electronic devices worn integrated with or as clothing articles. From 1980s calculator watches to current Fitbit and Jawbone fitness trackers and Bluetooth speaker earrings. Currently, smartwatches mirror smartphone capabilities, relaying notifications and capturing data. Aesthetic and comfort issues persist \u2014 battery life remains critical.",
  },
  {
    title: 'Climate Engineering',
    image: 'slideshow/climate-engineering.jpg',
    text: "Geoengineers explore mitigation strategies through climate intervention as scientific global warming understanding increases. Strategies range from simple (pale-colored \"cool roofs\") to complex (space-based solar umbrellas). Atmospheric CO\u2082 reduction includes tree planting and oceanic phytoplankton growth stimulation. Climate engineering raises complex social and political concerns about slowing carbon emission reduction momentum.",
  },
  {
    title: 'The Internet of Things',
    image: 'slideshow/internet-of-things.jpg',
    text: "Connects inanimate objects across the Internet improving and disrupting lives. Wirelessly connected sensor constellations collect and transmit data through devices and services. The challenge lies in designing within ecosystems of interconnected products, services, devices, and experiences. More connected devices increase security risks; increased complexity could exclude those needing it most.",
  },
]

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

          {/* Table of Contents */}
          <nav className="mb-8 flex flex-wrap gap-2">
            {[
              { id: 'emerging-tech', label: '1. Emerging Technologies' },
              { id: 'horse-to-horsepower', label: '2. From Horse to Horsepower' },
              { id: 'coming-disruption', label: '3. The Coming Disruption' },
              { id: 'crowdsourcing', label: '4. Crowdsourcing Innovation' },
              { id: 'future-of-design', label: '5. The Future of Design' },
              { id: 'fukushima', label: '6. Fukushima and Fragility' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-sm px-3 py-1 border border-gray-light text-gray hover:bg-gray-lightest transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <Divider />

          {/* ===== PART 1: EMERGING TECHNOLOGIES ===== */}
          <div id="emerging-tech" className="scroll-mt-24 mb-12">
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

          <Divider />

          {/* ===== PART 2: FROM HORSE TO HORSEPOWER ===== */}
          <div id="horse-to-horsepower" className="scroll-mt-24 mb-12">
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

          <Divider />

          {/* ===== PART 3: THE COMING DISRUPTION ===== */}
          <div id="coming-disruption" className="scroll-mt-24 mb-12">
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

          <Divider />

          {/* ===== PART 4: CROWDSOURCING INNOVATION ===== */}
          <div id="crowdsourcing" className="scroll-mt-24 mb-12">
            <h2 className="font-serif text-2xl lg:text-3xl font-light mt-8 mb-6">
              Part 4: Crowdsourcing Innovation
            </h2>

            <p className="text-gray leading-relaxed mb-4">
              Development and adoption of emerging technologies is happening at
              an unprecedented pace. Part of the reason is the democratization of
              technological discovery and exploration, plus the ease of sharing
              information globally.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              Crowdsourcing innovation through citizen scientists, engineers,
              designers and amateurs is increasing technological progress in
              unprecedented ways. Research and development now happens in
              garages, basements, and dorm rooms of interested explorers &mdash;
              from biohackers to makers with 3D printers.
            </p>

            <p className="text-gray leading-relaxed mb-4">
              New IoT products and services will be driven partly by designers
              and engineers prototyping interactive objects using Arduino and
              Raspberry Pi controllers, inexpensive sensors, and 3D printed
              components. How this diffuse, decentralized system &mdash; fueled
              by sharing and openness cultures &mdash; advances emerging tech in
              genomics, robotics, and IoT remains uncertain.
            </p>

            {/* 20 Technology Topics */}
            <h3 className="font-serif text-xl font-light mt-8 mb-6">
              20 Emerging Technologies
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {techTopics.map((topic) => (
                <div key={topic.title} className="bg-gray-lightest p-4">
                  <Image
                    src={legacyImage(topic.image)}
                    alt={topic.title}
                    width={400}
                    height={250}
                    className="w-full h-auto mb-3"
                  />
                  <h4 className="font-serif text-lg font-light mb-2">
                    {topic.title}
                  </h4>
                  <p className="text-gray text-sm leading-relaxed">
                    {topic.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* ===== PART 5: THE FUTURE OF DESIGN ===== */}
          <div id="future-of-design" className="scroll-mt-24 mb-12">
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

          <Divider />

          {/* ===== PART 6: FUKUSHIMA AND FRAGILITY ===== */}
          <div id="fukushima" className="scroll-mt-24 mb-12">
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
