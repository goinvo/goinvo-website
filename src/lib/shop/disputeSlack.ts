import 'server-only'

import {
  createSlackChannelByName,
  getDedicatedSlackChannelsEnabled,
  getSlackConfig,
  postSlackMessage,
} from '@/lib/chat/slack'
import { escapeSlack, getMarketingOrderStudioUrl, getShopSlackChannelId } from './slack'
import type { DisputeStage } from './settlement'

/**
 * A dispute becomes a Slack channel people can talk in, using the same
 * transport as visitor chat: a public channel, a card posted into it, and
 * replies picked up by the existing Slack events webhook.
 */

export type DisputeChannelResult =
  | { status: 'created'; channelId: string; channelName: string }
  | { status: 'exists'; channelName: string }
  | { status: 'disabled' }
  | { status: 'not-configured' }
  | { status: 'failed'; error: string }

export type DisputeCardInput = {
  disputeId: string
  status: string
  stage: DisputeStage
  reason?: string
  amount: number
  currency: string
  orderId?: string
  orderNumber?: string
  customerEmail?: string
  customerName?: string
  dueBy?: string
  canRespond: boolean
  livemode: boolean
}

/** Dispute channels can be turned off without touching the ledger. */
export function getDisputeChannelsEnabled() {
  return process.env.SHOP_DISPUTE_CHANNELS_ENABLED !== 'false' && getDedicatedSlackChannelsEnabled()
}

/**
 * Derived only from the Stripe dispute id — no timestamp, no random suffix.
 * That is what makes `name_taken` a SUCCESS signal (the channel is already
 * there from a previous delivery) rather than a reason to create a duplicate.
 */
export function buildDisputeChannelName(disputeId: string, livemode = true) {
  const slug = disputeId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  // A rehearsal channel is named as one. Someone scrolling the channel list
  // months later must not mistake a test chargeback for a real one.
  const prefix = livemode ? 'shop-dispute-' : 'sandbox-shop-dispute-'
  return `${prefix}${slug || 'unknown'}`.slice(0, 80).replace(/-+$/g, '')
}

export async function ensureDisputeChannel(
  disputeId: string,
  livemode = true,
): Promise<DisputeChannelResult> {
  if (!getDisputeChannelsEnabled()) return { status: 'disabled' }
  if (!getSlackConfig().botToken) return { status: 'not-configured' }

  const name = buildDisputeChannelName(disputeId, livemode)
  const result = await createSlackChannelByName(name)

  if (result.ok) return { status: 'created', channelId: result.id, channelName: result.name }
  // Already created by an earlier delivery of this same dispute. The caller
  // keeps the channel id it stored the first time.
  if (result.error === 'name_taken') return { status: 'exists', channelName: name }

  return { status: 'failed', error: result.detail || result.error || 'unknown Slack error' }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount)
}

function formatDeadline(dueBy: string | undefined, now: Date) {
  if (!dueBy) return 'Stripe allows no response for this dispute.'
  const due = new Date(dueBy)
  if (Number.isNaN(due.getTime())) return 'Deadline unknown.'

  const days = Math.ceil((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  const formatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York',
  }).format(due)

  if (days < 0) return `Evidence was due ${formatted} — the deadline has passed.`
  if (days === 0) return `Evidence due TODAY, ${formatted}.`
  return `Evidence due ${formatted} — ${days} day${days === 1 ? '' : 's'} left.`
}

