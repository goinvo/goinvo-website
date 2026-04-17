/**
 * One-shot: set the open-source-healthcare feature's articleHeroImage
 * to the wide editorial photo used by Gatsby
 * (the regular `image` field stays as the book cover used on listings).
 *
 * Usage:
 *   node --env-file=.env.local scripts/set-osh-article-hero.mjs           # dry
 *   node --env-file=.env.local scripts/set-osh-article-hero.mjs --write   # apply
 */
import { createClient } from 'next-sanity'

const WRITE = process.argv.includes('--write')
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN
const HERO_URL = 'https://dd17w042cevyt.cloudfront.net/images/features/open-source-healthcare/open-source-healthcare-hero.jpg'
const SLUG = 'open-source-healthcare'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: WRITE_TOKEN,
})

const feature = await client.fetch(
  `*[_type == "feature" && slug.current == $slug][0]{ _id, title, articleHeroImage }`,
  { slug: SLUG },
)

if (!feature) {
  console.error(`No feature with slug "${SLUG}" found.`)
  process.exit(1)
}

console.log(`Feature: ${feature.title} (${feature._id})`)
console.log(`Existing articleHeroImage:`, feature.articleHeroImage ? 'set' : 'unset')

if (!WRITE) {
  console.log(`Dry run — pass --write to apply. Will fetch:\n  ${HERO_URL}`)
  process.exit(0)
}

if (!WRITE_TOKEN) {
  console.error('SANITY_WRITE_TOKEN (or SANITY_API_WRITE_TOKEN) is required for --write')
  process.exit(1)
}

console.log(`Downloading hero image...`)
const res = await fetch(HERO_URL)
if (!res.ok) {
  console.error(`Failed to download: ${res.status} ${res.statusText}`)
  process.exit(1)
}
const buffer = Buffer.from(await res.arrayBuffer())
console.log(`Downloaded ${buffer.length} bytes`)

console.log(`Uploading to Sanity...`)
const asset = await client.assets.upload('image', buffer, {
  filename: 'open-source-healthcare-hero.jpg',
  contentType: 'image/jpeg',
})
console.log(`Uploaded asset ${asset._id}`)

console.log(`Patching feature...`)
await client
  .patch(feature._id)
  .set({
    articleHeroImage: {
      _type: 'image',
      asset: { _type: 'reference', _ref: asset._id },
    },
  })
  .commit()

console.log(`Done. The article page will now use the override hero; the listing card keeps the book image.`)
