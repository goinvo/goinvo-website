/**
 * Batch fix heading styles by cross-referencing Gatsby source.
 *
 * Fixes:
 * - h2 with header--xl in Gatsby → sectionTitle in Sanity (was h2/header-lg)
 * - headings with header--md in Gatsby → h3 in Sanity (was h2)
 * - headings with header--lg + text--center → h2Center in Sanity
 *
 * Usage:
 *   node scripts/patch-heading-styles.mjs          # dry run
 *   node scripts/patch-heading-styles.mjs --write   # apply
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
 * Parse Gatsby source to build a map of heading text → { class, tag }
 */
function getGatsbyHeadingStyles(slug) {
  const paths = [
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.js'),
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.tsx'),
  ]
  const srcPath = paths.find(p => existsSync(p))
  if (!srcPath) return []

  const src = readFileSync(srcPath, 'utf-8')
  const headings = []

  // Match: <hN className="header--xl ...">TEXT</hN>
  const regex = /<h([1-4])\s+className="([^"]*)"[^>]*>\s*\n?\s*([^<\n{]+)/g
  let m
  while ((m = regex.exec(src)) !== null) {
    const tag = `h${m[1]}`
    const classes = m[2]
    const text = m[3].trim().toLowerCase()
    if (text.length < 2) continue
    headings.push({ tag, classes, text })
  }

  return headings
}

function normalizeText(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
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

    const gatsbyHeadings = getGatsbyHeadingStyles(slug)
    if (gatsbyHeadings.length === 0) continue

    let content = JSON.parse(JSON.stringify(doc.content || []))
    let changes = 0

    function fixBlocks(blocks) {
      for (const block of blocks) {
        if (block._type === 'backgroundSection' && block.content) {
          fixBlocks(block.content)
        }
        if (block._type !== 'block') continue
        if (!['h2', 'h3', 'h4', 'sectionTitle', 'h2Center'].includes(block.style)) continue

        const text = normalizeText((block.children || []).map(c => c.text || '').join(''))
        if (text.length < 2) continue

        // Find matching Gatsby heading
        const match = gatsbyHeadings.find(gh => {
          const gt = normalizeText(gh.text)
          return (gt.substring(0, 30).includes(text.substring(0, 30)) ||
                  text.substring(0, 30).includes(gt.substring(0, 30)))
        })
        if (!match) continue

        const gc = match.classes

        // header--xl in Gatsby → should be sectionTitle in Sanity (large centered serif)
        if (gc.includes('header--xl') && block.style === 'h2' && !gc.includes('text--center')) {
          // header--xl without center = large serif, left-aligned
          // Our h2 already renders as header-lg which is close but smaller
          // Only change to sectionTitle if it's also centered
          // Otherwise leave as h2 (header-lg is acceptable for header--xl in non-centered context)
        }
        if (gc.includes('header--xl') && gc.includes('text--center') && block.style !== 'sectionTitle') {
          console.log(`  [${slug}] "${text.substring(0, 50)}" ${block.style} → sectionTitle (header--xl + text--center)`)
          block.style = 'sectionTitle'
          changes++
          continue
        }

        // header--md in Gatsby → should be h3 in Sanity (uppercase sans)
        if (gc.includes('header--md') && block.style === 'h2') {
          console.log(`  [${slug}] "${text.substring(0, 50)}" h2 → h3 (header--md = uppercase sans)`)
          block.style = 'h3'
          changes++
          continue
        }

        // header--lg in Gatsby but rendered without serif in Next.js
        // Our h2 already uses header-lg, so this should be fine
        // But if it's currently h3 or h4, it needs to be h2
        if (gc.includes('header--lg') && (block.style === 'h3' || block.style === 'h4')) {
          console.log(`  [${slug}] "${text.substring(0, 50)}" ${block.style} → h2 (header--lg = serif light)`)
          block.style = 'h2'
          changes++
          continue
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

  console.log(`\n${totalChanges} heading style(s) fixed.`)
  if (!WRITE && totalChanges > 0) console.log('Run with --write to apply.')
  if (WRITE && totalChanges > 0) console.log('✅ All patched.')
}

main().catch(console.error)
