/**
 * The contact form's note reaches Slack as Marqueta. Run through the REAL route and the real
 * Slack poster, with only the network answered here: nothing is sent anywhere.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { contactSlackChannel, contactSlackMessage } from '@/lib/contactNotify'
import { contactSpamReason } from '@/lib/contactSpam'
import { expectValidSlackBlocks } from './support/slackBlocks'

const queue: Array<() => unknown> = []
vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: (task: () => unknown) => void queue.push(task) }
})

const kv = { counts: new Map<string, number>(), on: true, broken: false }
vi.mock('@/lib/marketing/drainSink', () => ({
  getKvClient: () => (kv.on ? {
    incr: async (key: string) => { if (kv.broken) throw new Error('kv down'); const next = (kv.counts.get(key) || 0) + 1; kv.counts.set(key, next); return next },
    expire: async () => 1,
  } : null),
}))

const good = { name: 'Ana Reyes', email: 'ana@example.org', message: 'We need a clear product direction.\nBy March.' }
const THANKS = '<h1>Thank You!</h1><p>Your submission has been received.</p>'

let jotform: { status: number; body: string }
let slackPosts: Array<Record<string, unknown>>
let slackFails: boolean

async function send(input: Record<string, unknown>, ip = '203.0.113.7') {
  const { POST } = await import('@/app/api/contact/route')
  const response = await POST(new Request('https://www.example.test/api/contact', { method: 'POST', headers: { origin: 'https://www.example.test', 'x-forwarded-for': `${ip}, 10.0.0.1` }, body: JSON.stringify(input) }))
  for (const task of queue.splice(0)) await task()
  return { status: response.status, body: await response.json() }
}

beforeEach(() => {
  queue.length = 0
  kv.counts.clear(); kv.on = true; kv.broken = false
  jotform = { status: 200, body: THANKS }
  slackPosts = []
  slackFails = false
  vi.stubEnv('SLACK_BOT_TOKEN', 'test-token')
  vi.stubEnv('SLACK_CHANNEL_ID', 'C-CHAT')
  vi.stubEnv('SLACK_CHAT_CHANNEL_ID', '')
  vi.stubEnv('SLACK_CONTACT_CHANNEL_ID', '')
  vi.stubEnv('SLACK_MARKETING_CHANNEL_ID', 'C-MARQUETA')
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL, init?: RequestInit) => {
    if (String(url).includes('slack.com/api/chat.postMessage')) {
      if (slackFails) throw new Error('network down')
      slackPosts.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ ok: true, channel: 'C-MARQUETA', ts: '1.2' }), { status: 200 })
    }
    if (String(url).includes('submit.jotform.com')) return new Response(jotform.body, { status: jotform.status })
    throw new Error(`unexpected request to ${url}`)
  }))
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('the contact note in Slack', () => {
  it('is posted once, as Marqueta, in her room, with the name, email and note', async () => {
    const result = await send(good)
    expect(result).toEqual({ status: 200, body: { sent: true } })
    expect(slackPosts).toHaveLength(1)
    const post = slackPosts[0]
    expect(post.channel).toBe('C-MARQUETA')
    expect(post.username).toBe('Marqueta')
    const text = JSON.stringify(post.blocks)
    expect(text).toContain('Ana Reyes')
    expect(text).toContain('<mailto:ana@example.org|ana@example.org>')
    expect((post.blocks as Array<{ text?: { text: string } }>)[1].text?.text.split(String.fromCharCode(10))).toEqual(['> We need a clear product direction.', '> By March.'])
    expect(text).toContain('Also in the JotForm inbox')
  })

  it('still posts when JotForm refuses, and says it is the only copy', async () => {
    jotform = { status: 200, body: '<p>There are incomplete required fields.</p>' }
    const result = await send(good)
    expect(result).toEqual({ status: 502, body: { sent: false } })
    expect(slackPosts).toHaveLength(1)
    expect(JSON.stringify(slackPosts[0].blocks)).toContain('the only copy')
  })

  it('rule: Slack never changes what the visitor is told', async () => {
    slackFails = true
    expect(await send(good)).toEqual({ status: 200, body: { sent: true } })
    vi.stubEnv('SLACK_BOT_TOKEN', '')
    expect(await send(good)).toEqual({ status: 200, body: { sent: true } })
  })

  it('rule: with no channel of its own it posts nothing, and never uses the website-chat channel', async () => {
    vi.stubEnv('SLACK_MARKETING_CHANNEL_ID', '')
    expect((await send(good)).body).toEqual({ sent: true })
    expect(slackPosts).toHaveLength(0)
    vi.stubEnv('SLACK_CONTACT_CHANNEL_ID', 'C-CONTACT')
    await send(good)
    expect(slackPosts.map((post) => post.channel)).toEqual(['C-CONTACT'])
    expect(contactSlackChannel({ SLACK_CHANNEL_ID: 'C-CHAT', SLACK_CHAT_CHANNEL_ID: 'C-CHAT' })).toBe('')
  })

  it('posts nothing for a robot, or for a note that was never sent', async () => {
    await send({ ...good, company: 'Robots Inc' })
    await send({ ...good, email: 'not-an-email' })
    expect(slackPosts).toHaveLength(0)
  })

  it('rule: a stranger\'s words can never mention anyone or carry a link', () => {
    const hostile = { name: '<!channel> *Ana*', email: 'a|<!here>@example.org', message: '<!everyone> see <https://evil.example|our site> & <@U123>' }
    const message = contactSlackMessage(hostile, true)
    const text = JSON.stringify(message)
    expect(text).not.toMatch(/<[!@#h]/)
    expect(text).toContain('&lt;!channel&gt;')
    expect(text).not.toContain('mailto:')
    expectValidSlackBlocks(message.blocks as never)
  })

  it('rule: obvious robot spam is not posted in Slack, and still goes to JotForm', async () => {
    const result = await send({ ...good, message: 'Rank higher: https://a.example and https://b.example' })
    expect(result).toEqual({ status: 200, body: { sent: true } })
    expect(slackPosts).toHaveLength(0)
    await send(good)
    expect(slackPosts).toHaveLength(1)
  })

  it('names robots, and leaves real notes alone', () => {
    const reason = (message: string, name = 'Ana Reyes') => contactSpamReason({ name, email: 'a@example.org', message })
    expect(reason('<a href="https://x.example">cheap pills</a>')).toBe('link markup')
    expect(reason('[url=https://x.example]click[/url]')).toBe('link markup')
    expect(reason('Hello', 'Visit www.x.example')).toBe('a link in the name')
    expect(reason('See https://a.example then www.b.example')).toBe('several links')
    expect(reason('We offer SEO  services for your website.')).toBe('a sales phrase')
    expect(reason('Quality backlinks, cheap.')).toBe('a sales phrase')
    expect(reason('Best online CASINO bonus')).toBe('a sales phrase')
    // People: one link, and words that only contain a sales word.
    expect(reason('We need a clear product direction. Our site is https://clinic.example.')).toBeNull()
    expect(reason('Our team in Seoul runs a reloaned-equipment programme for hospitals.')).toBeNull()
    expect(reason('Patients keep forgetting their specialist appointments.')).toBeNull()
    expect(reason('We lost search traffic after a redesign and need the product rethought.')).toBeNull()
    expect(contactSpamReason(good)).toBeNull()
  })

  it('rule: one address gets three notes in ten minutes; the fourth is not sent, and others are unaffected', async () => {
    for (let i = 0; i < 3; i++) expect((await send(good)).status).toBe(200)
    const jotformCalls = () => vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('jotform')).length
    const before = jotformCalls()
    expect(await send(good)).toEqual({ status: 429, body: { sent: false } })
    expect(jotformCalls()).toBe(before)
    expect(slackPosts).toHaveLength(3)
    expect((await send(good, '198.51.100.9')).status).toBe(200)
  })

  it('rule: Slack gets at most twelve notes an hour, however many addresses send', async () => {
    for (let i = 0; i < 15; i++) expect((await send(good, `198.51.100.${i}`)).status).toBe(200)
    expect(slackPosts).toHaveLength(12)
  })

  it('rule: a missing or failing counter limits nobody', async () => {
    kv.broken = true
    for (let i = 0; i < 5; i++) expect((await send(good)).status).toBe(200)
    kv.on = false
    expect((await send(good)).status).toBe(200)
    expect(slackPosts).toHaveLength(6)
  })

  it('fits Slack with the longest note the form allows', () => {
    const message = contactSlackMessage({ ...good, message: '<&>'.repeat(333) }, false)
    expectValidSlackBlocks(message.blocks as never)
  })
})
