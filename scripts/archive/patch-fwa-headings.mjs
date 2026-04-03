/**
 * Patch fraud-waste-abuse-in-healthcare heading levels to match Gatsby source.
 *
 * Gatsby heading structure:
 *   h1.header--xl        → sectionTitle (large centered serif)
 *   h2.header--lg        → h2 (medium serif — already correct for most)
 *   h2.header--md        → h3 (small uppercase sans)
 *   h2.header--xl center → sectionTitle
 *
 * Usage: node scripts/patch-fwa-headings.mjs [--write]
 */

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  token: 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const WRITE = process.argv.includes('--write')

// Mapping: heading text → correct Sanity block style
// Based on Gatsby source: https://www.goinvo.com/vision/fraud-waste-abuse-in-healthcare/
const HEADING_FIXES = {
  // These are h1.header--xl in Gatsby → should be sectionTitle (large centered serif)
  'What is Fraud, Waste, and Abuse?': 'sectionTitle',
  'The Cost of FWA, $1 Trillion': 'sectionTitle',
  'Recovering FWA': 'sectionTitle',
  'Proposed Solutions': 'sectionTitle',

  // These are h2.header--xl text--center → sectionTitle
  'Methodology': 'sectionTitle',
  'Authors': 'sectionTitle',

  // These are h2.header--md in Gatsby → should be h3 (small uppercase sans)
  // Note: "Fraud 10%..." has "A2" appended from flattened superscript
  'Fraud 10% + Waste 20%': 'h3',
  'Fraud 10% + Waste 20%A2': 'h3',
  'Calculations': 'h3',

  // These are h2.header--lg text--center → h2Center
  '30% FWA': 'h2Center',
}

// Image size fixes (by index in the content array)
// Gatsby page has specific widths for each image
const IMAGE_SIZES = {
  12: 'full',    // FWA definitions diagram
  19: 'medium',  // 30% FWA pie chart
  23: 'full',    // Recovery stats
  38: 'full',    // Health Accuracy Receipt mockup
  41: 'full',    // FWA Tracker mockup 1
  42: 'full',    // FWA Tracker mockup 2
}

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'fraud-waste-abuse-in-healthcare'][0]{ _id, content }`
  )

  if (!doc) { console.log('Document not found'); return }

  let patches = 0
  const transaction = client.transaction()

  // Fix heading styles
  for (const [i, block] of doc.content.entries()) {
    if (block._type !== 'block') continue
    const text = block.children?.map(c => c.text || '').join('').trim()
    // Try exact match first, then startsWith for headings with trailing superscript text
    const newStyle = HEADING_FIXES[text] ||
      Object.entries(HEADING_FIXES).find(([key]) => text.startsWith(key))?.[1]
    if (newStyle && block.style !== newStyle) {
      console.log(`  [${i}] "${text.substring(0, 50)}" → ${block.style} → ${newStyle}`)
      if (WRITE) {
        transaction.patch(doc._id, p =>
          p.set({ [`content[_key=="${block._key}"].style`]: newStyle })
        )
      }
      patches++
    }
  }

  // Fix image sizes
  for (const [indexStr, size] of Object.entries(IMAGE_SIZES)) {
    const i = parseInt(indexStr)
    const block = doc.content[i]
    if (block?._type === 'image' && block.size !== size) {
      console.log(`  [${i}] image → size: ${block.size} → ${size}`)
      if (WRITE) {
        transaction.patch(doc._id, p =>
          p.set({ [`content[_key=="${block._key}"].size`]: size })
        )
      }
      patches++
    }
  }

  if (WRITE && patches > 0) {
    await transaction.commit()
    console.log(`\n✅ Applied ${patches} patches`)
  } else {
    console.log(`\n${patches} patches to apply${!WRITE ? ' (run with --write)' : ''}`)
  }
}

main().catch(console.error)
