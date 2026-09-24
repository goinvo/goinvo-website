import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchSlackMessage,
  getSlackBotUserId,
  getSlackTeamId,
  getSlackUserProfile,
  postSlackEphemeral,
  resetSlackAuthIdentityForTests,
  updateSlackMessage,
} from '@/lib/chat/slack'

const originalToken = process.env.SLACK_BOT_TOKEN

type Call = { url: string; init?: RequestInit }

function stubFetch(respond: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  const calls: Call[] = []
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    const body = await respond(String(url), init)
    return { ok: true, statusText: 'OK', json: async () => body } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return { calls, fetchMock }
}

beforeEach(() => {
  process.env.SLACK_BOT_TOKEN = 'xoxb-test'
  resetSlackAuthIdentityForTests()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

/** Our workspace, as auth.test reports it for the bot token. */
const AUTH_TEST = { ok: true, user_id: 'UMARQUETA', team_id: 'TGOINVO' }

/** users.info answers with `user`; auth.test with `auth` (our workspace unless given). */
function stubSlackUsers(user: unknown, auth: unknown = AUTH_TEST) {
  return stubFetch((url) => (url.includes('/auth.test') ? auth : user))
}

const authTestCalls = (calls: Call[]) => calls.filter((call) => call.url.includes('/auth.test')).length

afterEach(() => {
  if (originalToken === undefined) delete process.env.SLACK_BOT_TOKEN
  else process.env.SLACK_BOT_TOKEN = originalToken
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getSlackUserProfile — fails closed', () => {
  it('passes a full member of our workspace with their display name', async () => {
    stubSlackUsers({ ok: true, user: { name: 'juhan', team_id: 'TGOINVO', profile: { display_name: 'Juhan' } } })
    await expect(getSlackUserProfile('UJUHAN')).resolves.toEqual({ ok: true, name: 'Juhan', isGuest: false, isBot: false })
  })

  it('marks both kinds of guest as guests', async () => {
    // A client or contractor in a shared channel must never be treated as staff.
    stubSlackUsers({ ok: true, user: { name: 'client', team_id: 'TGOINVO', is_restricted: true } })
    await expect(getSlackUserProfile('UGUEST')).resolves.toMatchObject({ ok: true, isGuest: true })
    stubSlackUsers({ ok: true, user: { name: 'client', team_id: 'TGOINVO', is_ultra_restricted: true } })
    await expect(getSlackUserProfile('UGUEST')).resolves.toMatchObject({ ok: true, isGuest: true })
  })

  it('treats a Slack Connect member of another organisation as a guest, though Slack says they are not one', async () => {
    // Their guest flags describe their standing in THEIR org — both false for
    // a full member of the partner's workspace. The team id is what gives them away.
    stubSlackUsers({
      ok: true,
      user: { name: 'partner', team_id: 'TCLIENT', is_restricted: false, is_ultra_restricted: false, profile: { display_name: 'Pat' } },
    })
    await expect(getSlackUserProfile('UPARTNER')).resolves.toEqual({ ok: true, name: 'Pat', isGuest: true, isBot: false })
  })

  it('treats a stranger, or a user with no team at all, as a guest', async () => {
    stubSlackUsers({ ok: true, user: { name: 'stranger', team_id: 'TGOINVO', is_stranger: true } })
    await expect(getSlackUserProfile('USTRANGER')).resolves.toMatchObject({ ok: true, isGuest: true })
    stubSlackUsers({ ok: true, user: { name: 'nobody-knows' } })
    await expect(getSlackUserProfile('UNOTEAM')).resolves.toMatchObject({ ok: true, isGuest: true })
  })

  it('is not ok when it cannot learn which workspace is ours — and does not cache that miss', async () => {
    const member = { ok: true, user: { name: 'juhan', team_id: 'TGOINVO' } }
    stubSlackUsers(member, { ok: false, error: 'ratelimited' })
    await expect(getSlackUserProfile('UJUHAN')).resolves.toEqual({ ok: false })
    stubSlackUsers(member, { ok: true, user_id: 'UMARQUETA' })
    await expect(getSlackUserProfile('UJUHAN')).resolves.toEqual({ ok: false })

    // A transient failure must not lock the whole team out for the life of the process.
    stubSlackUsers(member)
    await expect(getSlackUserProfile('UJUHAN')).resolves.toMatchObject({ ok: true, isGuest: false })
  })

  it('asks auth.test once, and shares the answer with getSlackBotUserId', async () => {
    const { calls } = stubSlackUsers({ ok: true, user: { name: 'juhan', team_id: 'TGOINVO' } })
    await getSlackUserProfile('UJUHAN')
    await getSlackUserProfile('UERIC')
    await expect(getSlackBotUserId()).resolves.toBe('UMARQUETA')
    await expect(getSlackTeamId()).resolves.toBe('TGOINVO')
    expect(authTestCalls(calls)).toBe(1)
  })

  it('is not ok on an API error, a network failure, a deactivated user, or no token', async () => {
    stubSlackUsers({ ok: false, error: 'missing_scope' })
    await expect(getSlackUserProfile('U1')).resolves.toEqual({ ok: false })

    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('socket hang up')
    }))
    await expect(getSlackUserProfile('U1')).resolves.toEqual({ ok: false })

    stubSlackUsers({ ok: true, user: { name: 'gone', team_id: 'TGOINVO', deleted: true } })
    await expect(getSlackUserProfile('U1')).resolves.toEqual({ ok: false })

    stubSlackUsers({ not: 'json we expected' })
    await expect(getSlackUserProfile('U1')).resolves.toEqual({ ok: false })

    delete process.env.SLACK_BOT_TOKEN
    const { fetchMock } = stubSlackUsers({ ok: true, user: { name: 'x', team_id: 'TGOINVO' } })
    await expect(getSlackUserProfile('U1')).resolves.toEqual({ ok: false })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('flags bots', async () => {
    stubSlackUsers({ ok: true, user: { name: 'bot', team_id: 'TGOINVO', is_bot: true } })
    await expect(getSlackUserProfile('UBOT')).resolves.toMatchObject({ ok: true, isBot: true })
  })
})

describe('postSlackEphemeral', () => {
  it('sends text to one user, in the thread, and never blocks', async () => {
    const { calls } = stubFetch(() => ({ ok: true }))
    await expect(
      postSlackEphemeral({ channel: 'C1', user: 'U1', text: 'Email: jane@mgb.org', threadTs: '111.222' }),
    ).resolves.toBe(true)
    expect(calls[0].url).toBe('https://slack.com/api/chat.postEphemeral')
    const body = JSON.parse(String(calls[0].init?.body))
    expect(body).toEqual({ channel: 'C1', user: 'U1', text: 'Email: jane@mgb.org', thread_ts: '111.222' })
    expect(body.blocks).toBeUndefined()
  })

  it('returns false instead of throwing', async () => {
    stubFetch(() => ({ ok: false, error: 'user_not_in_channel' }))
    await expect(postSlackEphemeral({ channel: 'C1', user: 'U1', text: 'x' })).resolves.toBe(false)
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('down')
    }))
    await expect(postSlackEphemeral({ channel: 'C1', user: 'U1', text: 'x' })).resolves.toBe(false)
  })
})

