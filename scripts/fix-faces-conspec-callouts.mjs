/**
 * Add CONSPEC and CONLERN callout blocks to Faces in Health Communication.
 *
 * Gatsby renders these as gray-background bordered boxes:
 *   CONSPEC: "Guides an infant's preferences for facelike patterns from birth."
 *   CONLERN: "A cortical visuomotor mechanism. These subcortical structures
 *             support the development of specialized cortical circuits that
 *             we use as adults."
 *
 * Insert CONSPEC after the text paragraph (block 28) and before the first
 * Frontal Lobe label. Insert CONLERN after Motor Cortex pair and before
 * Occipital Lobe label.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-conspec-callouts.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-conspec-callouts.mjs --write   # apply
 */
import { createClient } from 'next-sanity'
import 'dotenv/config'

const WRITE = process.argv.includes('--write')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
})

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'faces-in-health-communication'][0]{ _id, content }`,
)
if (!doc) process.exit(1)

const blocks = doc.content || []

// Find the Frontal Lobe label (first label from the CONSPEC fix)
const frontalIdx = blocks.findIndex((b) =>
  b._type === 'block' && b._key === 'conspec-label-0'
)
// Find the Occipital Lobe label
const occipitalIdx = blocks.findIndex((b) =>
  b._type === 'block' && b._key === 'conspec-label-2'
)

if (frontalIdx === -1) {
  console.error('Frontal Lobe label not found — was the CONSPEC fix applied?')
  process.exit(1)
}

console.log(`Frontal Lobe at idx ${frontalIdx}, Occipital Lobe at idx ${occipitalIdx}`)

// Check if CONSPEC callout already exists
if (blocks.some((b) => b._key === 'conspec-callout')) {
  console.log('CONSPEC callout already exists, skipping')
  process.exit(0)
}

// CONSPEC callout block — styled as h3Centered (large, centered, serif heading)
// followed by a description paragraph
const conspecHeading = {
  _type: 'block',
  _key: 'conspec-callout',
  style: 'h3Centered',
  markDefs: [],
  children: [
    { _type: 'span', _key: 'cs1', marks: [], text: 'CONSPEC' },
  ],
}

const conspecDesc = {
  _type: 'block',
  _key: 'conspec-desc',
  style: 'textCenter',
  markDefs: [],
  children: [
    { _type: 'span', _key: 'csd1', marks: [], text: "Guides an infant's preferences for facelike patterns from birth." },
  ],
}

// CONLERN callout (same pattern)
const conlernHeading = {
  _type: 'block',
  _key: 'conlern-callout',
  style: 'h3Centered',
  markDefs: [],
  children: [
    { _type: 'span', _key: 'cl1', marks: [], text: 'CONLERN' },
  ],
}

const conlernDesc = {
  _type: 'block',
  _key: 'conlern-desc',
  style: 'textCenter',
  markDefs: [],
  children: [
    { _type: 'span', _key: 'cld1', marks: [], text: 'A cortical visuomotor mechanism. These subcortical structures support the development of specialized cortical circuits that we use as adults.' },
  ],
}

// Insert CONSPEC before Frontal Lobe, CONLERN before Occipital Lobe
// Need to recalculate indices after first insertion
let newContent = [...blocks]

// Insert CONSPEC before frontalIdx
newContent.splice(frontalIdx, 0, conspecHeading, conspecDesc)

// Recalculate occipital index (shifted by 2)
const newOccipitalIdx = newContent.findIndex((b) => b._key === 'conspec-label-2')
if (newOccipitalIdx !== -1) {
  newContent.splice(newOccipitalIdx, 0, conlernHeading, conlernDesc)
}

console.log(`Content: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}
