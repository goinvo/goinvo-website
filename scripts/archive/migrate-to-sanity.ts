/**
 * Content Migration Script: Gatsby → Sanity CMS
 *
 * Migrates JSON data and MDX frontmatter from the existing Gatsby site
 * into Sanity documents. Run with:
 *
 *   npx tsx scripts/migrate-to-sanity.ts
 *
 * Prerequisites:
 *   - Set SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_API_TOKEN env vars
 *   - The Sanity project must already have the schemas deployed
 *
 * What this script migrates:
 *   1. Categories (from categories.json)
 *   2. Team members (from team.json)
 *   3. Alumni (from alumni.json)
 *   4. Jobs (from jobs.json)
 *   5. Homepage headers (from homepage-headers.json)
 *   6. Features / vision projects (from features.json)
 *   7. Case studies (MDX frontmatter from src/case-studies/*.mdx)
 */

import { createClient } from '@sanity/client'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ─── Configuration ───────────────────────────────────────────────────────────

const GATSBY_ROOT = path.resolve(__dirname, '../../goinvo.com')
const DATA_DIR = path.join(GATSBY_ROOT, 'src/data')
const CASE_STUDIES_DIR = path.join(GATSBY_ROOT, 'src/case-studies')

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseMdxFrontmatter(filePath: string): Record<string, unknown> | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null

  const frontmatter: Record<string, unknown> = {}
  const lines = match[1].split('\n')
  let currentKey = ''
  let currentArray: string[] | null = null

  for (const line of lines) {
    // Array item
    if (line.match(/^\s+- /)) {
      const value = line.replace(/^\s+- ['"]?/, '').replace(/['"]?$/, '').trim()
      if (currentArray) currentArray.push(value)
      continue
    }

    // Save previous array
    if (currentArray && currentKey) {
      frontmatter[currentKey] = currentArray
      currentArray = null
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w+):\s*(.*)$/)
    if (kvMatch) {
      currentKey = kvMatch[1]
      const value = kvMatch[2].trim()

      if (value === '') {
        // Next lines will be array items
        currentArray = []
      } else if (value === 'true' || value === 'false') {
        frontmatter[currentKey] = value === 'true'
      } else {
        // Strip quotes
        frontmatter[currentKey] = value.replace(/^['"]|['"]$/g, '')
      }
    }
  }

  // Save last array
  if (currentArray && currentKey) {
    frontmatter[currentKey] = currentArray
  }

  return frontmatter
}

// ─── Migration Functions ─────────────────────────────────────────────────────

async function migrateCategories() {
  console.log('\n📁 Migrating categories...')
  const categories = readJson<Array<{ id: string; title: string }>>(
    path.join(DATA_DIR, 'categories.json')
  )

  const transaction = sanityClient.transaction()
  for (const cat of categories) {
    transaction.createOrReplace({
      _id: `category-${cat.id}`,
      _type: 'category',
      title: cat.title,
      slug: { _type: 'slug', current: cat.id },
      description: '',
    })
  }

  const result = await transaction.commit()
  console.log(`  ✓ Migrated ${categories.length} categories (tx: ${result.transactionId})`)
}

async function migrateTeamMembers() {
  console.log('\n👥 Migrating team members...')
  const team = readJson<Array<{
    name: string
    title: string
    bio: string
    social: { email?: string; twitter?: string; linkedin?: string }
    image: string
  }>>(path.join(DATA_DIR, 'team.json'))

  const transaction = sanityClient.transaction()
  for (let i = 0; i < team.length; i++) {
    const member = team[i]
    transaction.createOrReplace({
      _id: `team-${slugify(member.name)}`,
      _type: 'teamMember',
      name: member.name,
      role: member.title,
      bio: [
        {
          _type: 'block',
          _key: `bio-${i}`,
          style: 'normal',
          children: [{ _type: 'span', _key: `span-${i}`, text: member.bio }],
          markDefs: [],
        },
      ],
      social: {
        linkedin: member.social?.linkedin || '',
        twitter: member.social?.twitter || '',
        website: '',
      },
      isAlumni: false,
      order: i,
    })
  }

  const result = await transaction.commit()
  console.log(`  ✓ Migrated ${team.length} team members (tx: ${result.transactionId})`)
}

async function migrateAlumni() {
  console.log('\n🎓 Migrating alumni...')
  const alumniPath = path.join(DATA_DIR, 'alumni.json')
  if (!fs.existsSync(alumniPath)) {
    console.log('  ⏭ alumni.json not found, skipping')
    return
  }

  const alumni = readJson<Array<{
    name: string
    title: string
    bio: string
    social: { email?: string; twitter?: string; linkedin?: string }
    image: string
  }>>(alumniPath)

  const transaction = sanityClient.transaction()
  for (let i = 0; i < alumni.length; i++) {
    const member = alumni[i]
    transaction.createOrReplace({
      _id: `alumni-${slugify(member.name)}`,
      _type: 'teamMember',
      name: member.name,
      role: member.title,
      bio: [
        {
          _type: 'block',
          _key: `bio-${i}`,
          style: 'normal',
          children: [{ _type: 'span', _key: `span-${i}`, text: member.bio }],
          markDefs: [],
        },
      ],
      social: {
        linkedin: member.social?.linkedin || '',
        twitter: member.social?.twitter || '',
        website: '',
      },
      isAlumni: true,
      order: i,
    })
  }

  const result = await transaction.commit()
  console.log(`  ✓ Migrated ${alumni.length} alumni (tx: ${result.transactionId})`)
}

async function migrateJobs() {
  console.log('\n💼 Migrating jobs...')
  const jobs = readJson<Array<{
    title: string
    location: string
    description: string
    url: string
    closed: boolean
  }>>(path.join(DATA_DIR, 'jobs.json'))

  const transaction = sanityClient.transaction()
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i]
    transaction.createOrReplace({
      _id: `job-${slugify(job.title)}`,
      _type: 'job',
      title: job.title,
      description: [
        {
          _type: 'block',
          _key: `desc-${i}`,
          style: 'normal',
          children: [{ _type: 'span', _key: `span-${i}`, text: job.description }],
          markDefs: [],
        },
      ],
      location: job.location,
      type: 'full-time',
      isActive: !job.closed,
    })
  }

  const result = await transaction.commit()
  console.log(`  ✓ Migrated ${jobs.length} jobs (tx: ${result.transactionId})`)
}

