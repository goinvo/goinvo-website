/**
 * Patch missing list on the national-cancer-navigation page in Sanity.
 *
 * The Gatsby page has a <ul> with 6 items describing cancer navigation services
 * (Digital Navigation Tool, Patient Navigator, Financial Navigator, etc.)
 * between the paragraph "These services include:" and "See our progress...".
 * This list is completely missing from Sanity.
 *
 * Usage:
 *   node scripts/patch-cancer-nav-list.mjs          # dry run
 *   node scripts/patch-cancer-nav-list.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
import { randomUUID } from 'crypto'
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
const SLUG = 'national-cancer-navigation'

function makeKey() { return randomUUID().slice(0, 12) }

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

/**
 * Create a bullet list item with bold label and description on next line.
 * Matches Gatsby format: <b>Label</b><br/>Description
 */
function makeBoldBulletItem(boldText, description) {
  return {
    _type: 'block', _key: makeKey(), style: 'normal',
    listItem: 'bullet', level: 1,
    markDefs: [],
    children: [
      { _type: 'span', _key: makeKey(), marks: ['strong'], text: boldText },
      { _type: 'span', _key: makeKey(), marks: [], text: '\n' + description },
    ],
  }
}

async function main() {
  console.log(`\n${WRITE ? 'WRITE MODE' : 'DRY RUN'} - Patching ${SLUG}\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Document not found'); process.exit(1) }

  const content = [...feature.content]

  // Find the anchor paragraph: "This timeline outlines how cancer navigation
  // could look across multiple services..."
  const anchorIdx = content.findIndex(b =>
    getBlockText(b).startsWith('This timeline outlines how cancer navigation')
  )
  if (anchorIdx < 0) {
    console.error('Anchor paragraph "This timeline outlines..." not found')
    process.exit(1)
  }

  // Check if list items already exist after the anchor
  const nextBlock = content[anchorIdx + 1]
  if (nextBlock && nextBlock.listItem) {
    console.log('List items already present after anchor — skipping.')
    return
  }

  console.log(`Found anchor at index ${anchorIdx}: "${getBlockText(content[anchorIdx]).substring(0, 60)}..."`)

  // The 6 services from the Gatsby source
  const serviceItems = [
    makeBoldBulletItem(
      'Digital Navigation Tool',
      'Mobile application for facility referral, record sharing, and care logistics'
    ),
    makeBoldBulletItem(
      'Patient Navigator',
      'Designated patient advocate who arranges logistics, emotional support, and resources on eligibility'
    ),
    makeBoldBulletItem(
      'Financial Navigator',
      'A service that breaks down costs transparency, determine eligibility for financial aid'
    ),
    makeBoldBulletItem(
      'SDOH Accommodations',
      'Free transportation and lodging as needed for patients traveling for care'
    ),
    makeBoldBulletItem(
      'Patient Education',
      'Resources to help patients further their understanding of their health'
    ),
    makeBoldBulletItem(
      'Standard Health Record',
      'A longitudinal, shareable electronic health record'
    ),
  ]

  // Insert after the anchor paragraph
  content.splice(anchorIdx + 1, 0, ...serviceItems)

  console.log(`+ Inserted ${serviceItems.length} list items after anchor`)
  console.log(`  Content: ${feature.content.length} -> ${content.length} blocks`)

  if (WRITE) {
    await client.patch(feature._id).set({ content }).commit()
    console.log('Applied to Sanity.')
  } else {
    console.log('Run with --write to apply.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
