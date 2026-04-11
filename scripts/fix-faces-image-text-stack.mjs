/**
 * Convert Faces in Health Communication's first 3 columns blocks from
 * `layout: '2'` (which renders side-by-side) to `layout: 'storyboard'`
 * (which renders image-on-top-text-below at full width for single cells).
 *
 * Gatsby renders these 3 sections as a full-width image followed by a
 * full-width paragraph (no columns wrapper at all). The storyboard layout
 * with a single [image, text] cell produces the same visual result.
 *
 * Affected sections:
 *   - feaff45f-300: "The U.S. Department of Health and Human Services..."
 *   - 45b7a9a3-fd5: "More than a third of Americans..."
 *   - 983d2d31-5ed: "Many Americans have low numeracy skills..."
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-faces-image-text-stack.mjs           # dry
 *   node --env-file=.env.local scripts/fix-faces-image-text-stack.mjs --write   # apply
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

const KEYS = ['feaff45f-300', '45b7a9a3-fd5', '983d2d31-5ed']

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'faces-in-health-communication'][0]{ _id, content }`,
)
if (!doc) {
  console.error('faces-in-health-communication not found')
  process.exit(1)
}

const newContent = (doc.content || []).map((b) => {
  if (KEYS.includes(b._key) && b._type === 'columns' && b.layout === '2') {
    console.log(`  ${b._key}: layout '2' → 'storyboard'`)
    return { ...b, layout: 'storyboard' }
  }
  return b
})

const changedCount = newContent.filter((b, i) => b !== doc.content[i]).length
console.log(`\n${changedCount} blocks updated`)

if (WRITE && changedCount > 0) {
  await client.patch(doc._id).set({ content: newContent }).commit()
  console.log('Wrote to Sanity')
} else if (!WRITE) {
  console.log('(Dry run — pass --write to apply)')
}
