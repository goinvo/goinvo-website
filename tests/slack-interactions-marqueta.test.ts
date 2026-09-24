/**
 * Marqueta's buttons and modals, through the real interactions route.
 *
 * Slack I/O is mocked at `@/lib/chat/slack` and the dataset at the outreach
 * client; the server core in between (task actions, call log, call prep, the
 * roster) is the real code, so these exercise what a press actually writes.
 *
 * What these pin, in the order it would hurt to lose them:
 *   - a guest (or a profile Slack will not return) gets nothing outreach- or
 *     money-related, and nothing is read on their behalf — on EVERY button,
 *     the Monday plan's older ones (Details…, Not me, the away cover, I’m
 *     away, the one-time setup, the runway, ideas) and the answer form too;
 *   - a modal opens with NO Sanity read before views.open — a trigger_id is
 *     good for three seconds;
 *   - the call-log modal refuses to close without an outcome, and a submission
 *     is keyed on the Slack view so a retry is a no-op;
 *   - a check-in press redraws exactly its card on the LIVE message and keeps
 *     the attachments the digest's task cards live in, in the mode the card was
 *     drawn in (a plan card stays a plan card);
 *   - an away cover takes a task only from the owner it was drawn for, and
 *     "I’m away" posts one receipt whose Undo restores the exact prior record
 *     and redraws that receipt in place — or, when the thread refuses it,
 *     hands the presser a private copy that still carries the Undo;
 *   - every press leaves exactly one message changed: a logged call's receipt
 *     is redrawn by its Undo (struck through, nothing left to press, the
 *     message's own text kept when the receipt is only part of it), "Add
 *     … and log it" answers where its button was (and only the Add button
 *     leaves its row), a second press on an answered message does nothing,
 *     and an answer from Answer… redraws the card it was opened from;
 *   - a namesake (a Slack name matching someone else's board name) is never
 *     recorded as that person on the runway or on an answer;
 *   - the money presses (Still right, the runway form, Plan still fits,
 *     Needs a rethink) redraw only the money group, keeping every other block
 *     and the digest's attachments — and fall back to the thread on a message
 *     with no group to swap, never replacing the digest;
 *   - the runway and task-answer modals now confirm somewhere (a
 *     view_submission has no response_url), and still read the old plain
 *     metadata of a modal opened before the fix;
 *   - every failure is ephemeral, second person and button-free, in one shape;
 *   - the digest's legacy claim button still redraws its attachment card, and
 *     now takes a task only as that card showed it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Op = [string, ...unknown[]]
type PatchRecord = { id: string; ops: Op[] }

const mocks = vi.hoisted(() => {
  /** Every Slack call and Sanity read, in order — for "no read before views.open". */
  const calls: string[] = []
  const patches: PatchRecord[] = []
  const commit = vi.fn<(record: PatchRecord) => Promise<unknown>>(async () => ({}))
  const patch = vi.fn((id: string) => {
    const record: PatchRecord = { id, ops: [] }
    patches.push(record)
    const chain: Record<string, unknown> = {}
    for (const op of ['set', 'unset', 'setIfMissing', 'ifRevisionId', 'insert']) {
      chain[op] = (...args: unknown[]) => {
        record.ops.push([op, ...args])
        return chain
      }
    }
    chain.commit = () => commit(record)
    return chain
  })
  return {
    calls,
    patches,
    commit,
    outreach: { fetch: vi.fn(), patch, createIfNotExists: vi.fn(async (doc: unknown) => doc), transaction: vi.fn() },
    afterQueue: [] as Array<() => unknown>,
    verifySlackRequest: vi.fn(() => true),
    getSlackUserProfile: vi.fn(),
    getSlackUserDisplayName: vi.fn(),
    openSlackModal: vi.fn(),
    postSlackMessage: vi.fn(),
    postSlackEphemeral: vi.fn(),
    updateSlackMessage: vi.fn(),
    fetchSlackMessage: vi.fn(),
    responseFetch: vi.fn(),
    claimMarketingTask: vi.fn(),
    declineMarketingTask: vi.fn(),
    answerMarketingTask: vi.fn(),
    getMarketingTaskDetail: vi.fn(),
    linkMarketingIdentity: vi.fn(),
    setMarketingAvailability: vi.fn(),
    recordStrategyVerdict: vi.fn(),
    renderMoneyAndDirection: vi.fn(),
    readRunway: vi.fn(),
    confirmRunway: vi.fn(),
    recordSignedWork: vi.fn(),
    setRunway: vi.fn(),
  }
})

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: (task: () => unknown) => void mocks.afterQueue.push(task) }
})
vi.mock('@/lib/chat/slack', () => ({
  getSlackConfig: () => ({ botToken: 'xoxb-test', channelId: 'CCHAT', signingSecret: 'secret' }),
  verifySlackRequest: mocks.verifySlackRequest,
  getSlackUserProfile: mocks.getSlackUserProfile,
  getSlackUserDisplayName: mocks.getSlackUserDisplayName,
  openSlackModal: mocks.openSlackModal,
  postSlackMessage: mocks.postSlackMessage,
  postSlackEphemeral: mocks.postSlackEphemeral,
  updateSlackMessage: mocks.updateSlackMessage,
  fetchSlackMessage: mocks.fetchSlackMessage,
}))
vi.mock('@/lib/marketing/outreachClient.server', () => ({
  getOutreachClient: () => mocks.outreach,
  isOutreachClientConfigured: () => true,
}))
// The digest's writes are mocked; Undo is the real thing, against the mocked dataset.
vi.mock('@/lib/marketing/slackActions.server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/marketing/slackActions.server')>()),
  claimMarketingTask: mocks.claimMarketingTask,
  declineMarketingTask: mocks.declineMarketingTask,
  answerMarketingTask: mocks.answerMarketingTask,
  getMarketingTaskDetail: mocks.getMarketingTaskDetail,
  linkMarketingIdentity: mocks.linkMarketingIdentity,
  setMarketingAvailability: mocks.setMarketingAvailability,
}))
vi.mock('@/lib/marketing/strategyCheck.server', () => ({
  recordStrategyVerdict: mocks.recordStrategyVerdict,
  renderMoneyAndDirection: mocks.renderMoneyAndDirection,
}))
vi.mock('@/lib/marketing/runway.server', () => ({
  readRunway: mocks.readRunway,
  confirmRunway: mocks.confirmRunway,
  recordSignedWork: mocks.recordSignedWork,
  setRunway: mocks.setRunway,
}))
vi.mock('@/lib/marketing/ideaCapture.server', () => ({ keepCapturedIdea: vi.fn(), discardCapturedIdea: vi.fn() }))
vi.mock('@/lib/chat/sanity', () => ({ getChatSanityClient: () => null }))
vi.mock('@/lib/shop/disputeEvidence', () => ({ submitDisputeEvidence: vi.fn() }))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/slack/interactions/route'
import { availabilityDocId, type TeamMemberAvailability } from '@/lib/marketing/availability'
import { PREP_DATA_QUERY, type PrepData } from '@/lib/marketing/callPrep.server'
import { discardCapturedIdea, keepCapturedIdea } from '@/lib/marketing/ideaCapture.server'
import {
  CALL_FOLLOW_UP_BLOCK,
  CALL_FOLLOW_UP_INPUT,
  CALL_LOG_CALLBACK,
  CALL_NOTES_BLOCK,
  CALL_NOTES_INPUT,
  CALL_OUTCOME_BLOCK,
  CALL_OUTCOME_INPUT,
  MARQUETA_ACTION,
  TASK_BLOCKER_BLOCK,
  TASK_BLOCKER_INPUT,
  TASK_STUCK_CALLBACK,
  checkInTaskActionsBlockId,
  checkInTaskBlockId,
  decodeCallLogMetadata,
  decodeCallLogUndo,
  decodeContactRef,
  decodeTaskStuckMetadata,
  encodeCallLogMetadata,
  encodeCallLogUndo,
  encodeContactRef,
  encodeAvailabilityUndo,
  encodeStrategyValue,
  encodeTaskCardValue,
  encodeTaskStuckMetadata,
} from '@/lib/marketing/marquetaActions'
import {
  MARKETING_ACTION,
  MARKETING_ANSWER_BLOCK,
  MARKETING_ANSWER_INPUT,
  MARKETING_RUNWAY_CALLBACK,
  RUNWAY_MONTHS_BLOCK,
  RUNWAY_MONTHS_INPUT,
  encodeActionValue,
} from '@/lib/marketing/slackDelegation'
import { AVAILABILITY_WRITE_QUERY } from '@/lib/marketing/slackActions.server'
import { TEAM_AVAILABILITY_QUERY } from '@/lib/marketing/team.server'
import { CALL_LOG_RECEIPT_ACTIONS_BLOCK, CALL_LOG_RECEIPT_BLOCK } from '@/lib/marketing/callLog'
import { buildMoneyAndDirectionBlocks, MONEY_RECEIPT_BLOCK, type MoneyReceipt } from '@/lib/marketing/strategyCheck'
import { buildCheckInTaskBlocks, buildTaskCard } from '@/lib/marketing/weeklyCheckIn'
import { expectValidSlackBlocks, expectValidSlackModal } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

const NOW = new Date('2026-09-24T14:00:00Z')

