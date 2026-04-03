/**
 * Patch ai-design-certification content in Sanity.
 *
 * Fixes two issues found by comparing Gatsby (goinvo.com) vs Next.js:
 *
 * 1. Section 3 "Non-negotiable checks" list items are too short.
 *    Gatsby has expanded descriptions (e.g., "Safety: No diagnosis, clear
 *    uncertainty, calm tone (or appropriate thresholds, false-positive control)")
 *    but Sanity only has the label (e.g., "Safety"). This patch replaces each
 *    list item with the full Gatsby text.
 *
 * 2. Missing paragraph after section 3 list: "Some checks are automated.
 *    All are human-verified." This exists on Gatsby but is absent from Sanity.
 *
 * Usage:
 *   node scripts/patch-ai-cert.mjs          # dry run (default)
 *   node scripts/patch-ai-cert.mjs --write  # apply changes
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
const SLUG = 'ai-design-certification'

function makeKey() { return randomUUID().slice(0, 12) }

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

/**
 * Section 3 list item replacements.
 * Key = current short text in Sanity, Value = full text from Gatsby.
 */
const SECTION3_REPLACEMENTS = [
  {
    current: 'Safety',
    replacement: 'Safety: No diagnosis, clear uncertainty, calm tone (or appropriate thresholds, false-positive control)',
  },
  {
    current: 'Scope of Practice',
    replacement: 'Scope of Practice: What the software may and may not assert',
  },
  {
    current: 'Bias',
    replacement: 'Bias: Works across age, sex, medications, and baselines',
  },
  {
    current: 'Accessibility',
    replacement: 'Accessibility: Plain language, readable, screen-reader safe (clinician and patient-readable rationale)',
  },
  {
    current: 'Data provenance',
    replacement: 'Data provenance: Users can see what data drove the insight',
  },
  {
    current: 'Regulatory fit',
    replacement: 'Regulatory fit: Wellness guidance, not medical advice',
  },
  {
    current: 'Usability',
    replacement: 'Usability: Actionable, not alarming',
  },
  {
    current: 'Human escalation',
    replacement: 'Human escalation: When and how a clinician must intervene',
  },
]

async function main() {
  console.log(`\n${WRITE ? 'WRITE MODE' : 'DRY RUN'} - Patching ${SLUG}\n`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug: SLUG }
  )
  if (!feature) { console.error('Document not found'); process.exit(1) }

  const content = [...feature.content]
  let changes = 0

  // ── Fix 1: Expand section 3 list items ──────────────────────────────────

  // Find the "3. Non-negotiable checks" heading
  const section3Idx = content.findIndex(b =>
    getBlockText(b) === '3. Non-negotiable checks'
  )
  if (section3Idx < 0) {
    console.error('Section 3 heading "3. Non-negotiable checks" not found')
    process.exit(1)
  }
  console.log(`Found section 3 heading at index ${section3Idx}`)

  // Find the "4. Human review catches problems" heading (section boundary)
  const section4Idx = content.findIndex(b =>
    getBlockText(b) === '4. Human review catches problems'
  )
  if (section4Idx < 0) {
    console.error('Section 4 heading "4. Human review catches problems" not found')
    process.exit(1)
  }

  // Process list items between section 3 and section 4
  let listItemsUpdated = 0
  for (let i = section3Idx + 1; i < section4Idx; i++) {
    const block = content[i]
    if (block._type !== 'block' || block.listItem !== 'bullet') continue

    const text = getBlockText(block)
    const match = SECTION3_REPLACEMENTS.find(r => r.current === text)
    if (match) {
      console.log(`  Replacing list item [${i}]: "${match.current}" → "${match.replacement}"`)
      // Replace the children with the new text (single span, no marks)
      content[i] = {
        ...block,
        children: [
          { _type: 'span', _key: makeKey(), marks: [], text: match.replacement },
        ],
      }
      listItemsUpdated++
      changes++
    } else if (text === match?.replacement) {
      console.log(`  List item [${i}] already updated: "${text}"`)
    }
  }
  console.log(`  Updated ${listItemsUpdated} of ${SECTION3_REPLACEMENTS.length} list items\n`)

  // ── Fix 2: Add missing paragraph after section 3 list ───────────────────

  // The paragraph "Some checks are automated. All are human-verified."
  // should appear after the last list item and before section 4.
  const MISSING_TEXT = 'Some checks are automated. All are human-verified.'

  // Check if it already exists
  const alreadyExists = content.some(b =>
    b._type === 'block' && getBlockText(b) === MISSING_TEXT
  )

  if (alreadyExists) {
    console.log(`Paragraph "${MISSING_TEXT}" already exists — skipping.\n`)
  } else {
    // Find the last list item before section 4
    let insertIdx = section4Idx
    for (let i = section4Idx - 1; i > section3Idx; i--) {
      if (content[i].listItem === 'bullet') {
        insertIdx = i + 1
        break
      }
    }

    const newBlock = {
      _type: 'block',
      _key: makeKey(),
      style: 'normal',
      markDefs: [],
      children: [
        { _type: 'span', _key: makeKey(), marks: [], text: MISSING_TEXT },
      ],
    }

    console.log(`Inserting paragraph "${MISSING_TEXT}" at index ${insertIdx}`)
    content.splice(insertIdx, 0, newBlock)
    changes++
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log(`\nTotal changes: ${changes}`)

  if (changes === 0) {
    console.log('Nothing to patch — content already up to date.\n')
    return
  }

  if (!WRITE) {
    console.log('DRY RUN — pass --write to apply.\n')
    return
  }

  // Apply the patch
  await client
    .patch(feature._id)
    .set({ content })
    .commit()

  console.log(`Patched document ${feature._id} with ${changes} changes.\n`)
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
