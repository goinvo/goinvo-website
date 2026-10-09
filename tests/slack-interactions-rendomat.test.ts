/**
 * *Export to Rendomat*, through the real interactions route.
 *
 * The wiring guard reads the route's source; this proves the press is LIVE:
 * a Slack payload with the button's id actually reaches `makeInRendomat`
 * (Marqueta's own dispatcher answers every `goinvo_marqueta_*` id first, so a
 * branch placed after it would ack and do nothing — the first version did).
 *
 * Pinned:
 *   - a team member's press makes the video for the draft the button names,
 *     and redraws that card on the LIVE message: a state note over Open in
 *     Rendomat, with no Make button left and no reversing button;
 *   - a guest's press reaches nothing;
 *   - a slide that does not fit is told to the presser alone, and the card
 *     is left as it was.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Slack payloads and Block Kit are loosely shaped */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  afterQueue: [] as Array<() => unknown>,
  getSlackUserProfile: vi.fn(),
  updateSlackMessage: vi.fn(),
  fetchSlackMessage: vi.fn(),
  responseFetch: vi.fn(),
  makeInRendomat: vi.fn(),
}))

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: (task: () => unknown) => void mocks.afterQueue.push(task) }
})
vi.mock('@/lib/chat/slack', () => ({
  getSlackConfig: () => ({ botToken: 'xoxb-test', channelId: 'CCHAT', signingSecret: 'secret' }),
  verifySlackRequest: () => true,
  getSlackUserProfile: mocks.getSlackUserProfile,
  getSlackUserDisplayName: vi.fn(async () => 'Jules Soren'),
  openSlackModal: vi.fn(),
  postSlackMessage: vi.fn(),
  postSlackEphemeral: vi.fn(),
  updateSlackMessage: mocks.updateSlackMessage,
  fetchSlackMessage: mocks.fetchSlackMessage,
  getSlackPermalink: vi.fn(),
}))
vi.mock('@/lib/marketing/makeInRendomat.server', () => ({ makeInRendomat: mocks.makeInRendomat }))
vi.mock('@/lib/marketing/outreachClient.server', () => ({
  getOutreachClient: () => {
    throw new Error('the press must not read the dataset itself; makeInRendomat does')
  },
  isOutreachClientConfigured: () => true,
}))
vi.mock('@/lib/chat/sanity', () => ({ getChatSanityClient: () => null }))
vi.mock('@/lib/shop/disputeEvidence', () => ({ submitDisputeEvidence: vi.fn() }))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/slack/interactions/route'
import { MARQUETA_ACTION } from '@/lib/marketing/marquetaActions'
import { LABEL } from '@/lib/marketing/marquetaStyle'
import { buildGenerationResultBlocks } from '@/lib/marketing/slackDelegation'
import { expectValidSlackBlocks } from './support/slackBlocks'

type Block = Record<string, any>

const MEMBER = { ok: true, name: 'Jules Soren', isGuest: false, isBot: false }
const GUEST = { ok: true, name: 'Client Person', isGuest: true, isBot: false }
const RESPONSE_URL = 'https://hooks.slack.test/actions/T1/1/abc'
const PROJECT = 'https://rendomat.example.org/videos/7'

const CARD = buildGenerationResultBlocks({
  formatLabel: 'script',
  title: 'The five minutes that lose a patient',
  bodyChunks: ['*Hook:* Most patients quit at setup.'],
  channel: 'CBOT',
  ts: '100.1',
  studioUrl: 'https://studio.example.org/studio/marketing?view=calendar',
  format: 'script',
  rendomat: { configured: true },
})
const VALUE = JSON.stringify({ c: 'CBOT', ts: '100.1' })

const post = (payload: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/slack/interactions', {
      method: 'POST',
      body: new URLSearchParams({ payload: JSON.stringify(payload) }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  )

const press = () => ({
  type: 'block_actions',
  user: { id: 'UJULES', name: 'jules' },
  trigger_id: 'trigger-1',
  response_url: RESPONSE_URL,
  channel: { id: 'CBOT' },
  container: { type: 'message', channel_id: 'CBOT', message_ts: '200.2', thread_ts: '100.1', is_ephemeral: false },
  message: { ts: '200.2', thread_ts: '100.1', text: 'Drafted a script', blocks: CARD },
  actions: [{ action_id: MARQUETA_ACTION.makeInRendomat, value: VALUE }],
})

const runAfter = async () => {
  while (mocks.afterQueue.length) for (const task of mocks.afterQueue.splice(0)) await task()
}
const responses = () => mocks.responseFetch.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, any>)
const buttons = (blocks: Block[]) => blocks.flatMap((block) => (block.type === 'actions' ? block.elements : []))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.afterQueue.length = 0
  mocks.getSlackUserProfile.mockResolvedValue(MEMBER)
  mocks.updateSlackMessage.mockResolvedValue(true)
  mocks.fetchSlackMessage.mockResolvedValue({ text: 'Drafted a script', blocks: CARD, attachments: [] })
  mocks.responseFetch.mockImplementation(async () => new Response('ok'))
  vi.stubGlobal('fetch', mocks.responseFetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('Export to Rendomat, pressed in Slack', () => {
  it('makes the video for the draft the button names and redraws that card in place', async () => {
    mocks.makeInRendomat.mockResolvedValue({ ok: true, projectUrl: PROJECT, existing: false, title: 'The five minutes' })
    expect((await post(press())).status).toBe(200)
    await runAfter()

    expect(mocks.makeInRendomat).toHaveBeenCalledWith({ channel: 'CBOT', ts: '100.1' })
    expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
    const redrawn = mocks.updateSlackMessage.mock.calls[0][0] as { channel: string; ts: string; blocks: Block[] }
    expect(redrawn).toMatchObject({ channel: 'CBOT', ts: '200.2' })
    expectValidSlackBlocks(redrawn.blocks as never)
    const row = buttons(redrawn.blocks)
    expect(row.map((element: Block) => element.text.text)).toEqual([LABEL.OPEN_IN_RENDOMAT, LABEL.DRAFT_DISCARD, 'Open Calendar'])
    expect(row[0].url).toBe(PROJECT)
    expect(JSON.stringify(redrawn.blocks)).toMatch(/Exported to Rendomat by <@UJULES>/)
    expect(responses()).toEqual([])
  })

  it('reaches nothing for a guest', async () => {
    mocks.getSlackUserProfile.mockResolvedValue(GUEST)
    await post(press())
    await runAfter()
    expect(mocks.makeInRendomat).not.toHaveBeenCalled()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(1)
    expect(responses()[0]).toMatchObject({ response_type: 'ephemeral', replace_original: false })
  })

  it('tells only the presser when a slide does not fit, and leaves the card alone', async () => {
    mocks.makeInRendomat.mockResolvedValue({ ok: false, kind: 'tooLong', message: 'The hook is too long for a slide. Shorten it on the Calendar and press again — nothing was made.' })
    await post(press())
    await runAfter()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', text: expect.stringMatching(/^The hook is too long/) })])
  })

  it('says the draft is still on the Calendar when Rendomat fails', async () => {
    mocks.makeInRendomat.mockResolvedValue({ ok: false, kind: 'failed', message: 'Rendomat answered 500.' })
    await post(press())
    await runAfter()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(responses()[0].text).toBe('Couldn’t make that in Rendomat — nothing changed. The draft is still on the Calendar.')
  })
})
