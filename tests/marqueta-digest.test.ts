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

describe('a dry run', () => {
  it('builds the whole message and writes nothing — not even who it would ask', async () => {
    const body = await dryRun()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
    expect(mocks.commit).not.toHaveBeenCalled()
    for (const client of [mocks.outreach, mocks.calendar, mocks.operationsWrite]) {
      expect(client.createIfNotExists).not.toHaveBeenCalled()
      expect(client.transaction).not.toHaveBeenCalled()
    }
    expect(body.asks.length).toBeGreaterThan(0)
  })

  it('is a message Slack will accept: valid blocks, at most fifty, valid cards', async () => {
    const body = await dryRun()
    expectValidSlackBlocks(body.blocks)
    expect(body.blocks.length).toBeLessThanOrEqual(50)
    expect(body.attachments).toHaveLength(6)
    for (const attachment of body.attachments) expectValidSlackBlocks(attachment.blocks)
  })

  it('reads the week through the pinned outreach client with drafts and plan records excluded', async () => {
    await dryRun()
    const [query, params] = mocks.outreach.fetch.mock.calls[0]
    expect(query).toContain('!(_id in path("drafts.**"))')
    expect(query).toContain('string::startsWith(coalesce(sourceKey, ""), $planPrefix)')
    expect(query).toContain('"askHistory": askHistory[]{ slackUserId, at, week, kind }')
    expect(params).toMatchObject({
      planPrefix: 'weekly-plan/',
      weekStart: '2026-09-21T00:00:00.000Z',
      weekEnd: '2026-09-28T00:00:00.000Z',
      lastWeekStart: '2026-09-14T00:00:00.000Z',
    })
  })
})

// ── Asks ────────────────────────────────────────────────────────────────────

describe('asks', () => {
  it('asks named people — never the full, never a decision, never someone who passed', async () => {
    const body = await dryRun()
    expect(body.asks).toEqual([
      { taskId: 'op-call-mgb', name: 'Juhan', slackUserId: 'UJUHAN', reason: 'suggested' },
      { taskId: 'op-post', name: 'Shirley', slackUserId: 'USHIRLEY', reason: 'open' },
      { taskId: 'op-passed', name: 'Juhan', slackUserId: 'UJUHAN', reason: 'open' },
    ])
    // Eric's week is full; the decision is a principal's; Shirley said no to op-passed.
    expect(body.asks.some((ask) => ask.slackUserId === 'UERIC')).toBe(false)
    expect(body.asks.some((ask) => ask.taskId === 'op-decision')).toBe(false)
    expect(body.asks.some((ask) => ask.taskId === 'op-passed' && ask.slackUserId === 'USHIRLEY')).toBe(false)
  })

  it('puts the asks in TOP-LEVEL blocks right under the week line, and their mentions in the text', async () => {
    const body = await dryRun()
    expect(body.blocks[0].type).toBe('header')
    expect(body.blocks[1].type).toBe('context')
    const ask = body.blocks.findIndex((block) => sectionText(block).startsWith('*Could you take these?*'))
    const firstDivider = body.blocks.findIndex((block) => block.type === 'divider')
    expect(ask).toBeGreaterThan(1)
    expect(ask).toBeLessThanOrEqual(4)
    expect(ask).toBeLessThan(firstDivider)
    expect(sectionText(body.blocks[ask])).toContain('<@UJUHAN> could you take this one? (~30m) The plan had you in mind.')
    // Slack builds the notification from `text` — the only place a phone looks.
    expect(body.text).toContain('<@UJUHAN> <@USHIRLEY> — could you take a task each?')
    // No capacity claims about colleagues.
    expect(json(body.blocks)).not.toMatch(/free time|most time|capacity/i)
  })

  it('shows an asked task as still Unclaimed, with who was asked as plain text', async () => {
    const body = await dryRun()
    const card = body.attachments.find((attachment) => json(attachment).includes('op-call-mgb'))!
    expect(json(card)).toContain('*Unclaimed*\\n_asked: Juhan_')
    expect(json(card)).not.toContain('Taken by')
  })

  it('mentions an owner by the roster’s id, not the stale one stamped on the task', async () => {
    const body = await dryRun()
    const card = json(body.attachments.find((attachment) => json(attachment).includes('op-eric')))
    expect(card).toContain('<@UERIC>')
    expect(card).not.toContain('USTALE')
  })

  it('offers a task two people were asked about as "drop it?", redrawable in place', async () => {
    const body = await dryRun()
    expect(body.exhausted).toEqual(['op-price'])
    const heading = indexOfText(body.blocks, 'Nobody has taken these after two asks')
    expect(heading).toBeGreaterThan(0)
    const line = body.blocks.find((block) => block.block_id === checkInTaskBlockId('op-price'))!
    // Record text escaped.
    expect(sectionText(line)).toContain('Price bands &lt;5% &amp; co')
    expect(line.accessory.action_id).toBe(MARQUETA_ACTION.taskDrop)
    expect(decodeActionValue(line.accessory.value)).toEqual({ taskId: 'op-price', ownerName: '', status: 'queued' })
    // It is not asked of a third person.
    expect(body.asks.some((ask) => ask.taskId === 'op-price')).toBe(false)
  })

  it('lists an exhausted task in progress without a Drop button the board would refuse', async () => {
    store.data = digestData({
      operations: [{ _id: 'op-live', title: 'Half-done thing', kind: 'outreach', status: 'working', askHistory: askedBefore('UJUHAN', 'USHIRLEY') }],
    })
    const body = await dryRun()
    const line = body.blocks.find((block) => block.block_id === checkInTaskBlockId('op-live'))!
    expect(line).toBeTruthy()
    expect(line.accessory).toBeUndefined()
  })
})

