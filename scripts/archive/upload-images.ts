/**
 * Image Upload Script: Upload Gatsby images to Sanity
 *
 * Uploads images referenced in case studies and team members
 * to the Sanity CDN, then patches the documents with image refs.
 *
 * Run with:
 *   npx tsx scripts/upload-images.ts
 *
 * Prerequisites:
 *   - Set SANITY_PROJECT_ID, SANITY_DATASET, and SANITY_API_TOKEN env vars
 *   - Run migrate-to-sanity.ts first to create documents
 */

import { createClient } from '@sanity/client'
import * as fs from 'fs'
import * as path from 'path'

const GATSBY_ROOT = path.resolve(__dirname, '../../goinvo.com')
const STATIC_DIR = path.join(GATSBY_ROOT, 'static')

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

async function uploadImage(imagePath: string): Promise<{
  _type: 'image'
  asset: { _type: 'reference'; _ref: string }
} | null> {
  // Try multiple base paths
  const possiblePaths = [
    path.join(STATIC_DIR, imagePath),
    path.join(GATSBY_ROOT, 'static', imagePath),
    path.join(GATSBY_ROOT, 'src', imagePath),
  ]

  let resolvedPath: string | null = null
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      resolvedPath = p
      break
    }
  }

  if (!resolvedPath) {
    console.log(`  ⚠ Image not found: ${imagePath}`)
    return null
  }

  try {
    const imageBuffer = fs.readFileSync(resolvedPath)
    const filename = path.basename(resolvedPath)
    const asset = await sanityClient.assets.upload('image', imageBuffer, { filename })

    return {
      _type: 'image',
      asset: { _type: 'reference', _ref: asset._id },
    }
  } catch (error) {
    console.log(`  ⚠ Failed to upload: ${imagePath} - ${error}`)
    return null
  }
}

async function uploadTeamImages() {
  console.log('\n👥 Uploading team member images...')
  const teamPath = path.join(GATSBY_ROOT, 'src/data/team.json')
  const team = JSON.parse(fs.readFileSync(teamPath, 'utf-8')) as Array<{
    name: string
    image: string
  }>

  for (const member of team) {
    if (!member.image) continue
    const slug = member.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    console.log(`  Uploading ${member.name}: ${member.image}`)
    const imageRef = await uploadImage(member.image)
    if (imageRef) {
      await sanityClient
        .patch(`team-${slug}`)
        .set({ image: imageRef })
        .commit()
      console.log(`    ✓ Updated`)
    }
  }
}

async function uploadCaseStudyImages() {
  console.log('\n📄 Uploading case study hero images...')
  const caseStudiesDir = path.join(GATSBY_ROOT, 'src/case-studies')

  if (!fs.existsSync(caseStudiesDir)) {
    console.log('  ⏭ case-studies directory not found')
    return
  }

  const mdxFiles = fs.readdirSync(caseStudiesDir).filter((f) => f.endsWith('.mdx'))

  for (const file of mdxFiles) {
    const content = fs.readFileSync(path.join(caseStudiesDir, file), 'utf-8')
    const match = content.match(/image:\s*['"](.+?)['"]/)
    if (!match) continue

    const slug = file.replace('.mdx', '')
    const imagePath = match[1]

    console.log(`  Uploading ${slug}: ${imagePath}`)
    const imageRef = await uploadImage(imagePath)
    if (imageRef) {
      await sanityClient
        .patch(`case-study-${slug}`)
        .set({ image: imageRef })
        .commit()
      console.log(`    ✓ Updated`)
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('  GoInvo Image Upload: Gatsby → Sanity CDN')
  console.log('═══════════════════════════════════════════════════')

  if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_API_TOKEN) {
    console.error('\n❌ Missing required environment variables.')
    console.error('   SANITY_PROJECT_ID, SANITY_API_TOKEN required.')
    process.exit(1)
  }

  await uploadTeamImages()
  await uploadCaseStudyImages()

  console.log('\n✅ Image upload complete!')
}

main()
