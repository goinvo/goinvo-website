/**
 * Add missing bullet lists to healthcare-ai in Sanity.
 *
 * The Gatsby page has nested UL lists (Expectations + Imagined Features + Risks)
 * that were never migrated to Sanity. This script inserts them after the
 * corresponding heading blocks.
 *
 * Usage:
 *   node scripts/patch-healthcare-ai-lists.mjs          # dry run
 *   node scripts/patch-healthcare-ai-lists.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
import { randomUUID } from 'crypto'
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
const SLUG = 'healthcare-ai'

function makeKey() { return randomUUID().slice(0, 12) }

function textBlock(text, style = 'normal') {
  return {
    _type: 'block', _key: makeKey(), style,
    markDefs: [],
    children: [{ _type: 'span', _key: makeKey(), marks: [], text }],
  }
}

function boldTextBlock(text) {
  const markKey = makeKey()
  return {
    _type: 'block', _key: makeKey(), style: 'normal',
    markDefs: [{ _key: markKey, _type: 'strong' }],
    children: [{ _type: 'span', _key: makeKey(), marks: ['strong'], text }],
  }
}

function listItem(text, level = 1, bold = false) {
  const block = bold ? boldTextBlock(text) : textBlock(text)
  return { ...block, listItem: 'bullet', level }
}

// "Expectations for the Future" section — after block index 11
const expectationsList = [
  listItem('Context awareness', 1, true),
  listItem('It should provide insight grounded in the historical context of my health and behavior.', 2),
  listItem('With my consent, it could gather this data from my health record, native health apps (Apple Health, Google Fit), and phone data (GPS, screen time) as well as plug into wearables, mood tracking, fitness, pain tracking, and other health apps.', 2),
  listItem('Personalized engagement', 1, true),
  listItem('The mode of communication could be personalized by switching to my preferred language, using speech instead of text, playing animated videos, etc. If using speech, some prefer faster answers that aren\'t in full sentences vs. conversational phrasing.', 2),
  listItem('Some people will want more nudges and interaction than others.', 2),
  listItem('Proactive approach', 1, true),
  listItem('I won\'t always remember to ask health questions or think about my health. Most people don\'t take the time to focus on their health. I need an assistant that checks in at the right times to help me engage with my health and better understand my body.', 2),
  listItem('Queries for better answers', 1, true),
  listItem('If it needs more information to give a personalized answer, it should prompt me with appropriate follow-up questions.', 2),
  listItem('Multimodal communication', 1, true),
  listItem('It should enrich communication through visualization and sonification and accommodate different learning styles.', 2),
  listItem('For example: "Show me a cartoon representation of how lactose intolerance works."', 2),
  listItem('Emphasis on evidence', 1, true),
  listItem('It should provide ways for me to fact-check or dig deeper.', 2),
  listItem('It should link reputable sources that support its answers.', 2),
  listItem('Transparency and user data ownership', 1, true),
  listItem('Data ownership and privacy policies should be clear.', 2),
  listItem('People should own or co-own their data; they should also have control over how their data is used and who can access it.', 2),
  listItem('Accessible Design', 1, true),
  listItem('Initial communication should be concise and easy to read at a fifth grade reading level, following up with more thorough explanations when asked.', 2),
  listItem('We\'d love to see how this could be designed specifically for individuals with low vision, mobility and dexterity impairments, and other conditions that might make interaction with this kind of tool challenging.', 2),
]

// "What purposes could an AI patient tool serve?" section — after block index 41
const purposesList = [
  listItem('Interoperability', 1, true),
  listItem('Gathers and merges all longitudinal patient data', 2),
  listItem('Helps identify gaps and missing data', 2),
  listItem('Context and location-based support and resources', 1, true),
  listItem('Refers to information regarding health conditions, housing security, employment status, etc.', 2),
  listItem('Provides basic resources, local support in your town', 2),
  listItem('Symptom check / diagnostic help', 1, true),
  listItem('Patient takes a photo and/or provides information about symptoms and AI provides top-N answers', 2),
  listItem('Should be trained on medical diagnostic databases', 2),
  listItem('Can feature a more conversational tone than current options like Ada Health and Babylon chat bots', 2),
  listItem('Live support at appointments, both in-person and virtual', 1, true),
  listItem('Guides the patient in reflecting on how they\'ve been and visualizing their health since their last visit', 2),
  listItem('Provides the patient with a list of possible questions to ask their doctor', 2),
  listItem('Helps identify missing information needed for optimal care', 2),
  listItem('Just-in-time support', 1, true),
  listItem('Provides real-time feedback on exercising more effectively', 2),
  listItem('Notices health condition risks in real time, like sleep apnea, anxiety, etc.', 2),
  listItem('Reaches out if it identifies that I\'m in crisis', 2),
  listItem('Health check-ins that increase patient engagement in their own health', 1, true),
  listItem('Asks how the person is doing, prompts them to describe concerns, provides best practice suggestions, helps them decide what habits or actions to try, follows up for accountability and reflection', 2),
  listItem('Generates article summaries and visual patient information for different conditions, increasing accessibility of anything from basic human biology to recent neuroscience research', 2),
  listItem('Personal health scans', 1, true),
  listItem('Continually or periodically reviews the patient\'s data and care they\'ve received, notes positive health trends and improvements, spotlights areas that need attention, helps the patient identify what they should focus on', 2),
  listItem('Examples: When do I need to schedule my next physical, eye exam, dentist appointment, flu shot, cancer screening, etc?', 2),
]

// "Ripple Effects" section — after block index 47
const risksList = [
  listItem('Misinformation at scale: Stack Overflow banned ChatGPT answers as it got swamped with quality control at scale. ChatGPT makes it incredibly easy to post an answer, but the non-zero error rate is a real problem for health.', 1),
  listItem('Harmful information: "Molotov Cocktail questions" can still be achieved by phrasing as a print function question. Presumably similar information about how to effectively commit suicide, for example, could be retrieved.', 1),
  listItem('Perpetuating harmful biases, conventions, etc: The AI will provide answers based on the material it is trained on. If the material is biased or non-inclusive, the AI\'s answers will reflect that.', 1),
  listItem('Imbalanced power dynamics: For a population with low health literacy, a tool with all of the answers can feel authoritarian and reduce agency.', 1),
  listItem('Liability and accountability: If you get bad advice from an AI, who is responsible?', 1),
  listItem('Consent to train on personal data: Training models on personal health data requires informed consent and governance.', 1),
]

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Adding lists to ${SLUG}\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Not found'); process.exit(1) }

  console.log(`Found: "${feature.title}" (${feature._id})`)
  console.log(`Content blocks: ${feature.content?.length || 0}`)

  // Check if lists already exist
  const hasLists = (feature.content || []).some(b => b.listItem)
  if (hasLists) {
    console.log('Lists already exist — skipping.')
    return
  }

  const content = feature.content || []
  const result = []

  // Insert lists after their anchor blocks
  for (let i = 0; i < content.length; i++) {
    result.push(content[i])
    const text = getBlockText(content[i])

    // After "The following are gaps we've identified..." → expectations list
    if (text.startsWith('The following are gaps')) {
      console.log(`  + Inserting ${expectationsList.length} expectation list items after block ${i}`)
      result.push(...expectationsList)
    }
    // After "Here's how we imagine it:" → purposes list
    if (text.startsWith("Here's how we imagine it")) {
      console.log(`  + Inserting ${purposesList.length} purpose list items after block ${i}`)
      result.push(...purposesList)
    }
    // After "Here are the big conversations..." → risks list
    if (text.startsWith('Here are the big conversations')) {
      console.log(`  + Inserting ${risksList.length} risk list items after block ${i}`)
      result.push(...risksList)
    }
  }

  const added = result.length - content.length
  console.log(`\nTotal blocks added: ${added} (${content.length} → ${result.length})`)

  if (WRITE && added > 0) {
    await client.patch(feature._id).set({ content: result }).commit()
    console.log('✅ Applied')
  } else if (added > 0) {
    console.log('Run with --write to apply.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
