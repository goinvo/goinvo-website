/**
 * Marqueta's buttons and modals, through the real interactions route.
 *
 * Slack I/O is mocked at `@/lib/chat/slack` and the dataset at the outreach
 * client; the server core in between (task actions, call log, call prep, the
 * roster) is the real code, so these exercise what a press actually writes.
 *
 * What these pin, in the order it would hurt to lose them:
 *   - a guest (or a profile Slack will not return) gets nothing outreach- or
 *     money-related, and nothing is read on their behalf;
 *   - a modal opens with NO Sanity read before views.open — a trigger_id is
 *     good for three seconds;
 *   - the call-log modal refuses to close without an outcome, and a submission
 *     is keyed on the Slack view so a retry is a no-op;
 *   - a check-in press redraws exactly its card on the LIVE message and keeps
 *     the attachments the digest's task cards live in;
 *   - the strategy buttons answer in the thread and never replace the digest;
 *   - the runway and task-answer modals now confirm somewhere (a
 *     view_submission has no response_url), and still read the old plain
 *     metadata of a modal opened before the fix;
 *   - the digest's own claim button behaves exactly as before.
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
    outreach: { fetch: vi.fn(), patch, createIfNotExists: vi.fn(async (doc: unknown) => doc) },
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
vi.mock('@/lib/marketing/slackActions.server', () => ({
  claimMarketingTask: mocks.claimMarketingTask,
  declineMarketingTask: mocks.declineMarketingTask,
  answerMarketingTask: mocks.answerMarketingTask,
  getMarketingTaskDetail: mocks.getMarketingTaskDetail,
  linkMarketingIdentity: mocks.linkMarketingIdentity,
  setMarketingAvailability: mocks.setMarketingAvailability,
}))
vi.mock('@/lib/marketing/strategyCheck.server', () => ({ recordStrategyVerdict: mocks.recordStrategyVerdict }))
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
import type { TeamMemberAvailability } from '@/lib/marketing/availability'
import { PREP_DATA_QUERY, type PrepData } from '@/lib/marketing/callPrep.server'
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
  encodeStrategyValue,
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
import { TEAM_AVAILABILITY_QUERY } from '@/lib/marketing/team.server'
import { buildCheckInTaskBlocks } from '@/lib/marketing/weeklyCheckIn'
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
  task?: Record<string, unknown> | null
  contact?: Record<string, unknown> | null
  existingContact?: Record<string, unknown> | null
  prep?: PrepData
}

/** Answer each query the way the dataset would. Anything unrouted is a test bug, loudly. */
function routeOutreach(fixtures: Fixtures = {}) {
  mocks.outreach.fetch.mockImplementation(async (query: string) => {
    mocks.calls.push('sanity.fetch')
    if (query === TEAM_AVAILABILITY_QUERY) {
      if (fixtures.availability instanceof Error) throw fixtures.availability
      return fixtures.availability ?? TEAM
    }
    if (query === PREP_DATA_QUERY) return fixtures.prep ?? PREP
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
    expect(responses()[0].text).toMatch(/couldn’t check who you are/)
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
      expect(responses()[0].text).toMatch(/couldn’t check who you are/)
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
    expect(responses()[0].text).toMatch(/Add them to outreach first/)
  })

  it('tells the presser when the form would not open', async () => {
    mocks.openSlackModal.mockResolvedValue(false)
    await post(press(MARQUETA_ACTION.logCall, ref))
    await runAfter()
    expect(responses()[0].text).toMatch(/would not open/)
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

  it('logs under the board name, keyed on the view, and confirms in the thread with an Undo', async () => {
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
    expect(message.text).toMatch(/^<@UJUHAN> logged: Left a voicemail with Jane Doe · follow-up /)
    expectValidSlackBlocks(message.blocks)
    const [undo] = buttonsIn(message.blocks)
    expect(undo.action_id).toBe(MARQUETA_ACTION.callLogUndo)
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

  it('refuses a submission that lost its metadata rather than guessing a contact', async () => {
    const response = await submit(withOutcome('voicemail'), { private_metadata: 'not json' })
    expect((await response.json()).response_action).toBe('errors')
    expect(mocks.afterQueue).toHaveLength(0)
  })
})

describe('Undo a quick log', () => {
  it('takes the call back off the record and says so in the thread', async () => {
    routeOutreach({
      contact: {
        ...JANE_LOG,
        status: 'contacted',
        lastContactedAt: NOW.toISOString(),
        interactions: [{ _key: 'slack-V123' }],
      },
    })
    const value = encodeCallLogUndo({
      contactId: 'contact-jane',
      interactionKey: 'slack-V123',
      prior: { status: 'new', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' },
    })
    await post(press(MARQUETA_ACTION.callLogUndo, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: [] } }))
    await runAfter()
    expect(mocks.patches).toHaveLength(1)
    expect(mocks.patches[0].ops).toContainEqual(['unset', expect.arrayContaining(['interactions[_key=="slack-V123"]'])])
    const [message] = posted()
    expect(message).toMatchObject({ channel: 'CBOT', threadTs: '200.1' })
    expect(message.text).toMatch(/Undone by Juhan/)
  })
})

describe('Add to outreach', () => {
  it('adds them under the board name and offers the Log button for the new record', async () => {
    const value = encodeContactRef({ name: 'Sam Rivera', organization: 'Acme', outcome: 'voicemail' })
    await post(press(MARQUETA_ACTION.addContact, value, { message: { ts: '300.3', thread_ts: '200.1', blocks: [] } }))
    await runAfter()

    expect(mocks.outreach.createIfNotExists).toHaveBeenCalledTimes(1)
    const created = mocks.outreach.createIfNotExists.mock.calls[0][0] as Record<string, unknown>
    expect(created).toMatchObject({ _type: 'marketingContact', name: 'Sam Rivera', organization: 'Acme', owner: 'Juhan' })

    const [message] = posted()
    expect(message).toMatchObject({ channel: 'CBOT', threadTs: '200.1' })
    expectValidSlackBlocks(message.blocks)
    const [log] = buttonsIn(message.blocks)
    expect(log.action_id).toBe(MARQUETA_ACTION.logCall)
    expect(decodeContactRef(log.value)).toMatchObject({ contactId: created._id, outcome: 'voicemail' })
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
    expect(section.text.text).toContain('<@UJUHAN> marked *Write the &lt;5% case study* done.')
    const buttons = update.blocks.find((block: Block) => block.block_id === checkInTaskActionsBlockId(TASK._id)).elements
    expect(buttons.map((element: Block) => element.action_id)).toEqual([MARQUETA_ACTION.taskReopen])
    // Nothing replaced through response_url, and nothing extra said.
    expect(mocks.responseFetch).not.toHaveBeenCalled()
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
    expect(responses()[0].text).toMatch(/couldn’t tell who you are/)
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

  it('records the blocker, notes it in the thread and redraws the card on the reply it lives on', async () => {
    mocks.fetchSlackMessage.mockResolvedValue({ text: 'Your list', blocks: card, attachments: [] })
    await submit('Need the case-study numbers')
    await runAfter()
    expect(mocks.patches[0].ops[0]).toEqual([
      'set',
      expect.objectContaining({ status: 'blocked', blocker: 'Need the case-study numbers' }),
    ])
    const [note] = posted()
    expect(note).toMatchObject({ channel: 'CBOT', threadTs: '200.1' })
    expect(mocks.fetchSlackMessage).toHaveBeenCalledWith({ channel: 'CBOT', ts: '200.5', threadTs: '200.1' })
    const update = mocks.updateSlackMessage.mock.calls[0][0]
    expect(update.ts).toBe('200.5')
    expectValidSlackBlocks(update.blocks)
    expect(JSON.stringify(update.blocks)).toContain('in the way: Need the case-study numbers')
  })

  it('still notes it in the thread when the message cannot be read back', async () => {
    await submit('Need the case-study numbers')
    await runAfter()
    expect(posted()).toHaveLength(1)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
  })
})

// ── The monthly strategy question ────────────────────────────────────────────

describe('the strategy buttons', () => {
  const digest = {
    ts: '200.2',
    text: 'This week in marketing',
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: '*Money and direction*' } }],
    attachments: [{ color: '#ccc', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Task card' } }] }],
  }

  it.each([
    [MARQUETA_ACTION.strategyConfirm, 'stillRight'],
    [MARQUETA_ACTION.strategyRethink, 'rethink'],
  ])('%s answers in the thread and never replaces the digest', async (actionId, verdict) => {
    mocks.recordStrategyVerdict.mockResolvedValue({ ok: true, message: 'Noted — Juhan says the plan is still right.' })
    await post(press(actionId, encodeStrategyValue('2026-09'), { message: digest }))
    await runAfter()

    expect(mocks.recordStrategyVerdict).toHaveBeenCalledWith(
      expect.objectContaining({ verdict, personName: 'Juhan', monthKey: '2026-09' }),
    )
    expect(posted()).toEqual([expect.objectContaining({ channel: 'CBOT', threadTs: '200.2', username: 'Marqueta' })])
    for (const body of responses()) expect(body.replace_original).not.toBe(true)
    expect(mocks.updateSlackMessage).not.toHaveBeenCalled()
  })

  it('follows a stale press with this month’s answer', async () => {
    mocks.recordStrategyVerdict.mockResolvedValue({
      ok: false,
      stale: true,
      message: 'That was August 2026’s check — here is this month’s.',
      answer: '*Strategy* — Rebuild',
    })
    await post(press(MARQUETA_ACTION.strategyConfirm, encodeStrategyValue('2026-08'), { message: digest }))
    await runAfter()
    expect(posted()[0].text).toBe('That was August 2026’s check — here is this month’s.\n\n*Strategy* — Rebuild')
  })
})

// ── The runway and task-answer modals now confirm somewhere ──────────────────

describe('the runway modal', () => {
  it('remembers where it was opened, and confirms there on save', async () => {
    mocks.readRunway.mockResolvedValue({ summary: '4.5 months of certain runway — Rebuild.' })
    await post(press(MARKETING_ACTION.runwayUpdate, '', { message: { ts: '200.2', blocks: [] } }))
    const [, view] = mocks.openSlackModal.mock.calls[0]
    expect(view.callback_id).toBe(MARKETING_RUNWAY_CALLBACK)
    expectValidSlackModal(view)
    expect(JSON.parse(view.private_metadata)).toEqual({ k: 'update', ch: 'CBOT', th: '200.2' })

    mocks.setRunway.mockResolvedValue({ summary: '5 months of certain runway (to 24 Feb 2027) — Rebuild.' })
    const response = await post({
      type: 'view_submission',
      user: { id: 'UJUHAN', name: 'juhan' },
      view: {
        id: 'V2',
        callback_id: MARKETING_RUNWAY_CALLBACK,
        private_metadata: view.private_metadata,
        state: { values: { [RUNWAY_MONTHS_BLOCK]: { [RUNWAY_MONTHS_INPUT]: { value: '5' } } } },
      },
    })
    expect(await response.json()).toEqual({})
    await runAfter()
    expect(mocks.setRunway).toHaveBeenCalledWith(expect.objectContaining({ months: 5 }))
    expect(posted()).toEqual([
      expect.objectContaining({
        channel: 'CBOT',
        threadTs: '200.2',
        text: '<@UJUHAN> updated the runway. 5 months of certain runway (to 24 Feb 2027) — Rebuild.',
      }),
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

  it('remembers where it was opened, and confirms the answer there', async () => {
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
        text: '<@UJUHAN> answered *Publish the &lt;F1&gt; taxonomy?*.',
      }),
    ])
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

// ── The digest's own buttons are unchanged ───────────────────────────────────

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

    expect(mocks.claimMarketingTask).toHaveBeenCalledWith({ taskId: 'op-1', personName: 'Juhan Sonin', slackUserId: 'UJUHAN' })
    const [replaced] = responses()
    expect(replaced.replace_original).toBe(true)
    expect(replaced.text).toBe('This week in marketing')
    expect(JSON.stringify(replaced.attachments)).toContain('Juhan Sonin')
    // Nothing of Marqueta's ran for it.
    expect(mocks.getSlackUserProfile).not.toHaveBeenCalled()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })
})
