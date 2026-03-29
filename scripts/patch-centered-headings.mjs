/**
 * Batch fix: change h2 headings that should be centered to h2Center style.
 * Cross-references Gatsby source to find which headings use text--center.
 *
 * Usage:
 *   node scripts/patch-centered-headings.mjs          # dry run
 *   node scripts/patch-centered-headings.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
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

/**
 * Extract centered heading texts from a Gatsby JSX source file.
 * Looks for text--center class on heading elements.
 */
function getCenteredHeadings(slug) {
  const paths = [
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.js'),
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.tsx'),
  ]
  const srcPath = paths.find(p => existsSync(p))
  if (!srcPath) return []

  const src = readFileSync(srcPath, 'utf-8')
  const centered = []

  // Find headings with text--center class
  // Pattern: <hN className="...text--center...">TEXT</hN>
  const regex = /<h([1-4])\s+className="([^"]*text--center[^"]*)"[^>]*>([^<]+)<\/h\1>/g
  let m
  while ((m = regex.exec(src)) !== null) {
    centered.push(m[3].trim().toLowerCase())
  }

  // Also catch multi-line patterns: className with text--center before >
  const multiRegex = /className="[^"]*text--center[^"]*"[^>]*>\s*([^<\n]+)/g
  while ((m = multiRegex.exec(src)) !== null) {
    const text = m[1].trim().toLowerCase()
    if (text.length > 2 && !centered.includes(text)) {
      centered.push(text)
    }
  }

  return centered
}

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const docs = await client.fetch(
    `*[_type == 'feature']{ _id, slug, title, content }`
  )
  console.log(`Found ${docs.length} feature documents\n`)

  let totalChanges = 0

  for (const doc of docs) {
    const slug = doc.slug?.current
    if (!slug) continue

    const centeredTexts = getCenteredHeadings(slug)
    if (centeredTexts.length === 0) continue

    let content = JSON.parse(JSON.stringify(doc.content || []))
    let changes = 0

    // Walk all blocks (including inside backgroundSection.content)
    function fixBlocks(blocks) {
      for (const block of blocks) {
        if (block._type === 'backgroundSection' && block.content) {
          fixBlocks(block.content)
        }
        if (block._type !== 'block') continue
        if (block.style !== 'h2') continue

        const text = (block.children || []).map(c => c.text || '').join('').trim().toLowerCase()
        if (centeredTexts.some(ct => text.includes(ct) || ct.includes(text))) {
          console.log(`  [${slug}] "${text.substring(0, 50)}" h2 → h2Center`)
          block.style = 'h2Center'
          changes++
        }
      }
    }

    fixBlocks(content)

    if (changes > 0) {
      totalChanges += changes
      if (WRITE) {
        await client.patch(doc._id).set({ content }).commit()
      }
    }
  }

  console.log(`\n${totalChanges} heading(s) changed to h2Center.`)
  if (!WRITE && totalChanges > 0) console.log('Run with --write to apply.')
  if (WRITE && totalChanges > 0) console.log('✅ All patched.')
}

main().catch(console.error)