describe('updateSlackMessage', () => {
  it('only sends the fields it was given, so existing attachments survive', async () => {
    const { calls } = stubFetch(() => ({ ok: true }))
    await updateSlackMessage({ channel: 'C1', ts: '1.2', text: 'Check-in', blocks: [{ type: 'divider' }] })
    const body = JSON.parse(String(calls[0].init?.body))
    expect(calls[0].url).toBe('https://slack.com/api/chat.update')
    expect(body).toEqual({ channel: 'C1', ts: '1.2', text: 'Check-in', blocks: [{ type: 'divider' }] })
    expect('attachments' in body).toBe(false)
  })

  it('is false on failure', async () => {
    stubFetch(() => ({ ok: false, error: 'cant_update_message' }))
    await expect(updateSlackMessage({ channel: 'C1', ts: '1.2', text: 'x' })).resolves.toBe(false)
  })
})

describe('fetchSlackMessage', () => {
  it('reads a top-level message from history, bounded to its timestamp', async () => {
    const { calls } = stubFetch(() => ({
      ok: true,
      messages: [{ ts: '100.1', text: 'Thursday check-in', blocks: [{ type: 'divider' }], attachments: [{ color: '#fff' }] }],
    }))
    const message = await fetchSlackMessage({ channel: 'C1', ts: '100.1', threadTs: '100.1' })
    expect(message).toEqual({ text: 'Thursday check-in', blocks: [{ type: 'divider' }], attachments: [{ color: '#fff' }] })
    const url = new URL(calls[0].url)
    expect(url.pathname).toBe('/api/conversations.history')
    expect(url.searchParams.get('latest')).toBe('100.1')
    expect(url.searchParams.get('inclusive')).toBe('true')
    expect(url.searchParams.get('limit')).toBe('1')
  })

  it('reads a reply from its thread', async () => {
    const { calls } = stubFetch(() => ({
      ok: true,
      messages: [
        { ts: '100.1', text: 'parent' },
        { ts: '200.2', text: 'the mine answer', blocks: [] },
      ],
    }))
    const message = await fetchSlackMessage({ channel: 'C1', ts: '200.2', threadTs: '100.1' })
    expect(message?.text).toBe('the mine answer')
    const url = new URL(calls[0].url)
    expect(url.pathname).toBe('/api/conversations.replies')
    expect(url.searchParams.get('ts')).toBe('100.1')
  })

  it('never returns a neighbour when the message is gone', async () => {
    // history returns the message BEFORE `latest` when `latest` was deleted —
    // redrawing that one would rewrite the wrong message.
    stubFetch(() => ({ ok: true, messages: [{ ts: '99.9', text: 'someone else' }] }))
    await expect(fetchSlackMessage({ channel: 'C1', ts: '100.1' })).resolves.toBeNull()
  })

  it('is null when Slack refuses (a DM without im:history) or the network fails', async () => {
    stubFetch(() => ({ ok: false, error: 'missing_scope' }))
    await expect(fetchSlackMessage({ channel: 'D1', ts: '1.1' })).resolves.toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('down')
    }))
    await expect(fetchSlackMessage({ channel: 'C1', ts: '1.1' })).resolves.toBeNull()
  })
})
