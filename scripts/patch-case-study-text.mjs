/**
 * Patch missing text content on 6 case study pages.
 *
 * Fixes:
 * 1. mass-snap — Remove raw HTML artifact blocks (<a and href=... from MDX migration)
 *               and replace with a proper buttonGroup block.
 *             — Strip { / prettier-ignore-start / } and { / prettier-ignore-end / }
 *               from two paragraph blocks, restoring clean text.
 *             — Restore missing superscript references (2 and 3) in two paragraphs.
 * 2. wuxi-nextcode-familycode — Add "for WuXi NextCODE" subtitle paragraph.
 * 3. infobionic-heart-monitoring — Add "for InfoBionic" subtitle paragraph.
 * 4. insidetracker-nutrition-science — Add "for InsideTracker" subtitle paragraph.
 *
 * Usage:
 *   node scripts/patch-case-study-text.mjs          # dry run
 *   node scripts/patch-case-study-text.mjs --write  # apply
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
const key = () => randomUUID().slice(0, 12)

// ─── Helpers ────────────────────────────────────────────────────

function makeTextBlock(text, style = 'normal') {
  return {
    _key: key(),
    _type: 'block',
    style,
    markDefs: [],
    children: [{ _key: key(), _type: 'span', marks: [], text }],
  }
}

function makeRefCitationBlock(segments) {
  /**
   * Build a block with mixed plain text and superscript citation spans.
   * segments is an array of { text, refNumber? } objects.
   * If refNumber is set, the text gets a refCitation mark.
   */
  const markDefs = []
  const children = []
  for (const seg of segments) {
    if (seg.refNumber) {
      const markKey = key()
      markDefs.push({
        _key: markKey,
        _type: 'refCitation',
        refNumber: seg.refNumber,
      })
      children.push({
        _key: key(),
        _type: 'span',
        marks: [markKey],
        text: seg.text,
      })
    } else {
      children.push({
        _key: key(),
        _type: 'span',
        marks: [],
        text: seg.text,
      })
    }
  }
  return {
    _key: key(),
    _type: 'block',
    style: 'normal',
    markDefs,
    children,
  }
}

function makeButtonGroup(buttons) {
  return {
    _key: key(),
    _type: 'buttonGroup',
    buttons: buttons.map((b) => ({
      _key: key(),
      label: b.label,
      url: b.url,
      variant: b.variant || 'secondary',
      external: b.external !== false,
    })),
  }
}

// ─── mass-snap patches ──────────────────────────────────────────

