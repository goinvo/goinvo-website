import { createHash } from 'node:crypto'
import type Stripe from 'stripe'

export const STRIPE_CATALOG_SOURCE = 'goinvo-sanity-catalog'

export type StripeCatalogProduct = {
  _id: string
  title: string
  slug: string
  description?: string
  status: string
  kind: string
  sku: string
  price: number
  currency: string
  imageUrl?: string
  visualizationId: string
}

export function marketingProductIdForVisualization(visualizationId: string) {
  const digest = createHash('sha256').update(visualizationId).digest('hex').slice(0, 24)
  return `marketingProduct.healthVisualization-${digest}`
}

export function skuForVisualization(slug: string) {
  const normalized = slug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (`PRINT-${normalized}`.length <= 80) return `PRINT-${normalized}`

  const digest = createHash('sha256').update(slug).digest('hex').slice(0, 8).toUpperCase()
  return `PRINT-${normalized.slice(0, 65).replace(/-+$/g, '')}-${digest}`
}

export function stripePriceLookupKey(productId: string, currency: string) {
  const digest = createHash('sha256').update(productId).digest('hex').slice(0, 24)
  return `goinvo_shop_${digest}_${currency.toLowerCase()}`
}

export function stripeCatalogIdempotencyKey(
  kind: 'product' | 'price',
  identity: string,
) {
  const digest = createHash('sha256').update(identity).digest('hex')
  return `goinvo-shop-catalog-${kind}-${digest}`
}

export function stripeProductParams(
  product: StripeCatalogProduct,
): Stripe.ProductCreateParams {
  return {
    name: product.title.slice(0, 120),
    description: product.description?.slice(0, 500) || undefined,
    active: product.status === 'active',
    shippable: product.kind === 'physical',
    images: product.imageUrl?.startsWith('https://') ? [product.imageUrl] : [],
    metadata: stripeProductMetadata(product),
  }
}

export function stripeProductMetadata(product: StripeCatalogProduct) {
  return {
    catalog_source: STRIPE_CATALOG_SOURCE,
    kind: 'poster',
    marketing_product_id: product._id,
    visualization_id: product.visualizationId,
    visualization_slug: product.slug,
    sku: product.sku,
  }
}

export function stripePriceParams(
  product: StripeCatalogProduct,
  stripeProductId: string,
): Stripe.PriceCreateParams {
  return {
    product: stripeProductId,
    currency: product.currency.toLowerCase(),
    unit_amount: Math.round(product.price * 100),
    nickname: `${product.title} print`,
    lookup_key: stripePriceLookupKey(product._id, product.currency),
    transfer_lookup_key: true,
    metadata: {
      catalog_source: STRIPE_CATALOG_SOURCE,
      marketing_product_id: product._id,
      visualization_id: product.visualizationId,
      visualization_slug: product.slug,
    },
  }
}

export function isCurrentStripePrice(
  price: Stripe.Price,
  product: StripeCatalogProduct,
  stripeProductId: string,
) {
  const priceProductId =
    typeof price.product === 'string' ? price.product : price.product.id
  return (
    price.active &&
    price.type === 'one_time' &&
    priceProductId === stripeProductId &&
    price.currency.toLowerCase() === product.currency.toLowerCase() &&
    price.unit_amount === Math.round(product.price * 100)
  )
}

export function stripeProductNeedsUpdate(
  stripeProduct: Stripe.Product,
  product: StripeCatalogProduct,
) {
  const desired = stripeProductParams(product)
  return (
    stripeProduct.name !== desired.name ||
    (stripeProduct.description || undefined) !== desired.description ||
    stripeProduct.active !== desired.active ||
    stripeProduct.shippable !== desired.shippable ||
    JSON.stringify(stripeProduct.images) !== JSON.stringify(desired.images) ||
    Object.entries(stripeProductMetadata(product)).some(
      ([key, value]) => stripeProduct.metadata[key] !== value,
    )
  )
}
