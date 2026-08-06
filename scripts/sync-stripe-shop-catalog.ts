import { resolve } from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnvironment } from 'dotenv'
import Stripe from 'stripe'
import {
  STRIPE_CATALOG_SOURCE,
  isCurrentStripePrice,
  marketingProductIdForVisualization,
  skuForVisualization,
  stripeCatalogIdempotencyKey,
  stripePriceLookupKey,
  stripePriceParams,
  stripeProductNeedsUpdate,
  stripeProductParams,
  type StripeCatalogProduct,
} from '../src/lib/shop/stripeCatalog'
import { stripeKeyMode } from '../src/lib/shop/checkout'

loadEnvironment({ path: resolve(process.cwd(), '.env.local'), quiet: true })

type HealthVisualization = {
  _id: string
  title?: string
  slug?: string
  caption?: string
  order?: number
  image?: Record<string, unknown>
  imageUrl?: string
}

type MarketingProduct = {
  _id: string
  title?: string
  slug?: string
  sourceVisualizationId?: string
  description?: string
  status?: string
  kind?: string
  sku?: string
  price?: number
  currency?: string
  imageUrl?: string
  stripeProductId?: string
  stripePriceId?: string
}

type CatalogData = {
  visualizations: HealthVisualization[]
  products: MarketingProduct[]
}

type SyncCounts = {
  cmsProductsCreated: number
  cmsProductsLinked: number
  stripeProductsCreated: number
  stripeProductsUpdated: number
  stripePricesCreated: number
  stripePricesReused: number
  stripePricesArchived: number
  cmsProductsPatched: number
}

const catalogQuery = `{
  "visualizations": *[
    _type == "healthVisualization"
    && !(_id in path("drafts.**"))
    && defined(slug.current)
    && defined(title)
  ] | order(coalesce(order, 100) asc, title asc) {
    _id,
    title,
    "slug": slug.current,
    caption,
    order,
    image,
    "imageUrl": image.asset->url
  },
  "products": *[
    _type == "marketingProduct"
    && !(_id in path("drafts.**"))
  ] {
    _id,
    title,
    "slug": slug.current,
    "sourceVisualizationId": sourceVisualization->_id,
    description,
    status,
    kind,
    sku,
    price,
    currency,
    "imageUrl": image.asset->url,
    stripeProductId,
    stripePriceId
  }
}`

