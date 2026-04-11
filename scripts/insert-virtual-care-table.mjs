/**
 * Insert a customComponent block (name=virtualCareTop15Table) into the
 * virtual-care feature right after the "The Top 15 Encounters Breakdown"
 * h3 heading. The renderer dispatches on the name to render the
 * hard-coded VirtualCareTop15Table component.
 *
 * Usage:
 *   node --env-file=.env.local scripts/insert-virtual-care-table.mjs           # dry
 *   node --env-file=.env.local scripts/insert-virtual-care-table.mjs --write   # apply
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

const HEADING_KEY = '5fj261eln4u'

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'virtual-care'][0]{ _id, content }`,
)
if (!doc) {
  console.error('virtual-care feature not found')
  process.exit(1)
}

const blocks = doc.content || []
const headingIdx = blocks.findIndex((b) => b._key === HEADING_KEY)
if (headingIdx === -1) {
  console.error('Heading block not found')
  process.exit(1)
}

// Skip if already inserted
const next = blocks[headingIdx + 1]
if (next?._type === 'customComponent' && next?.name === 'virtualCareTop15Table') {
  console.log('Custom component block already inserted at idx', headingIdx + 1)
  process.exit(0)
}

const tableBlock = {
  _type: 'customComponent',
  _key: 'vc-top15-table',
  name: 'virtualCareTop15Table',
}

const newContent = [
  ...blocks.slice(0, headingIdx + 1),
  tableBlock,
  ...blocks.slice(headingIdx + 1),
]

console.log(`Inserting customComponent block at idx ${headingIdx + 1}`)
console.log(`Content: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}
