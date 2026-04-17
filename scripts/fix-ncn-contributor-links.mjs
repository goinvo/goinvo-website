/**
 * Restore the missing LinkedIn URLs on the National Cancer Navigation
 * feature's contributors. The QA fix moved markDef-based links from the
 * content body into the contributors.link field, but the URLs themselves
 * weren't carried across — so each contributor renders as plain text.
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-ncn-contributor-links.mjs           # dry
 *   node --env-file=.env.local scripts/fix-ncn-contributor-links.mjs --write   # apply
 */
import { createClient } from 'next-sanity'

const WRITE = process.argv.includes('--write')
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: WRITE_TOKEN,
})

const LINKS = {
  'external-grace-cordovano': 'https://www.linkedin.com/in/gcordovano/',
  'external-wendi-cross': 'https://www.linkedin.com/in/wendi-cross-98153519/',
  'external-daniel-ngo': 'https://www.linkedin.com/in/daniel-ngo-41953232/',
}

const feature = await client.fetch(
  `*[_type == "feature" && !(_id in path("drafts.**")) && slug.current == "national-cancer-navigation"][0]{
    _id,
    contributors[]{ _key, link, "authorId": author._ref }
  }`,
)

if (!feature) { console.error('No NCN feature found'); process.exit(1) }

console.log(`Feature: ${feature._id}`)
const updated = (feature.contributors || []).map((c) => {
  const newLink = LINKS[c.authorId]
  if (newLink && c.link !== newLink) {
    console.log(`  ${c.authorId}: ${c.link || '(none)'} → ${newLink}`)
    return { ...c, link: newLink }
  }
  return c
})

const before = JSON.stringify(feature.contributors)
const after = JSON.stringify(updated)
if (before === after) { console.log('Nothing to change.'); process.exit(0) }

if (!WRITE) { console.log('\nDry run — pass --write to apply.'); process.exit(0) }
if (!WRITE_TOKEN) { console.error('SANITY_WRITE_TOKEN required'); process.exit(1) }

// Drop the temporary "authorId" projection field before writing
const cleaned = updated.map(({ authorId, ...rest }) => rest)
await client.patch(feature._id).set({ contributors: cleaned }).commit()
console.log('✓ patched.')
