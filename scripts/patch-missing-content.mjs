/**
 * Patch missing content across multiple vision pages.
 *
 * Handles:
 * 1. care-plans: Add missing contributors
 * 2. bathroom-to-healthroom: Upload missing images from CloudFront
 * 3. healing-us-healthcare: Upload storyboard images
 *
 * Usage:
 *   node scripts/patch-missing-content.mjs                # dry run
 *   node scripts/patch-missing-content.mjs --write        # apply
 *   node scripts/patch-missing-content.mjs care-plans     # single page
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
const SLUG_FILTER = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1])

function makeKey() { return randomUUID().slice(0, 12) }

async function findOrCreateTeamMember(name, role = 'GoInvo') {
  const existing = await client.fetch(
    `*[_type == "teamMember" && name == $name][0]{ _id }`,
    { name }
  )
  if (existing) return existing._id

  const id = `teamMember-${name.toLowerCase().replace(/\s+/g, '-')}`
  console.log(`    + Creating team member: ${name}`)
  if (WRITE) {
    await client.createOrReplace({ _id: id, _type: 'teamMember', name, role })
  }
  return id
}

async function uploadImageFromUrl(url, filename) {
  try {
    const response = await fetch(url)
    if (!response.ok) { console.log(`    WARN: Failed to fetch ${url}`); return null }
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'image/jpeg'
    if (WRITE) {
      const asset = await client.assets.upload('image', buffer, { filename, contentType })
      return asset._id
    }
    return `dry-run-${filename}`
  } catch (e) {
    console.log(`    WARN: Error uploading ${url}: ${e.message}`)
    return null
  }
}

// ─── care-plans contributors ──────────────────────────────────────────────

async function patchCarePlans() {
  const slug = 'care-plans'
  console.log(`\n  📄 care-plans — Adding contributors`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, contributors }`,
    { slug }
  )
  if (!feature) { console.log('    Not found'); return }
  if (feature.contributors?.length > 0) { console.log('    Contributors already exist'); return }

  const contribs = [
    'Yanyang Feng', 'Jen Patel', 'Juhan Sonin',
    'Jeff Belden', 'Joyce Lee', 'Jane Sarasohn-Kahn', 'Harry Sleeper',
  ]

  const refs = []
  for (const name of contribs) {
    const id = await findOrCreateTeamMember(name)
    refs.push({
      _type: 'contributorCredit',
      _key: `contrib-${makeKey()}`,
      author: { _type: 'reference', _ref: id },
    })
    console.log(`    ✓ ${name} (${id})`)
  }

  console.log(`    Would add ${refs.length} contributors`)
  if (WRITE) {
    await client.patch(feature._id).set({ contributors: refs }).commit()
    console.log('    ✅ Applied')
  }
}

// ─── bathroom-to-healthroom images ────────────────────────────────────────

async function patchBathroomToHealthroom() {
  const slug = 'bathroom-to-healthroom'
  console.log(`\n  📄 bathroom-to-healthroom — Uploading missing images`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug }
  )
  if (!feature) { console.log('    Not found'); return }

  const imageCount = (feature.content || []).filter(b => b._type === 'image').length
  if (imageCount > 3) { console.log(`    Already has ${imageCount} images — skipping`); return }

  // Images from Gatsby
  const CF = 'https://www.goinvo.com/old/images/features/design-for-life'
  const images = [
    { url: `${CF}/inlines/lineup.png`, alt: 'Healthcare technology lineup', after: 'Bathroom' },
    { url: `${CF}/dates/1985.png`, alt: 'Technology timeline - 1985', after: 'timeline' },
    { url: `${CF}/dates/2000.png`, alt: 'Technology timeline - 2000', after: '1985' },
    { url: `${CF}/dates/2010.png`, alt: 'Technology timeline - 2010', after: '2000' },
    { url: `${CF}/dates/2020.png`, alt: 'Technology timeline - 2020', after: '2010' },
    { url: `${CF}/dates/2030.png`, alt: 'Technology timeline - 2030', after: '2020' },
  ]

  let uploaded = 0
  for (const img of images) {
    const filename = img.url.split('/').pop()
    console.log(`    Uploading: ${filename}`)
    const assetId = await uploadImageFromUrl(img.url, filename)
    if (assetId) uploaded++
  }

  console.log(`    Uploaded ${uploaded}/${images.length} images`)
  if (!WRITE) console.log('    (dry run — images not actually uploaded)')
}

// ─── healing-us-healthcare images ──────────────────────────────────────────

async function patchHealingUsHealthcare() {
  const slug = 'healing-us-healthcare'
  console.log(`\n  📄 healing-us-healthcare — Uploading storyboard images`)

  const feature = await client.fetch(
    `*[_type == "feature" && slug.current == $slug][0]{ _id, content }`,
    { slug }
  )
  if (!feature) { console.log('    Not found'); return }

  const imageCount = (feature.content || []).filter(b => b._type === 'image').length
  if (imageCount > 0) { console.log(`    Already has ${imageCount} images — skipping`); return }

  const CF = 'https://dd17w042cevyt.cloudfront.net/images/features/us-healthcare'
  const images = [
    { url: `${CF}/DavidCoffee2x.png`, alt: 'David starting his day' },
    { url: `${CF}/DavidER2x.png`, alt: 'David at the emergency room' },
    { url: `${CF}/DavidDoctor2x.png`, alt: 'David visiting the doctor' },
    { url: `${CF}/DavidPrescription2x.png`, alt: 'David getting a prescription' },
    { url: `${CF}/DavidComputer2x.png`, alt: 'David researching online' },
    { url: `${CF}/DavidBill2x.png`, alt: 'David receiving a medical bill' },
  ]

  let uploaded = 0
  const newBlocks = []
  for (const img of images) {
    const filename = img.url.split('/').pop()
    console.log(`    Uploading: ${filename}`)
    const assetId = await uploadImageFromUrl(img.url, filename)
    if (assetId) {
      uploaded++
      newBlocks.push({
        _type: 'image',
        _key: makeKey(),
        alt: img.alt,
        asset: { _type: 'reference', _ref: assetId },
        size: 'full',
      })
    }
  }

  console.log(`    Uploaded ${uploaded}/${images.length} images`)

  if (WRITE && newBlocks.length > 0) {
    // Insert images into content after the first text block
    const content = feature.content || []
    // Find the first divider or after introduction text
    let insertIdx = content.findIndex((b, i) => i > 2 && b._type === 'backgroundSection')
    if (insertIdx === -1) insertIdx = 3

    const patched = [
      ...content.slice(0, insertIdx),
      ...newBlocks,
      ...content.slice(insertIdx),
    ]
    await client.patch(feature._id).set({ content: patched }).commit()
    console.log('    ✅ Applied')
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${WRITE ? '🔴 WRITE MODE' : '🔵 DRY RUN'} — Patching missing content\n`)

  const pages = {
    'care-plans': patchCarePlans,
    'bathroom-to-healthroom': patchBathroomToHealthroom,
    'healing-us-healthcare': patchHealingUsHealthcare,
  }

  for (const [slug, fn] of Object.entries(pages)) {
    if (SLUG_FILTER && slug !== SLUG_FILTER) continue
    await fn()
  }

  if (!WRITE) console.log('\nRun with --write to apply.')
}

main().catch(err => { console.error(err); process.exit(1) })
