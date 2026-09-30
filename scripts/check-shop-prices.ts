/**
 * Live check: does goinvo.com show each print at the price Stripe will charge?
 *
 *   npx tsx scripts/check-shop-prices.ts [--base https://www.goinvo.com]
 *
 * For every active marketingProduct it compares three numbers and exits non-zero on any mismatch:
 *   1. the price the live storefront page shows (read from the page's own data payload),
 *   2. the price checkout charges (the CMS price through productPriceCents, the function both use),
 *   3. when checkout would reuse a stored Stripe Price, that Price's real amount at Stripe (read-only).
 * The unit-level guard is tests/shop-price-parity.test.ts; this one catches what only real data can:
 * a stale page, a Stripe Price edited at Stripe, a product the page does not render.
 * Needs SANITY_API_READ_TOKEN (the dataset is private) and, for check 3, STRIPE_SECRET_KEY. Prints
 * slugs and amounts only.
 */
import fs from 'node:fs'
import { productPriceCents } from '../src/lib/shop/checkout'

async function main() {
  for (const line of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
  const arg = (name: string) => {
    const i = process.argv.indexOf(name)
    return i > -1 ? process.argv[i + 1] : undefined
  }
  const base = (arg('--base') || 'https://www.goinvo.com').replace(/\/$/, '')
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  const token = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN
  const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SEC_KEY
  if (!projectId || !token)
    throw new Error('Needs NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_READ_TOKEN: the dataset is private.')

  type Product = {
    slug: string
    price?: number
    stripePriceId?: string
    stripePriceUnitAmount?: number
    stripePriceCurrency?: string
  }
  const query = `*[_type == "marketingProduct" && status == "active" && !(_id in path("drafts.**"))]{
  "slug": slug.current, price, stripePriceId, stripePriceUnitAmount, stripePriceCurrency }`
  const cms = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?perspective=published&query=${encodeURIComponent(query)}`,
    { headers: { authorization: `Bearer ${token}` } },
  )
  if (!cms.ok) throw new Error(`CMS read failed: ${cms.status}`)
  const products = ((await cms.json()).result as Product[]).filter((p) => p.slug)
  if (!products.length) throw new Error('The CMS returned no active products; refusing to report a pass on nothing.')

  const pageUrl = `${base}/vision/health-visualizations`
  const html = (await (await fetch(pageUrl, { headers: { 'cache-control': 'no-cache' } })).text()).replace(/\\"/g, '"')
  const shown = new Map<string, number>()
  for (const m of html.matchAll(/"slug":"([a-z0-9-]+)","title":/g)) {
    const rest = html.slice(m.index! + m[0].length, m.index! + m[0].length + 3000)
    const end = rest.indexOf('"slug":"')
    const price = (end > -1 ? rest.slice(0, end) : rest).match(/"price":([0-9.]+)/)
    if (price && !shown.has(m[1])) shown.set(m[1], Math.round(Number(price[1]) * 100))
  }
  if (!shown.size) throw new Error(`Found no prices on ${pageUrl}; the page markup changed, so this check is blind.`)

  async function stripeAmount(id: string): Promise<number | string> {
    if (!stripeKey) return 'no Stripe key'
    const res = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(id)}`, {
      headers: { authorization: `Bearer ${stripeKey}` },
    })
    if (!res.ok) return `Stripe ${res.status}`
    return (await res.json()).unit_amount as number
  }

  const problems: string[] = []
  const rows: string[] = []
  for (const p of products) {
    const charged = productPriceCents(p.slug, p.price)
    const displayed = shown.get(p.slug)
    const reused =
      p.stripePriceId && p.stripePriceUnitAmount === charged && (p.stripePriceCurrency || '').toUpperCase() === 'USD'
    // Every stored Price is read (read-only), so this path is exercised even while none is reused.
    const atStripe = p.stripePriceId ? await stripeAmount(p.stripePriceId) : 'none stored'
    if (reused && atStripe !== charged) {
      problems.push(`${p.slug}: checkout reuses ${p.stripePriceId}, which Stripe prices at ${atStripe}, not ${charged}`)
    }
    const stripeNote = p.stripePriceId ? `${atStripe}${reused ? ' (charged)' : ' (not used; inline)'}` : atStripe
    if (displayed === undefined) problems.push(`${p.slug}: active product not shown on ${pageUrl}`)
    else if (displayed !== charged) problems.push(`${p.slug}: page shows ${displayed}, checkout charges ${charged}`)
    rows.push(
      `${p.slug.padEnd(44)} shown ${String(displayed ?? '-').padStart(5)}  charged ${String(charged).padStart(5)}  stripe ${stripeNote}`,
    )
  }
  console.log(rows.join('\n'))
  console.log(`\n${products.length} products, ${shown.size} priced cards on the page, ${problems.length} problem(s)`)
  if (problems.length) {
    console.error(problems.join('\n'))
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