// ── The rest of the message ─────────────────────────────────────────────────

describe('what else the digest says', () => {
  it('opens with last week: tasks done and outreach logged', async () => {
    const body = await dryRun()
    const line = body.blocks[2]
    expect(line.type).toBe('context')
    expect(line.elements[0].text).toBe('3 tasks done last week · Outreach: 1 touch (1 person) · 1 reply.')
  })

  it('names posts going out this week with no draft, escaped', async () => {
    const body = await dryRun()
    expect(json(body.blocks)).toContain('2 posts go out this week with no draft yet: LinkedIn: pilots &lt;5% · Newsletter')
    const [query, params] = mocks.calendar.fetch.mock.calls[0]
    expect(query).toContain('status in ["idea", "drafting"]')
    expect(query).toContain('!(_id in path("drafts.**"))')
    expect(params).toEqual({ from: NOW.toISOString(), to: '2026-09-28T13:00:00.000Z' })
  })

  it('says nothing about posts when every one is drafted', async () => {
    mocks.calendar.fetch.mockResolvedValue([])
    expect(json((await dryRun()).blocks)).not.toContain('no draft yet')
  })

  it('gives each call-sheet organisation a Prep button for its first contact', async () => {
    const body = await dryRun()
    const entry = body.blocks.find((block) => sectionText(block).includes('*Acme Health*'))!
    expect(entry.accessory.action_id).toBe(MARQUETA_ACTION.prepCall)
    expect(entry.accessory.text.text).toBe('Prep this call')
    expect(decodeContactRef(entry.accessory.value)).toMatchObject({ contactId: 'c-acme-1', organization: 'Acme Health' })
  })

  it('shows at most three follow-ups, each with Prep and Log, then counts the rest', async () => {
    const body = await dryRun()
    expect(body.followUpCount).toBe(5)
    const lines = body.blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => sectionText(block).startsWith('*Follow up with'))
    expect(lines).toHaveLength(3)
    for (const { index } of lines) {
      const actions = body.blocks[index + 1]
      expect(actions.type).toBe('actions')
      expect(actions.elements.map((element: Block) => element.action_id)).toEqual([
        MARQUETA_ACTION.prepCall,
        MARQUETA_ACTION.logCall,
      ])
    }
    // Overdue first: Jane's follow-up was due last Friday.
    expect(sectionText(lines[0].block)).toContain('Jane Doe (MGB)')
    expect(json(body.blocks)).toContain('+2 more follow-ups due — ask <@UBOT> `my calls`')
  })

  it('never puts a contact’s email or phone number in the channel', async () => {
    const body = await dryRun()
    const everything = json({ blocks: body.blocks, attachments: body.attachments, text: body.text })
    for (const detail of ['jane@mgb.org', 'sam.rivera@acme.org', 'pat@acme.example', '617-555-0123', 'bo@y.org']) {
      expect(everything).not.toContain(detail)
    }
  })

  it('asks about money and direction in one card when both are due', async () => {
    const text = json((await dryRun()).blocks)
    expect(text.match(/Money and direction/g)).toHaveLength(1)
    expect(text).toContain(MARQUETA_ACTION.strategyConfirm)
    expect(text).toContain(MARKETING_ACTION.runwayConfirm)
  })

  it('still asks about the runway when the strategy read fails', async () => {
    mocks.loadStrategySnapshot.mockRejectedValue(new Error('outreach read timed out'))
    const body = await dryRun()
    const text = json(body.blocks)
    expect(text).toContain('*Runway*')
    expect(text).not.toContain('Money and direction')
    // Without the call log there is no pulse to report — the line says only what it knows.
    expect(body.blocks[2].elements[0].text).toBe('3 tasks done last week')
    expectValidSlackBlocks(body.blocks)
  })

  it('stays inside fifty blocks on a heavy week, and keeps the asks', async () => {
    const away = [{ ownerName: 'Dana', slackUserId: 'UDANA', status: 'away', from: '2026-09-01', until: '2026-09-30' }]
    const operations = [
      { _id: 'op-fresh', title: 'Call the new lead', kind: 'outreach', priority: 'urgent', status: 'queued', estimatedMinutes: 15 },
      ...Array.from({ length: 7 }, (_, i) => ({
        _id: `op-stale-${i}`,
        title: `Unwanted <task> ${i} ${'x'.repeat(400)}`,
        kind: 'outreach',
        priority: 'urgent',
        status: 'queued',
        askHistory: askedBefore('UJUHAN', 'USHIRLEY'),
      })),
      ...Array.from({ length: 15 }, (_, i) => ({ _id: `op-dana-${i}`, title: `Dana's task ${i}`, kind: 'content', status: 'queued', ownerName: 'Dana' })),
      ...Array.from({ length: 6 }, (_, i) => ({ _id: `op-anon-${i}`, title: `Unmapped ${i}`, kind: 'content', status: 'queued', ownerName: `Person ${i}` })),
    ]
    const followUpContacts = Array.from({ length: 30 }, (_, i) => ({
      _id: `c-many-${i}`,
      name: `Person ${i}`,
      organization: `Org ${i}`,
      owner: 'Juhan',
      status: 'contacted',
      warmth: 'warm',
      followUpAt: '2026-09-22T14:00:00Z',
      interactions: [],
    }))
    store.data = digestData({ operations, availability: [...AVAILABILITY, ...away], followUpContacts, owned: [] })
    mocks.ideasNeedingReview.mockResolvedValue([{ _id: 'i1', title: 'Merch <for> Town Day' }])
    const body = await dryRun({
      planRecorded: false,
      domainNotes: ['*goinvo.com expires in 5 day(s)* (1 Oct). Renew <now> & check the card.'],
    })
    expectValidSlackBlocks(body.blocks)
    expect(body.blocks.length).toBeLessThanOrEqual(50)
    expect(json(body.blocks)).toContain('Nobody has taken these after two asks')
    expect(json(body.blocks)).toContain('(+4 more on the plan)')
    expect(body.blocks.some((block) => sectionText(block).startsWith('*Could you take these?*'))).toBe(true)
    expect(body.text).toContain('could you take a task?')
    expect(json(body.blocks)).toContain('more tasks belonging to people who are away')
    expect(json(body.blocks)).toContain('+27 more follow-ups due')
    expect(json(body.blocks)).toContain('One-time setup')
    expect(json(body.blocks)).toContain('Renew &lt;now&gt; &amp; check the card.')
    expect(json(body.blocks)).not.toContain('<task>')
  })
})

