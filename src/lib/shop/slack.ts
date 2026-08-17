import { createHash } from 'node:crypto'
import {
  getSlackConfig,
  postSlackMessage,
  type SlackPostResult,
} from '@/lib/chat/slack'

export type ShopOrderNotification = {
  orderId: string
  orderNumber: string
  placedAt: string
  customerName: string
  customerEmail: string
  /**
   * Flattened "name / line1 / city, state postal / country" for print orders.
   * Included so the alert is enough to fulfill from on its own — otherwise
   * whoever packs the order has to sign into Stripe with 2FA to find out where
   * it goes (Eric, 2026-08-17). Absent for donation-only checkouts, which
   * collect no shipping details.
   */
  shippingAddress?: string
  items: Array<{
    title: string
    quantity: number
  }>
  supportAmount: number
  shipping: number
  total: number
  currency: string
  paymentUrl?: string
  testMode: boolean
}

export type ShopSlackNotificationResult =
  | { status: 'not-configured' }
  | ({ status: 'sent' } & SlackPostResult)

export function getShopSlackChannelId() {
  return (
    process.env.SLACK_SHOP_CHANNEL_ID ||
    process.env.SLACK_CHAT_CHANNEL_ID ||
    process.env.SLACK_CHANNEL_ID ||
    ''
  )
}

export function isShopSlackNotificationConfigured() {
  return Boolean(getSlackConfig().botToken && getShopSlackChannelId())
}

/**
 * Links to the Marketing tool's Shop view, NOT a document intent link. Orders
 * live in the private outreach dataset, and the Studio's document editor is
 * bound to the public one — an intent link resolves to an empty editor. The
 * Shop view reads outreach directly, so this is the only place an order is
 * actually visible.
 */
export function getMarketingOrderStudioUrl(_orderId: string) {
  const configuredBase =
    process.env.SHOP_STUDIO_BASE_URL ||
    process.env.CHAT_STUDIO_BASE_URL ||
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
    'https://www.goinvo.com'
  const baseUrl = normalizeHttpBaseUrl(configuredBase) || 'https://www.goinvo.com'

  return new URL('/studio/marketing?view=shop', baseUrl).toString()
}

