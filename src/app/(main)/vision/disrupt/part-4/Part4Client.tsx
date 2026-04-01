'use client'

import { useState } from 'react'
import {
  ColorScrollWrapper,
  DisruptHeroVideo,
  HeroSection,
  DisruptNavBar,
  BottomNav,
} from '../DisruptClient'
import { legacyImage } from '../disrupt-shared'

/**
 * Row color themes for the 20-topic grid.
 * Translated from the legacy CSS data-row border colors.
 */
const ROW_COLORS = ['#0396aa', '#82659b', '#0282c1', '#dd2e64']

/**
 * The 20 emerging technology topics with their full slideshow text.
 * Translated from the legacy HTML slideshow slides.
 */
const TECH_TOPICS = [
  {
    slug: 'artificial-intelligence',
    title: 'Artificial Intelligence',
    row: 1,
    paragraphs: [
      `Alan Turing's bombe Christopher saved lives. So did Tommy Flowers' Colossus. Clarke and Kubrick's HAL 9000 killed astronauts. Spielberg's endearing android David won a mother's love. Gene Roddenberry's Commander Data gained the love of a cat, which is arguably harder to earn than mother-love. Siri informs and entertains, keeps us company, and finds us good sushi. Which is fiction? Nothing fascinates and scares us more than the idea that we can create machines that are smarter than we are. Do we really want cars that drive themselves? Like other emerging technologies, the field of artificial intelligence (AI) comprises many highly technical and specialized disciplines ranging from mathematics and computer science to psychology and philosophy. Some researchers pursue a pure logic-based paradigm while others are exploring neurology and cybernetics or venturing into creativity and social intelligence. The implications for AI reach far beyond science fiction and popular culture, requiring designers to consider the critical ethical ramifications of what they produce.`,
    ],
  },
  {
    slug: 'connected-environments',
    title: 'Connected Environments',
    row: 1,
    paragraphs: [
      `At the 2014 Coachella Music Festival, the music-streaming service Spotify partnered with organizers to offer a connected space experience with the #WeWereThere campaign. Participants could "Connect, Collect, and Share" a personal Coachella story by linking their Facebook and Spotify accounts. Checkpoints let them map their journey and record how many steps they walked. They shared photos via Instagram, saved and shared playlists, and had access to Uber rides to get around. Two Verizon Wireless antenna trucks kept the network going.`,
      `By contrast, you don't need to leave your home to join in a competitive global soccer scrimmage using Kinect Sports for XBox. Motion-sensing input devices track movement of objects and people in 3D, assisted by machine learning to provide facial, voice, and advanced gesture recognition. These are examples of connected environments\u2014the next phase of the Internet of Things. Interdisciplinary design teams work across different environments, platforms, and technologies to enable multidimensional services that integrate both the physical and digital dimensions and are driven by real-time data. The challenge for designers is now to think beyond screens and human factors and consider the objects, networks, and algorithms that run environments and ambient interactions.`,
    ],
  },
  {
    slug: 'genomics',
    title: 'Genomics',
    row: 1,
    paragraphs: [
      `What if you could run a "spelling" check on your genes? Not just the genes in your 23 chromosome pairs, but your entire genome: all of your genes, gene-modifying sequences, and everything in between. Then, what if you could compare your findings to those of millions of others?`,
      `You would be participating in genomics research, which aims to identify the function of genes and what regulates them. Perhaps your data would help find genome-based strategies for detecting, diagnosing, and treating diseases. Or it might help reveal the significance of the tiny, individual variations in people's DNA, and how our DNA interacts with our environments. Maybe your genetic map will contribute to discovering what makes some people resilient even when they carry potentially devastating genes. Genomic research has the potential to revolutionize the practice of health care. But not without ethical, legal, and social issues that must be addressed to prevent misuse of new genetic technologies and information.`,
    ],
  },
  {
    slug: 'crypto-currencies',
    title: 'Crypto-Currencies',
    row: 1,
    paragraphs: [
      `It's money in digital form. It can be used anywhere in the world. The value fluctuates widely. You store it in a special "wallet" on your computer or your phone.`,
      `Likely the best-known digital currency, Bitcoin is free, open source software that supports a decentralized payment network where money can be exchanged peer-to-peer. When value is transferred from one wallet to another, it is identified and protected by a unique "private key" or cryptographic signature, and all transactions are confirmed by individuals called "miners." Verified transactions are stored in a public ledger that provides mathematical proof of legitimacy.`,
      `With no centralized body to regulate it or verify transactions, cryptocurrency it can be spent anonymously, like cash in your pocket. Transaction fees are very low so it works well for micropayments and donations. However, with backup repository, a cryptocurrency account balance can be decimated by a computer crash. Still, with a growing development community, cryptocurrency has amazing potential.`,
    ],
  },
  {
    slug: '3d-printing',
    title: '3D Printing',
    row: 1,
    paragraphs: [
      `How can you either add or subtract material and yet still make a three-dimensional object? When you are ready to model a design, both methods can work, but since the 1980s, CAD and additive fabrication, or 3D printing, have overtaken traditional model making and machining processes.`,
      `Originally, 3D printing actually meant a process that used inkjet printer heads and stereolithography to sequentially deposit a polymer material onto a powder bed, building one thin layer at a time. New technologies such as material extrusion and sintering have expanded 3D printing capabilities to include metals as well as polymers in additive fabrication. Additive fabrication plays a role in applications ranging from industrial design and engineering to biotech, dentistry, and medicine, to fashion and jewelry.`,
    ],
  },
  {
    slug: 'materials-science',
    title: 'Materials Science',
    row: 2,
    paragraphs: [
      `It's fairly common knowledge that football helmets really don't protect players from concussions. But why is that true? With technology that lets a driver emerge unscathed from a totaled car, why hasn't someone designed a helmet that protects the brain? Take a little paleontology, mix it with molecular biology, apply some Newtonian physics, filter it all through a materials science paradigm, and we might find a helmet material that will absorb impact before it gets to the brain.`,
      `Materials science is the study of stuff: where it comes from, how it's composed, how it can be used, how it can be changed, even how we can create entirely new stuff. Already there are at least 300,000 different known materials\u2014both naturally occurring, like copper and bone, and manufactured, such as Kevlar and carbon fiber. Descended from the scientific studies of the Enlightenment, materials science involves physics, biology, chemistry, mineralogy, engineering\u2014it's a long list of disciplines. The emerging possibilities present a disruptive design challenge of unknown proportions.`,
    ],
  },
  {
    slug: 'vertical-farming',
    title: 'Vertical Farming',
    row: 2,
    paragraphs: [
      `In the agricultural world, thinking big might eventually give way to thinking up. Over the next 40+ years, global population growth will crowd out traditional farming, and most people will live in cities. Where will their food come from, and how will it get to them? Vertical farming might be a solution: food continuously grown inside of tall buildings situated within the urban centers. City dwellers would have easy access to fresh food, free of agrochemicals and locally grown. No more long-distance shipping with its economic and environmental impacts. Crops would be protected from severe weather. Traditionally farmed land could be allowed to go back to its natural state, repairing the ecosystem damage caused by decades of agricultural use. Other potential benefits include reduction of agricultural runoff and the use of fossil fuels, new energy sources via methane generation, and new water recycling technologies.`,
      `However, the adoption of such a different approach to sustainable agriculture will require paradigm shifts across multiple disciplines: economic, political, academic, and even social.`,
    ],
  },
  {
    slug: 'smart-cities',
    title: 'Smart Cities',
    row: 2,
    paragraphs: [
      `Imagine a headset that augments a blind wearer's experience with a 3D soundscape created from data off digital beacons on streetlights and other objects and then combines it with transit schedules. It tells the wearer if he is at the right bus stop, and when the next bus will arrive. It works with trains, too, and can tell the wearer what she is passing by along the way. It can even read barcodes at stores.`,
      `This is just the kind of life-enhancing, integrated experience that smart cities are intended to provide. Cities are using cloud-based services, sensors and RFID, smart phones, smart meters, and other technologies to lower costs, improve efficiency, and increase overall quality of life. The possibilities will challenge designers, engineers, scientists, and academic communities. Projects will engage local government and individual citizens as well to participate in open innovation and co-design.`,
    ],
  },
  {
    slug: 'robotics',
    title: 'Robotics',
    row: 2,
    paragraphs: [
      `Robots are ideal for taking care of jobs that are repetitive, physically demanding, and potentially hazardous to humans. There are immediate, significant opportunities for using advanced robotics in energy, health, and manufacturing. Designers working in robotics will need to help identify the major challenges in these areas and seek proactive solutions \u2014 not an obvious or easy task.`,
      `More so than any other emerging technology, robotics has captured the imagination of American popular culture, especially that of the Hollywood sci-fi blockbuster. We're entertained, enthralled, and maybe (but only slightly) alarmed by the legacy of Blade Runner, The Terminator, The Matrix and any number of lesser dystopian robotic celluloid futures. It remains to be seen if robot labor generates the kind of negative societal, economic, and political change depicted in the more pessimistic musings of our culture's science fiction. Ensuring that it does not is a design challenge of the highest order.`,
    ],
  },
  {
    slug: 'augmented-reality',
    title: 'Augmented Reality',
    row: 2,
    paragraphs: [
      `Augmented reality (AR) technologies integrate interactive, computer-generated sensory input\u2014graphics, sounds, tactile, even olfactory enhancements\u2014with real-world experience.`,
      `For example, the iPhone Yelp app contains an AR app called Monocle. It uses the phone's GPS and compass to collect and display interactive ratings and reviews about local restaurants on the mobile screen. The smartphone app Zombies, Run! integrates zombie hordes into one's workout to motivate a faster pace. Autodesk's Showcase Professional augments 3D CAD models to create interactive walk-through demonstrations. Retail apps use a smartphone camera to let you "try on" items like jewelry or cosmetics.`,
      `Although AR has been around for some time, there are challenges. Smartphone screens are small. GPS has a limited accuracy range. Privacy is an issue\u2014image-recognition software used with AR will enable one to point a phone at others and instantly bring up their online profile data.`,
    ],
  },
  {
    slug: 'personalized-medicine',
    title: 'Personalized Medicine',
    row: 3,
    paragraphs: [
      `Two or three generations ago, "personalized" medicine might have meant that your doctor made house calls. Today, technologies like molecular diagnostics enable doctors to identify genetic markers for disease\u2014before symptoms occur\u2014and to focus on prevention or early intervention instead of reactive treatment. Pharmacogenomics makes it possible to determine the best drug protocol, reduce trial-and-error prescribing, and avoid adverse drug reactions or ineffective treatment. Complex genetic screening even allows doctors, in some cases, to identify cancer patients who are most likely to benefit from chemotherapy. Bringing new efficiencies to health care, personalized medicine increases quality of care, quality of life, accessibility, and affordability.`,
    ],
  },
  {
    slug: 'smart-clothing',
    title: 'Smart Clothing',
    row: 3,
    paragraphs: [
      `Smart clothing and e-textiles integrate fabrics with digital and electronic components to collect, analyze, and use personalized data. They are used in fashion and interior design as well as medical applications, similar to other wearable technologies but with added features like flexibility and washability. Smart fabrics can communicate, conduct energy, and even change size. For example, a "smart socks" project at the University of Arizona Medical Center is developing a sock fabric that integrates fiber optics and sensors to monitor temperature, pressure, and joint angles in the feet, alerting medical professionals and wearers of the socks to any developing problems. Other applications include athletic and medical clothing that monitor the wearer's vital signs, such as heart and respiration rate, temperature, activity, and posture or position.`,
      `Design challenges include limited battery life and possible health risks in wearing electronics so close to the body. Still, e-textiles and smart clothing offer exciting possibilities.`,
    ],
  },
  {
    slug: 'synthetic-biology',
    title: 'Synthetic Biology',
    row: 3,
    paragraphs: [
      `In the field of synthetic biology, we apply engineering principles to the complex domains of nature and biology, making living systems themselves become possible material for design. Scientists can now create custom-built DNA from standardized parts that can be used to gain insights about how life works\u2014sort of like building machines with Legos. This potentially transformative science could produce life-saving drugs made from chemicals produced by cells engineered for that purpose, or biodegradable clothing that we grow ourselves and which can adapt to the environment or monitor our health. With implications for use in architecture, medicine, environmental remediation, agriculture, and more, synthetic biology also raises concerns about bioethics, safety, security, and environmental health and sustainability. Synbio is truly science fiction coming\u2014literally\u2014to life.`,
    ],
  },
  {
    slug: 'artificial-organs',
    title: 'Artificial Organs',
    row: 3,
    paragraphs: [
      `Nearly 35 years ago, the first successfully implanted artificial heart required its recipient to remain tethered to an external pneumatic compressor for the 112 days that he lived. Today, the Jarvik-7 has evolved and is used in patients awaiting a donor heart. With mechanical valves of titanium and pyrolytic carbon and a proprietary segmented polyurethane elastomer, this machine is a technical marvel. But it is still a temporary solution.`,
      `Many people die waiting for organ transplants, sometimes because a match can't be found or the patient's immune system rejects the organ. So, organ replacement has turned to bioengineered tissues. Bioartificial organs are being grown from a patient's own cells or amniotic stem cells and sometimes combined with artificial materials. Some techniques use a 3D printing technology that creates a natural or artificial scaffold onto which "seeded" cells can be grown\u2014into a kidney, a trachea, a bladder. Functional implantation in humans is still experimental, but tissue engineering is full of possibilities.`,
    ],
  },
  {
    slug: 'nanotech',
    title: 'Nanotech',
    row: 3,
    paragraphs: [
      `Nanotechnology is the the application of science and engineering at a very, very tiny scale: one billionth of a meter. If a typical marble were a nanometer, one meter would be the size of the Earth. Nanoscale materials such as blood hemoglobin, smoke, and volcanic ash occur naturally, and most biological processes occur at the nanoscale.`,
      `Made possible through tools like the scanning tunneling and atomic force microscopes, the study of extremely small things enables scientists and engineers to see and control individual atoms and molecules. As this tiny size, materials' properties, such as melting point and electrical conductivity, and behavior change (the "quantum effect"). By changing the size of a particle, scientists can precisely alter its properties. Materials made through nanotechnology can be added to polymer composites, thin films, food storage products, and even cosmetics. Nanotech has a broad impact in computing and other electronics applications, sustainable energy, and environmental remediation.`,
    ],
  },
  {
    slug: 'bionic-implants',
    title: 'Bionic Implants',
    row: 4,
    paragraphs: [
      `What if you had a GPS in your brain that helped you navigate emotionally? Neuroscientists are working on a battery-powered brain implant that can recognize brain activity associated with the onset of severe depression or PTSD symptoms and then stimulate the brain to produce a healthier output.`,
      `Bionics combines biological methods and systems with engineering, design, and technology, creating not only biological structures but also natural functionality. In medicine, bionic implants are not just prosthetics; they mimic the original function very closely. One tool developed is the cuff electrode, an interface that can be attached to human nerves, enabling electrical signals to pass between a bionic prosthetic and the wearer's limb. Such signal processing can also be used to communicate pressure forces from a prosthetic limb to the wearer's nervous system as sensory information. Other technologies get sensory input directly to the nerves, as with a cochlear implant, which stimulates the auditory nerve to enable hearing.`,
      `What are the challenges? "Everything comes down to space and power," says Jim Moran of Draper Laboratory in Cambridge, MA.`,
    ],
  },
  {
    slug: 'medical-nanobots',
    title: 'Medical Nanobots',
    row: 4,
    paragraphs: [
      `An emerging area of nanotechnology, nanorobotics explores the development of devices built from molecular or nanoscale parts and ranging in size from 0.1\u201310 micrometers. These robots are so tiny that they can deconstruct or build things at a molecular level, or even change the molecular structure of an object.`,
      `As small as a blood cell, a "swarm" of these micro-machines could theoretically operate within the human bloodstream. Using sensors to find specific molecules, nanobots could be programmed to diagnose and treat certain diseases or to act like blood cells. AI algorithms provide "swarm intelligence" to allow independent yet collaborative functioning. Nanobots may someday contain electrodes to kill cancer cells, use ultrasonic signals to break up kidney stones, or use a micro camera for diagnostic exploration.`,
      `Along with technical challenges, nanorobotics designers and engineers will likely face some tricky ethical questions in the potential for causing literally fundamental changes in human lives.`,
    ],
  },
  {
    slug: 'wearables',
    title: 'Wearables',
    row: 4,
    paragraphs: [
      `"Wearables" are small electronic devices that can be worn integrated with or as an article of clothing. The calculator watches of the 1980s were wearables. Now we have fitness tracking devices like Fitbit and Jawbone, or accessories like Bluetooth-enabled speaker earrings. Imagine a flexible smartphone that can bend into a bracelet\u2014a next-gen smartwatch. And, of course, there is Google Glass.`,
      `So, why don't we see everyone reading texts on their watches? Currently, smartwatches essentially only mirror smartphone capabilities, relaying notifications and capturing data. There are still issues with aesthetics and comfort. Square, clunky watches that overwhelm the wrist are no more appealing than industrial-style eyewear or saucer-sized headphones, no matter how clever they are. And, as with other smart devices, battery life is key.`,
    ],
  },
  {
    slug: 'climate-engineering',
    title: 'Climate Engineering',
    row: 4,
    paragraphs: [
      `With increasing scientific understanding of global warming, geoengineers have been exploring ways to mitigate its effects by intervening through climate engineering. Experts agree that no single approach will solve the climate change problem. Climate engineering models are aimed at removing carbon dioxide (a "greenhouse" gas) from the atmosphere and offsetting the effects of greenhouse gases by reducing the amount of solar radiation that the Earth absorbs. Climate engineering proposes strategies both simple, such as using pale-colored roofing materials ("cool roofs") and highly complex, as in deploying a huge, space-based solar umbrella. To reduce atmospheric CO\u2082, trees have been planted and oceanic phytoplankton growth has been stimulated through iron fertilization experiments.`,
      `Though we know that climate change must be addressed, climate engineering raises complex social and political concerns. What if it slows the momentum of efforts to reduce carbon emissions or the search for non-fossil fuels, for example? Climate engineering also raises ethical questions regarding its global impact and the balance of innovation, vision, and hubris in technological applications.`,
    ],
  },
  {
    slug: 'internet-of-things',
    title: 'The Internet of Things',
    row: 4,
    paragraphs: [
      `The Internet of Things connects inanimate objects across the Internet to improve (and disrupt) our lives in innumerable ways. Constellations of wirelessly connected sensors collect and transmit all sorts of data through devices and services. The IoT's impact spans industries, government, education, and nearly infinite consumer applications. Designing for this expanding universe requires fluency beyond product and interaction design principles and adaptive business models. The challenge lies in designing within ecosystems of interconnected products, services, devices, and experiences\u2014but that isn't where it ends. The more devices we connect, the greater the security risks, and the increased complexity could exclude the people who need it the most. It remains to be seen whether the IoT will simply become a playground for the wealthy or the realization of Orwell's Big Brother, or if it will change lives for the good.`,
    ],
  },
]

