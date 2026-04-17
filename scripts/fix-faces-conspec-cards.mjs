/**
 * Wrap the CONSPEC and CONLERN sections in backgroundSection blocks
 * to create the bordered card visual matching Gatsby.
 *
 * CONSPEC card structure:
 *   backgroundSection(gray) containing:
 *     - CONSPEC h3Centered heading
 *     - CONSPEC description (textCenter)
 *     - "2 Days Old" sectionTitle
 *     - Frontal Lobe h4Bullet + columns.2 [brain, baby]
 *     - descriptive paragraph
 *
 * CONLERN card structure:
 *   backgroundSection(blue) containing:
 *     - CONLERN h3Centered heading
 *     - CONLERN description (textCenter)
 *     - "2 Months Old" sectionTitle
 *     - Occipital Lobe h4Bullet + columns.2 [brain, baby]
 *     - Temporal Lobe h4Bullet + standalone image
 *     - descriptive paragraph
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-conspec-cards.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-conspec-cards.mjs --write   # apply
 */
import { createClient } from 'next-sanity'
import 'dotenv/config'

const WRITE = process.argv.includes('--write')
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: WRITE_TOKEN,
})

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'faces-in-health-communication'][0]{ _id, content }`,
)
if (!doc) process.exit(1)

const blocks = doc.content || []

// Find our marker blocks
const conspecCalloutIdx = blocks.findIndex(b => b._key === 'conspec-callout')
const conlernCalloutIdx = blocks.findIndex(b => b._key === 'conlern-callout')
const frontalLabelIdx = blocks.findIndex(b => b._key === 'conspec-label-0')
const motorLabelIdx = blocks.findIndex(b => b._key === 'conspec-label-1')
const occipitalLabelIdx = blocks.findIndex(b => b._key === 'conspec-label-2')
const temporalLabelIdx = blocks.findIndex(b => b._key === 'conspec-label-3')

console.log({conspecCalloutIdx, conlernCalloutIdx, frontalLabelIdx, motorLabelIdx, occipitalLabelIdx, temporalLabelIdx})

if (conspecCalloutIdx === -1 || conlernCalloutIdx === -1) {
  console.error('Callout blocks not found')
  process.exit(1)
}

// Already wrapped?
if (blocks.some(b => b._key === 'conspec-card')) {
  console.log('Already wrapped, skipping')
  process.exit(0)
}

// Find the text paragraph that comes after the Frontal Lobe pair
// It should be between the Motor Cortex label and the CONLERN callout
// Specifically: blocks between frontalPairIdx+1 and motorLabelIdx
const frontalPairIdx = frontalLabelIdx + 1 // columns.2 block right after label

// The paragraph "Infants spend a longer time looking at face..."
// comes after the Frontal Lobe pair and before Motor Cortex label
// Let's find it
let conspecTextIdx = -1
for (let i = frontalPairIdx + 1; i < motorLabelIdx; i++) {
  if (blocks[i]._type === 'block' && blocks[i].style === 'normal') {
    conspecTextIdx = i
    break
  }
}

console.log('CONSPEC text paragraph at idx:', conspecTextIdx)

// CONSPEC card content: conspec-callout, conspec-desc, "2 Days Old" sectionTitle,
// frontal-label, frontal-pair, text-paragraph
const twoDaysOld = {
  _type: 'block',
  _key: 'two-days-old',
  style: 'sectionTitle',
  markDefs: [],
  children: [{ _type: 'span', _key: 's1', marks: [], text: '2 Days Old' }],
}

// Gather CONSPEC card blocks
const conspecCardContent = [
  blocks[conspecCalloutIdx],     // CONSPEC heading
  blocks[conspecCalloutIdx + 1], // CONSPEC description
  twoDaysOld,                    // 2 Days Old
  blocks[frontalLabelIdx],       // Frontal Lobe label
  blocks[frontalPairIdx],        // Frontal Lobe brain+baby pair
]
if (conspecTextIdx !== -1) {
  conspecCardContent.push(blocks[conspecTextIdx]) // "Infants spend a longer time..."
}

const conspecCard = {
  _type: 'backgroundSection',
  _key: 'conspec-card',
  color: 'gray',
  content: conspecCardContent,
}

// CONLERN card: conlern heading, desc, "2 Months Old", Motor Cortex label+pair,
// Occipital label+pair, Temporal label+image
const twoMonthsOld = {
  _type: 'block',
  _key: 'two-months-old',
  style: 'sectionTitle',
  markDefs: [],
  children: [{ _type: 'span', _key: 's1', marks: [], text: '2 Months Old' }],
}

// Find the text between temporal pair and the next non-conspec block
const temporalPairIdx = temporalLabelIdx + 1
let conlernTextIdx = -1
for (let i = temporalPairIdx + 1; i < blocks.length; i++) {
  if (blocks[i]._type === 'block' && blocks[i].style === 'normal') {
    conlernTextIdx = i
    break
  }
}

const motorPairIdx = motorLabelIdx + 1
const occipitalPairIdx = occipitalLabelIdx + 1

const conlernCardContent = [
  blocks[conlernCalloutIdx],     // CONLERN heading
  blocks[conlernCalloutIdx + 1], // CONLERN description
  twoMonthsOld,
  blocks[motorLabelIdx],
  blocks[motorPairIdx],
  blocks[occipitalLabelIdx],
  blocks[occipitalPairIdx],
  blocks[temporalLabelIdx],
  blocks[temporalPairIdx],
]

const conlernCard = {
  _type: 'backgroundSection',
  _key: 'conlern-card',
  color: 'blue',
  content: conlernCardContent,
}

// Build new content: remove all the individual blocks and replace with cards
const keysToRemove = new Set([
  ...conspecCardContent.map(b => b._key),
  ...conlernCardContent.map(b => b._key),
])

// Also remove the original conspec/conlern callout+desc that were separate
keysToRemove.add('conspec-callout')
keysToRemove.add('conspec-desc')
keysToRemove.add('conlern-callout')
keysToRemove.add('conlern-desc')

const newContent = []
let inserted = { conspec: false, conlern: false }

for (const b of blocks) {
  if (keysToRemove.has(b._key)) {
    // Insert card at the position of the first removed block
    if (!inserted.conspec && b._key === 'conspec-callout') {
      newContent.push(conspecCard)
      inserted.conspec = true
    }
    if (!inserted.conlern && b._key === 'conlern-callout') {
      newContent.push(conlernCard)
      inserted.conlern = true
    }
    // Skip the removed block
    continue
  }
  newContent.push(b)
}

console.log(`Content: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}


