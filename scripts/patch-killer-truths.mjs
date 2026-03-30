/**
 * Patch Killer Truths in Sanity
 *
 * Fixes:
 * 1. Enable fullImageCover (the infographic IS the content)
 * 2. Set contributors (Jen Patel, Juhan Sonin — from Gatsby)
 *
 * Usage:
 *   node scripts/patch-killer-truths.mjs          # dry run
 *   node scripts/patch-killer-truths.mjs --write   # apply changes
 */
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const WRITE = process.argv.includes('--write')
const SLUG = 'killer-truths'

const CONTRIBUTORS = [
  { name: 'Jen Patel' },
  { name: 'Juhan Sonin' },
]

async function findTeamMember(name) {
  const member = await client.fetch(
    `*[_type == "teamMember" && name == $name][0]{ _id, name, role }`,
    { name }
  )
  if (member) {
    console.log(`  ✓ Found: ${name} (${member._id})`)
    return member._id
  }
  console.log(`  ✗ Not found: ${name}`)
  return null
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Patching ${SLUG}\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, fullImageCover, contributors }`,
    { slug: SLUG }
  )

  if (!feature) {
    console.error(`Feature "${SLUG}" not found`)
    process.exit(1)
  }

  console.log(`Found: "${feature.title}" (${feature._id})`)
  console.log(`Current fullImageCover: ${feature.fullImageCover ?? false}`)
  console.log(`Current contributors: ${feature.contributors?.length ?? 0}`)

  // Build contributor refs
  console.log('\nContributors:')
  const contributorRefs = []
  for (const c of CONTRIBUTORS) {
    const id = await findTeamMember(c.name)
    if (id) {
      contributorRefs.push({
        _type: 'contributorCredit',
        _key: `contrib-${id}`,
        author: { _type: 'reference', _ref: id },
      })
    }
  }

  console.log(`\nWould set:`)
  console.log(`  fullImageCover: true`)
  console.log(`  contributors: ${contributorRefs.length} people`)

  if (WRITE) {
    console.log('\nApplying...')
    await client
      .patch(feature._id)
      .set({
        fullImageCover: true,
        contributors: contributorRefs,
      })
      .commit()
    console.log('✅ Done!')
  } else {
    console.log('\nRun with --write to apply.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
