/**
 * Patch: Fix case study title mismatches (Next.js vs Gatsby h1)
 *
 * Usage: node scripts/patch-case-study-titles.mjs
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const TITLE_FIXES = [
  {
    slug: 'all-of-us',
    newTitle: 'Designing Digital Experiences for Participants in a National Health Research Program',
  },
  {
    slug: 'fastercures-health-data-basics',
    newTitle: 'Engaging Patients to Understand Health Data',
  },
  {
    slug: 'infobionic-heart-monitoring',
    newTitle: 'Mobile health design for real-time cardiac arrhythmias',
  },
  {
    slug: 'mitre-state-of-us-healthcare',
    newTitle: "What's the Status of US Healthcare?",
  },
  {
    slug: 'partners-geneinsight',
    newTitle: 'Connecting Clinics to Genetic Testing Labs',
  },
]

async function run() {
  // First, query all 5 slugs to confirm document IDs and current titles
  const slugs = TITLE_FIXES.map((f) => f.slug)
  const docs = await client.fetch(
    `*[_type in ["caseStudy","feature","work"] && slug.current in $slugs]{ _id, _type, title, "slug": slug.current }`,
    { slugs }
  )

  if (docs.length === 0) {
    console.error('No documents found. Check document type or slugs.')
    process.exit(1)
  }

  console.log(`Found ${docs.length} document(s):`)
  for (const doc of docs) {
    console.log(`  [${doc._type}] ${doc.slug} → "${doc.title}"`)
  }

  // Apply patches
  for (const fix of TITLE_FIXES) {
    const doc = docs.find((d) => d.slug === fix.slug)
    if (!doc) {
      console.warn(`  SKIP: no document found for slug "${fix.slug}"`)
      continue
    }
    if (doc.title === fix.newTitle) {
      console.log(`  SKIP (already correct): ${fix.slug}`)
      continue
    }
    await client.patch(doc._id).set({ title: fix.newTitle }).commit()
    console.log(`  PATCHED: ${fix.slug}`)
    console.log(`    "${doc.title}"`)
    console.log(`    → "${fix.newTitle}"`)
  }

  console.log('\nDone.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
