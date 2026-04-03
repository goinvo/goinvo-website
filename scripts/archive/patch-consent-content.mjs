/**
 * Patch patient-centered-consent: add missing lists, fix heading levels, split flattened content.
 *
 * Missing from Sanity vs Gatsby:
 * 1. UL after "meaningful consent requires" — flattened into inline text (block ll4fepxcn6)
 * 2. UL after "effectively communicate" — flattened into inline text (block btbzu9zf4if)
 * 3. OL under "The gap in comprehension" — flattened into one paragraph (block yyh4yw027ue)
 * 4. OL recap list after "Recap" h2 — entirely missing
 * 5. Guideline headings 1-8 are h3 but should be h4 (matching Gatsby's h4.header--sm)
 *
 * Usage:
 *   node scripts/patch-consent-content.mjs           # dry run
 *   node scripts/patch-consent-content.mjs --write   # apply
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

function getBlockText(block) {
  if (block._type !== 'block') return ''
  return (block.children || []).map(c => c.text || '').join('')
}

function makeKey() {
  return Math.random().toString(36).slice(2, 12)
}

/** Create a simple text block */
function textBlock(text, style = 'normal', marks = [], markDefs = []) {
  return {
    _key: makeKey(),
    _type: 'block',
    style,
    markDefs,
    children: Array.isArray(text)
      ? text
      : [{ _key: makeKey(), _type: 'span', marks, text }],
  }
}

/** Create a list item block */
function listItem(text, listType = 'bullet', level = 1, children = null, markDefs = []) {
  return {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    listItem: listType,
    level,
    markDefs,
    children: children || [{ _key: makeKey(), _type: 'span', marks: [], text }],
  }
}

/**
 * Build the replacement for block ll4fepxcn6:
 * "At a baseline, meaningful consent requires [sup 2]: informedness comprehension, AND voluntariness"
 *
 * Should become:
 *   paragraph: "At a baseline, meaningful consent requires [sup 2]:"
 *   ul: informedness
 *   ul: comprehension, AND
 *   ul: voluntariness
 */
function buildConsentRequiresList(originalBlock) {
  // Keep the paragraph but fix its text to end at the colon
  const linkKey = makeKey()
  const para = {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: linkKey, _type: 'link', href: '#references' }],
    children: [
      { _key: makeKey(), _type: 'span', marks: [], text: 'At a baseline, meaningful consent requires ' },
      { _key: makeKey(), _type: 'span', marks: [linkKey, 'sup'], text: '2' },
      { _key: makeKey(), _type: 'span', marks: [], text: ':' },
    ],
  }

  return [
    para,
    listItem('informedness'),
    listItem('comprehension, AND'),
    listItem('voluntariness'),
  ]
}

/**
 * Build the replacement for block btbzu9zf4if:
 * "When patient health data is involved, meaningful consent should also effectively communicate [sup 3]:
 *  how patient data will be used, who will have access, ..."
 *
 * Should become:
 *   paragraph: "When patient health data is involved, meaningful consent should also effectively communicate [sup 3]:"
 *   ul: how patient data will be used,
 *   ul: who will have access,
 *   ul: how it will be protected, and
 *   ul: what rights the patient has over the shared data.
 */
function buildCommunicateList(originalBlock) {
  const linkKey = makeKey()
  const para = {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    markDefs: [{ _key: linkKey, _type: 'link', href: '#references' }],
    children: [
      { _key: makeKey(), _type: 'span', marks: [], text: 'When patient health data is involved, meaningful consent should also effectively communicate ' },
      { _key: makeKey(), _type: 'span', marks: [linkKey, 'sup'], text: '3' },
      { _key: makeKey(), _type: 'span', marks: [], text: ':' },
    ],
  }

  return [
    para,
    listItem('how patient data will be used,'),
    listItem('who will have access,'),
    listItem('how it will be protected, and'),
    listItem('what rights the patient has over the shared data.'),
  ]
}

