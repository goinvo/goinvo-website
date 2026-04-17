/**
 * The openPRO page has 4-5 small icon images currently aligned center.
 * Gatsby left-aligns these icons. Switch them to align=left.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-openpro-icon-align.mjs           # dry
 *   node --env-file=.env.local scripts/fix-openpro-icon-align.mjs --write   # apply
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
  `*[_type == 'feature' && slug.current == 'open-pro'][0]{ _id, content }`,
)
if (!doc) {
  console.error('open-pro feature not found')
  process.exit(1)
}

const newContent = JSON.parse(JSON.stringify(doc.content))
let fixed = 0

const walk = (items) => {
  for (const item of items) {
    if (item._type === 'image' && item.size === 'small' && (item.align === 'center' || !item.align)) {
      console.log(`  ${item._key}: ${item.alt?.substring(0, 60) || '(no alt)'} → align=left`)
      item.align = 'left'
      fixed++
    }
    if (item._type === 'columns' && item.content) walk(item.content)
  }
}
walk(newContent)

console.log(`\nFound ${fixed} small/center icon images to left-align`)
if (fixed > 0 && WRITE) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else if (!WRITE) {
  console.log('(Dry run — pass --write to apply)')
}


