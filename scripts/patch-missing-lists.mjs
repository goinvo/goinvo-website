/**
 * Convert paragraphs to bullet lists in Sanity for healthcare-ai and healthcare-dollars.
 *
 * These pages had bullet lists on Gatsby that were stored as flat paragraphs
 * during content migration. This script identifies the paragraphs by text matching
 * and converts them to Portable Text list items.
 *
 * Usage:
 *   node scripts/patch-missing-lists.mjs                # dry run
 *   node scripts/patch-missing-lists.mjs --write        # apply
 */
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const WRITE = process.argv.includes('--write')

/**
 * List items to convert, keyed by slug.
 * Each entry: { text (prefix match), level (1 or 2) }
 * Level 1 = top-level bullet, Level 2 = nested sub-bullet
 */
const PAGES = {
  'healthcare-ai': {
    // "Expectations for the Future" section — nested lists
    listPrefixes: [
      // Top-level items (bold headers)
      { text: 'Context awareness', level: 1 },
      { text: 'It should provide insight grounded', level: 2 },
      { text: 'With my consent, it could gather', level: 2 },
      { text: 'Personalized engagement', level: 1 },
      { text: 'The mode of communication could be personalized', level: 2 },
      { text: 'Some people will want more nudges', level: 2 },
      { text: 'Proactive approach', level: 1 },
      { text: "I won't always remember to ask", level: 2 },
      { text: 'Queries for better answers', level: 1 },
      { text: 'If it needs more information', level: 2 },
      { text: 'Multimodal communication', level: 1 },
      { text: 'It should enrich communication through visualization', level: 2 },
      { text: 'For example: "Show me a cartoon', level: 2 },
      { text: 'Emphasis on evidence', level: 1 },
      { text: 'It should provide ways for me to fact-check', level: 2 },
      { text: 'It should link reputable sources', level: 2 },
      { text: 'Transparency and user data ownership', level: 1 },
      { text: 'Data ownership and privacy policies', level: 2 },
      { text: 'People should own or co-own their data', level: 2 },
      { text: 'Accessible Design', level: 1 },
      { text: 'Initial communication should be concise', level: 2 },
      { text: "We'd love to see how this could be designed", level: 2 },
      // Jay's story section
      { text: 'Their heart rate variability is low', level: 1 },
      { text: "They've been on their phone more", level: 1 },
      { text: 'Step count is low', level: 1 },
      // "How we imagine it" section
      { text: 'Interoperability', level: 1 },
      { text: 'Gathers and merges all longitudinal', level: 2 },
      { text: 'Helps identify gaps and missing data', level: 2 },
      { text: 'Context and location-based support', level: 1 },
      { text: 'Refers to information regarding health conditions', level: 2 },
      { text: 'Provides basic resources, local support', level: 2 },
      { text: 'Symptom check / diagnostic help', level: 1 },
      { text: 'Patient takes a photo and/or provides', level: 2 },
      { text: 'Should be trained on medical diagnostic', level: 2 },
      { text: 'Can feature a more conversational tone', level: 2 },
      { text: 'Live support at appointments', level: 1 },
      { text: 'Guides the patient in reflecting', level: 2 },
      { text: 'Provides the patient with a list of possible questions', level: 2 },
      { text: 'Helps identify missing information', level: 2 },
      { text: 'Just-in-time support', level: 1 },
      { text: 'Provides real-time feedback', level: 2 },
      { text: 'Notices health condition risks in real time', level: 2 },
      { text: "Reaches out if it identifies that I'm in crisis", level: 2 },
      { text: 'Health check-ins that increase patient engagement', level: 1 },
      { text: 'Asks how the person is doing', level: 2 },
      { text: 'Generates article summaries and visual patient', level: 2 },
      { text: 'Personal health scans', level: 1 },
      { text: "Continually or periodically reviews the patient's data", level: 2 },
      { text: 'Examples: When do I need to schedule', level: 2 },
      // Risks section
      { text: 'Misinformation at scale', level: 1 },
      { text: 'Harmful information', level: 1 },
      { text: 'Perpetuating harmful biases', level: 1 },
      { text: 'Imbalanced power dynamics', level: 1 },
      { text: 'Liability and accountability', level: 1 },
      { text: 'Consent to train on personal data', level: 1 },
    ],
  },
  'healthcare-dollars': {
    listPrefixes: [
      // Methodology section lists
      { text: 'Bureau of Labor Statistics', level: 1 },
      { text: 'Centers for Disease Control', level: 1 },
      { text: 'Centers for Medicare', level: 1 },
      { text: 'Congressional Budget Office', level: 1 },
      { text: 'Department of Health', level: 1 },
      { text: 'Henry J. Kaiser Family', level: 1 },
      { text: 'Institute of Medicine', level: 1 },
      { text: 'National Association', level: 1 },
      { text: 'National Center for Health', level: 1 },
      { text: 'National Health Expenditure', level: 1 },
      { text: 'National Institutes of Health', level: 1 },
      { text: 'New England Journal', level: 1 },
      { text: 'Office of the Actuary', level: 1 },
      { text: 'Organisation for Economic', level: 1 },
      { text: 'The Commonwealth Fund', level: 1 },
      { text: 'World Health Organization', level: 1 },
    ],
  },
}

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

async function patchPage(slug, config) {
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug }
  )
  if (!feature) {
    console.log(`  ⚠ "${slug}" not found`)
    return 0
  }

  console.log(`\n  📄 ${feature.title} (${feature._id})`)
  console.log(`     Content blocks: ${feature.content?.length || 0}`)

  let patchCount = 0
  const content = feature.content || []

  const patchedContent = content.map(block => {
    if (block._type !== 'block' || block.listItem) return block
    const text = getBlockText(block)
    if (!text) return block

    for (const { text: prefix, level } of config.listPrefixes) {
      if (text.startsWith(prefix)) {
        patchCount++
        const preview = text.substring(0, 60)
        console.log(`     → list L${level}: "${preview}..."`)
        return { ...block, listItem: 'bullet', level }
      }
    }
    return block
  })

  console.log(`     Changes: ${patchCount}`)

  if (WRITE && patchCount > 0) {
    await client
      .patch(feature._id)
      .set({ content: patchedContent })
      .commit()
    console.log(`     ✅ Applied`)
  }

  return patchCount
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Converting paragraphs to bullet lists\n`)

  let total = 0
  for (const [slug, config] of Object.entries(PAGES)) {
    total += await patchPage(slug, config)
  }

  console.log(`\nTotal changes: ${total}`)
  if (!WRITE && total > 0) console.log('Run with --write to apply.')
}

main().catch(err => { console.error(err); process.exit(1) })
