import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Rule: the instant replies are LIVE through the real chat routes. A hello is greeted in
 * the same response that starts the thread, the reply survives the route rewriting the
 * messages once Slack answers, a picked format is answered without pinging the channel,
 * and the team sees a bot note for every instant reply.
 */

type Doc = Record<string, unknown> & { _id: string; messages?: Record<string, unknown>[] }
const store = new Map<string, Doc>()
const CMS: Record<string, unknown> = {
  'determinants-of-health': { title: 'Determinants of Health', date: 'Apr.2020', authors: ['Edwin Choi', 'Juhan Sonin'] },
}

function patchBuilder(id: string) {
  const ops: ((doc: Doc) => void)[] = []
  const builder = {
    setIfMissing(values: Record<string, unknown>) {
      ops.push((doc) => Object.entries(values).forEach(([key, value]) => (doc[key] ??= value)))
      return builder
    },
    set(values: Record<string, unknown>) {
      ops.push((doc) =>
        Object.entries(values).forEach(([key, value]) => {
          const [head, tail] = key.split('.')
          if (tail) (doc[head] as Record<string, unknown>)[tail] = value
          else doc[key] = value
        }),
      )
      return builder
    },
    append(key: string, items: unknown[]) {
      ops.push((doc) => (doc[key] = [...((doc[key] as unknown[]) || []), ...items]))
      return builder
    },
    unset(keys: string[]) {
      ops.push((doc) => keys.forEach((key) => delete doc[key]))
      return builder
    },
    ifRevisionId() {
      return builder
    },
    async commit() {
      const doc = store.get(id)!
      ops.forEach((op) => op(doc))
      return doc
    },
  }
  return builder
}

const fakeClient = {
  create: async (doc: Doc) => {
    store.set(doc._id, structuredClone(doc))
    return doc
  },
  patch: (id: string) => patchBuilder(id),
  fetch: async (query: string, params: Record<string, string>) => {
    if (query.includes('slug.current == $slug')) return CMS[params.slug] ?? null
    const doc = store.get(params.threadId)
    return doc && doc.visitorKey === params.visitorKey ? structuredClone(doc) : null
  },
}

const slack = vi.hoisted(() => ({
  notifySlackPresetReply: vi.fn(async (_input: { summary: string }) => ({ ok: true, channel: 'C1', ts: '2.2' })),
  notifySlackVisitorReply: vi.fn(async (_input: { quiet?: boolean }) => ({ ok: true, channel: 'C1', ts: '3.3' })),
}))

vi.mock('@/lib/chat/sanity', () => ({ getChatSanityClient: () => fakeClient }))
vi.mock('@/lib/chat/email', () => ({ isNoResponseEmailConfigured: () => false, getNoResponseEmailDraft: () => null, sendNoResponseEmail: vi.fn() }))
vi.mock('@/lib/chat/slack', () => ({
  isSlackPostingConfigured: () => true,
  startSlackChatConversation: vi.fn(async () => ({ ok: true, channel: 'C1', ts: '1.1', dedicatedChannel: false })),
  notifySlackPresetReply: slack.notifySlackPresetReply,
  notifySlackVisitorReply: slack.notifySlackVisitorReply,
  fetchSlackTeamReplies: vi.fn(async () => []),
  getSlackConfig: () => ({ channelId: 'C1' }),
  getSlackUserDisplayName: vi.fn(),
  applySlackFileUploadResult: vi.fn(),
  prepareSlackChatAttachmentUpload: vi.fn(),
  uploadSlackChatAttachment: vi.fn(),
}))

const { POST: createThread } = await import('@/app/api/chat/threads/route')
const { POST: reply } = await import('@/app/api/chat/threads/[threadId]/route')

function request(url: string, body: Record<string, unknown>) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function start(message: string, pageUrl = 'https://www.goinvo.com/vision/determinants-of-health') {
  const response = await createThread(request('http://localhost:3000/api/chat/threads', { message, pageUrl, pageTitle: 'Determinants of Health | GoInvo' }))
  return (await response.json()) as { threadId: string; visitorKey: string; messages: { authorType: string; text: string; card?: { kind: string; chips?: { label: string }[] } }[] }
}

async function send(thread: { threadId: string; visitorKey: string }, message: string) {
  const response = await reply(
    request(`http://localhost:3000/api/chat/threads/${thread.threadId}`, { visitorKey: thread.visitorKey, message }),
    { params: Promise.resolve({ threadId: thread.threadId }) },
  )
  return (await response.json()) as { messages: { authorType: string; text: string; card?: { kind: string; rows?: { id: string; relevant: boolean }[] } }[] }
}

describe('instant replies through the chat routes', () => {
  beforeEach(() => {
    store.clear()
    slack.notifySlackPresetReply.mockClear()
    slack.notifySlackVisitorReply.mockClear()
  })

  it('greets a hello back in the response that starts the thread, and keeps it after Slack answers', async () => {
    const thread = await start('Hi')
    expect(thread.messages.map((message) => message.authorType)).toEqual(['visitor', 'team'])
    expect(thread.messages[1].card?.kind).toBe('greeting')
    // Stored, too: the route rewrites `messages` once Slack starts the thread.
    expect(store.get(thread.threadId)?.messages?.map((message) => message.presetKind ?? message.authorType)).toEqual(['visitor', 'greeting'])
    expect(slack.notifySlackPresetReply).toHaveBeenCalledTimes(1)
    expect(slack.notifySlackPresetReply.mock.calls[0][0].summary).toBe('greeted them and asked what they need.')
  })

  it('asks for a format, answers the one picked, and does not ping the channel for the pick', async () => {
    const thread = await start('How do I cite the Determinants of Health?')
    expect(thread.messages[1].card?.kind).toBe('citationAsk')
    const answered = await send(thread, 'MLA')
    const last = answered.messages.at(-1)!
    expect(last.card?.kind).toBe('citation')
    expect(last.text).toContain('Choi, Edwin, and Juhan Sonin. “Determinants of Health.” GoInvo, 2019,')
    expect(slack.notifySlackVisitorReply.mock.calls.at(-1)?.[0].quiet).toBe(true)
    expect(slack.notifySlackPresetReply.mock.calls.at(-1)?.[0].summary).toBe('sent the MLA (9th edition) citation for “Determinants of Health”.')
  })

  it("answers the owner's license question with the asked-about rows on top", async () => {
    const thread = await start('Hello')
    const answered = await send(thread, 'DOES THIS DOCUMENT HAVE CC to use as academic reference and distribute?')
    const card = answered.messages.at(-1)!.card!
    expect(card.kind).toBe('license')
    expect(card.rows!.slice(0, 2)).toEqual([expect.objectContaining({ id: 'share', relevant: true }), expect.objectContaining({ id: 'academic', relevant: true })])
    // A real question pings the team as usual.
    expect(slack.notifySlackVisitorReply.mock.calls.at(-1)?.[0].quiet).toBeFalsy()
  })

  it('leaves a real question to a person: no instant reply, no bot note', async () => {
    const thread = await start('We need help redesigning our patient portal')
    expect(thread.messages).toHaveLength(1)
    expect(slack.notifySlackPresetReply).not.toHaveBeenCalled()
  })
})
