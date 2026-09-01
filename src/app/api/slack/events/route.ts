import { NextRequest, NextResponse } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { getSlackConfig, getSlackUserDisplayName, postSlackMessage, verifySlackRequest } from '@/lib/chat/slack'
import { createChatMessage, normalizeChatText, previewText, type SanityChatMessage } from '@/lib/chat/validation'
import { appendDisputeNoteFromSlack } from '@/lib/shop/disputeChat'
import { classifyMessage } from '@/lib/marketing/ideaCapture'
import { addressesMarqueta, stripMention } from '@/lib/marketing/marquetaChat'
import { answerMarqueta } from '@/lib/marketing/marquetaChat.server'
import { getSlackBotUserId } from '@/lib/chat/slack'
import { captureFromMessage } from '@/lib/marketing/ideaCapture.server'
import { buildDraftCaptureBlocks, buildIdeaCaptureBlocks } from '@/lib/marketing/slackDelegation'

export const dynamic = 'force-dynamic'

/** Well under Stripe's 20k evidence cap, but far above the visitor-chat limit. */
const MAX_DISPUTE_NOTE_LENGTH = 8000

interface SlackEventEnvelope {
  type?: string
  challenge?: string
  event?: SlackMessageEvent
}

interface SlackMessageEvent {
  type?: string
  subtype?: string
  channel?: string
  user?: string
  bot_id?: string
  text?: string
  ts?: string
  thread_ts?: string
}

interface SlackBackedThread {
  _id: string
  _rev?: string
  status?: string
  messages?: SanityChatMessage[]
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const payload = parseSlackEventPayload(rawBody)

  if (!payload) {
    return NextResponse.json({ error: 'Invalid Slack payload' }, { status: 400 })
  }

  if (payload.type === 'url_verification' && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge })
  }

  if (!verifySlackRequest(request.headers, rawBody)) {
    return NextResponse.json({ error: 'Invalid Slack signature' }, { status: 401 })
  }

  if (payload.type === 'event_callback' && payload.event) {
    await handleSlackEvent(payload.event)
  }

  return NextResponse.json({ ok: true })
}

/**
 * Every channel Marqueta watches.
 *
 * Plural on purpose. She was pointed at #marketing-bot - the channel built FOR
 * her - while the actual marketing conversation happens elsewhere, so the first
 * two real ideas she was meant to catch were posted in a room she was not in.
 * A comma-separated list means she can sit where the work is discussed as well
 * as where she reports.
 */