// ── Posting for real ────────────────────────────────────────────────────────

describe('posting', () => {
  it('posts once to her own room, as Marqueta, and only then records who was asked', async () => {
    const response = await POST(digestRequest('', { planRecorded: true }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ posted: true, channel: CHANNEL, week: WEEK, asksRecorded: 3 })

    expect(mocks.postSlackMessage).toHaveBeenCalledTimes(1)
    const posted = mocks.postSlackMessage.mock.calls[0][0]
    expect(posted).toMatchObject({ channel: CHANNEL, username: 'Marqueta', unfurl: false })
    expect(posted.text).toContain('<@UJUHAN> <@USHIRLEY> — could you take a task each?')
    expectValidSlackBlocks(posted.blocks)
    expect(posted.attachments).toHaveLength(6)

    expect(taskPatches().map((record) => record.id)).toEqual(['op-call-mgb', 'op-post', 'op-passed'])
    const [first] = taskPatches()
    expect(first.ops[0]).toEqual(['setIfMissing', { askHistory: [] }])
    expect(first.ops[1][0]).toBe('insert')
    expect(first.ops[1][1]).toBe('after')
    expect(first.ops[1][2]).toBe('askHistory[-1]')
    const [entry] = first.ops[1][3] as Block[]
    // Stamped with the week it was posted in: that is what makes a re-run harmless.
    expect(entry).toMatchObject({ slackUserId: 'UJUHAN', at: NOW.toISOString(), week: WEEK, kind: 'asked' })
    expect(entry._key).toMatch(/^ask-[a-z0-9]+$/)

    // Claimed first, posted second, remembered third — and the week is marked
    // posted only once its asks are on record.
    const postedAt = mocks.postSlackMessage.mock.invocationCallOrder[0]
    const order = (record: PatchRecord) => mocks.patch.mock.invocationCallOrder[mocks.patches.indexOf(record)]
    const [claim, run] = mocks.patches.filter((record) => record.id === DIGEST_HEARTBEAT_DOC_ID)
    expect(claim.ops).toEqual([
      ['set', { claimedWeek: WEEK, claimedAt: NOW.toISOString() }],
      ['ifRevisionId', 'r0'],
    ])
    expect(order(claim)).toBeLessThan(postedAt)
    expect(taskPatches().every((record) => order(record) > postedAt)).toBe(true)
    expect(taskPatches().every((record) => order(record) < order(run))).toBe(true)
    expect(store.heartbeats.get(DIGEST_HEARTBEAT_DOC_ID)).toMatchObject({ postedWeek: WEEK, postedTs: '1790000000.000100' })
  })

  it('records nothing when Slack refuses the message, and gives the week back', async () => {
    mocks.postSlackMessage.mockResolvedValue(null)
    const body = await (await POST(digestRequest())).json()
    expect(body.posted).toBe(false)
    expect(body.hint).toMatch(/invited/)
    expect(body.asksRecorded).toBe(0)
    expect(taskPatches()).toHaveLength(0)
    const record = store.heartbeats.get(DIGEST_HEARTBEAT_DOC_ID)!
    expect(record.postedWeek).toBeUndefined()
    expect(record.claimedWeek).toBeUndefined()

    // So the retry posts without force.
    mocks.postSlackMessage.mockResolvedValue({ channel: CHANNEL, ts: '2.2' })
    expect(await (await POST(digestRequest())).json()).toMatchObject({ posted: true })
  })

  it('records nothing when posting throws', async () => {
    mocks.postSlackMessage.mockRejectedValue(new Error('socket hang up'))
    const body = await (await POST(digestRequest())).json()
    expect(body.posted).toBe(false)
    expect(taskPatches()).toHaveLength(0)
  })

  it('reports how many asks it recorded when one bookkeeping write fails', async () => {
    mocks.commit.mockImplementation(async (record: PatchRecord) => {
      if (record.id === 'op-post') throw new Error('Document has been modified')
      return commitRecord(record)
    })
    const body = await (await POST(digestRequest())).json()
    expect(body.posted).toBe(true)
    expect(body.asksRecorded).toBe(2)
  })

  it('never falls back to the website-chat channel', async () => {
    delete process.env.SLACK_MARKETING_CHANNEL_ID
    const response = await POST(digestRequest())
    expect(response.status).toBe(503)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.patch).not.toHaveBeenCalled()
  })

  it('fails closed without Sanity', async () => {
    mocks.isOutreachClientConfigured.mockReturnValue(false)
    const response = await POST(digestRequest('?dryRun=1'))
    expect(response.status).toBe(503)
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
  })
})

