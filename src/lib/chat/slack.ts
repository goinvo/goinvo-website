import { createHmac, timingSafeEqual } from 'crypto'
import type { ChatAttachment, ChatAttachmentMetadata, ValidatedChatAttachment } from '@/lib/chat/attachments'

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
  needed?: string
  provided?: string
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
  needed?: string
  provided?: string
}

interface SlackCompleteUploadResponse {
  ok: boolean
  files?: {
    id?: string
    title?: string
    permalink?: string
    permalink_public?: string
    url_private?: string
  }[]
  error?: string
  needed?: string
  provided?: string
}

interface SlackCreateConversationResponse {
  ok: boolean
  channel?: {
    id?: string
    name?: string
  }
  error?: string
  needed?: string
  provided?: string
}

interface SlackConversationMessagesResponse {
  ok: boolean
  messages?: SlackConversationMessage[]
  error?: string
  needed?: string
  provided?: string
}

interface SlackConversationMessage {
  type?: string
  subtype?: string
  channel?: string
  user?: string
  bot_id?: string
  text?: string
  ts?: string
  thread_ts?: string
}

export interface SlackPostResult {
  channel: string
  ts: string
}

export interface SlackConversationStartResult extends SlackPostResult {
  channelName?: string
  dedicatedChannel: boolean
  hubChannelId?: string
  hubThreadTs?: string
}

export type SlackFileUploadResult =
  | {
      ok: true
      fileId: string
      title?: string
      permalink?: string
      permalinkPublic?: string
      privateUrl?: string
    }
  | { ok: false; error: string }

export type SlackFileUploadPrepareResult =
  | { ok: true; uploadUrl: string; fileId: string }
  | { ok: false; error: string }

export interface SlackTeamReply {
  channel: string
  user?: string
  text: string
  ts: string
  threadTs?: string
}

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
    console.error('Slack chat.postMessage failed:', formatSlackApiError(data, response.statusText))
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

export function getChatThreadStudioPath(threadId: string) {
  return `/studio/intent/edit/id=${encodeURIComponent(threadId)};type=chatThread`
}

export function getChatThreadStudioUrl(threadId: string, baseUrl?: string) {
  const path = getChatThreadStudioPath(threadId)
  const resolvedBaseUrl = getStudioBaseUrl(baseUrl)
  return resolvedBaseUrl ? new URL(path, resolvedBaseUrl).toString() : path
}

export function getSlackChannelPing() {
  return process.env.CHAT_SLACK_CHANNEL_PING || '<!here>'
}

export function getDedicatedSlackChannelsEnabled() {
  return process.env.CHAT_SLACK_DEDICATED_CHANNELS !== 'false'
}

