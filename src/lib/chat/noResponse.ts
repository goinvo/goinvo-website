import { siteConfig } from '@/lib/config'
import type { SanityChatMessage } from '@/lib/chat/validation'

export type NoResponseFallbackVariant = 'withoutContact' | 'withoutEmail' | 'withEmail'

interface NoResponseThread {
  status?: string
  visitor?: { name?: string; email?: string }
  messages?: SanityChatMessage[]
  noResponseFallbackSentAt?: string
}

const closedStatuses = new Set(['resolved', 'spam', 'archived'])

export function getNoResponseFallback(thread: NoResponseThread, now = new Date()) {
  if (thread.noResponseFallbackSentAt) return null
  if (thread.status && closedStatuses.has(thread.status)) return null

  const messages = thread.messages || []
  if (messages.some((message) => message.fallbackKind === 'noResponse')) return null
  if (messages.some((message) => message.authorType === 'team' && message.fallbackKind !== 'noResponse')) return null

  const firstVisitorMessage = messages.find((message) => message.authorType === 'visitor')
  if (!firstVisitorMessage) return null

  const firstMessageTime = Date.parse(firstVisitorMessage.createdAt)
  if (!Number.isFinite(firstMessageTime)) return null

  const elapsedMs = now.getTime() - firstMessageTime
  if (elapsedMs < siteConfig.chat.noResponse.delayMs) return null

  const variant: NoResponseFallbackVariant = thread.visitor?.email
    ? 'withEmail'
    : thread.visitor?.name
      ? 'withoutEmail'
      : 'withoutContact'

  return {
    variant,
    text: siteConfig.chat.noResponse[variant],
  }
}