// ── Twice in one week ───────────────────────────────────────────────────────
//
// The reviewer's scenario: two runs on one Monday used to ask a DIFFERENT
// person about the same task (the second read the first one's ask as history),
// and the next week the task came back "nobody has taken these after two asks"
// after one real ask. These feed run 1's recorded asks into run 2 — the
// fixture used to be fed to both runs unchanged, which hid the bug.

describe('a second digest in the same week', () => {
  const runOnce = async (query = '') => (await POST(digestRequest(query))).json()

  it('stands down when the week is already posted: nothing posted, nobody asked, 200', async () => {
    await runOnce()
    store.data = digestData({ operations: withRecordedAsks(OPERATIONS) })
    mocks.postSlackMessage.mockClear()
    mocks.patches.length = 0

    const response = await POST(digestRequest())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ posted: false, skipped: true, skipReason: 'alreadyPosted', week: WEEK })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(taskPatches()).toHaveLength(0)
  })

  it('forced, asks the SAME people, records nothing new, and the task is not exhausted next week', async () => {
    const first = await runOnce()
    expect(first.asks).toEqual([
      { taskId: 'op-call-mgb', name: 'Juhan', slackUserId: 'UJUHAN', reason: 'suggested' },
      { taskId: 'op-post', name: 'Shirley', slackUserId: 'USHIRLEY', reason: 'open' },
      { taskId: 'op-passed', name: 'Juhan', slackUserId: 'UJUHAN', reason: 'open' },
    ])
    const afterRunOne = withRecordedAsks(OPERATIONS)
    store.data = digestData({ operations: afterRunOne })
    mocks.patches.length = 0

    const second = await runOnce('?force=1')
    expect(second).toMatchObject({ posted: true, asksRecorded: 0 })
    expect(second.asks).toEqual(first.asks)
    expect(second.repeatedAsks).toEqual(['op-call-mgb', 'op-post', 'op-passed'])
    expect(taskPatches()).toHaveLength(0)
    // Same asks, same notification.
    expect(mocks.postSlackMessage.mock.calls[1][0].text).toBe(mocks.postSlackMessage.mock.calls[0][0].text)

    // Next Monday: one person was asked about op-call-mgb and op-post, so
    // neither is "drop it?" (the bug made both look asked twice). op-passed
    // really has two answers — Shirley passed, and Juhan was asked.
    vi.setSystemTime(new Date('2026-09-28T13:00:00Z'))
    const nextWeek = await dryRun()
    expect(nextWeek.exhausted).toEqual(['op-price', 'op-passed'])
    expect(nextWeek.asks.find((ask) => ask.taskId === 'op-post')).toMatchObject({ slackUserId: 'UJUHAN' })
    // Never re-asked: Juhan was asked about op-call-mgb last week.
    expect(nextWeek.asks.some((ask) => ask.taskId === 'op-call-mgb' && ask.slackUserId === 'UJUHAN')).toBe(false)
  })

  it('of two runs racing for the week, the one that loses the claim posts nothing', async () => {
    // Another run takes the claim between this run's read and its write.
    mocks.commit.mockImplementation(async (record: PatchRecord) => {
      if (record.id === DIGEST_HEARTBEAT_DOC_ID && record.ops.some((op) => op[0] === 'ifRevisionId')) {
        store.heartbeats.get(DIGEST_HEARTBEAT_DOC_ID)!._rev = 'someone-else'
      }
      return commitRecord(record)
    })
    const body = await runOnce()
    expect(body).toMatchObject({ posted: false, skipped: true, skipReason: 'claimed' })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(taskPatches()).toHaveLength(0)
  })

  it('never overrides a claim a run is still posting under, even with force', async () => {
    store.heartbeats.set(DIGEST_HEARTBEAT_DOC_ID, {
      _id: DIGEST_HEARTBEAT_DOC_ID,
      _rev: 'r5',
      claimedWeek: WEEK,
      claimedAt: new Date(NOW.getTime() - 60_000).toISOString(),
    })
    expect(await runOnce('?force=1')).toMatchObject({ posted: false, skipped: true, skipReason: 'claimed' })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('reads the week out of the ask history, not just the people', () => {
    const history = [
      { slackUserId: 'UERIC', week: LAST_WEEK, kind: 'asked' },
      { slackUserId: 'UJUHAN', week: WEEK, kind: 'asked' },
      { slackUserId: 'not-an-id', week: WEEK, kind: 'asked' },
      { slackUserId: 'UERIC' },
    ]
    expect(readAskHistory(history, WEEK)).toEqual({ answeredIds: ['UERIC', 'UJUHAN'], askedThisWeek: 'UJUHAN' })
    // Asked this week and then passed: not shown the same ask again.
    const passed = [...history, { slackUserId: 'UJUHAN', week: WEEK, kind: 'passed' }]
    expect(readAskHistory(passed, WEEK)).toEqual({ answeredIds: ['UERIC', 'UJUHAN'] })
    // Legacy entries (no week, no kind) are asks from an earlier week.
    expect(readAskHistory([{ slackUserId: 'UERIC' }], WEEK)).toEqual({ answeredIds: ['UERIC'] })
    expect(askHistoryEntry({ taskId: 't', slackUserId: 'U1', at: 'x', week: WEEK, kind: 'passed' })._key).toMatch(/^pass-/)
  })
})