const TEAM: TeamMemberAvailability[] = [
  { ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available' },
  { ownerName: 'Eric', slackUserId: 'UERIC', status: 'available' },
]

const MEMBER = { ok: true, name: 'Juhan Sonin', isGuest: false, isBot: false }
const GUEST = { ok: true, name: 'Client Person', isGuest: true, isBot: false }

const RESPONSE_URL = 'https://hooks.slack.test/actions/T1/1/abc'

const TASK = {
  _id: 'op-case-study',
  _rev: 'rev-1',
  _createdAt: '2026-09-01T12:00:00Z',
  _updatedAt: '2026-09-20T12:00:00Z',
  title: 'Write the <5% case study',
  ownerName: 'Juhan',
  ownerSlackUserId: 'UJUHAN',
  status: 'queued',
  kind: 'content',
  dueAt: '2026-09-25T12:00:00Z',
  estimatedMinutes: 60,
  activity: [],
}

const JANE_LOG = {
  _id: 'contact-jane',
  _rev: 'rev-jane',
  name: 'Jane Doe',
  organization: 'Acme Health',
  email: 'jane.doe@acmehealth.org',
  status: 'new',
  interactions: [],
}

const PREP: PrepData = {
  contacts: [
    {
      _id: 'contact-jane',
      name: 'Jane Doe',
      organization: 'Acme Health',
      role: 'CMIO',
      status: 'new',
      warmth: 'unknown',
      email: 'jane.doe@acmehealth.org',
      phone: '617-555-0142',
    },
  ],
  research: [],
  offers: [],
  evidence: [],
}

type Fixtures = {
  availability?: TeamMemberAvailability[] | Error
  /** Availability records by id, as Undo reads them. */
  records?: Map<string, Record<string, unknown>>
  task?: Record<string, unknown> | null
  contact?: Record<string, unknown> | null
  existingContact?: Record<string, unknown> | null
  prep?: PrepData
}

/** Answer each query the way the dataset would. Anything unrouted is a test bug, loudly. */
function routeOutreach(fixtures: Fixtures = {}) {
  mocks.outreach.fetch.mockImplementation(async (query: string, params?: { id?: string }) => {
    mocks.calls.push('sanity.fetch')
    if (query === TEAM_AVAILABILITY_QUERY) {
      if (fixtures.availability instanceof Error) throw fixtures.availability
      return fixtures.availability ?? TEAM
    }
    if (query === PREP_DATA_QUERY) return fixtures.prep ?? PREP
    if (query === AVAILABILITY_WRITE_QUERY) {
      const doc = fixtures.records?.get(String(params?.id))
      return doc ? { ...doc } : null
    }
    if (query.includes('_type == "marketingOperation" && _id == $id')) return fixtures.task === undefined ? TASK : fixtures.task
    if (query.includes('_type == "marketingContact" && _id == $id') && query.includes('closeReason')) {
      return fixtures.contact === undefined ? JANE_LOG : fixtures.contact
    }
    if (query.includes('_type == "marketingContact" && _id == $id')) return fixtures.existingContact ?? null
    if (query.startsWith('*[_id == $id]')) return null
    throw new Error(`unrouted query: ${query.slice(0, 80)}`)
  })
}

/** A block_actions or view_submission payload, as Slack form-encodes it. */
const post = (payload: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/slack/interactions', {
      method: 'POST',
      body: new URLSearchParams({ payload: JSON.stringify(payload) }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  )

const runAfter = async () => {
  while (mocks.afterQueue.length) {
    const queue = mocks.afterQueue.splice(0)
    for (const task of queue) await task()
  }
}

/** A button press on a message in #marketing-bot. */
function press(actionId: string, value: string, overrides: Record<string, unknown> = {}) {
  return {
    type: 'block_actions',
    user: { id: 'UJUHAN', name: 'juhan' },
    trigger_id: 'trigger-1',
    response_url: RESPONSE_URL,
    channel: { id: 'CBOT' },
    container: { type: 'message', channel_id: 'CBOT', message_ts: '200.2', is_ephemeral: false },
    message: { ts: '200.2', text: 'Thursday check-in', blocks: [] },
    actions: [{ action_id: actionId, value }],
    ...overrides,
  }
}

/** What went back through response_url, parsed. */
const responses = () =>
  mocks.responseFetch.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, any>)

const posted = () => mocks.postSlackMessage.mock.calls.map(([input]) => input as Record<string, any>)

const buttonsIn = (blocks: Block[] = []) =>
  blocks
    .flatMap((block) => [...(block.elements || []), ...(block.accessory ? [block.accessory] : [])])
    .filter((element: Block) => element.type === 'button')

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  mocks.calls.length = 0
  mocks.patches.length = 0
  mocks.afterQueue.length = 0
  mocks.commit.mockImplementation(async () => ({}))
  mocks.verifySlackRequest.mockReturnValue(true)
  mocks.getSlackUserProfile.mockImplementation(async () => {
    mocks.calls.push('users.info')
    return MEMBER
  })
  mocks.getSlackUserDisplayName.mockResolvedValue('Juhan Sonin')
  mocks.openSlackModal.mockImplementation(async () => {
    mocks.calls.push('views.open')
    return true
  })
  mocks.postSlackMessage.mockImplementation(async (input: { channel: string }) => ({ channel: input.channel, ts: '300.3' }))
  mocks.postSlackEphemeral.mockResolvedValue(true)
  mocks.updateSlackMessage.mockResolvedValue(true)
  mocks.fetchSlackMessage.mockResolvedValue(null)
  mocks.responseFetch.mockImplementation(async () => new Response('ok'))
  // The real pure builder, without a runway read: the receipt, as a press would draw it.
  mocks.renderMoneyAndDirection.mockImplementation(async ({ now, receipt }: { now: Date; receipt: MoneyReceipt }) =>
    buildMoneyAndDirectionBlocks({ now, runway: null, receipt, studioBaseUrl: 'https://www.goinvo.com' }),
  )
  vi.stubGlobal('fetch', mocks.responseFetch)
  routeOutreach()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ── The team-only gate ───────────────────────────────────────────────────────

describe('the team-only gate', () => {
  const prepRef = encodeContactRef({ contactId: 'contact-jane', organization: 'Acme Health', name: 'Jane Doe' })

  it('refuses a guest pressing Prep, and reads nothing on their behalf', async () => {
    mocks.getSlackUserProfile.mockResolvedValue(GUEST)
    const response = await post(press(MARQUETA_ACTION.prepCall, prepRef))
    expect(response.status).toBe(200)
    await runAfter()

    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackEphemeral).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(1)
    expect(responses()[0]).toMatchObject({ response_type: 'ephemeral', replace_original: false })
    expect(responses()[0].text).toMatch(/studio team/)
  })

  it('fails closed when Slack will not say who pressed', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: false })
    await post(press(MARQUETA_ACTION.prepCall, prepRef))
    await runAfter()
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    expect(responses()[0].text).toMatch(/^Couldn’t check who you are in Slack just now — nothing changed\./)
  })

  it('opens no call-log form for a guest', async () => {
    mocks.getSlackUserProfile.mockResolvedValue(GUEST)
    await post(press(MARQUETA_ACTION.logCall, prepRef))
    await runAfter()
    expect(mocks.openSlackModal).not.toHaveBeenCalled()
    expect(responses()[0].text).toMatch(/studio team/)
  })

  it('refuses a guest pressing a strategy button, and records nothing', async () => {
    mocks.getSlackUserProfile.mockResolvedValue(GUEST)
    await post(press(MARQUETA_ACTION.strategyConfirm, encodeStrategyValue('2026-09')))
    await runAfter()
    expect(mocks.recordStrategyVerdict).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('refuses a guest pressing Add to outreach', async () => {
    mocks.getSlackUserProfile.mockResolvedValue(GUEST)
    await post(press(MARQUETA_ACTION.addContact, encodeContactRef({ name: 'Sam Rivera', organization: 'Acme' })))
    await runAfter()
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
  })

  // The check-in cards travel: a `mine` answer is posted wherever she was
  // asked, #marketing included. Take was the worst of these — a guest the
  // roster does not know resolved to their own display name and was written
  // in as the task's owner.
  describe('on a check-in task card', () => {
    const card = buildCheckInTaskBlocks(
      { _id: TASK._id, title: TASK.title, status: 'queued', dueAt: TASK.dueAt },
      { now: NOW },
    )
    const unowned = { ...TASK, ownerName: undefined, ownerSlackUserId: undefined }

    it.each([
      ['Done', MARQUETA_ACTION.taskDone],
      ['Take', MARQUETA_ACTION.taskTake],
      ['Drop', MARQUETA_ACTION.taskDrop],
      ['Unstuck', MARQUETA_ACTION.taskProgress],
      ['Reopen', MARQUETA_ACTION.taskReopen],
      ['Hand back', MARQUETA_ACTION.taskHandBack],
      ['Keep', MARQUETA_ACTION.taskSnooze],
    ])('refuses a guest pressing %s, and reads and writes nothing', async (_label, actionId) => {
      routeOutreach({ task: unowned })
      mocks.getSlackUserProfile.mockResolvedValue(GUEST)
      await post(
        press(actionId, encodeActionValue({ taskId: TASK._id, status: 'queued' }), {
          user: { id: 'UGUEST', name: 'client.person' },
          message: { ts: '200.2', blocks: card },
        }),
      )
      await runAfter()

      expect(mocks.outreach.fetch).not.toHaveBeenCalled()
      expect(mocks.patches).toHaveLength(0)
      expect(mocks.commit).not.toHaveBeenCalled()
      expect(mocks.fetchSlackMessage).not.toHaveBeenCalled()
      expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
      expect(mocks.postSlackMessage).not.toHaveBeenCalled()
      expect(responses()).toHaveLength(1)
      expect(responses()[0]).toMatchObject({ response_type: 'ephemeral', replace_original: false })
      expect(responses()[0].text).toMatch(/studio team/)
    })

    it('fails closed on a card press when Slack will not say who pressed', async () => {
      routeOutreach({ task: unowned })
      mocks.getSlackUserProfile.mockResolvedValue({ ok: false })
      await post(press(MARQUETA_ACTION.taskTake, encodeActionValue({ taskId: TASK._id }), { message: { ts: '200.2', blocks: card } }))
      await runAfter()
      expect(mocks.patches).toHaveLength(0)
      expect(responses()[0].text).toMatch(/^Couldn’t check who you are in Slack just now — nothing changed\./)
    })

    it('opens no Stuck form for a guest', async () => {
      mocks.getSlackUserProfile.mockResolvedValue(GUEST)
      const response = await post(
        press(MARQUETA_ACTION.taskStuck, encodeActionValue({ taskId: TASK._id, status: 'queued' }), {
          user: { id: 'UGUEST' },
          message: { ts: '200.2', blocks: card },
        }),
      )
      expect(response.status).toBe(200)
      await runAfter()
      expect(mocks.openSlackModal).not.toHaveBeenCalled()
      expect(mocks.outreach.fetch).not.toHaveBeenCalled()
      expect(responses()[0].text).toMatch(/studio team/)
    })

    it('still lets a team member take an unowned task, under the board name', async () => {
      routeOutreach({ task: unowned })
      await post(press(MARQUETA_ACTION.taskTake, encodeActionValue({ taskId: TASK._id }), { message: { ts: '200.2', blocks: card } }))
      await runAfter()
      expect(mocks.patches).toHaveLength(1)
      expect(mocks.patches[0].ops[0]).toEqual([
        'set',
        expect.objectContaining({ ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN' }),
      ])
      // One users.info for the gate; the board name came from the roster.
      expect(mocks.getSlackUserProfile).toHaveBeenCalledTimes(1)
      expect(mocks.getSlackUserDisplayName).not.toHaveBeenCalled()
    })
  })
})

// ── Prep ─────────────────────────────────────────────────────────────────────

describe('Prep this call', () => {
  it('posts the outline in the thread and hands contact details to the presser alone', async () => {
    await post(
      press(MARQUETA_ACTION.prepCall, encodeContactRef({ contactId: 'contact-jane', organization: 'Acme Health' }), {
        message: { ts: '200.5', thread_ts: '200.1', blocks: [] },
      }),
    )
    await runAfter()

    const messages = posted()
    expect(messages.length).toBeGreaterThanOrEqual(1)
    for (const message of messages) {
      expect(message.channel).toBe('CBOT')
      expect(message.threadTs).toBe('200.1')
      expect(message.username).toBe('Marqueta')
      expect(JSON.stringify(message)).not.toMatch(/jane\.doe@acmehealth\.org|617-555-0142/)
      expectValidSlackBlocks(message.blocks || [])
    }
    expect(mocks.postSlackEphemeral).toHaveBeenCalledTimes(1)
    const ephemeral = mocks.postSlackEphemeral.mock.calls[0][0]
    expect(ephemeral).toMatchObject({ channel: 'CBOT', user: 'UJUHAN', threadTs: '200.1' })
    expect(ephemeral.text).toContain('jane.doe@acmehealth.org')
    expect(ephemeral.blocks).toBeUndefined()
  })

  it('answers a press inside an ephemeral privately, with nothing to press', async () => {
    await post(
      press(MARQUETA_ACTION.prepCall, encodeContactRef({ contactId: 'contact-jane', organization: 'Acme Health' }), {
        container: { type: 'message', channel_id: 'CBOT', message_ts: '200.2', is_ephemeral: true },
      }),
    )
    await runAfter()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    const sent = responses()
    expect(sent.length).toBeGreaterThanOrEqual(1)
    for (const body of sent) {
      expect(body.response_type).toBe('ephemeral')
      expect(buttonsIn(body.blocks)).toHaveLength(0)
      if (body.blocks) expectValidSlackBlocks(body.blocks)
    }
  })
})

// ── Log how it went ──────────────────────────────────────────────────────────

describe('Log how it went', () => {
  const ref = encodeContactRef({
    contactId: 'contact-jane',
    organization: 'Acme Health',
    name: 'Jane Doe (Acme Health)',
    note: 'called Jane, left a voicemail',
    outcome: 'voicemail',
  })

  it('opens the form with no Sanity read before views.open', async () => {
    const response = await post(
      press(MARQUETA_ACTION.logCall, ref, { message: { ts: '200.5', thread_ts: '200.1', blocks: [] } }),
    )
    expect(response.status).toBe(200)

    expect(mocks.calls).toEqual(['users.info', 'views.open'])
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    const [trigger, view] = mocks.openSlackModal.mock.calls[0]
    expect(trigger).toBe('trigger-1')
    expectValidSlackModal(view)
    expect(view.callback_id).toBe(CALL_LOG_CALLBACK)
    expect(decodeCallLogMetadata(view.private_metadata)).toEqual({
      contactId: 'contact-jane',
      channel: 'CBOT',
      threadTs: '200.1',
      label: 'Jane Doe (Acme Health)',
    })
    const outcome = view.blocks.find((block: Block) => block.block_id === CALL_OUTCOME_BLOCK)
    expect(outcome.element.initial_option.value).toBe('voicemail')
    const notes = view.blocks.find((block: Block) => block.block_id === CALL_NOTES_BLOCK)
    expect(notes.element.initial_value).toBe('called Jane, left a voicemail')
    expect(mocks.afterQueue).toHaveLength(0)
  })

  it('says to add them first when there is no contact to log against', async () => {
    await post(press(MARQUETA_ACTION.logCall, encodeContactRef({ name: 'Sam Rivera', organization: 'Acme' })))
    await runAfter()
    expect(mocks.openSlackModal).not.toHaveBeenCalled()
    expect(responses()[0].text).toMatch(/^Couldn’t log that — nothing changed\. .*Add them to outreach first/)
  })

  it('tells the presser when the form would not open', async () => {
    mocks.openSlackModal.mockResolvedValue(false)
    await post(press(MARQUETA_ACTION.logCall, ref))
    await runAfter()
    expect(responses()[0].text).toBe('Couldn’t open that form — nothing changed. Try again, or do it on Outreach.')
    expect(buttonsIn(responses()[0].blocks)).toHaveLength(0)
  })
})

describe('the call-log modal', () => {
  const metadata = encodeCallLogMetadata({ contactId: 'contact-jane', channel: 'CBOT', threadTs: '200.1', label: 'Jane Doe' })

  const submit = (values: Record<string, unknown>, view: Record<string, unknown> = {}) =>
    post({
      type: 'view_submission',
      user: { id: 'UJUHAN', name: 'juhan' },
      view: { id: 'V123', callback_id: CALL_LOG_CALLBACK, private_metadata: metadata, state: { values }, ...view },
    })

  const withOutcome = (outcome: string) => ({
    [CALL_OUTCOME_BLOCK]: { [CALL_OUTCOME_INPUT]: { selected_option: { value: outcome } } },
    [CALL_NOTES_BLOCK]: { [CALL_NOTES_INPUT]: { value: 'She is at HIMSS next week' } },
    [CALL_FOLLOW_UP_BLOCK]: { [CALL_FOLLOW_UP_INPUT]: { selected_option: { value: 'default' } } },
  })

  it('stays open with an error under the outcome when none was picked', async () => {
    const response = await submit({
      [CALL_OUTCOME_BLOCK]: { [CALL_OUTCOME_INPUT]: { selected_option: null } },
      [CALL_NOTES_BLOCK]: { [CALL_NOTES_INPUT]: { value: 'notes typed so far' } },
    })
    expect(await response.json()).toEqual({
      response_action: 'errors',
      errors: { [CALL_OUTCOME_BLOCK]: 'Pick what happened.' },
    })
    expect(mocks.afterQueue).toHaveLength(0)
    // Not mistaken for a task answer by the older handler.
    expect(mocks.answerMarketingTask).not.toHaveBeenCalled()
  })

  it('logs under the board name, keyed on the view, and posts the room’s receipt in the thread with an Undo', async () => {
    const response = await submit(withOutcome('voicemail'))
    expect(await response.json()).toEqual({})
    await runAfter()

    expect(mocks.answerMarketingTask).not.toHaveBeenCalled()
    expect(mocks.patches).toHaveLength(1)
    const insert = mocks.patches[0].ops.find(([op]) => op === 'insert')!
    const entry = (insert[3] as Record<string, unknown>[])[0]
    expect(entry).toMatchObject({ _key: 'slack-V123', by: 'Juhan', outcome: 'Left a voicemail', intel: 'She is at HIMSS next week' })
    expect(mocks.patches[0].ops).toContainEqual(['ifRevisionId', 'rev-jane'])

    const [message] = posted()
    expect(message).toMatchObject({ channel: 'CBOT', threadTs: '200.1', username: 'Marqueta' })
    // What was logged, where the contact now stands, and when to follow up — never on a weekend.
    expect(message.text).toBe(':white_check_mark: <@UJUHAN> logged a voicemail for Jane Doe. Status: Contacted (was New). Next follow-up Mon 28 Sep.')
    expectValidSlackBlocks(message.blocks)
    expect(message.blocks[0]).toMatchObject({ block_id: CALL_LOG_RECEIPT_BLOCK, text: { text: message.text } })
    const [undo] = buttonsIn(message.blocks)
    expect(undo.action_id).toBe(MARQUETA_ACTION.callLogUndo)
    expect(undo.text.text).toBe('Undo')
    expect(undo.style).toBeUndefined()
    expect(decodeCallLogUndo(undo.value)).toMatchObject({ contactId: 'contact-jane', interactionKey: 'slack-V123' })
    expect(JSON.stringify(message)).not.toContain('jane.doe@acmehealth.org')
  })

  it('writes nothing and says nothing when Slack delivers the same submission again', async () => {
    routeOutreach({ contact: { ...JANE_LOG, interactions: [{ _key: 'slack-V123' }] } })
    await submit(withOutcome('voicemail'))
    await runAfter()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('does not log under a display name when the team list cannot be read — and hands the notes back', async () => {
    routeOutreach({ availability: new Error('sanity down') })
    await submit(withOutcome('voicemail'))
    await runAfter()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    const ephemeral = mocks.postSlackEphemeral.mock.calls[0][0]
    expect(ephemeral).toMatchObject({ channel: 'CBOT', user: 'UJUHAN', threadTs: '200.1' })
    expect(ephemeral.text).toContain('She is at HIMSS next week')
  })

  it('tells only the presser when the log did not save — in the error shape, nothing in the room', async () => {
    routeOutreach({ contact: null })
    await submit(withOutcome('voicemail'))
    await runAfter()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    const ephemeral = mocks.postSlackEphemeral.mock.calls[0][0]
    expect(ephemeral).toMatchObject({ channel: 'CBOT', user: 'UJUHAN', threadTs: '200.1' })
    expect(ephemeral.text).toMatch(/^Couldn’t log that — nothing changed\./)
    expect(ephemeral.blocks).toBeUndefined()
  })

  it('refuses a submission that lost its metadata rather than guessing a contact', async () => {
    const response = await submit(withOutcome('voicemail'), { private_metadata: 'not json' })
    expect((await response.json()).response_action).toBe('errors')
    expect(mocks.afterQueue).toHaveLength(0)
  })
})

describe('Undo a quick log', () => {
  const value = encodeCallLogUndo({
    contactId: 'contact-jane',
    interactionKey: 'slack-V123',
    prior: { status: 'new', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' },
  })
  const logged = {
    ...JANE_LOG,
    status: 'contacted',
    lastContactedAt: NOW.toISOString(),
    interactions: [{ _key: 'slack-V123', outcome: 'Left a voicemail' }],
  }

  it('takes the call back off the record and redraws its own receipt — struck through, nothing left to press', async () => {
    routeOutreach({ contact: logged })
    const receipt = [
      { type: 'section', block_id: CALL_LOG_RECEIPT_BLOCK, text: { type: 'mrkdwn', text: ':white_check_mark: <@UJUHAN> logged a voicemail for Jane Doe.' } },
      { type: 'actions', block_id: CALL_LOG_RECEIPT_ACTIONS_BLOCK, elements: [{ type: 'button', action_id: MARQUETA_ACTION.callLogUndo, text: { type: 'plain_text', text: 'Undo' }, value }] },
    ]
    mocks.fetchSlackMessage.mockResolvedValue({ text: ':white_check_mark: <@UJUHAN> logged a voicemail for Jane Doe.', blocks: receipt, attachments: [] })
    await post(press(MARQUETA_ACTION.callLogUndo, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: receipt } }))
    await runAfter()

    expect(mocks.patches).toHaveLength(1)
    expect(mocks.patches[0].ops).toContainEqual(['unset', expect.arrayContaining(['interactions[_key=="slack-V123"]'])])
    expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    // The receipt is the whole message, so its text changes with it.
    expect(update).toMatchObject({ channel: 'CBOT', ts: '300.3', text: '~Logged a voicemail for Jane Doe~ — undone by <@UJUHAN>' })
    expectValidSlackBlocks(update.blocks)
    expect(update.blocks).toEqual([
      expect.objectContaining({ block_id: CALL_LOG_RECEIPT_BLOCK, text: { type: 'mrkdwn', text: '~Logged a voicemail for Jane Doe~ — undone by <@UJUHAN>' } }),
    ])
    expect(buttonsIn(update.blocks)).toHaveLength(0)
    // One message changed, and no second one.
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(0)
  })

  // "Add … and log it" answers in place, so a receipt can sit inside a call-prep
  // outline. Undo strikes the receipt through and leaves the outline — and the
  // outline's own notification and search text — as they were.
  it('keeps the message’s own text when the receipt is only part of it', async () => {
    routeOutreach({ contact: logged })
    const outline = [
      { type: 'header', text: { type: 'plain_text', text: 'Call prep: Jane Doe' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*On the call* …' } },
      { type: 'section', block_id: CALL_LOG_RECEIPT_BLOCK, text: { type: 'mrkdwn', text: ':white_check_mark: <@UJUHAN> logged a voicemail for Jane Doe.' } },
      { type: 'actions', block_id: CALL_LOG_RECEIPT_ACTIONS_BLOCK, elements: [{ type: 'button', action_id: MARQUETA_ACTION.callLogUndo, text: { type: 'plain_text', text: 'Undo' }, value }] },
      { type: 'section', text: { type: 'mrkdwn', text: '*Questions* …' } },
    ]
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Call prep: Jane Doe (Acme Health)', blocks: outline, attachments: [] })
    await post(press(MARQUETA_ACTION.callLogUndo, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: outline } }))
    await runAfter()
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update.text).toBe('Call prep: Jane Doe (Acme Health)')
    expectValidSlackBlocks(update.blocks)
    expect(update.blocks).toEqual([
      outline[0],
      outline[1],
      expect.objectContaining({ block_id: CALL_LOG_RECEIPT_BLOCK, text: { type: 'mrkdwn', text: '~Logged a voicemail for Jane Doe~ — undone by <@UJUHAN>' } }),
      outline[4],
    ])
    expect(buttonsIn(update.blocks)).toHaveLength(0)
  })

  it('redraws an older receipt with no block ids as a whole', async () => {
    routeOutreach({ contact: logged })
    const legacy = [{ type: 'section', text: { type: 'mrkdwn', text: '<@UJUHAN> logged: Left a voicemail with Jane Doe.' } }, { type: 'actions', elements: [{ type: 'button', action_id: MARQUETA_ACTION.callLogUndo, text: { type: 'plain_text', text: 'Undo' }, value }] }]
    await post(press(MARQUETA_ACTION.callLogUndo, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: legacy } }))
    await runAfter()
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update.blocks).toHaveLength(1)
    expect(buttonsIn(update.blocks)).toHaveLength(0)
  })

  it('pressed again, changes nothing and tells only the presser, in the error shape', async () => {
    // The touch is already gone: the second press finds nothing to take back.
    routeOutreach({ contact: { ...JANE_LOG, interactions: [] } })
    await post(press(MARQUETA_ACTION.callLogUndo, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: [] } }))
    await runAfter()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', text: expect.stringMatching(/^Couldn’t undo that — nothing changed\./) })])
    expect(buttonsIn(responses()[0].blocks)).toHaveLength(0)
  })
})

