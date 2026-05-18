import { describe, expect, it } from 'vitest'
import { siteConfig } from '@/lib/config'
import { getNoResponseFallback } from '@/lib/chat/noResponse'
import type { SanityChatMessage } from '@/lib/chat/validation'

const firstMessageAt = '2026-05-18T14:00:00.000Z'
const dueAt = new Date(Date.parse(firstMessageAt) + siteConfig.chat.noResponse.delayMs + 1)
const beforeDueAt = new Date(Date.parse(firstMessageAt) + siteConfig.chat.noResponse.delayMs - 1)

function visitorMessage(overrides: Partial<SanityChatMessage> = {}): SanityChatMessage {
  return {
    _key: 'visitor',
    _type: 'chatMessage',
    authorType: 'visitor',
    text: 'Can you help?',
    createdAt: firstMessageAt,
    ...overrides,
  }
}

describe('no-response chat fallback', () => {
  it('waits until the configured delay has passed', () => {
    const fallback = getNoResponseFallback(
      {
        status: 'new',
        messages: [visitorMessage()],
      },
      beforeDueAt,
    )

    expect(fallback).toBeNull()
  })

  it('asks for name and email when no contact details exist', () => {
    const fallback = getNoResponseFallback(
      {
        status: 'new',
        messages: [visitorMessage()],
      },
      dueAt,
    )

    expect(fallback).toEqual({
      variant: 'withoutContact',
      text: siteConfig.chat.noResponse.withoutContact,
    })
  })

  it('asks only for email when the visitor name already exists', () => {
    const fallback = getNoResponseFallback(
      {
        status: 'new',
        visitor: { name: 'Ada' },
        messages: [visitorMessage()],
      },
      dueAt,
    )

    expect(fallback).toEqual({
      variant: 'withoutEmail',
      text: siteConfig.chat.noResponse.withoutEmail,
    })
  })

  it('uses the shorter message when the visitor already provided email', () => {
    const fallback = getNoResponseFallback(
      {
        status: 'open',
        visitor: { email: 'ada@example.com' },
        messages: [visitorMessage()],
      },
      dueAt,
    )

    expect(fallback).toEqual({
      variant: 'withEmail',
      text: siteConfig.chat.noResponse.withEmail,
    })
  })

  it('does not send after a human team reply or an existing fallback', () => {
    expect(
      getNoResponseFallback(
        {
          status: 'open',
          messages: [
            visitorMessage(),
            visitorMessage({
              _key: 'team',
              authorType: 'team',
              authorName: 'GoInvo',
              text: 'We are on it.',
            }),
          ],
        },
        dueAt,
      ),
    ).toBeNull()

    expect(
      getNoResponseFallback(
        {
          status: 'open',
          messages: [
            visitorMessage(),
            visitorMessage({
              _key: 'fallback',
              authorType: 'team',
              authorName: 'GoInvo',
              text: siteConfig.chat.noResponse.withoutEmail,
              fallbackKind: 'noResponse',
            }),
          ],
        },
        dueAt,
      ),
    ).toBeNull()
  })

  it('does not send for closed threads', () => {
    expect(
      getNoResponseFallback(
        {
          status: 'resolved',
          messages: [visitorMessage()],
        },
        dueAt,
      ),
    ).toBeNull()
  })
})
