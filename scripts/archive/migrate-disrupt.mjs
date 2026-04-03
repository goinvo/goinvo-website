/**
 * Migrate disrupt content to Sanity.
 *
 * Uploads ~30 images (hero fallbacks, section images, 20 tech topic cards),
 * builds Portable Text blocks for the full 6-part article,
 * sets the subtitle/description, links authors, and patches the existing
 * feature document with slug "disrupt".
 *
 * The page has:
 *   - Hero image (section-1-top fallback)
 *   - 6 numbered parts with extensive prose
 *   - 20 technology topic cards with images (rendered as h4 + description)
 *   - A DARPA quote block
 *   - An "Automobile Adoption Rates" callout box
 *   - A "Designing for Emerging Technologies" book reference box
 *   - Author credits (Jon Follett, Brian Liston, Craig McGinley, Emily Twaddell)
 *   - 4 references
 *
 * Authors:
 *   - Jon Follett = team-jonathan-follett (existing)
 *   - Craig McGinley = team-craig-mcginley (existing)
 *   - Brian Liston = alumni-brian-liston (created if missing)
 *   - Emily Twaddell = alumni-emily-twaddell (created if missing)
 *
 * Usage:
 *   node scripts/migrate-disrupt.mjs
 *   node scripts/migrate-disrupt.mjs --dry-run
 */

import { createClient } from 'next-sanity'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_WRITE_TOKEN) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN in .env.local')
  process.exit(1)
}

const CDN = 'https://www.goinvo.com'
const IMG_BASE = '/old/images/features/disrupt'
const dryRun = process.argv.includes('--dry-run')
const key = () => randomUUID().replace(/-/g, '').slice(0, 12)

// ─── Helpers ────────────────────────────────────────────────────────────────

async function uploadImage(url, filename) {
  const response = await fetch(url)
  if (!response.ok) {
    console.log(`    WARN: Failed to fetch ${url} (${response.status})`)
    return null
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  const asset = await client.assets.upload('image', buffer, {
    filename,
    contentType,
  })

  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
  }
}

function imageBlock(assetRef, alt = '', size = 'full') {
  return {
    _type: 'image',
    _key: key(),
    asset: assetRef.asset,
    alt,
    size,
  }
}

function textBlock(text, style = 'normal') {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
    markDefs: [],
  }
}

function richBlock(children, style = 'normal', markDefs = []) {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: children.map(c => ({ _type: 'span', _key: key(), text: c.text, marks: c.marks || [] })),
    markDefs,
  }
}

function linkMark(href, blank = false) {
  const markKey = key()
  return {
    markKey,
    markDef: { _type: 'link', _key: markKey, href, blank },
  }
}

function quoteBlock(text, author, role) {
  const block = {
    _type: 'quote',
    _key: key(),
    text,
  }
  if (author) block.author = author
  if (role) block.role = role
  return block
}

function backgroundSection(color, innerBlocks) {
  return {
    _type: 'backgroundSection',
    _key: key(),
    color,
    content: innerBlocks,
  }
}

function dividerBlock() {
  return {
    _type: 'divider',
    _key: key(),
    style: 'default',
  }
}

function referencesBlock(items) {
  return {
    _type: 'references',
    _key: key(),
    items: items.map(r => ({
      _type: 'object',
      _key: key(),
      title: r.title,
      link: r.link || undefined,
    })),
  }
}

// ─── Image definitions ──────────────────────────────────────────────────────

const SECTION_IMAGES = [
  // Hero / Part 1
  { path: `${IMG_BASE}/video_fallbacks/section-1-top.jpg`, filename: 'disrupt-hero.jpg', alt: 'Disrupt! Emerging Technologies hero image' },
  { path: `${IMG_BASE}/section-1-lockheed-martin.png`, filename: 'disrupt-lockheed-martin.png', alt: 'FORTIS exoskeleton from Lockheed Martin' },
  { path: `${IMG_BASE}/section-1-e-chromi.png`, filename: 'disrupt-e-chromi.png', alt: 'E. chromi bacteria color indicators' },

  // Part 2
  { path: `${IMG_BASE}/video_fallbacks/section-2-top.jpg`, filename: 'disrupt-section-2-top.jpg', alt: 'Historical image of early automobile era' },
  { path: `${IMG_BASE}/nytgraph.gif`, filename: 'disrupt-nytgraph.gif', alt: 'Technology adoption rates chart from Nick Felton, New York Times' },
  { path: `${IMG_BASE}/section-2-highway-system.png`, filename: 'disrupt-highway-system.png', alt: 'U.S. Highway System Plan, November 11, 1926' },
  { path: `${IMG_BASE}/section-2-pijl.png`, filename: 'disrupt-pijl.png', alt: "Karl Jilg's illustration representing a pedestrian's view of city streets" },
  { path: `${IMG_BASE}/section-2-standard-oil.png`, filename: 'disrupt-standard-oil.png', alt: "1905 political cartoon showing Standard Oil's octopus-like influence" },

  // Part 3
  { path: `${IMG_BASE}/section-3-light-reeds.png`, filename: 'disrupt-light-reeds.png', alt: 'Light Reeds project by Pensa design firm' },
  { path: `${IMG_BASE}/section-3-bioluminescent-trees-1.png`, filename: 'disrupt-bioluminescent-trees.png', alt: 'Bioluminescent trees visualization by Studio Roosegaarde' },

  // Part 5
  { path: `${IMG_BASE}/video_fallbacks/section-5-top.jpg`, filename: 'disrupt-section-5-top.jpg', alt: 'The Future of Design' },
  { path: `${IMG_BASE}/section-5-MIT-tech-review.png`, filename: 'disrupt-mit-tech-review.png', alt: 'MIT Technology Review cover featuring Buzz Aldrin' },
  { path: `${IMG_BASE}/section-5-packbot.png`, filename: 'disrupt-packbot.png', alt: "Rethink Robotics' Baxter and Sawyer" },
  { path: `${IMG_BASE}/section-5-robot-arm.png`, filename: 'disrupt-robot-arm.png', alt: 'Universal Robotics UR collaborative robot' },
  { path: `${IMG_BASE}/section-5-robot-breakfast.png`, filename: 'disrupt-robot-breakfast.png', alt: "Yaskawa Motorman's Dexter Bot" },
  { path: `${IMG_BASE}/section-5-wyss-institute.png`, filename: 'disrupt-wyss-institute.png', alt: 'The Wyss Institute at Harvard' },
  { path: `${IMG_BASE}/section-5-the-plant-man.png`, filename: 'disrupt-plant-man.png', alt: 'Antony Evans, Glowing Plant Kickstarter initiator' },
  { path: `${IMG_BASE}/section-5-tobacco.png`, filename: 'disrupt-tobacco.png', alt: 'Glowing tobacco plant created via synthetic biology' },

  // Part 6
  { path: `${IMG_BASE}/section-6-fukushima.png`, filename: 'disrupt-fukushima.png', alt: 'Radiation hotspot in Kashiwa, Japan' },
  { path: `${IMG_BASE}/section-6-irobot.png`, filename: 'disrupt-irobot.png', alt: 'iRobot 710 Warrior robot used at Fukushima' },
  { path: `${IMG_BASE}/section-6-mit-robots.png`, filename: 'disrupt-mit-robots.png', alt: 'Boston Dynamics Atlas, an agile anthropomorphic robot' },
]

