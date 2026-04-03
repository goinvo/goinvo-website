/**
 * Add missing references blocks to Sanity pages by extracting from Gatsby source.
 *
 * Usage:
 *   node scripts/patch-missing-references.mjs          # dry run
 *   node scripts/patch-missing-references.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
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
const GATSBY_SRC = 'C:/Users/quest/Programming/GoInvo/goinvo.com'
const key = () => randomUUID().slice(0, 12)

const TARGET_SLUGS = [
  'national-cancer-navigation',
  'open-pro',
  'public-healthroom',
  'virtual-care',
]

function extractReferences(slug) {
  const paths = [
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.js'),
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.tsx'),
  ]
  const srcPath = paths.find(p => existsSync(p))
  if (!srcPath) return []

  const src = readFileSync(srcPath, 'utf-8')
  const flat = src.replace(/\n\s*/g, ' ')
  const refs = []

  // Match references array: { title: '...', link: '...' }
  const refRegex = /\{\s*title:\s*['"`]([^'"`]+)['"`]\s*,\s*link:\s*['"`]([^'"`]+)['"`]\s*,?\s*\}/g
  let m
  while ((m = refRegex.exec(flat)) !== null) {
    refs.push({ title: m[1].trim(), link: m[2].trim() })
  }

  // Also try link before title
  const refRegex2 = /\{\s*link:\s*['"`]([^'"`]+)['"`]\s*,\s*title:\s*['"`]([^'"`]+)['"`]\s*,?\s*\}/g
  while ((m = refRegex2.exec(flat)) !== null) {
    if (!refs.some(r => r.link === m[1].trim())) {
      refs.push({ title: m[2].trim(), link: m[1].trim() })
    }
  }

  return refs
}

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  let totalChanges = 0

  for (const slug of TARGET_SLUGS) {
    const doc = await client.fetch(
      `*[_type == 'feature' && slug.current == $slug][0]`,
      { slug }
    )
    if (!doc) { console.log(`${slug}: not found`); continue }

    const content = JSON.parse(JSON.stringify(doc.content || []))

    // Check if references already exist
    if (content.some(b => b._type === 'references')) {
      console.log(`${slug}: already has references block`)
      continue
    }

    const refs = extractReferences(slug)
    if (refs.length === 0) {
      console.log(`${slug}: no references found in Gatsby source`)
      continue
    }

    console.log(`${slug}: adding ${refs.length} reference(s)`)
    refs.forEach(r => console.log(`  - ${r.title.substring(0, 60)}`))

    const refsBlock = {
      _type: 'references',
      _key: key(),
      items: refs.map(r => ({
        _type: 'object',
        _key: key(),
        title: r.title,
        link: r.link,
      })),
    }

    content.push(refsBlock)
    totalChanges++

    if (WRITE) {
      await client.patch(doc._id).set({ content }).commit()
    }
  }

  console.log(`\n${totalChanges} page(s) updated.`)
  if (!WRITE && totalChanges > 0) console.log('Run with --write to apply.')
  if (WRITE && totalChanges > 0) console.log('✅ All patched.')
}

main().catch(console.error)
