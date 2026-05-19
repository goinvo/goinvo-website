import { NextRequest, NextResponse } from 'next/server'
import { getChatSanityClient } from '@/lib/chat/sanity'
import { isAllowedChatRequest } from '@/lib/chat/config'
import { applySlackFileUploadResult, completeSlackChatAttachmentUpload } from '@/lib/chat/slack'
import { toPublicMessages, type SanityChatMessage } from '@/lib/chat/validation'
import type { ChatAttachment } from '@/lib/chat/attachments'

export const dynamic = 'force-dynamic'

interface CompleteAttachmentBody {
  threadId?: unknown
  visitorKey?: unknown
  messageId?: unknown
  fileId?: unknown
}

interface PublicThread {
  _id: string
  title?: string
  status: string
  visitor?: { uid?: string; name?: string; email?: string }
  messages?: SanityChatMessage[]
  slack?: {
    channelId?: string
    threadTs?: string
    dedicatedChannel?: boolean
  }
}

const publicThreadQuery = `*[_type == "chatThread" && _id == $threadId && visitorKey == $visitorKey][0]{
  _id,
  title,
  status,
  visitor,
  messages,
  slack
}`

export async function POST(request: NextRequest) {
  if (!isAllowedChatRequest(request)) {
    return NextResponse.json({ error: 'Chat is not available from this origin' }, { status: 403 })
  }

  const client = getChatSanityClient()
  if (!client) {
    return NextResponse.json({ error: 'Chat is not configured' }, { status: 503 })
  }

  const body = (await request.json()) as CompleteAttachmentBody
  const threadId = typeof body.threadId === 'string' ? body.threadId : ''
  const visitorKey = typeof body.visitorKey === 'string' ? body.visitorKey : ''
  const messageId = typeof body.messageId === 'string' ? body.messageId : ''
  const fileId = typeof body.fileId === 'string' ? body.fileId : ''

  if (!threadId || !visitorKey || !messageId || !fileId) {
    return NextResponse.json({ error: 'Missing attachment upload details' }, { status: 400 })
  }

  const thread = await client.fetch<PublicThread | null>(publicThreadQuery, { threadId, visitorKey })
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
  }

  const message = (thread.messages || []).find((item) => item._key === messageId)
  const attachment = message?.attachments?.find((item) => item.slackFileId === fileId)
  if (!message || !attachment) {
    return NextResponse.json({ error: 'Attachment upload not found' }, { status: 404 })
  }

  const result = await completeSlackChatAttachmentUpload({
    attachment,
    fileId,
    channel: thread.slack?.channelId,
    threadTs: thread.slack?.dedicatedChannel ? undefined : thread.slack?.threadTs,
    initialComment: `Attachment from ${message.authorName || thread.visitor?.name || thread.visitor?.email || thread.visitor?.uid || 'visitor'}: ${attachment.filename}`,
  })

  const nextAttachment = applySlackFileUploadResult(attachment, result)
  const nextAttachments = (message.attachments || []).map((item): ChatAttachment =>
    item.slackFileId === fileId ? nextAttachment : item,
  )

  await client
    .patch(threadId)
    .set({
      [`messages[_key=="${messageId}"].attachments`]: nextAttachments,
    })
    .commit()

  const updated = await client.fetch<PublicThread | null>(publicThreadQuery, { threadId, visitorKey })
  return NextResponse.json(
    updated
      ? {
          threadId: updated._id,
          title: updated.title,
          status: updated.status,
          visitor: updated.visitor,
          messages: toPublicMessages(updated.messages),
        }
      : { error: 'Thread not found' },
    { status: updated ? 200 : 404 },
  )
}