// 20 Tech topic card images
const TECH_TOPICS = [
  { title: 'Artificial Intelligence', image: 'slideshow/artificial-intelligence.jpg', text: 'Nothing fascinates and scares us more than the idea that we can create machines that are smarter than we are. AI comprises highly technical disciplines spanning mathematics, computer science, psychology, and philosophy. Researchers pursue logic-based paradigms, neurology, cybernetics, creativity, and social intelligence. Designers must consider the ethical ramifications of AI products.' },
  { title: 'Connected Environments', image: 'slideshow/connected-environments.jpg', text: "Integrated physical-digital spaces are transforming how we experience events and everyday life. Interdisciplinary design teams integrate platforms and technologies, combining physical and digital dimensions via real-time data. Xbox Kinect Sports demonstrates remote competitive gaming using motion-sensing and machine learning for facial, voice, and gesture recognition." },
  { title: 'Genomics', image: 'slideshow/genomics.jpg', text: "Genomics aims at identifying gene functions and regulations by comparing individual genome data to millions globally. Potential includes genome-based disease detection, diagnosis, treatment strategies, and understanding DNA variations and environmental interactions. Genomic advances promise a health care revolution but require addressing ethical, legal, and social considerations preventing misuse." },
  { title: 'Crypto-Currencies', image: 'slideshow/crypto-currencies.jpg', text: 'Digital currency usable worldwide with fluctuating value, stored in digital \u201cwallets.\u201d Bitcoin exemplifies this \u2014 \u201cfree, open source software that supports a decentralized payment network where money can be exchanged peer-to-peer.\u201d Transactions use unique cryptographic signatures; miners verify transactions in a public ledger providing mathematical proof.' },
  { title: '3D Printing', image: 'slideshow/3d-printing.jpg', text: "Additive fabrication using sequential material deposition, building layer-by-layer. Since the 1980s, CAD and 3D printing replaced traditional model-making. New technologies include material extrusion and sintering, expanding capabilities to metals and polymers. Applications span industrial design, engineering, biotech, dentistry, medicine, fashion, and jewelry." },
  { title: 'Materials Science', image: 'slideshow/materials-science.jpg', text: "Studies materials\u2019 origins, composition, uses, modification, and creation. Currently, 300,000+ known materials exist \u2014 naturally occurring (copper, bone) and manufactured (Kevlar, carbon fiber). Descended from Enlightenment science, the field integrates physics, biology, chemistry, mineralogy, and engineering." },
  { title: 'Vertical Farming', image: 'slideshow/vertical-farming.jpg', text: "Growing food continuously in tall urban buildings provides fresh, agrochemical-free access without long-distance shipping\u2019s economic and environmental impacts. Crops gain weather protection; traditional farmland recovers ecologically. Benefits include reduced agricultural runoff, fossil fuel use, methane generation for energy, and water recycling technologies." },
  { title: 'Smart Cities', image: 'slideshow/smart-cities.jpg', text: "Integrate cloud services, sensors, RFID, smartphones, and smart meters improving efficiency and life quality. Headsets can augment blind users\u2019 experiences with 3D soundscapes from digital beacons on streetlights, combined with transit schedules, indicating correct bus stops and arrival times. Projects engage local government and citizens in open innovation and co-design." },
  { title: 'Robotics', image: 'slideshow/robotics.jpg', text: 'Ideal for repetitive, physically demanding, hazardous jobs with opportunities in energy, health, manufacturing. It remains to be seen if robot labor generates the kind of negative societal, economic, and political change depicted in the more pessimistic musings of our culture\'s science fiction. Ensuring positive outcomes represents highest-order design challenges.' },
  { title: 'Augmented Reality', image: 'slideshow/augmented-reality.jpg', text: "Integrates computer-generated sensory input \u2014 graphics, sounds, tactile, olfactory \u2014 with real-world experience. Applications range from Yelp\u2019s Monocle restaurant overlay to fitness apps like Zombies, Run! to Autodesk\u2019s interactive 3D CAD walk-throughs and retail virtual try-on apps. Challenges include small screens, limited GPS accuracy, and privacy concerns." },
  { title: 'Personalized Medicine', image: 'slideshow/personalized-medicine.jpg', text: "Molecular diagnostics identify genetic disease markers before symptom onset, enabling prevention or early intervention. Pharmacogenomics determines optimal drug protocols, reduces trial-and-error prescribing, and avoids adverse reactions. Complex genetic screening identifies cancer patients benefiting from chemotherapy. Increases quality of care, accessibility, and affordability." },
  { title: 'Smart Clothing', image: 'slideshow/smart-clothing.jpg', text: "E-textiles integrate fabrics with digital and electronic components collecting, analyzing, and using personalized data in fashion, interior design, and medical applications. Smart fabrics communicate, conduct energy, and change size. Athletic and medical clothing monitors vital signs, heart rate, respiration, temperature, activity, and posture." },
  { title: 'Synthetic Biology', image: 'slideshow/synthetic-biology.jpg', text: 'Applies engineering principles to nature and biology, making living systems design material. Scientists create custom-built DNA from standardized parts \u2014 \u201csort of like building machines with Legos.\u201d Potentially produces life-saving drugs from engineered cell chemicals, biodegradable adaptive clothing grown from living material. Synbio is truly science fiction coming \u2014 literally \u2014 to life.' },
  { title: 'Artificial Organs', image: 'slideshow/artificial-organs.jpg', text: "Organ replacement is turning to bioengineered tissues grown from patients\u2019 cells or amniotic stem cells, sometimes combined with artificial materials. 3D printing creates natural and artificial scaffolds for cell seeding into kidneys, tracheas, and bladders. Functional human implantation remains experimental, but tissue engineering holds significant possibilities." },
  { title: 'Nanotech', image: 'slideshow/nanotech.jpg', text: 'Applied science and engineering at nanometer scale \u2014 one billionth of a meter. \u201cIf a typical marble were a nanometer, one meter would be the size of the Earth.\u201d At this scale, properties like melting point and electrical conductivity change due to quantum effects. Applications include polymer composites, thin films, food storage, cosmetics, computing, sustainable energy, and environmental remediation.' },
  { title: 'Bionic Implants', image: 'slideshow/bionic-implants.jpg', text: 'Combines biological methods and systems with engineering, design, and technology. Neuroscientists develop battery-powered brain implants recognizing depression and PTSD symptom activity, stimulating healthier brain output. Cuff electrodes interface with human nerves, enabling electrical signal passage between bionic prosthetics and limbs. As Jim Moran of Draper Laboratory notes: \u201cEverything comes down to space and power.\u201d' },
  { title: 'Medical Nanobots', image: 'slideshow/medical-nanobots.jpg', text: "Nanorobotics develops molecular and nanoscale devices (0.1\u201310 micrometers). Blood cell-sized \u201cswarms\u201d could operate in the human bloodstream using sensors to find specific molecules for disease diagnosis and treatment. AI algorithms provide \u201cswarm intelligence\u201d for independent yet collaborative functioning. Applications include cancer cell-killing electrodes, kidney stone breakup, and diagnostic micro-cameras." },
  { title: 'Wearables', image: 'slideshow/wearables.jpg', text: "Small electronic devices worn integrated with or as clothing articles. From 1980s calculator watches to current Fitbit and Jawbone fitness trackers and Bluetooth speaker earrings. Currently, smartwatches mirror smartphone capabilities, relaying notifications and capturing data. Aesthetic and comfort issues persist \u2014 battery life remains critical." },
  { title: 'Climate Engineering', image: 'slideshow/climate-engineering.jpg', text: "Geoengineers explore mitigation strategies through climate intervention as scientific global warming understanding increases. Strategies range from simple (pale-colored \u201ccool roofs\u201d) to complex (space-based solar umbrellas). Atmospheric CO\u2082 reduction includes tree planting and oceanic phytoplankton growth stimulation. Climate engineering raises complex social and political concerns about slowing carbon emission reduction momentum." },
  { title: 'The Internet of Things', image: 'slideshow/internet-of-things.jpg', text: "Connects inanimate objects across the Internet improving and disrupting lives. Wirelessly connected sensor constellations collect and transmit data through devices and services. The challenge lies in designing within ecosystems of interconnected products, services, devices, and experiences. More connected devices increase security risks; increased complexity could exclude those needing it most." },
]

