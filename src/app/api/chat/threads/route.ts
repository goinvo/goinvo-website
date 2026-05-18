import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { isAllowedChatRequest } from '@/lib/chat/config'
import { createChatAttachment, validateChatAttachmentMetadata } from '@/lib/chat/attachments'
import { readChatRequestBody } from '@/lib/chat/request'
import {
  createChatMessage,
  normalizeChatText,
  normalizeVisitorEmail,
  normalizeVisitorName,
  previewText,
  toPublicMessages,
  type SanityChatMessage,
} from '@/lib/chat/validation'
import {
  applySlackFileUploadResult,
  isSlackPostingConfigured,
  prepareSlackChatAttachmentUpload,
  startSlackChatConversation,
  uploadSlackChatAttachment,
} from '@/lib/chat/slack'

export const dynamic = 'force-dynamic'

interface CreateThreadBody {
  name?: unknown
  email?: unknown
  message?: unknown
  pageUrl?: unknown
  pageTitle?: unknown
  referrer?: unknown
  sessionId?: unknown
  language?: unknown
  website?: unknown
  attachment?: unknown
}

interface CreatedChatThread {
  _id: string
  status: string
  visitor?: { name?: string; email?: string }
  messages?: SanityChatMessage[]
}

export async function POST(request: NextRequest) {
  if (!isAllowedChatRequest(request)) {
    return NextResponse.json({ error: 'Chat is not available from this origin' }, { status: 403 })
  }

  const client = getChatSanityClient()
  if (!client) {
    return NextResponse.json({ error: 'Chat is not configured' }, { status: 503 })
  }

  const requestBody = await readChatRequestBody(request)
  if (requestBody.error) {
    return NextResponse.json({ error: requestBody.error }, { status: 400 })
  }

  const body = requestBody.fields as CreateThreadBody
  const pendingAttachmentResult = requestBody.attachment ? {} : validateChatAttachmentMetadata(body.attachment)
  if (pendingAttachmentResult.error) {
    return NextResponse.json({ error: pendingAttachmentResult.error }, { status: 400 })
  }

  const pendingAttachment = pendingAttachmentResult.attachment

  if ((requestBody.attachment || pendingAttachment) && !isSlackPostingConfigured()) {
    return NextResponse.json({ error: 'Attachments require Slack to be configured' }, { status: 503 })
  }

  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ error: 'Unable to start chat' }, { status: 400 })
  }

  const messageText = normalizeChatText(body.message)
  if (!messageText && !requestBody.attachment && !pendingAttachment) {
    return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 })
  }

  const visitorName = normalizeVisitorName(body.name)
  const visitorEmail = normalizeVisitorEmail(body.email)
  if (visitorEmail === null) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const threadId = `chatThread.${crypto.randomUUID()}`
  const visitorKey = crypto.randomUUID()
  const attachment = requestBody.attachment
  const chatAttachment = attachment
    ? createChatAttachment(attachment, 'pending', 'inline')
    : pendingAttachment
      ? createChatAttachment(pendingAttachment, 'pending', 'slack')
      : undefined
  const visibleMessageText = messageText || `Attached ${attachment?.filename || pendingAttachment?.filename}`
  const message = createChatMessage({
    authorType: 'visitor',
    authorName: visitorName,
    authorEmail: visitorEmail,
    text: visibleMessageText,
    createdAt: now,
    attachments: chatAttachment ? [chatAttachment] : undefined,
  })

  const source = {
    ...(asUrl(body.pageUrl) ? { pageUrl: asUrl(body.pageUrl) } : {}),
    ...(asString(body.pageTitle, 180) ? { pageTitle: asString(body.pageTitle, 180) } : {}),
    ...(asUrl(body.referrer) ? { referrer: asUrl(body.referrer) } : {}),
    ...(request.headers.get('user-agent') ? { userAgent: request.headers.get('user-agent') || undefined } : {}),
    ...(asString(body.language, 40) ? { language: asString(body.language, 40) } : {}),
    ...(hashIp(getClientIp(request)) ? { ipHash: hashIp(getClientIp(request)) } : {}),
  }

  const title = buildThreadTitle(visitorName, visitorEmail, visibleMessageText)
  const thread = (await client.create({
    _id: threadId,
    _type: 'chatThread',
    title,
    status: 'new',
    visitorKey,
    sessionId: asString(body.sessionId, 120),
    visitor: {
      ...(visitorName ? { name: visitorName } : {}),
      ...(visitorEmail ? { email: visitorEmail } : {}),
    },
    source,
    messages: [message],
    firstMessageAt: now,
    lastMessageAt: now,
    lastVisitorMessageAt: now,
    lastMessagePreview: previewText(visibleMessageText),
  })) as CreatedChatThread

  const slackResult = await startSlackChatConversation({
    threadId,
    visitorName,
    visitorEmail: visitorEmail || undefined,
    message: visibleMessageText,
    pageUrl: source.pageUrl,
    studioBaseUrl: request.nextUrl.origin,
  })

  let responseMessages = [message]
  let directUpload: DirectUploadResponse | undefined

  if (slackResult) {
    if (attachment && chatAttachment) {
      const uploadResult = await uploadSlackChatAttachment({
        attachment,
        channel: slackResult.channel,
        threadTs: slackResult.ts,
        initialComment: `Attachment from ${visitorName || visitorEmail || 'visitor'}: ${attachment.filename}`,
      })
      responseMessages = [
        {
          ...message,
          attachments: [applySlackFileUploadResult(chatAttachment, uploadResult)],
        },
      ]
    } else if (pendingAttachment && chatAttachment) {
      const prepared = await prepareSlackChatAttachmentUpload({ attachment: pendingAttachment })
      responseMessages = [
        {
          ...message,
          attachments: [
            prepared.ok
              ? {
                  ...chatAttachment,
                  slackFileId: prepared.fileId,
                }
              : {
                  ...chatAttachment,
                  uploadStatus: 'failed',
                  error: prepared.error,
                },
          ],
        },
      ]
      if (prepared.ok) {
        directUpload = {
          uploadUrl: prepared.uploadUrl,
          fileId: prepared.fileId,
          messageId: message._key,
        }
      }
    }

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
        messages: responseMessages,
      })
      .commit()
  } else if (chatAttachment) {
    responseMessages = [
      {
        ...message,
        attachments: [
          {
            ...chatAttachment,
            uploadStatus: 'failed',
            error: 'Unable to start Slack thread for attachment',
          },
        ],
      },
    ]
    await client.patch(threadId).set({ messages: responseMessages }).commit()
  }

  return NextResponse.json({
    threadId: thread._id,
    visitorKey,
    status: thread.status,
    visitor: thread.visitor,
    messages: toPublicMessages(responseMessages),
    ...(directUpload ? { directUpload } : {}),
  })
}

interface DirectUploadResponse {
  uploadUrl: string
  fileId: string
  messageId: string
}

function buildThreadTitle(name: string | undefined, email: string | undefined, message: string) {
  const visitor = name || email || 'Anonymous visitor'
  return `${visitor}: ${previewText(message, 80)}`
}

function asString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text ? text.slice(0, maxLength) : undefined
}

function asUrl(value: unknown) {
  const text = asString(value, 2048)
  if (!text) return undefined

  try {
    const url = new URL(text)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  )
}

function hashIp(ip: string | undefined) {
  const salt = process.env.CHAT_IP_HASH_SALT
  if (!ip || !salt) return undefined
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}