describe('Add to outreach', () => {
  const created = () => mocks.outreach.createIfNotExists.mock.calls.map(([doc]) => doc as Record<string, any>).filter((doc) => doc._type === 'marketingContact')
  /** The chat's reply the button lives on: a line, and the Add button. */
  const reply = (value: string) => [
    { type: 'section', text: { type: 'mrkdwn', text: '*Sam Rivera (Acme)* isn’t in outreach yet.' } },
    { type: 'actions', elements: [{ type: 'button', action_id: MARQUETA_ACTION.addContact, text: { type: 'plain_text', text: 'Add Sam Rivera and log it' }, value, style: 'primary' }] },
  ]
  /** The new record, as the log reads it back. */
  const fresh = () => ({ _id: created()[0]?._id, _rev: 'rev-new', name: 'Sam Rivera', organization: 'Acme', status: 'new', interactions: [] })

  it('adds them and logs the call in ONE press when the outcome cannot set a new contact back — the receipt takes the button’s place', async () => {
    const value = encodeContactRef({ name: 'Sam Rivera', organization: 'Acme', outcome: 'voicemail' })
    mocks.outreach.fetch.mockImplementation(async (query: string) => {
      if (query === TEAM_AVAILABILITY_QUERY) return TEAM
      if (query.includes('closeReason')) return fresh()
      return null
    })
    const before = reply(value)
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Sam Rivera isn’t in outreach yet.', blocks: before, attachments: [] })
    await post(press(MARQUETA_ACTION.addContact, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: before } }))
    await runAfter()

    expect(created()).toHaveLength(1)
    expect(created()[0]).toMatchObject({ name: 'Sam Rivera', organization: 'Acme', owner: 'Juhan' })
    const log = mocks.patches.find((patch) => patch.ops.some(([op]) => op === 'insert'))!
    const entry = (log.ops.find(([op]) => op === 'insert')![3] as Record<string, unknown>[])[0]
    // Keyed on the message the button is on: a second press finds this touch.
    expect(entry).toMatchObject({ _key: 'slack-add-CBOT-300.3', by: 'Juhan', outcome: 'Left a voicemail' })

    expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update).toMatchObject({ channel: 'CBOT', ts: '300.3' })
    expectValidSlackBlocks(update.blocks)
    expect(update.blocks[0]).toBe(before[0])
    expect(update.blocks[1]).toMatchObject({ block_id: CALL_LOG_RECEIPT_BLOCK })
    expect(update.blocks[1].text.text).toMatch(/^:white_check_mark: <@UJUHAN> logged a voicemail for Sam Rivera \(Acme\)\. Status: Contacted \(was New\)\. Next follow-up /)
    const buttons = buttonsIn(update.blocks)
    expect(buttons.map((button) => button.action_id)).toEqual([MARQUETA_ACTION.callLogUndo])
    expect(decodeCallLogUndo(buttons[0].value)).toMatchObject({ interactionKey: 'slack-add-CBOT-300.3' })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(0)
  })

  it('pressed twice, adds one record, logs one touch, and says nothing more', async () => {
    const value = encodeContactRef({ name: 'Sam Rivera', organization: 'Acme', outcome: 'voicemail' })
    // The first press already answered in place: the live message has a receipt, not the Add button.
    const answered = [reply(value)[0], { type: 'section', block_id: CALL_LOG_RECEIPT_BLOCK, text: { type: 'mrkdwn', text: 'logged' } }]
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Sam Rivera', blocks: answered, attachments: [] })
    // The presser's stale copy still shows the button.
    await post(press(MARQUETA_ACTION.addContact, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: reply(value) } }))
    await runAfter()
    expect(created()).toHaveLength(0)
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('never logs in one press against someone already on file — they could be anywhere in the pipeline', async () => {
    const value = encodeContactRef({ name: 'Sam Rivera', organization: 'Acme', outcome: 'voicemail' })
    mocks.outreach.fetch.mockImplementation(async (query: string) => {
      if (query === TEAM_AVAILABILITY_QUERY) return TEAM
      if (query.startsWith('*[_id == $id][0]{ _id }')) return { _id: 'exists' }
      return null
    })
    await post(press(MARQUETA_ACTION.addContact, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: [] } }))
    await runAfter()
    expect(created()).toHaveLength(0)
    expect(mocks.patches).toHaveLength(0)
    const [message] = posted()
    expect(message.text).toBe('Sam Rivera (Acme) is already in outreach.')
    const [log] = buttonsIn(message.blocks)
    expect(log.action_id).toBe(MARQUETA_ACTION.logCall)
    expect(decodeContactRef(log.value)).toMatchObject({ outcome: 'voicemail' })
  })

  it('never logs "not right now" in one press — it adds them and hands over the form with the outcome chosen', async () => {
    const value = encodeContactRef({ name: 'Sam Rivera', organization: 'Acme', outcome: 'notNow' })
    await post(press(MARQUETA_ACTION.addContact, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: [] } }))
    await runAfter()

    expect(created()).toHaveLength(1)
    expect(mocks.patches).toHaveLength(0)
    // No message to rewrite: the answer goes in the thread.
    const [message] = posted()
    expect(message).toMatchObject({ channel: 'CBOT', threadTs: '200.1', text: 'Added Sam Rivera (Acme) to outreach.' })
    expectValidSlackBlocks(message.blocks)
    const [log] = buttonsIn(message.blocks)
    expect(log).toMatchObject({ action_id: MARQUETA_ACTION.logCall, text: expect.objectContaining({ text: 'Log it…' }), style: 'primary' })
    expect(decodeContactRef(log.value)).toMatchObject({ contactId: created()[0]._id, outcome: 'notNow' })
  })

  it('with no outcome, only adds them — and puts the answer where the button was, keeping the rest of the outline', async () => {
    const value = encodeContactRef({ name: 'Alex Chen', organization: 'Beacon Health', note: 'met at HIMSS' })
    const outline = [
      { type: 'header', text: { type: 'plain_text', text: 'Call prep: Alex Chen' } },
      { type: 'section', text: { type: 'mrkdwn', text: '*On the call* …' } },
      {
        type: 'actions',
        elements: [
          { type: 'button', action_id: MARQUETA_ACTION.addContact, text: { type: 'plain_text', text: 'Add Alex Chen to outreach' }, value },
          { type: 'button', text: { type: 'plain_text', text: 'Open Outreach' }, url: 'https://www.goinvo.com/studio/marketing?view=outreach' },
        ],
      },
      { type: 'section', text: { type: 'mrkdwn', text: '*Questions* …' } },
    ]
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Call prep: Alex Chen', blocks: outline, attachments: [] })
    await post(press(MARQUETA_ACTION.addContact, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: outline } }))
    await runAfter()

    expect(created()[0]).toMatchObject({ name: 'Alex Chen', organization: 'Beacon Health' })
    expect(mocks.patches).toHaveLength(0)
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expectValidSlackBlocks(update.blocks)
    expect(update.blocks[0]).toBe(outline[0])
    expect(update.blocks[1]).toBe(outline[1])
    expect(update.blocks[2].text.text).toBe('Added Alex Chen (Beacon Health) to outreach.')
    expect(update.blocks.at(-1)).toBe(outline[3])
    const [log] = buttonsIn(update.blocks)
    expect(decodeContactRef(log.value)).toMatchObject({ contactId: created()[0]._id, outcome: '', note: '' })
    expect(buttonsIn(update.blocks).some((button) => button.action_id === MARQUETA_ACTION.addContact)).toBe(false)
    // Only the Add button left its row: Open Outreach is still there, under the answer.
    expect(update.blocks[4]).toEqual({ type: 'actions', elements: [outline[2].elements![1]] })
    expect(buttonsIn(update.blocks).map((button) => button.text.text)).toEqual(['Log it…', 'Open Outreach'])
  })

  it('pressed again on a copy it cannot read back live, answers privately — never over the first press’s receipt and its Undo', async () => {
    const value = encodeContactRef({ name: 'Sam Rivera', organization: 'Acme', outcome: 'voicemail' })
    // A private channel with no history scope: no live read, only the presser's copy — which still shows the button.
    mocks.fetchSlackMessage.mockResolvedValue(null)
    // The first press already added Sam (a deterministic id), so this one creates nobody.
    mocks.outreach.fetch.mockImplementation(async (query: string) => {
      if (query === TEAM_AVAILABILITY_QUERY) return TEAM
      if (query.startsWith('*[_id == $id][0]{ _id }')) return { _id: 'marketingContact.sam-rivera-acme' }
      return null
    })
    await post(press(MARQUETA_ACTION.addContact, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: reply(value) } }))
    await runAfter()
    expect(created()).toHaveLength(0)
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', text: 'Sam Rivera (Acme) is already in outreach.' })])
  })
})

