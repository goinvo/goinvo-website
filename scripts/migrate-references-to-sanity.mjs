/**
 * Migrate JSON reference files into Sanity feature documents.
 *
 * For each vision page that has a references.json file in src/data/vision/<slug>/,
 * this script appends a `references` block to the Sanity feature document's content
 * array (if one doesn't already exist).
 *
 * Usage:
 *   node scripts/migrate-references-to-sanity.mjs          # dry run
 *   node scripts/migrate-references-to-sanity.mjs --write  # actually write to Sanity
 */

import { createClient } from '@sanity/client'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  token: process.env.SANITY_WRITE_TOKEN || 'skNpoSObzT9DMD5jwjsUV76GbcI5iZqJla9frrMCn73SozTq7LhRClBk6gUK59yfPbHIG4Nnfpx4afWS4XgqZ1KlHOcTFVDaxMbekmuzGxx6uuV7HK68gF7yLvkJEljziinEIxiiqNK5rRuG0ckl6rFaW3judK7hkqpRi1jLstYBPf9duLwu',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const WRITE = process.argv.includes('--write')
const DATA_DIR = 'src/data/vision'

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  // Find all reference JSON files
  const dirs = readdirSync(DATA_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const slug of dirs) {
    const refsPath = join(DATA_DIR, slug, 'references.json')
    let refs
    try {
      refs = JSON.parse(readFileSync(refsPath, 'utf8'))
    } catch {
      continue // No references.json for this slug
    }

    if (!Array.isArray(refs) || refs.length === 0) {
      console.log(`  ${slug}: empty references file, skipping`)
      skipped++
      continue
    }

    // Find the Sanity document
    const doc = await client.fetch(
      `*[_type == "feature" && slug.current == $slug][0]{ _id, title, "hasRefs": count(content[_type == "references"]) > 0 }`,
      { slug }
    )

    if (!doc) {
      console.log(`  ${slug}: ❌ no Sanity document found`)
      errors++
      continue
    }

    if (doc.hasRefs) {
      console.log(`  ${slug}: ✅ already has references block (${refs.length} in JSON)`)
      skipped++
      continue
    }

    // Build the references block
    const refsBlock = {
      _type: 'references',
      _key: randomUUID().slice(0, 12),
      items: refs.map(r => ({
        _type: 'object',
        _key: randomUUID().slice(0, 12),
        title: r.title,
        link: r.link || undefined,
      })),
    }

    console.log(`  ${slug}: ${refs.length} references → appending to content`)

    if (WRITE) {
      try {
        await client
          .patch(doc._id)
          .setIfMissing({ content: [] })
          .append('content', [refsBlock])
          .commit()
        console.log(`    ✅ written`)
        migrated++
      } catch (err) {
        console.log(`    ❌ error: ${err.message}`)
        errors++
      }
    } else {
      migrated++
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Migrated: ${migrated} | Skipped: ${skipped} | Errors: ${errors}`)
  if (!WRITE && migrated > 0) {
    console.log(`\nRun with --write to actually save to Sanity`)
  }
}

main().catch(console.error)
