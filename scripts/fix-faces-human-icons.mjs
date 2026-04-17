/**
 * Faces in Health Communication — Human Faces and Communication section.
 *
 * The 4 small face icons that should appear in a single horizontal row
 * are split between two Sanity blocks:
 *   - block 19e0bc21e45e: layout='3' with 3 face images
 *   - block adefb687-5c3: layout='2' with 1 face image (renders huge)
 *
 * Gatsby renders all 4 in one row (130px each). Fix: merge the 4th
 * image into the first block and change layout from '3' to '4'.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-human-icons.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-human-icons.mjs --write   # apply
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
const idx3 = blocks.findIndex((b) => b._key === '19e0bc21e45e')
const idx1 = blocks.findIndex((b) => b._key === 'adefb687-5c3')

if (idx3 === -1 || idx1 === -1) {
  console.error('Block(s) not found')
  process.exit(1)
}

const block3 = blocks[idx3]
const block1 = blocks[idx1]

console.log(`Found 3-icon block at idx ${idx3}, single-image block at idx ${idx1}`)
console.log(`Merging 1 image from block ${block1._key} into block ${block3._key}, changing layout '3' → '4'`)

const merged = {
  ...block3,
  layout: '4',
  content: [...block3.content, ...block1.content],
}

const newContent = blocks
  .map((b, i) => (i === idx3 ? merged : b))
  .filter((b) => b._key !== block1._key)

console.log(`Content: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}


