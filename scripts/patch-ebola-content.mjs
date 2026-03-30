/**
 * Patch Understanding Ebola content in Sanity
 *
 * Fixes:
 * 1. Image blocks: change size from 'full' to 'bleed' for full-viewport rendering
 * 2. Authors: set the authors[] reference array with correct team members
 *
 * Usage:
 *   node scripts/patch-ebola-content.mjs          # dry run
 *   node scripts/patch-ebola-content.mjs --write   # apply changes
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
const SLUG = 'understanding-ebola'

/**
 * Team members for Understanding Ebola (from Gatsby /features/ebola/)
 * Roles: Designer (Author), Editor, Contributing Author, Contributing Illustrator, Web Developer
 */
const EBOLA_AUTHORS = [
  { name: 'Xinyu Liu', role: 'Designer' },
  { name: 'Emily Twaddell', role: 'Editor' },
  { name: 'Juhan Sonin', role: 'Contributing Author' },
  { name: 'Sarah Kaiser', role: 'Contributing Illustrator' },
  { name: 'Adam Pere', role: 'Web Developer' },
]

async function ensureTeamMember(name, role) {
  // Check if team member exists — do NOT update their global role
  const existing = await client.fetch(
    `*[_type == "teamMember" && name == $name][0]{ _id, name, role }`,
    { name }
  )
  if (existing) {
    console.log(`  ✓ Team member exists: ${name} (${existing._id}, role: ${existing.role})`)
    return existing._id
  }

  // Create new team member (only if they don't exist)
  const id = `teamMember-${name.toLowerCase().replace(/\s+/g, '-')}`
  console.log(`  + Creating team member: ${name} (${id}, role: ${role})`)
  if (WRITE) {
    const doc = await client.createOrReplace({
      _id: id,
      _type: 'teamMember',
      name,
      role,
    })
    return doc._id
  }
  return id
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Patching ${SLUG}\n`)

  // 1. Fetch the feature document
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content, authors }`,
    { slug: SLUG }
  )

  if (!feature) {
    console.error(`Feature "${SLUG}" not found in Sanity`)
    process.exit(1)
  }

  console.log(`Found: "${feature.title}" (${feature._id})`)
  console.log(`Content blocks: ${feature.content?.length || 0}`)
  console.log(`Current authors: ${feature.authors?.length || 0}`)

  // 2. Fix image sizes
  const content = feature.content || []
  let imagePatches = 0

  const patchedContent = content.map(block => {
    if (block._type === 'image' && block.size !== 'bleed') {
      imagePatches++
      console.log(`  📸 Image "${block.alt || block._key}": ${block.size || 'default'} → bleed`)
      return { ...block, size: 'bleed' }
    }
    return block
  })

  console.log(`\nImage patches: ${imagePatches}`)

  // 3. Ensure team members exist and build author refs
  console.log('\nTeam members:')
  const authorRefs = []
  for (const author of EBOLA_AUTHORS) {
    const id = await ensureTeamMember(author.name, author.role)
    authorRefs.push({ _type: 'reference', _ref: id, _key: `author-${id}` })
  }

  // 4. Apply patches
  if (WRITE) {
    console.log('\nApplying patches...')
    await client
      .patch(feature._id)
      .set({
        content: patchedContent,
        authors: authorRefs,
      })
      .commit()
    console.log('✅ Done!')
  } else {
    console.log('\nWould patch:')
    console.log(`  - ${imagePatches} image blocks → size: 'bleed'`)
    console.log(`  - authors[] → ${authorRefs.length} team members`)
    console.log('\nRun with --write to apply.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
