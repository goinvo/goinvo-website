#!/usr/bin/env node
/**
 * Patch visual-storytelling-with-genai:
 *   1. Add authors array referencing Maverick Chan, Claire Lin, Shirley Xu
 *
 * Usage:
 *   node scripts/patch-visual-storytelling.mjs           # dry-run
 *   node scripts/patch-visual-storytelling.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const WRITE = process.argv.includes('--write')
const SLUG = 'visual-storytelling-with-genai'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
})

async function main() {
  // 1. Fetch the document
  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, authors }`,
    { slug: SLUG }
  )

  if (!doc) {
    console.error(`Document not found: ${SLUG}`)
    process.exit(1)
  }

  console.log(`Found: ${doc.title} (${doc._id})`)
  console.log(`Current authors: ${doc.authors ? JSON.stringify(doc.authors) : 'none'}`)

  // 2. Verify team members exist
  const teamIds = ['team-maverick-chan', 'team-claire-lin', 'team-shirley-xu']
  const members = await client.fetch(
    `*[_type == "teamMember" && _id in $ids]{ _id, name }`,
    { ids: teamIds }
  )

  console.log(`\nTeam members found: ${members.length}/3`)
  members.forEach(m => console.log(`  - ${m.name} (${m._id})`))

  if (members.length !== 3) {
    console.error('Missing team members!')
    process.exit(1)
  }

  // 3. Build the patch
  const authorRefs = teamIds.map(id => ({
    _type: 'reference',
    _ref: id,
    _key: id.replace('team-', 'author-'),
  }))

  console.log(`\n--- Patch: Set authors ---`)
  console.log(JSON.stringify(authorRefs, null, 2))

  if (!WRITE) {
    console.log('\n[DRY RUN] No changes applied. Use --write to apply.')
    return
  }

  // 4. Apply the patch
  const result = await client
    .patch(doc._id)
    .set({ authors: authorRefs })
    .commit()

  console.log(`\n[APPLIED] Updated ${result._id} at rev ${result._rev}`)

  // 5. Verify
  const updated = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{
      authors[]->{_id, name}
    }`,
    { slug: SLUG }
  )
  console.log(`Verified authors:`)
  updated.authors.forEach(a => console.log(`  - ${a.name}`))
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
