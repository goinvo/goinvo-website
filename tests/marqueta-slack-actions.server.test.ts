/**
 * The Monday digest, against a mocked Sanity and a mocked Slack.
 *
 * What these pin is what the route adds around the pure builders: asks are
 * made of the right people and put where a notification can see them; the
 * record of an ask is written only after it really reached the channel; a
 * preview writes nothing at all; the message never exceeds Slack's fifty
 * blocks; no contact detail reaches the channel; and the digest never falls
 * back to the website-chat channel.
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
import { DIGEST_HEARTBEAT_DOC_ID, digestHeartbeatStep } from '@/lib/marketing/heartbeat'
import { TEAM_AVAILABILITY_QUERY } from '@/lib/marketing/team.server'
import { GET as PLAN_WEEK_GET, POST as PLAN_WEEK_POST } from '@/app/api/marketing/plan-week/route'
import {
  checkInTaskBlockId,
  decodeContactRef,
  MARQUETA_ACTION,
} from '@/lib/marketing/marquetaActions'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { describeRunway, resolveRunwayPosture, runwayCheckIn, type StoredPosture } from '@/lib/marketing/runway'
import { claimMarketingTask, declineMarketingTask } from '@/lib/marketing/slackActions.server'
import {
  askHistoryEntry,
  buildRunwayBlocks,
  buildTaskAttachment,
  buildWeeklyDigestBlocks,
  decodeActionValue,
  MARKETING_ACTION,
  readAskHistory,
} from '@/lib/marketing/slackDelegation'
import { buildStrategySnapshot, monthWindow } from '@/lib/marketing/strategyCheck'
import { expectValidSlackBlocks } from './support/slackBlocks'

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
const askEntriesFor = (taskId: string) =>
  taskPatches()
    .filter((record) => record.id === taskId)
    .flatMap((record) => record.ops.filter((op) => op[0] === 'insert').flatMap((op) => op[3] as Block[]))

/** Run 1's recorded asks, written back onto the fixture the way Sanity would hold them. */
function withRecordedAsks(operations: Record<string, any>[]) {
  return operations.map((operation) => {
    const added = askEntriesFor(operation._id)
    return added.length ? { ...operation, askHistory: [...(operation.askHistory || []), ...added] } : operation
  })
}

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

const sectionText = (block: Block) => String(block?.text?.text || '')
const indexOfText = (blocks: Block[], needle: string) => blocks.findIndex((block) => json(block).includes(needle))

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

// ── The preview ─────────────────────────────────────────────────────────────

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
    expect(result).toMatchObject({ ok: false, message: 'That task no longer exists.' })
  })

  it('refuses rather than guessing a name when the team list cannot be read', async () => {
    store.availability = new Error('outreach down')
    const { result } = await decline(TASK)
    expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/team list/) })
    expect(taskPatches()).toHaveLength(0)
  })
})

// ── "I'll take it" / "Take it over" ─────────────────────────────────────────
