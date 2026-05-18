import { NextRequest, NextResponse } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { isAllowedChatRequest } from '@/lib/chat/config'
import { createChatAttachment, type ChatAttachment } from '@/lib/chat/attachments'
import { readChatRequestBody } from '@/lib/chat/request'
import {
  getNoResponseEmailDraft,
  isNoResponseEmailConfigured,
  sendNoResponseEmail,
} from '@/lib/chat/email'
import { getNoResponseFallback, type NoResponseFallbackVariant } from '@/lib/chat/noResponse'
import {
  createChatMessage,
  extractEmailAddress,
  extractVisitorNameFromContactReply,
  normalizeChatText,
  previewText,
  toPublicMessages,
  type SanityChatMessage,
} from '@/lib/chat/validation'
import {
  applySlackFileUploadResult,
  getSlackConfig,
  isSlackPostingConfigured,
  notifySlackVisitorReply,
  startSlackChatConversation,
  uploadSlackChatAttachment,
} from '@/lib/chat/slack'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ threadId: string }>
}

interface PublicThread {
  _id: string
  _rev?: string
  status: string
  visitor?: { name?: string; email?: string }
  messages?: SanityChatMessage[]
  source?: { pageUrl?: string }
  slack?: { channelId?: string; channelName?: string; threadTs?: string; dedicatedChannel?: boolean }
  noResponseFallbackSentAt?: string
  noResponseFallbackVariant?: NoResponseFallbackVariant
  noResponseEmailSentAt?: string
  noResponseEmailAttemptedAt?: string
  noResponseEmailProviderId?: string
  noResponseEmailLastError?: string
}

const publicThreadQuery = `*[_type == "chatThread" && _id == $threadId && visitorKey == $visitorKey][0]{
  _id,
  _rev,
  status,
  visitor,
  messages,
  source,
  slack,
  noResponseFallbackSentAt,
  noResponseFallbackVariant,
  noResponseEmailSentAt,
  noResponseEmailAttemptedAt,
  noResponseEmailProviderId,
  noResponseEmailLastError
}`

