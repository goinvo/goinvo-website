/**
 * Migrate digital-healthcare content to Sanity.
 *
 * Uploads 8 section images, builds Portable Text blocks for the full article,
 * sets the subtitle, links authors, and patches the existing feature document.
 *
 * Usage:
 *   node scripts/migrate-digital-healthcare.mjs
 *   node scripts/migrate-digital-healthcare.mjs --dry-run
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
const dryRun = process.argv.includes('--dry-run')
const key = () => randomUUID().slice(0, 12)

// ---------------------------------------------------------------------------
// Block helpers (same pattern as upload-images-to-sanity.mjs)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Image definitions for all 8 sections
// ---------------------------------------------------------------------------

const IMAGES = [
  {
    path: '/old/images/features/digital-healthcare/digital_health_1.jpg',
    filename: 'digital-healthcare-1.jpg',
    alt: 'Medication adherence illustration showing sensor technology and digital tracking',
  },
  {
    path: '/old/images/features/digital-healthcare/digital_health_2_v02.jpg',
    filename: 'digital-healthcare-2.jpg',
    alt: 'Conversational interfaces illustration showing voice recognition and AI interaction',
  },
  {
    path: '/old/images/features/digital-healthcare/digital_health_3.jpg',
    filename: 'digital-healthcare-3.jpg',
    alt: 'Health prediction analytics illustration showing patient scoring and data visualization',
  },
  {
    path: '/old/images/features/digital-healthcare/digital_health_4.jpg',
    filename: 'digital-healthcare-4.jpg',
    alt: 'Disease detection illustration showing smartphone as a health diagnostic tool',
  },
  {
    path: '/old/images/features/digital-healthcare/digital_health_5.jpg',
    filename: 'digital-healthcare-5.jpg',
    alt: 'Digital care planning illustration showing patient-physician collaboration',
  },
  {
    path: '/old/images/features/digital-healthcare/digital_health_6.jpg',
    filename: 'digital-healthcare-6.jpg',
    alt: 'Computable medical records illustration showing next-generation EHR concepts',
  },
  {
    path: '/old/images/features/digital-healthcare/digital_health_7.jpg',
    filename: 'digital-healthcare-7.jpg',
    alt: 'Patient engagement illustration showing self-care and digital health tools',
  },
  {
    path: '/old/images/features/digital-healthcare/digital_health_8.jpg',
    filename: 'digital-healthcare-8.jpg',
    alt: 'Virtual helpers illustration showing AI health companions and digital assistants',
  },
]

// ---------------------------------------------------------------------------
// Build content blocks
// ---------------------------------------------------------------------------

async function buildContent() {
  // Upload all images
  console.log('  Uploading 8 section images...')
  const images = []
  for (let i = 0; i < IMAGES.length; i++) {
    const img = await uploadImage(`${CDN}${IMAGES[i].path}`, IMAGES[i].filename)
    if (img) {
      console.log(`    Uploaded: section ${i + 1} (${IMAGES[i].filename})`)
    } else {
      console.log(`    FAILED: section ${i + 1} (${IMAGES[i].filename})`)
    }
    images.push(img)
  }

  const content = []

  // --- Section 1: Medication Adherence ---
  if (images[0]) content.push(imageBlock(images[0], IMAGES[0].alt, 'full'))
  content.push(
    textBlock('1. Medication Adherence', 'h2'),
    textBlock('...gets a boost from sensor tech', 'h4'),
    textBlock('Solving the complex problem of medication adherence could have a huge impact on lowering cost of care; it\u2019s no surprise that millions of dollars have already been invested in digital health software to guide the process. In 2016, expect the basics of digital adherence \u2014 self-reporting, tracking refills and chronic disease outcomes, etc. \u2014 will receive a boost from the use of sensors to collect confirming data, whether it\u2019s via breath analysis, urine sampling, or another non-invasive method.'),
  )

  // --- Section 2: Talking to Technology ---
  if (images[1]) content.push(imageBlock(images[1], IMAGES[1].alt, 'full'))
  content.push(
    textBlock('2. Talking to Technology', 'h2'),
    textBlock('Conversational interfaces go mainstream.', 'h4'),
    textBlock('The conversational user interface \u2014 driven by advances in voice recognition technology in conjunction with artificial intelligence, capable of understanding the content and context of patient concerns \u2014 has already found its way into digital health software systems. Whether incorporated into mHealth apps for motivating health and fitness engagement, as part of the digital prescription adherence user experience, or incorporated into interactive systems for outpatient education, expect the conversational user interface to gain traction and become mainstream in 2016.'),
  )

  // --- Section 3: Predicting Health ---
  if (images[2]) content.push(imageBlock(images[2], IMAGES[2].alt, 'full'))
  content.push(
    textBlock('3. Predicting Health', 'h2'),
    textBlock('Analytics debut for patients and clinicians, not just payers.', 'h4'),
    textBlock('While payers have had patient health analytics software for a few years already, in 2016, we can expect patient scoring and health analysis to make its way into the hands of the clinicians and patients. Software tools for visualizing a patient\u2019s complete range of health metrics, along with clinically validated algorithms for scoring a holistic view of patient health will make their debut. These will provide clinicians with at-a-glance analytics of a patient\u2019s overall health, allowing doctors to spot patterns and red flags by comparing a person\u2019s health data against targeted health ranges, based on factors like age and gender.'),
  )

  // --- Section 4: Disease Detection ---
  if (images[3]) content.push(imageBlock(images[3], IMAGES[3].alt, 'full'))
  content.push(
    textBlock('4. Disease Detection', 'h2'),
    textBlock('...on your smart phone', 'h4'),
    textBlock('Imagine your smart phone as a non-invasive health sniffer, a feat of which it is already technically capable. It can view you, via its cameras; listen to you via its microphone; and even pick up your gait, via its accelerometer. Such information can ultimately be used to help diagnose such diseases as depression and Parkinson\u2019s. The current confluence of sensor tech, data analytics maturity, hardware durability, miniaturization, and industrial evolution has created a perfect storm for capturing biologic metrics and determining trends. In 2016, we\u2019ll have a good first cut at a disease detection model that is personally meaningful and changes behavior.'),
  )

  // --- Section 5: Digital Care Planning ---
  if (images[4]) content.push(imageBlock(images[4], IMAGES[4].alt, 'full'))
  content.push(
    textBlock('5. Digital Care Planning', 'h2'),
    textBlock('It\u2019s how to get better patient outcomes in a tech driven world.', 'h4'),
    textBlock('Digital care planning will be a key factor driving better health outcomes and prices. The personal care plan will serve as a contract between patient and physician to commit to improving and maintaining patient health. The care plan will include patient / physician goals and the rationale for those goals, as well as a plan for case management and rehabilitation, psychological health, exercise, nutrition, birth / sexual health, and advance care / death.'),
  )

  // --- Section 6: Computable Records ---
  if (images[5]) content.push(imageBlock(images[5], IMAGES[5].alt, 'full'))
  content.push(
    textBlock('6. Computable Records', 'h2'),
    textBlock('The next generation of the EMR conversation.', 'h4'),
    textBlock('In 2016 and onward, computable medical records will fuel the next generation of EHRs, as the quest for interoperable, portable, and comprehensive health data continues. Computable medical records, readable by both human and machine, will house a patient\u2019s entire record from conception to death. Importantly, such records will declare their fidelity level \u2014 their degree of completeness and accuracy \u2014 so that users can not only identify what data is there, but also what\u2019s missing.'),
    textBlock('The computable medical record will be unique, enabling users to find the right record for the right person; will support a health status scoring system; and will ideally be open source to drive adoption across software vendors, hospital systems, and government.'),
  )

  // Paragraph with inline link (MITRE JASON report)
  const mitreLink = linkMark('http://healthit.gov/sites/default/files/ptp13-700hhs_white.pdf', true)
  content.push(
    richBlock([
      { text: 'FHIR (HL7\u2019s latest attempt at a health data exchange) is a step in the right direction. The Argonauts are working on a handful of profiles and core data services, according to John Halamka, CIO of Beth Israel Deaconess Hospital. They\u2019re implementing the API as recommended by the ', marks: [] },
      { text: 'MITRE JASON report', marks: [mitreLink.markKey] },
      { text: '. While a far cry from a \u201Ccomputable medical record\u201D, it\u2019s a hopeful signal flare for U.S. progress in digital healthcare.', marks: [] },
    ], 'normal', [mitreLink.markDef]),
  )

  // Small credit text with link
  const crucibleLink = linkMark('http://projectcrucible.org', true)
  content.push(
    richBlock([
      { text: 'Data and images taken from ', marks: [] },
      { text: 'projectcrucible.org', marks: [crucibleLink.markKey] },
    ], 'normal', [crucibleLink.markDef]),
  )

  // --- Section 7: Patient Engagement ---
  if (images[6]) content.push(imageBlock(images[6], IMAGES[6].alt, 'full'))
  content.push(
    textBlock('7. Patient Engagement', 'h2'),
    textBlock('Most care is self care.', 'h4'),
  )

  // Paragraph with bold text
  content.push(
    richBlock([
      { text: 'The startling truth is that ', marks: [] },
      { text: '99% of healthcare is self care', marks: ['strong'] },
      { text: ' and that the actions of individuals rather than institutions are key to improving our healthcare system. Patients who are actively engaged in the management of their own healthcare increase the likelihood of having improved outcomes, reduced costs, and a better overall experience. In 2016, we can expect to see a rise in digital systems with a deep focus on patient engagement and interventions. These could include software like digital coaching and coordinated outpatient education \u2014 well-architected services that direct the right information to patients outside the clinical environment, especially for mental health.', marks: [] },
    ]),
  )

  // --- Section 8: Virtual Helpers ---
  if (images[7]) content.push(imageBlock(images[7], IMAGES[7].alt, 'full'))
  content.push(
    textBlock('8. Virtual Helpers', 'h2'),
    textBlock('The digital health companion in your pocket: Siri meets Dr. Watson.', 'h4'),
    textBlock('Virtual helpers will leverage human-modeled artificial intelligence to provide both health coaching and resources to motivate patients. Such mHealth companions will assist people in adhering to their care plans, their prescription regimens, and even outpatient treatment for complex, chronic conditions. These helpers might expand past the 2D mobile platform, seeping into other more physical services such as Echo, Nest, and Jibo.'),
  )

  return content
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const slug = 'digital-healthcare'
  console.log(`\n=== Migrating ${slug} ===\n`)

  // Fetch the existing document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] { _id, title }`,
    { slug }
  )

  if (!doc) {
    console.error(`  ERROR: Feature document not found for slug "${slug}"`)
    process.exit(1)
  }

  console.log(`  Found document: ${doc.title} (${doc._id})`)

  if (dryRun) {
    console.log('  DRY RUN - would build content and patch document')
    console.log('  Would set subtitle, link 3 authors, and upload 8 images')
    return
  }

  // Build all content blocks (includes image uploads)
  const content = await buildContent()
  console.log(`  Generated ${content.length} blocks`)

  // Author references
  const authors = [
    { _type: 'reference', _ref: 'alumni-beckett-rucker', _key: key() },
    { _type: 'reference', _ref: 'team-jonathan-follett', _key: key() },
    { _type: 'reference', _ref: 'team-juhan-sonin', _key: key() },
  ]

  // Patch the document
  await client
    .patch(doc._id)
    .set({
      subtitle: "Your business will be obsolete if you aren\u2019t engaging in these 8 things next year.",
      content,
      authors,
    })
    .commit()

  console.log(`  Patched "${doc.title}" with:`)
  console.log(`    - subtitle`)
  console.log(`    - ${content.length} content blocks (8 images + headings + paragraphs)`)
  console.log(`    - ${authors.length} authors`)
  console.log('\nDone!\n')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
