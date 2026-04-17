/**
 * Insert a customComponent block (name=virtualCareTimeToDiagnosis) into
 * the virtual-care feature between the "On average, it takes 24 days..."
 * paragraph and the "Given the time investment..." paragraph.
 *
 * Renders the small Time-to-diagnosis breakdown table from Gatsby:
 *   Waiting for appointment: 24 days
 *   Waiting for clinician in office: 41 minutes
 *   Consultation with clinician: 18.21 minutes
 *   Total: 24 days and 59.21 minutes
 *
 * Usage:
 *   node --env-file=.env.local scripts/insert-virtual-care-diagnosis.mjs           # dry
 *   node --env-file=.env.local scripts/insert-virtual-care-diagnosis.mjs --write   # apply
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

const ON_AVG_KEY = '4bez7fthfgg' // "On average, it takes 24 days..."

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'virtual-care'][0]{ _id, content }`,
)
if (!doc) {
  console.error('virtual-care not found')
  process.exit(1)
}

const blocks = doc.content || []
const idx = blocks.findIndex((b) => b._key === ON_AVG_KEY)
if (idx === -1) {
  console.error('On average block not found')
  process.exit(1)
}

const next = blocks[idx + 1]
if (next?._type === 'customComponent' && next?.name === 'virtualCareTimeToDiagnosis') {
  console.log('Already inserted')
  process.exit(0)
}

const tableBlock = {
  _type: 'customComponent',
  _key: 'vc-time-diagnosis',
  name: 'virtualCareTimeToDiagnosis',
}

const newContent = [
  ...blocks.slice(0, idx + 1),
  tableBlock,
  ...blocks.slice(idx + 1),
]

console.log(`Inserting at idx ${idx + 1}`)
console.log(`Content: ${blocks.length} → ${newContent.length} blocks`)

if (WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}


