import { createHmac, timingSafeEqual } from 'crypto'
import { siteConfig } from '@/lib/config'
import type { ChatAttachment, ValidatedChatAttachment } from '@/lib/chat/attachments'

type SlackBlock = Record<string, unknown>

interface SlackPostMessageInput {
  channel?: string
  text: string
  blocks?: SlackBlock[]
  threadTs?: string
  replyBroadcast?: boolean
}

interface SlackPostMessageResponse {
  ok: boolean
  channel?: string
  ts?: string
  error?: string
}

interface SlackUserInfoResponse {
  ok: boolean
  user?: {
    name?: string
    real_name?: string
    profile?: {
      display_name?: string
      real_name?: string
    }
  }
  error?: string
}

interface SlackUploadUrlResponse {
  ok: boolean
  upload_url?: string
  file_id?: string
  error?: string
}

interface SlackCompleteUploadResponse {
  ok: boolean
  files?: { id?: string; title?: string }[]
  error?: string
}

export interface SlackPostResult {
  channel: string
  ts: string
}

export type SlackFileUploadResult =
  | { ok: true; fileId: string; title?: string }
  | { ok: false; error: string }

export function getSlackConfig() {
  return {
    botToken: process.env.SLACK_BOT_TOKEN || '',
    channelId: process.env.SLACK_CHAT_CHANNEL_ID || process.env.SLACK_CHANNEL_ID || '',
    signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  }
}

export function isSlackPostingConfigured() {
  const config = getSlackConfig()
  return Boolean(config.botToken && config.channelId)
}

export function verifySlackRequest(headers: Headers, rawBody: string, now = Date.now()) {
  const { signingSecret } = getSlackConfig()
  if (!signingSecret) return false

  const timestamp = headers.get('x-slack-request-timestamp')
  const signature = headers.get('x-slack-signature')
  if (!timestamp || !signature) return false

  const requestTime = Number(timestamp)
  if (!Number.isFinite(requestTime)) return false
  if (Math.abs(Math.floor(now / 1000) - requestTime) > 60 * 5) return false

  const baseString = `v0:${timestamp}:${rawBody}`
  const expected = `v0=${createHmac('sha256', signingSecret).update(baseString).digest('hex')}`

  return secureCompare(signature, expected)
}

export async function postSlackMessage(input: SlackPostMessageInput): Promise<SlackPostResult | null> {
  const config = getSlackConfig()
  const channel = input.channel || config.channelId

  if (!config.botToken || !channel) return null

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.botToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel,
      text: input.text,
      ...(input.blocks ? { blocks: input.blocks } : {}),
      ...(input.threadTs ? { thread_ts: input.threadTs } : {}),
      ...(input.replyBroadcast ? { reply_broadcast: true } : {}),
    }),
  })

  const data = (await response.json()) as SlackPostMessageResponse
  if (!response.ok || !data.ok || !data.channel || !data.ts) {
    console.error('Slack chat.postMessage failed:', data.error || response.statusText)
    return null
  }

  return { channel: data.channel, ts: data.ts }
}

