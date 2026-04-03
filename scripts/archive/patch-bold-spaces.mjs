/**
 * Fix missing spaces at bold/mark boundaries in Sanity Portable Text content.
 * When text was migrated, spaces between adjacent spans with different marks
 * (e.g. normal → bold or bold → normal) were often dropped.
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

async function fixSpaces() {
  const docs = await client.fetch('*[_type=="feature"]{_id, slug, content}')
  let totalFixed = 0

  for (const doc of docs) {
    if (!doc.content) continue
    let docFixed = 0

    const newContent = doc.content.map(block => {
      if (block._type !== 'block' || !block.children) return block
      const kids = [...block.children]

      for (let i = 1; i < kids.length; i++) {
        const prev = kids[i - 1]
        const curr = kids[i]
        const pm = JSON.stringify(prev.marks || [])
        const cm = JSON.stringify(curr.marks || [])

        if (pm !== cm) {
          // Don't add spaces to/from superscript spans — sups attach
          // directly to the preceding word with no space
          const prevIsSup = prev.marks?.includes('sup')
          const currIsSup = curr.marks?.includes('sup')
          if (prevIsSup || currIsSup) continue

          const prevEnd = prev.text?.slice(-1)
          const currStart = curr.text?.[0]
          if (prevEnd && currStart && prevEnd !== ' ' && currStart !== ' ') {
            kids[i - 1] = { ...prev, text: prev.text + ' ' }
            docFixed++
          }
        }
      }

      return { ...block, children: kids }
    })

    if (docFixed > 0) {
      await client.patch(doc._id).set({ content: newContent }).commit()
      console.log(`  ${doc.slug.current}: fixed ${docFixed} spaces`)
      totalFixed += docFixed
    }
  }

  console.log(`\nTotal fixed: ${totalFixed}`)
}

fixSpaces().catch(console.error)
