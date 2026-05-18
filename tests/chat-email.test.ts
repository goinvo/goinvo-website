import { afterEach, describe, expect, it, vi } from 'vitest'
import { siteConfig } from '@/lib/config'
import { getNoResponseEmailDraft, NO_RESPONSE_EMAIL_RETRY_MS, sendNoResponseEmail } from '@/lib/chat/email'
import type { SanityChatMessage } from '@/lib/chat/validation'

const firstMessageAt = '2026-05-18T14:00:00.000Z'
const dueAt = new Date(Date.parse(firstMessageAt) + siteConfig.chat.noResponse.delayMs + 1)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function visitorMessage(overrides: Partial<SanityChatMessage> = {}): SanityChatMessage {
  return {
    _key: 'visitor',
    _type: 'chatMessage',
    authorType: 'visitor',
    text: 'Can you help with a design system?',
    createdAt: firstMessageAt,
    ...overrides,
  }
}

describe('no-response chat email', () => {
  it('builds a follow-up email when a due thread has an email and no team reply', () => {
    const draft = getNoResponseEmailDraft(
      {
        _id: 'chatThread.test',
        status: 'new',
        visitor: { name: 'Ada Lovelace', email: 'ADA@example.COM' },
        source: { pageUrl: 'https://www.goinvo.com/services' },
        messages: [visitorMessage()],
      },
      dueAt,
    )

    expect(draft?.to).toBe('ada@example.com')
    expect(draft?.subject).toBe('We received your GoInvo chat')
    expect(draft?.text).toContain('Hi Ada Lovelace,')
    expect(draft?.text).toContain('Can you help with a design system?')
    expect(draft?.html).toContain('https://www.goinvo.com/services')
  })

  it('does not build email without a visitor email', () => {
    expect(
      getNoResponseEmailDraft(
        {
          _id: 'chatThread.test',
          status: 'new',
          visitor: { name: 'Ada Lovelace' },
          messages: [visitorMessage()],
        },
        dueAt,
      ),
    ).toBeNull()
  })

  it('does not build duplicate, closed, recently attempted, or answered emails', () => {
    expect(
      getNoResponseEmailDraft(
        {
          _id: 'chatThread.test',
          status: 'new',
          visitor: { email: 'ada@example.com' },
          messages: [visitorMessage()],
          noResponseEmailSentAt: dueAt.toISOString(),
        },
        dueAt,
      ),
    ).toBeNull()

    expect(
      getNoResponseEmailDraft(
        {
          _id: 'chatThread.test',
          status: 'resolved',
          visitor: { email: 'ada@example.com' },
          messages: [visitorMessage()],
        },
        dueAt,
      ),
    ).toBeNull()

    expect(
      getNoResponseEmailDraft(
        {
          _id: 'chatThread.test',
          status: 'new',
          visitor: { email: 'ada@example.com' },
          messages: [visitorMessage()],
          noResponseEmailAttemptedAt: new Date(dueAt.getTime() - NO_RESPONSE_EMAIL_RETRY_MS + 1000).toISOString(),
        },
        dueAt,
      ),
    ).toBeNull()

    expect(
      getNoResponseEmailDraft(
        {
          _id: 'chatThread.test',
          status: 'open',
          visitor: { email: 'ada@example.com' },
          messages: [
            visitorMessage(),
            visitorMessage({
              _key: 'team',
              authorType: 'team',
              authorName: 'GoInvo',
              text: 'We are here.',
            }),
          ],
        },
        dueAt,
      ),
    ).toBeNull()
  })

  it('sends the backup email through Resend with the configured GoInvo sender', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('CHAT_NO_RESPONSE_EMAIL_FROM', 'GoInvo <hello@goinvo.com>')
    vi.stubEnv('CHAT_NO_RESPONSE_EMAIL_REPLY_TO', 'hello@goinvo.com')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_123' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendNoResponseEmail({
      to: 'ada@example.com',
      subject: 'We received your GoInvo chat',
      text: 'Plain text',
      html: '<p>HTML</p>',
    })

    expect(result).toEqual({ ok: true, id: 'email_123' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer re_test_key',
        }),
      }),
    )

    const [, request] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(request.body))
    expect(body).toEqual({
      from: 'GoInvo <hello@goinvo.com>',
      to: ['ada@example.com'],
      subject: 'We received your GoInvo chat',
      text: 'Plain text',
      html: '<p>HTML</p>',
      reply_to: 'hello@goinvo.com',
    })
  })
})
