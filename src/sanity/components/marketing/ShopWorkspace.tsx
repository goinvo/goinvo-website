import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AddIcon,
  BasketIcon,
  CreditCardIcon,
  LaunchIcon,
  PackageIcon,
  RefreshIcon,
  TrolleyIcon,
  UsersIcon,
} from '@sanity/icons'
import { useToast } from '@sanity/ui'

import { buildCreatePayload } from '@/lib/marketing'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import { randomKey, slugify } from '@/lib/marketing'
import { MARKETING_SHOP_SETTINGS_ID, paymentProviderOptions } from '../../schemas/marketingShopSettings'
import {
  advancedEditHref,
  styles,
  useMarketingCompactLayout,
  type StudioClient,
} from '../../tools/marketingTool'

type ShopTab = 'storefront' | 'inventory' | 'orders' | 'settings'

type ShopProduct = {
  _id: string
  _rev?: string
  title?: string
  slug?: { current?: string }
  status?: string
  kind?: string
  description?: string
  featured?: boolean
  displayOrder?: number
  sku?: string
  production?: 'print-on-demand' | 'from-stock'
  orderable?: boolean
  trackInventory?: boolean
  inventoryQuantity?: number
  lowStockThreshold?: number
  allowBackorder?: boolean
  price?: number
  /** Struck-through "was" price. Display only; checkout never charges it. */
  compareAtPrice?: number
  currency?: string
  checkoutUrl?: string
  imageUrl?: string
  imageAlt?: string
}

type ShopOrder = {
  _id: string
  orderNumber?: string
  status?: string
  placedAt?: string
  customerName?: string
  customerEmail?: string
  subtotal?: number
  shipping?: number
  donation?: number
  tax?: number
  total?: number
  currency?: string
  processor?: string
  processorPaymentId?: string
  paymentUrl?: string
  shippingAddress?: string
  settlementState?: string
  amountRefunded?: number
  amountDisputeHeld?: number
  netCollected?: number
  ledgerSyncError?: string
  livemode?: boolean
  contact?: { _id?: string; name?: string; email?: string }
  items?: Array<{
    _key?: string
    title?: string
    sku?: string
    quantity?: number
    unitPrice?: number
    product?: { _id?: string }
  }>
}

type ShopSettings = {
  _id: string
  _rev?: string
  storeName?: string
  headline?: string
  description?: string
  storefrontEnabled?: boolean
  supportEmail?: string
  shippingFlatRate?: number
  provider?: string
  connectionStatus?: string
  accountLabel?: string
  dashboardUrl?: string
  webhookStatus?: string
  syncContacts?: boolean
  contactSegment?: string
  contactSourceNote?: string
}

type ShopDispute = {
  _id: string
  disputeId?: string
  status?: string
  stage?: string
  reason?: string
  amount?: number
  currency?: string
  orderNumber?: string
  customerEmail?: string
  dueBy?: string
  canRespond?: boolean
  evidenceSubmittedAt?: string
  openedAt?: string
  noteCount?: number
  channelName?: string
}

type ShopData = {
  products: ShopProduct[]
  orders: ShopOrder[]
  disputes: ShopDispute[]
  settings: ShopSettings | null
  contactCount: number
  customerCount: number
}

type ProductDraft = {
  title: string
  sku: string
  status: string
  kind: string
  description: string
  price: string
  compareAtPrice: string
  currency: string
  inventoryQuantity: string
  lowStockThreshold: string
  production: 'print-on-demand' | 'from-stock'
  orderable: boolean
  trackInventory: boolean
  allowBackorder: boolean
  featured: boolean
  checkoutUrl: string
}

type OrderDraft = {
  productId: string
  quantity: string
  customerName: string
  customerEmail: string
  status: string
  shipping: string
  donation: string
  tax: string
  processorPaymentId: string
}

// Catalog + settings are public data. Orders and contacts carry buyer PII and
// live in the PRIVATE outreach dataset, so they are fetched separately with a
// client pointed at that dataset and merged for display.
const SHOP_PUBLIC_QUERY = `{
  "products": *[_type == "marketingProduct" && !(_id in path("drafts.**"))]
    | order(coalesce(featured, false) desc, coalesce(displayOrder, 100) asc, title asc) {
      _id, _rev, title, slug, status, kind, description, featured, displayOrder,
      sku, production, orderable, trackInventory, inventoryQuantity, lowStockThreshold, allowBackorder,
      price, compareAtPrice, currency, checkoutUrl,
      "imageUrl": image.asset->url,
      "imageAlt": image.alt
    },
  "settings": *[_id == "${MARKETING_SHOP_SETTINGS_ID}"][0] {
    _id, _rev, storeName, headline, description, storefrontEnabled, supportEmail, shippingFlatRate,
    provider, connectionStatus, accountLabel, dashboardUrl, webhookStatus,
    syncContacts, contactSegment, contactSourceNote
  }
}`

const SHOP_PRIVATE_QUERY = `{
  "orders": *[_type == "marketingOrder" && !(_id in path("drafts.**"))]
    | order(placedAt desc)[0...100] {
      _id, orderNumber, status, placedAt, customerName, customerEmail, shippingAddress,
      subtotal, shipping, donation, tax, total, currency, processor, processorPaymentId, paymentUrl,
      settlementState, amountRefunded, amountDisputeHeld, netCollected, ledgerSyncError, livemode,
      "contact": contact->{_id, name, email},
      "items": items[]{
        _key, title, sku, quantity, unitPrice,
        "product": product->{_id}
      }
    },
  "disputes": *[_type == "marketingDispute" && !(_id in path("drafts.**"))]
    | order(coalesce(dueBy, openedAt) asc)[0...25] {
      _id, disputeId, status, stage, reason, amount, currency, orderNumber,
      customerEmail, dueBy, canRespond, evidenceSubmittedAt, openedAt,
      "noteCount": count(notes), "channelName": slack.channelName
    },
  "contactCount": count(*[_type == "marketingContact" && !(_id in path("drafts.**"))]),
  "customerCount": count(*[
    _type == "marketingContact"
    && !(_id in path("drafts.**"))
    && sourceNotes match "*Shop*"
  ])
}`

const SETTLEMENT_LABELS: Record<string, string> = {
  collected: 'Collected',
  partiallyRefunded: 'Partially refunded',
  refunded: 'Refunded',
  disputeInquiry: 'Inquiry open',
  disputeOpen: 'Chargeback open',
  disputeLost: 'Chargeback lost',
}

const DO_NOT_SHIP_STATES = ['disputeOpen', 'disputeLost', 'refunded']

