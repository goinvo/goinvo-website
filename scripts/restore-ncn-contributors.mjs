/**
 * Emergency: restore the author references on NCN contributors. The
 * fix-ncn-contributor-links.mjs script accidentally dropped the
 * author._ref field when re-writing the contributors array. This script
 * re-attaches the correct author references by name lookup, preserving
 * the LinkedIn links that were just added.
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

// Match contributor _key → expected teamMember _id (in the order they appear)
const KEY_TO_AUTHOR = {
  'cont-0': 'external-grace-cordovano',
  'cont-1': 'external-wendi-cross',
  'cont-2': 'external-daniel-ngo',
}

const feature = await client.fetch(
  `*[_type == "feature" && !(_id in path("drafts.**")) && slug.current == "national-cancer-navigation"][0]{
    _id, contributors
  }`,
)

console.log('current contributors:', JSON.stringify(feature.contributors, null, 2))

const restored = (feature.contributors || []).map((c) => {
  const expectedAuthorId = KEY_TO_AUTHOR[c._key]
  if (expectedAuthorId && !c.author?._ref) {
    return {
      ...c,
      author: { _type: 'reference', _ref: expectedAuthorId },
    }
  }
  return c
})

console.log('\nrestored:', JSON.stringify(restored, null, 2))

if (!WRITE) { console.log('\nDry run — pass --write to apply.'); process.exit(0) }
if (!WRITE_TOKEN) { console.error('SANITY_WRITE_TOKEN required'); process.exit(1) }

await client.patch(feature._id).set({ contributors: restored }).commit()
console.log('\n✓ patched — author refs restored.')
