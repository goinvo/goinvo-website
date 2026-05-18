import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateChatAttachment } from '@/lib/chat/attachments'
import {
  applySlackFileUploadResult,
  buildSlackConversationChannelName,
  notifySlackNewThread,
  notifySlackVisitorReply,
  startSlackChatConversation,
  uploadSlackChatAttachment,
  verifySlackRequest,
} from '@/lib/chat/slack'

describe('Slack request verification', () => {
  const originalSecret = process.env.SLACK_SIGNING_SECRET
  const originalToken = process.env.SLACK_BOT_TOKEN
  const originalChannel = process.env.SLACK_CHAT_CHANNEL_ID
  const originalPing = process.env.CHAT_SLACK_CHANNEL_PING
  const originalDedicatedChannels = process.env.CHAT_SLACK_DEDICATED_CHANNELS

  afterEach(() => {
    process.env.SLACK_SIGNING_SECRET = originalSecret
    process.env.SLACK_BOT_TOKEN = originalToken
    process.env.SLACK_CHAT_CHANNEL_ID = originalChannel
    process.env.CHAT_SLACK_CHANNEL_PING = originalPing
    process.env.CHAT_SLACK_DEDICATED_CHANNELS = originalDedicatedChannels
    vi.unstubAllGlobals()
  })

  it('accepts a valid Slack signature', () => {
    process.env.SLACK_SIGNING_SECRET = 'test-secret'
    const body = 'payload={"type":"block_actions"}'
    const timestamp = '1779062400'
    const signature = sign('test-secret', timestamp, body)

    const headers = new Headers({
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': signature,
    })

    expect(verifySlackRequest(headers, body, 1779062400 * 1000)).toBe(true)
  })

  it('rejects bad or stale Slack signatures', () => {
    process.env.SLACK_SIGNING_SECRET = 'test-secret'
    const body = 'payload={"type":"block_actions"}'
    const timestamp = '1779062400'

    expect(
      verifySlackRequest(
        new Headers({
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': 'v0=bad',
        }),
        body,
        1779062400 * 1000,
      ),
    ).toBe(false)

    expect(
      verifySlackRequest(
        new Headers({
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': sign('test-secret', timestamp, body),
        }),
        body,
        1779063001 * 1000,
      ),
    ).toBe(false)
  })

  it('pings the channel and starts a new Slack thread for a new website chat', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    process.env.SLACK_CHAT_CHANNEL_ID = 'C123'
    process.env.CHAT_SLACK_CHANNEL_PING = '<!here>'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, channel: 'C123', ts: '1779062400.000100' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await notifySlackNewThread({
      threadId: 'chatThread.test',
      visitorName: 'Ada Lovelace',
      message: 'Where did health care problems happen?',
      pageUrl: 'https://www.goinvo.com/vision/us-healthcare-problems/',
    })

    expect(result).toEqual({ channel: 'C123', ts: '1779062400.000100' })
    const [, request] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(request.body))

    expect(body.channel).toBe('C123')
    expect(body.thread_ts).toBeUndefined()
    expect(body.text).toContain('<!here>')
    expect(body.blocks[0].text.text).toContain('Reply in this Slack thread')
    expect(body.blocks[2].text.text).toContain('First message:')
  })

  it('creates a dedicated Slack channel and notifies the hub for a new website chat', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    process.env.SLACK_CHAT_CHANNEL_ID = 'C-HUB'
    process.env.CHAT_SLACK_CHANNEL_PING = '<!here>'
    process.env.CHAT_SLACK_DEDICATED_CHANNELS = 'true'

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, channel: { id: 'C-CHAT', name: 'website-chat-ada-abcdef12' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, channel: 'C-HUB', ts: '1779062399.000100' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, channel: 'C-CHAT', ts: '1779062400.000100' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await startSlackChatConversation({
      threadId: 'chatThread.abcdef12-3456-7890-abcd-ef1234567890',
      visitorName: 'Ada Lovelace',
      message: 'Can we talk about the thing?',
      pageUrl: 'https://www.goinvo.com/',
    })

    expect(result).toEqual({
      channel: 'C-CHAT',
      ts: '1779062400.000100',
      channelName: 'website-chat-ada-abcdef12',
      dedicatedChannel: true,
      hubChannelId: 'C-HUB',
      hubThreadTs: '1779062399.000100',
    })

    const [, createRequest] = fetchMock.mock.calls[0]
    expect(JSON.parse(String(createRequest.body))).toMatchObject({
      name: 'website-chat-ada-lovelace-abcdef12',
      is_private: false,
    })

    const [, hubRequest] = fetchMock.mock.calls[1]
    const hubBody = JSON.parse(String(hubRequest.body))
    expect(hubBody.channel).toBe('C-HUB')
    expect(hubBody.blocks[0].text.text).toContain('Join <#C-CHAT|website-chat-ada-abcdef12>')

    const [, chatRequest] = fetchMock.mock.calls[2]
    const chatBody = JSON.parse(String(chatRequest.body))
    expect(chatBody.channel).toBe('C-CHAT')
    expect(chatBody.blocks[0].text.text).toContain('Reply in this Slack channel')
  })

  it('pings and broadcasts visitor follow-ups inside the existing Slack thread', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    process.env.SLACK_CHAT_CHANNEL_ID = 'C123'
    process.env.CHAT_SLACK_CHANNEL_PING = '<!here>'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, channel: 'C123', ts: '1779062500.000100' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await notifySlackVisitorReply({
      threadId: 'chatThread.test',
      threadTs: '1779062400.000100',
      visitorName: 'Ada Lovelace',
      message: 'Are you still there?',
    })

    const [, request] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(request.body))

    expect(body.channel).toBe('C123')
    expect(body.thread_ts).toBe('1779062400.000100')
    expect(body.reply_broadcast).toBe(true)
    expect(body.text).toContain('<!here>')
    expect(body.blocks[0].text.text).toContain('New website chat reply')
  })

  it('posts visitor follow-ups as top-level messages in dedicated Slack channels', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    process.env.SLACK_CHAT_CHANNEL_ID = 'C-HUB'
    process.env.CHAT_SLACK_CHANNEL_PING = '<!here>'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, channel: 'C-CHAT', ts: '1779062500.000100' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await notifySlackVisitorReply({
      threadId: 'chatThread.test',
      channel: 'C-CHAT',
      threadTs: '1779062400.000100',
      visitorName: 'Ada Lovelace',
      message: 'One more thing',
      replyInThread: false,
    })

    const [, request] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(request.body))

    expect(body.channel).toBe('C-CHAT')
    expect(body.thread_ts).toBeUndefined()
    expect(body.reply_broadcast).toBeUndefined()
    expect(body.text).toContain('One more thing')
  })

  it('uploads visitor attachments to the existing Slack thread', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    process.env.SLACK_CHAT_CHANNEL_ID = 'C123'

    const attachmentResult = validateChatAttachment(new File(['image-bytes'], 'screen.png', { type: 'image/png' }))
    if (!attachmentResult.attachment) throw new Error('Expected valid attachment')

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, upload_url: 'https://files.slack.test/upload', file_id: 'F123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, files: [{ id: 'F123', title: 'screen.png' }] }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await uploadSlackChatAttachment({
      attachment: attachmentResult.attachment,
      threadTs: '1779062400.000100',
      initialComment: 'Attachment from Ada: screen.png',
    })

    expect(result).toEqual({ ok: true, fileId: 'F123', title: 'screen.png' })
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const [, uploadUrlRequest] = fetchMock.mock.calls[0]
    expect(JSON.parse(String(uploadUrlRequest.body))).toEqual({
      filename: 'screen.png',
      length: 11,
      alt_txt: 'screen.png',
    })

    const [, completeRequest] = fetchMock.mock.calls[2]
    expect(JSON.parse(String(completeRequest.body))).toEqual({
      channel_id: 'C123',
      thread_ts: '1779062400.000100',
      initial_comment: 'Attachment from Ada: screen.png',
      files: [{ id: 'F123', title: 'screen.png' }],
    })
  })

  it('builds Slack-safe dedicated channel names', () => {
    expect(
      buildSlackConversationChannelName({
        threadId: 'chatThread.ABCDEF12-3456-7890-abcd-ef1234567890',
        visitorEmail: 'hello+chat@goinvo.com',
      }),
    ).toBe('website-chat-hello-chat-abcdef12')
  })

  it('records Slack attachment upload results on message metadata', () => {
    const attachment = {
      _key: 'attachment',
      _type: 'chatAttachment' as const,
      filename: 'screen.png',
      contentType: 'image/png' as const,
      size: 11,
      uploadStatus: 'pending' as const,
    }

    expect(applySlackFileUploadResult(attachment, { ok: true, fileId: 'F123', title: 'screen.png' })).toEqual({
      ...attachment,
      uploadStatus: 'uploaded',
      slackFileId: 'F123',
      slackFileTitle: 'screen.png',
    })

    expect(applySlackFileUploadResult(attachment, { ok: false, error: 'bad file' })).toEqual({
      ...attachment,
      uploadStatus: 'failed',
      error: 'bad file',
    })
  })
})

function sign(secret: string, timestamp: string, body: string) {
  return `v0=${createHmac('sha256', secret).update(`v0:${timestamp}:${body}`).digest('hex')}`
}