export function buildDisputeCard(input: DisputeCardInput, now = new Date()) {
  const amount = formatMoney(input.amount, input.currency)
  const stageLine =
    input.stage === 'inquiry'
      ? 'Inquiry — no funds held yet'
      : 'Chargeback — the money has already been pulled back'
  const heading = `${input.livemode ? '' : 'Sandbox '}${
    input.stage === 'inquiry' ? 'Card inquiry' : 'Chargeback'
  } opened${input.orderNumber ? ` on ${input.orderNumber}` : ''}`

  const lines = [
    `*Amount:* ${amount}`,
    `*Stage:* ${stageLine}`,
    input.reason ? `*Reason given:* ${escapeSlack(input.reason)}` : undefined,
    input.orderNumber ? `*Order:* ${escapeSlack(input.orderNumber)}` : '*Order:* no matching order found',
    input.customerName || input.customerEmail
      ? `*Customer:* ${escapeSlack(input.customerName || '')}${
          input.customerEmail ? ` · ${escapeSlack(input.customerEmail)}` : ''
        }`
      : undefined,
    `*Deadline:* ${formatDeadline(input.dueBy, now)}`,
  ].filter(Boolean) as string[]

  const blocks: Array<Record<string, unknown>> = [
    { type: 'header', text: { type: 'plain_text', text: heading.slice(0, 150) } },
    { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Reply in this channel to draft the response. Nothing you type is sent to the customer or to Stripe until someone presses a button below.',
        },
      ],
    },
  ]

  const actions: Array<Record<string, unknown>> = []
  if (input.canRespond) {
    actions.push({
      type: 'button',
      style: 'primary',
      action_id: 'goinvo_dispute_submit_evidence',
      text: { type: 'plain_text', text: 'Submit evidence to Stripe' },
      value: input.disputeId,
      // Stripe normally accepts ONE submission and it cannot be retracted, so
      // the irreversible action gets an explicit second confirmation.
      confirm: {
        title: { type: 'plain_text', text: 'Submit to Stripe?' },
        text: {
          type: 'mrkdwn',
          text: 'This sends every note in this channel to Stripe as your evidence. Stripe normally allows only one submission and it cannot be taken back.',
        },
        confirm: { type: 'plain_text', text: 'Submit' },
        deny: { type: 'plain_text', text: 'Cancel' },
      },
    })
  }
  if (input.customerEmail) {
    actions.push({
      type: 'button',
      action_id: 'goinvo_dispute_email_customer',
      text: { type: 'plain_text', text: 'Email the customer' },
      // A mailto: opens the operator's own mail client. There is deliberately
      // no outbound send path, so an internal note can never be delivered to a
      // hostile cardholder by accident.
      url: `mailto:${encodeURIComponent(input.customerEmail)}?subject=${encodeURIComponent(
        `About your order${input.orderNumber ? ` ${input.orderNumber}` : ''}`,
      )}`,
    })
  }
  actions.push({
    type: 'button',
    action_id: 'goinvo_dispute_open_stripe',
    text: { type: 'plain_text', text: 'Open in Stripe' },
    url: `https://dashboard.stripe.com/${input.livemode ? '' : 'test/'}disputes/${input.disputeId}`,
  })
  if (input.orderId) {
    actions.push({
      type: 'button',
      action_id: 'goinvo_dispute_open_cms',
      text: { type: 'plain_text', text: 'Open order in CMS' },
      url: getMarketingOrderStudioUrl(input.orderId),
    })
  }
  blocks.push({ type: 'actions', elements: actions })

  return {
    text: `${heading}: ${amount}${input.reason ? ` (${escapeSlack(input.reason)})` : ''}. ${formatDeadline(
      input.dueBy,
      now,
    )}`,
    blocks,
  }
}

/** Posts the card into the dispute channel, falling back to the shop channel. */
export async function postDisputeCard(input: {
  card: DisputeCardInput
  channelId?: string
}) {
  const channel = input.channelId || getShopSlackChannelId()
  if (!channel) return null

  const message = buildDisputeCard(input.card)
  return postSlackMessage({
    channel,
    text: message.text,
    blocks: message.blocks,
  })
}

/**
 * A one-line heads-up in the channel the team actually watches, pointing at the
 * dispute's own channel. Mirrors how visitor chat announces a new conversation
 * in the hub: the alert is where people look, the conversation stays where the
 * replies can be captured as evidence.
 */
export async function postDisputeHubPointer(input: {
  card: DisputeCardInput
  channelId: string
}) {
  const hub = getShopSlackChannelId()
  // Nothing to point at if the card already landed in the hub itself.
  if (!hub || hub === input.channelId) return null

  const stage = input.card.stage === 'inquiry' ? 'Card inquiry' : 'Chargeback'
  const text = [
    `${input.card.livemode ? '' : 'Sandbox '}${stage} opened`,
    input.card.orderNumber ? ` on ${escapeSlack(input.card.orderNumber)}` : '',
    ` · ${formatMoney(input.card.amount, input.card.currency)}`,
    ` · ${formatDeadline(input.card.dueBy, new Date())}`,
    ` Details and replies: <#${input.channelId}>`,
  ].join('')

  return postSlackMessage({ channel: hub, text })
}

/** A short system line in the dispute channel (evidence submitted, status changed). */
export async function postDisputeNote(input: { channelId?: string; text: string }) {
  const channel = input.channelId || getShopSlackChannelId()
  if (!channel) return null

  return postSlackMessage({ channel, text: input.text })
}
