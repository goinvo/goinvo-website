/**
 * What a press on the Monday plan writes, against a mocked Sanity and a mocked
 * Slack: "Not me" (`declineMarketingTask`), "I’m away this week" and its Undo
 * (`setMarketingAvailability` / `restoreMarketingAvailability`), and the
 * one-time identity link.
 *
 * These pin the parts a Slack retry, a double press or a colleague with the
 * same first name would otherwise break: every write is conditional on the
 * revision it read, only the presser's own record changes, a record is
 * patched and never replaced, and Undo puts back exactly what was there.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Op = [string, ...unknown[]]
type PatchRecord = { id: string; ops: Op[] }

const mocks = vi.hoisted(() => {
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
  const client = () => ({ fetch: vi.fn(), patch, createIfNotExists: vi.fn(), transaction: vi.fn() })
  return {
    patches,
    commit,
    patch,
    /** plan-week's own client (it pins the outreach dataset with createClient). */
    planWeek: client(),
    outreach: client(),
    calendar: client(),
    operationsWrite: client(),
    postSlackMessage: vi.fn(),
    getSlackBotUserId: vi.fn(),
    loadStrategySnapshot: vi.fn(),
    readRunway: vi.fn(),
    ideasNeedingReview: vi.fn(),
    assertStudioWriterOrApiKey: vi.fn(async () => {}),
    isOutreachClientConfigured: vi.fn(() => true),
  }
})

vi.mock('@/lib/marketing/auth', () => {
  class TestMarketingAuthError extends Error {
    status: number
    constructor(message = 'Unauthorized', status = 401) {
      super(message)
      this.status = status
    }
  }
  return { assertStudioWriterOrApiKey: mocks.assertStudioWriterOrApiKey, MarketingAuthError: TestMarketingAuthError }
})
vi.mock('@/lib/marketing/outreachClient.server', () => ({
  getOutreachClient: () => mocks.outreach,
  isOutreachClientConfigured: mocks.isOutreachClientConfigured,
}))
vi.mock('@/lib/marketing/client', () => ({
  getMarketingWriteClientFor: (type: string) => (type === 'marketingCalendarItem' ? mocks.calendar : mocks.operationsWrite),
  getMarketingWriteClient: () => mocks.operationsWrite,
}))
vi.mock('@/lib/chat/slack', () => ({
  postSlackMessage: mocks.postSlackMessage,
  getSlackBotUserId: mocks.getSlackBotUserId,
  getSlackUserDisplayName: vi.fn(),
}))
vi.mock('@/lib/marketing/strategyCheck.server', () => ({ loadStrategySnapshot: mocks.loadStrategySnapshot }))
vi.mock('@/lib/marketing/runway.server', () => ({ readRunway: mocks.readRunway }))
vi.mock('@/lib/marketing/ideaCapture.server', () => ({ ideasNeedingReview: mocks.ideasNeedingReview }))
// plan-week only: its own pinned client, and no model (the week is named by Claude when a key exists).
vi.mock('@sanity/client', () => ({ createClient: () => mocks.planWeek }))
vi.mock('@/sanity/env', () => ({ apiVersion: '2025-01-01', dataset: 'production', projectId: 'test-project', writeToken: 'test-token' }))
vi.mock('@/lib/marketing/anthropicJson', () => ({
  isAnthropicConfigured: () => false,
  generateClaudeText: vi.fn(),
  parseJsonObject: vi.fn(),
  resolveMarketingModel: vi.fn(),
}))

import { POST } from '@/app/api/marketing/slack/digest/route'
import { availabilityDocId } from '@/lib/marketing/availability'
import { TEAM_AVAILABILITY_QUERY } from '@/lib/marketing/team.server'
import { decodeAvailabilityUndo, encodeAvailabilityUndo, type AvailabilityUndo } from '@/lib/marketing/marquetaActions'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { describeRunway, resolveRunwayPosture, runwayCheckIn, type StoredPosture } from '@/lib/marketing/runway'
import {
  answerMarketingTask,
  AVAILABILITY_WRITE_QUERY,
  claimMarketingTask,
  declineMarketingTask,
  LINKED_RECORDS_QUERY,
  linkMarketingIdentity,
  OWNED_OPEN_TASKS_QUERY,
  restoreMarketingAvailability,
  setMarketingAvailability,
} from '@/lib/marketing/slackActions.server'
import { askHistoryEntry } from '@/lib/marketing/slackDelegation'
import { buildStrategySnapshot, monthWindow } from '@/lib/marketing/strategyCheck'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Monday 21 Sep 2026, 9am in Boston — when the tick runs. */
const NOW = new Date('2026-09-21T13:00:00Z')
const WEEK = '2026-W39'
const LAST_WEEK = '2026-W38'
const CHANNEL = 'CMARKETINGBOT'
const json = (value: unknown) => JSON.stringify(value)
const conflict = () => Object.assign(new Error('Document has been modified since the revision given'), { statusCode: 409 })
/** Asked in an earlier week — history, not this week's ask. */
const askedBefore = (...ids: string[]) => ids.map((slackUserId) => ({ slackUserId, week: LAST_WEEK, kind: 'asked' }))

// ── Fixtures ────────────────────────────────────────────────────────────────

