/**
 * Set the catalog prices held in Sanity, which are what the storefront shows
 * and what checkout charges.
 *
 * The marketingProduct documents were seeded at the original $6 launch price
 * and never updated when the price moved, so they have to be brought in line
 * before the site starts reading them. Run the dry run first; it prints every
 * change it would make.
 *
 *   node scripts/set-shop-prices.mjs            # dry run, writes nothing
 *   node scripts/set-shop-prices.mjs --apply    # write
 *   node scripts/set-shop-prices.mjs --apply --price 25 --slug make-things
 */
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local', quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const flag = (name) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

// The studio's standing prices. Anything not named here takes the default.
const DEFAULT_PRICE = Number(flag('--price') ?? 30)
const PRICE_BY_SLUG = { 'own-your-health-data': 9 }
const onlySlug = flag('--slug')

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN

if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set.')
if (!token) throw new Error('SANITY_API_WRITE_TOKEN is not set; cannot write prices.')

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const products = await client.fetch(
  `*[_type == "marketingProduct" && !(_id in path("drafts.**"))] | order(title asc) {
    _id, title, "slug": slug.current, price, currency, status,
    stripePriceId, stripePriceUnitAmount
  }`,
)

if (products.length === 0) {
  throw new Error('No marketingProduct documents found; nothing to price.')
}

const targetFor = (slug) =>
  Object.prototype.hasOwnProperty.call(PRICE_BY_SLUG, slug) ? PRICE_BY_SLUG[slug] : DEFAULT_PRICE

const planned = products
  .filter((product) => !onlySlug || product.slug === onlySlug)
  .map((product) => ({ product, target: targetFor(product.slug) }))
  .filter(({ product, target }) => product.price !== target)

console.log(`${products.length} products in ${dataset}; ${planned.length} need a price change.`)
for (const { product, target } of planned) {
  // A stored Stripe price object is pinned to the old amount. Checkout already
  // ignores a stripePriceId whose unit amount disagrees with the CMS price and
  // builds the line item inline instead, so a stale id cannot undercharge —
  // but say so, because it looks alarming in the data.
  const staleStripe =
    product.stripePriceId && product.stripePriceUnitAmount !== Math.round(target * 100)
  console.log(
    `  ${(product.slug || product._id).padEnd(34)} $${product.price} -> $${target}` +
      (staleStripe ? `  (stripe price id pinned at $${(product.stripePriceUnitAmount ?? 0) / 100}, ignored)` : ''),
  )
}

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write these changes.')
  process.exit(0)
}

if (planned.length === 0) {
  console.log('Nothing to write.')
  process.exit(0)
}

let transaction = client.transaction()
for (const { product, target } of planned) {
  transaction = transaction.patch(product._id, (patch) => patch.set({ price: target }))
}
await transaction.commit()

// Verify only what this run set. With --slug or --price the other documents are
// deliberately left alone, and flagging them as "wrong" would fail a run that
// did exactly what was asked.
const touched = new Set(planned.map(({ product }) => product._id))
const after = await client.fetch(
  `*[_type == "marketingProduct" && _id in $ids]{ _id, "slug": slug.current, price }`,
  { ids: [...touched] },
)
const wrong = after.filter((product) => product.price !== targetFor(product.slug))
console.log(`Wrote ${planned.length} price changes. Mismatched after write: ${wrong.length}`)
if (wrong.length > 0) {
  console.log(JSON.stringify(wrong, null, 1))
  process.exit(1)
}
