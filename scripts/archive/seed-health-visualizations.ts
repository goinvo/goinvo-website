/**
 * Seed health visualization documents into Sanity.
 *
 * Usage:
 *   npx tsx scripts/seed-health-visualizations.ts
 *
 * Requires NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 * and SANITY_API_READ_TOKEN (with write permissions) in .env.local.
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually to avoid dotenv dependency
const envPath = resolve(__dirname, '../.env.local')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  // .env.local may not exist if env vars are set directly
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN

if (!projectId || !token) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const posters = [
  { id: 'own-your-health-data', title: 'Own Your Health Data', date: 'Oct.2021', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/own-your-health-data/OwnYourHealthData.pdf', learnMoreLink: '/vision/own-your-health-data/' },
  { id: 'how-to-vote-early', title: 'How To Vote Early', date: 'Sep.2020', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/how-to-vote-early.pdf', learnMoreLink: '' },
  { id: 'precision-autism', title: 'Precision Autism', date: 'Aug.2020', caption: 'Our open source visual depiction of the history of autism, and how precision medicine will help to define, manage, and treat the condition.', downloadLink: 'https://www.goinvo.com/pdf/vision/precision-autism/Precision-Autism-25.Aug.2020.pdf', learnMoreLink: '/vision/precision-autism/' },
  { id: 'test-treat-trace', title: 'Test. Treat. Trace.', date: 'Jun.2020', caption: 'The strategy to defeat pandemic viruses like COVID-19.', downloadLink: 'https://www.goinvo.com/pdf/vision/test-treat-trace/Test-Treat-Trace-18Jun2020.pdf', learnMoreLink: '/vision/test-treat-trace/' },
  { id: 'washhands', title: 'Wash Your Hands', date: 'Mar.2020', caption: 'A 20 second hand washing guide', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/understandingcoronavirus_wash-hands-poster.pdf', learnMoreLink: '/vision/coronavirus/' },
  { id: 'vapepocolypse', title: 'Vapepocolypse', date: 'Oct.2019', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/vapepocolypse/Vapepocolypse.pdf', learnMoreLink: '/vision/vapepocolypse/' },
  { id: 'who-uses-my-health-data', title: 'Who Uses My Health Data?', date: 'Jun.2019', caption: 'The health data trade has quietly grown with little patient or doctor knowledge.', downloadLink: 'https://www.goinvo.com/pdf/vision/health-data-use/health-data-use-poster-medium.pdf', learnMoreLink: '/vision/who-uses-my-health-data/' },
  { id: 'health-payment-system-complexity', title: 'Health Payment System Complexity', date: 'Mar.2019', caption: 'See how the complexity of our payment system impacts healthcare spending.', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/health-payment-system-complexity.pdf', learnMoreLink: '' },
  { id: 'insuring-price-increase', title: 'Insuring Price Increase', date: 'Feb.2019', caption: 'Hospitals and insurance set prices based on leverage and incentives.', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/insuring-price-increase.pdf', learnMoreLink: '' },
  { id: 'healthcare-dollars', title: 'Where Your Health Dollars Go', date: 'Feb.2019', caption: 'Tracking the allocation and flow of money in the US healthcare system to reveal connections within.', downloadLink: 'https://www.goinvo.com/pdf/vision/healthcare-dollars/healthcare-dollars-visualization.pdf', learnMoreLink: '/vision/healthcare-dollars/' },
  { id: 'determinants-of-health-spanish', title: 'Determinantes de la Salud', date: 'Apr.2020', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/determinantes_de_la_salud_42x50.pdf', learnMoreLink: '/vision/determinants-of-health/' },
  { id: 'determinants-of-health', title: 'Determinants of Health', date: 'Feb.2018', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/health-determinants.pdf', learnMoreLink: '/vision/determinants-of-health/' },
  { id: 'open-healthcare-systems', title: 'Open Healthcare Systems Model', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/precision-prism-architecture-diagram.pdf', learnMoreLink: '' },
  { id: 'virtual-care-encounters', title: 'Virtual Care Encounters', date: 'Feb.2019', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/virtual-care-encounters.pdf', learnMoreLink: '/vision/virtual-care/' },
  { id: 'open-source-healthcare', title: 'Open Source Healthcare Journal', date: 'Nov.2018', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/open-source-healthcare/open-source-healthcare-journal.pdf', learnMoreLink: '/vision/open-source-healthcare/' },
  { id: 'hie-data-access', title: 'HIE Data Access Workflow', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/hie-data-access-workflow.pdf', learnMoreLink: '' },
  { id: 'sources-of-clinical-data', title: 'Sources of Clinical Health Data', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/sources-of-clinical-health-data.pdf', learnMoreLink: '/work/fastercures-health-data-basics' },
  { id: 'sources-of-data', title: 'Sources of Your Personal Health Data', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/sources-of-data.pdf', learnMoreLink: '/work/fastercures-health-data-basics' },
  { id: 'sdoh-spend', title: 'Spending within the Determinants of Health', date: 'Jan.2019', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/sdoh-spend-v12.pdf', learnMoreLink: '/vision/determinants-of-health/#determinants-spending' },
  { id: 'critical-mass', title: 'Critical MASS', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/critical-mass.pdf', learnMoreLink: '' },
  { id: 'ebola', title: 'Ebola Care Guideline', date: 'Oct.2014', caption: 'An illustrated process on personal protective equipment.', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/ebola-care-guideline.pdf', learnMoreLink: 'https://www.goinvo.com/features/ebola-care-guideline/' },
  { id: 'data-interop', title: 'Standardized Data for Interoperability', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/standard-health-data.pdf', learnMoreLink: 'https://yes.goinvo.com/articles/a-path-towards-standardized-health' },
  { id: 'healthcare-is-a-human-right', title: 'Healthcare is a Human Right', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/care-card-healthcare-is-a-human-right.pdf', learnMoreLink: 'http://carecards.me/#healthcare-human-right' },
  { id: 'examine-yourself', title: 'Examine Yourself', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/care-card-examine-yourself.pdf', learnMoreLink: 'http://carecards.me/#examine-yourself' },
  { id: 'sugar-kills', title: 'Sugar Kills', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/care-card-sugar-kills-2.pdf', learnMoreLink: 'http://carecards.me/#sugar-kills' },
  { id: 'make-things', title: 'Make Things', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/design-axiom-make-things.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'let-data-scream', title: 'Let Data Scream', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/design-axiom-let-data-scream.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'prototype-like-crazy', title: 'Prototype Like Crazy', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/design-axiom-prototype-like-crazy-2.pdf', learnMoreLink: 'http://designaxioms.com/' },
  { id: 'care-plans-process', title: 'Care Planning Process', date: 'Mar.2016', caption: 'A patient guide to manage day-to-day health based on health concerns, goals, and interventions.', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/careplans-process.pdf', learnMoreLink: 'https://www.goinvo.com/features/careplans/' },
  { id: 'shr-medical-encounter', title: 'SHR Medical Encounter Journey Map', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/shr-medical-encounter-journey-map.pdf', learnMoreLink: '/work/mitre-shr' },
  { id: 'care-plans-ecosystem', title: 'Care Plans Ecosystem', date: '', caption: '', downloadLink: 'https://www.goinvo.com/pdf/vision/posters/careplans-ecosystem.pdf', learnMoreLink: 'https://www.goinvo.com/features/careplans/' },
]

async function seed() {
  console.log(`Seeding ${posters.length} health visualizations...`)

  const transaction = client.transaction()

  for (let i = 0; i < posters.length; i++) {
    const poster = posters[i]
    const doc = {
      _id: `healthViz-${poster.id}`,
      _type: 'healthVisualization',
      title: poster.title,
      slug: { _type: 'slug', current: poster.id },
      caption: poster.caption || undefined,
      date: poster.date || undefined,
      downloadLink: poster.downloadLink || undefined,
      learnMoreLink: poster.learnMoreLink || undefined,
      order: (i + 1) * 10,
    }

    transaction.createOrReplace(doc)
  }

  const result = await transaction.commit()
  console.log(`Done! Created/updated ${posters.length} documents.`, result.documentIds?.length ?? '')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