function watchedMarketingChannels(): string[] {
  const raw = process.env.SLACK_MARKETING_CHANNEL_IDS || process.env.SLACK_MARKETING_CHANNEL_ID || ''
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

/**
 * Somebody spoke to Marqueta - by @-mentioning her, or in a direct message.
 *
 * She answers, wherever it was, including in a channel where she is otherwise
 * silent. Being asked a question is not noise, and the whole reason to stay
 * quiet in a working channel is so that the times she does speak are wanted.
 *
 * Every answer is a lookup or a write she already knows how to make - no model
 * call - so she cannot invent a runway figure or a task that does not exist.
 */
async function handleMarquetaConversation(event: SlackMessageEvent, addressed: boolean) {
  const botUserId = await getSlackBotUserId()
  const personName = (await getSlackUserDisplayName(event.user)) || 'Someone'
  const reply = await answerMarqueta({
    text: stripMention(event.text || '', botUserId),
    personName,
    slackUserId: event.user,
    channel: event.channel || '',
    ts: event.ts || '',
  })
  if (!reply) return

  await postSlackMessage({
    channel: event.channel || '',
    // In a channel, answer in a thread so a conversation with her does not
    // push everyone else's messages up the screen. In a DM there is no thread
    // to make, and one would just look odd.
    threadTs: addressed && !isDirectMessage(event.channel) ? event.thread_ts || event.ts : undefined,
    username: 'Marqueta',
    iconEmoji: ':chart_with_upwards_trend:',
    unfurl: false,
    text: reply,
  })
}

/** Slack gives every direct-message conversation an id beginning with D. */
function isDirectMessage(channelId: string | undefined): boolean {
  return String(channelId || '').startsWith('D')
}

/**
 * The channel that is Marqueta's own - where she posts the weekly digest.
 *
 * She TALKS in her own room and LISTENS QUIETLY in other people's. Running the
 * filter over 189 real messages in #marketing showed why: it would have caught
 * 22 things, of which roughly seven are genuinely board-worthy. A bot replying
 * under two-thirds-wrong guesses in a channel people actually work in is a bot
 * somebody mutes within a week, and then the third that WAS right is lost too.
 *
 * So in a watched human channel she captures silently, and the review happens
 * in one batch on the This week surface and in the digest, where saying no to
 * a dozen guesses costs a dozen clicks in one place instead of a dozen
 * interruptions in everybody's feed.
 */
function isMarquetasOwnChannel(channelId: string): boolean {
  return Boolean(process.env.SLACK_MARKETING_CHANNEL_ID) && channelId === process.env.SLACK_MARKETING_CHANNEL_ID
}

/**
 * Somebody floated something in a marketing channel.
 *
 * Two outcomes, because a proposal and a finished draft are different things:
 * an idea goes to the board, a draft goes to the calendar with the copy
 * attached. Either way it is only ever a PROPOSAL - marked as needing review,
 * and one press bins it.
 *
 * The filter is pure and free, so this runs on every message with no
 * per-message bill and no model deciding what counts as work.
 */
async function handleMarketingChannelMessage(event: SlackMessageEvent) {
  // Only messages floated in the channel. A reply inside a thread is almost
  // always somebody answering the digest, and capturing those would turn every
  // conversation about a task into a second copy of that task.
  if (event.thread_ts && event.thread_ts !== event.ts) return

  const verdict = classifyMessage(event.text || '')
  if (!verdict.capture) return

  const personName = (await getSlackUserDisplayName(event.user)) || 'Someone'
  const result = await captureFromMessage({
    text: event.text || '',
    personName,
    channel: event.channel || '',
    ts: event.ts || '',
  })

  // Silent on a redelivery, and silent when this was folded into a thought
  // captured moments ago - a second "noted this" under one burst of messages
  // is precisely the chattiness that gets a bot muted.
  if (!result.ok || result.alreadyCaptured || result.mergedInto) return

  // Captured either way; she only SAYS so in her own channel. Everything lands
  // on the This week review list regardless, so nothing is lost by staying
  // quiet here.
  if (!isMarquetasOwnChannel(event.channel || '')) return

  const studioUrl = process.env.MARKETING_PUBLIC_BASE_URL
    ? `${process.env.MARKETING_PUBLIC_BASE_URL}/studio/marketing?view=${result.kind === 'draft' ? 'calendar' : 'thisWeek'}`
    : undefined

  if (result.kind === 'draft' && result.draft) {
    await postSlackMessage({
      channel: event.channel || '',
      threadTs: event.ts,
      username: 'Marqueta',
      iconEmoji: ':chart_with_upwards_trend:',
      unfurl: false,
      text: `Put a draft on the calendar: ${result.draft.title}`,
      blocks: buildDraftCaptureBlocks({
        title: result.draft.title,
        contentType: result.draft.contentType,
        channel: event.channel || '',
        ts: event.ts || '',
        studioUrl,
      }),
    })
    return
  }

  if (!result.idea) return
  await postSlackMessage({
    channel: event.channel || '',
    threadTs: event.ts,
    username: 'Marqueta',
    iconEmoji: ':chart_with_upwards_trend:',
    unfurl: false,
    text: `Noted an idea: ${result.idea.title}`,
    blocks: buildIdeaCaptureBlocks({
      title: result.idea.title,
      category: result.idea.category,
      channel: event.channel || '',
      ts: event.ts || '',
      studioUrl,
    }),
  })
}


async function handleSlackEvent(event: SlackMessageEvent) {
  if (event.type !== 'message') return
  if (event.subtype || event.bot_id) return
  if (!event.text || !event.ts || !event.channel) return

  // The marketing channel is Marqueta's, not the visitor chat's. Handled first
  // and returned, so an idea can never fall through into the chat/dispute
  // lookups below and be answered as though a visitor had written it.
  // Addressed directly, or messaged privately: she answers wherever it was.
  // Checked BEFORE the silent-capture path, so "@Marqueta what's on this week"
  // gets an answer rather than being quietly filed as an idea.
  const botUserId = await getSlackBotUserId()
  const addressed = addressesMarqueta(event.text, botUserId)
  if (addressed || isDirectMessage(event.channel)) {
    await handleMarquetaConversation(event, addressed)
    return
  }

  if (watchedMarketingChannels().includes(event.channel)) {
    await handleMarketingChannelMessage(event)
    return
  }

  const { channelId } = getSlackConfig()
  const eventThreadTs = event.thread_ts && event.thread_ts !== event.ts ? event.thread_ts : undefined
  const isHubChannel = Boolean(channelId && event.channel === channelId)

  if (isHubChannel && !eventThreadTs) return

  if (!event.text.trim()) return

  const client = getChatSanityClient()
  if (!client) return

  const thread = await findSlackBackedThread({
    channelId: event.channel,
    threadTs: eventThreadTs,
    isHubChannel,
  })

  const createdAt = slackTimestampToIso(event.ts)
  const authorName = await getSlackUserDisplayName(event.user)

  // Not a visitor chat channel — it may be a shop dispute channel, where a
  // reply is drafting the response to a chargeback rather than talking to a
  // visitor. Checked only after the chat lookup misses, so visitor chat keeps
  // its existing behavior exactly.
  if (!thread) {
    // Dispute evidence is written by a colleague, not a stranger, and a long
    // careful account of what shipped is exactly what wins a chargeback — so
    // it gets its own, much larger limit instead of the visitor-chat cap that
    // would silently discard it.
    await appendDisputeNoteFromSlack({
      channelId: event.channel,
      text: event.text.replace(/\r\n/g, '\n').trim().slice(0, MAX_DISPUTE_NOTE_LENGTH),
      authorName: authorName || undefined,
      slackUserId: event.user,
      slackMessageTs: event.ts,
      createdAt,
    })
    return
  }

  if (thread.status === 'spam' || thread.status === 'archived') return

  // Visitor chat keeps its own gate exactly as before.
  const text = normalizeChatText(event.text)
  if (!text) return
  const message = createChatMessage({
    authorType: 'team',
    authorName: authorName || 'GoInvo',
    text,
    createdAt,
    slackUserId: event.user,
    slackMessageTs: event.ts,
  })

  await appendSlackEventMessageIfMissing(client, thread, message, createdAt, text)
}

async function appendSlackEventMessageIfMissing(
  client: NonNullable<ReturnType<typeof getChatSanityClient>>,
  initialThread: SlackBackedThread,
  message: SanityChatMessage,
  createdAt: string,
  text: string,
) {
  let thread: SlackBackedThread | null = initialThread

  for (let attempt = 0; attempt < 3 && thread; attempt += 1) {
    if ((thread.messages || []).some((existingMessage) => existingMessage.slackMessageTs === message.slackMessageTs)) {
      return
    }

    const patch = client
      .patch(thread._id)
      .setIfMissing({ messages: [] })
      .append('messages', [message])
      .set({
        status: 'waitingOnVisitor',
        lastMessageAt: createdAt,
        lastTeamMessageAt: createdAt,
        lastMessagePreview: previewText(text),
      })

    if (thread._rev) {
      patch.ifRevisionId(thread._rev)
    }

    try {
      await patch.commit()
      return
    } catch (error) {
      thread = await fetchSlackBackedThreadById(thread._id)
      if ((thread?.messages || []).some((existingMessage) => existingMessage.slackMessageTs === message.slackMessageTs)) {
        return
      }

      if (attempt === 2) {
        console.error('Failed to append Slack chat event:', error)
      }
    }
  }
}

async function findSlackBackedThread(input: {
  channelId: string
  threadTs?: string
  isHubChannel: boolean
}) {
  const client = getChatSanityClient()
  if (!client) return null

  const projection = `{
    _id,
    _rev,
    status,
    messages[]{_key, _type, authorType, authorName, authorEmail, text, createdAt, slackUserId, slackMessageTs}
  }`

  if (input.isHubChannel) {
    if (!input.threadTs) return null
    return client.fetch<SlackBackedThread | null>(
      `*[_type == "chatThread" && slack.threadTs == $threadTs][0]${projection}`,
      { threadTs: input.threadTs },
    )
  }

  const byChannel = await client.fetch<SlackBackedThread | null>(
    `*[_type == "chatThread" && slack.channelId == $channelId][0]${projection}`,
    { channelId: input.channelId },
  )

  if (byChannel || !input.threadTs) return byChannel

  return client.fetch<SlackBackedThread | null>(
    `*[_type == "chatThread" && slack.threadTs == $threadTs][0]${projection}`,
    { threadTs: input.threadTs },
  )
}

async function fetchSlackBackedThreadById(threadId: string) {
  const client = getChatSanityClient()
  if (!client) return null

  return client.fetch<SlackBackedThread | null>(
    `*[_type == "chatThread" && _id == $threadId][0]{
      _id,
      _rev,
      status,
      messages[]{_key, _type, authorType, authorName, authorEmail, text, createdAt, slackUserId, slackMessageTs}
    }`,
    { threadId },
  )
}

function slackTimestampToIso(ts: string) {
  const seconds = Number(ts.split('.')[0])
  if (!Number.isFinite(seconds)) return new Date().toISOString()
  return new Date(seconds * 1000).toISOString()
}

function parseSlackEventPayload(rawBody: string) {
  try {
    return JSON.parse(rawBody) as SlackEventEnvelope
  } catch {
    return null
  }
}