/**
 * Disrupt Part 4: Crowdsourcing Innovation — Client Component
 *
 * Ported from the legacy HTML at goinvo.com/features/disrupt/part-4.html
 * Structure: nav → top hero → article → sci-fi image → article → grid → bottom hero → bottom nav
 */
export function Part4Client() {
  const [activeTopic, setActiveTopic] = useState<number | null>(null)

  return (
    <ColorScrollWrapper partIndex={3}>
      {/* ===== Fixed Article Navigation ===== */}
      <DisruptNavBar currentPart={4} />

      {/* ===== Top Hero ===== */}
      <header className="sec-header top-vid" id="top">
        <div className="video-container" data-page="4">
          <DisruptHeroVideo partNumber={4} position="top" />
        </div>
        <div className="title-container">
          <h3>Crowdsourcing</h3>
          <h3>Innovation</h3>
        </div>
      </header>

      {/* ===== First Article Section ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-4">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <p>
                  Development and adoption of emerging technologies is happening
                  at an unprecedented pace. Part of the reason for this is the
                  democratization of technological discovery and exploration, and
                  the ease of sharing that information with other people across
                  the globe.
                </p>
                <p>
                  This crowd sourcing of innovation through citizen scientists,
                  engineers, designers and other amateurs is increasing the reach
                  of technological progress in a way never before seen. No longer
                  is research and development relegated to the lab or to the big
                  company, but rather to the garages, basements, and dorm rooms
                  of interested and passionate explorers from biohackers to
                  makers with 3D printers.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== Sci-fi Image ===== */}
      <div className="sci-fi">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          sizes="100vw"
          srcSet={`${legacyImage('peculiar-800.jpg')} 800w, ${legacyImage('peculiar-1280.jpg')} 1280w, ${legacyImage('peculiar-2880.jpg')} 2880w`}
          alt="The dizzying speed of technological progress"
        />
        <article className="disrupt">
          <div className="caption">
            The dizzying speed of technological progress causes some to fear
            (and some to hope) that they might be replaced by machines.
          </div>
        </article>
      </div>

      {/* ===== Second Article Section ===== */}
      <article className="disrupt" id="feature-article">
        <section className="article-section" id="section-4">
          <div className="section-content">
            <div className="content">
              <div className="sub-sec">
                <p>
                  As a part of this, technology integration has become as
                  important as invention, and is another source of ongoing
                  innovation in emerging tech fields. For instance, new products
                  and services for the IoT will be driven in part by designers
                  and engineers prototyping new interactive objects with Arduino
                  and Raspberry Pi controllers and inexpensive sensors and 3D
                  printed components.
                </p>
                <p>
                  How this diffuse and decentralized system &mdash; fueled by a
                  culture of sharing and openness &mdash; advances emerging tech
                  in areas as varied as genomics, robotics, and the IoT, remains
                  to be seen.
                </p>
              </div>
            </div>
          </div>
        </section>
      </article>

      {/* ===== 20 Technology Topics Grid ===== */}
      <div id="grid-section-container">
        <div id="grid-section">
          <div id="grid-area">
            {/* Grid of panels */}
            <div id="grid-container">
              {TECH_TOPICS.map((topic, index) => (
                <div
                  key={topic.slug}
                  className={`grid-panel${activeTopic === index ? ' active' : ''}`}
                  data-row={String(topic.row)}
                  data-tech={topic.slug}
                  onClick={() =>
                    setActiveTopic(activeTopic === index ? null : index)
                  }
                >
                  <div className="bg-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="grid-bg"
                      src={legacyImage(
                        `grid/panels/${topic.slug}.gif`
                      )}
                      alt={topic.title}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Slideshow overlay (shown when a topic is selected) */}
            {activeTopic !== null && (
              <div
                id="slideshow-container"
                className="active"
                data-row={String(TECH_TOPICS[activeTopic].row)}
              >
                <button
                  className="nav-button prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTopic(
                      activeTopic > 0
                        ? activeTopic - 1
                        : TECH_TOPICS.length - 1
                    )
                  }}
                  aria-label="Previous topic"
                />
                <button
                  className="close"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTopic(null)
                  }}
                  aria-label="Close slideshow"
                />
                <button
                  className="nav-button next"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTopic(
                      activeTopic < TECH_TOPICS.length - 1
                        ? activeTopic + 1
                        : 0
                    )
                  }}
                  aria-label="Next topic"
                />
                <div id="slides-container">
                  <div
                    className="slide"
                    data-row={String(TECH_TOPICS[activeTopic].row)}
                  >
                    <div className="container">
                      <div className="title">
                        {TECH_TOPICS[activeTopic].title}
                      </div>
                      <div className="column right">
                        <div className="image">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={legacyImage(
                              `slideshow/${TECH_TOPICS[activeTopic].slug}.jpg`
                            )}
                            alt={TECH_TOPICS[activeTopic].title}
                          />
                        </div>
                      </div>
                      {TECH_TOPICS[activeTopic].paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Bottom Hero ===== */}
      <header className="sec-header bottom-vid" id="bottom">
        <div className="video-container" data-page="4">
          <DisruptHeroVideo partNumber={4} position="bottom" />
        </div>
      </header>

      {/* ===== Next Part Navigation ===== */}
      <BottomNav
        nextHref="/vision/disrupt/part-5"
        nextTitle="the future of design"
        color="#0282C1"
      />
    </ColorScrollWrapper>
  )
}