export async function GET(request: NextRequest, context: RouteContext) {
  if (!isAllowedChatRequest(request)) {
    return NextResponse.json({ error: 'Chat is not available from this origin' }, { status: 403 })
  }

  const client = getChatSanityClient()
  if (!client) {
    return NextResponse.json({ error: 'Chat is not configured' }, { status: 503 })
  }

  const { threadId } = await context.params
  const visitorKey = request.nextUrl.searchParams.get('visitorKey') || ''
  const thread = await client.fetch<PublicThread | null>(publicThreadQuery, { threadId, visitorKey })

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const threadWithFallback = await appendNoResponseFallbackIfDue(client, thread, visitorKey)
  const threadWithEmail = await sendNoResponseEmailIfDue(client, threadWithFallback, visitorKey)
  return NextResponse.json(toThreadResponse(threadWithEmail))
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAllowedChatRequest(request)) {
    return NextResponse.json({ error: 'Chat is not available from this origin' }, { status: 403 })
  }

  const client = getChatSanityClient()
  if (!client) {
    return NextResponse.json({ error: 'Chat is not configured' }, { status: 503 })
  }

  const { threadId } = await context.params
  const requestBody = await readChatRequestBody(request)
  if (requestBody.error) {
    return NextResponse.json({ error: requestBody.error }, { status: 400 })
  }

  if (requestBody.attachment && !isSlackPostingConfigured()) {
    return NextResponse.json({ error: 'Attachments require Slack to be configured' }, { status: 503 })
  }

  const body = requestBody.fields as { visitorKey?: unknown; message?: unknown }
  const visitorKey = typeof body.visitorKey === 'string' ? body.visitorKey : ''
  const messageText = normalizeChatText(body.message)

  if (!messageText && !requestBody.attachment) {
    return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 })
  }

  const thread = await client.fetch<PublicThread | null>(publicThreadQuery, { threadId, visitorKey })
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  if (thread.status === 'spam' || thread.status === 'archived') {
    return NextResponse.json({ error: 'Thread is closed' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const attachment = requestBody.attachment
  const chatAttachment = attachment ? createChatAttachment(attachment) : undefined
  const visibleMessageText = messageText || `Attached ${attachment?.filename}`
  const extractedEmail = thread.visitor?.email ? undefined : extractEmailAddress(visibleMessageText)
  const extractedName = thread.visitor?.name ? undefined : extractVisitorNameFromContactReply(visibleMessageText)
  const message = createChatMessage({
    authorType: 'visitor',
    authorName: thread.visitor?.name || extractedName,
    authorEmail: thread.visitor?.email || extractedEmail,
    text: visibleMessageText,
    createdAt: now,
    attachments: chatAttachment ? [chatAttachment] : undefined,
  })

  const patch = client
    .patch(threadId)
    .setIfMissing({ messages: [] })
    .append('messages', [message])
    .set({
      status: 'open',
      lastMessageAt: now,
      lastVisitorMessageAt: now,
      lastMessagePreview: previewText(visibleMessageText),
    })

  if (extractedEmail) {
    patch.setIfMissing({ visitor: {} }).set({ 'visitor.email': extractedEmail })
  }

  if (extractedName) {
    patch.setIfMissing({ visitor: {} }).set({ 'visitor.name': extractedName })
  }

  if (thread.status === 'resolved') {
    patch.unset(['resolvedAt'])
  }

  await patch.commit()

  if (thread.slack?.threadTs) {
    const isDedicatedSlackChannel = Boolean(
      thread.slack.dedicatedChannel ||
        (thread.slack.channelId && thread.slack.channelId !== getSlackConfig().channelId),
    )
    const slackReply = await notifySlackVisitorReply({
      threadId,
      channel: thread.slack.channelId,
      threadTs: thread.slack.threadTs,
      visitorName: thread.visitor?.name || extractedName,
      message: visibleMessageText,
      replyInThread: !isDedicatedSlackChannel,
    })

    if (attachment && chatAttachment) {
      const uploadResult = await uploadSlackChatAttachment({
        attachment,
        channel: thread.slack.channelId,
        threadTs: isDedicatedSlackChannel ? slackReply?.ts : thread.slack.threadTs,
        initialComment: `Attachment from ${thread.visitor?.name || extractedName || 'visitor'}: ${attachment.filename}`,
      })
      await setMessageAttachments(client, threadId, message._key, [
        applySlackFileUploadResult(chatAttachment, uploadResult),
      ])
    }
  } else {
    const slackResult = await startSlackChatConversation({
      threadId,
      visitorName: thread.visitor?.name || extractedName,
      visitorEmail: thread.visitor?.email || extractedEmail,
      message: visibleMessageText,
      pageUrl: thread.source?.pageUrl,
    })

    let uploadedAttachments: ChatAttachment[] | undefined
    if (slackResult && attachment && chatAttachment) {
      const uploadResult = await uploadSlackChatAttachment({
        attachment,
        channel: slackResult.channel,
        threadTs: slackResult.ts,
        initialComment: `Attachment from ${thread.visitor?.name || extractedName || 'visitor'}: ${attachment.filename}`,
      })
      uploadedAttachments = [applySlackFileUploadResult(chatAttachment, uploadResult)]
    } else if (chatAttachment) {
      uploadedAttachments = [
        {
          ...chatAttachment,
          uploadStatus: 'failed',
          error: 'Unable to start Slack thread for attachment',
        },
      ]
    }

    if (slackResult) {
      await client
        .patch(threadId)
        .set({
          slack: {
            channelId: slackResult.channel,
            ...(slackResult.channelName ? { channelName: slackResult.channelName } : {}),
            threadTs: slackResult.ts,
            dedicatedChannel: slackResult.dedicatedChannel,
            ...(slackResult.hubChannelId ? { hubChannelId: slackResult.hubChannelId } : {}),
            ...(slackResult.hubThreadTs ? { hubThreadTs: slackResult.hubThreadTs } : {}),
            lastPostAt: new Date().toISOString(),
          },
        })
        .commit()
    }

    if (uploadedAttachments) {
      await setMessageAttachments(client, threadId, message._key, uploadedAttachments)
    }
  }

  const updated = await client.fetch<PublicThread | null>(publicThreadQuery, { threadId, visitorKey })
  const updatedWithEmail = updated ? await sendNoResponseEmailIfDue(client, updated, visitorKey) : null
  return NextResponse.json(updatedWithEmail ? toThreadResponse(updatedWithEmail) : { error: 'Thread not found' }, {
    status: updatedWithEmail ? 200 : 404,
  })
}

async function setMessageAttachments(
  client: NonNullable<ReturnType<typeof getChatSanityClient>>,
  threadId: string,
  messageKey: string,
  attachments: ChatAttachment[],
) {
  await client
    .patch(threadId)
    .set({
      [`messages[_key=="${messageKey}"].attachments`]: attachments,
    })
    .commit()
}

async function appendNoResponseFallbackIfDue(
  client: NonNullable<ReturnType<typeof getChatSanityClient>>,
  thread: PublicThread,
  visitorKey: string,
) {
  const fallback = getNoResponseFallback(thread)
  if (!fallback) return thread

  const now = new Date().toISOString()
  const message = createChatMessage({
    authorType: 'team',
    authorName: 'GoInvo',
    text: fallback.text,
    createdAt: now,
    fallbackKind: 'noResponse',
  })

  const patch = client
    .patch(thread._id)
    .setIfMissing({ messages: [] })
    .append('messages', [message])
    .set({
      noResponseFallbackSentAt: now,
      noResponseFallbackVariant: fallback.variant,
      lastMessageAt: now,
      lastMessagePreview: previewText(fallback.text),
    })

  if (thread._rev) {
    patch.ifRevisionId(thread._rev)
  }

  try {
    await patch.commit()
  } catch (error) {
    console.error('Failed to append no-response chat fallback:', error)
  }

  return (await client.fetch<PublicThread | null>(publicThreadQuery, {
    threadId: thread._id,
    visitorKey,
  })) || thread
}

async function sendNoResponseEmailIfDue(
  client: NonNullable<ReturnType<typeof getChatSanityClient>>,
  thread: PublicThread,
  visitorKey: string,
) {
  if (!isNoResponseEmailConfigured()) return thread

  const draft = getNoResponseEmailDraft(thread)
  if (!draft) return thread

  const attemptedAt = new Date().toISOString()
  const claimPatch = client
    .patch(thread._id)
    .set({
      noResponseEmailAttemptedAt: attemptedAt,
    })
    .unset(['noResponseEmailLastError'])

  if (thread._rev) {
    claimPatch.ifRevisionId(thread._rev)
  }

  try {
    await claimPatch.commit()
  } catch (error) {
    console.error('Failed to claim no-response email send:', error)
    return (await client.fetch<PublicThread | null>(publicThreadQuery, {
      threadId: thread._id,
      visitorKey,
    })) || thread
  }

  const result = await sendNoResponseEmail(draft)
  const completePatch = client.patch(thread._id)

  if (result.ok) {
    completePatch
      .set({
        noResponseEmailSentAt: new Date().toISOString(),
        noResponseEmailProviderId: result.id,
      })
      .unset(['noResponseEmailLastError'])
  } else {
    completePatch.set({
      noResponseEmailLastError: result.error,
    })
  }

  await completePatch.commit()

  return (await client.fetch<PublicThread | null>(publicThreadQuery, {
    threadId: thread._id,
    visitorKey,
  })) || thread
}

function toThreadResponse(thread: PublicThread) {
  return {
    threadId: thread._id,
    status: thread.status,
    visitor: thread.visitor,
    messages: toPublicMessages(thread.messages),
  }
}
