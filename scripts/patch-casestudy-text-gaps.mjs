#!/usr/bin/env node
/**
 * Patch missing text content on case study pages with small gaps.
 *
 * Identified gaps (text only, no images):
 *
 * 1. personal-genome-project-vision — heading field should be
 *    "Building a community for data donation" (currently null → shows "OpenHumans")
 *
 * 2. inspired-ehrs — heading field should be
 *    "Inspired EHRs: Designing for Clinicians" (currently null → shows "Inspired EHRs")
 *
 * 3. mitre-state-of-us-healthcare — missing "View Demo" button
 *    (only "View Github" exists; Gatsby has both)
 *
 * 4. mitre-state-of-us-healthcare — block[30] has raw markdown image syntax
 *    in text that should be a proper link (cosmetic, not critical)
 *
 * Pages confirmed as having NO content gaps (missing <p> are template-level):
 *   ahrq-cds, paintrackr, tabeeb-diagnostics, maya-ehr, care-cards
 *
 * Usage:
 *   node scripts/patch-casestudy-text-gaps.mjs          # dry run
 *   node scripts/patch-casestudy-text-gaps.mjs --write   # apply patches
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import { randomBytes } from 'crypto'

dotenv.config({ path: '.env.local' })

const write = process.argv.includes('--write')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

function genKey() {
  return randomBytes(6).toString('hex')
}

async function getDoc(slug) {
  const query = `*[_type == "caseStudy" && slug.current == "${slug}"][0]{ _id, _rev, title, heading, content }`
  return client.fetch(query)
}

let patchCount = 0

// ---------- 1. personal-genome-project-vision: set heading ----------

async function patchPGPHeading() {
  const slug = 'personal-genome-project-vision'
  const doc = await getDoc(slug)
  if (!doc) { console.log(`  SKIP ${slug}: not found`); return }

  const expected = 'Building a community for data donation'
  if (doc.heading === expected) {
    console.log(`  OK ${slug}: heading already set`)
    return
  }

  console.log(`  PATCH ${slug}: set heading from "${doc.heading}" → "${expected}"`)
  if (write) {
    await client
      .patch(doc._id)
      .set({ heading: expected })
      .commit()
    console.log(`    ✓ committed`)
  }
  patchCount++
}

// ---------- 2. inspired-ehrs: set heading ----------

async function patchInspiredEHRsHeading() {
  const slug = 'inspired-ehrs'
  const doc = await getDoc(slug)
  if (!doc) { console.log(`  SKIP ${slug}: not found`); return }

  const expected = 'Inspired EHRs: Designing for Clinicians'
  if (doc.heading === expected) {
    console.log(`  OK ${slug}: heading already set`)
    return
  }

  console.log(`  PATCH ${slug}: set heading from "${doc.heading}" → "${expected}"`)
  if (write) {
    await client
      .patch(doc._id)
      .set({ heading: expected })
      .commit()
    console.log(`    ✓ committed`)
  }
  patchCount++
}

// ---------- 3. mitre-state-of-us-healthcare: add View Demo button ----------

async function patchMitreViewDemo() {
  const slug = 'mitre-state-of-us-healthcare'
  const doc = await getDoc(slug)
  if (!doc) { console.log(`  SKIP ${slug}: not found`); return }

  // Find the "View Github" block
  const viewGithubIdx = doc.content.findIndex(
    b => b._type === 'block' &&
         b.children?.some(c => c.text?.includes('View Github'))
  )

  if (viewGithubIdx === -1) {
    console.log(`  SKIP ${slug}: "View Github" block not found`)
    return
  }

  // Check if "View Demo" already exists
  const viewDemoExists = doc.content.some(
    b => b._type === 'block' &&
         b.children?.some(c => c.text?.includes('View Demo'))
  )

  if (viewDemoExists) {
    console.log(`  OK ${slug}: "View Demo" already exists`)
    return
  }

  // Create a "View Demo" block to insert BEFORE "View Github"
  const linkKey = genKey()
  const viewDemoBlock = {
    _key: genKey(),
    _type: 'block',
    style: 'normal',
    markDefs: [
      {
        _key: linkKey,
        _type: 'link',
        blank: true,
        href: 'http://clients.goinvo.com/mitre/state-of-us-healthcare/',
      },
    ],
    children: [
      {
        _key: genKey(),
        _type: 'span',
        marks: [linkKey],
        text: 'View Demo',
      },
    ],
  }

  console.log(`  PATCH ${slug}: insert "View Demo" button before "View Github" (at index ${viewGithubIdx})`)
  if (write) {
    // Insert before the View Github block
    const beforeKey = doc.content[viewGithubIdx]._key
    await client
      .patch(doc._id)
      .insert('before', `content[_key=="${beforeKey}"]`, [viewDemoBlock])
      .commit()
    console.log(`    ✓ committed`)
  }
  patchCount++
}

// ---------- 4. mitre-state-of-us-healthcare: fix broken markdown in block[30] ----------

async function patchMitreMarkdownBlock() {
  const slug = 'mitre-state-of-us-healthcare'
  const doc = await getDoc(slug)
  if (!doc) { console.log(`  SKIP ${slug}: not found`); return }

  // Find the block with raw markdown image syntax
  const brokenIdx = doc.content.findIndex(
    b => b._type === 'block' &&
         b.children?.some(c => c.text?.includes('![US health indicator research'))
  )

  if (brokenIdx === -1) {
    console.log(`  OK ${slug}: no broken markdown image block found (already fixed?)`)
    return
  }

  const brokenBlock = doc.content[brokenIdx]

  // This block currently has:
  //   span: "![US health indicator research" (linked to image path)
  //   span: "](https://docs.google.com/...)" (unlinked)
  //   span: "View the Health Indicators spreadsheet" (linked to Google Sheets)
  //
  // Gatsby renders this as:
  //   <a href="sheets-url"><img src="image-path" alt="..." /></a>
  //   <a href="sheets-url">View the Health Indicators spreadsheet</a>
  //
  // Fix: Replace this block with clean text: just the link text
  // (the image is separate and we're only fixing text gaps)

  const sheetUrl = 'https://docs.google.com/spreadsheets/d/1eef_1BK6gipOuhxpdXWnQ8eQdp1ZssjwUupKs7oITdc/edit?usp=sharing'
  const linkKey = genKey()
  const fixedBlock = {
    _key: brokenBlock._key,
    _type: 'block',
    style: 'normal',
    markDefs: [
      {
        _key: linkKey,
        _type: 'link',
        blank: true,
        href: sheetUrl,
      },
    ],
    children: [
      {
        _key: genKey(),
        _type: 'span',
        marks: [linkKey],
        text: 'View the Health Indicators spreadsheet',
      },
    ],
  }

  console.log(`  PATCH ${slug}: fix broken markdown image syntax in block[${brokenIdx}]`)
  if (write) {
    // Replace the broken block with the fixed one by using unset + insert
    // Actually, we can replace in-place using the content array position
    const content = [...doc.content]
    content[brokenIdx] = fixedBlock
    await client
      .patch(doc._id)
      .set({ content })
      .commit()
    console.log(`    ✓ committed`)
  }
  patchCount++
}

// ---------- Report: pages with no content gaps ----------

function reportNoGaps() {
  const noGapPages = [
    { slug: 'ahrq-cds', reason: 'All 4 missing <p> are template elements (h1 title, "for AHRQ..." subtitle, Time:, Tags:)' },
    { slug: 'paintrackr', reason: 'All 5 missing <p> are template elements (h1, Time:, Tags:) + image captions present in Sanity' },
    { slug: 'tabeeb-diagnostics', reason: 'All 3 missing <p> are template elements (h1, "for Tabeeb" subtitle, Time:, Tags:)' },
    { slug: 'maya-ehr', reason: 'All 2 missing <p> are template elements. Lists stored as flat paragraphs (cosmetic, all text present)' },
    { slug: 'care-cards', reason: 'All 2 missing <p> are template elements. Lists stored as flat paragraphs (cosmetic, all text present)' },
  ]

  console.log('\nPages with NO content gaps (missing <p> are template-level elements):')
  for (const page of noGapPages) {
    console.log(`  ${page.slug}: ${page.reason}`)
  }
}

// ---------- Main ----------

async function main() {
  console.log(`Case study text gap patcher ${write ? '(WRITE MODE)' : '(DRY RUN)'}`)
  console.log('='.repeat(60))

  console.log('\nPatching heading fields:')
  await patchPGPHeading()
  await patchInspiredEHRsHeading()

  console.log('\nPatching content blocks:')
  await patchMitreViewDemo()
  await patchMitreMarkdownBlock()

  reportNoGaps()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Total patches: ${patchCount} ${write ? '(applied)' : '(dry run)'}`)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
