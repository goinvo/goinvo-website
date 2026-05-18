import { NextRequest, NextResponse } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { getSlackConfig, getSlackUserDisplayName, verifySlackRequest } from '@/lib/chat/slack'
import { createChatMessage, normalizeChatText, previewText, type SanityChatMessage } from '@/lib/chat/validation'

export const dynamic = 'force-dynamic'

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
  if (!event.text || !event.ts || !event.thread_ts) return
  if (event.ts === event.thread_ts) return

  const { channelId } = getSlackConfig()
  if (channelId && event.channel !== channelId) return

  const text = normalizeChatText(event.text)
  if (!text) return

  const client = getChatSanityClient()
  if (!client) return

  const thread = await client.fetch<SlackBackedThread | null>(
    `*[_type == "chatThread" && slack.threadTs == $threadTs][0]{
      _id,
      status,
      messages[]{_key, _type, authorType, authorName, authorEmail, text, createdAt, slackUserId, slackMessageTs}
    }`,
    { threadTs: event.thread_ts },
  )

  if (!thread || thread.status === 'spam' || thread.status === 'archived') return
  if ((thread.messages || []).some((message) => message.slackMessageTs === event.ts)) return

  const createdAt = slackTimestampToIso(event.ts)
  const authorName = await getSlackUserDisplayName(event.user)
  const message = createChatMessage({
    authorType: 'team',
    authorName: authorName || 'GoInvo',
    text,
    createdAt,
    slackUserId: event.user,
    slackMessageTs: event.ts,
  })

  await client
    .patch(thread._id)
    .setIfMissing({ messages: [] })
    .append('messages', [message])
    .set({
      status: 'waitingOnVisitor',
      lastMessageAt: createdAt,
      lastTeamMessageAt: createdAt,
      lastMessagePreview: previewText(text),
    })
    .commit()
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
