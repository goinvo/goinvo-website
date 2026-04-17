/**
 * Faces in Health Communication — Healthcare Graphics, Persuasion, and Emotion section.
 *
 * Two structural problems vs Gatsby:
 *
 * 1. Block 43 (cigarette image) + 44 (paragraph) render as full-width
 *    image then full-width text. Gatsby renders these as 1:2 layout
 *    (small image left, paragraph right). Fix: wrap into a single
 *    columns block layout='1:2'.
 *
 * 2. Blocks 45-53 are 3 sets of [image, label-h4, caption] (the
 *    Message-referent / Plot-referent / Self-referent triptych).
 *    Currently each renders independently as full-width. Gatsby renders
 *    as a 3-column row of [image + label below + caption below]. Fix:
 *    wrap into a columns block layout='3' with content
 *    [I, T(label+caption merged), I, T, I, T] — the gallery pattern
 *    code path will detect alternating I,T pairs and render as 3-col
 *    grid with image on top and merged caption below.
 *
 * Note: the merged label+caption uses two separate spans (one bold for
 * the label, one for the caption) inside one block so it renders on two
 * lines via natural wrapping or with a soft break.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-healthcare-graphics.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-healthcare-graphics.mjs --write   # apply
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
if (!doc) {
  console.error('feature not found')
  process.exit(1)
}

const blocks = doc.content || []

// Find anchor blocks by key
const cigImgIdx = blocks.findIndex((b) => b._key === 'y8oqbpmz6c')
const cigTextIdx = blocks.findIndex((b) => b._key === 'olsu9lrain')
const msgImgIdx = blocks.findIndex((b) => b._key === 'ahmmpsiw20j')
const msgLabelIdx = blocks.findIndex((b) => b._key === 'z0y3soia5b9')
const msgCapIdx = blocks.findIndex((b) => b._key === 'q91prqftued')
const plotImgIdx = blocks.findIndex((b) => b._key === 'y5k0rjoywe')
const plotLabelIdx = blocks.findIndex((b) => b._key === '2vgot52utku')
const plotCapIdx = blocks.findIndex((b) => b._key === 'rxjbnj63rw')
const selfImgIdx = blocks.findIndex((b) => b._key === 'bgrjl08qpcg')
const selfLabelIdx = blocks.findIndex((b) => b._key === '86mn8h8ddnq')
const selfCapIdx = blocks.findIndex((b) => b._key === '4eopngdlia7')

const allIdx = [cigImgIdx, cigTextIdx, msgImgIdx, msgLabelIdx, msgCapIdx, plotImgIdx, plotLabelIdx, plotCapIdx, selfImgIdx, selfLabelIdx, selfCapIdx]
if (allIdx.some((i) => i === -1)) {
  console.error('Missing block(s):', allIdx)
  process.exit(1)
}
// Verify they are contiguous (43-53)
const min = Math.min(...allIdx)
const max = Math.max(...allIdx)
if (max - min !== 10) {
  console.error('Blocks not contiguous:', allIdx)
  process.exit(1)
}
console.log(`Blocks span ${min}..${max}`)

// Build the merged caption block (label + caption as one block, separated by space)
function mergeLabelCap(label, caption) {
  const labelText = (label.children || []).map((c) => c.text).join('')
  const capText = (caption.children || []).map((c) => c.text).join('')
  return {
    _type: 'block',
    _key: `merged-${label._key}`,
    style: 'normal',
    markDefs: [],
    children: [
      { _type: 'span', _key: 'label', marks: ['strong'], text: labelText },
      { _type: 'span', _key: 'sep', marks: [], text: '\n' },
      { _type: 'span', _key: 'cap', marks: [], text: capText },
    ],
  }
}

const cigImg = blocks[cigImgIdx]
const cigText = blocks[cigTextIdx]
const msgImg = blocks[msgImgIdx]
const msgMerged = mergeLabelCap(blocks[msgLabelIdx], blocks[msgCapIdx])
const plotImg = blocks[plotImgIdx]
const plotMerged = mergeLabelCap(blocks[plotLabelIdx], blocks[plotCapIdx])
const selfImg = blocks[selfImgIdx]
const selfMerged = mergeLabelCap(blocks[selfLabelIdx], blocks[selfCapIdx])

// Build the new wrapped blocks
const cigWrap = {
  _type: 'columns',
  _key: 'wrap-cig-1to2',
  layout: '1:2',
  content: [cigImg, cigText],
}

const triptych = {
  _type: 'columns',
  _key: 'wrap-referents-3',
  layout: '3',
  content: [msgImg, msgMerged, plotImg, plotMerged, selfImg, selfMerged],
}

const newContent = [
  ...blocks.slice(0, min),
  cigWrap,
  triptych,
  ...blocks.slice(max + 1),
]

console.log(`Content: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}