// ── The check-in's task buttons ──────────────────────────────────────────────

describe('a check-in task button', () => {
  const card = buildCheckInTaskBlocks(
    { _id: TASK._id, title: TASK.title, ownerName: 'Juhan', status: 'queued', dueAt: TASK.dueAt },
    { now: NOW },
  )
  const header = { type: 'header', text: { type: 'plain_text', text: 'Thursday check-in' } }
  const other = buildCheckInTaskBlocks(
    { _id: 'op-other', title: 'Somebody else’s task', ownerName: 'Eric', status: 'working' },
    { now: NOW },
  )
  const attachments = [{ color: '#36a64f', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'A task card' } }] }]
  const value = encodeActionValue({ taskId: TASK._id, ownerName: 'Juhan', status: 'queued' })

  it('re-reads the live message and chat.updates exactly that card, keeping the attachments', async () => {
    mocks.fetchSlackMessage.mockResolvedValue({
      text: 'Thursday check-in — live',
      blocks: [header, ...card, ...other],
      attachments,
    })
    // The payload's copy is stale: it has no "other" task on it.
    await post(press(MARQUETA_ACTION.taskDone, value, { message: { ts: '200.2', text: 'stale', blocks: [header, ...card] } }))
    await runAfter()

    expect(mocks.fetchSlackMessage).toHaveBeenCalledWith({ channel: 'CBOT', ts: '200.2', threadTs: '200.2' })
    expect(mocks.patches[0].ops[0]).toEqual(['set', expect.objectContaining({ status: 'done' })])
    expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update).toMatchObject({ channel: 'CBOT', ts: '200.2', text: 'Thursday check-in — live' })
    expect(update.attachments).toEqual(attachments)
    expectValidSlackBlocks(update.blocks)

    // The header and the other person's card are untouched; this card now offers Reopen.
    expect(update.blocks[0]).toEqual(header)
    expect(update.blocks.slice(3)).toEqual(other)
    const section = update.blocks.find((block: Block) => block.block_id === checkInTaskBlockId(TASK._id))
    expect(section.text.text).toContain('_Done by <@UJUHAN> · Thu 24 Sep_')
    const buttons = update.blocks.find((block: Block) => block.block_id === checkInTaskActionsBlockId(TASK._id)).elements
    expect(buttons.map((element: Block) => element.action_id)).toEqual([MARQUETA_ACTION.taskReopen])
    // Nothing replaced through response_url, and nothing extra said.
    expect(mocks.responseFetch).not.toHaveBeenCalled()
  })

  it('redraws the title linked where the record says the task lives — not its kind’s default tab', async () => {
    // Content defaults to the Calendar; this record names SEO, and the card was drawn linking there.
    routeOutreach({ task: { ...TASK, kind: 'content', targetView: 'seo' } })
    const base = process.env.MARKETING_PUBLIC_BASE_URL
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'
    try {
      await post(press(MARQUETA_ACTION.taskDone, value, { message: { ts: '200.2', text: 'Thursday check-in', blocks: [header, ...card] } }))
      await runAfter()
    } finally {
      if (base === undefined) delete process.env.MARKETING_PUBLIC_BASE_URL
      else process.env.MARKETING_PUBLIC_BASE_URL = base
    }
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    const section = update.blocks.find((block: Block) => block.block_id === checkInTaskBlockId(TASK._id))
    expect(section.text.text).toContain(`<https://www.goinvo.com/studio/marketing?view=seo&task=${TASK._id}|`)
  })

  it('falls back to the pressed copy when the live message cannot be read', async () => {
    await post(press(MARQUETA_ACTION.taskDone, value, { message: { ts: '200.2', text: 'Thursday check-in', blocks: [header, ...card] } }))
    await runAfter()
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update.text).toBe('Thursday check-in')
    expect(update.attachments).toBeUndefined()
    expectValidSlackBlocks(update.blocks)
  })

  it('tells only the presser when the press changed nothing, and leaves the card alone', async () => {
    routeOutreach({ task: { ...TASK, status: 'done' } })
    await post(press(MARQUETA_ACTION.taskDone, value, { message: { ts: '200.2', blocks: [header, ...card] } }))
    await runAfter()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(responses()[0]).toMatchObject({ response_type: 'ephemeral', text: 'Already done.' })
  })

  it('answers a refusal through response_url', async () => {
    routeOutreach({ task: { ...TASK, ownerName: 'Eric', ownerSlackUserId: 'UERIC' } })
    await post(press(MARQUETA_ACTION.taskHandBack, value, { message: { ts: '200.2', blocks: [header, ...card] } }))
    await runAfter()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(responses()[0].text).toMatch(/Eric’s — only they can hand it back/)
  })

  it('will not take a task under a display name when the team list cannot be read', async () => {
    routeOutreach({ availability: new Error('sanity down'), task: { ...TASK, ownerName: undefined, ownerSlackUserId: undefined } })
    await post(press(MARQUETA_ACTION.taskTake, value, { message: { ts: '200.2', blocks: [header, ...card] } }))
    await runAfter()
    expect(mocks.patches).toHaveLength(0)
    expect(responses()[0].text).toMatch(/^Couldn’t take that — nothing changed\. I couldn’t tell which name on the team list is yours/)
  })
})

describe('Stuck', () => {
  const card = buildCheckInTaskBlocks(
    { _id: TASK._id, title: TASK.title, ownerName: 'Juhan', status: 'queued', dueAt: TASK.dueAt },
    { now: NOW },
  )
  const value = encodeActionValue({ taskId: TASK._id, ownerName: 'Juhan', status: 'queued' })

  it('opens the form from the card alone — no Sanity read before views.open', async () => {
    await post(press(MARQUETA_ACTION.taskStuck, value, { message: { ts: '200.5', thread_ts: '200.1', blocks: card } }))
    // The team check is a Slack lookup, not a Sanity read.
    expect(mocks.calls).toEqual(['users.info', 'views.open'])
    const [, view] = mocks.openSlackModal.mock.calls[0]
    expectValidSlackModal(view)
    expect(view.callback_id).toBe(TASK_STUCK_CALLBACK)
    expect(JSON.stringify(view.blocks)).toContain('Write the &lt;5% case study')
    expect(decodeTaskStuckMetadata(view.private_metadata)).toEqual({
      taskId: TASK._id,
      channel: 'CBOT',
      threadTs: '200.1',
      messageTs: '200.5',
    })
  })

  const submit = (blocker: string) =>
    post({
      type: 'view_submission',
      user: { id: 'UJUHAN' },
      view: {
        id: 'V9',
        callback_id: TASK_STUCK_CALLBACK,
        private_metadata: encodeTaskStuckMetadata({ taskId: TASK._id, channel: 'CBOT', threadTs: '200.1', messageTs: '200.5' }),
        state: { values: { [TASK_BLOCKER_BLOCK]: { [TASK_BLOCKER_INPUT]: { value: blocker } } } },
      },
    })

  it('keeps the form open when nothing was written in it', async () => {
    const body = await (await submit('   ')).json()
    expect(body.response_action).toBe('errors')
    expect(Object.keys(body.errors)).toEqual([TASK_BLOCKER_BLOCK])
    expect(mocks.afterQueue).toHaveLength(0)
  })

  it('records the blocker and says so on the card it lives on — once, not again in the thread', async () => {
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Your list', blocks: card, attachments: [] })
    await submit('Need the case-study numbers')
    await runAfter()
    expect(mocks.patches[0].ops[0]).toEqual([
      'set',
      expect.objectContaining({ status: 'blocked', blocker: 'Need the case-study numbers' }),
    ])
    expect(mocks.fetchSlackMessage).toHaveBeenCalledWith({ channel: 'CBOT', ts: '200.5', threadTs: '200.1' })
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update.ts).toBe('200.5')
    expectValidSlackBlocks(update.blocks)
    expect(JSON.stringify(update.blocks)).toContain('in the way: Need the case-study numbers')
    expect(JSON.stringify(update.blocks)).toContain('_Stuck — <@UJUHAN> added what’s in the way_')
    // Rule 5: one event, one place.
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('notes it in the thread instead when the message cannot be read back', async () => {
    await submit('Need the case-study numbers')
    await runAfter()
    expect(posted()).toEqual([
      expect.objectContaining({
        channel: 'CBOT',
        threadTs: '200.1',
        text: 'Stuck: *Write the &lt;5% case study* — <@UJUHAN> added what’s in the way.',
      }),
    ])
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
  })

  it('redraws a plan card as a plan card: the form remembers the mode', async () => {
    const planCard = buildTaskCard({ _id: TASK._id, title: TASK.title, ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'queued' }, { now: NOW, mode: 'plan' })
    await post(
      press(MARQUETA_ACTION.taskStuck, encodeTaskCardValue({ taskId: TASK._id, ownerName: 'Juhan', mode: 'plan' }), {
        message: { ts: '200.5', thread_ts: '200.1', blocks: planCard },
      }),
    )
    const [, view] = mocks.openSlackModal.mock.calls[0]
    expect(decodeTaskStuckMetadata(view.private_metadata)).toMatchObject({ taskId: TASK._id, mode: 'plan' })

    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Monday plan', blocks: planCard, attachments: [] })
    await post({
      type: 'view_submission',
      user: { id: 'UJUHAN' },
      view: {
        id: 'V10',
        callback_id: TASK_STUCK_CALLBACK,
        private_metadata: view.private_metadata,
        state: { values: { [TASK_BLOCKER_BLOCK]: { [TASK_BLOCKER_INPUT]: { value: 'Need the logos' } } } },
      },
    })
    await runAfter()
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update.blocks.find((block: Block) => block.block_id === checkInTaskActionsBlockId(TASK._id)).elements.map((e: Block) => e.text.text)).toEqual([
      'Hand back',
    ])
  })
})

