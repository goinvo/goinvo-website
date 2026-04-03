/**
 * Upload Missing Images to Sanity
 *
 * Downloads images from the Gatsby CDN and uploads them to Sanity,
 * then inserts them into the correct position in page content.
 *
 * Usage:
 *   node scripts/upload-missing-images.mjs
 *   node scripts/upload-missing-images.mjs --dry-run
 */

import { createClient } from '@sanity/client'
import crypto from 'crypto'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || 'sk193iVVrPLplMQlWPjZuFNuvIjtYY0hYw4Jfv7zGvzg4bX1xtm5WC9fbZtnEWVdWk3Ft4CGvOqg058qJBXv9ybliMn1TUnv6INGxFPXNRLlsKFGjOUIQFcPnTZ6y6BO1kfkytu4rvnJ0dWIizHd5U5kp3UTEj3MNCsnKB9BSvF1ryQ5Whmu',
  useCdn: false,
})

const CDN = 'https://dd17w042cevyt.cloudfront.net'
const dryRun = process.argv.includes('--dry-run')

function rkey() { return crypto.randomBytes(6).toString('hex') }

async function uploadImage(url, filename) {
  console.log(`  Downloading ${filename}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  console.log(`  Uploading to Sanity (${(buffer.length / 1024).toFixed(0)}KB)...`)
  const asset = await client.assets.upload('image', buffer, { filename })
  console.log(`  → ${asset._id}`)
  return asset
}

function makeImageBlock(assetRef, caption, alt) {
  return {
    _key: rkey(),
    _type: 'image',
    asset: { _type: 'reference', _ref: assetRef },
    ...(caption ? { caption } : {}),
    ...(alt ? { alt } : {}),
  }
}

// ── Page-specific upload tasks ────────────────────────────────────────

const TASKS = [
  {
    slug: 'health-design-thinking',
    docType: 'feature',
    images: [
      {
        url: `${CDN}/images/case-studies/goinvo/hgraph/hgraph-hero2.jpg`,
        insertAfter: 'hGraph, page 46',
        caption: 'hGraph — Your health in one picture.',
        alt: 'hGraph visualization',
      },
      {
        url: `${CDN}/images/features/care-plans/care-plans-featured2.jpg`,
        insertAfter: 'Care Plans, page 100-103',
        caption: 'Care Plans — A patient guide to manage day-to-day health.',
        alt: 'Care Plans visualization',
      },
      {
        url: `${CDN}/images/case-studies/mitre/SHR/shr-header2.jpg`,
        insertAfter: 'Standard Health Record, page 107',
        caption: 'Standard Health Record — Prototyping future applications of a national health data standard.',
        alt: 'Standard Health Record visualization',
      },
    ],
  },
  {
    slug: 'fraud-waste-abuse-in-healthcare',
    docType: 'feature',
    images: [
      {
        url: `${CDN}/images/features/fraud-waste-abuse-in-healthcare/fwa-definition1.jpg`,
        insertAfter: 'What is Fraud, Waste, and Abuse?',
        caption: '',
        alt: 'Fraud, waste, and abuse definitions',
      },
    ],
  },
  {
    slug: 'mitre-state-of-us-healthcare',
    docType: 'caseStudy',
    images: [
      {
        url: `${CDN}/images/case-studies/mitre/state-of-us-healthcare/mitre_us_health_topics_and_metrics.jpg`,
        insertAfter: 'crafted key questions and US Healthcare storylines',
        caption: '',
        alt: 'A draft of the topics and categories for US health metrics',
      },
      {
        url: `${CDN}/images/case-studies/mitre/state-of-us-healthcare/mitre_open_health_design_spec.jpg`,
        insertAfter: 'Large scale technical storytelling',
        caption: '',
        alt: 'Visual walkthrough of the design specification',
      },
      {
        url: `${CDN}/images/case-studies/mitre/state-of-us-healthcare/mitre_us_health_indicators_research.jpg`,
        insertAfter: 'analysis on metrics necessary',
        caption: '',
        alt: 'US health indicator research',
      },
    ],
  },
]

async function processTask(task) {
  console.log(`\n=== ${task.slug} ===`)

  const query = task.docType === 'feature'
    ? `*[_type=="feature" && slug.current==$slug][0]`
    : `*[_type=="caseStudy" && slug.current==$slug][0]`

  const doc = await client.fetch(query, { slug: task.slug })
  if (!doc) {
    console.log('  NOT FOUND')
    return
  }

  const content = [...doc.content]
  let inserted = 0

  for (const img of task.images) {
    // Find insertion point by text match
    let insertIdx = -1
    for (let i = 0; i < content.length; i++) {
      const block = content[i]
      if (block._type === 'block') {
        const text = block.children?.map(c => c.text || '').join('') || ''
        if (text.toLowerCase().includes(img.insertAfter.toLowerCase())) {
          insertIdx = i + 1
          break
        }
      }
    }

    if (insertIdx < 0) {
      console.log(`  ⚠ Could not find "${img.insertAfter}" — skipping`)
      continue
    }

    // Check if there's already an image at this position
    if (content[insertIdx]?._type === 'image') {
      console.log(`  Already has image after "${img.insertAfter}" — skipping`)
      continue
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would insert image after "${img.insertAfter}" at index ${insertIdx}`)
      continue
    }

    try {
      const asset = await uploadImage(img.url, img.url.split('/').pop())
      const imageBlock = makeImageBlock(asset._id, img.caption, img.alt)
      content.splice(insertIdx, 0, imageBlock)
      inserted++
      console.log(`  ✓ Inserted after "${img.insertAfter}" at index ${insertIdx}`)
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}`)
    }
  }

  if (inserted > 0 && !dryRun) {
    await client.patch(doc._id).set({ content }).commit()
    console.log(`  Saved ${inserted} new image(s)`)
  }
}

async function main() {
  if (dryRun) console.log('=== DRY RUN MODE ===\n')

  for (const task of TASKS) {
    await processTask(task)
  }

  console.log('\nDone!')
}

main().catch(console.error)
