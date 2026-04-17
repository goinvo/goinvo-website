/**
 * Add the missing "Carrier Testing" external link to the wuxi-nextcode-familycode
 * case study's upNext array. Gatsby has 3 entries (mount-sinai-consent,
 * external Carrier Testing on GitHub Pages, 3m-coderyte); Sanity is missing
 * the middle one because the schema previously only accepted Sanity references.
 *
 * Usage:
 *   node --env-file=.env.local scripts/add-wuxi-carrier-testing-upnext.mjs           # dry
 *   node --env-file=.env.local scripts/add-wuxi-carrier-testing-upnext.mjs --write   # apply
 */
import { createClient } from 'next-sanity'

const WRITE = process.argv.includes('--write')
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

const HERO_IMAGE_URL = 'https://dd17w042cevyt.cloudfront.net/images/features/carrier-testing/carrier-testing-featured.jpg'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: WRITE_TOKEN,
})

const cs = await client.fetch(
  `*[_type == "caseStudy" && slug.current == "wuxi-nextcode-familycode"][0]{
    _id,
    title,
    upNext[]{ _key, _type, _ref, "deref": @->{ slug, title } }
  }`,
)

if (!cs) {
  console.error('No wuxi-nextcode-familycode case study found.')
  process.exit(1)
}

console.log(`Found: ${cs.title} (${cs._id})`)
console.log(`Current upNext (${cs.upNext?.length || 0}):`)
for (const item of cs.upNext || []) {
  if (item._type === 'reference') console.log(`  - ref → ${item.deref?.slug?.current} (${item.deref?.title})`)
  else if (item._type === 'externalUpNextItem') console.log(`  - external → already present`)
}

const alreadyHasCarrierTesting = (cs.upNext || []).some(
  (i) => i._type === 'externalUpNextItem',
)
if (alreadyHasCarrierTesting) {
  console.log('External item already present — nothing to do.')
  process.exit(0)
}

if (!WRITE) {
  console.log('\nDry run — pass --write to add the Carrier Testing external link in the middle slot.')
  process.exit(0)
}

if (!WRITE_TOKEN) {
  console.error('SANITY_WRITE_TOKEN (or SANITY_API_WRITE_TOKEN) is required for --write')
  process.exit(1)
}

console.log(`\nDownloading Carrier Testing hero image...`)
const res = await fetch(HERO_IMAGE_URL)
if (!res.ok) {
  console.error(`Failed to download: ${res.status} ${res.statusText}`)
  process.exit(1)
}
const buffer = Buffer.from(await res.arrayBuffer())
console.log(`Downloaded ${buffer.length} bytes`)

const asset = await client.assets.upload('image', buffer, {
  filename: 'carrier-testing-featured.jpg',
  contentType: 'image/jpeg',
})
console.log(`Uploaded asset ${asset._id}`)

// Insert the external item between the existing two references (Gatsby order:
// mount-sinai → carrier testing → 3m-coderyte). Find mount-sinai's position
// and insert after it.
const upNext = cs.upNext || []
const insertIdx =
  upNext.findIndex((i) => i.deref?.slug?.current === 'mount-sinai-consent') + 1

const newItem = {
  _key: `carrier-testing-${Date.now().toString(36)}`,
  _type: 'externalUpNextItem',
  title: 'Carrier Testing',
  url: 'https://goinvo.github.io/CarrierTestingDesignTenets/',
  caption: 'Open source design guidelines for delivering digitized carrier testing results.',
  image: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
}

await client
  .patch(cs._id)
  .insert('after', `upNext[${Math.max(0, insertIdx - 1)}]`, [newItem])
  .commit()

console.log('Done — refresh the case study to see all 3 up-next entries.')
