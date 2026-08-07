import { NextRequest, NextResponse } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { getSlackConfig, getSlackUserDisplayName, verifySlackRequest } from '@/lib/chat/slack'
import { createChatMessage, normalizeChatText, previewText, type SanityChatMessage } from '@/lib/chat/validation'
import { appendDisputeNoteFromSlack } from '@/lib/shop/disputeChat'

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

async function handleSlackEvent(event: SlackMessageEvent) {
  if (event.type !== 'message') return
  if (event.subtype || event.bot_id) return
  if (!event.text || !event.ts || !event.channel) return

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