// ── Money and direction: every press redraws the group in place ─────────────

/** A Monday plan carrying the money group (`mq_money…`) between task cards and a footer, with legacy attachments. */
function mondayPlan() {
  const header = { type: 'header', text: { type: 'plain_text', text: 'Monday plan' } }
  const card = buildTaskCard({ _id: 'op-other', title: 'Somebody else’s task', ownerName: 'Eric', slackUserId: 'UERIC', status: 'working' }, { now: NOW, mode: 'plan' })
  const money = [
    { type: 'section', block_id: 'mq_money_runway', text: { type: 'mrkdwn', text: '*Money and direction*\nStill 3.5 months of certain runway?' } },
    {
      type: 'actions',
      block_id: 'mq_money_runway_actions',
      elements: [
        { type: 'button', action_id: MARKETING_ACTION.runwayConfirm, text: { type: 'plain_text', text: 'Still right' }, value: 'runway' },
        { type: 'button', action_id: MARKETING_ACTION.runwaySigned, text: { type: 'plain_text', text: 'We signed something…' }, value: 'signed' },
      ],
    },
    { type: 'context', block_id: 'mq_money_next', elements: [{ type: 'mrkdwn', text: 'Next: whether the plan still fits — I’ll ask once the runway’s confirmed.' }] },
  ]
  const footer = { type: 'actions', block_id: 'mq_footer', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Open This week' }, url: 'https://www.goinvo.com/studio/marketing?view=thisWeek' }] }
  const blocks: Block[] = [header, ...card, ...money, footer]
  const attachments = [{ color: '#ccc', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'A legacy card' } }] }]
  return { blocks, attachments, others: [header, ...card, footer], text: 'Monday plan: 3 need an owner' }
}

/** Everything but the money group — which must come back as the very same blocks. */
const withoutMoney = (blocks: Block[]) => blocks.filter((block) => !String(block.block_id || '').startsWith('mq_money'))

describe('the runway’s Still right', () => {
  it('confirms under the board name and redraws only the money group: the receipt, with the button that changes it', async () => {
    const plan = mondayPlan()
    mocks.confirmRunway.mockResolvedValue({ summary: '3.5 months of certain runway (to 11 Jan 2027) — Rebuild.' })
    mocks.fetchSlackMessage.mockResolvedValue({ text: plan.text, blocks: plan.blocks, attachments: plan.attachments })
    await post(press(MARKETING_ACTION.runwayConfirm, 'runway', { message: { ts: '200.2', text: plan.text, blocks: plan.blocks, attachments: plan.attachments } }))
    await runAfter()

    expect(mocks.confirmRunway).toHaveBeenCalledWith(expect.objectContaining({ personName: 'Juhan' }))
    expect(mocks.renderMoneyAndDirection).toHaveBeenCalledWith({ now: expect.any(Date), receipt: { kind: 'runwayConfirmed', who: '<@UJUHAN>' } })
    expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update).toMatchObject({ channel: 'CBOT', ts: '200.2', text: plan.text, attachments: plan.attachments })
    expectValidSlackBlocks(update.blocks)
    // Only its own group changed.
    expect(withoutMoney(update.blocks)).toEqual(plan.others)
    const receipt = update.blocks.find((block: Block) => block.block_id === MONEY_RECEIPT_BLOCK)
    expect(receipt.text.text).toBe(':white_check_mark: Runway confirmed by <@UJUHAN> · Thu 24 Sep.')
    const moneyButtons = update.blocks.filter((block: Block) => String(block.block_id || '').startsWith('mq_money')).flatMap((block: Block) => block.elements || [])
    expect(moneyButtons.map((element: Block) => [element.text.text, element.style])).toEqual([['It changed…', undefined]])
    // One message changed, and nothing else said.
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(0)
  })

  it('answers in the plan’s thread when the message has no money group to swap (posted before it had ids)', async () => {
    mocks.confirmRunway.mockResolvedValue({ summary: '3.5 months.' })
    const old = { ts: '200.2', text: 'This week in marketing', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '*Money and direction*' } }] }
    await post(press(MARKETING_ACTION.runwayConfirm, 'runway', { message: old }))
    await runAfter()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    const [message] = posted()
    expect(message).toMatchObject({ channel: 'CBOT', threadTs: '200.2', text: ':white_check_mark: Runway confirmed by <@UJUHAN> · Thu 24 Sep.' })
    expectValidSlackBlocks(message.blocks)
  })

  // A namesake: a team member whose Slack name is "Juhan", while the Juhan on
  // the team list is linked to another account. The resolver names nobody —
  // and the display name must not be written in its place.
  it('never records a namesake’s display name as who confirmed it', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Juhan', isGuest: false, isBot: false })
    await post(press(MARKETING_ACTION.runwayConfirm, 'runway', { user: { id: 'UNAMESAKE', name: 'juhan' }, message: { ts: '200.2', blocks: mondayPlan().blocks } }))
    await runAfter()
    expect(mocks.confirmRunway).not.toHaveBeenCalled()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toEqual([
      expect.objectContaining({
        response_type: 'ephemeral',
        text: 'Couldn’t confirm the runway — nothing changed. I couldn’t tell which name on the team list is yours — pick it in the Monday plan’s one-time setup first.',
      }),
    ])
  })

  it('tells only the presser when the write fails, in the error shape', async () => {
    mocks.confirmRunway.mockRejectedValue(new Error('sanity down'))
    await post(press(MARKETING_ACTION.runwayConfirm, 'runway', { message: { ts: '200.2', blocks: mondayPlan().blocks } }))
    await runAfter()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', text: 'Couldn’t confirm the runway — nothing changed. Try again in a minute.' })])
  })
})

describe('the strategy buttons', () => {
  it('Plan still fits: records the answer and redraws the money group in place — never replacing the plan', async () => {
    const plan = mondayPlan()
    mocks.fetchSlackMessage.mockResolvedValue({ text: plan.text, blocks: plan.blocks, attachments: plan.attachments })
    mocks.recordStrategyVerdict.mockResolvedValue({ ok: true, message: 'Plan confirmed for September by Juhan.' })
    await post(press(MARQUETA_ACTION.strategyConfirm, encodeStrategyValue('2026-09'), { message: { ts: '200.2', blocks: plan.blocks } }))
    await runAfter()

    expect(mocks.recordStrategyVerdict).toHaveBeenCalledWith(expect.objectContaining({ verdict: 'stillRight', personName: 'Juhan', monthKey: '2026-09' }))
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update.attachments).toEqual(plan.attachments)
    expect(withoutMoney(update.blocks)).toEqual(plan.others)
    expect(update.blocks.find((block: Block) => block.block_id === MONEY_RECEIPT_BLOCK).text.text).toBe(
      ':white_check_mark: Plan confirmed for September by <@UJUHAN> — I’ll ask again in October.',
    )
    for (const body of responses()) expect(body.replace_original).not.toBe(true)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('Needs a rethink: the receipt says it is a decision on This week, suggested to the asker, and links to it', async () => {
    const plan = mondayPlan()
    mocks.fetchSlackMessage.mockResolvedValue({ text: plan.text, blocks: plan.blocks, attachments: [] })
    mocks.recordStrategyVerdict.mockResolvedValue({ ok: true, filed: true, decisionTaskId: 'op-rethink', message: 'Juhan asked for a rethink.' })
    await post(press(MARQUETA_ACTION.strategyRethink, encodeStrategyValue('2026-09'), { message: { ts: '200.2', blocks: plan.blocks } }))
    await runAfter()

    expect(mocks.renderMoneyAndDirection).toHaveBeenCalledWith({
      now: expect.any(Date),
      receipt: { kind: 'rethink', who: '<@UJUHAN>', decisionTaskId: 'op-rethink', suggestedTo: 'Juhan', joined: false },
    })
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expectValidSlackBlocks(update.blocks)
    expect(update.blocks.find((block: Block) => block.block_id === MONEY_RECEIPT_BLOCK).text.text).toBe(
      '<@UJUHAN> asked for a rethink — it’s a decision on This week, suggested to Juhan.',
    )
    const open = buttonsIn(update.blocks.filter((block: Block) => String(block.block_id || '').startsWith('mq_money')))
    expect(open).toEqual([expect.objectContaining({ url: 'https://www.goinvo.com/studio/marketing?view=thisWeek&task=op-rethink', text: expect.objectContaining({ text: 'Open This week' }) })])
  })

  it('a second person asking joins the open decision — and the receipt says so', async () => {
    const plan = mondayPlan()
    mocks.fetchSlackMessage.mockResolvedValue({ text: plan.text, blocks: plan.blocks, attachments: [] })
    mocks.recordStrategyVerdict.mockResolvedValue({ ok: true, filed: false, decisionTaskId: 'op-rethink', message: 'asked too' })
    await post(press(MARQUETA_ACTION.strategyRethink, encodeStrategyValue('2026-09'), { message: { ts: '200.2', blocks: plan.blocks } }))
    await runAfter()
    expect(mocks.renderMoneyAndDirection.mock.calls[0][0].receipt).toMatchObject({ kind: 'rethink', joined: true })
  })

  it('answers in the thread when the plan has no money group, and never replaces the plan', async () => {
    const digest = {
      ts: '200.2',
      text: 'This week in marketing',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '*Money and direction*' } }],
      attachments: [{ color: '#ccc', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Task card' } }] }],
    }
    mocks.recordStrategyVerdict.mockResolvedValue({ ok: true, message: 'Plan confirmed.' })
    await post(press(MARQUETA_ACTION.strategyConfirm, encodeStrategyValue('2026-09'), { message: digest }))
    await runAfter()
    expect(posted()).toEqual([expect.objectContaining({ channel: 'CBOT', threadTs: '200.2', username: 'Marqueta' })])
    for (const body of responses()) expect(body.replace_original).not.toBe(true)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
  })

  it('follows a stale press with this month’s answer, in the thread', async () => {
    mocks.recordStrategyVerdict.mockResolvedValue({
      ok: false,
      stale: true,
      message: 'That was August 2026’s check — here is this month’s.',
      answer: '*Strategy* — Rebuild',
    })
    await post(press(MARQUETA_ACTION.strategyConfirm, encodeStrategyValue('2026-08'), { message: { ts: '200.2', blocks: mondayPlan().blocks } }))
    await runAfter()
    expect(posted()[0].text).toBe('That was August 2026’s check — here is this month’s.\n\n*Strategy* — Rebuild')
    expect(mocks.renderMoneyAndDirection).not.toHaveBeenCalled()
  })

  it('tells only the presser when the answer could not be recorded', async () => {
    mocks.recordStrategyVerdict.mockResolvedValue({ ok: false, message: 'Couldn’t record that — nothing changed. Answer it on This week in the Studio.' })
    await post(press(MARQUETA_ACTION.strategyConfirm, encodeStrategyValue('2026-09'), { message: { ts: '200.2', blocks: mondayPlan().blocks } }))
    await runAfter()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', text: expect.stringMatching(/^Couldn’t record that — nothing changed\./) })])
  })
})

