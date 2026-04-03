/**
 * Batch add missing CTA buttons to Sanity vision pages.
 * Cross-references Gatsby source to find button URLs and labels.
 *
 * Usage:
 *   node scripts/patch-missing-buttons.mjs          # dry run
 *   node scripts/patch-missing-buttons.mjs --write   # apply
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

/**
 * Extract buttons from Gatsby source: { label, url, external }
 */
function getGatsbyButtons(slug) {
  const paths = [
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.js'),
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.tsx'),
  ]
  const srcPath = paths.find(p => existsSync(p))
  if (!srcPath) return []

  const src = readFileSync(srcPath, 'utf-8')
  const buttons = []

  // Match multi-line: <a ... className="...button..." ... href="URL" ...> LABEL </a>
  // Use dotAll-like matching by replacing newlines
  const flat = src.replace(/\n\s*/g, ' ')

  // Match <a> with button class and href (literal or mediaUrl)
  const regex = /<a\s[^>]*className="[^"]*button[^"]*"[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/g
  let m
  while ((m = regex.exec(flat)) !== null) {
    const url = m[1].trim()
    const label = m[2].trim()
    if (label.length > 1 && !label.includes('{') && url.length > 1) {
      const external = url.startsWith('http') || url.startsWith('//')
      buttons.push({ label, url, external })
    }
  }

  // href before className
  const regex2 = /<a\s[^>]*href="([^"]+)"[^>]*className="[^"]*button[^"]*"[^>]*>\s*([^<]+?)\s*<\/a>/g
  while ((m = regex2.exec(flat)) !== null) {
    const url = m[1].trim()
    const label = m[2].trim()
    if (label.length > 1 && !label.includes('{') && url.length > 1) {
      const external = url.startsWith('http') || url.startsWith('//')
      if (!buttons.some(b => b.label === label)) {
        buttons.push({ label, url, external })
      }
    }
  }

  // Match href={mediaUrl('...')} or href={mediaUrl("...")}
  const regex3 = /<a[^>]*href=\{mediaUrl\(\s*['"]([^'"]+)['"]\s*\)\}[^>]*className="[^"]*button[^"]*"[^>]*>\s*([^<]+?)\s*<\/a>/g
  while ((m = regex3.exec(flat)) !== null) {
    const url = m[1].trim()
    const label = m[2].trim()
    if (label.length > 1 && !buttons.some(b => b.label === label)) {
      buttons.push({ label, url: 'https://dd17w042cevyt.cloudfront.net' + url, external: true })
    }
  }
  // Also reversed order
  const regex4 = /<a[^>]*className="[^"]*button[^"]*"[^>]*href=\{mediaUrl\(\s*['"]([^'"]+)['"]\s*\)\}[^>]*>\s*([^<]+?)\s*<\/a>/g
  while ((m = regex4.exec(flat)) !== null) {
    const url = m[1].trim()
    const label = m[2].trim()
    if (label.length > 1 && !buttons.some(b => b.label === label)) {
      buttons.push({ label, url: 'https://dd17w042cevyt.cloudfront.net' + url, external: true })
    }
  }

  return buttons
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

    const gatsbyButtons = getGatsbyButtons(slug)
    if (gatsbyButtons.length === 0) continue

    let content = JSON.parse(JSON.stringify(doc.content || []))

    // Check which buttons already exist in content
    const existingLabels = new Set()
    for (const block of content) {
      if (block._type === 'ctaButton') {
        existingLabels.add((block.label || '').toLowerCase())
      }
      if (block._type === 'buttonGroup' && block.buttons) {
        for (const btn of block.buttons) {
          existingLabels.add((btn.label || '').toLowerCase())
        }
      }
    }

    const missing = gatsbyButtons.filter(b => !existingLabels.has(b.label.toLowerCase()))
    if (missing.length === 0) continue

    // Skip interactive buttons (expand all, etc.)
    const actionButtons = missing.filter(b =>
      !b.label.toLowerCase().includes('expand') &&
      b.url.length > 1
    )
    if (actionButtons.length === 0) continue

    console.log(`${slug}: adding ${actionButtons.length} button(s)`)

    // Find where to insert buttons — after the last paragraph before references/authors
    let insertIdx = content.length
    for (let i = content.length - 1; i >= 0; i--) {
      const t = content[i]._type
      if (t === 'references' || t === 'divider') {
        insertIdx = i
      }
      // Also check for authors sectionTitle
      if (t === 'block') {
        const text = (content[i].children || []).map(c => c.text || '').join('').toLowerCase()
        if (text === 'authors' || text === 'author') {
          insertIdx = i
        }
      }
    }

    // Group buttons or add individually
    if (actionButtons.length >= 2) {
      const buttonGroup = {
        _type: 'buttonGroup',
        _key: key(),
        buttons: actionButtons.map(b => ({
          _type: 'ctaButton',
          _key: key(),
          label: b.label,
          url: b.url,
          variant: 'secondary',
          external: b.external,
        })),
      }
      content.splice(insertIdx, 0, buttonGroup)
      console.log(`  Added buttonGroup with ${actionButtons.length} buttons before position ${insertIdx}`)
    } else {
      const btn = actionButtons[0]
      const ctaBlock = {
        _type: 'ctaButton',
        _key: key(),
        label: btn.label,
        url: btn.url,
        variant: 'secondary',
        external: btn.external,
      }
      content.splice(insertIdx, 0, ctaBlock)
      console.log(`  Added "${btn.label}" button before position ${insertIdx}`)
    }

    totalChanges += actionButtons.length

    if (WRITE) {
      await client.patch(doc._id).set({ content }).commit()
    }
  }

  console.log(`\n${totalChanges} button(s) added.`)
  if (!WRITE && totalChanges > 0) console.log('Run with --write to apply.')
  if (WRITE && totalChanges > 0) console.log('✅ All patched.')
}

main().catch(console.error)
