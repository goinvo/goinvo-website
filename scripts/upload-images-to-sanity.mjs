/**
 * Upload external images to Sanity and patch feature documents with image blocks.
 *
 * Usage:
 *   node scripts/upload-images-to-sanity.mjs <slug>
 *   node scripts/upload-images-to-sanity.mjs --all
 *   node scripts/upload-images-to-sanity.mjs --dry-run killer-truths
 */

import { createClient } from 'next-sanity'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a1wsimxr',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const CDN = 'https://www.goinvo.com'
const LEGACY = 'https://www.goinvo.com'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const doAll = args.includes('--all')
const slugs = args.filter(a => !a.startsWith('--'))

const key = () => randomUUID().slice(0, 12)

/**
 * Fetch an image from a URL and upload it to Sanity's asset pipeline.
 * Returns a Sanity image reference object.
 */
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

/**
 * Create a Sanity image block for Portable Text content.
 */
function imageBlock(assetRef, alt = '', size = 'full', caption = '') {
  return {
    _type: 'image',
    _key: key(),
    asset: assetRef.asset,
    alt,
    size,
    caption: caption || undefined,
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
    children: children.map(c => ({ _type: 'span', _key: key(), ...c })),
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

function dividerBlock(style = 'default') {
  return { _type: 'divider', _key: key(), style }
}

function ctaButton(label, url, variant = 'secondary', external = true) {
  return { _type: 'ctaButton', _key: key(), label, url, variant, external }
}

function buttonGroup(buttons) {
  return {
    _type: 'buttonGroup',
    _key: key(),
    buttons: buttons.map(b => ({ _key: key(), ...b })),
  }
}

function referencesBlock(items) {
  return {
    _type: 'references',
    _key: key(),
    items: items.map(item => ({ _key: key(), ...item })),
  }
}

function quoteBlock(text, author, role) {
  return { _type: 'quote', _key: key(), text, author, role }
}

function backgroundSection(color, content) {
  return { _type: 'backgroundSection', _key: key(), color, content }
}

// ============================================================
// Page-specific content builders
// ============================================================

async function buildKillerTruths() {
  console.log('  Uploading images...')
  const heroImg = await uploadImage(
    `${CDN}/old/images/features/killer-truths/killer_truths_title.png`,
    'killer-truths-hero.png'
  )

  const ghLink = linkMark('https://github.com/goinvo/killertruths', true)
  const posterLink = linkMark(`${CDN}/old/images/features/killer-truths/Killer_Truths_Slide.png`, true)
  const dataLink = linkMark('https://docs.google.com/spreadsheets/d/1dE0CATyI9hDNp3WlgueY7d6bJOiw7HEiyi-MEzHgDig/edit?usp=sharing', true)
  const emailLink = linkMark('mailto:info@goinvo.com')

  // Load references
  const { readFileSync } = await import('fs')
  const { resolve } = await import('path')
  let refs = []
  try {
    refs = JSON.parse(readFileSync(resolve('src/data/vision/killer-truths/references.json'), 'utf-8'))
  } catch { /* already deleted */ }

  const content = []

  if (heroImg) content.push(imageBlock(heroImg, 'Killer Truths - Estimated number of deaths in USA from 2007-2014', 'full'))

  content.push(
    textBlock('Estimated number of deaths in USA from 2007-2014.'),
    richBlock([
      { text: 'View on GitHub', marks: [ghLink.markKey] },
      { text: ' · ' },
      { text: 'Download Poster', marks: [posterLink.markKey] },
      { text: ' · ' },
      { text: 'Raw Data', marks: [dataLink.markKey] },
      { text: ' · ' },
      { text: 'Connect', marks: [emailLink.markKey] },
    ], 'normal', [ghLink.markDef, posterLink.markDef, dataLink.markDef, emailLink.markDef]),
  )

  if (refs.length > 0) content.push(referencesBlock(refs))

  return content
}

async function buildEbolaCareGuideline() {
  console.log('  Uploading images...')
  const heroImg = await uploadImage(
    `${CDN}/images/features/ebola-care-guideline/ebola-care-guideline-featured.jpg`,
    'ebola-care-guideline-hero.jpg'
  )

  const emailLink = linkMark('mailto:stopebola@goinvo.com')
  const relatedLink = linkMark('/vision/understanding-ebola')

  // The Gatsby version has a "Care Cards" related section - let's include it
  const careCardsLink = linkMark('https://www.goinvo.com/features/care-cards', true)

  const content = []

  content.push(
    textBlock('An Illustrated Process on Personal Protective Equipment', 'h4'),
    textBlock('The recommended Personal Protective Equipment (PPE) that healthcare workers wear in Ebola treatment areas\u2014waterproof apron, surgical gown, surgical cap, respirator, face shield, boots, and two layers of gloves\u2014significantly reduces the body\u2019s normal way of getting rid of heat by sweating.'),
    textBlock('The PPE holds excess heat and moisture inside, making the worker\u2019s body even hotter. In addition, the increased physical effort to perform duties while carrying the extra weight of the PPE can lead to the healthcare worker getting hotter faster. Wearing PPE increases the risk for heat-related illnesses.'),
    ctaButton('Download PDF', 'http://goinvo.com/features/ebola-care-guideline/files/ebola_care_guideline.pdf', 'secondary', true),
    richBlock([
      { text: 'Email ' },
      { text: 'stopebola@goinvo.com', marks: [emailLink.markKey] },
      { text: ' to provide feedback and help evolve this document.' },
    ], 'normal', [emailLink.markDef]),
    dividerBlock(),
    // Related section - Understanding Ebola
    textBlock('Related', 'h2Center'),
    richBlock([
      { text: 'Understanding Ebola: A Visual Guide', marks: [relatedLink.markKey] },
    ], 'normal', [relatedLink.markDef]),
    textBlock('A comprehensive infographic covering the Ebola virus, its history, transmission, symptoms, diagnosis, treatment, and prevention.'),
    dividerBlock(),
    // Care Cards section (from Gatsby)
    textBlock('Care Cards', 'h2Center'),
    richBlock([
      { text: 'The mighty little deck of cards that will change your health habits.', marks: [] },
    ], 'normal', []),
    richBlock([
      { text: 'View Care Cards', marks: [careCardsLink.markKey] },
    ], 'normal', [careCardsLink.markDef]),
  )

  return content
}

async function buildPrintBig() {
  console.log('  Uploading images...')
  const images = {}
  const imgPaths = {
    'crane-delivery': '/old/images/features/print-big/crane-delivery.jpg',
    'crane-delivery-2': '/old/images/features/print-big/crane-delivery-2.jpg',
    'point-1': '/old/images/features/print-big/point-1.jpg',
    'point-2': '/old/images/features/print-big/point-2.jpg',
    'point-3': '/old/images/features/print-big/point-3.jpg',
    'point-4': '/old/images/features/print-big/point-4.jpg',
    'point-5': '/old/images/features/print-big/point-5.jpg',
    'end': '/old/images/features/print-big/end.jpg',
  }

  for (const [name, path] of Object.entries(imgPaths)) {
    images[name] = await uploadImage(`${CDN}${path}`, `print-big-${name}.jpg`)
    if (images[name]) console.log(`    Uploaded: ${name}`)
    else console.log(`    FAILED: ${name}`)
  }

  const aLink = linkMark('http://arlingtonvisualbudget.org/', true)

  const content = [
    textBlock('After almost a decade, we finally replaced our printer.'),
    textBlock('OK, so that doesn\u2019t sound particularly momentous. Most printers cost tens or hundreds of dollars and are one step away from being merely disposable. Not our printer! Here is a picture of it being installed earlier this month:'),
  ]

  if (images['crane-delivery']) content.push(imageBlock(images['crane-delivery'], 'Epson P20000 printer sitting on truck ready to be hoisted by a crane', 'full'))
  if (images['crane-delivery-2']) content.push(imageBlock(images['crane-delivery-2'], 'Epson P20000 printer hoisted in the sky by a crane', 'full'))

  content.push(
    textBlock('Yes, that is a crane bringing our printer into our studio. It is a Big Printer. An Epson P20000. We are generally pretty frugal as a business, but our printer is most definitely a splurge. It even has a name: HAL.'),
    textBlock('Splurging on a printer might seem like a predictable thing for a design studio to do. But our commitment to printing big isn\u2019t about nerding out on lovely design. It is about putting vision ahead of execution. About considering the bigger picture. About focusing on the more important things. I know: these things don\u2019t sound relevant to the use of a printer. Let me share five ways in which it supports our commitment to think big:'),
  )

  // Section 1
  if (images['point-1']) content.push(imageBlock(images['point-1'], 'Large scale design of the Standard Health Record ecosystem', 'full'))
  content.push(
    textBlock('1. See the whole system together', 'h2'),
    textBlock('The world is split into seemingly infinite pieces, making the most difficult problems to solve often appear impossible. We can\u2019t see everything that needs to be considered, much less parse what is important to consider or not. It is no wonder that our current political environment is increasingly partisan and seemingly intractable!'),
    textBlock('At the scale of business, system problems are also complex. Not only are there a variety of domains, such as considerations relating to the market, customers, and competitors to name just three, each domain has extensive things to be considered. Truly integrating all of them into planning and decision making requires all of awareness, understanding, relevance, and prioritization of each of them. At best, it\u2019s complicated. At worst, it\u2019s an unnavigable quagmire.'),
    textBlock('We use our big printer to create system maps that contain everything. Whereas, in strategy, the pieces and parts are typically nested in different documents that do not allow everything to be seen at once, the ability to see everything at once, at anytime, is core to our approach. In order to work through challenges you need to see the whole thing. And you shouldn\u2019t need to struggle to read the details. We know this commitment to visualizing the big picture lets us create better systems.'),
  )

  // Section 2
  if (images['point-2']) content.push(imageBlock(images['point-2'], 'A smiling woman kneels in front of a wall filled with large scale design print-outs', 'full'))
  content.push(
    textBlock('2. Make the details important', 'h2'),
    textBlock('Details are easy to miss. Have you ever done an offset printing project for something like a brochure? The most critical step in the entire creationary process is pouring over the proofs and looking for any little error. After all, once they get the giant printing presses started, there is no going back. Any errors you missed are permanently in your brochure \u2014 unless you want to pay double to run the whole damn thing over again.'),
    textBlock('It is easy to miss the little details. Modern work is splintered into myriad responsibilities and activities. Keeping track of our various domains are hard enough; properly addressing all of the small details to do our thing consistently optimal can feel impossible. It is too simple for tiny bits to get lost in a sea of everything.'),
    textBlock('Big things are hard to lose. By printing our work big, we can show it big. Things that would be miniscule or even excluded in a more traditional representation are instead easy to see and, consequently, easy to think about. Their large presence makes them something that can\u2019t be ignored. It allows all of the details to be considered and addressed \u2014 before the bits and bytes start getting pushed and changes, like in the example of printing the brochure, become far more expensive.'),
  )

  // Section 3
  if (images['point-3']) content.push(imageBlock(images['point-3'], 'A designer and client huddle around a table with a large scale design print-out, pointing to areas', 'full'))
  content.push(
    textBlock('3. Invite everyone to participate', 'h2'),
    textBlock('I don\u2019t know about you, but I generally feel powerless to impact the world. Why? The influence and decision making process is entirely removed from my view, let alone my engagement. Sure, I know how democracy works and that my involvement is through the proxy of my elected officials. But that is hardly any better. I don\u2019t even know if things are happening that I should care about, because I am not aware of them. Once I\u2019m aware of them, all I can do is write or call my representative. I\u2019m neutered from influencing the policies that impact my life.'),
    textBlock('When working in large companies, I often felt similarly disempowered. Policies and strategies changed without warning or explanation. Ill-conceived new initiatives started that seemed ignorant of on-the-ground knowledge that could have made the initiative more successful from the very beginning. My being structurally disconnected squandered my ability to contribute while demoralizing me and making me feel outside of the team and culture. This is the modus operandi in most companies, especially large ones.'),
    richBlock([
      { text: 'This learned complacency has to be broken. It\u2019s not good enough only to write your state representative or plead design efforts to executives. We need to organize, make, and feed our local futures, and not lose heart at each set back. (For one example, see ' },
      { text: 'Arlington Visual Budget', marks: [aLink.markKey] },
      { text: '.)' },
    ], 'normal', [aLink.markDef]),
    textBlock('Large prints invite everyone to participate. This is true in a small meeting where, instead of people huddling and squinting to see what is going on they can take their own space and time and comfort to explore what we have to share. It is also true in the everyday rhythm of the company. One of the most powerful cultural impacts we have is when our big print deliverables are hung up on a wall at our clients. It invites everyone to walk up and take a look. To discuss. To think. To share ideas. Suddenly, for example, a financial administrator is involved in the innovation process. They feel bought in. They ask questions and share ideas. They raise concerns. The extended tribe of participants now includes many people. The work we are doing is better for it; the company culture is better for it. The dynamic is, in a word, wonderful.'),
  )

  // Section 4
  if (images['point-4']) content.push(imageBlock(images['point-4'], 'Invo\u2019s Care Cards printed as large posters, hung up in various areas of the doctor\u2019s office', 'full'))
  content.push(
    textBlock('4. Support a perpetual process', 'h2'),
    textBlock('Change is a process, not an event. Yet, so much of the world implements change as if it were an event, something to be done with and move past. Much of this is the product of physical limitations. For example, the sheer volume of legislation a government needs to process, requiring a focus change once an issue has been \u201Cresolved\u201D. Or, the physical constraints of the brochure we mentioned earlier which, once it has been printed, has to be done. The cost of paper, ink, and machineworks dictates it.'),
    textBlock('The digital world has changed this, somewhat. Websites shifted the creative process for business away from the \u201Cbig button\u201D publishing model over to one of incremental and perpetual change. The lack of limitations in digital publishing compared to analog enabled this, subsequently refined over more than two decades. This carried over to areas like product development, making once-niche approaches like lean engineering what is increasingly a ubiquitous standard.'),
    textBlock('Remember the point about putting big prints on the wall for all to see? Inclusivity and participation are part of that, but so is a commitment to iteration and perpetual improvement. The presence of the work in a format and environment that encourages engagement from all results in a form of intellectual testing and retesting that goes on for the weeks, months, or years that the invention or innovation requires. It moves the work from one of deliverable drops and coarse opportunities for interactivity to a perpetual process of refinement. The results are spectacular.'),
  )

  // Section 5
  if (images['point-5']) content.push(imageBlock(images['point-5'], 'Overhead shot of Invo artwork printed very large, spread out on the floor with team scattered around', 'full'))
  content.push(
    textBlock('5. Encourage play to stimulate success', 'h2'),
    textBlock('Over the last 20 years we\u2019ve seen the boundaries between our work lives and personal lives blur. This is a product of technology, as things like email, laptops, and smartphones equipped us with magical devices that erased the constraints of time.'),
    textBlock('Yet, while our work and personal lives are blurring, our work is scarcely becoming any more fun. We are losing part of our personal lives, where we can let our hair down and express ourselves, which is merely being appropriated by our work. And for most people, work remains work. One of my favorite quotes is from playwright Noel Coward. Looking back on his life he remarked \u201CWork was more fun than fun.\u201D Is that the case for you? For most of us? Hardly.'),
    textBlock('As a design studio, it is taken for granted that we offer a work environment that is more expressive and, yes, fun than what a typical corporation is able to offer. But HAL allows us to take that to a different level, in a way that any company can as well. Both in the client work we are proud of and amazed by, and in our own advocacy and internal projects, our big printer enables us to amplify those efforts. Beautiful art is lovely and feels good but is not necessarily fun. Beautiful art printed out at a massive scale that would impress even the Banksy and Shepard Fairey\u2019s of the world? FUN! Decidedly, unambiguously fun.'),
  )

  // Closing
  if (images['end']) content.push(imageBlock(images['end'], 'Invo team members having fun displaying their Healthcare is a Human Right large-scale print-out', 'full'))
  content.push(
    textBlock('So, sure. HAL is likely not going to completely change the world. It certainly helps us to make better things, and to have and help build cultures that encourage creativity, inclusion, and perpetual improvement. It makes us happier. And the things we make change lives, in some cases millions of them.'),
    richBlock([{ text: 'You know, HAL just might be changing the world after all.', marks: ['strong'] }]),
  )

  return content
}

async function buildUnderstandingEbola() {
  console.log('  Uploading 7 infographic panels + related image...')
  const panels = []
  for (let i = 1; i <= 7; i++) {
    const padded = String(i).padStart(2, '0')
    const img = await uploadImage(
      `${CDN}/old/images/features/ebola/Ebola-${padded}.png`,
      `understanding-ebola-${padded}.png`
    )
    if (img) {
      console.log(`    Uploaded: panel ${i}`)
      panels.push(img)
    } else {
      console.log(`    FAILED: panel ${i}`)
    }
  }

  const relatedImg = await uploadImage(
    `${CDN}/old/images/features/ebola/Ebola-08.png`,
    'understanding-ebola-related.png'
  )

  const panelAlts = [
    'Understanding Ebola - Introduction to Ebola: origins, history, and overview of the virus',
    'Ebola cases by year - a timeline of outbreaks and their scope',
    'Ebola transmission - how the virus spreads from person to person',
    'Ebola symptoms - the progression of symptoms from early to late stages',
    'Ebola diagnosis and treatment - medical procedures and care protocols',
    'Ebola prevention and control - measures to stop the spread of the virus',
    'Potential spread of Ebola - risk factors and global implications',
  ]

  const emailLink = linkMark('mailto:stopebola@goinvo.com')
  const relatedLink = linkMark('/vision/ebola-care-guideline')
  const soapLink = linkMark('https://www.designbysoap.co.uk', true)

  const content = [
    textBlock('A Visual Guide', 'h4'),
    textBlock('A comprehensive infographic covering what everyone should know about the Ebola virus, from its origins and transmission to symptoms, treatment, and prevention.'),
    ctaButton('Download PDF', 'https://www.goinvo.com/features/ebola/understanding_ebola.pdf', 'secondary', true),
    dividerBlock(),
  ]

  // Add infographic panels
  for (let i = 0; i < panels.length; i++) {
    content.push(imageBlock(panels[i], panelAlts[i] || '', 'full'))
  }

  content.push(
    dividerBlock(),
    richBlock([
      { text: 'Email ' },
      { text: 'stopebola@goinvo.com', marks: [emailLink.markKey] },
      { text: ' to provide feedback and help evolve this document.' },
    ], 'normal', [emailLink.markDef]),
    dividerBlock(),
  )

  // Related section
  if (relatedImg) content.push(imageBlock(relatedImg, 'Ebola Care Guideline - An illustrated process on personal protective equipment', 'full'))
  content.push(
    richBlock([
      { text: 'Ebola Care Guideline', marks: [relatedLink.markKey] },
    ], 'normal', [relatedLink.markDef]),
    textBlock('An Illustrated Process on Personal Protective Equipment'),
    dividerBlock(),
    richBlock([
      { text: 'Inspired by ' },
      { text: 'John Pring / Designbysoap', marks: [soapLink.markKey] },
    ], 'normal', [soapLink.markDef]),
  )

  return content
}

async function buildCarePlans() {
  console.log('  Uploading images...')
  const imgPaths = {
    'hero': '/old/images/features/careplans/home_hero.jpg',
    'part1': '/old/images/features/careplans/twitter_CP1.jpg',
    'part2': '/old/images/features/careplans/twitter_CP2.jpg',
    'part3': '/old/images/features/careplans/twitter_CP3.jpg',
    'together': '/old/images/features/careplans/work_together.jpg',
  }

  const images = {}
  for (const [name, path] of Object.entries(imgPaths)) {
    images[name] = await uploadImage(`${CDN}${path}`, `care-plans-${name}.jpg`)
    if (images[name]) console.log(`    Uploaded: ${name}`)
    else console.log(`    FAILED: ${name}`)
  }

  const ebookUrl = 'https://www.goinvo.com/old/images/features/careplans/CarePlans_Whitepaper_Involution_Studios.pdf'
  const presUrl = 'https://www.goinvo.com/old/images/features/careplans/Involution_Care_Plans_Presentation_13Sep16.pdf'
  const emailLink = linkMark('mailto:info@goinvo.com')
  const phoneLink = linkMark('tel:6178037043')

  const content = []

  if (images['hero']) content.push(imageBlock(images['hero'], 'The Care Plan Series', 'bleed'))

  content.push(
    buttonGroup([
      { label: 'Download eBook', url: ebookUrl, variant: 'secondary', external: true },
      { label: 'Download Presentation', url: presUrl, variant: 'secondary', external: true },
    ]),
    textBlock('Overwhelmed. It is how most patients feel at one point or another as they leave that sterile-smelling, fluorescent-lit doctor\u2019s office. They have just spent 10-25 minutes being hastily examined, diagnosed, and, if they are lucky, educated about their condition. Many depart without proper documentation or discharge plans, typically receiving only generic pamphlets that get discarded.'),
    textBlock('There is a loose, under-utilized semblance of a \u201Cplan of care\u201D in most health data sets. You\u2019ll find them mentioned in the standard Continuity of Care Document (CCD), the FHIR framework, and CMS\u2019s recent chronic care management documentation requirements. But the concept of a standardized, comprehensive care plan remains poorly understood and dramatically underutilized. GoInvo collaborated with designers, engineers, and field experts to comprehensively research and visualize care plan concepts across three feature installments.'),
    dividerBlock(),
  )

  // Three parts with images
  content.push(textBlock('Part 1: Overview', 'h3'))
  if (images['part1']) content.push(imageBlock(images['part1'], 'Care Plans Part 1: Overview', 'medium'))
  content.push(textBlock('The first feature examines how the concept of a care plan came to be and our understanding of it today.'))

  content.push(textBlock('Part 2: Landscape', 'h3'))
  if (images['part2']) content.push(imageBlock(images['part2'], 'Care Plans Part 2: Landscape', 'medium'))
  content.push(textBlock('The second feature visualizes the current care planning process and limitations, and evaluates existing care plan-related services.'))

  content.push(textBlock('Part 3: Future', 'h3'))
  if (images['part3']) content.push(imageBlock(images['part3'], 'Care Plans Part 3: Future', 'medium'))
  content.push(textBlock('The third feature explores what these findings mean for the future of care plans and our shifting healthcare system, and proposes a call to action.'))

  content.push(
    dividerBlock(),
    textBlock('Our Goals', 'h2'),
    textBlock('Our feature series has three goals. We aim to spread both awareness to the general public about the benefit of care planning, as well as empowerment to demand such practices from doctors. We aim to inspire healthcare professionals, designers, and entrepreneurs to prioritize care plans when innovating healthcare products and services. And we aim to encourage policymakers to establish care plan databases and evaluate the costs of implementation.'),
    textBlock('Only in a new era of digital, standardized, adaptive care plans can we truly promote preventative self care.'),
    buttonGroup([
      { label: 'Download eBook', url: ebookUrl, variant: 'secondary', external: true },
      { label: 'Download Presentation', url: presUrl, variant: 'secondary', external: true },
    ]),
    dividerBlock(),
    textBlock('Want to Work Together?', 'h2'),
    richBlock([
      { text: 'Email: ' },
      { text: 'info@goinvo.com', marks: [emailLink.markKey] },
    ], 'normal', [emailLink.markDef]),
    richBlock([
      { text: 'Phone: ' },
      { text: '617-803-7043', marks: [phoneLink.markKey] },
    ], 'normal', [phoneLink.markDef]),
    textBlock('661 Massachusetts Ave, 3rd Floor, Arlington MA, 02476'),
  )

  if (images['together']) content.push(imageBlock(images['together'], 'GoInvo studio', 'full'))

  content.push(
    dividerBlock(),
    textBlock('GoInvo specializes in healthcare user experience design. Since 2004, the firm has created software for companies ranging from market leaders such as Apple, Johnson & Johnson, Partners HealthCare, and Walgreens, to emerging startups. Their applications serve over 150 million users. The studio\u2019s deep expertise in genomics design, healthcare IT, mHealth, wearables, and emerging technologies positions them to craft innovative digital and physical solutions.'),
  )

  return content
}

// ============================================================
// Main
// ============================================================

const PAGE_BUILDERS = {
  'killer-truths': buildKillerTruths,
  'ebola-care-guideline': buildEbolaCareGuideline,
  'print-big': buildPrintBig,
  'understanding-ebola': buildUnderstandingEbola,
  'care-plans': buildCarePlans,
}

async function processPage(slug) {
  const builder = PAGE_BUILDERS[slug]
  if (!builder) {
    console.log(`  No builder for "${slug}"`)
    return false
  }

  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] { _id, title }`,
    { slug }
  )

  if (!doc) {
    console.log(`  Document not found for "${slug}"`)
    return false
  }

  if (dryRun) {
    console.log(`  DRY RUN - would rebuild content for ${doc.title} (${doc._id})`)
    return true
  }

  const content = await builder()
  console.log(`  Generated ${content.length} blocks`)

  await client.patch(doc._id).set({ content }).commit()
  console.log(`  Patched "${doc.title}" with ${content.length} blocks (including images)`)
  return true
}

async function main() {
  const toProcess = doAll
    ? Object.keys(PAGE_BUILDERS)
    : slugs.length > 0
      ? slugs
      : Object.keys(PAGE_BUILDERS)

  console.log(`\nProcessing ${toProcess.length} pages${dryRun ? ' (DRY RUN)' : ''}...\n`)

  for (const slug of toProcess) {
    console.log(`\n=== ${slug} ===`)
    await processPage(slug)
  }

  console.log('\nDone!\n')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