// ── The runway and task-answer modals now confirm somewhere ──────────────────

describe('the runway modal', () => {
  const submitRunway = (metadata: string, months = '5') =>
    post({
      type: 'view_submission',
      user: { id: 'UJUHAN', name: 'juhan' },
      view: {
        id: 'V2',
        callback_id: MARKETING_RUNWAY_CALLBACK,
        private_metadata: metadata,
        state: { values: { [RUNWAY_MONTHS_BLOCK]: { [RUNWAY_MONTHS_INPUT]: { value: months } } } },
      },
    })

  it('remembers where it was opened, and redraws that message’s money group on save', async () => {
    mocks.readRunway.mockResolvedValue({ summary: '4.5 months of certain runway — Rebuild.' })
    const plan = mondayPlan()
    await post(press(MARKETING_ACTION.runwayUpdate, '', { message: { ts: '200.2', blocks: plan.blocks } }))
    const [, view] = mocks.openSlackModal.mock.calls[0]
    expect(view.callback_id).toBe(MARKETING_RUNWAY_CALLBACK)
    expectValidSlackModal(view)
    expect(JSON.parse(view.private_metadata)).toEqual({ k: 'update', ch: 'CBOT', th: '200.2' })

    mocks.setRunway.mockResolvedValue({ summary: '5 months of certain runway (to 24 Feb 2027) — Rebuild.' })
    mocks.fetchSlackMessage.mockResolvedValue({ text: plan.text, blocks: plan.blocks, attachments: [] })
    const response = await submitRunway(view.private_metadata)
    expect(await response.json()).toEqual({})
    await runAfter()
    expect(mocks.setRunway).toHaveBeenCalledWith(expect.objectContaining({ months: 5, personName: 'Juhan' }))
    expect(mocks.renderMoneyAndDirection).toHaveBeenCalledWith({ now: expect.any(Date), receipt: { kind: 'runwayUpdated', who: '<@UJUHAN>' } })
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update).toMatchObject({ channel: 'CBOT', ts: '200.2' })
    expect(withoutMoney(update.blocks)).toEqual(plan.others)
    expect(update.blocks.find((block: Block) => block.block_id === MONEY_RECEIPT_BLOCK).text.text).toBe(':white_check_mark: Runway updated by <@UJUHAN> · Thu 24 Sep.')
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('remembers a message inside a thread by its own ts, apart from the thread it replies to', async () => {
    mocks.readRunway.mockResolvedValue({ summary: '' })
    await post(press(MARKETING_ACTION.runwaySigned, '', { message: { ts: '300.3', thread_ts: '200.2', blocks: [] } }))
    const [, view] = mocks.openSlackModal.mock.calls[0]
    expect(JSON.parse(view.private_metadata)).toEqual({ k: 'signed', ch: 'CBOT', th: '200.2', ts: '300.3' })

    mocks.recordSignedWork.mockResolvedValue({ summary: '8 months.' })
    await submitRunway(view.private_metadata, '3')
    await runAfter()
    expect(mocks.fetchSlackMessage).toHaveBeenCalledWith({ channel: 'CBOT', ts: '300.3', threadTs: '200.2' })
    // Nothing to swap on that (empty) message: the receipt goes in the thread.
    expect(posted()).toEqual([
      expect.objectContaining({ channel: 'CBOT', threadTs: '200.2', text: ':white_check_mark: Signed work recorded by <@UJUHAN> · Thu 24 Sep.' }),
    ])
  })

  it('still reads a modal opened before the fix (plain "signed"), with nowhere to confirm', async () => {
    mocks.recordSignedWork.mockResolvedValue({ summary: '7 months — Growth.' })
    await post({
      type: 'view_submission',
      user: { id: 'UJUHAN' },
      view: {
        callback_id: MARKETING_RUNWAY_CALLBACK,
        private_metadata: 'signed',
        state: { values: { [RUNWAY_MONTHS_BLOCK]: { [RUNWAY_MONTHS_INPUT]: { value: '3' } } } },
      },
    })
    await runAfter()
    expect(mocks.recordSignedWork).toHaveBeenCalledWith(expect.objectContaining({ monthsAdded: 3 }))
    expect(mocks.setRunway).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
  })

  it('saves nothing for a namesake, and tells only them why', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Juhan', isGuest: false, isBot: false })
    await post({
      type: 'view_submission',
      user: { id: 'UNAMESAKE', name: 'juhan' },
      view: {
        id: 'V9',
        callback_id: MARKETING_RUNWAY_CALLBACK,
        private_metadata: JSON.stringify({ k: 'update', ch: 'CBOT', th: '200.2' }),
        state: { values: { [RUNWAY_MONTHS_BLOCK]: { [RUNWAY_MONTHS_INPUT]: { value: '6' } } } },
      },
    })
    await runAfter()
    expect(mocks.setRunway).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'CBOT', user: 'UNAMESAKE', text: expect.stringMatching(/^Couldn’t save the runway — nothing changed\. I couldn’t tell which name on the team list is yours/) }),
    )
  })

  it('tells only the person who saved it when the runway did not save', async () => {
    mocks.setRunway.mockRejectedValue(new Error('down'))
    await submitRunway(JSON.stringify({ k: 'update', ch: 'CBOT', th: '200.2' }))
    await runAfter()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'CBOT', user: 'UJUHAN', text: 'Couldn’t save the runway — nothing changed. Try again in a minute.' }),
    )
  })
})

// ── Caught ideas: the judgement takes the buttons' place ────────────────────

describe('judging a caught idea', () => {
  const value = JSON.stringify({ c: 'CMKT', ts: '100.1' })
  const capture: Block[] = [
    { type: 'section', text: { type: 'mrkdwn', text: 'Filed as an idea so it doesn’t scroll away:\n*Merch table at Town Day* · event' } },
    {
      type: 'actions',
      elements: [
        { type: 'button', action_id: MARKETING_ACTION.ideaKeep, text: { type: 'plain_text', text: 'Keep it' }, value, style: 'primary' },
        { type: 'button', action_id: MARKETING_ACTION.ideaDiscard, text: { type: 'plain_text', text: 'Not an idea' }, value },
        { type: 'button', text: { type: 'plain_text', text: 'Open This week' }, url: 'https://www.goinvo.com/studio/marketing?view=thisWeek&focus=caught' },
      ],
    },
  ]
  const onCapture = { message: { ts: '300.3', thread_ts: '100.1', text: 'Filed as an idea: Merch table at Town Day — keep it?', blocks: capture } }

  // A kept idea leaves This week's "Caught in Slack" (that list is the ideas
  // still waiting on a yes or no) for the idea backlog on the SEO tab — so the
  // receipt says where it went, as the Studio's own Keep does, and the link to
  // a page that no longer shows it goes with the buttons.
  it('Keep it: redraws her own message in place — the idea stays, a receipt says who kept it and where it is now', async () => {
    vi.mocked(keepCapturedIdea).mockResolvedValue({ ok: true } as never)
    await post(press(MARKETING_ACTION.ideaKeep, value, onCapture))
    await runAfter()

    expect(keepCapturedIdea).toHaveBeenCalledWith(expect.objectContaining({ channel: 'CMKT', ts: '100.1' }))
    const [replaced] = responses()
    expect(replaced).toMatchObject({ replace_original: true, text: 'Filed as an idea: Merch table at Town Day — keep it?' })
    expectValidSlackBlocks(replaced.blocks)
    expect(replaced.blocks[0]).toEqual(capture[0])
    expect(replaced.blocks[1]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: ':white_check_mark: Kept by <@UJUHAN> — it’s in the idea backlog on the SEO tab.' }],
    })
    expect(JSON.stringify(replaced.blocks)).not.toMatch(/on This week|view=thisWeek/)
    expect(buttonsIn(replaced.blocks)).toEqual([])
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('Not an idea: binned, with the miss remembered — and nothing left to press', async () => {
    vi.mocked(discardCapturedIdea).mockResolvedValue({ ok: true } as never)
    await post(press(MARKETING_ACTION.ideaDiscard, value, onCapture))
    await runAfter()
    const [replaced] = responses()
    expect(replaced.blocks[1].elements[0].text).toBe('Binned by <@UJUHAN> — I’ll remember the miss.')
    expect(buttonsIn(replaced.blocks)).toEqual([])
  })

  it('keeps a link that still shows the thing: a binned draft keeps Open Calendar', async () => {
    vi.mocked(discardCapturedIdea).mockResolvedValue({ ok: true } as never)
    const calendar = 'https://www.goinvo.com/studio/marketing?view=calendar'
    const draft: Block[] = [
      { type: 'section', text: { type: 'mrkdwn', text: 'That looks like a finished draft, so it’s on the calendar with the copy attached:' } },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Open Calendar' }, url: calendar },
          { type: 'button', action_id: MARKETING_ACTION.ideaDiscard, text: { type: 'plain_text', text: 'Not for the calendar' }, value },
        ],
      },
    ]
    await post(press(MARKETING_ACTION.ideaDiscard, value, { message: { ts: '300.3', thread_ts: '100.1', text: 'Put on the calendar as a draft', blocks: draft } }))
    await runAfter()
    const [replaced] = responses()
    expectValidSlackBlocks(replaced.blocks)
    expect(buttonsIn(replaced.blocks)).toEqual([expect.objectContaining({ url: calendar })])
  })

  it('tells only the presser when it did not save, and leaves the buttons for another try', async () => {
    vi.mocked(keepCapturedIdea).mockResolvedValue({ ok: false, message: 'Couldn’t keep that — nothing changed. Judge it on This week.' } as never)
    await post(press(MARKETING_ACTION.ideaKeep, value, onCapture))
    await runAfter()
    expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', replace_original: false, text: 'Couldn’t keep that — nothing changed. Judge it on This week.' })])
  })
})

// ── One error shape ─────────────────────────────────────────────────────────

describe('every failure', () => {
  it('is ephemeral, second person, with no buttons: what could not be done, that nothing changed, and where instead', async () => {
    const cases: Array<[string, () => Promise<unknown>]> = [
      ['a card that lost its task', () => post(press(MARQUETA_ACTION.taskDone, 'not json'))],
      ['a Prep that lost its contact', () => post(press(MARQUETA_ACTION.prepCall, 'not json'))],
      ['an Undo that lost its call', () => post(press(MARQUETA_ACTION.callLogUndo, 'not json'))],
      ['a strategy button that lost its month', () => post(press(MARQUETA_ACTION.strategyConfirm, 'not json'))],
      ['a Not me that lost its task', () => post(press(MARKETING_ACTION.decline, 'not json'))],
    ]
    for (const [name, run] of cases) {
      mocks.responseFetch.mockClear()
      await run()
      await runAfter()
      const sent = responses()
      expect(sent, name).toHaveLength(1)
      expect(sent[0], name).toMatchObject({ response_type: 'ephemeral', replace_original: false })
      expect(sent[0].text, name).toMatch(/^Couldn’t [^—]+ — nothing changed\. \S/)
      expect(sent[0].blocks, name).toBeUndefined()
    }
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
  })
})