async function main() {
  const write = process.argv.includes('--write')
  const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || ''
  const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  const sanityToken = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN || ''
  const stripeSecret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SEC_KEY || ''

  if (!sanityProjectId || !sanityToken) {
    throw new Error('Sanity project and write token are required.')
  }
  // Restricted keys (rk_) are valid credentials too — matching only sk_ would
  // let a restricted LIVE key bypass the live-write guard below.
  const keyMode = stripeKeyMode(stripeSecret)
  if (keyMode === 'invalid' || keyMode === 'unconfigured') {
    throw new Error('A valid Stripe secret or restricted key is required.')
  }
  if (
    keyMode === 'live' &&
    (!write ||
      !process.argv.includes('--live') ||
      process.env.STRIPE_LIVE_MODE_ENABLED !== 'true')
  ) {
    throw new Error(
      'Live catalog writes require --write --live and STRIPE_LIVE_MODE_ENABLED=true.',
    )
  }
  // The mirror image, and the one that would actually break the storefront:
  // writing SANDBOX price IDs over the live catalog repoints production at
  // products that exist only in test mode. There is no flag for this because
  // it is never right — sandbox checkout works without stored IDs via the
  // inline-price fallback in the checkout route.
  if (write && keyMode === 'test' && sanityDataset === 'production') {
    throw new Error(
      'Refusing to write test-mode Stripe IDs into the production catalog. Sandbox checkout does not need them.',
    )
  }

  const cms = createClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
    token: sanityToken,
    useCdn: false,
  })
  const stripe = new Stripe(stripeSecret, {
    appInfo: {
      name: 'GoInvo Website Shop Catalog Sync',
      version: '1.0.0',
      url: 'https://www.goinvo.com/vision/health-visualizations',
    },
  })
  const counts: SyncCounts = {
    cmsProductsCreated: 0,
    cmsProductsLinked: 0,
    stripeProductsCreated: 0,
    stripeProductsUpdated: 0,
    stripePricesCreated: 0,
    stripePricesReused: 0,
    stripePricesArchived: 0,
    cmsProductsPatched: 0,
  }

  const data = await cms.fetch<CatalogData>(catalogQuery)
  assertUniqueProductSlugs(data.products)
  const productsBySlug = new Map(
    data.products.filter((product) => product.slug).map((product) => [product.slug!, product]),
  )
  const catalogProducts: Array<
    StripeCatalogProduct & Pick<MarketingProduct, 'stripeProductId' | 'stripePriceId'>
  > = []

  for (const visualization of data.visualizations) {
    const slug = visualization.slug!
    const existing = productsBySlug.get(slug)
    const productId =
      existing?._id || marketingProductIdForVisualization(visualization._id)
    const productDocument = {
      _id: productId,
      _type: 'marketingProduct',
      title: visualization.title!,
      slug: { _type: 'slug', current: slug },
      sourceVisualization: { _type: 'reference', _ref: visualization._id },
      status: 'active',
      kind: 'physical',
      description: visualization.caption,
      image: visualization.image,
      featured: false,
      displayOrder: visualization.order ?? 100,
      sku: skuForVisualization(slug),
      trackInventory: false,
      inventoryQuantity: 0,
      lowStockThreshold: 5,
      allowBackorder: true,
      price: 6,
      currency: 'USD',
      notes: 'Created from Health Visualizations by the Stripe catalog sync.',
    }

    if (!existing) {
      counts.cmsProductsCreated += 1
      if (write) await cms.createIfNotExists(productDocument)
    } else if (!existing.sourceVisualizationId) {
      counts.cmsProductsLinked += 1
      if (write) {
        await cms
          .patch(existing._id)
          .setIfMissing({
            sourceVisualization: { _type: 'reference', _ref: visualization._id },
          })
          .commit()
      }
    } else if (existing.sourceVisualizationId !== visualization._id) {
      throw new Error(
        `${existing._id} is linked to a different visualization than its slug "${slug}".`,
      )
    }

    const merged = existing || productDocument
    const price =
      typeof merged.price === 'number' ? merged.price : productDocument.price
    const currency = (merged.currency || productDocument.currency).toUpperCase()
    if (!Number.isFinite(price) || price < 0.5) {
      throw new Error(`${productId} has an invalid Stripe price.`)
    }
    if (currency !== 'USD') {
      throw new Error(`${productId} uses ${currency}; the storefront currently supports USD.`)
    }

    catalogProducts.push({
      _id: productId,
      title: merged.title || productDocument.title,
      slug,
      description: merged.description || productDocument.description,
      status: merged.status || productDocument.status,
      kind: merged.kind || productDocument.kind,
      sku: merged.sku || productDocument.sku,
      price,
      currency,
      imageUrl: merged.imageUrl || visualization.imageUrl,
      visualizationId: visualization._id,
      stripeProductId: existing?.stripeProductId,
      stripePriceId: existing?.stripePriceId,
    })
  }

  const stripeProducts = await listStripeProducts(stripe)
  const stripeProductsById = new Map(stripeProducts.map((product) => [product.id, product]))
  const stripeProductsByCmsId = new Map(
    stripeProducts
      .filter(
        (product) =>
          product.metadata.catalog_source === STRIPE_CATALOG_SOURCE &&
          product.metadata.marketing_product_id,
      )
      .map((product) => [product.metadata.marketing_product_id, product]),
  )

  for (const product of catalogProducts) {
    let stripeProduct =
      (product.stripeProductId
        ? stripeProductsById.get(product.stripeProductId)
        : undefined) || stripeProductsByCmsId.get(product._id)

    if (!stripeProduct) {
      counts.stripeProductsCreated += 1
      if (!write) {
        counts.stripePricesCreated += 1
        console.log(`CREATE Stripe product and price: ${product.title}`)
        continue
      }
      stripeProduct = await stripe.products.create(stripeProductParams(product), {
        idempotencyKey: stripeCatalogIdempotencyKey('product', product._id),
      })
    } else if (stripeProductNeedsUpdate(stripeProduct, product)) {
      counts.stripeProductsUpdated += 1
      if (write) {
        stripeProduct = await stripe.products.update(
          stripeProduct.id,
          stripeProductParams(product),
        )
      }
    }

    const activePrices = await listStripePrices(stripe, stripeProduct.id)
    let currentPrice =
      (product.stripePriceId
        ? activePrices.find((price) => price.id === product.stripePriceId)
        : undefined) ||
      activePrices.find(
        (price) =>
          price.lookup_key === stripePriceLookupKey(product._id, product.currency) &&
          isCurrentStripePrice(price, product, stripeProduct.id),
      ) ||
      activePrices.find(
        (price) =>
          price.metadata.catalog_source === STRIPE_CATALOG_SOURCE &&
          price.metadata.marketing_product_id === product._id &&
          isCurrentStripePrice(price, product, stripeProduct.id),
      )

    if (!currentPrice || !isCurrentStripePrice(currentPrice, product, stripeProduct.id)) {
      counts.stripePricesCreated += 1
      if (!write) {
        console.log(`CREATE Stripe price: ${product.title} at ${formatMoney(product.price)}`)
        continue
      }
      currentPrice = await stripe.prices.create(
        stripePriceParams(product, stripeProduct.id),
        {
          idempotencyKey: stripeCatalogIdempotencyKey(
            'price',
            `${product._id}:${product.currency}:${Math.round(product.price * 100)}`,
          ),
        },
      )
    } else {
      counts.stripePricesReused += 1
      if (
        write &&
        (currentPrice.lookup_key !==
          stripePriceLookupKey(product._id, product.currency) ||
          currentPrice.metadata.catalog_source !== STRIPE_CATALOG_SOURCE)
      ) {
        currentPrice = await stripe.prices.update(currentPrice.id, {
          lookup_key: stripePriceLookupKey(product._id, product.currency),
          transfer_lookup_key: true,
          metadata: stripePriceParams(product, stripeProduct.id).metadata,
        })
      }
    }

    if (write) {
      const defaultPriceId =
        typeof stripeProduct.default_price === 'string'
          ? stripeProduct.default_price
          : stripeProduct.default_price?.id
      if (defaultPriceId !== currentPrice.id) {
        await stripe.products.update(stripeProduct.id, {
          default_price: currentPrice.id,
        })
      }

      for (const price of activePrices) {
        if (
          price.id !== currentPrice.id &&
          price.metadata.catalog_source === STRIPE_CATALOG_SOURCE &&
          price.metadata.marketing_product_id === product._id
        ) {
          await stripe.prices.update(price.id, { active: false })
          counts.stripePricesArchived += 1
        }
      }

      await cms
        .patch(product._id)
        .set({
          stripeProductId: stripeProduct.id,
          stripePriceId: currentPrice.id,
          stripePriceUnitAmount: currentPrice.unit_amount,
          stripePriceCurrency: currentPrice.currency.toUpperCase(),
          stripeSyncedAt: new Date().toISOString(),
        })
        .commit()
      counts.cmsProductsPatched += 1
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        stripeMode: stripeSecret.startsWith('sk_live_') ? 'live' : 'test',
        visualizationsChecked: data.visualizations.length,
        catalogProducts: catalogProducts.length,
        ...counts,
      },
      null,
      2,
    ),
  )
  if (!write) {
    console.log('Dry run only. Re-run with --write to apply these changes.')
  }
}

function assertUniqueProductSlugs(products: MarketingProduct[]) {
  const seen = new Map<string, string>()
  for (const product of products) {
    if (!product.slug) continue
    const existingId = seen.get(product.slug)
    if (existingId) {
      throw new Error(
        `Duplicate marketingProduct slug "${product.slug}" on ${existingId} and ${product._id}.`,
      )
    }
    seen.set(product.slug, product._id)
  }
}

async function listStripeProducts(stripe: Stripe) {
  const products: Stripe.Product[] = []
  for await (const product of stripe.products.list({ limit: 100 })) {
    products.push(product)
  }
  return products
}

async function listStripePrices(stripe: Stripe, productId: string) {
  const prices: Stripe.Price[] = []
  for await (const price of stripe.prices.list({
    product: productId,
    active: true,
    type: 'one_time',
    limit: 100,
  })) {
    prices.push(price)
  }
  return prices
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
