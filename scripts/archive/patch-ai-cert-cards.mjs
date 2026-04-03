import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const write = process.argv.includes('--write')

async function main() {
  const doc = await client.fetch(`*[_type=="feature" && slug.current=="ai-design-certification"][0]{_id, content}`)
  if (!doc) { console.log('Document not found'); return }

  const content = [...doc.content]
  let changes = 0

  // Find the Design Health Schema cards (blocks 10-17: SAFETY through HUMAN ESCALATION)
  // These are plain paragraphs that should be a cardGrid block
  const schemaItems = []
  let schemaStart = -1
  let schemaEnd = -1

  for (let i = 0; i < content.length; i++) {
    const b = content[i]
    if (b._type !== 'block') continue
    const text = (b.children || []).map(c => c.text || '').join('')

    if (text.match(/^SAFETY:/i) && schemaStart < 0) {
      schemaStart = i
    }
    if (schemaStart >= 0 && schemaStart < 20 && i >= schemaStart && i < schemaStart + 8) {
      // Parse "LABEL: description" format (label is all-caps before the colon)
      const colonIdx = text.indexOf(':')
      if (colonIdx > 0) {
        schemaItems.push({
          _type: 'object',
          _key: `card-${i}`,
          label: text.substring(0, colonIdx).trim().toUpperCase(),
          description: text.substring(colonIdx + 1).trim(),
        })
        schemaEnd = i
      }
    }
  }

  if (schemaItems.length === 8 && schemaStart >= 0) {
    console.log(`[FIX 1] Converting ${schemaItems.length} paragraphs (${schemaStart}-${schemaEnd}) to cardGrid`)
    const cardGrid = {
      _type: 'cardGrid',
      _key: 'design-health-schema-grid',
      columns: '4',
      items: schemaItems,
    }
    content.splice(schemaStart, 8, cardGrid)
    changes++
  } else {
    // Check if already converted
    const existing = content.find(b => b._type === 'cardGrid' && b._key === 'design-health-schema-grid')
    if (existing) {
      console.log('[FIX 1] Already converted to cardGrid')
    } else {
      console.log(`[FIX 1] Could not find 8 schema items (found ${schemaItems.length} starting at ${schemaStart})`)
    }
  }

  // Find "Human review catches problems" section items and convert to cardGrid
  // Blocks after h3 "4. Human review catches problems":
  // - "Review result — cardiac insight v1.2: " (label paragraph)
  // - "This suggests early atrial fibrillation." (quoted text)
  // - "Why it fails: " (label)
  // - "If we're in the wellness world..." (description)
  // - "Narrow scope" (item)
  // - "Add uncertainty" (item)
  // - "Trigger clinical follow-up" (item)
  // These are better as a callout or backgroundSection than a cardGrid.
  // Let's leave them as-is for now — the main user request was about the Design Health Schema cards.

  // Fix heading levels: "What is AI design certification?" and "Product vision" should render larger
  // In Gatsby these are h1 (36px). In Sanity they're h2 (24px).
  // We can't just change them to h1 since our h1 is 48px.
  // Best fix: add a 'large' style option to the block schema. But for now,
  // convert these section headings to use sectionTitle style which renders at header-lg (24px centered).
  // Wait — sectionTitle is centered. These are left-aligned.
  // Let's just leave them as h2 and rely on the header-lg class which is 1.5rem = 24px.
  // The Gatsby page uses custom CSS to make its h1s 36px. This is a page-specific style.

  console.log(`\nTotal changes: ${changes}`)

  if (changes > 0 && write) {
    await client.patch(doc._id).set({ content }).commit()
    console.log('✅ Applied to Sanity')
  } else if (changes > 0) {
    console.log('🔵 DRY RUN — use --write to apply')
  } else {
    console.log('✅ No changes needed')
  }
}

main().catch(console.error)
