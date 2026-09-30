import { beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluate, parse } from 'groq-js' // ships with Sanity; evaluates the real queries in memory

// Rule: a visitor is charged exactly the price the storefront shows them.
// It broke once already: the page read prices anonymously, got nothing, and showed the code price
// while checkout read the CMS with a token and charged another number. Both paths below run their
// REAL GROQ query against the same documents; the display side then uses the page's own function.

let dataset: Array<Record<string, unknown>> = []

vi.mock('@sanity/client', () => ({
  createClient: () => ({
    fetch: async (query: string, params: Record<string, unknown> = {}) =>
      (await evaluate(parse(query), { dataset, params })).get(),
  }),
}))
vi.mock('@/sanity/env', () => ({ apiVersion: '2024-01-01', dataset: 'production', previewToken: 't', projectId: 'p' }))

const { fetchStorefrontCatalog, resolveCheckoutCatalog } = await import('../src/lib/shop/catalog')
const { buildStripeLineItems, productPriceCents, SHOP_PRINT_PRICE_CENTS } = await import('../src/lib/shop/checkout')

const viz = (slug: string) => ({ _id: `viz-${slug}`, _type: 'healthVisualization', title: slug, slug: { current: slug } })
const product = (slug: string, extra: Record<string, unknown>) => ({
  _id: `marketingProduct.${slug}`,
  _type: 'marketingProduct',
  status: 'active',
  currency: 'USD',
  slug: { current: slug },
  ...extra,
})

const SLUGS = ['poster', 'unpriced', 'own-your-health-data', 'stale-stripe', 'stored-stripe', 'cents']

beforeEach(() => {
  dataset = [
    ...SLUGS.map(viz),
    product('poster', { price: 50 }),
    product('unpriced', {}), // no price on the document: both sides must fall back to the same code price
    product('own-your-health-data', { price: 9 }),
    // The real catalog today: a Stripe Price cached at the $6 launch price. It must never be charged.
    product('stale-stripe', { price: 50, stripePriceId: 'price_stale', stripePriceUnitAmount: 600, stripePriceCurrency: 'usd' }),
    product('stored-stripe', { price: 50, stripePriceId: 'price_ok', stripePriceUnitAmount: 5000, stripePriceCurrency: 'usd' }),
    product('cents', { price: 49.99 }),
  ]
})

/** What the page shows, in cents, through the page's own function (health-visualizations/page.tsx). */
async function displayedCents() {
  const catalog = await fetchStorefrontCatalog()
  const bySlug = new Map(catalog.products.map((p) => [p.slug, p]))
  return new Map(SLUGS.map((slug) => [slug, productPriceCents(slug, bySlug.get(slug)?.price)]))
}

/** What Stripe is asked to charge, in cents, per piece. A reused stored Price charges its cached amount. */
async function chargedCents() {
  const items = await resolveCheckoutCatalog({ items: SLUGS.map((slug) => ({ slug, quantity: 1 })) } as never)
  const lines = buildStripeLineItems(items, 0)
  const stored = new Map(
    dataset.filter((d) => d.stripePriceId).map((d) => [d.stripePriceId as string, d.stripePriceUnitAmount as number]),
  )
  return new Map(
    items.map((item, i) => {
      const line = lines[i]
      const amount = line.price_data ? line.price_data.unit_amount : stored.get(line.price as string)
      return [item.slug, amount]
    }),
  )
}

describe('displayed price equals the Stripe charge', () => {
  it('for every kind of product record', async () => {
    const shown = await displayedCents()
    const charged = await chargedCents()
    for (const slug of SLUGS) expect({ slug, charged: charged.get(slug) }).toEqual({ slug, charged: shown.get(slug) })
  })

  it('pins the numbers, so a matching mistake on both sides still fails', async () => {
    const shown = await displayedCents()
    expect(Object.fromEntries(shown)).toEqual({
      poster: 5000,
      unpriced: SHOP_PRINT_PRICE_CENTS,
      'own-your-health-data': 900,
      'stale-stripe': 5000,
      'stored-stripe': 5000,
      cents: 4999,
    })
  })

  it('never charges a stored Stripe Price whose cached amount differs from the shown price', async () => {
    const items = await resolveCheckoutCatalog({ items: [{ slug: 'stale-stripe', quantity: 1 }] } as never)
    const [line] = buildStripeLineItems(items, 0)
    expect(line.price).toBeUndefined()
    expect(line.price_data?.unit_amount).toBe(5000)
  })

  it('reuses a stored Stripe Price only when it matches', async () => {
    const items = await resolveCheckoutCatalog({ items: [{ slug: 'stored-stripe', quantity: 1 }] } as never)
    expect(buildStripeLineItems(items, 0)[0].price).toBe('price_ok')
  })
})