async function patchMassSnap() {
  console.log('\n━━━ mass-snap ━━━')
  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "mass-snap"][0]{ _id, content }`
  )
  if (!doc) {
    console.error('  Document not found!')
    return
  }
  console.log(`  Document: ${doc._id}`)
  console.log(`  Content blocks: ${doc.content.length}`)

  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // 1. Remove raw <a block (key: mw9fgjpi3l)
  const aBlockIdx = content.findIndex((b) => b._key === 'mw9fgjpi3l')
  if (aBlockIdx !== -1) {
    const text = (content[aBlockIdx].children || []).map((c) => c.text).join('')
    if (text.includes('<a')) {
      console.log(`  [1] Removing raw <a block at index ${aBlockIdx}`)
      content.splice(aBlockIdx, 1)
      changes++
    } else {
      console.log(`  [1] Block mw9fgjpi3l no longer contains <a — skipping`)
    }
  } else {
    console.log(`  [1] Block mw9fgjpi3l not found — already patched?`)
  }

  // 2. Replace raw href= block (key: gv9p8nxzyx8) with buttonGroup
  const hrefBlockIdx = content.findIndex((b) => b._key === 'gv9p8nxzyx8')
  if (hrefBlockIdx !== -1) {
    const text = (content[hrefBlockIdx].children || []).map((c) => c.text).join('')
    if (text.includes('href=')) {
      console.log(`  [2] Replacing raw href block at index ${hrefBlockIdx} with buttonGroup`)
      content.splice(
        hrefBlockIdx,
        1,
        makeButtonGroup([
          {
            label: 'View live app',
            url: 'https://dtaconnect.eohhs.mass.gov/',
            variant: 'secondary',
            external: true,
          },
        ])
      )
      changes++
    } else {
      console.log(`  [2] Block gv9p8nxzyx8 no longer contains href= — skipping`)
    }
  } else {
    console.log(`  [2] Block gv9p8nxzyx8 not found — already patched?`)
  }

  // 3. Clean prettier-ignore from DTA paragraph (key: 2luh0efyyuj)
  const dtaBlockIdx = content.findIndex((b) => b._key === '2luh0efyyuj')
  if (dtaBlockIdx !== -1) {
    const fullText = (content[dtaBlockIdx].children || []).map((c) => c.text).join('')
    if (fullText.includes('prettier-ignore')) {
      // The clean text with superscript reference restored
      const cleanBlock = makeRefCitationBlock([
        {
          text: 'In Massachusetts, the Department of Transitional Assistance (DTA) helps nearly 800K residents afford food every month through SNAP',
        },
        { text: '2', refNumber: '2' },
        {
          text: '. Formerly known as Food Stamps, SNAP provides households with anywhere from $15 to $352 per month for a family of two. The DTA reports that \u201Cevery dollar in new SNAP benefits results in $1.80 in total economic activity.\u201D',
        },
      ])
      cleanBlock._key = '2luh0efyyuj' // keep same key
      content[dtaBlockIdx] = cleanBlock
      console.log(`  [3] Cleaned prettier-ignore from DTA paragraph, restored sup ref 2`)
      changes++
    } else {
      console.log(`  [3] Block 2luh0efyyuj no longer has prettier-ignore — skipping`)
    }
  } else {
    console.log(`  [3] Block 2luh0efyyuj not found — already patched?`)
  }

  // 4. Clean prettier-ignore from Pew paragraph (key: ba3g4pgfnv)
  const pewBlockIdx = content.findIndex((b) => b._key === 'ba3g4pgfnv')
  if (pewBlockIdx !== -1) {
    const fullText = (content[pewBlockIdx].children || []).map((c) => c.text).join('')
    if (fullText.includes('prettier-ignore')) {
      const cleanBlock = makeRefCitationBlock([
        {
          text: 'The Pew Research Center reported that 77% of U.S. adults owned smartphones as of January 10, 2018',
        },
        { text: '3', refNumber: '3' },
        {
          text: '. Americans making less than $30,000 per year came in at a 67% ownership rate. While residents can access desktop computers at local libraries, many of those who would apply to SNAP have more immediate access to smartphones rather than desktop computers. Having a phone connects people to work opportunities and is a necessity in the modern world.',
        },
      ])
      cleanBlock._key = 'ba3g4pgfnv'
      content[pewBlockIdx] = cleanBlock
      console.log(`  [4] Cleaned prettier-ignore from Pew paragraph, restored sup ref 3`)
      changes++
    } else {
      console.log(`  [4] Block ba3g4pgfnv no longer has prettier-ignore — skipping`)
    }
  } else {
    console.log(`  [4] Block ba3g4pgfnv not found — already patched?`)
  }

  if (changes === 0) {
    console.log(`  No changes needed.`)
    return
  }

  console.log(`  Total changes: ${changes}`)
  if (WRITE) {
    await client.patch(doc._id).set({ content }).commit()
    console.log(`  ✓ Patched mass-snap`)
  } else {
    console.log(`  (dry run — use --write to apply)`)
  }
}

// ─── "for CLIENT" subtitle patches ─────────────────────────────

async function addForClientSubtitle(slug, clientName) {
  console.log(`\n━━━ ${slug} ━━━`)
  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == $slug][0]{ _id, content }`,
    { slug }
  )
  if (!doc) {
    console.error(`  Document not found!`)
    return
  }
  console.log(`  Document: ${doc._id}`)
  console.log(`  Content blocks: ${doc.content.length}`)

  // Check if "for CLIENT" already exists as first or second block
  const firstFewTexts = doc.content
    .slice(0, 3)
    .map((b) => (b.children || []).map((c) => c.text || '').join(''))
  const subtitle = `for ${clientName}`
  const alreadyPresent = firstFewTexts.some(
    (t) => t.trim().toLowerCase() === subtitle.toLowerCase()
  )

  if (alreadyPresent) {
    console.log(`  "${subtitle}" already present — skipping`)
    return
  }

  // Insert as first content block
  const newBlock = makeTextBlock(subtitle)
  const content = [newBlock, ...doc.content]

  console.log(`  Adding "${subtitle}" as first content block`)
  if (WRITE) {
    await client.patch(doc._id).set({ content }).commit()
    console.log(`  ✓ Patched ${slug}`)
  } else {
    console.log(`  (dry run — use --write to apply)`)
  }
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(`${WRITE ? 'WRITE MODE' : 'DRY RUN'}\n`)

  // 1. mass-snap: remove raw HTML blocks, clean prettier-ignore artifacts
  await patchMassSnap()

  // 2-4. Add "for CLIENT" subtitle to pages that have it in Gatsby MDX
  await addForClientSubtitle('wuxi-nextcode-familycode', 'WuXi NextCODE')
  await addForClientSubtitle('infobionic-heart-monitoring', 'InfoBionic')
  await addForClientSubtitle('insidetracker-nutrition-science', 'InsideTracker')

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
