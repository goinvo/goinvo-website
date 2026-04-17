/**
 * Remove 3 extra quote-definition paragraphs from openPRO that aren't in Gatsby:
 *   1. "An instrument, scale, or single-item measure..."
 *   2. "any report of the status of a patient's health condition..."
 *   3. "a health outcome directly reported by the patient..."
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-openpro-quotes.mjs           # dry
 *   node --env-file=.env.local scripts/fix-openpro-quotes.mjs --write   # apply
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

const KEYS_TO_REMOVE = ['k14a5c214y', 'dcvgmvjt888', 'ke4xrux1fv']

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'open-pro'][0]{ _id, content }`,
)
if (!doc) {
  console.error('open-pro feature not found')
  process.exit(1)
}

const newContent = (doc.content || []).filter((b) => !KEYS_TO_REMOVE.includes(b._key))
const removed = (doc.content?.length || 0) - newContent.length
console.log(`Removing ${removed} blocks (had ${doc.content?.length}, now ${newContent.length})`)

if (WRITE && removed > 0) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else if (!WRITE) {
  console.log('(Dry run — pass --write to apply)')
}