const AVAILABILITY = [
  { ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available', weeklyHours: null },
  { ownerName: 'Eric', slackUserId: 'UERIC', status: 'available' },
  { ownerName: 'Shirley', slackUserId: 'USHIRLEY', status: 'available' },
]

const OPERATIONS = [
  { _id: 'op-call-mgb', title: 'Call MGB about the pilot', kind: 'outreach', priority: 'high', status: 'queued', suggestedOwner: 'Juhan', estimatedMinutes: 30, askHistory: null },
  { _id: 'op-price', title: 'Price bands <5% & co', kind: 'outreach', priority: 'normal', status: 'queued', askHistory: askedBefore('UJUHAN', 'UERIC') },
  // Owned by Eric, but carrying the id of whoever last claimed it in Slack.
  { _id: 'op-eric', title: 'Follow the MEDITECH thread', kind: 'outreach', priority: 'normal', status: 'working', ownerName: 'Eric', ownerSlackUserId: 'USTALE' },
  { _id: 'op-post', title: 'Write the pre-mortem post', kind: 'content', priority: 'normal', status: 'queued', estimatedMinutes: 60 },
  // Shirley pressed "Not me this week" on this one.
  { _id: 'op-passed', title: 'Draft the kit email', kind: 'content', priority: 'normal', status: 'needsHuman', suggestedOwner: 'Shirley', estimatedMinutes: 20, humanQuestion: 'Shirley passed on this — who should pick it up?' },
  { _id: 'op-decision', title: 'Publish the taxonomy?', kind: 'decision', priority: 'high', status: 'needsHuman', humanQuestion: 'Should we publish F1–F8?' },
  { _id: 'op-plan', title: 'Week of 2026-09-21', kind: 'update', status: 'working', sourceKey: 'weekly-plan/2026-W39' },
]

const FOLLOW_UP_CONTACTS = [
  { _id: 'c-jane', name: 'Jane Doe', email: 'jane@mgb.org', organization: 'MGB', owner: 'juhan', status: 'responded', warmth: 'warm', followUpAt: '2026-09-18T14:00:00Z', interactions: [{ at: '2026-09-11T14:00:00Z', by: 'Juhan', statusAfter: 'responded' }] },
  { _id: 'c-sam', name: 'sam.rivera@acme.org', email: 'sam.rivera@acme.org', organization: 'Acme', owner: 'Eric', status: 'contacted', warmth: 'cold', followUpAt: '2026-09-22T14:00:00Z', interactions: null },
  { _id: 'c-3', name: 'Ada Park', email: 'ada@x.org', organization: 'X Health', owner: 'Juhan', status: 'contacted', warmth: 'warm', followUpAt: '2026-09-23T14:00:00Z', interactions: [] },
  { _id: 'c-4', name: 'Bo Chen 617-555-0123', email: 'bo@y.org', organization: 'Y Clinic', owner: '', status: 'meeting', warmth: 'hot', followUpAt: '2026-09-24T14:00:00Z', interactions: [] },
  { _id: 'c-5', name: 'Cy Diaz', email: 'cy@z.org', organization: 'Z Labs', owner: 'Shirley', status: 'contacted', warmth: 'cool', followUpAt: '2026-09-25T14:00:00Z', interactions: [] },
]

const RESEARCH = [
  {
    organization: 'Acme Health',
    recentSignal: 'Acme Health launched an AI pilot',
    reachableAbout: 'the pilot',
    suggestedOfferKey: 'ai-pilot-premortem',
    context: '',
    verification: {
      status: 'verified',
      evidence: [{ url: 'https://acme.example/news', quote: 'launched an AI pilot', textFragmentUrl: 'https://acme.example/news#:~:text=launched' }],
    },
  },
]

const CALL_SHEET_CONTACTS = [
  { _id: 'c-acme-1', name: 'Pat Lee', role: 'CMIO', organization: 'Acme Health', email: 'pat@acme.example', status: 'new' },
]

function digestData(overrides: Record<string, unknown> = {}) {
  return {
    operations: OPERATIONS,
    // Eric's four hours are already spoken for this week.
    owned: [{ ownerName: 'Eric', estimatedMinutes: 240, kind: 'outreach', priority: 'normal' }],
    doneLastWeek: 3,
    availability: AVAILABILITY,
    research: RESEARCH,
    contacts: CALL_SHEET_CONTACTS,
    followUpContacts: FOLLOW_UP_CONTACTS,
    offers: [],
    weeklyHours: 8,
    ...overrides,
  }
}

function strategyLoad(now: Date = NOW) {
  const contacts = [
    {
      _id: 'c-jane',
      name: 'Jane Doe',
      organization: 'MGB',
      status: 'responded',
      followUpAt: null,
      estimatedValue: null,
      interactions: [{ at: '2026-09-15T15:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'responded' }],
    },
  ]
  // Confirmed in August: stale, so the runway check-in is due.
  const stored: StoredPosture = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-01T00:00:00Z' } }
  const resolved = resolveRunwayPosture(stored, now)
  const runway = { stored, resolved, checkIn: runwayCheckIn(stored, now), summary: describeRunway(stored, now) }
  const thisMonth = summarizeOutreach(contacts, { ...monthWindow(now, 0), now })
  const snapshot = buildStrategySnapshot({
    now,
    runwaySummary: runway.summary,
    postureId: resolved.id,
    thisMonth,
    lastMonth: null,
    pipelineContacts: contacts,
    gates: [],
  })
  return {
    snapshot,
    review: null,
    due: { due: true, reason: 'Nobody has checked the marketing plan against the money yet.' },
    runway,
    latestWin: null,
    openRethink: null,
    contacts,
  }
}

// ── The outreach dataset, as the digest and the task actions see it ─────────

/**
 * What the outreach client returns. The claim record behaves like the real
 * one — `ifRevisionId` is checked and every write bumps the revision — so two
 * runs in one week meet the same lock they would in production.
 */
const store: {
  data: unknown
  availability: unknown
  tasks: unknown[]
  heartbeats: Map<string, Record<string, any>>
} = { data: null, availability: [], tasks: [], heartbeats: new Map() }

function routeOutreach() {
  mocks.outreach.fetch.mockImplementation(async (query: string, params?: { id?: string }) => {
    if (query.includes('postedWeek, claimedWeek')) {
      const doc = store.heartbeats.get(String(params?.id))
      return doc ? { ...doc } : null
    }
    if (query === TEAM_AVAILABILITY_QUERY) {
      if (store.availability instanceof Error) throw store.availability
      return store.availability
    }
    if (query.includes('_type == "marketingOperation" && _id == $id')) {
      return store.tasks.length > 1 ? store.tasks.shift() : store.tasks[0] ?? null
    }
    return store.data
  })
  mocks.outreach.createIfNotExists.mockImplementation(async (doc: { _id: string }) => {
    if (!store.heartbeats.has(doc._id)) store.heartbeats.set(doc._id, { ...doc, _rev: 'r0' })
    return store.heartbeats.get(doc._id)
  })
}

/** The default commit: claim records keep their revision; everything else just succeeds. */
async function commitRecord(record: PatchRecord): Promise<unknown> {
  const doc = store.heartbeats.get(record.id)
  if (!doc) return {}
  const expected = record.ops.find((op) => op[0] === 'ifRevisionId')?.[1]
  if (expected !== undefined && expected !== doc._rev) throw conflict()
  for (const [op, arg] of record.ops) {
    if (op === 'set') Object.assign(doc, arg)
    if (op === 'unset') for (const field of arg as string[]) delete doc[field]
  }
  doc._rev = `r${Number(String(doc._rev).slice(1)) + 1}`
  return doc
}

const isTaskPatch = (record: PatchRecord) => !record.id.startsWith('marketingHeartbeat')
const taskPatches = () => mocks.patches.filter(isTaskPatch)
const ENV_KEYS = ['SLACK_BOT_TOKEN', 'SLACK_MARKETING_CHANNEL_ID', 'SLACK_CHANNEL_ID', 'MARKETING_PUBLIC_BASE_URL'] as const
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

function digestRequest(query = '', body: Record<string, unknown> = {}) {
  return new NextRequest(`https://www.goinvo.com/api/marketing/slack/digest${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer key' },
    body: JSON.stringify(body),
  })
}

async function dryRun(body: Record<string, unknown> = {}) {
  const response = await POST(digestRequest('?dryRun=1', body))
  expect(response.status).toBe(200)
  return (await response.json()) as { blocks: Block[]; attachments: Block[]; text: string; asks: Block[]; exhausted: string[]; followUpCount: number }
}


beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  for (const key of ENV_KEYS) saved[key] = process.env[key]
  process.env.SLACK_BOT_TOKEN = 'xoxb-test'
  process.env.SLACK_MARKETING_CHANNEL_ID = CHANNEL
  process.env.SLACK_CHANNEL_ID = 'CWEBSITECHAT'
  process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'

  mocks.patches.length = 0
  mocks.patch.mockClear()
  mocks.commit.mockReset().mockImplementation(commitRecord)
  for (const client of [mocks.outreach, mocks.calendar, mocks.operationsWrite, mocks.planWeek]) {
    client.fetch.mockReset()
    client.createIfNotExists.mockReset()
    client.transaction.mockReset()
  }
  store.data = digestData()
  store.availability = AVAILABILITY
  store.tasks = []
  store.heartbeats = new Map()
  routeOutreach()
  mocks.calendar.fetch.mockResolvedValue([
    { title: 'LinkedIn: pilots <5%', publishAt: '2026-09-23T14:00:00Z' },
    { title: 'Newsletter', publishAt: '2026-09-25T14:00:00Z' },
  ])
  mocks.postSlackMessage.mockReset().mockResolvedValue({ channel: CHANNEL, ts: '1790000000.000100' })
  mocks.getSlackBotUserId.mockReset().mockResolvedValue('UBOT')
  mocks.loadStrategySnapshot.mockReset().mockResolvedValue(strategyLoad())
  mocks.readRunway.mockReset().mockResolvedValue(strategyLoad().runway)
  mocks.ideasNeedingReview.mockReset().mockResolvedValue([])
  mocks.isOutreachClientConfigured.mockReset().mockReturnValue(true)
})

afterEach(() => {
  vi.useRealTimers()
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

// ── Answer… ─────────────────────────────────────────────────────────────────

describe('answerMarketingTask', () => {
  // The same conditional write as every other press (answerTask), and the
  // fresh card back — which is what lets the interactions route redraw the
  // card the form was opened from instead of posting a second message.
  it('saves the answer under the revision read, and hands back the card to redraw', async () => {
    store.tasks = [
      { _id: 'op-d', _rev: 'rev7', title: 'Publish the taxonomy?', ownerName: '', status: 'needsHuman', kind: 'decision', humanQuestion: 'Publish it?', activity: [] },
    ]
    const result = await answerMarketingTask({ taskId: 'op-d', answer: 'Keep it internal.', personName: 'Juhan', slackUserId: 'UJUHAN' })
    expect(result).toMatchObject({
      ok: true,
      changed: true,
      taskTitle: 'Publish the taxonomy?',
      task: { _id: 'op-d', status: 'queued', kind: 'decision', humanQuestion: 'Publish it?' },
    })
    const [record] = taskPatches()
    expect(record.id).toBe('op-d')
    expect(record.ops).toEqual(
      expect.arrayContaining([
        ['set', expect.objectContaining({ humanResponse: 'Keep it internal.', status: 'queued', lastOutcome: 'Answered in Slack by Juhan' })],
        ['ifRevisionId', 'rev7'],
      ]),
    )
  })
})

// ── "Not me" ────────────────────────────────────────────────────────────────

describe('declineMarketingTask', () => {
  const TASK: Record<string, unknown> = {
    _id: 'op-1',
    _rev: 'rev1',
    title: 'Call MGB',
    ownerName: '',
    status: 'queued',
    kind: 'outreach',
    activity: [],
    askKeys: null,
  }
  const decline = async (
    task: Record<string, unknown> | null | Array<Record<string, unknown> | null>,
    person: { personName: string; slackUserId?: string } = { personName: 'Eric', slackUserId: 'UERIC' },
  ) => {
    store.tasks = Array.isArray(task) ? [...task] : [task]
    const result = await declineMarketingTask({ taskId: 'op-1', ...person })
    return { result, record: taskPatches().at(-1) }
  }
  const opsNamed = (record: PatchRecord | undefined, name: string) => (record?.ops || []).filter((op) => op[0] === name)
  const setOf = (record: PatchRecord | undefined) => (opsNamed(record, 'set')[0]?.[1] || {}) as Record<string, unknown>
  const unsetOf = (record: PatchRecord | undefined) => (opsNamed(record, 'unset')[0]?.[1] || []) as string[]
  const appended = (record: PatchRecord | undefined) => opsNamed(record, 'insert').flatMap((op) => op[3] as Block[])

  it('clears the owner AND the stamped Slack id, asks who should pick it up — conditionally on the revision read', async () => {
    const { result, record } = await decline({ ...TASK, ownerName: 'Eric', ownerSlackUserId: 'UERIC' })
    expect(result.ok).toBe(true)
    expect(setOf(record)).toMatchObject({
      ownerName: '',
      status: 'needsHuman',
      humanQuestion: 'Eric passed on this — who should pick it up?',
      lastOutcome: 'Declined in Slack by Eric',
    })
    expect(unsetOf(record)).toContain('ownerSlackUserId')
    expect((setOf(record).activity as Block[]).at(-1)).toMatchObject({ action: 'Passed on in Slack', outcome: 'By Eric' })
    expect(opsNamed(record, 'ifRevisionId')[0][1]).toBe('rev1')
  })

  // Reviewer finding: the passer was excluded by the NAME parsed from the
  // question, which is Slack's display name — so "Shirley Wu" was not matched
  // to the roster's "Shirley", and was asked about the task she had just declined.
  it('records the passer by Slack id and names them as the board does, whatever Slack calls them', async () => {
    const { result, record } = await decline(
      { ...TASK, suggestedOwner: 'Shirley' },
      { personName: 'Shirley Wu', slackUserId: 'USHIRLEY' },
    )
    expect(result.ok).toBe(true)
    expect(setOf(record).humanQuestion).toBe('Shirley passed on this — who should pick it up?')
    expect(opsNamed(record, 'setIfMissing')[0][1]).toEqual({ askHistory: [] })
    const [entry] = appended(record)
    expect(entry).toMatchObject({ slackUserId: 'USHIRLEY', kind: 'passed', week: WEEK, at: NOW.toISOString() })
    expect(entry._key).toMatch(/^pass-/)

    // The next digest reads that entry — and does not ask her, even though
    // she is the task's suggested owner and has room.
    store.data = digestData({
      operations: [
        {
          _id: 'op-1',
          title: 'Call MGB',
          kind: 'outreach',
          status: 'needsHuman',
          suggestedOwner: 'Shirley',
          // Written before the question used the board name: the parse cannot help.
          humanQuestion: 'Shirley Wu passed on this — who should pick it up?',
          askHistory: [entry],
        },
      ],
      owned: [],
    })
    const body = await dryRun()
    expect(body.asks).toHaveLength(1)
    expect(body.asks[0].slackUserId).not.toBe('USHIRLEY')
    expect(json(body.blocks)).not.toContain('<@USHIRLEY>')
  })

  it('appends nothing when that person already passed on this task', async () => {
    const entry = askHistoryEntry({ taskId: 'op-1', slackUserId: 'UERIC', at: 'earlier', week: LAST_WEEK, kind: 'passed' })
    const { result, record } = await decline({
      ...TASK,
      status: 'needsHuman',
      humanQuestion: 'Juhan passed on this — who should pick it up?',
      askKeys: [entry._key],
    })
    expect(result.ok).toBe(true)
    expect(opsNamed(record, 'insert')).toHaveLength(0)
    expect(setOf(record).humanQuestion).toBe('Eric passed on this — who should pick it up?')
  })

  it('is a no-op when the same person presses twice (a Slack retry)', async () => {
    const entry = askHistoryEntry({ taskId: 'op-1', slackUserId: 'UERIC', at: 'earlier', week: WEEK, kind: 'passed' })
    const { result } = await decline({
      ...TASK,
      status: 'needsHuman',
      humanQuestion: 'Eric passed on this — who should pick it up?',
      askKeys: [entry._key],
    })
    expect(result).toMatchObject({ ok: true, message: 'Already passed on.' })
    expect(taskPatches()).toHaveLength(0)
  })

  // Reviewer finding: "Hand it back" is on a card the whole channel sees, and
  // anybody could clear a colleague's name off their work.
  it('lets only the owner hand an owned task back', async () => {
    const owned = { ...TASK, ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN' }
    const { result } = await decline(owned, { personName: 'Eric', slackUserId: 'UERIC' })
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/Juhan’s — only they can hand it back/) })
    expect(taskPatches()).toHaveLength(0)

    // The owner, under whatever Slack calls him, is recognised by the roster's id.
    const mine = await decline(owned, { personName: 'Juhan Sonin', slackUserId: 'UJUHAN' })
    expect(mine.result.ok).toBe(true)
    expect(setOf(mine.record)).toMatchObject({ ownerName: '', humanQuestion: 'Juhan passed on this — who should pick it up?' })
  })

  // Reviewer finding: the pass was a read-then-write with no revision check,
  // so a Take landing in between was silently undone (ownerName set to '').
  it('re-reads on a revision conflict instead of undoing a Take that landed in between', async () => {
    mocks.commit.mockImplementationOnce(async () => {
      throw conflict()
    })
    const { result } = await decline(
      [TASK, { ...TASK, _rev: 'rev2', ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN' }],
      { personName: 'Eric', slackUserId: 'UERIC' },
    )
    // Juhan took it in the meantime: Eric's "not me" no longer clears anything.
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/Juhan’s/) })
    expect(taskPatches()).toHaveLength(1)
    expect(opsNamed(taskPatches()[0], 'ifRevisionId')[0][1]).toBe('rev1')
  })

  it('never overwrites the question on a decision', async () => {
    const { record } = await decline({ ...TASK, status: 'needsHuman', kind: 'decision', humanQuestion: 'Should we publish F1–F8?' })
    expect(setOf(record)).not.toHaveProperty('humanQuestion')
    expect(setOf(record).status).toBe('needsHuman')
    expect(unsetOf(record)).toContain('ownerSlackUserId')
  })

  it('treats any real question as a decision, whatever the kind', async () => {
    const { record } = await decline({ ...TASK, status: 'needsHuman', kind: 'outreach', humanQuestion: 'Which offer do we lead with?' })
    expect(setOf(record)).not.toHaveProperty('humanQuestion')
  })

  it('replaces an earlier "passed on this" with the latest person to pass', async () => {
    const { record } = await decline({ ...TASK, status: 'needsHuman', kind: 'content', humanQuestion: 'Shirley passed on this — who should pick it up?' })
    expect(setOf(record).humanQuestion).toBe('Eric passed on this — who should pick it up?')
  })

  it('refuses to drag a finished task back open, and writes nothing', async () => {
    const { result } = await decline({ ...TASK, status: 'done' })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/closed/)
    expect(taskPatches()).toHaveLength(0)
  })

  it('says so when the task is gone', async () => {
    const { result } = await decline(null)
    expect(result).toMatchObject({ ok: false, message: 'Couldn’t update that task — nothing changed. I can’t find it any more. Open This week.' })
  })

  it('refuses rather than guessing a name when the team list cannot be read', async () => {
    store.availability = new Error('outreach down')
    const { result } = await decline(TASK)
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/team list/) })
    expect(taskPatches()).toHaveLength(0)
  })
})

// ── "I’m away this week", and its Undo ───────────────────────────────────────

describe('setMarketingAvailability — the same safe write the chat path uses', () => {
  /** The availability records, as Sanity holds them: every write bumps the revision. */
  const records = new Map<string, Record<string, any>>()
  let openTasks: number | Error = 2
  let transactions: Array<Array<[string, ...unknown[]]>> = []

  const idFor = (name: string) => availabilityDocId(name)
  const record = (name: string) => records.get(idFor(name))
  const seed = (doc: Record<string, any>) => records.set(doc._id || idFor(doc.ownerName), { _id: idFor(doc.ownerName), _rev: 'r1', ...doc })
  const bump = (doc: Record<string, any>) => {
    doc._rev = `r${Number(String(doc._rev || 'r0').slice(1)) + 1}`
  }
  const apply = (doc: Record<string, any>, ops: Op[]) => {
    for (const [op, arg] of ops) {
      if (op === 'set') Object.assign(doc, arg)
      if (op === 'unset') for (const field of arg as string[]) delete doc[field]
    }
    bump(doc)
  }
  const availabilityPatches = () => mocks.patches.filter((patch) => patch.id.startsWith('marketingTeamAvailability.'))
  const opsOf = (patch: PatchRecord | undefined, name: string) => (patch?.ops || []).filter((op) => op[0] === name).map((op) => op[1])

  /** A transaction builder that applies atomically, the way Sanity's does — a failed revision check applies nothing. */
  function transaction() {
    const steps: Array<[string, ...unknown[]]> = []
    const chain: Record<string, any> = {
      createIfNotExists: (doc: Record<string, any>) => (steps.push(['createIfNotExists', doc]), chain),
      patch: (id: string, build: (patch: any) => any) => {
        const ops: Op[] = []
        const builder: Record<string, any> = {}
        for (const op of ['set', 'unset', 'ifRevisionId']) builder[op] = (arg: unknown) => (ops.push([op, arg]), builder)
        build(builder)
        steps.push(['patch', id, ops])
        return chain
      },
      delete: (id: string) => (steps.push(['delete', id]), chain),
      commit: async () => {
        transactions.push(steps)
        for (const step of steps) {
          if (step[0] !== 'patch') continue
          const doc = records.get(step[1] as string)
          const expected = (step[2] as Op[]).find((op) => op[0] === 'ifRevisionId')?.[1]
          if (expected !== undefined && (!doc || doc._rev !== expected)) throw conflict()
        }
        for (const step of steps) {
          if (step[0] === 'createIfNotExists') {
            const doc = step[1] as Record<string, any>
            if (!records.has(doc._id)) records.set(doc._id, { ...doc, _rev: 'r0' })
          }
          if (step[0] === 'patch') {
            const doc = records.get(step[1] as string)
            if (doc) apply(doc, (step[2] as Op[]).filter((op) => op[0] !== 'ifRevisionId'))
          }
          if (step[0] === 'delete') records.delete(step[1] as string)
        }
        return {}
      },
    }
    return chain
  }

  beforeEach(() => {
    records.clear()
    transactions = []
    openTasks = 2
    // Juhan's record carries everything the old createOrReplace used to wipe.
    seed({ ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available', weeklyHours: 4, note: 'Calls on Tuesdays' })
    seed({ ownerName: 'Eric', slackUserId: 'UERIC', status: 'available' })
    mocks.outreach.fetch.mockImplementation(async (query: string, params?: { id?: string; name?: string }) => {
      if (query === AVAILABILITY_WRITE_QUERY) {
        const doc = records.get(String(params?.id))
        return doc ? { ...doc } : null
      }
      if (query === OWNED_OPEN_TASKS_QUERY) {
        if (openTasks instanceof Error) throw openTasks
        return openTasks
      }
      if (query === TEAM_AVAILABILITY_QUERY) {
        if (store.availability instanceof Error) throw store.availability
        return store.availability
      }
      throw new Error(`unexpected query: ${query.slice(0, 80)}`)
    })
    mocks.outreach.createIfNotExists.mockImplementation(async (doc: { _id: string }) => {
      if (!records.has(doc._id)) records.set(doc._id, { ...doc, _rev: 'r0' })
      return records.get(doc._id)
    })
    mocks.outreach.transaction.mockImplementation(transaction)
    mocks.commit.mockImplementation(async (patch: PatchRecord) => {
      const doc = records.get(patch.id)
      if (!doc) return commitRecord(patch)
      const expected = patch.ops.find((op) => op[0] === 'ifRevisionId')?.[1]
      if (expected !== undefined && expected !== doc._rev) throw conflict()
      apply(doc, patch.ops.filter((op) => op[0] !== 'ifRevisionId'))
      return doc
    })
  })

  const away = (input: Partial<Parameters<typeof setMarketingAvailability>[0]> = {}) =>
    setMarketingAvailability({ personName: 'Juhan Sonin', slackUserId: 'UJUHAN', status: 'away', now: NOW, ...input })

  it('patches status and dates onto the presser’s own record, and keeps the link, the hours and the note', async () => {
    const result = await away()
    expect(result).toMatchObject({ ok: true, changed: true, ownerName: 'Juhan', status: 'away', from: '2026-09-21', until: '2026-09-27', openTasks: 2 })
    expect(result.message).toBe(
      'You’re away Mon 21 – Sun 27 Sep. I’ll leave you out of this week’s plan, and your 2 open tasks will show as needing someone.',
    )
    // The room's line for the same write: third person, a real mention, no pronoun guessed from a name.
    expect(result.receipt).toBe(':palm_tree: <@UJUHAN> is away Mon 21 – Sun 27 Sep — I’ll leave them out of this week’s plan.')
    const [patch] = availabilityPatches()
    expect(patch.id).toBe(idFor('Juhan'))
    expect(opsOf(patch, 'set')[0]).toEqual({ status: 'away', from: '2026-09-21', until: '2026-09-27', updatedAt: NOW.toISOString() })
    expect(opsOf(patch, 'ifRevisionId')[0]).toBe('r1')
    // Nothing that identifies or allocates the person is touched.
    expect(record('Juhan')).toMatchObject({ ownerName: 'Juhan', slackUserId: 'UJUHAN', weeklyHours: 4, note: 'Calls on Tuesdays' })
    expect(JSON.stringify(opsOf(patch, 'set'))).not.toMatch(/slackUserId|ownerName|weeklyHours|note/)
    expect(result.message).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('books next week as next week, by name', async () => {
    const result = await away({ from: '2026-09-28', until: '2026-10-04' })
    expect(result.message).toBe(
      'You’re away Mon 28 Sep – Sun 4 Oct. I’ll leave you out of next week’s plan, and your 2 open tasks will show as needing someone.',
    )
  })

  it('reads "this week" on the studio’s calendar: 9pm on a Sunday in Boston is still that Sunday', async () => {
    // 01:00 UTC on Monday 28 Sep is 21:00 on Sunday 27 Sep in Boston. In UTC
    // this press would have booked the whole of next week off.
    const result = await away({ now: new Date('2026-09-28T01:00:00Z') })
    expect(result).toMatchObject({ ok: true, from: '2026-09-27', until: '2026-09-27' })
  })

  it('says nothing about open work it could not count, rather than a wrong number', async () => {
    openTasks = new Error('count failed')
    const result = await away()
    expect(result.ok).toBe(true)
    expect(result.message).toBe('You’re away Mon 21 – Sun 27 Sep. I’ll leave you out of this week’s plan.')
    expect(result).not.toHaveProperty('openTasks')
  })

  it('changes nothing, and offers no Undo, when the record already says exactly this', async () => {
    await away()
    mocks.patches.length = 0
    const again = await away()
    expect(again).toMatchObject({ ok: true, changed: false })
    expect(again.undoValue).toBeUndefined()
    expect(again.message).toMatch(/already down as away Mon 21 – Sun 27 Sep/)
    expect(availabilityPatches()).toHaveLength(0)
  })

  it('refuses a namesake: a display name matching someone else’s linked name books nothing', async () => {
    const result = await away({ personName: 'Juhan', slackUserId: 'UIMPOSTOR' })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/^Couldn’t tell which name on the team list is yours — nothing changed\./)
    expect(availabilityPatches()).toHaveLength(0)
    expect(record('Juhan')?.status).toBe('available')
  })

  it('refuses a record that shares the id’s slug but is somebody else’s', async () => {
    seed({ _id: idFor('Jo Ann'), ownerName: 'Jo Ann', slackUserId: 'UJO1', status: 'available' })
    const result = await away({ personName: 'Jo-Ann', slackUserId: 'UJO2' })
    expect(result.ok).toBe(false)
    expect(availabilityPatches()).toHaveLength(0)
  })

  it('refuses rather than guessing when the team list cannot be read', async () => {
    store.availability = new Error('outreach down')
    const result = await away()
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/^Couldn’t read the team list — nothing changed\./) })
    expect(availabilityPatches()).toHaveLength(0)
  })

  it('re-reads once on a conflict, and never overwrites what landed in between', async () => {
    mocks.commit.mockImplementationOnce(async () => {
      // Somebody set an allocation between the read and the write.
      const doc = record('Juhan')!
      doc.weeklyHours = 2
      bump(doc)
      throw conflict()
    })
    const result = await away()
    expect(result.ok).toBe(true)
    const patches = availabilityPatches()
    expect(patches).toHaveLength(2)
    expect(opsOf(patches[1], 'ifRevisionId')[0]).toBe('r2')
    expect(record('Juhan')).toMatchObject({ status: 'away', weeklyHours: 2 })
  })

  it('creates a record for someone with work on the board but no record yet, under the name the board uses', async () => {
    // openTasks: the board files 2 open tasks under exactly "Pat Lee".
    const result = await away({ personName: 'Pat Lee', slackUserId: 'UPAT' })
    expect(result).toMatchObject({ ok: true, ownerName: 'Pat Lee' })
    expect(mocks.outreach.createIfNotExists).toHaveBeenCalledWith({
      _id: idFor('Pat Lee'),
      _type: 'marketingTeamAvailability',
      ownerName: 'Pat Lee',
      status: 'available',
    })
    // Nothing here links an identity: that is the one-time setup's job, which asks first.
    expect(record('Pat Lee')).not.toHaveProperty('slackUserId')
  })

  // The record holds ONE range, and the press used to overwrite it whatever it held.
  describe('never cuts booked time off short', () => {
    it('changes nothing for someone already away for longer — pressed on Thursday, next week stays booked', async () => {
      Object.assign(record('Juhan')!, { status: 'away', from: '2026-09-14', until: '2026-10-04' })
      const result = await away({ now: new Date('2026-09-24T14:00:00Z') })
      expect(result).toMatchObject({ ok: true, changed: false, from: '2026-09-14', until: '2026-10-04' })
      expect(result.message).toBe('You’re already down as away Mon 14 Sep – Sun 4 Oct — nothing changed.')
      expect(result.undoValue).toBeUndefined()
      expect(result.receipt).toBeUndefined()
      expect(availabilityPatches()).toHaveLength(0)
    })

    it('pressed on Monday and again on Wednesday, keeps Monday', async () => {
      await away()
      mocks.patches.length = 0
      const again = await away({ now: new Date('2026-09-23T14:00:00Z') })
      expect(again).toMatchObject({ ok: true, changed: false })
      expect(availabilityPatches()).toHaveLength(0)
      expect(record('Juhan')).toMatchObject({ from: '2026-09-21', until: '2026-09-27' })
    })

    it('joins time off it meets end to start, and Undo puts back exactly what was booked', async () => {
      Object.assign(record('Juhan')!, { status: 'away', from: '2026-09-28', until: '2026-10-04' })
      const result = await away()
      expect(result).toMatchObject({ ok: true, changed: true, from: '2026-09-21', until: '2026-10-04' })
      expect(result.message).toBe(
        'You’re away Mon 21 Sep – Sun 4 Oct (joined up with the time off you’d already booked). I’ll leave you out of those weeks’ plans, and your 2 open tasks will show as needing someone.',
      )
      expect(result.message).not.toContain('replaces')
      expect(record('Juhan')).toMatchObject({ from: '2026-09-21', until: '2026-10-04' })
      await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UJUHAN', now: NOW })
      expect(record('Juhan')).toMatchObject({ status: 'away', from: '2026-09-28', until: '2026-10-04' })
    })

    it('joins time off it overlaps', async () => {
      Object.assign(record('Juhan')!, { status: 'away', from: '2026-09-24', until: '2026-10-02' })
      const result = await away()
      expect(record('Juhan')).toMatchObject({ from: '2026-09-21', until: '2026-10-02' })
      expect(result.message).toMatch(/^You’re away Mon 21 Sep – Fri 2 Oct \(joined up/)
    })

    it('replaces time off that has already ended without a word — it is history, not a booking', async () => {
      Object.assign(record('Juhan')!, { status: 'away', from: '2026-09-01', until: '2026-09-04' })
      const result = await away()
      expect(result.message).not.toContain('replaces')
      expect(record('Juhan')).toMatchObject({ from: '2026-09-21', until: '2026-09-27' })
    })
  })

  it('refuses a date that is not a real day, rather than throwing or booking the wrong one', async () => {
    for (const bad of [{ from: '2026-13-01' }, { from: '2026-09-28', until: '2026-02-31' }, { until: 'next friday' }]) {
      const result = await away(bad)
      expect(result, JSON.stringify(bad)).toEqual({ ok: false, message: 'Couldn’t save those days — nothing changed. One of them isn’t a real date.' })
    }
    expect(availabilityPatches()).toHaveLength(0)
  })

  describe('a name the board does not know', () => {
    it('is refused, not booked as a second person — the unlinked Juhan whose Slack says "Juhan Sonin"', async () => {
      store.availability = [{ ownerName: 'Juhan', status: 'available' }]
      records.get(idFor('Juhan'))!.slackUserId = undefined
      openTasks = 0
      const result = await away({ personName: 'Juhan Sonin', slackUserId: 'UJUHAN' })
      expect(result).toEqual({
        ok: false,
        message:
          'Couldn’t tell which name on the team list is yours — nothing changed. Nothing is filed under “Juhan Sonin”. If your work is filed under another name, pick it in the Monday plan’s one-time setup.',
      })
      expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
      expect(availabilityPatches()).toHaveLength(0)
      expect(record('Juhan Sonin')).toBeUndefined()
    })

    it('is refused when the board’s work cannot be counted to prove it is somebody', async () => {
      openTasks = new Error('count failed')
      const result = await away({ personName: 'Pat Lee', slackUserId: 'UPAT' })
      expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/^Couldn’t read the team list — nothing changed\./) })
      expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
    })
  })

  describe('Undo', () => {
    it('puts the record back exactly as it was — the link, the hours and the note never moved', async () => {
      const result = await away()
      const undo = await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UJUHAN', now: NOW })
      expect(undo).toEqual({
        ok: true,
        changed: true,
        message: 'Undone — you’re available again.',
        // What the room's receipt is redrawn as: struck through, nothing left to press.
        receipt: '~<@UJUHAN> away Mon 21 – Sun 27 Sep~ — undone by <@UJUHAN>.',
      })
      const doc = record('Juhan')!
      expect(doc).toMatchObject({ status: 'available', slackUserId: 'UJUHAN', weeklyHours: 4, note: 'Calls on Tuesdays' })
      expect(doc).not.toHaveProperty('from')
      expect(doc).not.toHaveProperty('until')
      const last = availabilityPatches().at(-1)
      expect(opsOf(last, 'ifRevisionId')[0]).toBe('r2')
    })

    it('restores an earlier holiday rather than clearing it', async () => {
      Object.assign(record('Juhan')!, { status: 'away', from: '2026-10-05', until: '2026-10-09' })
      const result = await away()
      // The record holds one range: a separate booking is replaced — out loud, never silently.
      expect(result.message).toMatch(/ This replaces your time off Mon 5 – Fri 9 Oct\.$/)
      const undo = await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UJUHAN', now: NOW })
      expect(undo.message).toBe('Undone — you’re away Mon 5 – Fri 9 Oct again.')
      expect(undo.receipt).toBe('~<@UJUHAN> away Mon 21 – Sun 27 Sep~ — undone by <@UJUHAN>. Back to away Mon 5 – Fri 9 Oct.')
      expect(record('Juhan')).toMatchObject({ status: 'away', from: '2026-10-05', until: '2026-10-09', weeklyHours: 4 })
    })

    it('removes the record the press created — in one transaction with a revision check', async () => {
      const result = await away({ personName: 'Pat Lee', slackUserId: 'UPAT' })
      const undo = await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UPAT', now: NOW })
      expect(undo.ok).toBe(true)
      expect(record('Pat Lee')).toBeUndefined()
      const [steps] = transactions
      expect(steps.map((step) => step[0])).toEqual(['patch', 'delete'])
      expect((steps[0][2] as Op[]).find((op) => op[0] === 'ifRevisionId')?.[1]).toBe('r1')
    })

    it('keeps a created record that has since been linked, and only takes the time off it', async () => {
      const result = await away({ personName: 'Pat Lee', slackUserId: 'UPAT' })
      Object.assign(record('Pat Lee')!, { slackUserId: 'UPAT' })
      const undo = await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UPAT', now: NOW })
      expect(undo.ok).toBe(true)
      expect(record('Pat Lee')).toMatchObject({ status: 'available', slackUserId: 'UPAT' })
      expect(record('Pat Lee')).not.toHaveProperty('from')
    })

    it('is only for the person who set it — the button sits in a thread the room can see', async () => {
      const result = await away()
      mocks.patches.length = 0
      const undo = await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UERIC', now: NOW })
      expect(undo).toMatchObject({ ok: false, message: expect.stringMatching(/^Couldn’t undo that — nothing changed\. Only the person/) })
      expect(availabilityPatches()).toHaveLength(0)
      expect(record('Juhan')?.status).toBe('away')
    })

    it('never undoes a later change', async () => {
      const result = await away()
      // Next week, on top of this week: joined into one range (see below).
      await away({ from: '2026-09-28', until: '2026-10-04' })
      mocks.patches.length = 0
      const undo = await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UJUHAN', now: NOW })
      expect(undo.ok).toBe(false)
      expect(undo.message).toContain('`Marqueta, away next week`')
      expect(availabilityPatches()).toHaveLength(0)
      expect(record('Juhan')).toMatchObject({ from: '2026-09-21', until: '2026-10-04' })
    })

    it('pressed twice, says it is already undone and writes nothing more', async () => {
      const result = await away()
      await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UJUHAN', now: NOW })
      mocks.patches.length = 0
      const again = await restoreMarketingAvailability({ undo: result.undoValue!, slackUserId: 'UJUHAN', now: NOW })
      expect(again).toEqual({ ok: true, changed: false, message: 'Already undone.' })
      expect(availabilityPatches()).toHaveLength(0)

      const created = await away({ personName: 'Pat Lee', slackUserId: 'UPAT' })
      await restoreMarketingAvailability({ undo: created.undoValue!, slackUserId: 'UPAT', now: NOW })
      expect(await restoreMarketingAvailability({ undo: created.undoValue!, slackUserId: 'UPAT', now: NOW })).toMatchObject({
        ok: true,
        changed: false,
      })
    })

    it('refuses a value it cannot read', async () => {
      expect(await restoreMarketingAvailability({ undo: 'not json', slackUserId: 'UJUHAN', now: NOW })).toMatchObject({ ok: false })
    })
  })
})

describe('the availability Undo value', () => {
  const undo: AvailabilityUndo = {
    ownerName: 'Juhan',
    slackUserId: 'UJUHAN',
    wrote: { status: 'away', from: '2026-09-21', until: '2026-09-27', weeklyHours: null },
    prior: { status: 'reduced', from: '2026-09-01', until: '', weeklyHours: 2 },
  }

  it('round-trips, including "there was no record before"', () => {
    expect(decodeAvailabilityUndo(encodeAvailabilityUndo(undo))).toEqual(undo)
    expect(decodeAvailabilityUndo(encodeAvailabilityUndo({ ...undo, prior: null }))).toEqual({ ...undo, prior: null })
  })

  it('is small enough for a button, whatever the name', () => {
    expect(encodeAvailabilityUndo({ ...undo, ownerName: 'x'.repeat(5000) }).length).toBeLessThan(400)
  })

  it('refuses anything that would make Undo guess', () => {
    const value = JSON.parse(encodeAvailabilityUndo(undo))
    expect(decodeAvailabilityUndo(JSON.stringify({ ...value, u: '' }))).toBeNull()
    expect(decodeAvailabilityUndo(JSON.stringify({ ...value, w: 'away' }))).toBeNull()
    const { p: _prior, ...withoutPrior } = value
    expect(_prior).toBeTruthy()
    // "No prior" must be said (null), never assumed from a missing key.
    expect(decodeAvailabilityUndo(JSON.stringify(withoutPrior))).toBeNull()
    expect(decodeAvailabilityUndo(undefined)).toBeNull()
  })
})

describe('linkMarketingIdentity', () => {
  const records = new Map<string, Record<string, any>>()
  let steps: Array<[string, ...unknown[]]> = []
  /** Reads of the record that should miss once — the other half of a race that has not landed yet. */
  let hideRecordOnce = false

  beforeEach(() => {
    records.clear()
    steps = []
    hideRecordOnce = false
    records.set(availabilityDocId('Juhan'), { _id: availabilityDocId('Juhan'), _rev: 'r1', ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'away' })
    records.set(availabilityDocId('Shirley'), { _id: availabilityDocId('Shirley'), _rev: 'r1', ownerName: 'Shirley', status: 'away', from: '2026-09-21' })
    mocks.outreach.fetch.mockImplementation(async (query: string, params?: { id?: string; uid?: string }) => {
      if (query === AVAILABILITY_WRITE_QUERY) {
        if (hideRecordOnce) {
          hideRecordOnce = false
          return null
        }
        const doc = records.get(String(params?.id))
        return doc ? { ...doc } : null
      }
      if (query === LINKED_RECORDS_QUERY) {
        return [...records.values()].filter((doc) => doc.slackUserId === params?.uid).map((doc) => ({ _id: doc._id, ownerName: doc.ownerName }))
      }
      throw new Error(`unexpected query: ${query.slice(0, 80)}`)
    })
    // Applies atomically, as Sanity's does: a failed revision check applies nothing.
    mocks.outreach.transaction.mockImplementation(() => {
      const pending: Array<() => void> = []
      const chain: Record<string, any> = {
        createIfNotExists: (doc: Record<string, any>) => {
          steps.push(['createIfNotExists', doc])
          pending.push(() => {
            if (!records.has(doc._id)) records.set(doc._id, { ...doc, _rev: 'r0' })
          })
          return chain
        },
        patch: (id: string, build: (patch: any) => any) => {
          const ops: Op[] = []
          const builder: Record<string, any> = {}
          for (const op of ['set', 'unset', 'setIfMissing', 'ifRevisionId']) builder[op] = (arg: unknown) => (ops.push([op, arg]), builder)
          build(builder)
          steps.push(['patch', id, ops])
          pending.push(() => {
            const doc = records.get(id)
            if (!doc) return
            for (const [op, arg] of ops) {
              if (op === 'setIfMissing') for (const [key, value] of Object.entries(arg as object)) if (!(key in doc)) doc[key] = value
              if (op === 'set') Object.assign(doc, arg)
            }
          })
          return chain
        },
        commit: async () => {
          for (const [kind, id, ops] of steps) {
            if (kind !== 'patch') continue
            const expected = (ops as Op[]).find((op) => op[0] === 'ifRevisionId')?.[1]
            if (expected !== undefined && records.get(id as string)?._rev !== expected) throw conflict()
          }
          for (const apply of pending) apply()
          return {}
        },
      }
      return chain
    })
  })

  const linkedAs = (name: string) => `You’re linked as *${name}* — I’ll @-mention you on your own tasks from now on.`

  it('links an unlinked name — only the Slack id, on the revision it read, keeping the holiday already booked', async () => {
    const result = await linkMarketingIdentity({ ownerName: 'Shirley', slackUserId: 'USHIRLEY' })
    expect(result).toEqual({ ok: true, message: linkedAs('Shirley') })
    const patch = steps.find((step) => step[0] === 'patch')!
    const ops = patch[2] as Op[]
    // setIfMissing: an id that landed first is never overwritten.
    expect(ops.find((op) => op[0] === 'setIfMissing')?.[1]).toEqual({ slackUserId: 'USHIRLEY' })
    expect(ops.find((op) => op[0] === 'set')?.[1]).toEqual({ updatedAt: expect.any(String) })
    expect(ops.find((op) => op[0] === 'ifRevisionId')?.[1]).toBe('r1')
    expect(records.get(availabilityDocId('Shirley'))).toMatchObject({ slackUserId: 'USHIRLEY', status: 'away', from: '2026-09-21' })
  })

  it('never moves a name linked to someone else onto the presser (an old digest’s select)', async () => {
    const result = await linkMarketingIdentity({ ownerName: 'Juhan', slackUserId: 'UIMPOSTOR' })
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/^Couldn’t link you as Juhan — nothing changed\./)
    expect(steps).toHaveLength(0)
  })

  it('is a no-op for someone already linked to that name', async () => {
    expect(await linkMarketingIdentity({ ownerName: 'Juhan', slackUserId: 'UJUHAN' })).toEqual({ ok: true, message: linkedAs('Juhan') })
    expect(steps).toHaveLength(0)
  })

  it('never links one account to a second name — they would own two people’s work', async () => {
    const result = await linkMarketingIdentity({ ownerName: 'Shirley', slackUserId: 'UJUHAN' })
    expect(result).toEqual({ ok: false, message: 'Couldn’t link you as Shirley — nothing changed. You’re already linked as Juhan.' })
    expect(steps).toHaveLength(0)
    expect(records.get(availabilityDocId('Shirley'))).not.toHaveProperty('slackUserId')
  })

  it('creates the record for a name with none, and tells only the first of two simultaneous presses it is theirs', async () => {
    const first = await linkMarketingIdentity({ ownerName: 'Eric', slackUserId: 'UERIC' })
    expect(first).toEqual({ ok: true, message: linkedAs('Eric') })
    expect(records.get(availabilityDocId('Eric'))).toMatchObject({ ownerName: 'Eric', slackUserId: 'UERIC', status: 'available' })

    // A second press that read "no record yet" before the first landed.
    steps = []
    hideRecordOnce = true
    const second = await linkMarketingIdentity({ ownerName: 'Eric', slackUserId: 'UOTHER' })
    expect(second).toEqual({ ok: false, message: 'Couldn’t link you as Eric — nothing changed. Someone else linked that name just now.' })
    expect(records.get(availabilityDocId('Eric'))?.slackUserId).toBe('UERIC')
  })

  it('escapes a name that would otherwise be markup', async () => {
    const result = await linkMarketingIdentity({ ownerName: 'Jen <!here>', slackUserId: 'UJEN' })
    expect(result.message).toBe(linkedAs('Jen &lt;!here&gt;'))
  })
})

describe('claim and "Not me" refuse a namesake', () => {
  it('writes nothing for a presser whose display name is someone else’s linked name', async () => {
    store.tasks = [{ _id: 'op-1', _rev: 'rev1', title: 'Call MGB', ownerName: '', status: 'queued', kind: 'outreach', activity: [] }]
    for (const run of [claimMarketingTask, declineMarketingTask]) {
      const result = await run({ taskId: 'op-1', personName: 'Eric', slackUserId: 'UIMPOSTOR' })
      expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/which name on the team list is yours/) })
    }
    expect(taskPatches()).toHaveLength(0)
  })
})

// The legacy Monday plan's "I’ll take it" / "Take it over" stay in the channel for weeks.
describe('claimMarketingTask takes a task only as its card showed it', () => {
  const owned = () => ({ _id: 'op-1', _rev: 'rev1', title: 'Call MGB', ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN', status: 'queued', kind: 'outreach', activity: [] })
  const setOf = (record: PatchRecord | undefined) => (record?.ops.find((op) => op[0] === 'set')?.[1] || {}) as Record<string, unknown>

  it('refuses, and writes nothing, when an unowned card’s task has been taken since', async () => {
    store.tasks = [owned()]
    const result = await claimMarketingTask({ taskId: 'op-1', personName: 'Eric', slackUserId: 'UERIC', expectedOwner: '' })
    expect(result).toMatchObject({ ok: false, message: 'Couldn’t take that — nothing changed. Juhan already has it.' })
    expect(taskPatches()).toHaveLength(0)
  })

  it('refuses a "Take it over" once someone else has it — never from whoever covered it first', async () => {
    store.tasks = [owned()]
    const result = await claimMarketingTask({ taskId: 'op-1', personName: 'Shirley', slackUserId: 'USHIRLEY', expectedOwner: 'Eric' })
    expect(result).toMatchObject({ ok: false, message: 'Couldn’t take that — nothing changed. Juhan already has it.' })
    expect(taskPatches()).toHaveLength(0)
  })

  it('takes it over while it is still the owner the card named, and returns the task to redraw', async () => {
    store.tasks = [owned()]
    const result = await claimMarketingTask({ taskId: 'op-1', personName: 'Eric', slackUserId: 'UERIC', expectedOwner: 'Juhan' })
    expect(result).toMatchObject({ ok: true, changed: true, task: { _id: 'op-1', ownerName: 'Eric', slackUserId: 'UERIC' } })
    expect(setOf(taskPatches()[0])).toMatchObject({ ownerName: 'Eric', ownerSlackUserId: 'UERIC' })
  })

  it('without a card to go by, is the old unconditional take-over', async () => {
    store.tasks = [owned()]
    await expect(claimMarketingTask({ taskId: 'op-1', personName: 'Eric', slackUserId: 'UERIC' })).resolves.toMatchObject({ ok: true })
  })
})
