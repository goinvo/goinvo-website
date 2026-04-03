/**
 * Upload missing images to Sanity for pages with image gaps.
 *
 * Currently handles:
 * - augmented-clinical-decision-support: 21 pregnancy storyboard slides
 * - faces-in-health-communication: (already complete, included for auditing)
 *
 * Usage:
 *   node scripts/patch-upload-images.mjs                  # Dry run (default)
 *   node scripts/patch-upload-images.mjs --write           # Apply changes
 *   node scripts/patch-upload-images.mjs --write acds      # Single page
 *   node scripts/patch-upload-images.mjs --write faces     # Single page
 */

import { createClient } from 'next-sanity'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a1wsimxr',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const CDN = 'https://dd17w042cevyt.cloudfront.net'

const args = process.argv.slice(2)
const writeMode = args.includes('--write')
const requestedPages = args.filter(a => !a.startsWith('--'))

const key = () => randomUUID().slice(0, 12)

// ============================================================
// Helpers
// ============================================================

async function uploadImage(url, filename) {
  const response = await fetch(url)
  if (!response.ok) {
    console.log(`    WARN: Failed to fetch ${url} (${response.status})`)
    return null
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  const asset = await client.assets.upload('image', buffer, {
    filename,
    contentType,
  })

  return {
    _type: 'image',
    asset: { _type: 'reference', _ref: asset._id },
  }
}

function imageBlock(assetRef, alt = '', size = 'full') {
  return {
    _type: 'image',
    _key: key(),
    asset: assetRef.asset,
    alt,
    size,
  }
}

function textBlock(text, style = 'normal') {
  return {
    _type: 'block',
    _key: key(),
    style,
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
    markDefs: [],
  }
}

function listItemBlock(text, level = 1) {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    listItem: 'bullet',
    level,
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
    markDefs: [],
  }
}

function buttonGroup(buttons) {
  return {
    _type: 'buttonGroup',
    _key: key(),
    buttons: buttons.map(b => ({ _key: key(), _type: 'ctaButton', ...b })),
  }
}

// ============================================================
// augmented-clinical-decision-support
// ============================================================

