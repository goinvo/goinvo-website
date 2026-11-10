import { siteConfig } from '@/lib/config'
import type { SanityChatMessage } from '@/lib/chat/validation'
import { presetAwaitsTeam } from '@/lib/chat/presets'

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
  if (messages.some((message) => message.authorType === 'team' && !message.fallbackKind)) return null

  const firstVisitorMessage = firstUnansweredVisitorMessage(messages)
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

/**
 * The visitor message still waiting on a person. An instant preset reply answers what came
 * before it (a greeting, a citation, a license table), so the "nobody has responded" clock
 * starts at the first visitor message after the last preset, and does not run at all while
 * the last word is a preset answer. A preset that hands the question to the team
 * (`presetAwaitsTeam`, an unknown license) leaves its question waiting.
 */
export function firstUnansweredVisitorMessage(messages: SanityChatMessage[]) {
  let lastAnswer = -1
  messages.forEach((message, index) => {
    if (message.fallbackKind === 'preset' && !(message.presetKind && presetAwaitsTeam(message.presetKind))) lastAnswer = index
  })
  return messages.slice(lastAnswer + 1).find((message) => message.authorType === 'visitor')
}
