/**
 * Faces in Health Communication — wrap "These narratives" 3-line cluster
 *
 * Gatsby renders "These narratives have the power to touch our emotions",
 * "impact what we believe,", "teach us new behaviors." as a 3-column row
 * (216px wide each). In Sanity these are 3 separate full-width paragraphs:
 *   - 'narratives' is currently inside a columns.2 [I,b] block (with the
 *     accompanying narratives image). Need to extract it.
 *   - 'impact' and 'teach' are standalone normal blocks below.
 *
 * Looking at the page-tree position, the image preceding 'narratives' is
 * the connecting-dots illustration, and they form a single visual unit.
 * Simplest fix: wrap the 3 paragraphs in a columns.3 block (text-only)
 * which the renderer should handle as a 3-column text grid.
 *
 * Actually the renderer's columns block doesn't have an explicit text-only
 * branch. Let me check... if hasImages is false, it falls through. Will
 * verify the renderer path before applying.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-narratives.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-narratives.mjs --write   # apply
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

// Find the 3 narrative blocks
const narrColIdx = blocks.findIndex((b) => b._key === 'c229a3fe-147')
const impactIdx = blocks.findIndex((b) => b._key === 'oflry1kan6o')
const teachIdx = blocks.findIndex((b) => b._key === 'lm3bbe6bp7')

if (narrColIdx === -1 || impactIdx === -1 || teachIdx === -1) {
  console.error('Block(s) not found:', { narrColIdx, impactIdx, teachIdx })
  process.exit(1)
}

const narrCol = blocks[narrColIdx]
console.log('Narrative columns block content:')
narrCol.content.forEach((c) =>
  console.log(' ', c._type, c._type === 'block' ? (c.children || []).map((s) => s.text).join('').substring(0, 50) : (c.alt || '')),
)

// Extract the image and the narratives paragraph
const narrImg = narrCol.content.find((c) => c._type === 'image')
const narrText = narrCol.content.find((c) => c._type === 'block')
const impactBlock = blocks[impactIdx]
const teachBlock = blocks[teachIdx]

if (!narrImg || !narrText) {
  console.error('Missing image or text inside narrative columns block')
  process.exit(1)
}

// Build new structure:
//   1. Standalone image (narrImg)
//   2. columns.3 block with [narrText, impactBlock, teachBlock]
const standaloneImg = { ...narrImg }
const wrap3 = {
  _type: 'columns',
  _key: 'wrap-narratives-3',
  layout: '3',
  content: [narrText, impactBlock, teachBlock],
}

const newContent = [
  ...blocks.slice(0, narrColIdx),
  standaloneImg,
  wrap3,
  ...blocks.slice(narrColIdx + 1),
].filter((b) => b._key !== impactBlock._key && b._key !== teachBlock._key)

console.log(`\nContent: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}


