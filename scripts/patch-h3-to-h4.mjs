/**
 * Patch h3 headings that should be h4 in Sanity content
 *
 * During migration from Gatsby, some h4 headings (header--sm: normal case bold)
 * were mapped as h3 (header--md: uppercase semibold). This script fixes them
 * by comparing against the Gatsby page and changing h3 → h4 for affected blocks.
 *
 * Usage:
 *   node scripts/patch-h3-to-h4.mjs                # dry run all known pages
 *   node scripts/patch-h3-to-h4.mjs --write        # apply changes
 *   node scripts/patch-h3-to-h4.mjs open-pro       # dry run single page
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

/**
 * Pages with h3 headings that should be h4, based on audit comparison with Gatsby.
 * Key: slug, Value: array of heading text prefixes to match (h3 → h4)
 *
 * These were identified from the compare-pages.ts audit as:
 * [HEADING_STYLE] "X": should be normal case bold (header--sm) but has uppercase/header-md styling
 */
const PAGES_TO_FIX = {
  'open-pro': [
    'Open source services for patients',
    'The Patient-Reported Outcome is the plat',
    'Your Patient Reported Outcome',
    'The PRO enables',
    'Improved communication',
    'Less time on data entry',
    'Improved quality of treatment',
    'Personalized care',
    'Improved healthcare for all',
    'Progress',
    'Limitations',
    'Challenges',
    'Feature roadmap',
    'Current state:',
    'Estimated Level of Effort',
    'Goals',
    'Components',
    'Contributors',
  ],
  'virtual-care': [
    'Half of face-to-face',
    'The top 15 types of encounters',
    'The Top 15 Encounters Breakdown',
    '"Healthcare delayed is healthcare denied"',
    'Care must go virtual',
    'v1 -',
    'About GoInvo',
  ],
  'own-your-health-data': [
    '4 Principles',
    'About GoInvo',
  ],
  'patient-centered-consent': [
    'Bonus: 9.',
  ],
}

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

function shouldChangeToH4(block, prefixes) {
  if (block._type !== 'block' || block.style !== 'h3') return false
  const text = getBlockText(block)
  return prefixes.some(prefix => text.startsWith(prefix))
}

async function patchPage(slug, prefixes) {
  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, title, content }`,
    { slug }
  )

  if (!feature) {
    console.log(`  ⚠ Feature "${slug}" not found`)
    return 0
  }

  console.log(`\n  📄 ${feature.title} (${feature._id})`)
  console.log(`     Content blocks: ${feature.content?.length || 0}`)

  const content = feature.content || []
  let patchCount = 0

  const patchedContent = content.map(block => {
    if (shouldChangeToH4(block, prefixes)) {
      patchCount++
      const text = getBlockText(block)
      const preview = text.length > 50 ? text.slice(0, 50) + '...' : text
      console.log(`     h3 → h4: "${preview}"`)
      return { ...block, style: 'h4' }
    }
    return block
  })

  console.log(`     Changes: ${patchCount}`)

  if (WRITE && patchCount > 0) {
    await client
      .patch(feature._id)
      .set({ content: patchedContent })
      .commit()
    console.log(`     ✅ Applied`)
  }

  return patchCount
}

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Patching h3 → h4 headings\n`)

  // Filter to specific slug if provided
  const slugArg = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])
  const pages = slugArg
    ? { [slugArg]: PAGES_TO_FIX[slugArg] || [] }
    : PAGES_TO_FIX

  let totalPatches = 0

  for (const [slug, prefixes] of Object.entries(pages)) {
    if (prefixes.length === 0) {
      console.log(`  ⚠ No prefix patterns for "${slug}"`)
      continue
    }
    totalPatches += await patchPage(slug, prefixes)
  }

  console.log(`\nTotal changes: ${totalPatches}`)
  if (!WRITE && totalPatches > 0) {
    console.log('Run with --write to apply.')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