/**
 * Build the replacement for block yyh4yw027ue:
 * The gap in comprehension paragraph + ordered list.
 *
 * Gatsby has: paragraph text + ol with 4 items (each with bold headers + explanation)
 * Sanity has: everything flattened into one paragraph with bold spans
 *
 * Should become:
 *   paragraph: "Informed consent is especially important..." (up to "agreeing to.")
 *   ol 1: "Consent documents are usually filled with complex legal language [4]."
 *   ol 2: "The consent process is usually rushed [4]."
 *   ol 3: "It has become the norm to accept documents..." (with explanation text)
 *   ol 4: "Comprehension is rarely measured." (with explanation text)
 */
function buildComprehensionGapList(originalBlock) {
  const para = textBlock(
    'Informed consent is especially important in medicine and health related services. Patients need to adequately weigh the pros and cons of their involvement to make the best choice for their health. Unfortunately, three issues with traditional consent can prevent patients from fully understanding what they are agreeing to.'
  )

  const link4a = makeKey()
  const item1 = {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    listItem: 'number',
    level: 1,
    markDefs: [{ _key: link4a, _type: 'link', href: '#references' }],
    children: [
      { _key: makeKey(), _type: 'span', marks: ['strong'], text: 'Consent documents are usually filled with complex legal language ' },
      { _key: makeKey(), _type: 'span', marks: [link4a, 'sup'], text: '4' },
      { _key: makeKey(), _type: 'span', marks: ['strong'], text: '.' },
    ],
  }

  const link4b = makeKey()
  const item2 = {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    listItem: 'number',
    level: 1,
    markDefs: [{ _key: link4b, _type: 'link', href: '#references' }],
    children: [
      { _key: makeKey(), _type: 'span', marks: ['strong'], text: 'The consent process is usually rushed ' },
      { _key: makeKey(), _type: 'span', marks: [link4b, 'sup'], text: '4' },
      { _key: makeKey(), _type: 'span', marks: ['strong'], text: '.' },
    ],
  }

  const link4c = makeKey()
  const link5 = makeKey()
  const item3 = {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    listItem: 'number',
    level: 1,
    markDefs: [
      { _key: link4c, _type: 'link', href: '#references' },
      { _key: link5, _type: 'link', href: '#references' },
    ],
    children: [
      { _key: makeKey(), _type: 'span', marks: ['strong'], text: 'It has become the norm to accept documents without fully understanding them.' },
      { _key: makeKey(), _type: 'span', marks: [], text: ' The documents themselves are usually not designed with a focused effort to promote patient understanding ' },
      { _key: makeKey(), _type: 'span', marks: [link4c, 'sup'], text: '4' },
      { _key: makeKey(), _type: 'span', marks: [], text: '. One group of researchers found that over 90% of adults agreed to a terms of services and privacy policy that included multiple \'gotcha clauses\' including "providing a first-born child as payment for SNS access ' },
      { _key: makeKey(), _type: 'span', marks: [link5, 'sup'], text: '5' },
      { _key: makeKey(), _type: 'span', marks: [], text: '".' },
    ],
  }

  const item4 = {
    _key: makeKey(),
    _type: 'block',
    style: 'normal',
    listItem: 'number',
    level: 1,
    markDefs: [],
    children: [
      { _key: makeKey(), _type: 'span', marks: ['strong'], text: 'Comprehension is rarely measured.' },
      { _key: makeKey(), _type: 'span', marks: [], text: " In other words, most consent processes don't track what patients understand." },
    ],
  }

  return [para, item1, item2, item3, item4]
}

/**
 * Build the recap ordered list (completely missing from Sanity).
 * Goes after the "Recap" h2 heading.
 */
function buildRecapList() {
  return [
    listItem('Meet Accessibility Standards', 'number'),
    listItem('Make Consent Front and Center', 'number'),
    listItem('Use Plain, Concise Language', 'number'),
    listItem('Set Time Expectations', 'number'),
    listItem('Organize Content into Bite-sized Sections', 'number'),
    listItem('Use Visual Storytelling', 'number'),
    listItem('Provide Real-Time Help', 'number'),
    listItem('Use "Repeat Back" to Engage the Brain', 'number'),
    listItem('Bonus: Keep Measuring + iterating!', 'number'),
  ]
}