async function migrateHomepageHeaders() {
  console.log('\n🏠 Migrating homepage headers...')
  const headers = readJson<Record<string, {
    tagline: string
    heroImages: string[]
  }>>(path.join(DATA_DIR, 'homepage-headers.json'))

  const transaction = sanityClient.transaction()
  let order = 0
  for (const [key, data] of Object.entries(headers)) {
    transaction.createOrReplace({
      _id: `homepage-header-${key}`,
      _type: 'homepageHeader',
      title: key.charAt(0).toUpperCase() + key.slice(1),
      subtitle: data.tagline,
      link: `/work/?category=${key}`,
      order: order++,
    })
  }

  const result = await transaction.commit()
  console.log(`  ✓ Migrated ${Object.keys(headers).length} homepage headers (tx: ${result.transactionId})`)
}

async function migrateFeatures() {
  console.log('\n⭐ Migrating features...')
  const features = readJson<Array<{
    id: string
    title: string
    date: string
    client: string
    categories: string[]
    caption: string
    image: string
    link: string
    externalLink?: boolean
    hiddenWorkPage?: boolean
    video?: string
  }>>(path.join(DATA_DIR, 'features.json'))

  const transaction = sanityClient.transaction()
  for (const feature of features) {
    transaction.createOrReplace({
      _id: `feature-${feature.id}`,
      _type: 'feature',
      title: feature.title,
      slug: { _type: 'slug', current: feature.id },
      description: feature.caption,
      categories: feature.categories || [],
      date: feature.date,
      client: feature.client,
      externalLink: feature.externalLink ? feature.link : undefined,
      hiddenWorkPage: feature.hiddenWorkPage || false,
    })
  }

  const result = await transaction.commit()
  console.log(`  ✓ Migrated ${features.length} features (tx: ${result.transactionId})`)
}