describe('the task-answer modal', () => {
  const detail = {
    _id: 'op-decision',
    title: 'Publish the F1–F8 taxonomy?',
    kind: 'decision',
    status: 'needsHuman',
    humanQuestion: 'Publish it or keep it internal?',
    estimatedMinutes: 15,
  }

  it('remembers where it was opened, and confirms the answer there when there is no card to redraw', async () => {
    mocks.getMarketingTaskDetail.mockResolvedValue(detail)
    await post(press(MARKETING_ACTION.details, encodeActionValue({ taskId: 'op-decision' })))
    const [, view] = mocks.openSlackModal.mock.calls[0]
    expectValidSlackModal(view)
    expect(JSON.parse(view.private_metadata)).toEqual({ t: 'op-decision', ch: 'CBOT', th: '200.2' })

    mocks.answerMarketingTask.mockResolvedValue({ ok: true, taskTitle: 'Publish the <F1> taxonomy?' })
    await post({
      type: 'view_submission',
      user: { id: 'UJUHAN' },
      view: {
        id: 'V3',
        callback_id: 'goinvo_marketing_answer_task',
        private_metadata: view.private_metadata,
        state: { values: { [MARKETING_ANSWER_BLOCK]: { [MARKETING_ANSWER_INPUT]: { value: 'Keep it internal.' } } } },
      },
    })
    await runAfter()
    expect(mocks.answerMarketingTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'op-decision', answer: 'Keep it internal.' }))
    expect(posted()).toEqual([
      expect.objectContaining({
        channel: 'CBOT',
        threadTs: '200.2',
        text: ':white_check_mark: <@UJUHAN> answered *Publish the &lt;F1&gt; taxonomy?*.',
      }),
    ])
  })

  // Rule 5: the press redraws its own card — no second message for the same
  // event — and the Answer… that could overwrite the answer is gone from it.
  it('redraws the card the form was opened from, in its mode, and posts nothing', async () => {
    const decision = {
      _id: 'op-decision',
      title: 'Publish the F1–F8 taxonomy?',
      kind: 'decision',
      status: 'needsHuman',
      humanQuestion: 'Publish it or keep it internal?',
      minutes: 15,
      dueAt: '2026-09-30T16:00:00Z',
    }
    const header = { type: 'header', text: { type: 'plain_text', text: 'Monday plan' } }
    const card = buildTaskCard(decision, { now: NOW, mode: 'plan' })
    const other = buildTaskCard({ _id: 'op-other', title: 'Somebody else’s task', ownerName: 'Eric', slackUserId: 'UERIC', status: 'working' }, { now: NOW, mode: 'plan' })
    const plan = [header, ...card, ...other]
    const answerButton = card[1].elements[0]
    expect(answerButton.text.text).toBe('Answer…')

    mocks.getMarketingTaskDetail.mockResolvedValue(detail)
    await post(press(MARKETING_ACTION.details, answerButton.value, { message: { ts: '200.2', text: 'Monday plan', blocks: plan } }))
    const [, view] = mocks.openSlackModal.mock.calls[0]
    expect(JSON.parse(view.private_metadata)).toEqual({ t: 'op-decision', m: 'plan', ch: 'CBOT', th: '200.2' })

    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Monday plan', blocks: plan, attachments: [] })
    mocks.answerMarketingTask.mockResolvedValue({ ok: true, changed: true, taskTitle: decision.title, task: { ...decision, status: 'queued' } })
    await post({
      type: 'view_submission',
      user: { id: 'UJUHAN', name: 'juhan' },
      view: {
        id: 'V4',
        callback_id: 'goinvo_marketing_answer_task',
        private_metadata: view.private_metadata,
        state: { values: { [MARKETING_ANSWER_BLOCK]: { [MARKETING_ANSWER_INPUT]: { value: 'Keep it internal.' } } } },
      },
    })
    await runAfter()

    // Recorded under the board name, never the Slack display name.
    expect(mocks.answerMarketingTask).toHaveBeenCalledWith({ taskId: 'op-decision', answer: 'Keep it internal.', personName: 'Juhan', slackUserId: 'UJUHAN' })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackEphemeral).not.toHaveBeenCalled()
    expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update).toMatchObject({ channel: 'CBOT', ts: '200.2', text: 'Monday plan' })
    expectValidSlackBlocks(update.blocks)
    // Only its own two blocks changed.
    expect(update.blocks[0]).toEqual(header)
    expect(update.blocks.slice(3)).toEqual(other)
    expect(update.blocks[1].text.text).toContain('_Answered by <@UJUHAN> · Thu 24 Sep_')
    expect(update.blocks[1].text.text).not.toContain('Needs a decision')
    const labels = buttonsIn(update.blocks.slice(1, 3)).map((element) => element.text.text)
    expect(labels).not.toContain('Answer…')
    // Still a plan card: the room's card, which anyone can pick up now it is answered.
    expect(labels).toEqual(['I’ll take it', 'Details…'])
  })

  it('still reads a bare task id from a modal opened before the fix', async () => {
    mocks.answerMarketingTask.mockResolvedValue({ ok: true, taskTitle: 'Old decision' })
    await post({
      type: 'view_submission',
      user: { id: 'UJUHAN' },
      view: {
        private_metadata: 'op-old',
        state: { values: { [MARKETING_ANSWER_BLOCK]: { [MARKETING_ANSWER_INPUT]: { value: 'Yes.' } } } },
      },
    })
    await runAfter()
    expect(mocks.answerMarketingTask).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'op-old' }))
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })
})

// ── The digest's legacy attachment cards still redraw ────────────────────────

describe('the digest', () => {
  it('still claims a task and redraws its attachment card through response_url', async () => {
    mocks.claimMarketingTask.mockResolvedValue({ ok: true, taskTitle: 'Write the case study' })
    mocks.getMarketingTaskDetail.mockResolvedValue({
      _id: 'op-1',
      title: 'Write the case study',
      ownerName: 'Juhan Sonin',
      estimatedMinutes: 60,
      kind: 'content',
      priority: 'high',
      status: 'queued',
    })
    const attachments = [
      {
        color: '#ccc',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: '*Write the case study*' } },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                action_id: MARKETING_ACTION.claim,
                text: { type: 'plain_text', text: 'I’ll take it' },
                value: encodeActionValue({ taskId: 'op-1' }),
              },
            ],
          },
        ],
      },
    ]
    await post(
      press(MARKETING_ACTION.claim, encodeActionValue({ taskId: 'op-1' }), {
        message: { ts: '200.2', text: 'This week in marketing', blocks: [], attachments },
      }),
    )
    await runAfter()

    // Only as the card showed it: this one had nobody on it (`o: ''`).
    expect(mocks.claimMarketingTask).toHaveBeenCalledWith({ taskId: 'op-1', personName: 'Juhan Sonin', slackUserId: 'UJUHAN', expectedOwner: '' })
    const [replaced] = responses()
    expect(replaced.replace_original).toBe(true)
    expect(replaced.text).toBe('This week in marketing')
    expect(JSON.stringify(replaced.attachments)).toContain('Juhan Sonin')
    // The team gate ran — one users.info — and nothing else was posted.
    expect(mocks.getSlackUserProfile).toHaveBeenCalledTimes(1)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })
})

// ── Every button the shared card and the Monday plan carry is team-only ──────

describe('the team-only gate on the Monday plan’s and the shared card’s buttons', () => {
  const guest = { user: { id: 'UGUEST', name: 'client.person' } }
  beforeEach(() => {
    mocks.getSlackUserProfile.mockResolvedValue(GUEST)
  })

  /** Refused before anything was read or written, and told only to the presser. */
  const onlyTheRefusal = () => {
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(mocks.openSlackModal).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(1)
    expect(responses()[0]).toMatchObject({ response_type: 'ephemeral', replace_original: false })
    expect(responses()[0].text).toMatch(/studio team/)
  }

  it('Details… / Answer…: the private task is never read, and no form opens', async () => {
    const response = await post(press(MARKETING_ACTION.details, encodeTaskCardValue({ taskId: 'op-decision', mode: 'mine' }), guest))
    expect(response.status).toBe(200)
    await runAfter()
    expect(mocks.getMarketingTaskDetail).not.toHaveBeenCalled()
    onlyTheRefusal()
  })

  it.each([
    ['Not me', MARKETING_ACTION.decline, encodeTaskCardValue({ taskId: TASK._id, mode: 'plan' })],
    ['a legacy I’ll take it', MARKETING_ACTION.claim, encodeActionValue({ taskId: TASK._id, ownerName: 'Eric' })],
    ['I’m away this week', MARKETING_ACTION.away, ''],
  ])('%s: nothing is passed on, taken or booked', async (_label, actionId, value) => {
    await post(press(actionId, value, guest))
    await runAfter()
    expect(mocks.declineMarketingTask).not.toHaveBeenCalled()
    expect(mocks.claimMarketingTask).not.toHaveBeenCalled()
    expect(mocks.setMarketingAvailability).not.toHaveBeenCalled()
    onlyTheRefusal()
  })

  it('the one-time setup: a guest cannot link themselves to a board name', async () => {
    await post(press(MARKETING_ACTION.linkIdentity, '', { ...guest, actions: [{ action_id: MARKETING_ACTION.linkIdentity, selected_option: { value: 'Eric' } }] }))
    await runAfter()
    expect(mocks.linkMarketingIdentity).not.toHaveBeenCalled()
    onlyTheRefusal()
  })

  it('the away cover’s I’ll take it: never makes a guest the owner of a colleague’s task', async () => {
    const cover = buildTaskCard({ _id: TASK._id, title: TASK.title, ownerName: 'Eric', status: 'queued' }, { now: NOW, mode: 'plan', context: 'away' })
    const take = cover.find((block) => block.type === 'actions')!.elements[0]
    await post(press(take.action_id, take.value, { ...guest, message: { ts: '200.2', blocks: cover } }))
    await runAfter()
    onlyTheRefusal()
  })

  it('Undo on time off: nothing is read', async () => {
    const value = encodeAvailabilityUndo({
      ownerName: 'Juhan',
      slackUserId: 'UJUHAN',
      wrote: { status: 'away', from: '2026-09-24', until: '2026-09-27', weeklyHours: null },
      prior: null,
    })
    await post(press(MARQUETA_ACTION.availabilityUndo, value, guest))
    await runAfter()
    onlyTheRefusal()
  })

  it.each([
    ['Still right', MARKETING_ACTION.runwayConfirm],
    ['We signed something…', MARKETING_ACTION.runwaySigned],
    ['It changed…', MARKETING_ACTION.runwayUpdate],
  ])('the runway’s %s: no money read, no form, no write', async (_label, actionId) => {
    await post(press(actionId, '', guest))
    await runAfter()
    expect(mocks.readRunway).not.toHaveBeenCalled()
    expect(mocks.confirmRunway).not.toHaveBeenCalled()
    onlyTheRefusal()
  })

  it('Keep it on a caught idea: nothing is kept', async () => {
    await post(press(MARKETING_ACTION.ideaKeep, JSON.stringify({ c: 'CBOT', ts: '100.1' }), guest))
    await runAfter()
    expect(keepCapturedIdea).not.toHaveBeenCalled()
    onlyTheRefusal()
  })

  it('an answer submitted from a decision form is not saved, and the guest is told privately', async () => {
    await post({
      type: 'view_submission',
      user: { id: 'UGUEST' },
      view: {
        id: 'V4',
        callback_id: 'goinvo_marketing_answer_task',
        private_metadata: JSON.stringify({ t: 'op-decision', ch: 'CBOT', th: '200.2' }),
        state: { values: { [MARKETING_ANSWER_BLOCK]: { [MARKETING_ANSWER_INPUT]: { value: 'Publish it.' } } } },
      },
    })
    await runAfter()
    expect(mocks.answerMarketingTask).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'CBOT', user: 'UGUEST', threadTs: '200.2', text: expect.stringMatching(/studio team/) }),
    )
  })
})

// ── Cards redraw in the mode they were drawn in ─────────────────────────────