/**
 * Guideline headings that should be h4 (not h3) to match Gatsby's h4.header--sm.
 */
const GUIDELINE_HEADINGS = [
  '1. Meet Accessibility Standards',
  '2. Make Consent Front and Center',
  '3. Use Plain, Concise Language',
  '4. Set Time Expectations',
  '5. Organize Content into Bite-sized Sections',
  '6. Use Visual Storytelling',
  '7. Provide Real-Time Help',
  '8. Use \u201CRepeat Back\u201D',  // Uses smart quotes in Sanity
  '8. Use "Repeat Back"',            // Or straight quotes
]

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Patching patient-centered-consent\n`)

  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == "patient-centered-consent"][0]{ _id, title, content }`
  )
  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`  Document: ${doc.title} (${doc._id})`)
  console.log(`  Content blocks: ${doc.content.length}`)

  const content = doc.content
  const newContent = []
  let changes = 0

  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    const text = getBlockText(block).trim()

    // --- Fix 1: Split "meaningful consent requires" into paragraph + ul ---
    if (block._key === 'll4fepxcn6' || text.startsWith('At a baseline, meaningful consent requires')) {
      const expanded = buildConsentRequiresList(block)
      console.log(`  [FIX 1] Splitting "meaningful consent requires" → 1 paragraph + 3 bullet items`)
      newContent.push(...expanded)
      changes++
      continue
    }

    // --- Fix 2: Split "effectively communicate" into paragraph + ul ---
    if (block._key === 'btbzu9zf4if' || text.startsWith('When patient health data is involved, meaningful consent should also')) {
      const expanded = buildCommunicateList(block)
      console.log(`  [FIX 2] Splitting "effectively communicate" → 1 paragraph + 4 bullet items`)
      newContent.push(...expanded)
      changes++
      continue
    }

    // --- Fix 3: Split comprehension gap paragraph into paragraph + ol ---
    if (block._key === 'yyh4yw027ue' || text.startsWith('Informed consent is especially important in medicine')) {
      const expanded = buildComprehensionGapList(block)
      console.log(`  [FIX 3] Splitting comprehension gap → 1 paragraph + 4 numbered items`)
      newContent.push(...expanded)
      changes++
      continue
    }

    // --- Fix 4: Insert recap ordered list after "Recap" heading ---
    if (block._key === '7p207qaamol' || (block.style === 'h2' && text === 'Recap')) {
      newContent.push(block)
      // Check if next block is already the recap list (idempotency)
      const nextText = i + 1 < content.length ? getBlockText(content[i + 1]).trim() : ''
      if (nextText !== 'Meet Accessibility Standards') {
        const recapItems = buildRecapList()
        console.log(`  [FIX 4] Inserting recap ordered list (9 items) after "Recap" heading`)
        newContent.push(...recapItems)
        changes++
      } else {
        console.log(`  [SKIP 4] Recap list already present`)
      }
      continue
    }

    // --- Fix 5: Change guideline h3 headings to h4 ---
    if (block._type === 'block' && block.style === 'h3') {
      const isGuideline = GUIDELINE_HEADINGS.some(prefix => text.startsWith(prefix))
      if (isGuideline) {
        console.log(`  [FIX 5] h3 → h4: "${text.substring(0, 50)}..."`)
        newContent.push({ ...block, style: 'h4' })
        changes++
        continue
      }
    }

    // Keep unchanged block
    newContent.push(block)
  }

  console.log(`\n  Total changes: ${changes}`)
  console.log(`  Block count: ${content.length} → ${newContent.length}`)

  if (WRITE && changes > 0) {
    await client
      .patch(doc._id)
      .set({ content: newContent })
      .commit()
    console.log(`  ✅ Applied to Sanity`)
  } else if (changes > 0) {
    console.log(`  Run with --write to apply.`)
  } else {
    console.log(`  No changes needed.`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
