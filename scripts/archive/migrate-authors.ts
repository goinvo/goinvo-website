/**
 * Author Migration Script
 *
 * Populates the `authors` field on feature documents in Sanity by matching
 * team member names from the old Gatsby site's vision pages.
 *
 * Run with:
 *   npx tsx scripts/migrate-authors.ts
 *
 * Prerequisites:
 *   - Set SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_API_TOKEN env vars
 *   - Team members must already exist in Sanity
 *
 * Pass --dry-run to preview changes without writing.
 */

import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
  useCdn: false,
})

const dryRun = process.argv.includes('--dry-run')

/**
 * Author mapping extracted from the old Gatsby site's vision pages.
 * Each key is the feature slug, value is an array of author names
 * (primary authors only, not contributors).
 */
const featureAuthors: Record<string, string[]> = {
  'augmented-clinical-decision-support': [
    'Katerina Labrou',
    'Mandy Liu',
    'Jonathan Follett',
    'Jules Soren',
  ],
  'coronavirus': [
    'Patricia Nguyen',
    'Colleen Tang Poy',
    'Parsuree Vatanasirisuk',
    'Craig McGinley',
  ],
  'determinants-of-health': [
    'Edwin Choi',
    'Jules Soren',
  ],
  'digital-health-trends-2022': ['Jonathan Follett'],
  'eligibility-engine': [
    'Malia Hong',
    'Sue Park',
    'Ezra Bennet',
    'Jules Soren',
  ],
  'faces-in-health-communication': [
    'Chloe Ma',
    'Vickie Hua',
    'Sharon Lee',
  ],
  'fraud-waste-abuse-in-healthcare': [
    'Michelle Bourdon',
    'Ezra Bennet',
    'Jules Soren',
  ],
  'healthcare-ai': ['Sharon Lee', 'Jules Soren'],
  'healthcare-dollars': ['Edwin Choi'],
  'healthcare-dollars-redux': ['Daniel Reeves'],
  'history-of-health-design': ['Samantha Wuu', 'Jules Soren'],
  'human-centered-design-for-ai': ['Jonathan Follett'],
  'living-health-lab': [
    'Sharon Lee',
    'Shayla Nettey',
    'Huahua Zhu',
    'Megan Hirsch',
    'Chloe Ma',
    'Samantha Wuu',
    'Arpna Ghanshani',
  ],
  'loneliness-in-our-human-code': [
    'Jen Patel',
    'Jules Soren',
    'Parsuree Vatanasirisuk',
  ],
  'national-cancer-navigation': [
    'Claire Lin',
    'Tala Habbab',
    'Sharon Lee',
    'Craig McGinley',
    'Samantha Wuu',
    'Jules Soren',
  ],
  'open-pro': [
    'Daniel Reeves',
    'Sharon Lee',
    'Jen Patel',
    'Jules Soren',
  ],
  'own-your-health-data': ['Megan Hirsch', 'Jules Soren'],
  'patient-centered-consent': [
    'Sharon Lee',
    'Jen Patel',
    'Parsuree Vatanasirisuk',
    'Jules Soren',
  ],
  'physician-burnout': [
    'Meghana Karande',
    'Jen Patel',
    'Parsuree Vatanasirisuk',
    'Jules Soren',
  ],
  'precision-autism': [
    'Parsuree Vatanasirisuk',
    'Sharon Lee',
    'Jules Soren',
  ],
  'primary-self-care-algorithms': [
    'Arpna Ghanshani',
    'Chloe Ma',
    'Jules Soren',
  ],
  'public-healthroom': ['Jenny Yi', 'Jules Soren'],
  'rethinking-ai-beyond-chat': ['Claire Lin', 'Maverick Chan'],
  'test-treat-trace': ['Parsuree Vatanasirisuk', 'Jules Soren'],
  'us-healthcare-problems': [
    'Hannah Sennik',
    'Jules Soren',
    'Ezra Bennet',
  ],
  'vapepocolypse': ['Colleen Tang Poy'],
  'virtual-care': ['Ezra Bennet', 'Jules Soren'],
  'virtual-diabetes-care': [
    'Shayla Nettey',
    'Jonathan Follett',
    'Sharon Lee',
  ],
  'visual-storytelling-with-genai': [
    'Maverick Chan',
    'Claire Lin',
    'Shay Lund',
  ],
  'who-uses-my-health-data': ['Sharon Lee', 'Jules Soren'],
}

async function main() {
  console.log(dryRun ? '=== DRY RUN ===' : '=== MIGRATING AUTHORS ===')

  // 1. Fetch all team members from Sanity
  const teamMembers = await sanityClient.fetch<
    { _id: string; name: string }[]
  >(`*[_type == "teamMember"]{ _id, name }`)

  const nameToId = new Map<string, string>()
  for (const m of teamMembers) {
    nameToId.set(m.name, m._id)
  }
  console.log(`Found ${teamMembers.length} team members in Sanity`)

  // 2. Fetch all features from Sanity
  const features = await sanityClient.fetch<
    { _id: string; slug: { current: string }; title: string }[]
  >(`*[_type == "feature"]{ _id, slug, title }`)

  console.log(`Found ${features.length} features in Sanity\n`)

  let updated = 0
  let skipped = 0
  const missing: string[] = []

  for (const [slug, authorNames] of Object.entries(featureAuthors)) {
    const feature = features.find((f) => f.slug?.current === slug)
    if (!feature) {
      console.log(`  SKIP: No feature found for slug "${slug}"`)
      skipped++
      continue
    }

    // Resolve author names to Sanity references
    const refs: { _type: 'reference'; _ref: string; _key: string }[] = []
    for (const name of authorNames) {
      const id = nameToId.get(name)
      if (id) {
        refs.push({ _type: 'reference', _ref: id, _key: id.slice(-8) })
      } else {
        missing.push(`${slug}: ${name}`)
      }
    }

    if (refs.length === 0) {
      console.log(`  SKIP: "${feature.title}" — no matching team members`)
      skipped++
      continue
    }

    console.log(
      `  ${dryRun ? 'WOULD SET' : 'SET'}: "${feature.title}" → ${refs.length} author(s): ${authorNames.filter((n) => nameToId.has(n)).join(', ')}`
    )

    if (!dryRun) {
      await sanityClient
        .patch(feature._id)
        .set({ authors: refs })
        .commit()
    }
    updated++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  if (missing.length > 0) {
    console.log(`\nMissing team members (not in Sanity):`)
    for (const m of missing) {
      console.log(`  - ${m}`)
    }
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
