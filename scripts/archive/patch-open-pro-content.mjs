/**
 * Patch missing content on the open-pro page in Sanity.
 *
 * Fixes 11 missing elements:
 * 1. Blockquote (1): Extract the Neil W. Wagle quote from the last Challenges
 *    bullet into a separate blockquote block.
 * 2. Images (4): Move 4 misplaced SVG icons from the bottom of the document
 *    to their correct positions before each benefit heading in "PRO enables..."
 * 3. h3 (1): Change "Contributors" heading from h4 to h3.
 * 4. Lists (5): Expand the flattened openPRO Platform "Components" bullet into
 *    properly nested sub-items (level 2 and level 3).
 *
 * Usage:
 *   node scripts/patch-open-pro-content.mjs          # dry run
 *   node scripts/patch-open-pro-content.mjs --write   # apply
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
const SLUG = 'open-pro'

function makeKey() { return randomUUID().slice(0, 12) }

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

function makeBlock(text, style = 'normal') {
  return {
    _type: 'block', _key: makeKey(), style,
    markDefs: [],
    children: [{ _type: 'span', _key: makeKey(), marks: [], text }],
  }
}

function makeBulletItem(text, level = 1) {
  return {
    _type: 'block', _key: makeKey(), style: 'normal',
    listItem: 'bullet', level,
    markDefs: [],
    children: [{ _type: 'span', _key: makeKey(), marks: [], text }],
  }
}

async function main() {
  console.log(`\n${WRITE ? 'WRITE MODE' : 'DRY RUN'} - Patching ${SLUG}\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Document not found'); process.exit(1) }

  let content = [...feature.content]
  let changes = 0

  // === FIX 1: Extract blockquote from last Challenges bullet ===
  // The block with key "8d551c51-76b" has the Wagle quote merged inline.
  // We need to split it: keep "Lack of resources..." as the bullet,
  // and create a separate blockquote block after it.
  console.log('FIX 1: Extract blockquote from Challenges section')
  const wagleIdx = content.findIndex(b =>
    b._key === '8d551c51-76b' ||
    (getBlockText(b).includes('Lack of resources to administer electronic PROs') &&
     getBlockText(b).includes('The platform must also be integrated'))
  )
  if (wagleIdx >= 0) {
    const wagleBlock = content[wagleIdx]
    const fullText = getBlockText(wagleBlock)
    // The blockquote text starts with "The platform must also..."
    const quoteStart = fullText.indexOf('"The platform must also')
    if (quoteStart > 0) {
      const bulletText = fullText.substring(0, quoteStart).replace(/[""]$/, '').trim()
      const quoteText = fullText.substring(quoteStart).trim()

      // Preserve the sup reference from original block
      const supSpan = (wagleBlock.children || []).find(c => c.marks && c.marks.includes('sup'))
      const linkDef = (wagleBlock.markDefs || []).find(m => m._type === 'link')

      const newBulletChildren = [
        { _type: 'span', _key: makeKey(), marks: [], text: bulletText }
      ]
      const newBulletMarkDefs = []
      if (supSpan && linkDef) {
        const newLinkKey = makeKey()
        newBulletMarkDefs.push({ _key: newLinkKey, _type: 'link', href: linkDef.href })
        newBulletChildren.push({ _type: 'span', _key: makeKey(), marks: [newLinkKey, 'sup'], text: supSpan.text })
      }

      const newBullet = {
        _type: 'block', _key: makeKey(), style: 'normal',
        listItem: 'bullet', level: 1,
        markDefs: newBulletMarkDefs,
        children: newBulletChildren,
      }

      const blockquote = makeBlock(quoteText, 'blockquote')

      content.splice(wagleIdx, 1, newBullet, blockquote)
      console.log(`  + Split bullet at index ${wagleIdx} into bullet + blockquote`)
      changes++
    } else {
      console.log('  ~ Wagle quote text pattern not found in block')
    }
  } else {
    console.log('  ~ Wagle block not found (may already be fixed)')
  }

  // === FIX 2: Move misplaced SVG icons to correct positions ===
  // The 4 SVG icons at the bottom (keys 066bfaf8, 629071e9, 5a251e59, c7f415fa)
  // should be placed before their respective benefit headings.
  // The first icon (5fbaf37b) is already near "Improved communication" but should
  // be right before it, not before "The PRO enables..."
  console.log('\nFIX 2: Move misplaced SVG icons')

  // Target headings for the 5 icons (in order)
  const benefitHeadings = [
    'Improved communication',
    'Less time on data entry and better time with the patient',
    'Improved quality of treatment',
    'Personalized care',
    'Improved healthcare for all',
  ]

  // Find the 4 misplaced icons at the bottom (after the last "Development" paragraph)
  const lastDevIdx = content.findIndex(b =>
    getBlockText(b).includes('Development of minimal service')
  )

  // Collect the misplaced icons at bottom
  const bottomIcons = []
  if (lastDevIdx >= 0) {
    for (let i = lastDevIdx + 1; i < content.length; i++) {
      if (content[i]._type === 'image' && content[i].alt === 'The PRO enables...') {
        bottomIcons.push({ idx: i, block: content[i] })
      }
    }
  }

  // Also find the first icon that's already near the section
  const firstIconIdx = content.findIndex(b =>
    b._type === 'image' && b._key === '5fbaf37b-b7e'
  )
  // Find it by alt text if key doesn't match
  const firstIconByAlt = firstIconIdx >= 0 ? firstIconIdx : content.findIndex((b, i) =>
    b._type === 'image' && b.alt === 'The PRO enables...' && i < (lastDevIdx || content.length)
  )

  console.log(`  Found first icon at index ${firstIconByAlt}, ${bottomIcons.length} bottom icons`)

  if (bottomIcons.length === 4) {
    // All 5 icons: first one is already placed, 4 at the bottom
    // We'll collect all 5 icons, remove them, then insert before each heading

    // First, remove bottom 4 icons (remove from end to preserve indices)
    const allIconBlocks = []
    if (firstIconByAlt >= 0) {
      allIconBlocks.push(content[firstIconByAlt])
    }
    allIconBlocks.push(...bottomIcons.map(i => i.block))

    // Remove bottom icons first (higher indices)
    for (let i = bottomIcons.length - 1; i >= 0; i--) {
      content.splice(bottomIcons[i].idx, 1)
    }
    // Remove first icon
    if (firstIconByAlt >= 0) {
      content.splice(firstIconByAlt, 1)
    }

    // Now insert each icon before its heading
    for (let h = 0; h < benefitHeadings.length && h < allIconBlocks.length; h++) {
      const headingIdx = content.findIndex(b =>
        getBlockText(b).trim() === benefitHeadings[h]
      )
      if (headingIdx >= 0) {
        content.splice(headingIdx, 0, allIconBlocks[h])
        console.log(`  + Inserted icon before "${benefitHeadings[h]}"`)
        changes++
      } else {
        console.log(`  ~ Heading "${benefitHeadings[h]}" not found`)
      }
    }
  } else {
    console.log(`  ~ Expected 4 bottom icons, found ${bottomIcons.length} — skipping`)
  }

  // === FIX 3: Change Contributors from h4 to h3 ===
  console.log('\nFIX 3: Change Contributors heading to h3')
  const contribIdx = content.findIndex(b =>
    b._type === 'block' && b.style === 'h4' && getBlockText(b).trim() === 'Contributors'
  )
  if (contribIdx >= 0) {
    content[contribIdx] = { ...content[contribIdx], style: 'h3' }
    console.log(`  + Changed h4 -> h3 at index ${contribIdx}`)
    changes++
  } else {
    // Check if it's already h3
    const alreadyH3 = content.findIndex(b =>
      b._type === 'block' && b.style === 'h3' && getBlockText(b).trim() === 'Contributors'
    )
    if (alreadyH3 >= 0) {
      console.log('  ~ Already h3')
    } else {
      console.log('  ~ Contributors heading not found')
    }
  }

  // === FIX 4: Expand flattened openPRO Platform Components list ===
  console.log('\nFIX 4: Expand nested Components list for openPRO Platform')

  // Find the flattened "Front-end services:..." bullet
  // Only match if it's a single long bullet (not already expanded into sub-items)
  const frontEndIdx = content.findIndex((b, i) =>
    b.listItem === 'bullet' &&
    getBlockText(b).startsWith('Front-end services:') &&
    getBlockText(b).length > 100 && // Flattened version has all text in one block
    !(content[i + 1] && content[i + 1].listItem === 'bullet' && content[i + 1].level === 2)
  )

  if (frontEndIdx >= 0) {
    // Replace the single flattened bullet with properly nested items
    const nestedFrontEnd = [
      makeBulletItem('Front-end services:', 1),
      makeBulletItem('Website for requesting, completing, and receiving PROs', 2),
      makeBulletItem('Request interface', 2),
      makeBulletItem('Request a PRO to be filled out by self or other', 3),
      makeBulletItem('Receive a unique key that identifies the incomplete PRO', 3),
      makeBulletItem('PRO/questionnaire is one of: custom designed questionnaire, established questionnaire from PROM library (PROMIS), openPRO product such as ROS capture or Symptom Reporter', 3),
      makeBulletItem('Capture interface', 2),
      makeBulletItem('User submits unique key to access and complete PRO', 3),
      makeBulletItem('Provide interface to complete custom questionnaire', 3),
      makeBulletItem('Provide interfaces from PROMIS or openPRO tools', 3),
      makeBulletItem('View interface', 2),
      makeBulletItem('User submits unique key to view or download completed PRO', 3),
      makeBulletItem('Visualization tools for questionnaires, Symptom Reporter, and ROS Reporter.', 3),
      makeBulletItem('Ability to produce associated FHIR Condition resources from questionnaires', 3),
    ]

    content.splice(frontEndIdx, 1, ...nestedFrontEnd)
    console.log(`  + Expanded "Front-end services" into ${nestedFrontEnd.length} nested items`)
    changes++

    // Find and expand "Back-end services:..." bullet (shifted by expansion)
    const backEndIdx = content.findIndex((b, i) =>
      i > frontEndIdx && b.listItem === 'bullet' &&
      getBlockText(b).startsWith('Back-end services:') &&
      getBlockText(b).length > 50 &&
      !(content[i + 1] && content[i + 1].listItem === 'bullet' && content[i + 1].level === 2)
    )
    if (backEndIdx >= 0) {
      const nestedBackEnd = [
        makeBulletItem('Back-end services:', 1),
        makeBulletItem('Key manager. Generates, distributes, and processes keys associated with incomplete and complete PROs', 2),
        makeBulletItem('Storage for pending and complete PROs.', 2),
      ]
      content.splice(backEndIdx, 1, ...nestedBackEnd)
      console.log(`  + Expanded "Back-end services" into ${nestedBackEnd.length} nested items`)
      changes++
    } else {
      console.log('  ~ "Back-end services" bullet not found')
    }
  } else {
    console.log('  ~ "Front-end services" bullet not found (may already be expanded)')
  }

  // === Summary ===
  console.log(`\n${changes} fixes applied (${feature.content.length} -> ${content.length} blocks)`)

  if (WRITE && changes > 0) {
    await client.patch(feature._id).set({ content }).commit()
    console.log('Applied to Sanity.')
  } else if (changes > 0) {
    console.log('Run with --write to apply.')
  } else {
    console.log('No changes needed.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
