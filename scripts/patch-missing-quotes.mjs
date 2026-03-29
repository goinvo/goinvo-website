/**
 * Batch add missing quotes to Sanity pages by extracting from Gatsby source.
 *
 * Usage:
 *   node scripts/patch-missing-quotes.mjs          # dry run
 *   node scripts/patch-missing-quotes.mjs --write   # apply
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

function extractQuotes(slug) {
  const paths = [
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.js'),
    join(GATSBY_SRC, 'src/pages/vision', slug, 'index.tsx'),
  ]
  const srcPath = paths.find(p => existsSync(p))
  if (!srcPath) return []

  const src = readFileSync(srcPath, 'utf-8')
  const flat = src.replace(/\n\s*/g, ' ')
  const quotes = []

  // Match <Quote quotee="AUTHOR">TEXT</Quote>
  const regex = /<Quote[^>]*quotee="([^"]*)"[^>]*>\s*([\s\S]*?)\s*<\/Quote>/g
  let m
  while ((m = regex.exec(flat)) !== null) {
    let text = m[2].trim()
      .replace(/<sup>.*?<\/sup>\{' '\}/g, '')  // strip superscripts
      .replace(/<[^>]+>/g, '')                  // strip tags
      .replace(/\{' '\}/g, ' ')                 // strip JSX spaces
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length > 10) {
      quotes.push({ text, author: m[1].trim() })
    }
  }

  return quotes
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

    const gatsbyQuotes = extractQuotes(slug)
    if (gatsbyQuotes.length === 0) continue

    let content = JSON.parse(JSON.stringify(doc.content || []))

    // Find existing quote texts
    const existingTexts = new Set()
    for (const block of content) {
      if (block._type === 'quote' && block.text) {
        existingTexts.add(block.text.toLowerCase().substring(0, 30))
      }
    }

    const missing = gatsbyQuotes.filter(q =>
      !existingTexts.has(q.text.toLowerCase().substring(0, 30))
    )

    if (missing.length === 0) continue

    console.log(`${slug}: adding ${missing.length} quote(s)`)
    missing.forEach(q => console.log(`  "${q.text.substring(0, 60)}..." — ${q.author}`))

    // Insert quotes before references/authors section
    let insertIdx = content.length
    for (let i = content.length - 1; i >= 0; i--) {
      if (content[i]._type === 'references' || content[i]._type === 'divider') {
        insertIdx = i
      }
      if (content[i]._type === 'block') {
        const text = (content[i].children || []).map(c => c.text || '').join('').toLowerCase()
        if (text === 'authors' || text === 'author') insertIdx = i
      }
    }

    for (const q of missing) {
      content.splice(insertIdx, 0, {
        _type: 'quote',
        _key: key(),
        text: q.text,
        author: q.author,
      })
      insertIdx++
    }

    totalChanges += missing.length

    if (WRITE) {
      await client.patch(doc._id).set({ content }).commit()
    }
  }

  console.log(`\n${totalChanges} quote(s) added.`)
  if (!WRITE && totalChanges > 0) console.log('Run with --write to apply.')
  if (WRITE && totalChanges > 0) console.log('✅ All patched.')
}

main().catch(console.error)
