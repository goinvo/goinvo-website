/**
 * Restructure Understanding Zika content to use dark/red background sections
 * matching the Gatsby page's visual design.
 *
 * The Gatsby page has:
 * - Entire content on dark charcoal (rgb(35,35,35)) background with white text
 * - Accent sections in maroon/red (rgb(143,39,65)) for cases timeline, bug spray, treatment
 *
 * Current Sanity has 3 gray backgroundSections. This script:
 * 1. Changes existing gray backgroundSections to dark
 * 2. Wraps the remaining non-background content in dark backgroundSections
 * 3. Changes specific sections to red background
 *
 * Usage:
 *   node scripts/patch-zika-backgrounds.mjs          # dry run
 *   node scripts/patch-zika-backgrounds.mjs --write   # apply
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
const SLUG = 'understanding-zika'

function makeKey() { return randomUUID().slice(0, 12) }

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

// Headings that should trigger red background sections
const RED_SECTION_HEADINGS = [
  'estimated 1.6 million',  // Zika cases timeline
  'Choosing the right bug spray',
  'Treatment for Adults',
  'Treatment for Pregnant Women',
]

function shouldBeRed(text) {
  return RED_SECTION_HEADINGS.some(h => text.toLowerCase().includes(h.toLowerCase()))
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Restructuring ${SLUG} backgrounds\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Not found'); return }

  console.log(`Found: "${feature.title}" — ${feature.content?.length || 0} blocks`)

  const content = feature.content || []

  // Step 1: Change existing gray backgroundSections to dark
  let grayChanged = 0
  const step1 = content.map(block => {
    if (block._type === 'backgroundSection' && block.color === 'gray') {
      grayChanged++
      return { ...block, color: 'dark' }
    }
    return block
  })
  console.log(`Changed ${grayChanged} gray → dark backgroundSections`)

  // Step 2: Wrap all non-backgroundSection content in a single dark backgroundSection
  // Group consecutive non-backgroundSection blocks
  const result = []
  let currentGroup = []

  for (const block of step1) {
    if (block._type === 'backgroundSection') {
      // Flush any accumulated group into a dark wrapper
      if (currentGroup.length > 0) {
        // Check if any heading in this group should be red
        const hasRedHeading = currentGroup.some(b => {
          const text = getBlockText(b)
          return shouldBeRed(text)
        })

        result.push({
          _type: 'backgroundSection',
          _key: makeKey(),
          color: hasRedHeading ? 'red' : 'dark',
          content: currentGroup,
        })
        console.log(`  Wrapped ${currentGroup.length} blocks in ${hasRedHeading ? 'red' : 'dark'} background`)
        currentGroup = []
      }
      // Pass through existing backgroundSection as-is
      result.push(block)
    } else if (block._type === 'references') {
      // References stay outside dark backgrounds
      if (currentGroup.length > 0) {
        result.push({
          _type: 'backgroundSection',
          _key: makeKey(),
          color: 'dark',
          content: currentGroup,
        })
        console.log(`  Wrapped ${currentGroup.length} blocks in dark background`)
        currentGroup = []
      }
      result.push(block)
    } else {
      currentGroup.push(block)
    }
  }

  // Flush final group
  if (currentGroup.length > 0) {
    result.push({
      _type: 'backgroundSection',
      _key: makeKey(),
      color: 'dark',
      content: currentGroup,
    })
    console.log(`  Wrapped ${currentGroup.length} blocks in dark background (final)`)
  }

  console.log(`\nResult: ${content.length} blocks → ${result.length} top-level blocks`)
  console.log(`Background sections: ${result.filter(b => b._type === 'backgroundSection').length}`)

  if (WRITE) {
    await client.patch(feature._id).set({ content: result }).commit()
    console.log('✅ Applied')
  } else {
    console.log('\nRun with --write to apply.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