describe('a press on the shared task card', () => {
  const header = { type: 'header', text: { type: 'plain_text', text: 'Monday plan' } }
  const other = buildTaskCard({ _id: 'op-other', title: 'Somebody else’s task', ownerName: 'Eric', slackUserId: 'UERIC', status: 'working' }, { now: NOW, mode: 'plan' })
  const footer = { type: 'actions', block_id: 'mq_footer', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Open This week' }, url: 'https://www.goinvo.com/studio/marketing?view=thisWeek' }] }
  const message = (card: Block[]) => [header, ...card, ...other, footer]
  const cardOf = (blocks: Block[]) => ({
    section: blocks.find((block) => block.block_id === checkInTaskBlockId(TASK._id)) as Block,
    labels: (blocks.find((block) => block.block_id === checkInTaskActionsBlockId(TASK._id)) as Block).elements.map((element: Block) => element.text.text),
  })
  const untouched = (next: Block[], before: Block[]) => {
    const ids = new Set([checkInTaskBlockId(TASK._id), checkInTaskActionsBlockId(TASK._id)])
    expect(next.filter((block) => !ids.has(block.block_id))).toEqual(before.filter((block) => !ids.has(block.block_id)))
  }

  it('keeps a plan card a plan card after I’ll take it: Taken by, and Hand back — nothing else changes', async () => {
    routeOutreach({ task: { ...TASK, ownerName: undefined, ownerSlackUserId: undefined } })
    const card = buildTaskCard({ _id: TASK._id, title: TASK.title, status: 'queued', minutes: 60 }, { now: NOW, mode: 'plan' })
    const before = message(card)
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Monday plan', blocks: before, attachments: [] })
    const take = card.find((block) => block.type === 'actions')!.elements[0]
    await post(press(take.action_id, take.value, { message: { ts: '200.2', text: 'Monday plan', blocks: before } }))
    await runAfter()

    expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
    const { blocks } = mocks.updateSlackMessage.mock.calls[0][0]
    expectValidSlackBlocks(blocks)
    expect(cardOf(blocks).labels).toEqual(['Hand back'])
    expect(cardOf(blocks).section.text.text).toContain('_Taken by <@UJUHAN> · Thu 24 Sep_')
    expect(cardOf(blocks).section.text.text.match(/Taken by/g)).toHaveLength(1)
    untouched(blocks, before)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(0)
  })

  it('an away cover takes the task off the away owner it was drawn for, onto the presser', async () => {
    routeOutreach({ task: { ...TASK, ownerName: 'Eric', ownerSlackUserId: 'UERIC' } })
    const cover = buildTaskCard({ _id: TASK._id, title: TASK.title, ownerName: 'Eric', slackUserId: 'UERIC', status: 'queued' }, { now: NOW, mode: 'plan', context: 'away' })
    const before = message(cover)
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Monday plan', blocks: before, attachments: [] })
    const take = cover.find((block) => block.type === 'actions')!.elements[0]
    expect(take.style).toBeUndefined()
    await post(press(take.action_id, take.value, { message: { ts: '200.2', blocks: before } }))
    await runAfter()

    expect(mocks.patches[0].ops[0]).toEqual([
      'set',
      expect.objectContaining({ ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN', lastOutcome: 'Taken over from Eric in Slack by Juhan' }),
    ])
    const { blocks } = mocks.updateSlackMessage.mock.calls[0][0]
    expect(cardOf(blocks).labels).toEqual(['Hand back'])
    untouched(blocks, before)
  })

  it('a stale away cover never takes the task from whoever covered it first', async () => {
    // Shirley covered Eric's task on Monday; Juhan presses the same card on Tuesday.
    routeOutreach({ task: { ...TASK, ownerName: 'Shirley', ownerSlackUserId: 'USHIRLEY' } })
    const cover = buildTaskCard({ _id: TASK._id, title: TASK.title, ownerName: 'Eric', status: 'queued' }, { now: NOW, mode: 'plan', context: 'away' })
    const take = cover.find((block) => block.type === 'actions')!.elements[0]
    await post(press(take.action_id, take.value, { message: { ts: '200.2', blocks: message(cover) } }))
    await runAfter()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
    expect(responses()[0].text).toBe('Couldn’t take that — nothing changed. Shirley already has it.')
  })

  it('Not me on an asked card redraws that card — "passed", and anyone can take it', async () => {
    const asked = buildTaskCard({ _id: TASK._id, title: TASK.title, status: 'queued' }, { now: NOW, mode: 'plan', ask: { slackUserId: 'UJUHAN', name: 'Juhan' } })
    const before = message(asked)
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Monday plan', blocks: before, attachments: [] })
    mocks.declineMarketingTask.mockResolvedValue({
      ok: true,
      changed: true,
      taskTitle: TASK.title,
      task: { _id: TASK._id, title: TASK.title, status: 'needsHuman', humanQuestion: 'Juhan passed on this — who should pick it up?' },
    })
    const notMe = asked.find((block) => block.type === 'actions')!.elements[1]
    expect(notMe.action_id).toBe(MARKETING_ACTION.decline)
    await post(press(notMe.action_id, notMe.value, { message: { ts: '200.2', blocks: before } }))
    await runAfter()

    expect(mocks.declineMarketingTask).toHaveBeenCalledWith({ taskId: TASK._id, personName: 'Juhan Sonin', slackUserId: 'UJUHAN' })
    const { blocks } = mocks.updateSlackMessage.mock.calls[0][0]
    expectValidSlackBlocks(blocks)
    expect(cardOf(blocks).labels).toEqual(['I’ll take it', 'Details…'])
    expect(cardOf(blocks).section.text.text).toContain('_<@UJUHAN> passed — still needs someone_')
    untouched(blocks, before)
    // No legacy attachment redraw, and nothing said twice.
    expect(mocks.getMarketingTaskDetail).not.toHaveBeenCalled()
    expect(responses()).toHaveLength(0)
  })
})

// ── "I’m away this week", its receipt, and Undo ──────────────────────────────

describe('I’m away this week', () => {
  const undoValue = encodeAvailabilityUndo({
    ownerName: 'Juhan',
    slackUserId: 'UJUHAN',
    wrote: { status: 'away', from: '2026-09-24', until: '2026-09-27', weeklyHours: null },
    prior: { status: 'away', from: '2026-10-05', until: '2026-10-09', weeklyHours: null },
  })
  const receipt = ':palm_tree: <@UJUHAN> is away Thu 24 – Sun 27 Sep — I’ll leave them out of this week’s plan.'
  const digest = { ts: '200.2', text: 'Monday plan', blocks: [{ type: 'header', text: { type: 'plain_text', text: 'Monday plan' } }] }

  it('posts the room’s receipt in the plan’s thread, with the Undo that takes it back', async () => {
    mocks.setMarketingAvailability.mockResolvedValue({
      ok: true,
      changed: true,
      message: 'You’re away Thu 24 – Sun 27 Sep. I’ll leave you out of this week’s plan.',
      receipt,
      undoValue,
    })
    await post(press(MARKETING_ACTION.away, '', { message: digest }))
    await runAfter()

    expect(mocks.setMarketingAvailability).toHaveBeenCalledWith({ personName: 'Juhan Sonin', slackUserId: 'UJUHAN', status: 'away', now: expect.any(Date) })
    const [message] = posted()
    expect(message).toMatchObject({ channel: 'CBOT', threadTs: '200.2', username: 'Marqueta', text: receipt })
    expectValidSlackBlocks(message.blocks)
    const buttons = buttonsIn(message.blocks)
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toMatchObject({ action_id: MARQUETA_ACTION.availabilityUndo, value: undoValue, text: expect.objectContaining({ text: 'Undo' }) })
    expect(buttons[0].style).toBeUndefined()
    // One message for one event: nothing ephemeral on top.
    expect(responses()).toHaveLength(0)
  })

  // The time off is already written when the thread refuses the receipt, so
  // the presser's private copy is the only place left to take it back from:
  // it carries the Undo — the one button an ephemeral message is given.
  it('keeps the Undo when the thread will not take the receipt — the presser gets it privately', async () => {
    const message = 'You’re away Thu 24 – Sun 27 Sep. I’ll leave you out of this week’s plan.'
    mocks.setMarketingAvailability.mockResolvedValue({ ok: true, changed: true, message, receipt, undoValue })
    mocks.postSlackMessage.mockResolvedValue(null)
    await post(press(MARKETING_ACTION.away, '', { message: digest }))
    await runAfter()

    const [sent] = responses()
    expect(responses()).toHaveLength(1)
    expect(sent).toMatchObject({ response_type: 'ephemeral', replace_original: false, text: message })
    expectValidSlackBlocks(sent.blocks)
    expect(sent.blocks[0].text.text).toBe(message)
    expect(buttonsIn(sent.blocks)).toEqual([
      expect.objectContaining({ action_id: MARQUETA_ACTION.availabilityUndo, value: undoValue, text: expect.objectContaining({ text: 'Undo' }) }),
    ])
  })

  it('tells only the presser when nothing changed, or when it was refused — in the second person, nothing glued on', async () => {
    for (const result of [
      { ok: true, changed: false, message: 'You’re already down as away Mon 21 – Sun 27 Sep — nothing changed.' },
      { ok: false, message: 'Couldn’t read the team list — nothing changed. Try again in a minute.' },
    ]) {
      mocks.responseFetch.mockClear()
      mocks.setMarketingAvailability.mockResolvedValue(result)
      await post(press(MARKETING_ACTION.away, '', { message: digest }))
      await runAfter()
      expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', text: result.message })])
    }
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('the one-time setup answers in the presser’s own words, and only those', async () => {
    const message = 'You’re linked as *Eric* — I’ll @-mention you on your own tasks from now on.'
    mocks.linkMarketingIdentity.mockResolvedValue({ ok: true, message })
    await post(press(MARKETING_ACTION.linkIdentity, '', { actions: [{ action_id: MARKETING_ACTION.linkIdentity, selected_option: { value: 'Eric' } }] }))
    await runAfter()
    expect(mocks.linkMarketingIdentity).toHaveBeenCalledWith({ ownerName: 'Eric', slackUserId: 'UJUHAN' })
    expect(responses()).toEqual([expect.objectContaining({ response_type: 'ephemeral', text: message })])
  })

  describe('Undo', () => {
    const id = availabilityDocId('Juhan')
    /** Juhan's record as the press left it: the link, the hours and the note are his own. */
    const pressed = () =>
      new Map<string, Record<string, unknown>>([
        [id, { _id: id, _rev: 'r2', ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'away', from: '2026-09-24', until: '2026-09-27', weeklyHours: 4, note: 'Calls on Tuesdays' }],
      ])
    const onReceipt = { message: { ts: '300.3', thread_ts: '200.2', text: receipt, blocks: [] } }

    it('restores the exact prior record, and redraws its own receipt — struck through, nothing left to press', async () => {
      routeOutreach({ records: pressed() })
      await post(press(MARQUETA_ACTION.availabilityUndo, undoValue, onReceipt))
      await runAfter()

      expect(mocks.patches).toHaveLength(1)
      expect(mocks.patches[0].id).toBe(id)
      expect(mocks.patches[0].ops).toEqual([
        ['set', { status: 'away', from: '2026-10-05', until: '2026-10-09', updatedAt: NOW.toISOString() }],
        ['ifRevisionId', 'r2'],
      ])
      expect(mocks.updateSlackMessage).toHaveBeenCalledTimes(1)
      const update = mocks.updateSlackMessage.mock.calls[0][0]
      expect(update).toMatchObject({ channel: 'CBOT', ts: '300.3' })
      expectValidSlackBlocks(update.blocks)
      expect(update.blocks).toEqual([
        expect.objectContaining({
          type: 'section',
          text: { type: 'mrkdwn', text: '~<@UJUHAN> away Thu 24 – Sun 27 Sep~ — undone by <@UJUHAN>. Back to away Mon 5 – Fri 9 Oct.' },
        }),
      ])
      expect(buttonsIn(update.blocks)).toHaveLength(0)
      expect(mocks.postSlackMessage).not.toHaveBeenCalled()
      expect(responses()).toHaveLength(0)
    })

    it('removes the record the press created when there was none before', async () => {
      const steps: Array<[string, ...unknown[]]> = []
      mocks.outreach.transaction.mockImplementation(() => {
        const chain: Record<string, any> = {
          patch: (patchId: string, build: (patch: any) => any) => {
            const ops: Op[] = []
            const builder: Record<string, any> = {}
            for (const op of ['set', 'ifRevisionId']) builder[op] = (arg: unknown) => (ops.push([op, arg]), builder)
            build(builder)
            steps.push(['patch', patchId, ops])
            return chain
          },
          delete: (deleteId: string) => (steps.push(['delete', deleteId]), chain),
          commit: async () => ({}),
        }
        return chain
      })
      const created = new Map([[id, { _id: id, _rev: 'r1', ownerName: 'Juhan', status: 'away', from: '2026-09-24', until: '2026-09-27' }]])
      routeOutreach({ records: created })
      const fresh = encodeAvailabilityUndo({ ownerName: 'Juhan', slackUserId: 'UJUHAN', wrote: { status: 'away', from: '2026-09-24', until: '2026-09-27', weeklyHours: null }, prior: null })
      await post(press(MARQUETA_ACTION.availabilityUndo, fresh, onReceipt))
      await runAfter()
      expect(steps.map((step) => step[0])).toEqual(['patch', 'delete'])
      expect((steps[0][2] as Op[]).find((op) => op[0] === 'ifRevisionId')?.[1]).toBe('r1')
      expect(mocks.updateSlackMessage.mock.calls[0][0].blocks[0].text.text).toBe('~<@UJUHAN> away Thu 24 – Sun 27 Sep~ — undone by <@UJUHAN>.')
    })

    it('pressed on the private copy, restores the record and replaces that copy — second person, nothing left to press', async () => {
      routeOutreach({ records: pressed() })
      await post(
        press(MARQUETA_ACTION.availabilityUndo, undoValue, {
          container: { type: 'message', channel_id: 'CBOT', message_ts: '400.4', is_ephemeral: true },
          message: undefined,
        }),
      )
      await runAfter()
      expect(mocks.patches).toHaveLength(1)
      expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
      expect(mocks.postSlackMessage).not.toHaveBeenCalled()
      const [sent] = responses()
      expect(responses()).toHaveLength(1)
      expect(sent).toMatchObject({ replace_original: true, text: 'Undone — you’re away Mon 5 – Fri 9 Oct again.' })
      expectValidSlackBlocks(sent.blocks)
      expect(buttonsIn(sent.blocks)).toHaveLength(0)
    })

    it('is only for the person who booked it — anyone else is told privately, and nothing changes', async () => {
      routeOutreach({ records: pressed() })
      await post(press(MARQUETA_ACTION.availabilityUndo, undoValue, { ...onReceipt, user: { id: 'UERIC' } }))
      await runAfter()
      expect(mocks.patches).toHaveLength(0)
      expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
      expect(responses()).toEqual([
        expect.objectContaining({ response_type: 'ephemeral', text: 'Couldn’t undo that — nothing changed. Only the person who set that time off can undo it.' }),
      ])
    })

    it('pressed twice, writes nothing more and redraws nothing', async () => {
      const restored = pressed()
      Object.assign(restored.get(id)!, { from: '2026-10-05', until: '2026-10-09', _rev: 'r3' })
      routeOutreach({ records: restored })
      await post(press(MARQUETA_ACTION.availabilityUndo, undoValue, onReceipt))
      await runAfter()
      expect(mocks.patches).toHaveLength(0)
      expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
      expect(responses()).toEqual([expect.objectContaining({ text: 'Already undone.' })])
    })
  })
})
