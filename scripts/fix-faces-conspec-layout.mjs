/**
 * Fix the CONSPEC/CONLERN section in Faces in Health Communication.
 *
 * Current Sanity structure (blocks 29+30):
 *   columns.3 [brain1, brain2, brain3]
 *   columns.4 [baby1, baby2, baby3, baby4]
 *
 * Gatsby structure: 4 rows, each with [label, small-brain, large-baby]:
 *   Row 1: "Frontal Lobe"     — brain-frontal  + baby-2days
 *   Row 2: "Motor Cortex"     — brain-motor    + baby-motor-cortex
 *   Row 3: "Occipital Lobe"   — brain-occipital + baby-occipital
 *   Row 4: "Temporal Lobe"    — brain-temporal  + baby-temporal
 *
 * But we only have 3 brains and 4 babies. The 4th brain label might
 * have been separate on Gatsby. Let me check: Gatsby has 4 pairs.
 * So the 3-col block is missing a brain image. The fix should pair
 * the available images correctly.
 *
 * Actually looking more carefully at Gatsby: the pairs are
 * [label, small-brain-img, large-figure-img] rendered as
 * a side-by-side layout. Our 3+4 image grids lost this pairing.
 *
 * Fix approach: replace the two flat grids with 4 side-by-side
 * columns(2) blocks, each having [brain-image, figure-image+label-text].
 * Since we have 3 brains and 4 figures, the 4th row won't have a
 * brain image — we'll skip the brain side for that one.
 *
 * Actually simpler: just make them 2-col image grids with labels:
 *   columns.2 [brain-img, baby-img] × 3 or 4 blocks
 *
 * For labels, I'll insert text blocks before each pair.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-conspec-layout.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-conspec-layout.mjs --write   # apply
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
const idx3 = blocks.findIndex((b) => b._key === '1b4222bc7597') // columns.3 [I,I,I] (3 brains)
const idx4 = blocks.findIndex((b) => b._key === '211940c31abd') // columns.4 [I,I,I,I] (4 babies/figures)

if (idx3 === -1 || idx4 === -1) {
  console.error('Blocks not found — already fixed?')
  process.exit(0)
}

console.log(`Found 3-col at idx ${idx3}, 4-col at idx ${idx4}`)

const brains = blocks[idx3].content // 3 brain images
const figures = blocks[idx4].content // 4 figure images

// Labels from Gatsby (the 4th entry "Temporal Lobe" has only a figure, no brain in our set)
const labels = ['Frontal Lobe', 'Motor Cortex', 'Occipital Lobe', 'Temporal Lobe']

// Build 4 labeled pairs: each is a small heading label + a 2-col [brain, figure]
// For the 4th pair where brain is missing, just show the figure with the label
const newBlocks = []

for (let i = 0; i < 4; i++) {
  // Label block
  const labelBlock = {
    _type: 'block',
    _key: `conspec-label-${i}`,
    style: 'h4Bullet',
    markDefs: [],
    children: [
      { _type: 'span', _key: `lbl-${i}`, marks: [], text: labels[i] },
    ],
  }
  newBlocks.push(labelBlock)

  const brain = brains[i] // undefined for i=3
  const figure = figures[i]

  if (brain && figure) {
    // 2-col [brain, figure]
    newBlocks.push({
      _type: 'columns',
      _key: `conspec-pair-${i}`,
      layout: '2',
      content: [brain, figure],
    })
  } else if (figure) {
    // Just the figure as a standalone image
    newBlocks.push(figure)
  }
}

// Replace the two original blocks with the new sequence
const newContent = [
  ...blocks.slice(0, idx3),
  ...newBlocks,
  ...blocks.slice(idx4 + 1),
]

console.log(`Content: ${blocks.length} → ${newContent.length} blocks`)
console.log(`Replaced 2 blocks with ${newBlocks.length} blocks (${labels.length} label+pair groups)`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}


