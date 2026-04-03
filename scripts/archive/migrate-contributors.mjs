/**
 * Migrate inline contributor names from content blocks to the contributors field.
 *
 * Pages that have a "Contributors" heading followed by a name list in the content
 * body need those names moved to the `contributors` field so the template can
 * render them in the correct order (after Authors).
 *
 * Usage:
 *   node scripts/migrate-contributors.mjs
 *   node scripts/migrate-contributors.mjs --dry-run
 */

import { createClient } from '@sanity/client'
import crypto from 'crypto'

const client = createClient({
  projectId: 'a1wsimxr',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || 'sk193iVVrPLplMQlWPjZuFNuvIjtYY0hYw4Jfv7zGvzg4bX1xtm5WC9fbZtnEWVdWk3Ft4CGvOqg058qJBXv9ybliMn1TUnv6INGxFPXNRLlsKFGjOUIQFcPnTZ6y6BO1kfkytu4rvnJ0dWIizHd5U5kp3UTEj3MNCsnKB9BSvF1ryQ5Whmu',
  useCdn: false,
})

const dryRun = process.argv.includes('--dry-run')

function rkey() { return crypto.randomBytes(6).toString('hex') }

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const SLUGS = [
  'digital-health-trends-2022',
  'own-your-health-data',
  'who-uses-my-health-data',
  'open-pro',
  'virtual-care',
  'loneliness-in-our-human-code',
  'patient-centered-consent',
  'fraud-waste-abuse-in-healthcare',
]

async function main() {
  if (dryRun) console.log('=== DRY RUN ===\n')

  // Get all team members for name matching
  const members = await client.fetch('*[_type=="teamMember"]{_id, name}')
  const nameMap = {}
  for (const m of members) nameMap[m.name.toLowerCase()] = m._id

  // Sort by name length descending to match longest names first (e.g. "Colleen Tang Poy" before "Jen Patel")
  const sortedNames = Object.entries(nameMap).sort((a, b) => b[0].length - a[0].length)

  for (const slug of SLUGS) {
    const doc = await client.fetch('*[_type=="feature" && slug.current==$slug][0]', { slug })
    if (!doc) { console.log(slug + ': NOT FOUND'); continue }

    // Already has contributors field
    if (doc.contributors?.length > 0) {
      console.log(slug + ': already has contributors field (' + doc.contributors.length + ')')
      continue
    }

    // Find Contributors heading in content
    const contribIdx = doc.content.findIndex(b =>
      b._type === 'block' && b.children?.some(c => c.text?.trim() === 'Contributors')
    )
    if (contribIdx < 0) { console.log(slug + ': no Contributors heading in content'); continue }

    // Get the name list block after the heading
    const nameBlock = doc.content[contribIdx + 1]
    if (!nameBlock || nameBlock._type !== 'block') {
      console.log(slug + ': no text block after Contributors heading (found ' + (nameBlock?._type || 'nothing') + ')')
      continue
    }

    // Extract names from text
    const nameText = nameBlock.children?.map(c => c.text || '').join('').trim()
    const foundContribs = []
    let remaining = nameText

    for (const [nameLower, id] of sortedNames) {
      if (remaining.toLowerCase().includes(nameLower)) {
        const member = members.find(m => m._id === id)
        foundContribs.push({ name: member.name, _id: id })
        remaining = remaining.replace(new RegExp(escapeRegex(nameLower), 'gi'), '').trim()
      }
    }

    if (foundContribs.length === 0) {
      console.log(slug + ': could not match any names from "' + nameText.substring(0, 60) + '"')
      continue
    }

    // Build contributors array
    const contributors = foundContribs.map(c => ({
      _key: rkey(),
      _type: 'authorCredit',
      author: { _type: 'reference', _ref: c._id },
    }))

    // Remove Contributors heading + name block from content
    const content = [...doc.content]
    content.splice(contribIdx, 2)

    if (dryRun) {
      console.log(slug + ': would migrate ' + foundContribs.length + ' contributors')
      console.log('  Names: ' + foundContribs.map(c => c.name).join(', '))
      if (remaining) console.log('  Unmatched: "' + remaining + '"')
    } else {
      await client.patch(doc._id).set({ content, contributors }).commit()
      console.log(slug + ': migrated ' + foundContribs.length + ' contributors (' + foundContribs.map(c => c.name).join(', ') + ')')
      if (remaining) console.log('  Unmatched: "' + remaining + '"')
    }
  }
}

main().catch(console.error)