// ── Who is away ─────────────────────────────────────────────────────────────

describe('asks and absences', () => {
  // "I'm away this week" files the record under Slack's display name, beside
  // the linked record the roster knows her by.
  const shirleyAway = { ownerName: 'Shirley Wu', slackUserId: 'USHIRLEY', status: 'away', from: '2026-09-21', until: '2026-09-27' }

  it('never asks someone away, matched by Slack id when the record carries their display name', async () => {
    store.data = digestData({
      availability: [...AVAILABILITY, shirleyAway],
      operations: [
        ...OPERATIONS,
        { _id: 'op-shirley', title: 'Shirley’s draft', kind: 'content', priority: 'normal', status: 'queued', ownerName: 'Shirley' },
      ],
    })
    const body = await dryRun()
    expect(body.asks.some((ask) => ask.slackUserId === 'USHIRLEY')).toBe(false)
    expect(body.asks.length).toBeGreaterThan(0)
    // Her own task is surfaced for cover, under the board's name.
    expect(json(body.blocks)).toContain('*Shirley is away* — “Shirley’s draft” needs someone.')
  })
})

// ── "Not me this week" ──────────────────────────────────────────────────────

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

describe('claimMarketingTask', () => {
  const TASK: Record<string, unknown> = { _id: 'op-1', _rev: 'rev1', title: 'Call MGB', ownerName: '', status: 'queued', kind: 'outreach', activity: [] }
  const claim = async (task: Record<string, unknown> | null, person = { personName: 'Juhan Sonin', slackUserId: 'UJUHAN' }) => {
    store.tasks = [task]
    const result = await claimMarketingTask({ taskId: 'op-1', ...person })
    return { result, record: taskPatches().at(-1) }
  }
  const setOf = (record: PatchRecord | undefined) => (record?.ops.find((op) => op[0] === 'set')?.[1] || {}) as Record<string, unknown>
  const unsetOf = (record: PatchRecord | undefined) => (record?.ops.find((op) => op[0] === 'unset')?.[1] || []) as string[]

  // Reviewer finding: the card wrote Slack's display name as the owner, which
  // split Juhan into "Juhan" and "Juhan Sonin" — two loads, a mention that
  // never resolved, and an identity prompt that kept coming back.
  it('writes the BOARD name, with the revision it read', async () => {
    const { result, record } = await claim(TASK)
    expect(result.ok).toBe(true)
    expect(setOf(record)).toMatchObject({ ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN', lastOutcome: 'Taken in Slack by Juhan' })
    expect(record?.ops.find((op) => op[0] === 'ifRevisionId')?.[1]).toBe('rev1')
  })

  it('moves a passed-on task back to queued and clears the stale question', async () => {
    const { record } = await claim({ ...TASK, status: 'needsHuman', humanQuestion: 'Eric passed on this — who should pick it up?' })
    expect(setOf(record).status).toBe('queued')
    expect(unsetOf(record)).toContain('humanQuestion')
  })

  it('keeps a real decision a decision', async () => {
    const { record } = await claim({ ...TASK, kind: 'decision', status: 'needsHuman', humanQuestion: 'Which offer leads?' })
    expect(setOf(record).status).toBe('needsHuman')
    expect(unsetOf(record)).not.toContain('humanQuestion')
  })

  it('refuses a done or dropped task', async () => {
    for (const status of ['done', 'dismissed']) {
      const { result } = await claim({ ...TASK, status })
      expect(result).toMatchObject({ ok: false, message: expect.stringMatching(/closed/) })
    }
    expect(taskPatches()).toHaveLength(0)
  })

  it('"Take it over" puts the presser’s own name on a colleague’s task and says whose it was', async () => {
    const { result, record } = await claim({ ...TASK, ownerName: 'Eric', ownerSlackUserId: 'UERIC' })
    expect(result.ok).toBe(true)
    expect(setOf(record)).toMatchObject({ ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN', lastOutcome: 'Taken over from Eric in Slack by Juhan' })
    expect((setOf(record).activity as Block[]).at(-1)).toMatchObject({ action: 'Taken over in Slack', outcome: 'By Juhan, from Eric' })
  })

  it('refuses a presser it cannot name, and a roster it cannot read, writing nothing', async () => {
    const unknown = await claim(TASK, { personName: '', slackUserId: 'UNOBODY' })
    expect(unknown.result.ok).toBe(false)
    store.availability = new Error('outreach down')
    const unreadable = await claim(TASK)
    expect(unreadable.result).toMatchObject({ ok: false, message: expect.stringMatching(/team list/) })
    expect(taskPatches()).toHaveLength(0)
  })
})

// ── The tick's record of the digest ─────────────────────────────────────────

describe('digestHeartbeatStep', () => {
  it('records a stand-down as ok and inert, so a duplicate tick does not report a failed digest', () => {
    const skipped = digestHeartbeatStep(
      { ok: true, status: 200, body: { posted: false, skipped: true, skipReason: 'alreadyPosted', detail: 'The 2026-W39 digest was already posted.', taskCount: 6 } },
      { dryRun: false, week: WEEK },
    )
    expect(skipped).toEqual({ name: 'digest', ok: true, count: 0, detail: `digest stood down for ${WEEK}: The 2026-W39 digest was already posted.` })
  })

  it('keeps posted and failed digests as they were', () => {
    expect(digestHeartbeatStep({ ok: true, status: 200, body: { posted: true, taskCount: 6 } }, { dryRun: false, week: WEEK })).toEqual({
      name: 'digest',
      ok: true,
      count: 6,
      detail: 'digest posted with 6 task(s).',
    })
    expect(digestHeartbeatStep({ ok: true, status: 200, body: { posted: false } }, { dryRun: false, week: WEEK })).toMatchObject({ ok: false })
    expect(digestHeartbeatStep({ ok: false, status: 503, body: { error: 'Could not claim' } }, { dryRun: false, week: WEEK })).toMatchObject({
      ok: false,
      detail: 'digest returned 503: Could not claim',
    })
  })
})

// ── The builders the route composes ─────────────────────────────────────────

describe('digest builders', () => {
  const base = { theme: 'This week in marketing', weekStart: '2026-09-21', weekEnd: '2026-09-27', plannedMinutes: 60, budgetMinutes: 480, tasks: [] }

  it('places the lead blocks directly under the week line', () => {
    const lead = { type: 'context', elements: [{ type: 'mrkdwn', text: 'lead line' }] }
    const blocks = buildWeeklyDigestBlocks({ ...base, lead: [lead] })
    expect(blocks[2]).toBe(lead)
    expectValidSlackBlocks(blocks)
  })

  it('preps by organisation when the sheet has no contact id, and escapes the entry', () => {
    const blocks = buildWeeklyDigestBlocks({
      ...base,
      callSheet: [
        {
          organization: 'AT&T <Health>',
          contacts: [{ name: 'A' }],
          signal: 'Cut costs <5%',
          quote: 'q',
          sourceUrl: 'https://example.org/a|b>c',
          opening: 'o',
          offer: null,
          context: '',
        },
      ],
    })
    expectValidSlackBlocks(blocks)
    const entry = blocks.find((block) => sectionText(block).includes('AT&amp;T &lt;Health&gt;'))!
    expect(sectionText(entry)).toContain('Cut costs &lt;5%')
    expect(sectionText(entry)).not.toContain('a|b>c')
    expect(decodeContactRef(entry.accessory.value)).toMatchObject({ contactId: '', organization: 'AT&T <Health>' })
  })

  it('renders follow-ups only when there are some, capped at three', () => {
    expect(json(buildWeeklyDigestBlocks(base))).not.toContain('Follow-ups due')
    const followUps = Array.from({ length: 5 }, (_, i) => ({ label: `*Follow up with P${i}*`, detail: 'due Tue 22 Sep', contactRef: `{"c":"c${i}","o":"O"}` }))
    const blocks = buildWeeklyDigestBlocks({ ...base, followUps, followUpsMore: '+2 more follow-ups due' })
    expectValidSlackBlocks(blocks)
    expect(blocks.filter((block) => sectionText(block).startsWith('*Follow up with'))).toHaveLength(3)
    expect(json(blocks)).toContain('+2 more follow-ups due')
  })

  it('drops a follow-up’s buttons rather than send a value Slack would refuse', () => {
    const blocks = buildWeeklyDigestBlocks({
      ...base,
      followUps: [{ label: '*Follow up with P*', detail: 'd', contactRef: 'x'.repeat(2500) }],
    })
    expectValidSlackBlocks(blocks)
    expect(json(blocks)).not.toContain(MARQUETA_ACTION.logCall)
  })

  it('escapes away notices and counts the ones left out', () => {
    const blocks = buildWeeklyDigestBlocks({
      ...base,
      awayNotices: [{ awayOwner: 'Dana <!here>', taskTitle: 'Pilot <5%', candidates: ['Jon & Co'] }],
      awayNoticesMore: 4,
    })
    expectValidSlackBlocks(blocks)
    const text = json(blocks)
    expect(text).toContain('Dana &lt;!here&gt; is away')
    expect(text).toContain('Pilot &lt;5%')
    expect(text).toContain('Free this week: Jon &amp; Co')
    expect(text).toContain('…and 4 more tasks belonging to people who are away')
  })

  it('escapes the runway card, which can now carry a won contact’s name', () => {
    const blocks = buildRunwayBlocks({
      summary: '4.5 months <certain>',
      checkIn: { due: true, urgent: false, reason: 'AT&T was marked won on 20 Sep 2026 — did it extend the runway?', question: 'The date still says 4.5 months.' },
      disagreement: 'Posture <b>',
    })
    expectValidSlackBlocks(blocks)
    const text = sectionText(blocks[1])
    expect(text).toContain('AT&amp;T was marked won')
    expect(text).toContain('4.5 months &lt;certain&gt;')
    expect(text).toContain('_Posture &lt;b&gt;_')
  })

  it('shows who was asked on the card, and lets ownership win', () => {
    const asked = buildTaskAttachment({ _id: 'op1', title: 'Call <MGB>', askedName: 'Juhan <x>', suggestedOwner: 'Eric' })
    expectValidSlackBlocks(asked.blocks)
    expect(json(asked)).toContain('*Unclaimed*\\n_asked: Juhan &lt;x&gt;_')
    expect(json(asked)).not.toContain('suggested:')
    expect(asked.blocks[0].text.text).toBe('*Call &lt;MGB&gt;*')

    const owned = buildTaskAttachment({ _id: 'op1', title: 'Call MGB', askedName: 'Juhan', ownerName: 'Eric', slackUserId: 'UERIC' })
    expect(json(owned)).toContain('*Taken by*\\n<@UERIC>')
    expect(json(owned)).not.toContain('asked:')
  })
})

// ── plan-week: the Monday plan holds time back for follow-ups ─────────────────

describe('plan-week reserves time for follow-ups', () => {
  // Four hours, and one 200-minute task due this week: it fits an empty week,
  // and must not fit once three follow-ups have taken their 45 minutes.
  const BIG_TASK = {
    _id: 'op-big',
    _type: 'marketingOperation',
    title: 'Write the pilot one-pager',
    status: 'queued',
    priority: 'normal',
    kind: 'content',
    origin: 'manual',
    autonomy: 'safeInternal',
    targetView: 'thisWeek',
    sourceKey: 'manual/op-big',
    nextAction: 'Draft it',
    estimatedMinutes: 200,
    dueAt: '2026-09-24T14:00:00Z',
  }
  const dueContacts = FOLLOW_UP_CONTACTS.slice(0, 3)

  const planRequest = (method: 'GET' | 'POST', query = '') =>
    new NextRequest(`https://www.goinvo.com/api/marketing/plan-week${query}`, { method, headers: { authorization: 'Bearer key' } })

  beforeEach(() => {
    mocks.planWeek.fetch.mockImplementation(async (query: string) =>
      query.includes('"marketingOperation"') ? [BIG_TASK] : null,
    )
    mocks.operationsWrite.fetch.mockResolvedValue({ weeklyMarketingHours: 4 })
    mocks.outreach.fetch.mockResolvedValue(dueContacts)
  })

  it('takes the follow-ups off the budget before the fill, and says what the time is for', async () => {
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.budgetMinutes).toBe(240)
    expect(body.followUpsDue).toBe(3)
    expect(body.reserved).toEqual({ minutes: 45, label: 'Follow-ups: 3 (~45m reserved)' })
    expect(body.items).toEqual([])
    expect(body.deferred).toEqual([expect.objectContaining({ id: 'op-big', reason: 'over budget' })])
    expect(body.plannedMinutes).toBe(45)
    // GET is the Studio's read: it never writes the week.
    expect(mocks.planWeek.createIfNotExists).not.toHaveBeenCalled()
  })

  it('reads the follow-ups through the pinned outreach client, drafts excluded, no contact details', async () => {
    await PLAN_WEEK_GET(planRequest('GET'))
    const [query] = mocks.outreach.fetch.mock.calls[0]
    expect(query).toContain('_type == "marketingContact"')
    expect(query).toContain('!(_id in path("drafts.**"))')
    expect(query).not.toMatch(/email|phone|name/)
  })

  it('plans the week without a reservation when nobody is owed a call', async () => {
    mocks.outreach.fetch.mockResolvedValue([])
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.followUpsDue).toBe(0)
    expect(body.reserved).toBeNull()
    expect(body.items.map((item: Block) => item.id)).toEqual(['op-big'])
  })

  it('still plans when the contacts cannot be read, and says the count is unknown rather than zero', async () => {
    mocks.outreach.fetch.mockRejectedValue(new Error('outreach unavailable'))
    const response = await PLAN_WEEK_GET(planRequest('GET'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.followUpsDue).toBeNull()
    expect(body.reserved).toBeNull()
    expect(body.items.map((item: Block) => item.id)).toEqual(['op-big'])
  })

  it('records the reservation on the stored week', async () => {
    const response = await PLAN_WEEK_POST(planRequest('POST'))
    expect(response.status).toBe(200)
    const [document] = mocks.planWeek.createIfNotExists.mock.calls[0]
    expect(document.summary).toContain('Follow-ups: 3 (~45m reserved).')
    const set = mocks.patches.at(-1)!.ops.find((op) => op[0] === 'set')![1] as Record<string, unknown>
    expect(set.summary).toContain('Follow-ups: 3 (~45m reserved).')
  })
})
