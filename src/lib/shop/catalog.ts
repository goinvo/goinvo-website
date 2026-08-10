import 'server-only'

import { createClient } from '@sanity/client'
import { apiVersion, dataset, previewToken, projectId } from '@/sanity/env'
import { shopStorefrontQuery } from '@/sanity/lib/queries'

/** How long a price edit can take to reach the site. */
export const SHOP_CATALOG_REVALIDATE_SECONDS = 60
import {
  shopPriceCentsFor,
  type CheckoutCatalogItem,
  type CheckoutRequest,
} from './checkout'

type CatalogQueryResult = {
  visualizations: Array<{
    _id: string
    title?: string
    slug?: string
    imageUrl?: string
  }>
  products: Array<{
    _id: string
    slug?: string
    price?: number
    currency?: string
    imageUrl?: string
    trackInventory?: boolean
    inventoryQuantity?: number
    allowBackorder?: boolean
    stripePriceId?: string
    stripePriceUnitAmount?: number
    stripePriceCurrency?: string
  }>
}

const checkoutCatalogQuery = `{
  "visualizations": *[
    _type == "healthVisualization"
    && slug.current in $slugs
    && !(_id in path("drafts.**"))
  ] {
    _id,
    title,
    "slug": slug.current,
    "imageUrl": image.asset->url
  },
  "products": *[
    _type == "marketingProduct"
    && status == "active"
    && slug.current in $slugs
    && !(_id in path("drafts.**"))
  ] {
    _id,
    "slug": slug.current,
    price,
    currency,
    "imageUrl": image.asset->url,
    trackInventory,
    inventoryQuantity,
    allowBackorder,
    stripePriceId,
    stripePriceUnitAmount,
    stripePriceCurrency
  }
}`

let catalogClient: ReturnType<typeof createClient> | null = null

function getCatalogClient() {
  if (!projectId) throw new Error('The storefront catalog is not configured.')
  if (!catalogClient) {
    catalogClient = createClient({
      projectId,
      dataset,
      apiVersion,
      token: previewToken || undefined,
      useCdn: false,
    })
  }
  return catalogClient
}

export type StorefrontCatalog = {
  settings: { storeName?: string; supportEmail?: string } | null
  products: Array<{
    slug?: string
    price?: number
    currency?: string
    checkoutUrl?: string
    trackInventory?: boolean
    inventoryQuantity?: number
  }>
}

/**
 * The storefront's prices, read through the SAME client and credentials that
 * resolveCheckoutCatalog uses to decide what to charge.
 *
 * This has to live here, beside the charging code, because the two must never
 * disagree. They already did: marketingProduct is not readable anonymously, so
 * the page's public query returned no products and fell back to the code
 * price, while checkout read the documents with a token and resolved a
 * different number. A visitor was shown one price and would have been charged
 * another.
 *
 * Cached briefly rather than per-request so an editor's price change appears on
 * the site within a minute, with no deploy.
 */
export async function fetchStorefrontCatalog(): Promise<StorefrontCatalog> {
  if (!projectId) return { settings: null, products: [] }

  try {
    return await getCatalogClient().fetch<StorefrontCatalog>(
      shopStorefrontQuery,
      {},
      { next: { revalidate: SHOP_CATALOG_REVALIDATE_SECONDS, tags: ['marketingProduct'] } },
    )
  } catch {
    // A read failure must not take the page down; the cards fall back to the
    // code price, which is the same number the checkout falls back to.
    return { settings: null, products: [] }
  }
}

export async function resolveCheckoutCatalog(
  request: CheckoutRequest,
): Promise<Array<CheckoutCatalogItem & { quantity: number }>> {
  if (request.items.length === 0) return []

  const slugs = request.items.map((item) => item.slug)
  const result = await getCatalogClient().fetch<CatalogQueryResult>(checkoutCatalogQuery, { slugs })
  const visualizationBySlug = new Map(
    result.visualizations
      .filter((item) => item.slug)
      .map((item) => [item.slug!, item]),
  )
  const productBySlug = new Map(
    result.products.filter((item) => item.slug).map((item) => [item.slug!, item]),
  )

  // A cart referencing a missing/mispriced product is a BAD REQUEST, not a
  // server fault: surfacing it as 5xx buries real outages in monitoring noise.
  const badRequest = (message: string) => Object.assign(new Error(message), { status: 400 })

  return request.items.map((requestedItem) => {
    const visualization = visualizationBySlug.get(requestedItem.slug)
    if (!visualization?.title) {
      throw badRequest(`The print "${requestedItem.slug}" is no longer available.`)
    }

    const product = productBySlug.get(requestedItem.slug)
    if (
      product?.trackInventory &&
      !product.allowBackorder &&
      requestedItem.quantity > (product.inventoryQuantity || 0)
    ) {
      throw badRequest(`${visualization.title} is currently unavailable as a physical print.`)
    }

    const currency = (product?.currency || 'USD').toUpperCase()
    if (currency !== 'USD') {
      throw new Error('This checkout currently supports USD pricing only.')
    }

    const configuredPrice =
      typeof product?.price === 'number'
        ? Math.round(product.price * 100)
        : shopPriceCentsFor(requestedItem.slug)
    if (!Number.isSafeInteger(configuredPrice) || configuredPrice < 50) {
      throw new Error(`${visualization.title} has an invalid checkout price.`)
    }

    return {
      visualizationId: visualization._id,
      marketingProductId: product?._id,
      stripePriceId:
        product?.stripePriceId &&
        product.stripePriceUnitAmount === configuredPrice &&
        product.stripePriceCurrency?.toUpperCase() === currency
          ? product.stripePriceId
          : undefined,
      slug: requestedItem.slug,
      title: visualization.title,
      currency,
      unitAmount: configuredPrice,
      imageUrl: product?.imageUrl || visualization.imageUrl,
      quantity: requestedItem.quantity,
    }
  })
}
