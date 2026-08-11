/**
 * Set how each piece is produced, and whether it can be ordered.
 *
 * These are CMS fields now rather than hardcoded slug lists, so this only seeds
 * the catalog with what the studio already knows: the posters are printed when
 * someone orders them, the books and the pieces kept on the shelf are not, and
 * the Open Source Healthcare Journal is not for sale right now.
 *
 * After this runs, editors change any of it in Studio -> Marketing -> Shop
 * without a deploy.
 *
 *   node scripts/set-shop-production.mjs           # dry run
 *   node scripts/set-shop-production.mjs --apply
 */
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', quiet: true })

const apply = process.argv.includes('--apply')

/** Pieces the studio holds physically rather than printing to order. */
const FROM_STOCK = new Set([
  'determinants-of-health',
  'healthcare-is-a-human-right',
  'own-your-health-data',
  'open-source-healthcare',
])

/** Pieces not for sale right now (Jon: the journal is a magazine we may be out of). */
const NOT_ORDERABLE = new Set(['open-source-healthcare'])

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN
if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set.')
if (!token) throw new Error('SANITY_API_WRITE_TOKEN is not set.')

const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', token, useCdn: false })

const products = await client.fetch(
  `*[_type == "marketingProduct" && !(_id in path("drafts.**"))] | order(title asc) {
    _id, title, "slug": slug.current, production, orderable
  }`,
)
if (products.length === 0) throw new Error('No marketingProduct documents found.')

const planned = products
  .map((product) => ({
    product,
    production: FROM_STOCK.has(product.slug) ? 'from-stock' : 'print-on-demand',
    orderable: !NOT_ORDERABLE.has(product.slug),
  }))
  .filter(
    ({ product, production, orderable }) =>
      product.production !== production || (product.orderable ?? true) !== orderable,
  )

console.log(`${products.length} products; ${planned.length} need updating.`)
for (const { product, production, orderable } of planned) {
  console.log(
    `  ${(product.slug || '').padEnd(34)} ${production}${orderable ? '' : '  (not orderable)'}`,
  )
}

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write.')
  process.exit(0)
}
if (planned.length === 0) process.exit(0)

let transaction = client.transaction()
for (const { product, production, orderable } of planned) {
  transaction = transaction.patch(product._id, (patch) => patch.set({ production, orderable }))
}
await transaction.commit()

const after = await client.fetch(
  `*[_type == "marketingProduct" && !(_id in path("drafts.**"))]{ "slug": slug.current, production, orderable }`,
)
const wrong = after.filter(
  (product) =>
    product.production !== (FROM_STOCK.has(product.slug) ? 'from-stock' : 'print-on-demand') ||
    (product.orderable ?? true) !== !NOT_ORDERABLE.has(product.slug),
)
console.log(`Wrote ${planned.length}. Mismatched after write: ${wrong.length}`)
if (wrong.length > 0) {
  console.log(JSON.stringify(wrong, null, 1))
  process.exitCode = 1
}
