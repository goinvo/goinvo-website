import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildShopOrderSlackMessage,
  getMarketingOrderStudioUrl,
  getShopSlackChannelId,
  notifySlackShopOrder,
  shopOrderSlackClientMessageId,
  type ShopOrderNotification,
} from '@/lib/shop/slack'

const order: ShopOrderNotification = {
  orderId: 'marketingOrder.stripe-cs_test_123',
  orderNumber: 'SHOP-20260730-TEST0123',
  placedAt: '2026-07-30T15:06:46.000Z',
  customerName: 'Test Customer',
  customerEmail: 'customer@example.com',
  items: [{ title: 'Determinants of Health', quantity: 2 }],
  supportAmount: 15,
  shipping: 0,
  total: 27,
  currency: 'USD',
  paymentUrl: 'https://pay.stripe.com/receipts/test',
  testMode: true,
}

const originalEnvironment = {
  slackBotToken: process.env.SLACK_BOT_TOKEN,
  slackShopChannelId: process.env.SLACK_SHOP_CHANNEL_ID,
  slackChatChannelId: process.env.SLACK_CHAT_CHANNEL_ID,
  slackChannelId: process.env.SLACK_CHANNEL_ID,
  shopStudioBaseUrl: process.env.SHOP_STUDIO_BASE_URL,
}

afterEach(() => {
  restoreEnvironment('SLACK_BOT_TOKEN', originalEnvironment.slackBotToken)
  restoreEnvironment('SLACK_SHOP_CHANNEL_ID', originalEnvironment.slackShopChannelId)
  restoreEnvironment('SLACK_CHAT_CHANNEL_ID', originalEnvironment.slackChatChannelId)
  restoreEnvironment('SLACK_CHANNEL_ID', originalEnvironment.slackChannelId)
  restoreEnvironment('SHOP_STUDIO_BASE_URL', originalEnvironment.shopStudioBaseUrl)
  vi.unstubAllGlobals()
})

describe('shop Slack purchase notifications', () => {
  it('builds an accessible test-order alert without exposing the shipping address', () => {
    process.env.SHOP_STUDIO_BASE_URL = 'https://preview.goinvo.com/studio'
    const message = buildShopOrderSlackMessage(order)
    const serialized = JSON.stringify(message)

    expect(message.text).toContain('Sandbox shop order paid')
    expect(message.text).toContain('SHOP-20260730-TEST0123')
    expect(message.text).toContain('$27.00')
    expect(serialized).toContain('Determinants of Health')
    expect(serialized).toContain('Open order in CMS')
    expect(serialized).not.toContain('shippingAddress')
    // Orders live in the private outreach dataset, which the Studio's document
    // editor cannot open — the link must land on the Shop view that reads it.
    expect(getMarketingOrderStudioUrl(order.orderId)).toBe(
      'https://preview.goinvo.com/studio/marketing?view=shop',
    )
    expect(getMarketingOrderStudioUrl(order.orderId)).not.toContain('intent/edit')
  })

  it('uses a stable UUID message ID so webhook retries do not create a second alert', () => {
    const first = shopOrderSlackClientMessageId(order.orderId)

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(shopOrderSlackClientMessageId(order.orderId)).toBe(first)
    expect(shopOrderSlackClientMessageId(`${order.orderId}-other`)).not.toBe(first)
  })

  it('prefers a shop channel and falls back to the existing chat channel', () => {
    delete process.env.SLACK_SHOP_CHANNEL_ID
    process.env.SLACK_CHAT_CHANNEL_ID = 'C-CHAT'
    process.env.SLACK_CHANNEL_ID = 'C-LEGACY'
    expect(getShopSlackChannelId()).toBe('C-CHAT')

    process.env.SLACK_SHOP_CHANNEL_ID = 'C-SHOP'
    expect(getShopSlackChannelId()).toBe('C-SHOP')
  })

  it('posts through the configured bot with the retry-safe client message ID', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    process.env.SLACK_SHOP_CHANNEL_ID = 'C-SHOP'
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, channel: 'C-SHOP', ts: '123.456' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(notifySlackShopOrder(order)).resolves.toEqual({
      status: 'sent',
      channel: 'C-SHOP',
      ts: '123.456',
    })
    const request = fetchMock.mock.calls[0]
    const body = JSON.parse(String(request[1]?.body)) as Record<string, unknown>

    expect(request[0]).toBe('https://slack.com/api/chat.postMessage')
    expect(body.channel).toBe('C-SHOP')
    expect(body.client_msg_id).toBe(shopOrderSlackClientMessageId(order.orderId))
  })
})

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

describe('Slack notification escaping', () => {
  it('escapes buyer-controlled text in the notification fallback, not just the blocks', () => {
    // The fallback `text` is what push and desktop notifications render, so raw
    // mrkdwn there would let a $6 order plant a phishing link in the ops
    // channel under the studio's own bot name.
    const message = buildShopOrderSlackMessage({
      ...order,
      customerName: '<https://goinvo-billing.example/verify|Card declined — re-enter payment>',
      items: [{ title: '<https://evil.example|Click here>', quantity: 1 }],
    })
    expect(message.text).not.toMatch(/<https?:\/\//)
    expect(message.text).toContain('&lt;https://goinvo-billing.example/verify')
    expect(JSON.stringify(message.blocks)).not.toMatch(/<https:\/\/evil\.example/)
  })
})
