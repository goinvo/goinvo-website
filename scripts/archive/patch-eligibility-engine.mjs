/**
 * Patch eligibility-engine content in Sanity.
 *
 * Fixes:
 * 1. Convert flat paragraphs in "Anticipated Impact" section to proper bullet lists
 *    - "Greater Access to Services" + "Timely Communication and Support" → 2 list items under "For MA Resident"
 *    - "Increased Efficiency" + "Data-Driven Insights" → 2 list items under "For Government/ Agencies"
 *    The Gatsby source uses <ul><li> with bold lead-in text followed by description.
 *    Currently in Sanity these are merged into single paragraphs (2 items per para).
 *
 * Usage:
 *   node scripts/patch-eligibility-engine.mjs          # dry run
 *   node scripts/patch-eligibility-engine.mjs --write   # apply changes
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
const SLUG = 'eligibility-engine'

function makeKey() {
  return Math.random().toString(36).slice(2, 14)
}

async function run() {
  console.log(`\n=== Patching ${SLUG} (${WRITE ? 'WRITE' : 'DRY RUN'}) ===\n`)

  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!doc) {
    console.error(`Document not found: ${SLUG}`)
    process.exit(1)
  }

  console.log(`Document: ${doc._id}`)
  console.log(`Content blocks: ${doc.content.length}`)

  const content = [...doc.content]
  let changes = 0

  // ---- Fix 1: Split merged "For MA Resident" paragraph into 2 list items ----
  // Find the block with key "8788386ee23a" (has both "Greater Access" and "Timely Communication")
  const residentBlockIdx = content.findIndex(b => b._key === '8788386ee23a')
  if (residentBlockIdx >= 0) {
    const block = content[residentBlockIdx]
    console.log(`\n  Found "For MA Resident" merged block at index ${residentBlockIdx}`)
    console.log(`    Children: ${block.children.length} spans`)

    // Replace with 2 separate list items
    const listItem1 = {
      _type: 'block',
      _key: makeKey(),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: makeKey(),
          marks: ['strong'],
          text: 'Greater Access to Services: ',
        },
        {
          _type: 'span',
          _key: makeKey(),
          marks: [],
          text: 'Proactive recommendations and a simplified application process would make it easier for residents to discover and access a wider range of services they qualify for.',
        },
      ],
    }

    const listItem2 = {
      _type: 'block',
      _key: makeKey(),
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: makeKey(),
          marks: ['strong'],
          text: 'Timely Communication and Support: ',
        },
        {
          _type: 'span',
          _key: makeKey(),
          marks: [],
          text: 'The system could provide real-time updates and notifications about benefit eligibility, renewal deadlines, and other important information, ensuring residents stay informed and receive the support they need.',
        },
      ],
    }

    content.splice(residentBlockIdx, 1, listItem1, listItem2)
    console.log(`    → Replaced 1 merged block with 2 bullet list items`)
    changes++
  } else {
    console.log(`  ⚠ Could not find "For MA Resident" merged block (key: 8788386ee23a)`)
  }

  // Recalculate indices after splice (offset by +1 since we added 1 block)
  // ---- Fix 2: Split "For Government" items into list items ----
  // "Increased Efficiency" block (key: 3d03f0b53791)
  // "Data-Driven Insights" block (key: 98f86d1d55ef)
  // These are already separate paragraphs — just need listItem: 'bullet'

  const efficiencyIdx = content.findIndex(b => b._key === '3d03f0b53791')
  if (efficiencyIdx >= 0) {
    console.log(`\n  Found "Increased Efficiency" block at index ${efficiencyIdx}`)
    content[efficiencyIdx] = {
      ...content[efficiencyIdx],
      listItem: 'bullet',
      level: 1,
    }
    // Fix trailing space in the description text
    const children = [...content[efficiencyIdx].children]
    if (children.length >= 2 && children[1].text.endsWith(' ')) {
      children[1] = { ...children[1], text: children[1].text.trimEnd() }
      content[efficiencyIdx] = { ...content[efficiencyIdx], children }
    }
    console.log(`    → Converted to bullet list item`)
    changes++
  } else {
    console.log(`  ⚠ Could not find "Increased Efficiency" block (key: 3d03f0b53791)`)
  }

  const insightsIdx = content.findIndex(b => b._key === '98f86d1d55ef')
  if (insightsIdx >= 0) {
    console.log(`\n  Found "Data-Driven Insights" block at index ${insightsIdx}`)
    content[insightsIdx] = {
      ...content[insightsIdx],
      listItem: 'bullet',
      level: 1,
    }
    console.log(`    → Converted to bullet list item`)
    changes++
  } else {
    console.log(`  ⚠ Could not find "Data-Driven Insights" block (key: 98f86d1d55ef)`)
  }

  // ---- Summary ----
  console.log(`\n  Total changes: ${changes}`)
  console.log(`  Content blocks: ${doc.content.length} → ${content.length}`)

  if (changes === 0) {
    console.log(`  Nothing to patch.`)
    return
  }

  if (WRITE) {
    await client
      .patch(doc._id)
      .set({ content })
      .commit()
    console.log(`\n  ✓ Patched successfully!`)
  } else {
    console.log(`\n  (dry run — pass --write to apply)`)
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
