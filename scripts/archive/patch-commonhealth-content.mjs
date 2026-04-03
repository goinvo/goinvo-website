/**
 * Patch commonhealth-smart-health-cards case study content:
 * 1. Convert Eric Davis quote from plain paragraph to quote block
 * 2. Convert inline reference paragraphs to a proper references block
 * 3. Remove the "References" h2 heading (now handled by the references block)
 * 4. Convert the two button links into a buttonGroup block
 *
 * Usage:
 *   node scripts/patch-commonhealth-content.mjs          # dry run
 *   node scripts/patch-commonhealth-content.mjs --write   # apply
 */
import { createClient } from '@sanity/client'
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
const key = () => randomUUID().slice(0, 12)

async function main() {
  console.log(`${WRITE ? '🔴 WRITE MODE' : '🟡 DRY RUN'}\n`)

  const doc = await client.fetch(
    `*[_type == "caseStudy" && slug.current == "commonhealth-smart-health-cards"][0]{ _id, content }`
  )

  if (!doc) {
    console.error('Document not found!')
    process.exit(1)
  }

  console.log(`Document: ${doc._id}`)
  console.log(`Content blocks: ${doc.content.length}\n`)

  let content = JSON.parse(JSON.stringify(doc.content))
  let changes = 0

  // --- 1. Convert Eric Davis quote paragraph to quote block ---
  // The quote text starts with " GoInvo digested..." (with leading space)
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (block._type === 'block' && block.style === 'normal') {
      const text = (block.children || []).map(c => c.text || '').join('').trim()
      if (text.startsWith('GoInvo digested a complex landscape')) {
        console.log(`[1] Block ${i}: Converting Eric Davis quote paragraph to quote block`)
        console.log(`    Text: "${text.substring(0, 80)}..."`)
        content[i] = {
          _type: 'quote',
          _key: key(),
          text: text,
          author: 'Eric Davis',
          role: 'Senior Product and Program Manager, CommonHealth',
        }
        changes++
        break
      }
    }
  }

  // --- 2. Convert button links to buttonGroup ---
  // Find the "SMART Health Cards" and "GitHub" link paragraphs
  let buttonIndices = []
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (block._type === 'block' && block.style === 'normal') {
      const text = (block.children || []).map(c => c.text || '').join('').trim()
      const hasLink = (block.markDefs || []).some(md => md._type === 'link')
      if (hasLink && (text === 'SMART Health Cards' || text === 'GitHub')) {
        buttonIndices.push(i)
      }
    }
  }

  if (buttonIndices.length === 2) {
    console.log(`[2] Blocks ${buttonIndices.join(', ')}: Converting link paragraphs to buttonGroup`)

    // Get the link URLs
    const smartBlock = content[buttonIndices[0]]
    const githubBlock = content[buttonIndices[1]]
    const smartUrl = (smartBlock.markDefs || []).find(m => m._type === 'link')?.href || ''
    const githubUrl = (githubBlock.markDefs || []).find(m => m._type === 'link')?.href || ''

    const buttonGroup = {
      _type: 'buttonGroup',
      _key: key(),
      buttons: [
        {
          _key: key(),
          label: 'SMART Health Cards',
          url: smartUrl,
          variant: 'secondary',
          external: true,
        },
        {
          _key: key(),
          label: 'GitHub',
          url: githubUrl,
          variant: 'secondary',
          external: true,
        },
      ],
    }

    // Replace first button block with buttonGroup, remove second
    content[buttonIndices[0]] = buttonGroup
    content.splice(buttonIndices[1], 1)
    changes++
    console.log(`    SMART Health Cards: ${smartUrl}`)
    console.log(`    GitHub: ${githubUrl}`)
  }

  // --- 3. Convert inline reference paragraphs to references block ---
  // Find the "References" h2 heading and the numbered reference paragraphs after it
  let refH2Idx = -1
  for (let i = 0; i < content.length; i++) {
    const block = content[i]
    if (block._type === 'block' && block.style === 'h2') {
      const text = (block.children || []).map(c => c.text || '').join('').trim()
      if (text === 'References') {
        refH2Idx = i
        break
      }
    }
  }

  if (refH2Idx >= 0) {
    // Collect all paragraphs after the References heading
    const refItems = []
    const refBlockIndices = [refH2Idx]

    for (let i = refH2Idx + 1; i < content.length; i++) {
      const block = content[i]
      if (block._type !== 'block' || block.style !== 'normal') break

      const fullText = (block.children || []).map(c => c.text || '').join('')
      // Extract the reference number and text
      const match = fullText.match(/^\d+\.\s*(.*)/)
      if (!match) break

      const linkDef = (block.markDefs || []).find(m => m._type === 'link')
      const link = linkDef?.href || ''
      // The title is everything before the URL
      let title = match[1].trim()
      // Remove the URL from the title text if it's included
      if (link && title.endsWith(link)) {
        title = title.substring(0, title.length - link.length).replace(/:\s*$/, '').trim()
      }

      refItems.push({
        _key: key(),
        title: title || '',
        link: link || '',
      })
      refBlockIndices.push(i)
    }

    if (refItems.length > 0) {
      console.log(`[3] Converting ${refItems.length} inline references to references block`)
      refItems.forEach((ref, idx) =>
        console.log(`    ${idx + 1}. "${ref.title.substring(0, 60)}" → ${ref.link.substring(0, 50)}`)
      )

      // Create references block
      const referencesBlock = {
        _type: 'references',
        _key: key(),
        items: refItems,
      }

      // Remove all old reference blocks (in reverse order to maintain indices)
      for (let i = refBlockIndices.length - 1; i >= 0; i--) {
        content.splice(refBlockIndices[i], 1)
      }

      // Insert references block at the position where the h2 was
      content.splice(refH2Idx, 0, referencesBlock)
      changes++
    }
  }

  // --- Summary ---
  console.log(`\nTotal changes: ${changes}`)

  if (changes === 0) {
    console.log('No changes to apply.')
    return
  }

  if (!WRITE) {
    console.log('Run with --write to apply.')
    return
  }

  await client.patch(doc._id).set({ content }).commit()
  console.log('✅ Patched successfully.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