function disputeDeadlineLabel(dueBy: string | undefined) {
  if (!dueBy) return 'No response allowed'
  const due = new Date(dueBy)
  if (Number.isNaN(due.getTime())) return 'Deadline unknown'

  const days = Math.ceil((due.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days < 0) return 'Deadline passed'
  if (days === 0) return 'Due today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

const emptyProductDraft: ProductDraft = {
  title: '',
  sku: '',
  status: 'draft',
  kind: 'physical',
  description: '',
  price: '',
  compareAtPrice: '',
  currency: 'USD',
  inventoryQuantity: '0',
  lowStockThreshold: '5',
  production: 'print-on-demand',
  orderable: true,
  trackInventory: true,
  allowBackorder: false,
  featured: false,
  checkoutUrl: '',
}

const emptyOrderDraft: OrderDraft = {
  productId: '',
  quantity: '1',
  customerName: '',
  customerEmail: '',
  status: 'paid',
  shipping: '0',
  donation: '0',
  tax: '0',
  processorPaymentId: '',
}

const tabItems: Array<{ id: ShopTab; label: string; icon: typeof BasketIcon }> = [
  { id: 'storefront', label: 'Storefront', icon: BasketIcon },
  { id: 'inventory', label: 'Inventory', icon: PackageIcon },
  { id: 'orders', label: 'Orders & customers', icon: TrolleyIcon },
  { id: 'settings', label: 'Payments & settings', icon: CreditCardIcon },
]

function money(value = 0, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function productDraft(product?: ShopProduct | null): ProductDraft {
  if (!product) return { ...emptyProductDraft }
  return {
    title: product.title || '',
    sku: product.sku || '',
    status: product.status || 'draft',
    kind: product.kind || 'physical',
    description: product.description || '',
    price: String(product.price ?? ''),
    compareAtPrice: String(product.compareAtPrice ?? ''),
    currency: product.currency || 'USD',
    inventoryQuantity: String(product.inventoryQuantity ?? 0),
    lowStockThreshold: String(product.lowStockThreshold ?? 5),
    production: product.production === 'from-stock' ? 'from-stock' : 'print-on-demand',
    orderable: product.orderable !== false,
    trackInventory: product.trackInventory !== false,
    allowBackorder: product.allowBackorder === true,
    featured: product.featured === true,
    checkoutUrl: product.checkoutUrl || '',
  }
}

function stockTone(product: ShopProduct) {
  if (!product.trackInventory) return { label: 'Not tracked', color: '#4dc4d6', background: 'rgba(0,115,133,.13)' }
  const quantity = product.inventoryQuantity ?? 0
  if (quantity <= 0) {
    return product.allowBackorder
      ? { label: 'Backorder', color: '#d6a93f', background: 'rgba(214,169,63,.14)' }
      : { label: 'Out of stock', color: '#ff9a85', background: 'rgba(185,64,48,.16)' }
  }
  if (quantity <= (product.lowStockThreshold ?? 5)) {
    return { label: `${quantity} left`, color: '#d6a93f', background: 'rgba(214,169,63,.14)' }
  }
  return { label: `${quantity} in stock`, color: '#7dd69e', background: 'rgba(54,139,87,.16)' }
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={styles.label}>{label}</span>
      {children}
      {hint && <span style={{ ...styles.muted, ...styles.small }}>{hint}</span>}
    </label>
  )
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <div style={{ ...styles.panel, display: 'grid', gap: 6, padding: 16 }}>
      <span style={{ ...styles.muted, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </span>
      <strong style={{ fontSize: 28, lineHeight: 1 }}>{value}</strong>
      <span style={{ ...styles.muted, ...styles.small }}>{detail}</span>
    </div>
  )
}

export function ShopWorkspace({ client }: { client: StudioClient }) {
  // Buyer PII (orders, customer contacts) lives in the private outreach
  // dataset — never the world-readable production one.
  const outreachClient = useMemo(() => client.withConfig({ dataset: OUTREACH_DATASET }), [client])
  const compact = useMarketingCompactLayout(840)
  const toast = useToast()
  const [tab, setTab] = useState<ShopTab>('storefront')
  const [data, setData] = useState<ShopData>({
    products: [],
    orders: [],
    disputes: [],
    settings: null,
    contactCount: 0,
    customerCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProductDraft>({ ...emptyProductDraft })
  const [orderDraft, setOrderDraft] = useState<OrderDraft>({ ...emptyOrderDraft })
  const [settingsDraft, setSettingsDraft] = useState<ShopSettings | null>(null)
  // Bulk edit: repricing 30 posters one card at a time is the job this tab
  // exists to avoid.
  const [bulkIds, setBulkIds] = useState<string[]>([])
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkSale, setBulkSale] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [next, priv] = await Promise.all([
        client.fetch<ShopData>(SHOP_PUBLIC_QUERY),
        outreachClient.fetch<ShopData>(SHOP_PRIVATE_QUERY),
      ])
      setData({
        products: next?.products || [],
        orders: priv?.orders || [],
        disputes: priv?.disputes || [],
        settings: next?.settings || null,
        contactCount: priv?.contactCount || 0,
        customerCount: priv?.customerCount || 0,
      })
      setSettingsDraft(
        next?.settings || {
          _id: MARKETING_SHOP_SETTINGS_ID,
          storeName: 'GoInvo Shop',
          headline: 'Tools and artifacts for healthier systems.',
          description: 'Practical objects, guides, and design resources created by GoInvo.',
          storefrontEnabled: false,
          supportEmail: 'hello@goinvo.com',
          provider: 'none',
          connectionStatus: 'notConnected',
          webhookStatus: 'notConfigured',
          syncContacts: true,
          contactSegment: 'other',
          contactSourceNote: 'GoInvo Shop customer',
        },
      )
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not load the shop',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }, [client, toast])

  useEffect(() => {
    void load()
  }, [load])

  const selectedProduct = data.products.find((product) => product._id === selectedProductId) || null
  const activeProducts = data.products.filter((product) => product.status === 'active')
  const lowStockProducts = data.products.filter((product) => {
    if (!product.trackInventory || product.status === 'archived') return false
    return (product.inventoryQuantity ?? 0) <= (product.lowStockThreshold ?? 5)
  })
  // Prefer the settled figure over the order total: a refunded or charged-back
  // order still has its original total, so summing totals reports money we no
  // longer hold as revenue. `netCollected` is absent only on orders recorded
  // before settlement tracking existed, which fall back to the total.
  // Sandbox orders live in the same dataset as real ones, so they are excluded
  // here by explicit flag. `livemode === false` is only ever set by Stripe test
  // mode; orders predating the flag are undefined and still count.
  const realOrders = data.orders.filter((order) => order.livemode !== false)
  const paidRevenue = realOrders
    .filter((order) => !['canceled', 'refunded', 'pending'].includes(order.status || ''))
    .reduce(
      (sum, order) => sum + (typeof order.netCollected === 'number' ? order.netCollected : order.total || 0),
      0,
    )
  const amountAtRisk = realOrders.reduce((sum, order) => sum + (order.amountDisputeHeld || 0), 0)
  const sandboxOrderCount = data.orders.length - realOrders.length

  const orderProduct = data.products.find((product) => product._id === orderDraft.productId)
  const orderSubtotal = (orderProduct?.price || 0) * Math.max(1, numberValue(orderDraft.quantity, 1))
  const orderTotal =
    orderSubtotal +
    numberValue(orderDraft.shipping) +
    numberValue(orderDraft.donation) +
    numberValue(orderDraft.tax)

  const settings = settingsDraft
  const providerLabel =
    paymentProviderOptions.find((option) => option.value === settings?.provider)?.title || 'Not connected'

  const beginProduct = (product?: ShopProduct) => {
    setSelectedProductId(product?._id || 'new')
    setDraft(productDraft(product))
  }

  /**
   * Apply one field to every selected product in a single transaction.
   *
   * A transaction so a half-applied price change cannot happen: either the
   * whole selection moves or none of it does. `null` clears the field, which is
   * how a sale ends.
   */
  const applyBulk = async (field: 'price' | 'compareAtPrice', value: number | null) => {
    if (bulkIds.length === 0) return
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.push({ status: 'warning', title: 'Enter an amount of 0 or more first.' })
      return
    }
    // A was-price at or below the price is not an offer. Refuse rather than
    // publish a struck-through number that makes the shop look broken.
    if (field === 'compareAtPrice' && value !== null) {
      const conflict = data.products.filter(
        (product) => bulkIds.includes(product._id) && typeof product.price === 'number' && value <= product.price,
      )
      if (conflict.length > 0) {
        toast.push({
          status: 'warning',
          title: `Was-price must be above the price`,
          description: `${conflict.length} selected ${conflict.length === 1 ? 'piece is' : 'pieces are'} priced at or above ${money(value)}. Raise the was-price or deselect them.`,
        })
        return
      }
    }
    setSaving(true)
    try {
      let transaction = client.transaction()
      bulkIds.forEach((id) => {
        transaction = transaction.patch(
          id,
          value === null ? { unset: [field] } : { set: { [field]: value } },
        )
      })
      await transaction.commit()
      const label =
        field === 'price'
          ? `Price set to ${money(value || 0)}`
          : value === null
            ? 'Sale cleared'
            : `Was-price set to ${money(value)}`
      toast.push({ status: 'success', title: `${label} on ${bulkIds.length} ${bulkIds.length === 1 ? 'piece' : 'pieces'}` })
      await load()
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Bulk update failed',
        description: error instanceof Error ? error.message : 'Nothing was changed.',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveProduct = async () => {
    if (!draft.title.trim() || !draft.sku.trim() || draft.price === '') {
      toast.push({ status: 'warning', title: 'Add a product name, SKU, and price first.' })
      return
    }
    setSaving(true)
    try {
      const fields = {
        title: draft.title.trim(),
        sku: draft.sku.trim(),
        status: draft.status,
        kind: draft.kind,
        description: draft.description.trim() || undefined,
        featured: draft.featured,
        trackInventory: draft.trackInventory,
        inventoryQuantity: Math.max(0, Math.round(numberValue(draft.inventoryQuantity))),
        lowStockThreshold: Math.max(0, Math.round(numberValue(draft.lowStockThreshold, 5))),
        allowBackorder: draft.allowBackorder,
        production: draft.production,
        orderable: draft.orderable,
        price: Math.max(0, numberValue(draft.price)),
        // Blank clears the sale. Anything at or below the price is not an
        // offer, so it is dropped rather than rendered as a broken discount.
        compareAtPrice:
          draft.compareAtPrice.trim() === '' ||
          numberValue(draft.compareAtPrice) <= Math.max(0, numberValue(draft.price))
            ? undefined
            : Math.max(0, numberValue(draft.compareAtPrice)),
        currency: draft.currency.trim().toUpperCase() || 'USD',
        checkoutUrl: draft.checkoutUrl.trim() || undefined,
      }
      if (selectedProductId && selectedProductId !== 'new') {
        // Deliberately does NOT touch the slug. The storefront and the checkout
        // both join a product to its visualization by slug, and those slugs do
        // not all match slugify(title) — 13 of the 31 differ ("Wash Your Hands"
        // is washhands, "Ebola Care Guideline" is ebola). Re-deriving it here
        // meant that editing a price silently detached the product, so the new
        // price was quietly ignored and the page kept showing the old one.
        await client.patch(selectedProductId).set(fields).commit()
        toast.push({ status: 'success', title: 'Product updated' })
      } else {
        const created = await client.create(buildCreatePayload('marketingProduct', fields))
        setSelectedProductId(created._id)
        toast.push({ status: 'success', title: 'Product added to the catalog' })
      }
      await load()
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not save the product',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const adjustStock = async (product: ShopProduct, delta: number) => {
    const next = Math.max(0, (product.inventoryQuantity || 0) + delta)
    try {
      await client.patch(product._id).set({ inventoryQuantity: next }).commit()
      setData((current) => ({
        ...current,
        products: current.products.map((candidate) =>
          candidate._id === product._id ? { ...candidate, inventoryQuantity: next } : candidate,
        ),
      }))
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not update stock',
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  const recordOrder = async () => {
    const product = orderProduct
    const quantity = Math.max(1, Math.round(numberValue(orderDraft.quantity, 1)))
    const name = orderDraft.customerName.trim()
    const email = orderDraft.customerEmail.trim().toLowerCase()
    if (!product || !name || !email) {
      toast.push({ status: 'warning', title: 'Choose a product and add the customer name and email.' })
      return
    }
    if (
      product.trackInventory &&
      !product.allowBackorder &&
      quantity > (product.inventoryQuantity || 0)
    ) {
      toast.push({ status: 'warning', title: `Only ${product.inventoryQuantity || 0} available.` })
      return
    }

    setSaving(true)
    try {
      const existingContact = settings?.syncContacts
        ? await outreachClient.fetch<{ _id: string } | null>(
            '*[_type == "marketingContact" && lower(email) == $email][0]{_id}',
            { email },
          )
        : null
      const contactId = existingContact?._id || (settings?.syncContacts ? `marketingContact.shop-${randomKey()}` : null)
      const now = new Date()
      const orderNumber = `SHOP-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${String(now.getTime()).slice(-5)}`
      const subtotal = (product.price || 0) * quantity
      const shipping = Math.max(0, numberValue(orderDraft.shipping))
      const donation = Math.max(0, numberValue(orderDraft.donation))
      const tax = Math.max(0, numberValue(orderDraft.tax))
      const total = subtotal + shipping + donation + tax
      const orderId = `marketingOrder.${now.getTime()}-${randomKey()}`
      // Orders + contacts are PII: private dataset only.
      let transaction = outreachClient.transaction()

      if (contactId && !existingContact) {
        transaction = transaction.create(
          buildCreatePayload('marketingContact', {
            _id: contactId,
            name,
            email,
            segment: settings?.contactSegment || 'other',
            sourceNotes: settings?.contactSourceNote || 'GoInvo Shop customer',
            howWeKnow: 'Purchased or placed an order through the GoInvo Shop.',
          }),
        )
      }

      transaction = transaction.create(
        buildCreatePayload('marketingOrder', {
          _id: orderId,
          orderNumber,
          status: orderDraft.status,
          placedAt: now.toISOString(),
          items: [
            {
              // Weak: the product lives in the public dataset, the order in the
              // private one, and a strong cross-dataset reference is rejected.
              product: { _type: 'reference', _ref: product._id, _weak: true },
              title: product.title || 'Product',
              sku: product.sku,
              quantity,
              unitPrice: product.price || 0,
            },
          ],
          subtotal,
          shipping,
          donation,
          tax,
          total,
          currency: product.currency || 'USD',
          contact: contactId ? { _type: 'reference', _ref: contactId } : undefined,
          customerName: name,
          customerEmail: email,
          processor: settings?.provider && settings.provider !== 'none' ? settings.provider : undefined,
          processorPaymentId: orderDraft.processorPaymentId.trim() || undefined,
        }),
      )

      await transaction.commit()

      // Inventory lives on the product in the PUBLIC dataset, so it cannot ride
      // along in the order transaction above — a single transaction only spans
      // one dataset. The order is the record that matters, so it commits first
      // and a failed inventory decrement is surfaced without losing the sale.
      if (product.trackInventory && ['paid', 'processing', 'fulfilled'].includes(orderDraft.status)) {
        try {
          await client
            .patch(product._id)
            .set({ inventoryQuantity: Math.max(0, (product.inventoryQuantity || 0) - quantity) })
            .commit()
        } catch (error) {
          toast.push({
            status: 'warning',
            title: `${orderNumber} was recorded, but inventory was not updated`,
            description: error instanceof Error ? error.message : undefined,
          })
        }
      }
      setOrderDraft({ ...emptyOrderDraft })
      toast.push({
        status: 'success',
        title: `Recorded ${orderNumber}`,
        description: contactId ? 'The customer is linked to Marketing → Outreach.' : undefined,
      })
      await load()
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not record the order',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const document = {
        _id: MARKETING_SHOP_SETTINGS_ID,
        _type: 'marketingShopSettings',
        storeName: settings.storeName || 'GoInvo Shop',
        headline: settings.headline || '',
        description: settings.description || '',
        storefrontEnabled: settings.storefrontEnabled === true,
        supportEmail: settings.supportEmail || '',
        shippingFlatRate:
          typeof settings.shippingFlatRate === 'number' && settings.shippingFlatRate >= 0
            ? settings.shippingFlatRate
            : undefined,
        provider: settings.provider || 'none',
        connectionStatus: settings.connectionStatus || 'notConnected',
        accountLabel: settings.accountLabel || '',
        dashboardUrl: settings.dashboardUrl || '',
        webhookStatus: settings.webhookStatus || 'notConfigured',
        syncContacts: settings.syncContacts !== false,
        contactSegment: settings.contactSegment || 'other',
        contactSourceNote: settings.contactSourceNote || 'GoInvo Shop customer',
      }
      await client.createOrReplace(document)
      toast.push({ status: 'success', title: 'Shop settings saved' })
      await load()
    } catch (error) {
      toast.push({
        status: 'error',
        title: 'Could not save shop settings',
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={styles.panel}>Loading shop…</div>

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section
        style={{
          ...styles.card,
          overflow: 'hidden',
          color: '#f7f9fc',
          background: 'linear-gradient(120deg, #11141f 0%, #172c34 58%, #007385 140%)',
          borderColor: 'rgba(77,196,214,.28)',
        }}
      >
        <div
          data-mobile-stack="true"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 20,
            alignItems: 'center',
            padding: compact ? 18 : 26,
          }}
        >
          <div>
            <div style={{ color: '#79d9e5', fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Commerce workspace
            </div>
            <h2 style={{ margin: '8px 0 8px', fontSize: compact ? 27 : 34, lineHeight: 1.08 }}>
              {settings?.storeName || 'GoInvo Shop'}
            </h2>
            <p style={{ margin: 0, maxWidth: 700, color: '#c5ccda', lineHeight: 1.55 }}>
              Run the catalog, stock, customers, orders, and processor handoff from one place.
            </p>
          </div>
          <a
            href="/vision/health-visualizations"
            target="_blank"
            rel="noreferrer"
            style={{ ...styles.primaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            View storefront
            <LaunchIcon style={{ width: 16, height: 16 }} />
          </a>
        </div>
      </section>

      <div
        data-mobile-stack="true"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}
      >
        <SummaryCard label="Live products" value={activeProducts.length} detail={`${data.products.length} total in catalog`} />
        <SummaryCard label="Low stock" value={lowStockProducts.length} detail="At or below reorder point" />
        <SummaryCard
          label="Orders"
          value={realOrders.length}
          detail={
            sandboxOrderCount > 0
              ? `${data.customerCount} shop contacts · ${sandboxOrderCount} sandbox`
              : `${data.customerCount} shop contacts`
          }
        />
        <SummaryCard
          label="Net collected"
          value={money(paidRevenue)}
          detail={
            amountAtRisk > 0
              ? `After refunds · ${money(amountAtRisk)} held by open disputes`
              : 'After refunds and chargebacks'
          }
        />
      </div>

      <nav
        aria-label="Shop sections"
        data-mobile-scroll="true"
        style={{ ...styles.nav, flexWrap: 'nowrap', overflowX: 'auto', marginBottom: 0 }}
      >
        {tabItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              style={{
                ...styles.button,
                flex: '0 0 auto',
                border: 'none',
                borderBottom: tab === item.id ? '3px solid #E36216' : '3px solid transparent',
                borderRadius: 0,
                color: tab === item.id ? 'var(--card-fg-color)' : 'var(--card-muted-fg-color)',
                background: 'transparent',
                padding: '11px 13px',
              }}
            >
              <Icon style={{ width: 17, height: 17 }} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {tab === 'storefront' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 22 }}>Storefront catalog</h3>
              <p style={{ ...styles.muted, margin: '5px 0 0' }}>
                Customers see active products with the visualization collection.
              </p>
            </div>
            <button type="button" style={styles.primaryButton} onClick={() => beginProduct()}>
              <AddIcon style={{ width: 16, height: 16 }} />
              Add product
            </button>
          </div>

          {data.products.length === 0 ? (
            <div style={{ ...styles.panel, textAlign: 'center', padding: 36 }}>
              <BasketIcon style={{ width: 34, height: 34, color: '#4dc4d6', marginBottom: 10 }} />
              <h3 style={{ margin: '0 0 6px' }}>Your storefront is ready for its first product.</h3>
              <p style={{ ...styles.muted, margin: '0 0 16px' }}>Add a product, price, stock count, and optional hosted payment link.</p>
              <button type="button" style={styles.primaryButton} onClick={() => beginProduct()}>Add first product</button>
            </div>
          ) : (
            <>
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
                padding: '12px 14px', marginBottom: 12, borderRadius: 8,
                border: '1px solid rgba(140,150,170,.22)',
                background: bulkIds.length ? 'rgba(77,196,214,.10)' : 'transparent',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700 }}>
                <input
                  type="checkbox"
                  checked={bulkIds.length > 0 && bulkIds.length === data.products.length}
                  ref={(el) => {
                    if (el) el.indeterminate = bulkIds.length > 0 && bulkIds.length < data.products.length
                  }}
                  onChange={(event) =>
                    setBulkIds(event.currentTarget.checked ? data.products.map((p) => p._id) : [])
                  }
                />
                {bulkIds.length ? `${bulkIds.length} selected` : 'Select all'}
              </label>

              <span style={{ ...styles.muted, fontSize: 12 }}>Set price</span>
              <input
                type="number" min={0} step="0.01" placeholder="30"
                aria-label="Bulk price"
                style={{ ...styles.input, width: 92 }}
                value={bulkPrice}
                onChange={(event) => setBulkPrice(event.currentTarget.value)}
              />
              <button
                type="button" style={styles.button}
                disabled={saving || !bulkIds.length || bulkPrice === ''}
                onClick={() => void applyBulk('price', Number(bulkPrice))}
              >
                Apply price
              </button>

              <span style={{ ...styles.muted, fontSize: 12 }}>Was</span>
              <input
                type="number" min={0} step="0.01" placeholder="50"
                aria-label="Bulk was-price"
                style={{ ...styles.input, width: 92 }}
                value={bulkSale}
                onChange={(event) => setBulkSale(event.currentTarget.value)}
              />
              <button
                type="button" style={styles.button}
                disabled={saving || !bulkIds.length || bulkSale === ''}
                onClick={() => void applyBulk('compareAtPrice', Number(bulkSale))}
              >
                Mark on sale
              </button>
              <button
                type="button" style={styles.button}
                disabled={saving || !bulkIds.length}
                onClick={() => void applyBulk('compareAtPrice', null)}
              >
                End sale
              </button>

              <span style={{ ...styles.muted, fontSize: 12, flexBasis: '100%', margin: 0 }}>
                &ldquo;Was&rdquo; is display only &mdash; checkout always charges Price. Shipping is
                one flat rate for the whole shop; set it under Settings.
              </span>
            </div>

            <div
              data-mobile-stack="true"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}
            >
              {data.products.map((product) => {
                const stock = stockTone(product)
                return (
                  <article key={product._id} style={{ ...styles.card, overflow: 'hidden', display: 'grid' }}>
                    <div
                      style={{
                        height: 170,
                        background: product.imageUrl
                          ? `center / cover no-repeat url("${product.imageUrl}")`
                          : 'linear-gradient(135deg, rgba(0,115,133,.9), rgba(77,196,214,.25)), radial-gradient(circle at 70% 20%, #E36216 0 8%, transparent 9%)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                      role={product.imageUrl ? 'img' : undefined}
                      aria-label={product.imageUrl ? product.imageAlt || product.title || 'Product image' : undefined}
                    >
                      {!product.imageUrl && <PackageIcon style={{ width: 50, height: 50, color: 'rgba(255,255,255,.86)' }} />}
                    </div>
                    <div style={{ padding: 15, display: 'grid', gap: 11 }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: 17 }}>{product.title || 'Untitled product'}</strong>
                          <span style={{ ...styles.muted, ...styles.small }}>{product.sku || 'No SKU'}</span>
                        </div>
                        <span
                          style={{
                            padding: '4px 7px',
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 800,
                            color: product.status === 'active' ? '#7dd69e' : '#c5ccda',
                            background: product.status === 'active' ? 'rgba(54,139,87,.16)' : 'rgba(120,120,120,.14)',
                          }}
                        >
                          {product.status || 'draft'}
                        </span>
                      </div>
                      <p style={{ ...styles.muted, margin: 0, minHeight: 42, lineHeight: 1.45, fontSize: 13 }}>
                        {product.description || 'Add a short storefront description.'}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <strong style={{ fontSize: 20 }}>
                          {typeof product.compareAtPrice === 'number' &&
                            typeof product.price === 'number' &&
                            product.compareAtPrice > product.price && (
                              <span style={{ ...styles.muted, fontSize: 13, textDecoration: 'line-through', marginRight: 6 }}>
                                {money(product.compareAtPrice, product.currency)}
                              </span>
                            )}
                          {money(product.price, product.currency)}
                        </strong>
                        <span style={{ padding: '4px 7px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: stock.color, background: stock.background }}>
                          {stock.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, ...styles.muted }}>
                          <input
                            type="checkbox"
                            checked={bulkIds.includes(product._id)}
                            aria-label={`Select ${product.title || 'product'} for bulk edit`}
                            onChange={(event) =>
                              setBulkIds((current) =>
                                event.currentTarget.checked
                                  ? [...current, product._id]
                                  : current.filter((id) => id !== product._id),
                              )
                            }
                          />
                          Select
                        </label>
                        <button type="button" style={{ ...styles.button, flex: 1 }} onClick={() => beginProduct(product)}>Edit product</button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            </>
          )}
        </div>
      )}

      {tab === 'inventory' && (
        <section style={styles.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 22 }}>Inventory</h3>
              <p style={{ ...styles.muted, margin: '5px 0 0' }}>Fast stock adjustments with low-stock warnings.</p>
            </div>
            <button type="button" style={styles.button} onClick={() => void load()}>
              <RefreshIcon style={{ width: 16, height: 16 }} />
              Refresh
            </button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.products.map((product) => {
              const stock = stockTone(product)
              return (
                <div
                  key={product._id}
                  data-mobile-stack="true"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 1fr) 140px 180px',
                    gap: 12,
                    alignItems: 'center',
                    padding: 12,
                    border: '1px solid var(--card-border-color)',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <strong>{product.title || 'Untitled product'}</strong>
                    <div style={{ ...styles.muted, ...styles.small }}>{product.sku || 'No SKU'} · reorder at {product.lowStockThreshold ?? 5}</div>
                  </div>
                  <span style={{ color: stock.color, fontWeight: 800 }}>{stock.label}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 40px', gap: 6 }}>
                    <button type="button" aria-label={`Remove one ${product.title}`} style={styles.button} onClick={() => void adjustStock(product, -1)}>−</button>
                    <input
                      aria-label={`${product.title} inventory quantity`}
                      type="number"
                      min={0}
                      style={{ ...styles.input, textAlign: 'center' }}
                      value={product.inventoryQuantity ?? 0}
                      onChange={(event) => {
                        const next = Math.max(0, Math.round(Number(event.currentTarget.value) || 0))
                        setData((current) => ({
                          ...current,
                          products: current.products.map((candidate) =>
                            candidate._id === product._id ? { ...candidate, inventoryQuantity: next } : candidate,
                          ),
                        }))
                      }}
                      onBlur={(event) => {
                        const next = Math.max(0, Math.round(Number(event.currentTarget.value) || 0))
                        void client.patch(product._id).set({ inventoryQuantity: next }).commit().catch((error) => {
                          toast.push({ status: 'error', title: 'Could not update stock', description: error instanceof Error ? error.message : undefined })
                        })
                      }}
                    />
                    <button type="button" aria-label={`Add one ${product.title}`} style={styles.button} onClick={() => void adjustStock(product, 1)}>+</button>
                  </div>
                </div>
              )
            })}
            {data.products.length === 0 && <p style={styles.muted}>Add a product before managing inventory.</p>}
          </div>
        </section>
      )}

      {tab === 'orders' && (
        <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 16 }}>
          <section style={styles.panel}>
            <h3 style={{ margin: '0 0 5px', fontSize: 20 }}>Record an order</h3>
            <p style={{ ...styles.muted, ...styles.small, margin: '0 0 16px' }}>
              Manual and processor orders share the same ledger and can sync customers to Outreach.
            </p>
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Product">
                <select
                  style={styles.input}
                  value={orderDraft.productId}
                  onChange={(event) => setOrderDraft((current) => ({ ...current, productId: event.currentTarget.value }))}
                >
                  <option value="">Select a product…</option>
                  {activeProducts.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.title} · {money(product.price, product.currency)}
                    </option>
                  ))}
                </select>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Quantity">
                  <input type="number" min={1} style={styles.input} value={orderDraft.quantity} onChange={(event) => setOrderDraft((current) => ({ ...current, quantity: event.currentTarget.value }))} />
                </Field>
                <Field label="Status">
                  <select style={styles.input} value={orderDraft.status} onChange={(event) => setOrderDraft((current) => ({ ...current, status: event.currentTarget.value }))}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="fulfilled">Fulfilled</option>
                  </select>
                </Field>
              </div>
              <Field label="Customer name">
                <input style={styles.input} value={orderDraft.customerName} onChange={(event) => setOrderDraft((current) => ({ ...current, customerName: event.currentTarget.value }))} />
              </Field>
              <Field label="Customer email" hint={settings?.syncContacts ? 'Matched or added in Marketing → Outreach.' : 'Contact sync is off.'}>
                <input type="email" style={styles.input} value={orderDraft.customerEmail} onChange={(event) => setOrderDraft((current) => ({ ...current, customerEmail: event.currentTarget.value }))} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <Field label="Shipping">
                  <input type="number" min={0} step="0.01" style={styles.input} value={orderDraft.shipping} onChange={(event) => setOrderDraft((current) => ({ ...current, shipping: event.currentTarget.value }))} />
                </Field>
                <Field label="Support amount">
                  <input type="number" min={0} step="0.01" style={styles.input} value={orderDraft.donation} onChange={(event) => setOrderDraft((current) => ({ ...current, donation: event.currentTarget.value }))} />
                </Field>
                <Field label="Tax">
                  <input type="number" min={0} step="0.01" style={styles.input} value={orderDraft.tax} onChange={(event) => setOrderDraft((current) => ({ ...current, tax: event.currentTarget.value }))} />
                </Field>
              </div>
              <Field label="Processor payment ID" hint="Optional external reference; never enter card data.">
                <input style={styles.input} value={orderDraft.processorPaymentId} onChange={(event) => setOrderDraft((current) => ({ ...current, processorPaymentId: event.currentTarget.value }))} />
              </Field>
              <div style={{ padding: 12, borderRadius: 8, background: 'rgba(0,115,133,.1)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={styles.muted}>Order total</span>
                <strong>{money(orderTotal, orderProduct?.currency)}</strong>
              </div>
              <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void recordOrder()}>
                {saving ? 'Recording…' : 'Record order'}
              </button>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>Recent orders</h3>
                <p style={{ ...styles.muted, ...styles.small, margin: '4px 0 0' }}>{data.contactCount} total marketing contacts</p>
              </div>
              <UsersIcon style={{ width: 24, height: 24, color: '#4dc4d6' }} />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {data.orders.map((order) => (
                <div key={order._id} style={{ border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <strong>{order.orderNumber || 'Order'}</strong>
                      {order.livemode === false && (
                        <span
                          style={{
                            ...styles.small,
                            marginLeft: 6,
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontWeight: 800,
                            border: '1px solid #d6a93f',
                            color: '#d6a93f',
                          }}
                        >
                          SANDBOX
                        </span>
                      )}
                      <div style={{ ...styles.muted, ...styles.small }}>
                        {order.customerName} · {order.customerEmail}
                      </div>
                      {(order.donation || 0) > 0 && (
                        <div style={{ ...styles.small, color: '#7dd69e', marginTop: 3 }}>
                          Includes {money(order.donation, order.currency)} support
                        </div>
                      )}
                      {/* What to print and where to send it — without these the
                          order card cannot actually be fulfilled. */}
                      {(order.items || []).length > 0 && (
                        <div style={{ ...styles.small, marginTop: 6 }}>
                          {(order.items || [])
                            .map((item) => `${item.quantity || 1} × ${item.title || 'Print'}`)
                            .join(' · ')}
                        </div>
                      )}
                      {order.shippingAddress && (
                        <div style={{ ...styles.muted, ...styles.small, marginTop: 6, whiteSpace: 'pre-line' }}>
                          {order.shippingAddress}
                        </div>
                      )}
                      {/* Money truth, separate from the fulfilment status a
                          human sets. Anything that says do-not-ship has to be
                          impossible to miss while packing a tube. */}
                      {order.settlementState && order.settlementState !== 'collected' && (
                        <div
                          style={{
                            ...styles.small,
                            marginTop: 6,
                            fontWeight: 800,
                            color: DO_NOT_SHIP_STATES.includes(order.settlementState) ? '#e2725b' : '#d6a93f',
                          }}
                        >
                          {SETTLEMENT_LABELS[order.settlementState] || order.settlementState}
                          {typeof order.netCollected === 'number' && (
                            <span style={{ fontWeight: 500 }}>
                              {' '}
                              · {money(order.netCollected, order.currency)} still collected
                            </span>
                          )}
                          {DO_NOT_SHIP_STATES.includes(order.settlementState) && ' · do not ship'}
                        </div>
                      )}
                      {order.ledgerSyncError && (
                        <div style={{ ...styles.small, marginTop: 4, color: '#d6a93f' }}>
                          Ledger out of date: {order.ledgerSyncError}
                        </div>
                      )}
                    </div>
                    <strong>{money(order.total, order.currency)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 9, alignItems: 'center' }}>
                    <span style={{ ...styles.small, fontWeight: 800, color: order.status === 'paid' || order.status === 'fulfilled' ? '#7dd69e' : '#d6a93f' }}>
                      {order.status || 'pending'}
                    </span>
                    <span style={{ ...styles.muted, ...styles.small }}>
                      {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : ''}
                      {order.contact?._id ? ' · linked contact' : ''}
                      {order.processor ? ` · ${order.processor}` : ''}
                      {order.paymentUrl ? (
                        <>
                          {' · '}
                          <a href={order.paymentUrl} target="_blank" rel="noreferrer">
                            receipt
                          </a>
                        </>
                      ) : null}
                    </span>
                  </div>
                </div>
              ))}
              {data.orders.length === 0 && <p style={styles.muted}>No orders recorded yet.</p>}
            </div>

            {/* Disputes sit next to orders, sorted by deadline: the only thing
                that matters about a chargeback is how long is left to answer. */}
            {data.disputes.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Disputes</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {data.disputes.map((dispute) => {
                    const urgent = dispute.canRespond && !dispute.evidenceSubmittedAt
                    return (
                      <div
                        key={dispute._id}
                        style={{
                          border: `1px solid ${urgent ? '#e2725b' : 'var(--card-border-color)'}`,
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <strong>{dispute.orderNumber || 'Unmatched order'}</strong>
                            <div style={{ ...styles.muted, ...styles.small }}>
                              {dispute.stage === 'inquiry' ? 'Inquiry' : 'Chargeback'}
                              {dispute.reason ? ` · ${dispute.reason}` : ''}
                              {dispute.customerEmail ? ` · ${dispute.customerEmail}` : ''}
                            </div>
                            <div style={{ ...styles.small, marginTop: 4 }}>
                              {dispute.evidenceSubmittedAt
                                ? 'Evidence submitted'
                                : `${dispute.noteCount || 0} note${dispute.noteCount === 1 ? '' : 's'} drafted`}
                              {dispute.channelName ? ` · #${dispute.channelName}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <strong>{money(dispute.amount, dispute.currency)}</strong>
                            <div
                              style={{
                                ...styles.small,
                                fontWeight: 800,
                                color: urgent ? '#e2725b' : '#7d8698',
                              }}
                            >
                              {dispute.evidenceSubmittedAt ? dispute.status : disputeDeadlineLabel(dispute.dueBy)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'settings' && settings && (
        <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, .72fr)', gap: 16 }}>
          <section style={styles.panel}>
            <h3 style={{ margin: '0 0 5px', fontSize: 20 }}>Storefront</h3>
            <p style={{ ...styles.muted, ...styles.small, margin: '0 0 16px' }}>Control the public shop copy and availability.</p>
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Store name">
                <input style={styles.input} value={settings.storeName || ''} onChange={(event) => setSettingsDraft((current) => current ? { ...current, storeName: event.currentTarget.value } : current)} />
              </Field>
              <Field label="Headline">
                <input style={styles.input} value={settings.headline || ''} onChange={(event) => setSettingsDraft((current) => current ? { ...current, headline: event.currentTarget.value } : current)} />
              </Field>
              <Field label="Description">
                <textarea rows={3} style={styles.input} value={settings.description || ''} onChange={(event) => setSettingsDraft((current) => current ? { ...current, description: event.currentTarget.value } : current)} />
              </Field>
              <Field label="Flat US shipping">
                <input
                  type="number" min={0} step="0.01" placeholder="6"
                  style={styles.input}
                  value={settings.shippingFlatRate ?? ''}
                  onChange={(event) =>
                    setSettingsDraft((current) =>
                      current
                        ? {
                            ...current,
                            shippingFlatRate:
                              event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value),
                          }
                        : current,
                    )
                  }
                />
              </Field>
              <Field label="Support email">
                <input type="email" style={styles.input} value={settings.supportEmail || ''} onChange={(event) => setSettingsDraft((current) => current ? { ...current, supportEmail: event.currentTarget.value } : current)} />
              </Field>
              <label style={{ display: 'flex', gap: 9, alignItems: 'center', fontWeight: 700 }}>
                <input type="checkbox" checked={settings.storefrontEnabled === true} onChange={(event) => setSettingsDraft((current) => current ? { ...current, storefrontEnabled: event.currentTarget.checked } : current)} />
                Publish the public storefront
              </label>
            </div>
          </section>

          <section style={styles.panel}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <CreditCardIcon style={{ width: 24, height: 24, color: '#4dc4d6' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 20 }}>Payments</h3>
                <p style={{ ...styles.muted, ...styles.small, margin: '3px 0 0' }}>{providerLabel} · {settings.connectionStatus || 'not connected'}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Processor">
                <select style={styles.input} value={settings.provider || 'none'} onChange={(event) => setSettingsDraft((current) => current ? { ...current, provider: event.currentTarget.value } : current)}>
                  {paymentProviderOptions.map((option) => <option key={option.value} value={option.value}>{option.title}</option>)}
                </select>
              </Field>
              <Field label="Connection status">
                <select style={styles.input} value={settings.connectionStatus || 'notConnected'} onChange={(event) => setSettingsDraft((current) => current ? { ...current, connectionStatus: event.currentTarget.value } : current)}>
                  <option value="notConnected">Not connected</option>
                  <option value="test">Test mode</option>
                  <option value="connected">Connected</option>
                  <option value="error">Needs attention</option>
                </select>
              </Field>
              <Field label="Account label" hint="Display name only; keep API keys in deployment secrets.">
                <input style={styles.input} value={settings.accountLabel || ''} onChange={(event) => setSettingsDraft((current) => current ? { ...current, accountLabel: event.currentTarget.value } : current)} />
              </Field>
              <Field label="Processor dashboard URL">
                <input type="url" style={styles.input} value={settings.dashboardUrl || ''} onChange={(event) => setSettingsDraft((current) => current ? { ...current, dashboardUrl: event.currentTarget.value } : current)} />
              </Field>
              <Field label="Webhook status">
                <select style={styles.input} value={settings.webhookStatus || 'notConfigured'} onChange={(event) => setSettingsDraft((current) => current ? { ...current, webhookStatus: event.currentTarget.value } : current)}>
                  <option value="notConfigured">Not configured</option>
                  <option value="configured">Configured</option>
                  <option value="error">Needs attention</option>
                </select>
              </Field>
              <hr style={{ width: '100%', border: 0, borderTop: '1px solid var(--card-border-color)', margin: '3px 0' }} />
              <label style={{ display: 'flex', gap: 9, alignItems: 'center', fontWeight: 700 }}>
                <input type="checkbox" checked={settings.syncContacts !== false} onChange={(event) => setSettingsDraft((current) => current ? { ...current, syncContacts: event.currentTarget.checked } : current)} />
                Sync customers to marketing contacts
              </label>
              <Field label="Contact source note">
                <input style={styles.input} value={settings.contactSourceNote || ''} onChange={(event) => setSettingsDraft((current) => current ? { ...current, contactSourceNote: event.currentTarget.value } : current)} />
              </Field>
              <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void saveSettings()}>
                {saving ? 'Saving…' : 'Save shop settings'}
              </button>
              <details style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced fields</summary>
                <p style={{ ...styles.muted, ...styles.small }}>
                  Use the full document editor for uncommon fields. Payment secrets must stay in deployment environment variables.
                </p>
                <a href={advancedEditHref('marketingShopSettings', MARKETING_SHOP_SETTINGS_ID) ?? undefined} style={styles.inlineLink}>
                  Open full shop settings
                  <LaunchIcon style={{ width: 15, height: 15 }} />
                </a>
              </details>
            </div>
          </section>
        </div>
      )}

      {selectedProductId && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,12,20,.68)', display: 'grid', placeItems: 'center', padding: 18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedProductId(null)
          }}
        >
          <section role="dialog" aria-modal="true" aria-label={selectedProduct ? `Edit ${selectedProduct.title}` : 'Add product'} style={{ ...styles.modalPanel, width: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 23 }}>{selectedProduct ? 'Edit product' : 'Add product'}</h3>
                <p style={{ ...styles.muted, ...styles.small, margin: '4px 0 0' }}>Storefront, checkout, and stock essentials.</p>
              </div>
              <button type="button" style={styles.button} onClick={() => setSelectedProductId(null)}>Close</button>
            </div>
            <div style={{ display: 'grid', gap: 13 }}>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: '1.4fr .8fr', gap: 10 }}>
                <Field label="Product name">
                  <input autoFocus style={styles.input} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.currentTarget.value }))} />
                </Field>
                <Field label="SKU">
                  <input style={styles.input} value={draft.sku} onChange={(event) => setDraft((current) => ({ ...current, sku: event.currentTarget.value }))} />
                </Field>
              </div>
              <Field label="Description">
                <textarea rows={3} style={styles.input} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.currentTarget.value }))} />
              </Field>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <Field label="Price">
                  <input type="number" min={0} step="0.01" style={styles.input} value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.currentTarget.value }))} />
                </Field>
                <Field label="Was (sale)">
                  <input type="number" min={0} step="0.01" placeholder="empty = not on sale" style={styles.input} value={draft.compareAtPrice} onChange={(event) => setDraft((current) => ({ ...current, compareAtPrice: event.currentTarget.value }))} />
                </Field>
                <Field label="Currency">
                  <input maxLength={3} style={styles.input} value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.currentTarget.value.toUpperCase() }))} />
                </Field>
                <Field label="Status">
                  <select style={styles.input} value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.currentTarget.value }))}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
              </div>
              <div data-mobile-stack="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <Field label="Product type">
                  <select style={styles.input} value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.currentTarget.value }))}>
                    <option value="physical">Physical</option>
                    <option value="digital">Digital</option>
                    <option value="service">Service</option>
                  </select>
                </Field>
                <Field label="Quantity on hand">
                  <input type="number" min={0} style={styles.input} value={draft.inventoryQuantity} onChange={(event) => setDraft((current) => ({ ...current, inventoryQuantity: event.currentTarget.value }))} />
                </Field>
                <Field label="Low-stock threshold">
                  <input type="number" min={0} style={styles.input} value={draft.lowStockThreshold} onChange={(event) => setDraft((current) => ({ ...current, lowStockThreshold: event.currentTarget.value }))} />
                </Field>
              </div>
              <Field label="Hosted payment link" hint="Paste a Stripe, Square, PayPal, Shopify, or custom checkout URL.">
                <input type="url" style={styles.input} value={draft.checkoutUrl} onChange={(event) => setDraft((current) => ({ ...current, checkoutUrl: event.currentTarget.value }))} />
              </Field>
              <Field
                label="How it is produced"
                hint="Printed on demand is made when someone orders it. From stock is a piece we already have, like the books. This is what the product card tells the buyer."
              >
                <select
                  style={styles.input}
                  value={draft.production}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      production: event.currentTarget.value === 'from-stock' ? 'from-stock' : 'print-on-demand',
                    }))
                  }
                >
                  <option value="print-on-demand">Printed on demand</option>
                  <option value="from-stock">Ships from studio stock</option>
                </select>
              </Field>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontWeight: 700 }}>
                  <input type="checkbox" checked={draft.orderable} onChange={(event) => setDraft((current) => ({ ...current, orderable: event.currentTarget.checked }))} />
                  Can be ordered
                </label>
                <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontWeight: 700 }}>
                  <input type="checkbox" checked={draft.trackInventory} onChange={(event) => setDraft((current) => ({ ...current, trackInventory: event.currentTarget.checked }))} />
                  Track inventory
                </label>
                <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontWeight: 700 }}>
                  <input type="checkbox" checked={draft.allowBackorder} onChange={(event) => setDraft((current) => ({ ...current, allowBackorder: event.currentTarget.checked }))} />
                  Allow backorders
                </label>
                <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontWeight: 700 }}>
                  <input type="checkbox" checked={draft.featured} onChange={(event) => setDraft((current) => ({ ...current, featured: event.currentTarget.checked }))} />
                  Featured
                </label>
              </div>
              <button type="button" style={styles.primaryButton} disabled={saving} onClick={() => void saveProduct()}>
                {saving ? 'Saving…' : selectedProduct ? 'Save product' : 'Add product'}
              </button>
              {selectedProduct && (
                <details style={{ borderTop: '1px solid var(--card-border-color)', paddingTop: 12 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 800 }}>Advanced fields</summary>
                  <p style={{ ...styles.muted, ...styles.small }}>Add the product image, campaign links, audiences, internal notes, and other uncommon fields.</p>
                  <a href={advancedEditHref('marketingProduct', selectedProduct._id) ?? undefined} style={styles.inlineLink}>
                    Open full product editor
                    <LaunchIcon style={{ width: 15, height: 15 }} />
                  </a>
                </details>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
