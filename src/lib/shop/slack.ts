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

export function getMarketingOrderStudioUrl(orderId: string) {
  const configuredBase =
    process.env.SHOP_STUDIO_BASE_URL ||
    process.env.CHAT_STUDIO_BASE_URL ||
    process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ||
    'https://www.goinvo.com'
  const baseUrl = normalizeHttpBaseUrl(configuredBase) || 'https://www.goinvo.com'
  const path = `/studio/intent/edit/id=${encodeURIComponent(orderId)};type=marketingOrder`

  return new URL(path, baseUrl).toString()
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

function escapeSlack(value: string) {
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
