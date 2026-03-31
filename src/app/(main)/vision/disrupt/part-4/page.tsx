import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { SetCaseStudyHero } from '@/components/work/SetCaseStudyHero'
import { Divider } from '@/components/ui/Divider'
import { DisruptNav } from '../DisruptNav'
import { legacyImage } from '../disrupt-shared'

export const metadata: Metadata = {
  title: 'Disrupt! Part 4: Crowdsourcing Innovation',
  description:
    'Crowdsourcing innovation through citizen scientists, engineers, designers and amateurs is increasing technological progress in unprecedented ways.',
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

export default function DisruptPart4Page() {
  return (
    <div>
      <SetCaseStudyHero
        image={legacyImage('video_fallbacks/section-4-top.jpg')}
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

          {/* ===== PART 4: CROWDSOURCING INNOVATION ===== */}
          <div className="mb-12">
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

          {/* Next Part Link */}
          <Link href="/vision/disrupt/part-5" className="block group">
            <div className="relative w-full h-48 md:h-64 overflow-hidden">
              <Image
                src={legacyImage('video_fallbacks/section-5-top.jpg')}
                alt="Next: The Future of Design"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <p className="text-white text-xl md:text-2xl font-serif font-light tracking-[0.15em]">
                  Next: Part 5 &mdash; The Future of Design &rarr;
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