async function patchACDS() {
  const slug = 'augmented-clinical-decision-support'
  console.log(`\n=== ${slug} ===`)

  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] {
      _id, title,
      content[] {
        _type, _key,
        ...select(
          _type == 'block' => { style, 'text': pt::text(@), children, markDefs, listItem, level },
          _type == 'image' => { alt, size, asset },
          _type == 'buttonGroup' => { buttons },
          _type == 'divider' => { style },
          _type == 'references' => { items },
          _type == 'backgroundSection' => { color, content },
          @
        )
      }
    }`,
    { slug }
  )

  if (!doc) {
    console.log('  Document not found!')
    return
  }

  console.log(`  Document: ${doc.title} (${doc._id})`)
  console.log(`  Current content blocks: ${doc.content.length}`)

  // Analyze what's currently there
  const content = doc.content
  const pregnancyHeadingIdx = content.findIndex(
    b => b._type === 'block' && b.style === 'h2' && b.text === 'Pregnancy Storyboard'
  )
  const processMapHeadingIdx = content.findIndex(
    b => b._type === 'block' && b.style === 'h2' && b.text === 'Process Maps'
  )

  console.log(`  "Pregnancy Storyboard" heading at index: ${pregnancyHeadingIdx}`)
  console.log(`  "Process Maps" heading at index: ${processMapHeadingIdx}`)

  // Check if pregnancy images already exist
  const existingPregnancyImages = content.filter(
    (b, i) =>
      b._type === 'image' &&
      i > pregnancyHeadingIdx &&
      i < processMapHeadingIdx
  )

  if (existingPregnancyImages.length >= 21) {
    console.log(`  Pregnancy storyboard images already present (${existingPregnancyImages.length}). Skipping.`)
    return
  }

  console.log(`  Pregnancy storyboard images found: ${existingPregnancyImages.length} (need 21)`)

  // Extract the existing button group so we can redistribute buttons
  const buttonGroupIdx = content.findIndex(b => b._type === 'buttonGroup')
  const existingButtons = buttonGroupIdx >= 0 ? content[buttonGroupIdx].buttons : []
  console.log(`  Existing button group at index ${buttonGroupIdx} with ${existingButtons.length} buttons`)

  // Map button labels to their data
  const buttonMap = {}
  for (const btn of existingButtons) {
    buttonMap[btn.label] = { label: btn.label, url: btn.url, variant: btn.variant || 'secondary', external: btn.external !== false }
  }

  // Build the new content array following Gatsby's order:
  // [0] h2: title (keep as-is, even though Gatsby uses h1)
  // [1-3] paragraphs (keep)
  // [4] paragraph about Field Guider (keep)
  // NEW: bullet list (3 items) about Field Guider
  // NEW: button group (ARPHA-H Proposal, Github)
  // [5] h2: future of rural healthcare (keep)
  // NEW: bullet list (6 items)
  // [6] h2: Primary Care Process (keep)
  // [7] image: primary care process map (keep)
  // NEW: button: Download Primary Care Process
  // [8] h2: Clinical Task Guidance System Diagram (keep)
  // [9] image: system diagram (keep)
  // NEW: button: Download Clinical Task Guidance System Diagram
  // [10] h2: Pregnancy Storyboard (keep)
  // NEW: 21 pregnancy images
  // NEW: button: Download Pregnancy Storyboard
  // [11] h2: Process Maps (keep)
  // [12] h4: Pregnancy Process Map (keep, but fix style to h3)
  // [13] image: pregnancy process map (keep)
  // NEW: button: Download Pregnancy Process Map
  // [14] h4: Head Injury Process Map (keep, but fix style to h3)
  // [15] image: head injury process map (keep)
  // NEW: button: Download Head Injury Process Map
  // [16] h4: Cancer Process Map (keep, but fix style to h3)
  // [17] image: cancer process map (keep)
  // NEW: button: Download Cancer Process Map
  // [18-21] closing text (keep)
  // Remove: old button group at [22]
  // [23-25] authors, contributors (keep)

  // Step 1: Upload the 21 pregnancy storyboard images
  console.log('\n  Uploading 21 pregnancy storyboard images...')
  const pregnancyImages = []
  for (let i = 1; i <= 21; i++) {
    const url = `${CDN}/images/features/augmented-clinical-decision-support/pregnancy-${i}.jpg`
    if (writeMode) {
      const img = await uploadImage(url, `acds-pregnancy-${i}.jpg`)
      if (img) {
        pregnancyImages.push(img)
        console.log(`    Uploaded: pregnancy-${i}.jpg`)
      } else {
        console.log(`    FAILED: pregnancy-${i}.jpg`)
      }
    } else {
      console.log(`    [DRY RUN] Would upload: pregnancy-${i}.jpg from ${url}`)
      pregnancyImages.push({ _type: 'image', asset: { _type: 'reference', _ref: `dry-run-${i}` } })
    }
  }

  console.log(`\n  Uploaded ${pregnancyImages.length} images`)

  // Step 2: Build the new content array
  const newContent = []

  // Keep blocks [0] through [4] (title + paragraphs)
  for (let i = 0; i <= 4; i++) {
    newContent.push(content[i])
  }

  // Add the missing bullet list about Field Guider
  newContent.push(
    listItemBlock('lives on the mobile health truck, phone, and AR goggles,'),
    listItemBlock('works with healthcare workers in real-time to co-diagnose, co-treat patients for better health outcomes,'),
    listItemBlock('and provides in-encounter training, through visual and aural clinical decision support nudges to up-skill staff.')
  )

  // Add button group: ARPHA-H Proposal + Github
  if (buttonMap['Download ARPHA-H Proposal'] && buttonMap['Github']) {
    newContent.push(buttonGroup([
      buttonMap['Download ARPHA-H Proposal'],
      buttonMap['Github'],
    ]))
  }

  // Keep h2: "The future of rural healthcare is..."
  newContent.push(content[5])

  // Add the missing bullet list about future of rural healthcare
  newContent.push(
    listItemBlock('Care at home, in your neighborhood'),
    listItemBlock('The clinician comes to you'),
    listItemBlock('Worry-free, urgent care'),
    listItemBlock('Clinic on wheels w/CT, imaging'),
    listItemBlock('Realtime augmented CDS support tools (for mobile clinic clinicians and community healthcare workers)'),
    listItemBlock('With a phone, 24-365 access to primary care, broadband everywhere')
  )

  // h2: Primary Care Process + image + button
  newContent.push(content[6]) // h2: Primary Care Process
  newContent.push(content[7]) // image
  if (buttonMap['Download Primary Care Process']) {
    newContent.push(buttonGroup([buttonMap['Download Primary Care Process']]))
  }

  // h2: Clinical Task Guidance System Diagram + image + button
  newContent.push(content[8]) // h2
  newContent.push(content[9]) // image
  if (buttonMap['Download Clinical Task Guidance System Diagram']) {
    newContent.push(buttonGroup([buttonMap['Download Clinical Task Guidance System Diagram']]))
  }

  // h2: Pregnancy Storyboard + 21 images + button
  newContent.push(content[10]) // h2: Pregnancy Storyboard
  for (let i = 0; i < pregnancyImages.length; i++) {
    newContent.push(imageBlock(pregnancyImages[i], `Pregnancy storyboard slide ${i + 1} of 21`, 'full'))
  }
  if (buttonMap['Download Pregnancy Storyboard']) {
    newContent.push(buttonGroup([buttonMap['Download Pregnancy Storyboard']]))
  }

  // h2: Process Maps
  newContent.push(content[11]) // h2: Process Maps

  // h3: Pregnancy Process Map + image + button (fix h4 -> h3 per Gatsby)
  const pregMapHeading = { ...content[12], style: 'h3' }
  newContent.push(pregMapHeading)
  newContent.push(content[13]) // image
  if (buttonMap['Download Pregnancy Process Map']) {
    newContent.push(buttonGroup([buttonMap['Download Pregnancy Process Map']]))
  }

  // h3: Head Injury Process Map + image + button (fix h4 -> h3)
  const headMapHeading = { ...content[14], style: 'h3' }
  newContent.push(headMapHeading)
  newContent.push(content[15]) // image
  if (buttonMap['Download Head Injury Process Map']) {
    newContent.push(buttonGroup([buttonMap['Download Head Injury Process Map']]))
  }

  // h3: Cancer Process Map + image + button (fix h4 -> h3)
  const cancerMapHeading = { ...content[16], style: 'h3' }
  newContent.push(cancerMapHeading)
  newContent.push(content[17]) // image
  if (buttonMap['Download Cancer Process Map']) {
    newContent.push(buttonGroup([buttonMap['Download Cancer Process Map']]))
  }

  // Keep closing text blocks [18-21] (Let's build..., contact text, About GoInvo heading + text)
  for (let i = 18; i <= 21; i++) {
    if (content[i]) newContent.push(content[i])
  }

  // Skip old button group at [22] — it's been redistributed

  // Keep authors + contributors [23-25]
  for (let i = 23; i <= 25; i++) {
    if (content[i]) newContent.push(content[i])
  }

  console.log(`\n  New content: ${newContent.length} blocks (was ${content.length})`)
  console.log('  Changes:')
  console.log('    + 21 pregnancy storyboard images')
  console.log('    + 3 bullet list items (Field Guider)')
  console.log('    + 6 bullet list items (Future of rural healthcare)')
  console.log('    + 8 individual button groups (redistributed from 1 combined group)')
  console.log('    ~ 3 headings fixed h4 -> h3 (process map sub-headings)')

  if (writeMode) {
    await client.patch(doc._id).set({ content: newContent }).commit()
    console.log(`\n  PATCHED "${doc.title}" with ${newContent.length} blocks`)
  } else {
    console.log('\n  [DRY RUN] Would patch document. Run with --write to apply.')
  }
}

// ============================================================
// faces-in-health-communication (audit only)
// ============================================================

async function patchFaces() {
  const slug = 'faces-in-health-communication'
  console.log(`\n=== ${slug} ===`)

  const doc = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0] {
      _id, title,
      'topImageCount': count(content[_type == 'image']),
      'topImagesWithAsset': count(content[_type == 'image' && defined(asset)]),
      'topImagesWithoutAsset': count(content[_type == 'image' && !defined(asset)]),
      'columnImageCount': count(content[_type == 'columns'].content[_type == 'image']),
      'columnImagesWithAsset': count(content[_type == 'columns'].content[_type == 'image' && defined(asset)]),
      'columnImagesWithoutAsset': count(content[_type == 'columns'].content[_type == 'image' && !defined(asset)]),
    }`,
    { slug }
  )

  if (!doc) {
    console.log('  Document not found!')
    return
  }

  const totalImages = (doc.topImageCount || 0) + (doc.columnImageCount || 0)
  const totalWithAsset = (doc.topImagesWithAsset || 0) + (doc.columnImagesWithAsset || 0)
  const totalWithoutAsset = (doc.topImagesWithoutAsset || 0) + (doc.columnImagesWithoutAsset || 0)

  console.log(`  Document: ${doc.title} (${doc._id})`)
  console.log(`  Total images: ${totalImages} (${totalWithAsset} with asset, ${totalWithoutAsset} without)`)
  console.log(`  Gatsby has 48 unique images`)

  if (totalImages >= 48 && totalWithoutAsset === 0) {
    console.log('  All images present and have assets. No changes needed.')
  } else if (totalWithoutAsset > 0) {
    console.log(`  WARNING: ${totalWithoutAsset} images are missing assets!`)
  } else {
    console.log(`  WARNING: Only ${totalImages}/48 images present. ${48 - totalImages} may be missing.`)
  }
}

// ============================================================
// Main
// ============================================================

const PAGES = {
  acds: { fn: patchACDS, slug: 'augmented-clinical-decision-support' },
  faces: { fn: patchFaces, slug: 'faces-in-health-communication' },
}

async function main() {
  const toProcess =
    requestedPages.length > 0
      ? requestedPages.filter(p => PAGES[p])
      : Object.keys(PAGES)

  if (requestedPages.length > 0) {
    const unknown = requestedPages.filter(p => !PAGES[p])
    if (unknown.length) {
      console.log(`Unknown pages: ${unknown.join(', ')}`)
      console.log(`Available: ${Object.keys(PAGES).join(', ')}`)
    }
  }

  console.log(`\nProcessing ${toProcess.length} pages${writeMode ? '' : ' (DRY RUN)'}...`)

  for (const page of toProcess) {
    await PAGES[page].fn()
  }

  console.log('\nDone!\n')
}

main().catch(err => {
  console.error('Failed:', err)
  process.exit(1)
})