async function migrateCaseStudies() {
  console.log('\n📄 Migrating case studies...')

  if (!fs.existsSync(CASE_STUDIES_DIR)) {
    console.log('  ⏭ case-studies directory not found, skipping')
    return
  }

  const mdxFiles = fs.readdirSync(CASE_STUDIES_DIR).filter((f) => f.endsWith('.mdx'))
  console.log(`  Found ${mdxFiles.length} MDX files`)

  // Read case-study-order.json if available
  let caseStudyOrder: string[] = []
  const orderPath = path.join(DATA_DIR, 'case-study-order.json')
  if (fs.existsSync(orderPath)) {
    const orderData = readJson<{ all: string[] }>(orderPath)
    caseStudyOrder = orderData.all || []
  }

  const transaction = sanityClient.transaction()
  let count = 0

  for (const file of mdxFiles) {
    const filePath = path.join(CASE_STUDIES_DIR, file)
    const frontmatter = parseMdxFrontmatter(filePath)
    if (!frontmatter) {
      console.log(`  ⚠ Could not parse frontmatter: ${file}`)
      continue
    }

    const slug = file.replace('.mdx', '')
    const orderIndex = caseStudyOrder.indexOf(slug)
    const categories = (frontmatter.categories as string[]) || []
    const references = (frontmatter.references as Array<{ title: string; link: string }>) || []
    const upNext = (frontmatter.upNext as string[]) || []

    transaction.createOrReplace({
      _id: `case-study-${slug}`,
      _type: 'caseStudy',
      title: (frontmatter.title as string) || slug,
      slug: { _type: 'slug', current: slug },
      client: (frontmatter.client as string) || '',
      caption: (frontmatter.caption as string) || '',
      categories: categories.map((cat) => ({
        _type: 'reference',
        _ref: `category-${cat}`,
        _key: `cat-${cat}`,
      })),
      hidden: (frontmatter.hidden as boolean) || false,
      metaDescription: (frontmatter.metaDescription as string) || '',
      order: orderIndex >= 0 ? orderIndex : 999,
      references: references.map((ref, i) => ({
        _type: 'reference',
        _key: `ref-${i}`,
        title: ref.title,
        link: ref.link,
      })),
      upNext: upNext.map((id) => ({
        _type: 'reference',
        _ref: `case-study-${id}`,
        _key: `up-${id}`,
      })),
    })

    count++
  }

  const result = await transaction.commit()
  console.log(`  ✓ Migrated ${count} case studies (tx: ${result.transactionId})`)
  console.log('  ℹ Note: Case study body content (Portable Text) and images need manual migration.')
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  GoInvo Content Migration: Gatsby → Sanity CMS')
  console.log('═══════════════════════════════════════════════════')

  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_API_TOKEN) {
    console.error('\n❌ Missing required environment variables:')
    console.error('   SANITY_PROJECT_ID - Your Sanity project ID')
    console.error('   SANITY_API_TOKEN  - A Sanity API token with write access')
    console.error('   SANITY_DATASET    - (optional, defaults to "production")')
    console.error('\nExample:')
    console.error('  SANITY_PROJECT_ID=abc123 SANITY_API_TOKEN=sk... npx tsx scripts/migrate-to-sanity.ts')
    process.exit(1)
  }

  if (!fs.existsSync(GATSBY_ROOT)) {
    console.error(`\n❌ Gatsby site not found at: ${GATSBY_ROOT}`)
    console.error('   Expected the Gatsby site at ../goinvo.com relative to goinvo-website/')
    process.exit(1)
  }

  console.log(`\nGatsby source: ${GATSBY_ROOT}`)
  console.log(`Sanity project: ${process.env.SANITY_PROJECT_ID}`)
  console.log(`Sanity dataset: ${process.env.SANITY_DATASET || 'production'}`)

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) =>
    rl.question('\nProceed with migration? (y/N) ', resolve)
  )
  rl.close()

  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.')
    process.exit(0)
  }

  try {
    await migrateCategories()
    await migrateTeamMembers()
    await migrateAlumni()
    await migrateJobs()
    await migrateHomepageHeaders()
    await migrateFeatures()
    await migrateCaseStudies()

    console.log('\n═══════════════════════════════════════════════════')
    console.log('  ✅ Migration complete!')
    console.log('═══════════════════════════════════════════════════')
    console.log('\nNext steps:')
    console.log('  1. Upload images to Sanity using the Sanity Studio or CLI')
    console.log('  2. Convert MDX body content to Portable Text manually')
    console.log('  3. Review and verify all documents in Sanity Studio')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
