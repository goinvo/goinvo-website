import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', quiet: true })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is required')

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token: token || process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
})

const descriptions = {
  'own-your-health-data':
    'A rallying call for patients to control how their health data is used, shared, sold, donated, protected, and deleted.',
  'how-to-vote-early':
    'A two-step illustrated guide to checking your registration and voting early in person or by mail.',
  'precision-autism':
    'A visual history of autism diagnosis and research paired with a roadmap for precision medicine and individualized care.',
  'test-treat-trace':
    'An illustrated pandemic response playbook showing how testing, treatment, isolation, monitoring, and contact tracing work together.',
  washhands:
    'A 20-second, sing-along handwashing guide that covers every surface of the hands and the everyday objects that need cleaning too.',
  vapepocolypse:
    'An illustrated snapshot of vaping-related lung injury, who it affected, and the reported US case count behind the 2019 outbreak.',
  'who-uses-my-health-data':
    'A map of the hidden health-data economy, showing how information moves among clinicians, insurers, brokers, advertisers, and other third parties.',
  'health-payment-system-complexity':
    'A quantified breakdown of the clinical time, billing labor, and administrative overhead consumed by the US healthcare payment system.',
  'insuring-price-increase':
    'An evidence-based look at how hospital consolidation, negotiating leverage, and insurer incentives drive prices higher without improving care.',
  'healthcare-dollars':
    'A flow map tracing US healthcare dollars from public and private sources through individuals, institutions, and care delivery.',
  'determinants-of-health-spanish':
    'Una visualización de cómo la conducta, el entorno, la situación socioeconómica, la atención médica y la biología influyen en nuestra salud.',
  'determinants-of-health':
    'A systems map showing how behavior, environment, socioeconomic conditions, medical care, and biology shape health outcomes.',
  'open-healthcare-systems':
    'An architecture diagram connecting precision-care experiences, health-data layers, clinical services, and open standards into one healthcare system.',
  'virtual-care-encounters':
    'A matrix showing which routine, acute, postoperative, reproductive, and prenatal encounters can be handled by text or a mobile device.',
  'open-source-healthcare':
    'A visual introduction to the Open Source Healthcare Journal and its argument that healthcare knowledge and tools should be shared freely.',
  'hie-data-access':
    'A hand-drawn workflow showing how a patient and clinicians request, exchange, and retrieve records across multiple health information exchanges.',
  'sources-of-clinical-data':
    'A reference map of the organizations and settings that generate clinical health data, from hospitals and labs to trials, agencies, and senior homes.',
  'sources-of-data':
    'A radial map of the health, financial, occupational, entertainment, government, and social data generated around one person.',
  'sdoh-spend':
    'A comparison of US intervention spending with each determinant’s health impact, revealing the gap between medical investment and what most shapes health.',
  'critical-mass':
    'A Massachusetts map pairing community-level data with essential health and care indicators to show where needs and resources diverge.',
  ebola:
    'A step-by-step guide to safely putting on and removing protective equipment for Ebola care, with contamination points called out on the body.',
  'data-interop':
    'A blueprint for health-data interoperability built on standardized measurements, algorithms, and services.',
  'healthcare-is-a-human-right':
    'A bold reinterpretation of the Statue of Liberty that asserts healthcare as a human right.',
  'examine-yourself':
    'A reminder to pay attention to your body and make preventive self-examination part of everyday care.',
  'sugar-kills':
    'A stark warning about excess sugar, rendered as a skull-and-crossbones sugar bowl.',
  'make-things':
    'A Design Axiom urging teams to leave abstraction behind, use their hands, and turn ideas into tangible work.',
  'let-data-scream':
    'A Design Axiom calling for evidence to lead the story and make the direction unmistakable.',
  'prototype-like-crazy':
    'A Design Axiom celebrating fast, prolific prototyping as the way to learn, challenge assumptions, and improve ideas.',
  'care-plans-process':
    'A patient-centered guide showing how concerns, goals, interventions, and a coordinated care team come together in a living care plan.',
  'shr-medical-encounter':
    'A detailed journey map tracing patient, provider, and system touchpoints before, during, and after a medical encounter.',
  'care-plans-ecosystem':
    'A systems diagram showing how patients, care teams, apps, devices, and health services connect around a shared care plan.',
}

const documents = await client.fetch(`
  *[_type == "healthVisualization" && !(_id in path("drafts.**"))]
    | order(coalesce(order, 100) asc, title asc) {
      _id,
      title,
      "slug": slug.current,
      caption,
      "imageUrl": image.asset->url,
      downloadLink,
      learnMoreLink
    }
`)

if (documents.length !== 31) {
  throw new Error(`Expected 31 published health visualizations, found ${documents.length}`)
}

const documentBySlug = new Map(documents.map((document) => [document.slug, document]))
const missingDocuments = Object.keys(descriptions).filter((slug) => !documentBySlug.has(slug))
const missingDescriptions = documents.filter((document) => !descriptions[document.slug])

if (missingDocuments.length || missingDescriptions.length) {
  throw new Error(
    `Description coverage mismatch. Missing documents: ${missingDocuments.join(', ') || 'none'}. ` +
      `Missing descriptions: ${missingDescriptions.map((document) => document.slug).join(', ') || 'none'}.`,
  )
}

const changes = documents
  .map((document) => ({
    _id: document._id,
    slug: document.slug,
    title: document.title,
    previous: document.caption || '',
    next: descriptions[document.slug],
  }))
  .filter((change) => change.previous !== change.next)

if (process.argv.includes('--write')) {
  if (!token) throw new Error('SANITY_WRITE_TOKEN is required with --write')

  let transaction = client.transaction()
  for (const change of changes) {
    transaction = transaction.patch(change._id, { set: { caption: change.next } })
  }
  if (changes.length > 0) await transaction.commit()
  console.log(`Updated ${changes.length} health visualization descriptions.`)
} else {
  console.log(JSON.stringify(changes, null, 2))
  console.log(`Review complete: ${changes.length} descriptions would change. Run with --write to apply.`)
}
