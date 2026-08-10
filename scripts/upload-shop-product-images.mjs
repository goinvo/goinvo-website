/**
 * Give every shop product its real artwork in Sanity.
 *
 * The 31 marketingProduct documents carry no image, so the Shop workspace shows
 * a placeholder box for each one and Stripe's checkout page shows no thumbnail
 * at all. The poster art exists, but only as static CloudFront files that the
 * storefront maps to slugs in code, which nothing else can see.
 *
 * This uploads each poster to Sanity once and points the product at it, so the
 * artwork becomes data: visible in the CMS, usable at checkout, and editable by
 * whoever owns the catalog.
 *
 *   node scripts/upload-shop-product-images.mjs           # dry run
 *   node scripts/upload-shop-product-images.mjs --apply
 *   node scripts/upload-shop-product-images.mjs --apply --force   # replace existing
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const force = args.includes('--force')

const CDN = 'https://dd17w042cevyt.cloudfront.net'
const STOREFRONT_PAGE = 'src/app/(main)/vision/health-visualizations/page.tsx'

/**
 * The slug-to-artwork pairing already exists, once, in the storefront page's
 * fallbackPosters list. Read it from there rather than keeping a second copy
 * that can drift: a wrong pairing here would put the wrong picture on a product
 * and then on a customer's checkout page.
 */
function readPosterImageBySlug() {
  const source = readFileSync(STOREFRONT_PAGE, 'utf8')
  const start = source.indexOf('const fallbackPosters = [')
  if (start === -1) throw new Error(`Could not find fallbackPosters in ${STOREFRONT_PAGE}`)
  const end = source.indexOf('\n]', start)
  const block = source.slice(start, end)

  const bySlug = {}
  const entry = /id:\s*'([^']+)'[\s\S]*?image:\s*'([^']+)'/g
  let match
  while ((match = entry.exec(block))) bySlug[match[1]] = match[2]

  const count = Object.keys(bySlug).length
  if (count < 30) {
    throw new Error(`Only parsed ${count} poster images from ${STOREFRONT_PAGE}; refusing to guess.`)
  }
  return bySlug
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN
if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set.')
if (!token) throw new Error('SANITY_API_WRITE_TOKEN is not set; cannot upload images.')

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })
const imageBySlug = readPosterImageBySlug()

const products = await client.fetch(
  `*[_type == "marketingProduct" && !(_id in path("drafts.**"))] | order(title asc) {
    _id, title, "slug": slug.current, "hasImage": defined(image)
  }`,
)

const planned = products.filter((product) => (force || !product.hasImage) && imageBySlug[product.slug])
const unmatched = products.filter((product) => !imageBySlug[product.slug])

console.log(`${products.length} products; ${planned.length} to receive artwork.`)
if (unmatched.length > 0) {
  console.log(`No artwork mapped for ${unmatched.length}:`)
  for (const product of unmatched) console.log(`   ${product.slug} (${product.title})`)
}
for (const product of planned) {
  console.log(`  ${(product.slug || '').padEnd(34)} <- ${imageBySlug[product.slug]}`)
}

if (!apply) {
  console.log('\nDry run. Re-run with --apply to upload and attach.')
  process.exit(0)
}

let attached = 0
for (const product of planned) {
  const path = imageBySlug[product.slug]
  const url = `${CDN}${path}`
  const response = await fetch(url)
  if (!response.ok) {
    console.log(`  SKIP ${product.slug}: ${response.status} fetching ${url}`)
    continue
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  const filename = path.split('/').pop()

  // Sanity dedupes by content hash, so re-running reuses the same asset rather
  // than piling up copies.
  const asset = await client.assets.upload('image', buffer, { filename })
  await client
    .patch(product._id)
    .set({
      image: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
        alt: product.title,
      },
    })
    .commit()
  attached += 1
  console.log(`  ${product.slug} -> ${asset._id} (${Math.round(buffer.length / 1024)}kb)`)
}

const withImage = await client.fetch(
  `count(*[_type == "marketingProduct" && !(_id in path("drafts.**")) && defined(image)])`,
)
console.log(`Attached ${attached}. Products with artwork: ${withImage}/${products.length}`)
