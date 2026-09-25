/**
 * The Monday plan, against a mocked Sanity and a mocked Slack.
 *
 * What these pin is what the route adds around the pure builders: asks are
 * made of the right people and put where a notification can see them; the
 * record of an ask is written only after it really reached the channel; a
 * preview writes nothing at all; the message never exceeds Slack's fifty
 * blocks; no contact detail reaches the channel; the digest never falls back
 * to the website-chat channel — and, since the plan moved into blocks, that it
 * reads top-down in the order people act, on a phone.
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
    /** The tick's own client (it pins the outreach dataset with createClient). */
    tickClient: client(),
    outreach: client(),
    calendar: client(),
    operationsWrite: client(),
    postSlackMessage: vi.fn(),
    loadStrategySnapshot: vi.fn(),
    readRunway: vi.fn(),
    ideasNeedingReview: vi.fn(),
    checkWatchedDomains: vi.fn(async () => []),
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
  getSlackBotUserId: vi.fn(),
  getSlackUserDisplayName: vi.fn(),
}))
vi.mock('@/lib/marketing/strategyCheck.server', () => ({ loadStrategySnapshot: mocks.loadStrategySnapshot }))
vi.mock('@/lib/marketing/runway.server', () => ({ readRunway: mocks.readRunway }))
vi.mock('@/lib/marketing/ideaCapture.server', () => ({ ideasNeedingReview: mocks.ideasNeedingReview }))
vi.mock('@/lib/marketing/domainWatch.server', () => ({ checkWatchedDomains: mocks.checkWatchedDomains }))
vi.mock('@sanity/client', () => ({ createClient: () => mocks.tickClient }))
vi.mock('@/sanity/env', () => ({ apiVersion: '2025-01-01', dataset: 'production', projectId: 'test-project', writeToken: 'test-token' }))

import { POST } from '@/app/api/marketing/slack/digest/route'
import { GET as TICK_GET } from '@/app/api/marketing/tick/route'
import { DIGEST_HEARTBEAT_DOC_ID, digestHeartbeatStep } from '@/lib/marketing/heartbeat'
import { TEAM_AVAILABILITY_QUERY } from '@/lib/marketing/team.server'
import { checkInTaskBlockId, decodeContactRef, MARQUETA_ACTION } from '@/lib/marketing/marquetaActions'
import { LABEL, RETIRED_LABELS } from '@/lib/marketing/marquetaStyle'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { describeRunway, resolveRunwayPosture, runwayCheckIn, type StoredPosture } from '@/lib/marketing/runway'
import { claimMarketingTask } from '@/lib/marketing/slackActions.server'
import { assessDomain } from '@/lib/marketing/domainWatch'
import { askHistoryEntry, decodeActionValue, MARKETING_ACTION, readAskHistory } from '@/lib/marketing/slackDelegation'
import { buildStrategySnapshot, monthWindow } from '@/lib/marketing/strategyCheck'
import { evaluate, parse } from 'groq-js'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Monday 21 Sep 2026, 9am in Boston — when the tick runs. */
const NOW = new Date('2026-09-21T13:00:00Z')
const WEEK = '2026-W39'
const LAST_WEEK = '2026-W38'
const CHANNEL = 'CMARKETINGBOT'
const BASE = 'https://www.goinvo.com'
const json = (value: unknown) => JSON.stringify(value)
const conflict = () => Object.assign(new Error('Document has been modified since the revision given'), { statusCode: 409 })
/** Asked in an earlier week — history, not this week's ask. */
const askedBefore = (...ids: string[]) => ids.map((slackUserId) => ({ slackUserId, week: LAST_WEEK, kind: 'asked' }))

// ── A phone ─────────────────────────────────────────────────────────────────

/**
 * What a teammate sees on a phone, one line per 40 characters: the measure the
 * Monday plan is held to. Mentions become names, links their labels, buttons
 * sit two to a row. Rough on purpose, and the same rough for every message.
 */
function phoneLines(blocks: Block[]): string[] {
  const plain = (text: string) =>
    String(text || '')
      .replace(/<@([UW][A-Z0-9]+)>/g, '@$1')
      .replace(/<(https?:[^|>]+)\|([^>]+)>/g, '$2')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  const wrap = (text: string, width = 40) =>
    plain(text)
      .split('\n')
      .flatMap((paragraph) => {
        const lines: string[] = []
        let line = ''
        for (const word of paragraph.split(' ')) {
          if (`${line} ${word}`.trim().length > width && line) {
            lines.push(line)
            line = word
          } else line = `${line} ${word}`.trim()
        }
        lines.push(line)
        return lines
      })
  const button = (element: Block) => (element.style === 'primary' ? `【${element.text.text}】` : `[${element.text.text}]`)
  const lines: string[] = []
  for (const block of blocks) {
    if (block.type === 'header') lines.push(...wrap(block.text.text, 28))
    else if (block.type === 'divider') lines.push('────')
    else if (block.type === 'context') lines.push(...wrap(block.elements.map((element: Block) => element.text).join(' '), 46))
    else if (block.type === 'section') {
      lines.push(...wrap(block.text.text))
      if (block.accessory) lines.push(block.accessory.text ? button(block.accessory) : '⟨select⟩')
    } else if (block.type === 'actions') {
      for (let index = 0; index < block.elements.length; index += 2) lines.push(block.elements.slice(index, index + 2).map(button).join(' '))
    }
  }
  return lines
}

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
  // Shirley pressed "Not me" on this one.
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

