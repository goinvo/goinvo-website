import { describe, expect, it } from 'vitest'
import {
  MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES,
  MAX_CHAT_ATTACHMENT_SIZE_BYTES,
  createChatAttachment,
  formatAttachmentSize,
  validateChatAttachment,
  validateChatAttachmentMetadata,
  validateInlineChatAttachment,
} from '@/lib/chat/attachments'
import {
  MAX_CHAT_MESSAGE_LENGTH,
  extractEmailAddress,
  extractVisitorNameFromContactReply,
  normalizeChatText,
  normalizeVisitorEmail,
  normalizeVisitorName,
  toPublicMessages,
  type SanityChatMessage,
} from '@/lib/chat/validation'

describe('chat validation helpers', () => {
  it('normalizes valid visitor input', () => {
    expect(normalizeChatText('  hello\r\nthere  ')).toBe('hello\nthere')
    expect(normalizeVisitorName('  Ada   Lovelace  ')).toBe('Ada Lovelace')
    expect(normalizeVisitorEmail('  ADA@example.COM  ')).toBe('ada@example.com')
  })

  it('rejects empty, too-long, and invalid values', () => {
    expect(normalizeChatText('   ')).toBeNull()
    expect(normalizeChatText('x'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1))).toBeNull()
    expect(normalizeVisitorEmail('not-an-email')).toBeNull()
  })

  it('validates supported small attachments', () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' })
    const result = validateChatAttachment(file)

    expect(result.error).toBeUndefined()
    expect(result.attachment).toMatchObject({
      filename: 'hello.png',
      contentType: 'image/png',
      size: 5,
    })
  })

  it('rejects unsupported or oversized attachments', () => {
    expect(validateChatAttachment(new File(['x'], 'app.exe', { type: 'application/x-msdownload' })).error).toBe(
      'Attachment type is not supported',
    )

    expect(
      validateChatAttachment(createFileLike('large.png', 'image/png', MAX_CHAT_ATTACHMENT_SIZE_BYTES + 1)).error,
    ).toBe(`Attachment must be ${formatAttachmentSize(MAX_CHAT_ATTACHMENT_SIZE_BYTES)} or smaller`)
  })

  it('limits inline CMS uploads separately from Slack-routed attachments', () => {
    const largeImage = createFileLike('large.png', 'image/png', MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES + 1)

    expect(validateInlineChatAttachment(largeImage).error).toBe(
      `Attachment must be ${formatAttachmentSize(MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES)} or smaller`,
    )
    expect(
      validateChatAttachmentMetadata({
        filename: largeImage.name,
        contentType: largeImage.type,
        size: largeImage.size,
      }).attachment,
    ).toMatchObject({
      filename: 'large.png',
      contentType: 'image/png',
      size: MAX_CHAT_ATTACHMENT_INLINE_SIZE_BYTES + 1,
    })
  })

  it('extracts an email address from a chat reply', () => {
    expect(extractEmailAddress('Reach me at ADA@example.COM when you can.')).toBe('ada@example.com')
    expect(extractEmailAddress('No email here')).toBeUndefined()
  })

  it('extracts an explicitly stated visitor name from a contact reply', () => {
    expect(extractVisitorNameFromContactReply('My name is Ada Lovelace and ada@example.com works.')).toBe(
      'Ada Lovelace',
    )
    expect(extractVisitorNameFromContactReply("I'm Grace Hopper. grace@example.com")).toBe('Grace Hopper')
    expect(extractVisitorNameFromContactReply('ada@example.com')).toBeUndefined()
  })

  it('only exposes visitor and team messages publicly', () => {
    const attachmentResult = validateChatAttachment(new File(['hello'], 'hello.png', { type: 'image/png' }))
    if (!attachmentResult.attachment) throw new Error('Expected valid attachment')
    const attachment = createChatAttachment(attachmentResult.attachment, 'uploaded')

    const messages: SanityChatMessage[] = [
      {
        _key: 'visitor',
        _type: 'chatMessage',
        authorType: 'visitor',
        text: 'Question',
        createdAt: '2026-05-18T00:00:00.000Z',
        attachments: [attachment],
      },
      {
        _key: 'system',
        _type: 'chatMessage',
        authorType: 'system',
        text: 'Internal event',
        createdAt: '2026-05-18T00:00:01.000Z',
      },
      {
        _key: 'team',
        _type: 'chatMessage',
        authorType: 'team',
        authorName: 'GoInvo',
        text: 'Answer',
        createdAt: '2026-05-18T00:00:02.000Z',
      },
    ]

    expect(toPublicMessages(messages)).toEqual([
      {
        id: 'visitor',
        authorType: 'visitor',
        authorName: undefined,
        text: 'Question',
        createdAt: '2026-05-18T00:00:00.000Z',
        attachments: [
          {
            filename: 'hello.png',
            contentType: 'image/png',
            size: 5,
            uploadStatus: 'uploaded',
          },
        ],
      },
      {
        id: 'team',
        authorType: 'team',
        authorName: 'GoInvo',
        text: 'Answer',
        createdAt: '2026-05-18T00:00:02.000Z',
      },
    ])
  })
})

function createFileLike(name: string, type: string, size: number): File {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(0),
  } as File
}