export async function getSlackUserDisplayName(userId: string | undefined) {
  const { botToken } = getSlackConfig()
  if (!botToken || !userId) return undefined

  const response = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`, {
    headers: {
      authorization: `Bearer ${botToken}`,
    },
  })

  const data = (await response.json()) as SlackUserInfoResponse
  if (!response.ok || !data.ok || !data.user) {
    if (data.error !== 'missing_scope') {
      console.error('Slack users.info failed:', data.error || response.statusText)
    }
    return undefined
  }

  return (
    data.user.profile?.display_name ||
    data.user.profile?.real_name ||
    data.user.real_name ||
    data.user.name ||
    undefined
  )
}

export function getChatThreadStudioUrl(threadId: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, '')
  return `${baseUrl}/studio/intent/edit/id=${encodeURIComponent(threadId)};type=chatThread`
}

export function getSlackChannelPing() {
  return process.env.CHAT_SLACK_CHANNEL_PING || '<!here>'
}

export async function notifySlackNewThread(input: {
  threadId: string
  visitorName?: string
  visitorEmail?: string
  message: string
  pageUrl?: string
}) {
  const visitor = input.visitorName || input.visitorEmail || 'Anonymous visitor'
  const page = input.pageUrl ? `<${escapeSlack(input.pageUrl)}|source page>` : 'the website'
  const ping = getSlackChannelPing()
  const text = `${ping} New GoInvo website chat from ${visitor}: ${input.message}`

  return postSlackMessage({
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${ping} *New website chat from ${escapeSlack(visitor)}*\nReply in this Slack thread to answer the website visitor.`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `From ${page}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*First message:*\n>${escapeSlack(input.message)}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Open in CMS' },
            url: getChatThreadStudioUrl(input.threadId),
            action_id: 'goinvo_chat_open_cms',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Mark resolved' },
            style: 'primary',
            value: input.threadId,
            action_id: 'goinvo_chat_mark_resolved',
          },
        ],
      },
    ],
  })
}

export async function notifySlackVisitorReply(input: {
  threadId: string
  threadTs: string
  visitorName?: string
  message: string
}) {
  const visitor = input.visitorName || 'Visitor'
  const ping = getSlackChannelPing()

  return postSlackMessage({
    threadTs: input.threadTs,
    replyBroadcast: true,
    text: `${ping} New website chat reply from ${visitor}: ${input.message}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${ping} *New website chat reply from ${escapeSlack(visitor)}*\n>${escapeSlack(input.message)}`,
        },
      },
    ],
  })
}

export async function uploadSlackChatAttachment(input: {
  attachment: ValidatedChatAttachment
  channel?: string
  threadTs: string
  initialComment?: string
}): Promise<SlackFileUploadResult> {
  const config = getSlackConfig()
  const channel = input.channel || config.channelId
  if (!config.botToken || !channel) {
    return { ok: false, error: 'Slack file uploads are not configured' }
  }

  const uploadUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.botToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      filename: input.attachment.filename,
      length: input.attachment.size,
      alt_txt: input.attachment.filename,
    }),
  })

  const uploadUrlData = (await uploadUrlResponse.json()) as SlackUploadUrlResponse
  if (!uploadUrlResponse.ok || !uploadUrlData.ok || !uploadUrlData.upload_url || !uploadUrlData.file_id) {
    return {
      ok: false,
      error: uploadUrlData.error || uploadUrlResponse.statusText || 'Unable to get Slack upload URL',
    }
  }

  const uploadResponse = await fetch(uploadUrlData.upload_url, {
    method: 'POST',
    headers: {
      'content-type': input.attachment.contentType,
    },
    body: Buffer.from(await input.attachment.file.arrayBuffer()),
  })

  if (!uploadResponse.ok) {
    return { ok: false, error: uploadResponse.statusText || 'Unable to upload file to Slack' }
  }

  const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.botToken}`,
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel_id: channel,
      thread_ts: input.threadTs,
      initial_comment: input.initialComment,
      files: [{ id: uploadUrlData.file_id, title: input.attachment.filename }],
    }),
  })

  const completeData = (await completeResponse.json()) as SlackCompleteUploadResponse
  if (!completeResponse.ok || !completeData.ok) {
    return {
      ok: false,
      error: completeData.error || completeResponse.statusText || 'Unable to complete Slack file upload',
    }
  }

  return {
    ok: true,
    fileId: completeData.files?.[0]?.id || uploadUrlData.file_id,
    title: completeData.files?.[0]?.title || input.attachment.filename,
  }
}

export function applySlackFileUploadResult(
  attachment: ChatAttachment,
  result: SlackFileUploadResult,
): ChatAttachment {
  if (result.ok) {
    return {
      ...attachment,
      uploadStatus: 'uploaded',
      slackFileId: result.fileId,
      ...(result.title ? { slackFileTitle: result.title } : {}),
    }
  }

  return {
    ...attachment,
    uploadStatus: 'failed',
    error: result.error,
  }
}

function secureCompare(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(actualBuffer, expectedBuffer)
}

function escapeSlack(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
