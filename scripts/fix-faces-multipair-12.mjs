/**
 * Faces in Health Communication's "Benefits of Visual Healthcare Communication"
 * section has block `93790566-c5f` with layout='1:2' and 4 items [I,T,I,T]
 * (two image+text pairs). The renderer doesn't handle multi-pair 1:2 layouts
 * — it falls through to the image-only branch and renders as a 2-col 50/50
 * grid (each cell stacked image-on-top-text-below). Gatsby renders this as
 * two separate stacked rows of [narrow image | wide text].
 *
 * Fix: split the block into 2 separate single-pair columns blocks. The
 * single-pair 1:2 code path already renders correctly as [narrow|wide] row.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-multipair-12.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-multipair-12.mjs --write   # apply
 */
import { createClient } from 'next-sanity'
import 'dotenv/config'
import { randomUUID } from 'crypto'

const WRITE = process.argv.includes('--write')
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: WRITE_TOKEN,
})

const TARGET_KEY = '93790566-c5f'

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'faces-in-health-communication'][0]{ _id, content }`,
)
if (!doc) {
  console.error('feature not found')
  process.exit(1)
}

const blocks = doc.content || []
const idx = blocks.findIndex((b) => b._key === TARGET_KEY)
if (idx === -1) {
  console.error(`Block ${TARGET_KEY} not found — already fixed?`)
  process.exit(0)
}

const target = blocks[idx]
console.log(`Found target block at index ${idx}, layout=${target.layout}, items=${target.content.length}`)

// Group items into [image, text] pairs
const pairs = []
let cur = null
for (const item of target.content) {
  if (item._type === 'image') {
    if (cur) pairs.push(cur)
    cur = { image: item, blocks: [] }
  } else if (cur) {
    cur.blocks.push(item)
  }
}
if (cur) pairs.push(cur)

console.log(`Split into ${pairs.length} pairs:`)
pairs.forEach((p, i) => {
  const t = p.blocks[0]?.children?.map((c) => c.text).join('').substring(0, 50) || '(no text)'
  console.log(`  ${i}: ${t}`)
})

const newBlocks = pairs.map((p, i) => ({
  _type: 'columns',
  _key: `${TARGET_KEY}-${i}`,
  layout: '1:2',
  content: [p.image, ...p.blocks],
}))

const newContent = [
  ...blocks.slice(0, idx),
  ...newBlocks,
  ...blocks.slice(idx + 1),
]

console.log(`\nContent: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}