export function shopOrderSlackClientMessageId(orderId: string) {
  const bytes = createHash('sha256').update(`goinvo-shop-order:${orderId}`).digest().subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function buildShopOrderSlackMessage(order: ShopOrderNotification) {
  const heading = order.testMode ? '🧪 Sandbox shop order paid' : 'New shop order paid'
  const total = formatMoney(order.total, order.currency)
  const support = formatMoney(order.supportAmount, order.currency)
  const shipping = formatMoney(order.shipping, order.currency)
  const itemLines = order.items.slice(0, 10).map(
    (item) => `• ${item.quantity} × ${escapeSlack(item.title)}`,
  )
  if (order.items.length > 10) {
    itemLines.push(`• …and ${order.items.length - 10} more`)
  }
  if (!itemLines.length) {
    itemLines.push('• Pay-what-you-want support only')
  }

  const summary = [
    `*${heading}*`,
    `*Order:* ${escapeSlack(order.orderNumber)}`,
    `*Customer:* ${escapeSlack(order.customerName)} · ${escapeSlack(order.customerEmail)}`,
    order.shippingAddress
      ? `*Ship to:*\n${escapeSlack(order.shippingAddress)}`
      : undefined,
    `*Total:* ${total}`,
    order.supportAmount > 0 ? `*Pay what you want:* ${support}` : undefined,
    order.shipping > 0 ? `*Additional shipping:* ${shipping}` : undefined,
  ]
    .filter(Boolean)
    .join('\n')

  const actions: Record<string, unknown>[] = [
    {
      type: 'button',
      text: { type: 'plain_text', text: 'Open order in CMS' },
      style: 'primary',
      url: getMarketingOrderStudioUrl(order.orderId),
      action_id: 'goinvo_shop_open_order',
    },
  ]
  if (order.paymentUrl) {
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Open receipt' },
      url: order.paymentUrl,
      action_id: 'goinvo_shop_open_receipt',
    })
  }

  return {
    // Buyer-supplied values are escaped here too, not just in the blocks: this
    // fallback is what push/desktop notifications render, so raw mrkdwn would
    // let a $6 order plant a clickable phishing link in the ops channel.
    text: `${heading}: ${escapeSlack(order.orderNumber)}, ${total}, ${escapeSlack(
      order.customerName,
    )} (${escapeSlack(order.customerEmail)}). ${order.items
      .map((item) => `${item.quantity} × ${escapeSlack(item.title)}`)
      .join(', ') || 'Pay-what-you-want support only'}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: summary,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*What they ordered:*\n${itemLines.join('\n')}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${order.testMode ? 'Stripe test mode' : 'Stripe live mode'} · Paid ${escapeSlack(
              formatPlacedAt(order.placedAt),
            )}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: actions,
      },
    ],
    clientMsgId: shopOrderSlackClientMessageId(order.orderId),
  }
}

export async function notifySlackShopOrder(
  order: ShopOrderNotification,
): Promise<ShopSlackNotificationResult> {
  const channel = getShopSlackChannelId()
  if (!getSlackConfig().botToken || !channel) {
    return { status: 'not-configured' }
  }

  const message = buildShopOrderSlackMessage(order)
  const result = await postSlackMessage({
    channel,
    ...message,
  })
  if (!result) {
    throw new Error(`Slack purchase notification failed for ${order.orderNumber}.`)
  }

  return { status: 'sent', ...result }
}

export type ShopRefundNotification = {
  orderId: string
  chargeId: string
  livemode?: boolean
  settlement: {
    amountCaptured: number
    amountRefunded: number
    netCollected: number
    settlementState: string
  }
}

/**
 * Refund alert. Deliberately quieter than an order alert: it states the new
 * ledger position rather than re-describing the sale, because the question an
 * operator has when money goes back is "do I still ship this?".
 */
export function buildShopRefundSlackMessage(input: ShopRefundNotification) {
  const { settlement } = input
  const fullyRefunded = settlement.settlementState === 'refunded'
  // Sandbox traffic shares the Slack channel with real orders, so it says so.
  const prefix = input.livemode === false ? 'Sandbox ' : ''
  const heading = `${prefix}${fullyRefunded ? 'Order refunded' : 'Partial refund issued'}`
  const summary = `${formatMoney(settlement.amountRefunded, 'USD')} of ${formatMoney(
    settlement.amountCaptured,
    'USD',
  )} refunded · ${formatMoney(settlement.netCollected, 'USD')} still collected`

  return {
    text: `${heading}: ${summary}.${fullyRefunded ? ' Do not ship this order.' : ''}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: heading } },
      { type: 'section', text: { type: 'mrkdwn', text: summary } },
      ...(fullyRefunded
        ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: '*Do not ship this order.*' }] }]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'goinvo_refund_open_cms',
            text: { type: 'plain_text', text: 'Open order in CMS' },
            url: getMarketingOrderStudioUrl(input.orderId),
          },
        ],
      },
    ],
  }
}

export async function notifySlackShopRefund(
  input: ShopRefundNotification,
): Promise<ShopSlackNotificationResult> {
  const channel = getShopSlackChannelId()
  if (!getSlackConfig().botToken || !channel) {
    return { status: 'not-configured' }
  }

  const message = buildShopRefundSlackMessage(input)
  const result = await postSlackMessage({ channel, ...message })
  if (!result) {
    throw new Error(`Slack refund notification failed for ${input.orderId}.`)
  }

  return { status: 'sent', ...result }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount)
}

function formatPlacedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
  }).format(date)
}

export function escapeSlack(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function normalizeHttpBaseUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : undefined
  } catch {
    return undefined
  }
}