/** The runway and the strategy, as `loadStrategySnapshot` returns them. Both due by default. */
function strategyLoad(now: Date = NOW, stored: StoredPosture = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-20T00:00:00Z' } }, strategyDue = true) {
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
    due: strategyDue
      ? { due: true, reason: 'Nobody has checked the marketing plan against the money yet.' }
      : { due: false, reason: 'Checked on Thu 17 Sep.' },
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

const ENV_KEYS = ['SLACK_BOT_TOKEN', 'SLACK_MARKETING_CHANNEL_ID', 'SLACK_CHANNEL_ID', 'MARKETING_PUBLIC_BASE_URL', 'CRON_SECRET', 'MARKETING_API_KEY', 'MARKETING_TEAM_NAMES'] as const
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}

function digestRequest(query = '', body: Record<string, unknown> = {}) {
  return new NextRequest(`https://www.goinvo.com/api/marketing/slack/digest${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: 'Bearer key' },
    body: JSON.stringify(body),
  })
}

type DryRun = {
  blocks: Block[]
  attachments?: Block[]
  text: string
  asks: Block[]
  exhausted: string[]
  followUpCount: number
  needsOwnerCount: number
  planned: boolean
}

async function dryRun(body: Record<string, unknown> = {}) {
  const response = await POST(digestRequest('?dryRun=1', body))
  expect(response.status).toBe(200)
  return (await response.json()) as DryRun
}

const sectionText = (block: Block | undefined) => String(block?.text?.text || '')
const buttonsOf = (blocks: Block[]) =>
  blocks.flatMap((block) => [...(block.elements || []), ...(block.accessory ? [block.accessory] : [])]).filter((element) => element.type === 'button')
/** The task each card is for, in the order the cards appear. */
const cardIds = (blocks: Block[]) =>
  blocks.filter((block) => String(block.block_id || '').startsWith('mq_task_actions_')).map((block) => String(block.block_id).slice('mq_task_actions_'.length))
const cardFor = (blocks: Block[], taskId: string) => {
  const at = blocks.findIndex((block) => block.block_id === checkInTaskBlockId(taskId))
  return at === -1 ? null : { section: blocks[at], actions: blocks[at + 1] }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  for (const key of ENV_KEYS) saved[key] = process.env[key]
  process.env.SLACK_BOT_TOKEN = 'xoxb-test'
  process.env.SLACK_MARKETING_CHANNEL_ID = CHANNEL
  process.env.SLACK_CHANNEL_ID = 'CWEBSITECHAT'
  process.env.MARKETING_PUBLIC_BASE_URL = BASE

  mocks.patches.length = 0
  mocks.patch.mockClear()
  mocks.commit.mockReset().mockImplementation(commitRecord)
  for (const client of [mocks.outreach, mocks.calendar, mocks.operationsWrite, mocks.tickClient]) {
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
  mocks.loadStrategySnapshot.mockReset().mockResolvedValue(strategyLoad())
  mocks.readRunway.mockReset().mockResolvedValue(strategyLoad().runway)
  mocks.ideasNeedingReview.mockReset().mockResolvedValue([])
  mocks.isOutreachClientConfigured.mockReset().mockReturnValue(true)
  mocks.checkWatchedDomains.mockReset().mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
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

  it('is a message Slack will accept: valid blocks, at most fifty, and no attachments', async () => {
    const body = await dryRun()
    expectValidSlackBlocks(body.blocks)
    expect(body.blocks.length).toBeLessThanOrEqual(50)
    expect(body.attachments ?? []).toHaveLength(0)
  })

  it('reads the week through the pinned outreach client with drafts and plan records excluded, stuck work included', async () => {
    await dryRun()
    const [query, params] = mocks.outreach.fetch.mock.calls[0]
    expect(query).toContain('!(_id in path("drafts.**"))')
    expect(query).toContain('string::startsWith(coalesce(sourceKey, ""), $planPrefix)')
    expect(query).toContain('"askHistory": askHistory[]{ slackUserId, at, week, kind }')
    expect(query).toContain('status in ["queued", "working", "needsHuman", "blocked"]')
    expect(params).toMatchObject({
      planPrefix: 'weekly-plan/',
      plannedIds: [],
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

  it('puts each ask on its task’s card, first under "Needs an owner", and the mentions first in the notification', async () => {
    const body = await dryRun()
    const heading = body.blocks.findIndex((block) => sectionText(block) === '*Needs an owner*')
    expect(heading).toBeGreaterThan(1)
    expect(cardIds(body.blocks).slice(0, 3)).toEqual(['op-call-mgb', 'op-post', 'op-passed'])
    const asked = cardFor(body.blocks, 'op-call-mgb')!
    expect(sectionText(asked.section).split('\n')[1]).toBe('*Urgent* · <@UJUHAN>, could you take this one? · ~30m · the plan had you in mind')
    expect(asked.actions.elements.map((element: Block) => element.text.text)).toEqual([LABEL.TAKE, LABEL.NOT_ME, LABEL.DETAILS])
    expect(asked.actions.elements[0].style).toBe('primary')
    // Slack builds the notification from `text` — the only place a phone looks.
    expect(body.text).toBe('<@UJUHAN> <@USHIRLEY> — could you take a task each? · Monday plan: 4 tasks need an owner, 5 follow-ups due')
    // No capacity claims about colleagues.
    expect(json(body.blocks)).not.toMatch(/free time|most time|capacity/i)
  })

  it('shows an asked task as nobody’s yet, and never as taken', async () => {
    const card = cardFor((await dryRun()).blocks, 'op-call-mgb')!
    expect(json(card)).not.toContain('Taken by')
  })

  it('lists owned work as a roll call, mentioning the roster’s id, not the stale one stamped on the task', async () => {
    const body = await dryRun()
    const text = json(body.blocks)
    expect(text).toContain('Already taken: <@UERIC> 1 — ask `Marqueta, my tasks` for yours')
    expect(text).not.toContain('USTALE')
    // Owned work gets no card on Monday: Thursday is its owner's list.
    expect(cardIds(body.blocks)).not.toContain('op-eric')
  })

  it('offers a task two people were asked about as "still worth doing?", redrawable in place', async () => {
    const body = await dryRun()
    expect(body.exhausted).toEqual(['op-price'])
    const card = cardFor(body.blocks, 'op-price')!
    // Record text escaped.
    expect(sectionText(card.section)).toContain('Price bands &lt;5% &amp; co')
    expect(sectionText(card.section)).toContain('Asked twice, nobody took it — still worth doing?')
    expect(card.actions.elements.map((element: Block) => element.text.text)).toEqual([LABEL.TAKE, LABEL.DROP, LABEL.DETAILS])
    // Nothing green: two people have said no.
    expect(card.actions.elements.some((element: Block) => element.style)).toBe(false)
    const drop = card.actions.elements[1]
    expect(drop.action_id).toBe(MARQUETA_ACTION.taskDrop)
    expect(decodeActionValue(drop.value)).toEqual({ taskId: 'op-price', ownerName: '', status: 'queued' })
    // It is not asked of a third person.
    expect(body.asks.some((ask) => ask.taskId === 'op-price')).toBe(false)
  })

  it('lists an exhausted task in progress without a Drop button the board would refuse', async () => {
    store.data = digestData({
      operations: [{ _id: 'op-live', title: 'Half-done thing', kind: 'outreach', status: 'working', askHistory: askedBefore('UJUHAN', 'USHIRLEY') }],
    })
    const card = cardFor((await dryRun()).blocks, 'op-live')!
    expect(card).toBeTruthy()
    expect(card.actions.elements.map((element: Block) => element.action_id)).not.toContain(MARQUETA_ACTION.taskDrop)
  })

  it('never offers "I’ll take it" on a decision: it gets Answer…', async () => {
    const card = cardFor((await dryRun()).blocks, 'op-decision')!
    expect(card.actions.elements.map((element: Block) => element.text.text)).toEqual([LABEL.ANSWER])
  })
})

// ── The rest of the message ─────────────────────────────────────────────────

describe('what else the digest says', () => {
  it('opens with its name, the week, and last week: tasks done and outreach logged', async () => {
    const body = await dryRun()
    expect(body.blocks[0]).toMatchObject({ type: 'header', text: { text: 'Monday plan' } })
    expect(body.blocks[1].elements[0].text).toBe('Week of Mon 21 Sep · 4h 5m of open work for an 8h week')
    expect(body.blocks[2].elements[0].text).toBe('Last week: 3 tasks done · Outreach: 1 touch (1 person) · 1 reply.')
  })

  // "Outreach this week" owns the follow-ups, counted from now. Counted here
  // as well, to last Monday's window but overdue to 9am today, any follow-up
  // set for this Monday made the line say "1 follow-up due (3 overdue)".
  it('leaves follow-ups out of last week’s line — the Outreach section counts them', async () => {
    const load = strategyLoad()
    const waiting = (id: string, followUpAt: string) => ({ _id: id, name: id, organization: 'X', status: 'contacted', followUpAt, estimatedValue: null, interactions: [] })
    mocks.loadStrategySnapshot.mockResolvedValue({
      ...load,
      contacts: [
        ...load.contacts,
        waiting('c-fri', '2026-09-18T12:00:00.000Z'),
        waiting('c-mon-1', '2026-09-21T12:00:00.000Z'),
        waiting('c-mon-2', '2026-09-21T12:00:00.000Z'),
      ],
    })
    const body = await dryRun()
    expect(body.blocks[2].elements[0].text).toBe('Last week: 3 tasks done · Outreach: 1 touch (1 person) · 1 reply.')
  })

  // The setup offered only names that already owned open work — Juhan and
  // Shirley, in the seeded quarter — and every other way onto the team list
  // was closed to somebody who owned nothing. Only people on it are ever asked.
  it('offers the whole team in the one-time setup, not only the names that own work', async () => {
    delete process.env.MARKETING_TEAM_NAMES
    store.data = digestData({ availability: [AVAILABILITY[0]] })
    const setupOf = (blocks: Block[]) => blocks.find((block) => block.accessory?.action_id === MARKETING_ACTION.linkIdentity)
    const options = (blocks: Block[]) => (setupOf(blocks)?.accessory.options || []).map((option: Block) => option.value)
    // Juhan is linked; Shirley, Eric and Jon are not, whatever they own.
    expect(options((await dryRun()).blocks)).toEqual(['Shirley', 'Eric', 'Jon'])
    // Configurable, and a name is offered once whatever its case.
    process.env.MARKETING_TEAM_NAMES = 'juhan, Dana ,dana'
    expect(options((await dryRun()).blocks)).toEqual(['Dana'])
    // Set empty: the board's own unmapped owners only — none here, so no prompt.
    process.env.MARKETING_TEAM_NAMES = ''
    expect(setupOf((await dryRun()).blocks)).toBeUndefined()
  })

  // An operation created without a date stored `dueAt: ""`. GROQ does not read
  // that as undated: `defined("")` is true and `dateTime("")` is null, so the
  // task fell out of its owner's load (making the busiest person look free to
  // ask) and "" sorted ahead of every real date in the capped board read.
  it('reads a stored "" due date as undated: it counts towards the week, and sorts last', async () => {
    await dryRun()
    const [query, params] = mocks.outreach.fetch.mock.calls.find(([candidate]) => String(candidate).includes('"owned"'))!
    const op = (id: string, dueAt?: string) => ({
      _id: id, _type: 'marketingOperation', title: id, ownerName: 'Eric', status: 'queued', kind: 'content', ...(dueAt === undefined ? {} : { dueAt }),
    })
    const dataset = [op('undated', ''), op('overdue', '2026-09-01T12:00:00.000Z'), op('missing'), op('this-week', '2026-09-24T12:00:00.000Z'), op('later', '2026-11-02T12:00:00.000Z')]
    const result = (await (await evaluate(parse(String(query)), { dataset, params: params as Record<string, unknown> })).get()) as {
      owned: unknown[]
      operations: Array<{ _id: string }>
    }
    // Undated work counts towards this week's load (the later task does not).
    expect(result.owned).toHaveLength(4)
    expect(result.operations.map((operation) => operation._id).slice(0, 3)).toEqual(['overdue', 'this-week', 'later'])
  })

  it('names posts going out this week with no draft, escaped', async () => {
    const body = await dryRun()
    expect(json(body.blocks)).toContain(':warning: 2 posts go out this week with no draft yet: LinkedIn: pilots &lt;5% · Newsletter')
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
    expect(entry.accessory.text.text).toBe(LABEL.PREP)
    expect(decodeContactRef(entry.accessory.value)).toMatchObject({ contactId: 'c-acme-1', organization: 'Acme Health' })
  })

  it('shows at most three follow-ups, each with Prep and Log it…, then counts the rest', async () => {
    const body = await dryRun()
    expect(body.followUpCount).toBe(5)
    const lines = body.blocks
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => sectionText(block).startsWith('*Follow up with'))
    expect(lines).toHaveLength(3)
    for (const { index } of lines) {
      const actions = body.blocks[index + 1]
      expect(actions.type).toBe('actions')
      expect(actions.elements.map((element: Block) => element.action_id)).toEqual([MARQUETA_ACTION.prepCall, MARQUETA_ACTION.logCall])
      expect(actions.elements.map((element: Block) => element.text.text)).toEqual([LABEL.PREP, LABEL.LOG])
    }
    // Overdue first: Jane's follow-up was due last Friday.
    expect(sectionText(lines[0].block)).toContain('Jane Doe (MGB)')
    expect(json(body.blocks)).toContain('+2 more follow-ups due — ask `Marqueta, my calls`')
  })

  it('never puts a contact’s email or phone number in the channel', async () => {
    const body = await dryRun()
    const everything = json({ blocks: body.blocks, text: body.text })
    for (const detail of ['jane@mgb.org', 'sam.rivera@acme.org', 'pat@acme.example', '617-555-0123', 'bo@y.org']) {
      expect(everything).not.toContain(detail)
    }
  })

  it('asks about money one question at a time: the runway first, the strategy next', async () => {
    const body = await dryRun()
    const text = json(body.blocks)
    expect(text.match(/Money and direction/g)).toHaveLength(1)
    expect(text).toContain(MARKETING_ACTION.runwayConfirm)
    expect(text).not.toContain(MARQUETA_ACTION.strategyConfirm)
    expect(text).toContain('Next: whether the plan still fits — I’ll ask once the runway’s confirmed.')
    const money = body.blocks.filter((block) => String(block.block_id || '').startsWith('mq_money'))
    expect(buttonsOf(money).some((button) => button.style)).toBe(false)
  })

  it('asks the strategy when only it is due, and nothing about money when nothing is', async () => {
    mocks.loadStrategySnapshot.mockResolvedValue(strategyLoad(NOW, { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-18T00:00:00Z' } }))
    const strategy = json((await dryRun()).blocks)
    expect(strategy).toContain(MARQUETA_ACTION.strategyConfirm)
    expect(strategy).not.toContain(MARKETING_ACTION.runwayConfirm)

    mocks.loadStrategySnapshot.mockResolvedValue(strategyLoad(NOW, { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-18T00:00:00Z' } }, false))
    expect(json((await dryRun()).blocks)).not.toContain('mq_money')
  })

  it('still asks about the runway when the strategy read fails', async () => {
    mocks.loadStrategySnapshot.mockRejectedValue(new Error('outreach read timed out'))
    const body = await dryRun()
    const text = json(body.blocks)
    expect(text).toContain('Still 3.5 months of certain runway (to 11 Jan 2027), or has that moved?')
    expect(text).not.toContain(MARQUETA_ACTION.strategyConfirm)
    // Without the call log there is no pulse to report — the line says only what it knows.
    expect(body.blocks[2].elements[0].text).toBe('Last week: 3 tasks done')
    expectValidSlackBlocks(body.blocks)
  })

  it('shows stuck work — it used to vanish — with what is in the way', async () => {
    store.data = digestData({
      operations: [
        ...OPERATIONS,
        { _id: 'op-stuck', title: 'Case-study <numbers>', kind: 'content', status: 'blocked', ownerName: 'Shirley', blocker: 'Waiting on the client’s sign-off' },
      ],
    })
    const text = json((await dryRun()).blocks)
    expect(text).toContain(
      `:warning: Stuck: <${BASE}/studio/marketing?view=calendar&task=op-stuck|Case-study <numbers>> (<@USHIRLEY>) — in the way: Waiting on the client’s sign-off`.replace(
        '<numbers>',
        '&lt;numbers&gt;',
      ),
    )
  })

  it('surfaces an away colleague’s work for cover, naming who is free — as names, escaped', async () => {
    store.data = digestData({
      availability: [...AVAILABILITY, { ownerName: 'Dana <x>', slackUserId: 'UDANA', status: 'away', from: '2026-09-01', until: '2026-09-30' }],
      operations: [...OPERATIONS, { _id: 'op-dana', title: 'Dana’s draft', kind: 'content', status: 'queued', ownerName: 'Dana <x>' }],
    })
    const body = await dryRun()
    const card = cardFor(body.blocks, 'op-dana')!
    expect(sectionText(card.section)).toContain(':palm_tree: Dana &lt;x&gt; is away · free this week: ')
    expect(sectionText(card.section)).not.toContain('<x>')
    // Nothing green on a cover: it is still somebody else's work.
    expect(card.actions.elements.map((element: Block) => [element.text.text, element.style])).toEqual([
      [LABEL.TAKE, undefined],
      [LABEL.DETAILS, undefined],
    ])
  })

  it('stays inside fifty blocks on a heavy week, keeps the asks, and counts everything it gave up', async () => {
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
      ...Array.from({ length: 4 }, (_, i) => ({ _id: `op-decide-${i}`, title: `Decide ${i}`, kind: 'decision', status: 'needsHuman', humanQuestion: `Q${i}?` })),
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
    mocks.ideasNeedingReview.mockResolvedValue(Array.from({ length: 7 }, (_, i) => ({ _id: `i${i}`, title: `Merch <for> Town Day ${i}` })))
    // The note exactly as the tick hands it over: domainWatch's own message,
    // with its ISO date and its "(s)".
    const note = assessDomain({ domain: 'goinvo.com', expiresAt: '2026-09-26T04:00:00Z' }, NOW).message
    expect(note).toContain('(2026-09-26)')
    const body = await dryRun({ planRecorded: false, domainNotes: [note] })
    expectValidSlackBlocks(body.blocks)
    expect(body.blocks.length).toBeLessThanOrEqual(50)
    const text = json(body.blocks)
    // The one ask is a card, first.
    expect(cardIds(body.blocks)[0]).toBe('op-fresh')
    expect(body.text).toMatch(/^<@U[A-Z]+> — could you take a task\? · Monday plan: /)
    // Everything that did not fit is counted, and still reachable on This week.
    expect(text).toMatch(/\+\d+ more on <https:\/\/www\.goinvo\.com\/studio\/marketing\?view=thisWeek\|This week>/)
    expect(text).toContain('+27 more follow-ups due')
    expect(text).toContain('*7 ideas I caught still need a yes or no:*')
    expect(text).toContain('One-time setup')
    expect(text).toContain(':warning: *goinvo.com expires in 4 days* (Sat 26 Sep). Confirm auto-renew is on AND the card on file is current')
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(text).not.toContain('(s)')
    expect(text).toContain('This week’s plan didn’t save')
    expect(text).not.toContain('<task>')
    expect(body.blocks.at(-1)!.block_id).toBe('mq_footer')
  })
})

// ── The busy week (the gallery's shared fixture) ────────────────────────────

describe('the busy week, as a phone shows it', () => {
  const BUSY_AVAILABILITY = [
    { ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available' },
    { ownerName: 'Shirley', slackUserId: 'USHIRLEY', status: 'available' },
    { ownerName: 'Eric', slackUserId: 'UERIC', status: 'away', from: '2026-09-21', until: '2026-09-27' },
  ]
  const BUSY_OPERATIONS = [
    { _id: 'op-article', title: 'Draft the pre-mortem article (v2)', kind: 'content', priority: 'normal', status: 'working', ownerName: 'Shirley', estimatedMinutes: 120 },
    { _id: 'op-taxonomy', title: 'Decide: publish the F1–F8 taxonomy?', kind: 'decision', priority: 'high', status: 'needsHuman', humanQuestion: 'Do we publish the F1–F8 taxonomy?', dueAt: '2026-09-25T16:00:00Z' },
    { _id: 'op-townday', title: 'Arlington Town Day merch table', kind: 'content', priority: 'normal', status: 'queued', suggestedOwner: 'Juhan', estimatedMinutes: 45 },
    { _id: 'op-teaser', title: 'Newsletter: pre-mortem teaser', kind: 'content', priority: 'normal', status: 'queued', suggestedOwner: 'Shirley', estimatedMinutes: 30 },
    { _id: 'op-pin', title: 'Pin the kit on LinkedIn', kind: 'content', priority: 'low', status: 'queued', estimatedMinutes: 15, askHistory: askedBefore('UJUHAN', 'USHIRLEY') },
    { _id: 'op-numbers', title: 'Case-study numbers for the kit', kind: 'content', priority: 'normal', status: 'blocked', ownerName: 'Juhan', blocker: 'Waiting on the client’s sign-off' },
    { _id: 'op-slipping', title: 'Update the offer page', kind: 'content', priority: 'normal', status: 'queued', ownerName: 'Juhan', dueAt: '2026-09-01T16:00:00Z' },
    { _id: 'op-beacon', title: 'Follow up with Beacon after the demo', kind: 'outreach', priority: 'high', status: 'queued', ownerName: 'Eric' },
    { _id: 'op-podcast', title: 'Book the podcast', kind: 'content', priority: 'normal', status: 'queued', ownerName: 'Jen' },
    // On the board, but not in this week's plan.
    { _id: 'op-later', title: 'Refresh the case-study page', kind: 'content', priority: 'low', status: 'queued', dueAt: '2026-10-20T16:00:00Z' },
  ]
  const PLAN = {
    itemIds: ['op-townday', 'op-teaser', 'op-pin', 'op-article', 'op-slipping', 'op-beacon', 'op-podcast'],
    decisionIds: ['op-taxonomy'],
    theme: 'Calls first, then the kit',
    plannedMinutes: 450,
    budgetMinutes: 480,
  }
  const busy = async (extra: Record<string, unknown> = {}) => {
    store.data = digestData({
      operations: BUSY_OPERATIONS,
      planned: BUSY_OPERATIONS.filter((operation) => [...PLAN.itemIds, ...PLAN.decisionIds].includes(operation._id)),
      availability: BUSY_AVAILABILITY,
      owned: [{ ownerName: 'Shirley', estimatedMinutes: 120 }],
    })
    mocks.ideasNeedingReview.mockResolvedValue(['Town Day merch', 'Podcast guest list', 'Quick win: pin the kit', 'Webinar'].map((title, i) => ({ _id: `i${i}`, title })))
    return dryRun({ planRecorded: true, plan: PLAN, ...extra })
  }

  it('reads top-down, each task once, ending on the footer, with no attachments', async () => {
    const body = await busy()
    expectValidSlackBlocks(body.blocks)
    expect(body.attachments ?? []).toHaveLength(0)
    expect(body.planned).toBe(true)
    const ids = cardIds(body.blocks)
    expect(new Set(ids).size).toBe(ids.length)
    const last = body.blocks.at(-1)!
    expect(last.type).toBe('actions')
    expect(last.elements[0].text.text).toBe('Open This week')
    expect(body.blocks[1].elements[0].text).toBe('Week of Mon 21 Sep · 7h 30m planned of 8h · _Calls first, then the kit_')
  })

  it('puts the first "I’ll take it" within the first thirty phone lines, and the whole plan inside eighty', async () => {
    const lines = phoneLines((await busy()).blocks)
    const firstTake = lines.findIndex((line) => line.includes(LABEL.TAKE))
    expect(firstTake).toBeGreaterThan(-1)
    expect(firstTake).toBeLessThan(30)
    expect(lines.length).toBeLessThanOrEqual(80)
  })

  it('draws exactly the planned week: what This week calls the work, plus its decisions', async () => {
    const body = await busy()
    const ids = cardIds(body.blocks)
    // Every card is planned work; nothing off-plan is drawn.
    for (const id of ids) expect([...PLAN.itemIds, ...PLAN.decisionIds]).toContain(id)
    expect(ids).not.toContain('op-later')
    // Unowned planned work: asked, away cover, asked twice.
    expect(ids).toEqual(['op-townday', 'op-teaser', 'op-beacon', 'op-pin', 'op-taxonomy'])
    // Owned planned work is the roll call — Juhan's two, Shirley's one, Jen by name — and nothing is counted twice.
    expect(json(body.blocks)).toContain('Already taken: Jen 1 · <@UJUHAN> 1 · <@USHIRLEY> 1 — ask `Marqueta, my tasks` for yours')
    expect(body.needsOwnerCount).toBe(4)
  })

  // The planner used to file a "Not me" task as a decision, where four older
  // gates took every slot; deferred "over budget", it never reached this
  // message again — no card, no ask, and never the "asked twice → drop it?".
  it('still shows a task somebody passed on when the plan did not fit it', async () => {
    const passed = {
      _id: 'op-kit',
      title: 'Draft the kit email',
      kind: 'content',
      priority: 'normal',
      status: 'needsHuman',
      estimatedMinutes: 20,
      humanQuestion: 'Shirley passed on this — who should pick it up?',
      askHistory: [{ slackUserId: 'USHIRLEY', week: LAST_WEEK, kind: 'passed' }],
    }
    store.data = digestData({
      operations: [...BUSY_OPERATIONS, passed],
      planned: BUSY_OPERATIONS.filter((operation) => [...PLAN.itemIds, ...PLAN.decisionIds].includes(operation._id)),
      availability: BUSY_AVAILABILITY,
      owned: [{ ownerName: 'Shirley', estimatedMinutes: 120 }],
    })
    const body = await dryRun({ planRecorded: true, plan: PLAN })
    expect(body.needsOwnerCount).toBe(5)
    expect(cardIds(body.blocks)).toContain('op-kit')
    // Asked of somebody who has not already said no.
    const ask = body.asks.find((entry) => entry.taskId === 'op-kit')
    expect(ask?.slackUserId).toBe('UJUHAN')
  })

  it('counts the decisions the plan left for later, rather than reading as though there were none', async () => {
    const later = ['a', 'b', 'c'].map((key) => ({
      _id: `op-gate-${key}`, title: `Gate ${key}`, kind: 'decision', priority: 'high', status: 'needsHuman', humanQuestion: `Gate ${key}?`,
    }))
    store.data = digestData({
      operations: [...BUSY_OPERATIONS, ...later],
      planned: BUSY_OPERATIONS.filter((operation) => [...PLAN.itemIds, ...PLAN.decisionIds].includes(operation._id)),
      availability: BUSY_AVAILABILITY,
      owned: [{ ownerName: 'Shirley', estimatedMinutes: 120 }],
    })
    const body = await dryRun({ planRecorded: true, plan: PLAN })
    // One drawn (the plan's), three more counted.
    expect(cardIds(body.blocks).filter((id) => id.startsWith('op-gate'))).toEqual([])
    expect(json(body.blocks)).toContain('+3 more on <https://www.goinvo.com/studio/marketing?view=thisWeek&focus=decisions|This week>')
  })

  it('never asks someone away — Eric’s own task is offered for cover, naming who is free', async () => {
    const body = await busy()
    expect(body.asks.map((ask) => ask.slackUserId)).not.toContain('UERIC')
    const cover = cardFor(body.blocks, 'op-beacon')!
    // Free people from the team list only — Jen owns a task but has no team record.
    expect(sectionText(cover.section)).toMatch(/:palm_tree: Eric is away · free this week: Juhan, Shirley$/)
  })

  it('leads the notification with the asks', async () => {
    const body = await busy()
    expect(body.text).toBe('<@UJUHAN> <@USHIRLEY> — could you take a task each? · Monday plan: 4 tasks need an owner, 5 follow-ups due')
    expect(body.text.indexOf('Monday plan')).toBeLessThan(90)
  })

  it('shows the stuck task, the money question, the ideas and the identity prompt', async () => {
    const text = json((await busy()).blocks)
    expect(text).toContain('Case-study numbers for the kit')
    expect(text).toContain('in the way: Waiting on the client’s sign-off')
    expect(text).toContain('*4 ideas I caught still need a yes or no:*')
    expect(text).toContain('One-time setup')
  })

  it('writes no ISO date, no ISO week, no "(s)" and no retired label anywhere', async () => {
    const body = await busy()
    const strings = [body.text, ...JSON.stringify(body.blocks).match(/"text":"(?:[^"\\]|\\.)*"/g)!]
    for (const value of strings) {
      expect(value).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/)
      expect(value).not.toMatch(/\bW\d{2}\b/)
      expect(value).not.toContain('(s)')
    }
    const labels = buttonsOf(body.blocks).map((button) => button.text.text)
    for (const retired of RETIRED_LABELS) expect(labels).not.toContain(retired)
    // At most one green button per card, and it is the leftmost.
    for (const block of body.blocks.filter((entry) => entry.type === 'actions')) {
      const primary = block.elements.map((element: Block, index: number) => (element.style === 'primary' ? index : -1)).filter((index: number) => index >= 0)
      expect(primary.length).toBeLessThanOrEqual(1)
      if (primary.length) expect(primary[0]).toBe(0)
      expect(block.elements.length).toBeLessThanOrEqual(3)
    }
  })

  it('shows the open board, and says so, when the plan did not save', async () => {
    const body = await busy({ planRecorded: false })
    expect(body.planned).toBe(false)
    expect(body.blocks[2].elements[0].text).toContain('This week’s plan didn’t save')
    // Off-plan work is back in view.
    expect(json(body.blocks)).toContain('op-later')
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
    expect(posted).toMatchObject({ channel: CHANNEL, username: 'Marqueta', iconEmoji: ':chart_with_upwards_trend:', unfurl: false })
    expect(posted.text.startsWith('<@UJUHAN> <@USHIRLEY> — could you take a task each?')).toBe(true)
    expectValidSlackBlocks(posted.blocks)
    expect(posted.attachments).toBeUndefined()

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
    // The run's own record reads like the rest of her copy: a day, never an ISO week.
    expect(store.heartbeats.get(DIGEST_HEARTBEAT_DOC_ID)!.steps[0].detail).toBe(
      'Digest posted for the week of Mon 21 Sep: 6 tasks, 3 asks (3 new ones recorded).',
    )
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

  it('takes the planned week only in the shape it expects, and ignores it when the plan did not save', async () => {
    await dryRun({ planRecorded: false, plan: { itemIds: ['op-post'], decisionIds: [] } })
    expect(mocks.outreach.fetch.mock.calls[0][1].plannedIds).toEqual([])
    mocks.outreach.fetch.mockClear()
    const shaped = await dryRun({ plan: { itemIds: ['op-post', 42, '', 'op-post'], decisionIds: 'nope', theme: { x: 1 } } })
    expect(mocks.outreach.fetch.mock.calls[0][1].plannedIds).toEqual(['op-post', '42'])
    expect(shaped.blocks[1].elements[0].text).toBe('Week of Mon 21 Sep · 0m planned of 8h')
    mocks.outreach.fetch.mockClear()
    await dryRun({ plan: 'not a plan', domainNotes: 'not a list' })
    expect(mocks.outreach.fetch.mock.calls[0][1].plannedIds).toEqual([])
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
    // neither is "still worth doing?" (the bug made both look asked twice).
    // op-passed really has two answers — Shirley passed, and Juhan was asked.
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
    const cover = cardFor(body.blocks, 'op-shirley')!
    expect(sectionText(cover.section)).toContain(':palm_tree: Shirley is away · free this week:')
    expect(sectionText(cover.section)).not.toMatch(/free this week:.*Shirley/)
  })
})

// ── "I'll take it" ──────────────────────────────────────────────────────────

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

  it('a legacy take on a colleague’s task puts the presser’s own name on it and says whose it was', async () => {
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
    expect(digestHeartbeatStep({ ok: true, status: 200, body: { posted: true, taskCount: 6 } }, { dryRun: false, week: WEEK })).toMatchObject({
      name: 'digest',
      ok: true,
      count: 6,
    })
    expect(digestHeartbeatStep({ ok: true, status: 200, body: { posted: false } }, { dryRun: false, week: WEEK })).toMatchObject({ ok: false })
    expect(digestHeartbeatStep({ ok: false, status: 503, body: { error: 'Could not claim' } }, { dryRun: false, week: WEEK })).toMatchObject({
      ok: false,
      detail: 'digest returned 503: Could not claim',
    })
  })
})

// ── The tick hands the planned week over ────────────────────────────────────

describe('the tick', () => {
  function stubRoutes(plan: Record<string, unknown>, planStatus = 200) {
    const calls: Array<{ url: string; body: any }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null })
        if (String(url).includes('/api/marketing/plan-week')) return new Response(JSON.stringify(plan), { status: planStatus })
        return new Response(JSON.stringify({ posted: true, taskCount: 3 }), { status: 200 })
      }),
    )
    return calls
  }
  const tick = () =>
    TICK_GET(new NextRequest('https://www.goinvo.com/api/marketing/tick', { headers: { authorization: 'Bearer cron-secret' } }))

  beforeEach(() => {
    process.env.CRON_SECRET = 'cron-secret'
    process.env.MARKETING_API_KEY = 'key'
    // The gate: the week's plan record exists.
    mocks.tickClient.fetch.mockResolvedValue('marketingOperation.weekly-plan-2026-w39')
    mocks.tickClient.createIfNotExists.mockResolvedValue({})
  })

  it('passes the week plan-week just recorded to the digest, by id, so both list the same work', async () => {
    const calls = stubRoutes({
      weekStart: '2026-09-21',
      plannedMinutes: 450,
      budgetMinutes: 480,
      theme: 'Calls first',
      items: [{ id: 'op-a', title: 'A' }, { id: 'op-b' }, { title: 'no id' }],
      decisions: [{ id: 'op-d' }],
    })
    const response = await tick()
    expect(response.status).toBe(200)
    const digest = calls.find((call) => call.url.includes('/api/marketing/slack/digest'))!
    expect(digest.url.startsWith('https://www.goinvo.com/')).toBe(true)
    expect(digest.body).toMatchObject({
      planRecorded: true,
      domainNotes: [],
      plan: { itemIds: ['op-a', 'op-b'], decisionIds: ['op-d'], theme: 'Calls first', plannedMinutes: 450, budgetMinutes: 480 },
    })
    const body = await response.json()
    expect(body.steps[0]).toEqual({ name: 'plan', ok: true, count: 3, detail: '3 items planned for the week of Mon 21 Sep.' })
    expect(body.steps[1].detail).toBe('0 domains checked, all clear.')
  })

  it('hands over no plan when planning failed, and the digest says the plan did not save', async () => {
    mocks.tickClient.fetch.mockResolvedValue(null)
    const calls = stubRoutes({ error: 'boom' }, 500)
    await tick()
    const digest = calls.find((call) => call.url.includes('/api/marketing/slack/digest'))!
    expect(digest.body.planRecorded).toBe(false)
    expect(digest.body.plan).toBeUndefined()
  })
})
