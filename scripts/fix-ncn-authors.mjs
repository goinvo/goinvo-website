/**
 * National Cancer Navigation has its authors and contributors as INLINE
 * text in the content (a single paragraph with newlines), not as structured
 * author refs. As a result the page shows just "Authors" / "Contributors"
 * headings with no bodies.
 *
 * Fix: populate the structured authors[] and contributors[] fields with
 * refs to the existing teamMembers, and remove the inline blocks.
 *
 * Authors (in Gatsby order): Claire Lin, Tala Habbab, Sharon Lee,
 *   Craig McGinley, Samantha Wuu, Juhan Sonin
 * Contributors: Grace Cordovano (PhD), Wendi Cross (PhD), Daniel Ngo
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-ncn-authors.mjs           # dry
 *   node --env-file=.env.local scripts/fix-ncn-authors.mjs --write   # apply
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

// Map of author display names → existing Sanity teamMember _ids
const AUTHOR_REFS = [
  { name: 'Claire Lin', ref: 'team-claire-lin' },
  { name: 'Tala Habbab', ref: 'team-tala-habbab' },
  { name: 'Sharon Lee', ref: 'alumni-sharon-lee' },
  { name: 'Craig McGinley', ref: 'team-craig-mcginley' },
  { name: 'Samantha Wuu', ref: 'alumni-samantha-wuu' },
  { name: 'Juhan Sonin', ref: 'team-juhan-sonin' },
]

// Contributors: external- ids (need to be created)
const CONTRIBUTOR_DEFS = [
  { id: 'external-grace-cordovano', name: 'Grace Cordovano, PhD', role: 'Enlightening Results' },
  { id: 'external-wendi-cross', name: 'Wendi Cross, PhD', role: 'University of Rochester Medical Center' },
  { id: 'external-daniel-ngo', name: 'Daniel Ngo', role: '' },
]

const doc = await client.fetch(
  `*[_type == 'feature' && slug.current == 'national-cancer-navigation'][0]{ _id, content }`,
)
if (!doc) {
  console.error('national-cancer-navigation not found')
  process.exit(1)
}

// Find indexes of the Authors heading and the inline blocks to remove
const blocks = doc.content || []
const authorsIdx = blocks.findIndex((b) => b.style === 'h2' && b.children?.[0]?.text === 'Authors')
const contribIdx = blocks.findIndex((b) => b.style === 'h2' && b.children?.[0]?.text === 'Contributors')

console.log(`Found Authors at index ${authorsIdx}, Contributors at index ${contribIdx}`)

if (authorsIdx === -1 || contribIdx === -1) {
  console.error('Missing Authors or Contributors heading')
  process.exit(1)
}

// Blocks to remove: Authors heading, the names paragraph, Contributors heading, the names paragraph
const KEYS_TO_REMOVE = new Set([
  blocks[authorsIdx]._key,
  blocks[authorsIdx + 1]?._key,
  blocks[contribIdx]._key,
  blocks[contribIdx + 1]?._key,
])

console.log('Blocks to remove:', [...KEYS_TO_REMOVE])

const newContent = blocks.filter((b) => !KEYS_TO_REMOVE.has(b._key))

const authors = AUTHOR_REFS.map((a, i) => ({
  _key: `auth-${i}`,
  _type: 'reference',
  _ref: a.ref,
}))

const contributors = CONTRIBUTOR_DEFS.map((c, i) => ({
  _key: `cont-${i}`,
  _type: 'authorCredit',
  author: { _type: 'reference', _ref: c.id },
}))

console.log(`\nWill set ${authors.length} authors and ${contributors.length} contributors`)
console.log(`Content blocks: ${blocks.length} → ${newContent.length}`)

if (WRITE) {
  // Create the contributor team members first
  for (const c of CONTRIBUTOR_DEFS) {
    const existing = await client.fetch(`*[_id == $id][0]`, { id: c.id })
    if (!existing) {
      await client.createOrReplace({
        _id: c.id,
        _type: 'teamMember',
        name: c.name,
        role: c.role,
      })
      console.log('Created', c.id)
    }
  }

  await client
    .patch(doc._id)
    .set({ content: newContent, authors, contributors })
    .commit()
  console.log('Wrote to Sanity')
} else {
  console.log('(Dry run — pass --write to apply)')
}