export function buildSlackConversationChannelName(input: {
  threadId: string
  visitorName?: string
  visitorEmail?: string
}) {
  const visitor = input.visitorName || input.visitorEmail?.split('@')[0] || 'visitor'
  const visitorSlug = visitor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'visitor'
  const threadSlug = input.threadId
    .replace(/^chatThread\./, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .slice(0, 8)

  return `website-chat-${visitorSlug}-${threadSlug}`.slice(0, 80).replace(/-+$/g, '')
}

export async function createSlackConversationChannel(input: {
  threadId: string
  visitorName?: string
  visitorEmail?: string
}) {
  const config = getSlackConfig()
  if (!config.botToken || !getDedicatedSlackChannelsEnabled()) return null

  const baseName = buildSlackConversationChannelName(input)
  const fallbackName = `${baseName.slice(0, 74)}-${Date.now().toString(36).slice(-5)}`.slice(0, 80)

  for (const name of [baseName, fallbackName]) {
    const response = await fetch('https://slack.com/api/conversations.create', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.botToken}`,
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        name,
        is_private: false,
      }),
    })

    const data = (await response.json()) as SlackCreateConversationResponse
    if (response.ok && data.ok && data.channel?.id) {
      return {
        id: data.channel.id,
        name: data.channel.name || name,
      }
    }

    if (data.error === 'name_taken' && name === baseName) {
      continue
    }

    console.error('Slack conversations.create failed:', formatSlackApiError(data, response.statusText))
    return null
  }

  return null
}

export async function notifySlackHubNewConversation(input: {
  threadId: string
  conversationChannelId: string
  conversationChannelName?: string
  visitorName?: string
  visitorEmail?: string
  message: string
  pageUrl?: string
  studioBaseUrl?: string
}) {
  const visitor = input.visitorName || input.visitorEmail || 'Anonymous visitor'
  const page = input.pageUrl ? `<${escapeSlack(input.pageUrl)}|source page>` : 'the website'
  const ping = getSlackChannelPing()
  const channelLabel = input.conversationChannelName
    ? `<#${input.conversationChannelId}|${escapeSlack(input.conversationChannelName)}>`
    : `<#${input.conversationChannelId}>`

  return postSlackMessage({
    text: `${ping} New GoInvo website chat from ${visitor} in ${channelLabel}: ${input.message}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${ping} *New website chat from ${escapeSlack(visitor)}*\nJoin ${channelLabel} to answer the website visitor.`,
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
            url: getChatThreadStudioUrl(input.threadId, input.studioBaseUrl),
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

export async function startSlackChatConversation(input: {
  threadId: string
  visitorName?: string
  visitorEmail?: string
  message: string
  pageUrl?: string
  studioBaseUrl?: string
}): Promise<SlackConversationStartResult | null> {
  const conversationChannel = await createSlackConversationChannel(input)
  const hubResult = conversationChannel
    ? await notifySlackHubNewConversation({
        ...input,
        conversationChannelId: conversationChannel.id,
        conversationChannelName: conversationChannel.name,
      })
    : null

  const firstMessage = await notifySlackNewThread({
    ...input,
    channel: conversationChannel?.id,
    replyTarget: conversationChannel ? 'channel' : 'thread',
  })

  if (!firstMessage) return null

  return {
    ...firstMessage,
    channelName: conversationChannel?.name,
    dedicatedChannel: Boolean(conversationChannel),
    hubChannelId: hubResult?.channel,
    hubThreadTs: hubResult?.ts,
  }
}

export async function notifySlackNewThread(input: {
  channel?: string
  threadId: string
  visitorName?: string
  visitorEmail?: string
  message: string
  pageUrl?: string
  studioBaseUrl?: string
  replyTarget?: 'channel' | 'thread'
}) {
  const visitor = input.visitorName || input.visitorEmail || 'Anonymous visitor'
  const page = input.pageUrl ? `<${escapeSlack(input.pageUrl)}|source page>` : 'the website'
  const ping = getSlackChannelPing()
  const text = `${ping} New GoInvo website chat from ${visitor}: ${input.message}`
  const replyInstruction =
    input.replyTarget === 'channel'
      ? 'Reply in this Slack channel to answer the website visitor.'
      : 'Reply in this Slack thread to answer the website visitor.'

  return postSlackMessage({
    channel: input.channel,
    text,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${ping} *New website chat from ${escapeSlack(visitor)}*\n${replyInstruction}`,
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
            url: getChatThreadStudioUrl(input.threadId, input.studioBaseUrl),
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
  channel?: string
  threadTs?: string
  visitorName?: string
  message: string
  replyInThread?: boolean
}) {
  const visitor = input.visitorName || 'Visitor'
  const ping = getSlackChannelPing()
  const shouldReplyInThread = input.replyInThread !== false && Boolean(input.threadTs)

  return postSlackMessage({
    channel: input.channel,
    threadTs: shouldReplyInThread ? input.threadTs : undefined,
    replyBroadcast: shouldReplyInThread ? true : undefined,
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

export async function fetchSlackTeamReplies(input: {
  channel: string
  threadTs?: string
  dedicatedChannel?: boolean
  oldestTs?: string
}) {
  const replies: SlackTeamReply[] = []
  const shouldFetchChannelMessages = input.dedicatedChannel || !input.threadTs

  if (shouldFetchChannelMessages) {
    replies.push(
      ...(await fetchSlackMessages('conversations.history', {
        channel: input.channel,
        ...(input.oldestTs ? { oldest: input.oldestTs } : {}),
        limit: '50',
      })),
    )
  }

  if (input.threadTs) {
    replies.push(
      ...(await fetchSlackMessages('conversations.replies', {
        channel: input.channel,
        ts: input.threadTs,
        ...(input.oldestTs ? { oldest: input.oldestTs } : {}),
        limit: '50',
      })),
    )
  }

  return sortUniqueSlackReplies(replies)
}

export async function uploadSlackChatAttachment(input: {
  attachment: ValidatedChatAttachment
  channel?: string
  threadTs?: string
  initialComment?: string
}): Promise<SlackFileUploadResult> {
  const prepared = await prepareSlackChatAttachmentUpload({ attachment: input.attachment })
  if (!prepared.ok) return prepared

  return uploadPreparedSlackChatAttachment({
    ...input,
    uploadUrl: prepared.uploadUrl,
    fileId: prepared.fileId,
  })
}

export async function prepareSlackChatAttachmentUpload(input: {
  attachment: ChatAttachmentMetadata
}): Promise<SlackFileUploadPrepareResult> {
  const config = getSlackConfig()
  if (!config.botToken) {
    return { ok: false, error: 'Slack file uploads are not configured' }
  }

  const params = new URLSearchParams({
    filename: input.attachment.filename,
    length: String(input.attachment.size),
    alt_txt: input.attachment.filename,
  })

  const uploadUrlResponse = await fetch('https://slack.com/api/files.getUploadURLExternal', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.botToken}`,
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: params,
  })

  const uploadUrlData = (await uploadUrlResponse.json()) as SlackUploadUrlResponse
  if (!uploadUrlResponse.ok || !uploadUrlData.ok || !uploadUrlData.upload_url || !uploadUrlData.file_id) {
    const error = formatSlackApiError(uploadUrlData, uploadUrlResponse.statusText || 'Unable to get Slack upload URL')
    console.error('Slack files.getUploadURLExternal failed:', error)
    return {
      ok: false,
      error,
    }
  }

  return {
    ok: true,
    uploadUrl: uploadUrlData.upload_url,
    fileId: uploadUrlData.file_id,
  }
}

export async function uploadPreparedSlackChatAttachment(input: {
  attachment: ValidatedChatAttachment
  uploadUrl: string
  fileId: string
  channel?: string
  threadTs?: string
  initialComment?: string
}): Promise<SlackFileUploadResult> {
  const uploadResponse = await fetch(input.uploadUrl, {
    method: 'POST',
    headers: {
      'content-type': input.attachment.contentType,
    },
    body: Buffer.from(await input.attachment.file.arrayBuffer()),
  })

  if (!uploadResponse.ok) {
    console.error('Slack file binary upload failed:', uploadResponse.statusText || uploadResponse.status)
    return { ok: false, error: uploadResponse.statusText || 'Unable to upload file to Slack' }
  }

  return completeSlackChatAttachmentUpload(input)
}

export async function completeSlackChatAttachmentUpload(input: {
  attachment: ChatAttachmentMetadata
  fileId: string
  channel?: string
  threadTs?: string
  initialComment?: string
}): Promise<SlackFileUploadResult> {
  const config = getSlackConfig()
  const channel = input.channel || config.channelId
  if (!config.botToken || !channel) {
    return { ok: false, error: 'Slack file uploads are not configured' }
  }

  const params = new URLSearchParams({
    channel_id: channel,
    files: JSON.stringify([{ id: input.fileId, title: input.attachment.filename }]),
  })
  if (input.threadTs) params.set('thread_ts', input.threadTs)
  if (input.initialComment) params.set('initial_comment', input.initialComment)

  const completeResponse = await fetch('https://slack.com/api/files.completeUploadExternal', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.botToken}`,
      'content-type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: params,
  })

  const completeData = (await completeResponse.json()) as SlackCompleteUploadResponse
  if (!completeResponse.ok || !completeData.ok) {
    const error = formatSlackApiError(completeData, completeResponse.statusText || 'Unable to complete Slack file upload')
    console.error('Slack files.completeUploadExternal failed:', error)
    return {
      ok: false,
      error,
    }
  }

  return {
    ok: true,
    fileId: completeData.files?.[0]?.id || input.fileId,
    title: completeData.files?.[0]?.title || input.attachment.filename,
    permalink: completeData.files?.[0]?.permalink,
    permalinkPublic: completeData.files?.[0]?.permalink_public,
    privateUrl: completeData.files?.[0]?.url_private,
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
      ...(result.permalink ? { slackPermalink: result.permalink } : {}),
      ...(result.permalinkPublic ? { slackPermalinkPublic: result.permalinkPublic } : {}),
      ...(result.privateUrl ? { slackPrivateUrl: result.privateUrl } : {}),
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

async function fetchSlackMessages(method: 'conversations.history' | 'conversations.replies', params: Record<string, string>) {
  const { botToken } = getSlackConfig()
  if (!botToken) return []

  const response = await fetch(`https://slack.com/api/${method}?${new URLSearchParams(params).toString()}`, {
    headers: {
      authorization: `Bearer ${botToken}`,
    },
  })

  const data = (await response.json()) as SlackConversationMessagesResponse
  if (!response.ok || !data.ok) {
    console.error(`Slack ${method} failed:`, formatSlackApiError(data, response.statusText))
    return []
  }

  return (data.messages || [])
    .filter(isSlackTeamReply)
    .map((message) => ({
      channel: message.channel || params.channel,
      user: message.user,
      text: message.text || '',
      ts: message.ts || '',
      threadTs: message.thread_ts,
    }))
}

function isSlackTeamReply(message: SlackConversationMessage): message is SlackConversationMessage & { text: string; ts: string } {
  return Boolean(
    message.type === 'message' &&
      !message.subtype &&
      !message.bot_id &&
      message.text &&
      message.ts,
  )
}

function sortUniqueSlackReplies(replies: SlackTeamReply[]) {
  const byTs = new Map<string, SlackTeamReply>()
  replies.forEach((reply) => {
    if (reply.ts) byTs.set(reply.ts, reply)
  })
  return [...byTs.values()].sort((first, second) => Number(first.ts) - Number(second.ts))
}

function getStudioBaseUrl(baseUrl: string | undefined) {
  const value = baseUrl || process.env.CHAT_STUDIO_BASE_URL || process.env.NEXT_PUBLIC_SANITY_STUDIO_URL
  if (!value) return undefined

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    if (url.pathname === '/studio' || url.pathname.endsWith('/studio/')) {
      return url.origin
    }
    return url.origin
  } catch {
    return undefined
  }
}

function formatSlackApiError(
  data: { error?: string; needed?: string; provided?: string } | null | undefined,
  fallback: string,
) {
  const error = data?.error || fallback
  const details = [
    data?.needed ? `needed: ${data.needed}` : undefined,
    data?.provided ? `provided: ${data.provided}` : undefined,
  ].filter(Boolean)

  return details.length ? `${error} (${details.join('; ')})` : error
}