// ─── Build Content ──────────────────────────────────────────────────────────

async function buildContent() {
  // Upload all section images
  console.log('  Uploading section images...')
  const sectionImgs = []
  for (let i = 0; i < SECTION_IMAGES.length; i++) {
    const img = await uploadImage(`${CDN}${SECTION_IMAGES[i].path}`, SECTION_IMAGES[i].filename)
    if (img) {
      console.log(`    [${i + 1}/${SECTION_IMAGES.length}] Uploaded: ${SECTION_IMAGES[i].filename}`)
    } else {
      console.log(`    [${i + 1}/${SECTION_IMAGES.length}] FAILED: ${SECTION_IMAGES[i].filename}`)
    }
    sectionImgs.push(img)
  }

  // Upload tech topic images
  console.log('  Uploading 20 tech topic images...')
  const techImgs = []
  for (let i = 0; i < TECH_TOPICS.length; i++) {
    const topic = TECH_TOPICS[i]
    const img = await uploadImage(
      `${CDN}${IMG_BASE}/${topic.image}`,
      `disrupt-${topic.image.split('/')[1]}`
    )
    if (img) {
      console.log(`    [${i + 1}/20] Uploaded: ${topic.title}`)
    } else {
      console.log(`    [${i + 1}/20] FAILED: ${topic.title}`)
    }
    techImgs.push(img)
  }

  const blocks = []

  // Use sectionImgs by index:
  // 0 = hero (section-1-top) — used as document hero, not in content
  // 1 = lockheed-martin
  // 2 = e-chromi
  // 3 = section-2-top
  // 4 = nytgraph
  // 5 = highway-system
  // 6 = pijl
  // 7 = standard-oil
  // 8 = light-reeds
  // 9 = bioluminescent-trees
  // 10 = section-5-top
  // 11 = mit-tech-review
  // 12 = packbot
  // 13 = robot-arm
  // 14 = robot-breakfast
  // 15 = wyss-institute
  // 16 = plant-man
  // 17 = tobacco
  // 18 = fukushima
  // 19 = irobot
  // 20 = mit-robots

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBTITLE (rendered as sectionTitle style heading)
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Emerging technologies from robotics to synthetic biology to the Internet of Things', 'sectionTitle'))

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLE OF CONTENTS (links to anchored sections)
  // ═══════════════════════════════════════════════════════════════════════════
  const toc1 = linkMark('#emerging-tech', false)
  const toc2 = linkMark('#horse-to-horsepower', false)
  const toc3 = linkMark('#coming-disruption', false)
  const toc4 = linkMark('#crowdsourcing', false)
  const toc5 = linkMark('#future-of-design', false)
  const toc6 = linkMark('#fukushima', false)

  blocks.push(richBlock([
    { text: '1. Emerging Technologies', marks: [toc1.markKey] },
    { text: '  ', marks: [] },
    { text: '2. From Horse to Horsepower', marks: [toc2.markKey] },
    { text: '  ', marks: [] },
    { text: '3. The Coming Disruption', marks: [toc3.markKey] },
    { text: '  ', marks: [] },
    { text: '4. Crowdsourcing Innovation', marks: [toc4.markKey] },
    { text: '  ', marks: [] },
    { text: '5. The Future of Design', marks: [toc5.markKey] },
    { text: '  ', marks: [] },
    { text: '6. Fukushima and Fragility', marks: [toc6.markKey] },
  ], 'normal', [
    toc1.markDef, toc2.markDef, toc3.markDef, toc4.markDef, toc5.markDef, toc6.markDef,
  ]))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1: EMERGING TECHNOLOGIES
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 1: Emerging Technologies', 'h2'))

  blocks.push(textBlock('Over the next 30 years, there is little that humans can dream that we won\u2019t be able to do \u2014 from hacking our DNA, to embedding computers in our bodies, to printing replacement organs. The fantastic visions of our science fiction today will become the reality of tomorrow, as we redefine what it means to be human. This period of technological advancement will alter the way we live our lives in nearly every way \u2014 much like the Second Industrial Revolution in America established the modern age at the turn of the 20th century, when inventions from electric power to the automobile first became prominent and experienced widespread adoption.'))

  // Lockheed Martin image
  if (sectionImgs[1]) blocks.push(imageBlock(sectionImgs[1], SECTION_IMAGES[1].alt, 'full'))

  blocks.push(textBlock('Today, emerging technologies from robotics to synthetic biology to the Internet of Things are already opening up new possibilities for extending our reach, enabling us to become seemingly superhuman. As one example of this, the FORTIS exoskeleton from Lockheed Martin gives its user tremendous strength \u2014 allowing an operator to lift and use heavy tools as if the objects were weightless by transferring the weight loads through the exoskeleton to the ground. E. chromi \u2014 the Grand Prize winner at the 2009 International Genetically Engineered Machine Competition (iGEM) by Alexandra Daisy Ginsberg and her collaborators \u2014 advances the existing relationship we have with our microbiome, the microorganisms living on and inside us. The genetically altered e. chromi bacteria can serve as an early warning system for disease, changing the color of human waste to indicate the presence of a dangerous toxin or pathogen. For instance, if drinking water were tainted, fecal matter could be colored a brilliant red. In the future, a variety of day-glo colors might indicate a dangerous array of contaminants from malaria to the swine flu. Perhaps not what we all had in mind for a super power, but amazing nonetheless.'))

  // E. chromi image
  if (sectionImgs[2]) blocks.push(imageBlock(sectionImgs[2], SECTION_IMAGES[2].alt, 'full'))

  blocks.push(textBlock('What does it mean to create products and services that have the potential to disrupt our society and our economy? We will need to rethink and remake our interactions, our infrastructure, and maybe even our institutions. As we face a future where what it means to be human could be inexorably changed, we desperately need experience design to help frame our interactions with emerging technologies that are already racing ahead of our ability to process and manage them on an emotional, ethical, and societal level. Whether we\u2019re struggling with fear and loathing in reaction to genetically altered foods, the moral issues of changing a child\u2019s traits to suit a parent\u2019s preferences, the ethics guiding battlefield robots, or the societal implications of a 150-year extended lifetime, it\u2019s abundantly clear that the future of experience design will be to envision humanity\u2019s relationship to technology and each other.'))

  blocks.push(textBlock('The coming wave of technological change will make the tumult and disruption of the past decade\u2019s digital and mobile revolutions look like a minor blip by comparison. As we look beyond the screen to the rich world of interactions and experiences that need to be designed, we need to define new areas of practice. Experience design will be critical to tie the technology to human use and benefit. For those asking \u201cHow can we do this?\u201d we must counter, \u201cWhy and for whose benefit?\u201d'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2: FROM HORSE TO HORSEPOWER
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 2: From Horse to Horsepower', 'h2'))

  // Section 2 top image
  if (sectionImgs[3]) blocks.push(imageBlock(sectionImgs[3], SECTION_IMAGES[3].alt, 'full'))

  blocks.push(textBlock('To envision our future and the possible effects of technological disruption, both positive and negative, it is helpful to consider some of the recent historical context for humanity\u2019s ongoing relationship with technology.'))

  blocks.push(textBlock('Before the Second Industrial Revolution, personal travel was accomplished via feet, horse and buggy, or railroad. Communication happened through word of mouth, handwritten letters, and telegraph. Evening lighting came from candles, lanterns, or gas lamps. As new technologies become closely interwoven with our daily lives it becomes difficult to envision how people functioned without them.'))

  // Automobile Adoption Rates callout box
  blocks.push(backgroundSection('gray', [
    textBlock('Automobile Adoption Rates', 'h4'),
    richBlock([
      { text: '1910:', marks: ['strong'] },
      { text: ' Fewer than 500,000 autos in the United States', marks: [] },
    ]),
    richBlock([
      { text: '1917:', marks: ['strong'] },
      { text: ' 5 million registered vehicles (10x increase in 7 years)', marks: [] },
    ]),
    richBlock([
      { text: '1929:', marks: ['strong'] },
      { text: ' Approximately 27 million automobiles (50x increase from 1917)', marks: [] },
    ]),
  ]))

  // NYT graph
  if (sectionImgs[4]) blocks.push(imageBlock(sectionImgs[4], SECTION_IMAGES[4].alt, 'full'))
  blocks.push(richBlock([
    { text: 'Data visualization by Nick Felton, New York Times. By the 1930s, nearly 70% of U.S. households had electricity, 50% had automobiles, and 40% had telephones.', marks: ['em'] },
  ]))

  blocks.push(textBlock('The automobile transformed America, forcing the remaking of the American landscape. Roads and highways replaced natural terrain with asphalt and concrete, from sea to shining sea. The natural beauty of America was subjugated to the desire to move forward.'))

  // Highway system image
  if (sectionImgs[5]) blocks.push(imageBlock(sectionImgs[5], SECTION_IMAGES[5].alt, 'full'))
  blocks.push(richBlock([
    { text: 'U.S. Highway System Plan, November 11, 1926', marks: ['em'] },
  ]))

  // Pijl image
  if (sectionImgs[6]) blocks.push(imageBlock(sectionImgs[6], SECTION_IMAGES[6].alt, 'full'))
  blocks.push(richBlock([
    { text: 'Karl Jilg represents a pedestrian\u2019s view of city streets \u2014 public space was ceded in permanent fashion to one form of transportation only.', marks: ['em'] },
  ]))

  // Standard Oil image
  if (sectionImgs[7]) blocks.push(imageBlock(sectionImgs[7], SECTION_IMAGES[7].alt, 'full'))
  blocks.push(richBlock([
    { text: 'John Rockefeller\u2019s Standard Oil had an octopus-like economic influence \u2014 natural resources and even national policy were subjected to the whims of big oil companies.', marks: ['em'] },
  ]))

  blocks.push(textBlock('In hindsight it\u2019s easy to question if these were the best outcomes. We received great benefits, no doubt, from the auto, and great detriments as well. Going forward, it\u2019s worth considering the trade-offs of emerging, disruptive technologies, for our environment, natural resources, and way of living.'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 3: THE COMING DISRUPTION
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 3: The Coming Disruption', 'h2'))

  blocks.push(textBlock('What is the nature and magnitude of the disruption before us? Like the owner of the horse and buggy at the turn of the 20th century, we cannot fully appreciate or completely anticipate the entirety of the coming technological change that will embrace nearly every aspect of our everyday lives. We can, however, begin to understand the magnitude of that disruption in areas as varied as the places we live, the food we eat, and the work we do by emerging technologies like the Internet of Things, robotics, genomics and synthetic biology.'))

  // --- Living ---
  blocks.push(textBlock('Living', 'h3'))

  if (sectionImgs[8]) blocks.push(imageBlock(sectionImgs[8], SECTION_IMAGES[8].alt, 'full'))

  blocks.push(textBlock('The places in which we live, work, and play will be created, connected, and controlled in new ways \u2014 from the architecture of buildings to the composition of public and private spaces, to the infrastructure that binds it all together. Already, our cities are being made \u201csmarter\u201d by the connected sensors of the Internet of Things (IoT). These systems can help save precious resources by reorienting our day-to-day activities through the optimization and coordination of elements like traffic flow \u2014 reducing congestion, saving commuters time and fuel, and helping to limit pollution.'))

  blocks.push(textBlock('One beautiful example of this increased awareness can be seen in the Light Reeds project, created by New York design firm Pensa, which provide viewers with a greater connection to the water and waterways that flow around and through our cities. Powered by an underwater turbine, the Light Reeds themselves rely on the motion of the water for power; their glow is dim or bright based on the degree of activity, while their color can indicate water quality.'))

  // Bioluminescent trees image
  if (sectionImgs[9]) blocks.push(imageBlock(sectionImgs[9], SECTION_IMAGES[9].alt, 'full'))

  blocks.push(textBlock('Or consider the potential of our parks and open spaces to be lit by light-emitting trees with a bioluminescent coating instead of electric lights, illustrated beautifully in this visualization by designers from Studio Roosegaarde. This might seem far fetched, but glowing plants such as these are already being created through synthetic biology.'))

  blocks.push(textBlock('Buildings of the future may be partially or entirely 3D printed. In April 2014, WinSun, a Chinese engineering company, reported that it could construct 10 single-story homes in a day by using a specialized 3D printing technology that creates the main structure and walls using an inexpensive combination of concrete and construction waste materials.'))

  // --- Eating ---
  blocks.push(textBlock('Eating', 'h3'))

  blocks.push(textBlock('There\u2019s nothing more demonstrative of our connection to the greater world around us than the food we put inside our bodies. Genetically modified organisms (GMO) are prevalent throughout the United States. Today the overwhelming majority of commodity crops from soybeans to cotton to beets to corn are genetically engineered. According to the ISAAA in 2014, a record 181.5 million hectares of biotech crops were grown globally.'))

  blocks.push(textBlock('Disruption in our food supply can begin with something as mundane as improving the length of freshness of the humble tomato. While naturally occurring tomato varieties begin to soften and rot after a week on the shelves or two weeks in the refrigerator, altering the genetic makeup of a tomato \u2014 to suppress or \u201csilence\u201d certain characteristics \u2014 enables the texture of the fruit to remain intact for up to 45 days.'))

  // --- Working ---
  blocks.push(textBlock('Working', 'h3'))

  blocks.push(textBlock('In the area of global manufacturing, emerging technologies like advanced robotics and additive fabrication are changing the way products are constructed. These changes threaten to completely alter the nature and type of human labor required, with the very strong possibility that millions of jobs worldwide will be lost to agile, robotic manufacturing processes. Knowledge work is similarly threatened by the automation of tasks by computerized artificial intelligence. There will be no simple answers to this. But if we believe that humans need meaningful work to lead full lives, the need to find answers and design solutions becomes of tremendous importance.'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 4: CROWDSOURCING INNOVATION
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 4: Crowdsourcing Innovation', 'h2'))

  blocks.push(textBlock('Development and adoption of emerging technologies is happening at an unprecedented pace. Part of the reason is the democratization of technological discovery and exploration, plus the ease of sharing information globally.'))

  blocks.push(textBlock('Crowdsourcing innovation through citizen scientists, engineers, designers and amateurs is increasing technological progress in unprecedented ways. Research and development now happens in garages, basements, and dorm rooms of interested explorers \u2014 from biohackers to makers with 3D printers.'))

  blocks.push(textBlock('New IoT products and services will be driven partly by designers and engineers prototyping interactive objects using Arduino and Raspberry Pi controllers, inexpensive sensors, and 3D printed components. How this diffuse, decentralized system \u2014 fueled by sharing and openness cultures \u2014 advances emerging tech in genomics, robotics, and IoT remains uncertain.'))

  // --- 20 Emerging Technologies ---
  blocks.push(textBlock('20 Emerging Technologies', 'h3'))

  // Each tech topic: image + h4 title + description paragraph
  for (let i = 0; i < TECH_TOPICS.length; i++) {
    const topic = TECH_TOPICS[i]
    if (techImgs[i]) blocks.push(imageBlock(techImgs[i], topic.title, 'medium'))
    blocks.push(textBlock(topic.title, 'h4'))
    blocks.push(textBlock(topic.text))
  }

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 5: THE FUTURE OF DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 5: The Future of Design', 'h2'))

  // Section 5 top image
  if (sectionImgs[10]) blocks.push(imageBlock(sectionImgs[10], SECTION_IMAGES[10].alt, 'full'))

  blocks.push(textBlock('Designers have only just begun to think about the implications of emerging technologies for the human condition. We can and should be involved early with these emerging technologies as they develop, representing the human side of the equation. And while we can\u2019t anticipate all the possible outcomes, thinking about how these technologies will act within a larger ecosystem and how they might affect people in the short and long term, will be time well spent.'))

  blocks.push(textBlock('As technologies begin to interact with the world in more complicated ways, designers will be making decisions that affect the most intimate parts of our lives.'))

  // --- Identify the Problems Correctly ---
  blocks.push(textBlock('Identify the Problems Correctly', 'h3'))

  blocks.push(textBlock('The gap between the problems we face as a species and the seemingly unlimited potential of technologies ripe for implementation begs for considered but agile design thinking and practice. Designers should be problem identifiers, not just problem solvers searching for a solution to a pre-established set of parameters. We must seek to guide our technology, rather than just allow it to guide us.'))

  // MIT Tech Review image
  if (sectionImgs[11]) blocks.push(imageBlock(sectionImgs[11], SECTION_IMAGES[11].alt, 'medium'))
  blocks.push(richBlock([
    { text: 'MIT Technology Review, November/December 2012: \u201cYou Promised Me Mars Colonies. Instead I Got Facebook.\u201d \u2014 We\u2019ve stopped solving big problems.', marks: ['em'] },
  ]))

  blocks.push(textBlock('Chief concerns include environment (carbon reduction, new energy sources, global population effects, limited resources), human health (longer lifespans), manufacturing, food production, and clean water. According to the UN \u201cWorld Population Prospects: The 2012 Revision,\u201d global population will grow from 7.2 billion to 9.6 billion by 2050 \u2014 an additional 2.4 billion over 35 years.'))

  // --- Learn Constantly ---
  blocks.push(textBlock('Learn Constantly', 'h3'))

  blocks.push(textBlock('The boundaries between product design and engineering for software, hardware, and biotech are already blurring. Powerful technologies are creating an environment of constant change for creative class knowledge workers. Designers will need to understand the implications of science and technology for people.'))

  blocks.push(textBlock('Just as our understanding of and empathy for people allows us to successfully design with a user\u2019s viewpoint in mind, understanding our materials, whether they be pixels or proteins, sensors or servos, enables us to bring a design into the world. The ability to quickly learn new materials and techniques has always been one of the most important of a designer\u2019s core competencies. However, the speed at which this is expected and at which technological change occurs is the critical difference today.'))

  blocks.push(richBlock([
    { text: 'How we learn will soon become as important a consideration as what we learn.', marks: ['strong'] },
  ]))

  // --- Think Systemically ---
  blocks.push(textBlock('Think Systemically', 'h3'))

  blocks.push(textBlock('Increasingly, designers will also need to be system thinkers. As we consider the fields of advanced robotics, synthetic biology, or wearable technology, the design of the ecosystem will be just as important as the design of the product or service itself.'))

  // --- Work at a Variety of Scales ---
  blocks.push(textBlock('Work at a Variety of Scales', 'h3'))

  blocks.push(textBlock('Designers should be able to work at a variety of scales, from the overall system view to the nitty-gritty details. Moving between these levels will be important, too, as each one informs the other \u2014 the macro view informs the micro, and vice versa.'))

  blocks.push(textBlock('At the highest level, designers can work proactively with politicians and policy makers to effectively regulate new technology. From bioethics to industrial regulations governing the use of robotics, designers will want and need to have input into the realm of policy. Just as free markets cannot exist without effective and enforceable contract law, so, too, technological advancement cannot exist without sensible, effective, and enforceable regulation with a long-term view.'))

  blocks.push(richBlock([
    { text: 'Designers will need a seat, not just at the computer or the lab bench, but at the policy-making table, as well.', marks: ['strong'] },
  ]))

  // --- Connect People and Technology ---
  blocks.push(textBlock('Connect People and Technology', 'h3'))

  blocks.push(textBlock('Design should provide the connective tissue between people and technology. The seamless integration of a technology into our lives is almost always an act of great design, coupled with smart engineering; it\u2019s the \u201cwhy\u201d that makes the \u201cwhat\u201d meaningful. It is through this humane expression of technology that the designer ensures a product or service is not just a functional experience, but one that is also worthwhile.'))

  blocks.push(textBlock('It is the designer\u2019s duty to be a skeptic for the human side of the equation. Why are we doing these things? How is humanity represented against what\u2019s possible with technology?'))

  // Collaborative robotics images (3 in a row)
  // These are rendered as 3 separate images — in Sanity, they will be sequential medium images
  if (sectionImgs[12]) blocks.push(imageBlock(sectionImgs[12], SECTION_IMAGES[12].alt, 'medium'))
  if (sectionImgs[13]) blocks.push(imageBlock(sectionImgs[13], SECTION_IMAGES[13].alt, 'medium'))
  if (sectionImgs[14]) blocks.push(imageBlock(sectionImgs[14], SECTION_IMAGES[14].alt, 'medium'))
  blocks.push(richBlock([
    { text: 'Collaborative robotics: Rethink Robotics\u2019 Baxter and Sawyer, Universal Robotics\u2019 UR, and Yaskawa Motorman\u2019s Dexter Bot \u2014 designed with human-like characteristics and ease of programming for working in tandem with human workers on the factory floor.', marks: ['em'] },
  ]))

  blocks.push(textBlock('As robots take a greater role in manufacturing by automating repetitive and dangerous tasks, as well as augmenting human abilities, even though there are many benefits, there remains a question as to how such robotic optimization can coexist with meaningful work for people in the long term. In the collaborative robotics model, human labor is augmented by, not replaced with, the robotic technologies.'))

  // --- Provoke and Facilitate Change ---
  blocks.push(textBlock('Provoke and Facilitate Change', 'h3'))

  blocks.push(textBlock('It is not only the designer\u2019s responsibility to smooth transitions and find the best way to work things out between people and the technology in their lives; it is also the designer\u2019s duty to recognize when things are not working, and, rather than smooth over problems, to provoke wholesale change. Technological change is difficult and disruptive. Designers can start the discussion and help lead the process of transformation.'))

  // --- Work on Cross-Disciplinary Teams ---
  blocks.push(textBlock('Work on Cross-Disciplinary Teams', 'h3'))

  blocks.push(textBlock('The challenges inherent in much of emerging technology are far too great for an individual to encompass the requisite cross-domain knowledge. It is a multidisciplinary mix of scientists, engineers, and designers who are best positioned to understand and take advantage of these technologies. And it is crucial that these creative disciplines evolve together.'))

  // Wyss Institute image
  if (sectionImgs[15]) blocks.push(imageBlock(sectionImgs[15], SECTION_IMAGES[15].alt, 'full'))
  blocks.push(richBlock([
    { text: 'The Wyss Institute at Harvard is at the forefront of the \u201cbioinspired\u201d design field, developing materials and devices inspired by nature and biology.', marks: ['em'] },
  ]))

  blocks.push(textBlock('From such collaborations new roles will be created: perhaps we will soon see a great need for the synthetic biological systems engineer or the human-robot interaction designer. Forward-thinking design firms such as IDEO have also added synthetic biology to their established practices of industrial and digital design.'))

  // --- Take Risks, Responsibly ---
  blocks.push(textBlock('Take Risks, Responsibly', 'h3'))

  blocks.push(textBlock('To find our way forward as designers, we must be willing to take risks \u2014 relying upon a combination of our education, experience, and intuition \u2014 which can be crucial to innovation. We must always keep in mind both the benefits and consequences for people using these new technologies, and be prepared for mixed results.'))

  // Plant man and tobacco images
  if (sectionImgs[16]) blocks.push(imageBlock(sectionImgs[16], SECTION_IMAGES[16].alt, 'medium'))
  if (sectionImgs[17]) blocks.push(imageBlock(sectionImgs[17], SECTION_IMAGES[17].alt, 'medium'))

  blocks.push(textBlock('The Glowing Plant Kickstarter project is a good example of such inspired risk taking in action. Seeing the opportunity to both inspire and educate the public, a team of biochemists started a project to generate a bioluminescent plant, which they touted as \u201cthe first step in creating sustainable natural lighting.\u201d Financed on Kickstarter, the Glowing Plant project generated so much grassroots excitement that it raised $484,013 from 8,433 backers, far exceeding its initial goal of $65,000.'))

  blocks.push(textBlock('However, soon after the Glowing Plant project finished its campaign, Kickstarter, without any explanation, changed its terms for project creators, banning genetically modified organisms (GMOs) as rewards for online backers. Removing this financial option for synthetic biology startups, in a seemingly arbitrary decision, will have a chilling effect on future innovators.'))

  blocks.push(textBlock('It\u2019s safe to say that until synthetic biology is better understood, policy decisions such as this ban will continue to happen. It might be that a willingness to push forward and to take risks will be important to making the transition, to reach public acceptance and ultimately help move the technology forward.'))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 6: FUKUSHIMA AND FRAGILITY
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(textBlock('Part 6: Fukushima and Fragility', 'h2'))

  // Fukushima image
  if (sectionImgs[18]) blocks.push(imageBlock(sectionImgs[18], SECTION_IMAGES[18].alt, 'full'))

  blocks.push(textBlock('On March 11, 2011, a 9.0 magnitude earthquake and subsequent tsunami damaged the Fukushima Daiichi nuclear reactors in Japan. Over the course of 24 hours, crews tried desperately to fix the reactors. However, as, one by one, the back-up safety measures failed, the fuel rods in the nuclear reactor overheated, releasing dangerous amounts of radiation into the surrounding area. As radiation levels became far too high for humans, emergency teams at the plant were unable to enter key areas to complete the tasks required for recovery. Three hundred thousand people had to be evacuated from their homes, some of whom have yet to return.'))

  // iRobot image
  if (sectionImgs[19]) blocks.push(imageBlock(sectionImgs[19], SECTION_IMAGES[19].alt, 'full'))

  blocks.push(textBlock('The current state of the art in robotics is not capable of surviving the hostile, high-radiation environment of a nuclear power plant meltdown and dealing with the complex tasks required to assist a recovery effort. In the aftermath of Fukushima, the Japanese government did not immediately have access to hardened, radiation-resistant robots. A few robots from American companies \u2014 tested on the modern battlefields of Afghanistan and Iraq \u2014 including iRobot\u2019s 710 Warrior and PackBot were able to survey the plant. However, for many reasons, spanning political, cultural, and systemic, before the Fukushima event, an investment in robotic research was never seriously considered. The meltdown was an unthinkable catastrophe, one that Japanese officials thought could never happen.'))

  // --- The DARPA Robotics Challenge ---
  blocks.push(textBlock('The DARPA Robotics Challenge', 'h3'))

  blocks.push(textBlock('The Fukushima catastrophe inspired the United States Defense Advanced Research Projects Agency (DARPA) to create the Robotics Challenge, the purpose of which is to accelerate technological development for robotics in the area of disaster recovery. Acknowledging the fragility of our human systems and finding resilient solutions to catastrophes \u2014 whether it\u2019s the next super storm, earthquake, or nuclear meltdown \u2014 is a problem on which designers, engineers, and technologists should focus.'))

  // DARPA quote
  blocks.push(quoteBlock('\u201cHistory has repeatedly demonstrated that humans are vulnerable to natural and man-made disasters, and there are often limitations to what we can do to help remedy these situations when they occur. Robots have the potential to be useful assistants in situations in which humans cannot safely operate, but despite the imaginings of science fiction, the actual robots of today are not yet robust enough to function in many disaster zones nor capable enough to perform the most basic tasks required to help mitigate a crisis situation. The goal of the DRC is to generate groundbreaking research and development in hardware and software that will enable future robots, in tandem with human counterparts, to perform the most hazardous activities in disaster zones, thus reducing casualties and saving lives.\u201d', 'DARPA', 'Mission Statement'))

  // MIT robots / Atlas image
  if (sectionImgs[20]) blocks.push(imageBlock(sectionImgs[20], SECTION_IMAGES[20].alt, 'full'))
  blocks.push(richBlock([
    { text: 'Boston Dynamics Atlas, an agile anthropomorphic robot. In the 2013 competition trials, robots from MIT, Carnegie Mellon, and Schaft competed at tasks including driving cars, traversing difficult terrain, climbing ladders, opening doors, moving debris, cutting holes in walls, closing valves, and unreeling hoses.', marks: ['em'] },
  ]))

  // --- Changing Design and Designing Change ---
  blocks.push(textBlock('Changing Design and Designing Change', 'h3'))

  blocks.push(textBlock('People are less interested in the science and engineering, the mechanisms that make emerging technologies possible, but they are deeply concerned with the outcomes. As these technologies emerge, grow, and mature over the coming years, designers will have the opportunity to bridge human needs and the miraculous technological possibilities.'))

  blocks.push(textBlock('It will be a great and even intimidating challenge to involve design early in the process of defining new products and services, but it will be critical as we establish the practices of the twenty-first century \u2014 from the design of technology policy, to systems, to tactical interaction frameworks and techniques. Policy design will involve advising regulators and politicians on the possibilities and perils of emerging tech; system design will demand clear understanding of the broader interactions and implications; and framework design will benefit our day-to-day tactical work.'))

  blocks.push(textBlock('Understanding new technologies, their potential usage, and how they will impact people in the short and long term will require education and collaboration, resulting in new design specializations, many of which we have not yet even considered. In the coming years, as the boundaries between design and engineering for software, hardware, and biotechnology continue to blur, those who began their professional lives as industrial designers, computer engineers, UX practitioners, and scientists will find that the trajectory of their careers takes them into uncharted territory.'))

  blocks.push(textBlock('Like the farmers who moved to the cities to participate in the birth of the Industrial Revolution, we can\u2019t imagine all of the outcomes of our work. However, if history is any indicator, the convergence of these technologies will be greater than the sum of its parts. If we are prepared to take on such challenges, we only have to ask: \u201cWhat stands in the way?\u201d'))

  // Book reference box
  blocks.push(backgroundSection('gray', [
    textBlock('Designing for Emerging Technologies', 'h4'),
    textBlock('If you\u2019re interested in further exploration of this topic, check out \u201cDesigning for Emerging Technologies\u201d published by O\u2019Reilly Media, from which portions of this article were excerpted. In this book, you will discover 20 essays, from designers, engineers, scientists and thinkers, exploring areas of fast-moving, ground breaking technology in desperate need of experience design \u2014 from genetic engineering to neuroscience to wearables to biohacking.'),
  ]))

  blocks.push(dividerBlock())

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCES
  // ═══════════════════════════════════════════════════════════════════════════
  blocks.push(referencesBlock([
    { title: 'DRC. DARPA Robotics Challenge, DARPA.' },
    { title: 'Koren, Marina. \u201c3 Robots That Braved Fukushima,\u201d Popular Mechanics, March 9, 2012' },
    { title: 'McKinsey Global Institute. \u201cDisruptive technologies: Advances that will transform life, business and the global economy\u201d' },
    { title: 'UN. \u201cWorld Population Prospects: The 2012 Revision\u201d' },
  ]))

  return { blocks, heroImg: sectionImgs[0] }
}

// ─── Ensure team members exist ──────────────────────────────────────────────

async function ensureTeamMember(id, name, role) {
  const existing = await client.fetch(`*[_id == $id][0]`, { id })
  if (existing) {
    console.log(`    Team member exists: ${name} (${id})`)
    return
  }
  console.log(`    Creating team member: ${name} (${id})`)
  await client.createOrReplace({
    _id: id,
    _type: 'teamMember',
    name,
    role,
    bio: '',
  })
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const slug = 'disrupt'
  console.log(`\n=== Migrating ${slug} ===\n`)

  // Fetch the existing document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] { _id, title }`,
    { slug }
  )

  if (!doc) {
    console.error(`  ERROR: Feature document not found for slug "${slug}"`)
    console.error(`  Creating a new feature document instead...`)
  }

  if (doc) {
    console.log(`  Found document: ${doc.title} (${doc._id})`)
  }

  if (dryRun) {
    console.log('  DRY RUN - would build content and patch document')
    console.log('  Would upload ~41 images (21 section + 20 tech topics)')
    console.log('  Would set description, link 4 authors, and create content blocks')
    return
  }

  // Ensure alumni team members exist
  await ensureTeamMember('alumni-brian-liston', 'Brian Liston', 'Designer & Illustrator')
  await ensureTeamMember('alumni-emily-twaddell', 'Emily Twaddell', 'Contributing Author')

  // Build all content blocks (includes image uploads)
  const { blocks, heroImg } = await buildContent()
  console.log(`  Generated ${blocks.length} content blocks`)

  // Author references
  const authors = [
    { _type: 'reference', _ref: 'team-jonathan-follett', _key: key() },
    { _type: 'reference', _ref: 'alumni-brian-liston', _key: key() },
    { _type: 'reference', _ref: 'team-craig-mcginley', _key: key() },
    { _type: 'reference', _ref: 'alumni-emily-twaddell', _key: key() },
  ]

  const patchData = {
    description: 'Emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities for extending our reach, enabling us to become seemingly superhuman.',
    metaDescription: 'Emerging technologies from robotics to synthetic biology to the Internet of Things are opening up new possibilities for extending our reach, enabling us to become seemingly superhuman.',
    content: blocks,
    authors,
    date: 'Jun.2015',
    hiddenWorkPage: true,
  }

  // Set hero image if uploaded
  if (heroImg) {
    patchData.image = heroImg
  }

  if (doc) {
    // Patch existing document
    await client
      .patch(doc._id)
      .set(patchData)
      .commit()

    console.log(`\n  Patched "${doc.title}" with:`)
  } else {
    // Create new document
    await client.create({
      _type: 'feature',
      title: 'Disrupt!',
      slug: { _type: 'slug', current: 'disrupt' },
      ...patchData,
    })

    console.log(`\n  Created "Disrupt!" with:`)
  }

  console.log(`    - description + metaDescription`)
  console.log(`    - hero image`)
  console.log(`    - ${blocks.length} content blocks (21 section images + 20 tech topic images)`)
  console.log(`    - ${authors.length} authors (Jon Follett, Brian Liston, Craig McGinley, Emily Twaddell)`)
  console.log(`    - 4 references`)
  console.log('\nDone!\n')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
