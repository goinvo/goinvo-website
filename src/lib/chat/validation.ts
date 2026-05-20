import type { ChatAttachment } from '@/lib/chat/attachments'

export const MAX_CHAT_MESSAGE_LENGTH = 2000
export const MAX_CHAT_NAME_LENGTH = 120
export const MAX_CHAT_EMAIL_LENGTH = 254

export type ChatAuthorType = 'visitor' | 'team' | 'system'
export type ChatFallbackKind = 'noResponse'

export interface SanityChatMessage {
  _key: string
  _type: 'chatMessage'
  authorType: ChatAuthorType
  authorName?: string
  authorEmail?: string
  text: string
  createdAt: string
  slackUserId?: string
  slackMessageTs?: string
  fallbackKind?: ChatFallbackKind
  attachments?: ChatAttachment[]
}

export interface PublicChatMessage {
  id: string
  authorType: 'visitor' | 'team'
  authorName?: string
  text: string
  createdAt: string
  attachments?: Pick<
    ChatAttachment,
    'filename' | 'contentType' | 'size' | 'uploadStatus' | 'slackPermalink'
  >[]
}

export function makeSanityKey() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

export function normalizeChatText(value: unknown) {
  if (typeof value !== 'string') return null

  const text = value.replace(/\r\n/g, '\n').trim()
  if (!text || text.length > MAX_CHAT_MESSAGE_LENGTH) return null

  return text
}

export function normalizeVisitorName(value: unknown) {
  if (typeof value !== 'string') return undefined

  const name = value.trim().replace(/\s+/g, ' ').slice(0, MAX_CHAT_NAME_LENGTH)
  return name || undefined
}

export function normalizeVisitorEmail(value: unknown) {
  if (typeof value !== 'string') return undefined

  const email = value.trim().toLowerCase().slice(0, MAX_CHAT_EMAIL_LENGTH)
  if (!email) return undefined

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function createChatMessage(input: {
  authorType: ChatAuthorType
  text: string
  createdAt?: string
  authorName?: string
  authorEmail?: string
  slackUserId?: string
  slackMessageTs?: string
  fallbackKind?: ChatFallbackKind
  attachments?: ChatAttachment[]
}): SanityChatMessage {
  return {
    _key: makeSanityKey(),
    _type: 'chatMessage',
    authorType: input.authorType,
    text: input.text,
    createdAt: input.createdAt || new Date().toISOString(),
    ...(input.authorName ? { authorName: input.authorName } : {}),
    ...(input.authorEmail ? { authorEmail: input.authorEmail } : {}),
    ...(input.slackUserId ? { slackUserId: input.slackUserId } : {}),
    ...(input.slackMessageTs ? { slackMessageTs: input.slackMessageTs } : {}),
    ...(input.fallbackKind ? { fallbackKind: input.fallbackKind } : {}),
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
  }
}

export function toPublicMessages(messages: SanityChatMessage[] | null | undefined): PublicChatMessage[] {
  return dedupeChatMessages(messages || [])
    .filter(
      (message): message is SanityChatMessage & { authorType: 'visitor' | 'team' } =>
        message.authorType === 'visitor' || message.authorType === 'team',
    )
    .map((message) => ({
      id: message._key,
      authorType: message.authorType,
      authorName: message.authorName,
      text: message.text,
      createdAt: message.createdAt,
      ...(message.attachments?.length
        ? {
            attachments: message.attachments.map((attachment) => ({
              filename: attachment.filename,
              contentType: attachment.contentType,
              size: attachment.size,
              uploadStatus: attachment.uploadStatus,
              slackPermalink: attachment.slackPermalink,
            })),
          }
        : {}),
    }))
}

export function dedupeChatMessages(messages: SanityChatMessage[]) {
  const seenSlackMessages = new Set<string>()

  return messages.filter((message) => {
    if (!message.slackMessageTs) return true
    if (seenSlackMessages.has(message.slackMessageTs)) return false
    seenSlackMessages.add(message.slackMessageTs)
    return true
  })
}

export function previewText(text: string, length = 180) {
  return text.length > length ? `${text.slice(0, length - 1)}...` : text
}

export function extractEmailAddress(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0].toLowerCase()
}

export function extractVisitorNameFromContactReply(text: string) {
  const compactText = text.replace(/\s+/g, ' ').trim()
  const match =
    compactText.match(/\bmy name is\s+([^@,.;!?]+)/i) ||
    compactText.match(/\b(?:i am|i'm)\s+([^@,.;!?]+)/i) ||
    compactText.match(/\bthis is\s+([^@,.;!?]+)/i)

  if (!match?.[1]) return undefined

  const candidate = match[1]
    .replace(/\s+(?:and|email|e-mail|at)\b.*$/i, '')
    .trim()

  if (!/[a-z]/i.test(candidate)) return undefined
  return normalizeVisitorName(candidate)
}
