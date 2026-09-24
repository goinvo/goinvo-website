/**
 * Marqueta's server core, against a mocked Sanity client.
 *
 * The pure modules are tested on their own; these tests pin what the server
 * layer adds around them — which records are read, the exact write (and its
 * revision condition), idempotency under retries, what never reaches a
 * channel, and the claim that keeps a scheduled post to one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Op = [string, ...unknown[]]
type PatchRecord = { client: 'outreach' | 'posture'; id: string; ops: Op[] }

const mocks = vi.hoisted(() => {
  const patches: PatchRecord[] = []
  const commit = vi.fn<(record: PatchRecord) => Promise<unknown>>(async () => ({}))
  const makePatch = (client: PatchRecord['client']) =>
    vi.fn((id: string) => {
      const record: PatchRecord = { client, id, ops: [] }
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
  const outreach = { fetch: vi.fn(), createIfNotExists: vi.fn(async (doc: unknown) => doc), patch: makePatch('outreach') }
  const posture = { fetch: vi.fn(), createIfNotExists: vi.fn(async (doc: unknown) => doc), patch: makePatch('posture') }
  return {
    patches,
    commit,
    outreach,
    posture,
    postSlackMessage: vi.fn(),
    getSlackUserDisplayName: vi.fn(),
  }
})

vi.mock('@/lib/marketing/outreachClient.server', () => ({
  getOutreachClient: () => mocks.outreach,
  isOutreachClientConfigured: () => true,
}))
vi.mock('@/lib/marketing/client', () => ({
  getMarketingWriteClientFor: () => mocks.posture,
  getMarketingWriteClient: () => mocks.posture,
}))
vi.mock('@/lib/chat/slack', () => ({
  postSlackMessage: mocks.postSlackMessage,
  getSlackUserDisplayName: mocks.getSlackUserDisplayName,
}))

import { hoursForWeek, type TeamMemberAvailability } from '@/lib/marketing/availability'
import { logCallFromSlack, undoCallLog } from '@/lib/marketing/callLog.server'
import {
  addContactFromSlack,
  PREP_DATA_QUERY,
  prepCallFor,
  prepCallList,
  type PrepData,
  type PrepDataContact,
} from '@/lib/marketing/callPrep.server'
import { authorizeCron, cronDeniedStatus } from '@/lib/marketing/cronAuth'
import { CHECKIN_HEARTBEAT_DOC_ID, heartbeatHealth } from '@/lib/marketing/heartbeat'
import { decodeContactRef, encodeContactRef, MARQUETA_ACTION, type CallLogUndo } from '@/lib/marketing/marquetaActions'
import { marketingOperationDocumentId } from '@/lib/marketing/operations'
import { readRunway } from '@/lib/marketing/runway.server'
import { loadStrategySnapshot, recordStrategyVerdict, STRATEGY_DATA_QUERY } from '@/lib/marketing/strategyCheck.server'
import {
  dropTask,
  handBackTask,
  markTaskDone,
  markTaskStuck,
  markTaskUnstuck,
  reopenTask,
  snoozeTask,
  takeTask,
} from '@/lib/marketing/taskActions.server'
import {
  askableTeam,
  resolvePresserName,
  slackIdForOwner,
  TEAM_AVAILABILITY_QUERY,
  tidyAvailability,
} from '@/lib/marketing/team.server'
import {
  CHECK_IN_DATA_QUERY,
  runWeeklyCheckIn,
  utcIsoWeekKey,
  withUnownedFollowUps,
} from '@/lib/marketing/weeklyCheckIn.server'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Thursday 24 Sep 2026, 10am in Arlington. */
const NOW = new Date('2026-09-24T14:00:00Z')
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString()

const conflict = () => Object.assign(new Error('Document has been modified since the revision given'), { statusCode: 409 })

const TEAM: TeamMemberAvailability[] = [
  { ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available' },
  { ownerName: 'Eric', slackUserId: 'UERIC', status: 'available' },
]

// ── Fixture routing ──────────────────────────────────────────────────────────

type Queue<T> = T | T[]
const nextFrom = <T>(queue: T[]) => (queue.length > 1 ? queue.shift() : queue[0])

type Fixtures = {
  prep?: PrepData
  logContact?: Queue<Record<string, unknown> | null>
  existingContact?: Record<string, unknown> | null
  existingById?: Record<string, unknown> | null
  task?: Queue<Record<string, unknown> | null>
  availability?: TeamMemberAvailability[] | Error
  checkIn?: Record<string, unknown>
  heartbeat?: Record<string, unknown> | null
  strategy?: Record<string, unknown>
}

function routeOutreach(fixtures: Fixtures) {
  const asQueue = <T>(value: Queue<T> | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? [...value] : [value])
  const contacts = asQueue(fixtures.logContact)
  const tasks = asQueue(fixtures.task)
  mocks.outreach.fetch.mockImplementation(async (query: string) => {
    if (query === PREP_DATA_QUERY) return fixtures.prep
    if (query === TEAM_AVAILABILITY_QUERY) {
      if (fixtures.availability instanceof Error) throw fixtures.availability
      return fixtures.availability ?? []
    }
    if (query === CHECK_IN_DATA_QUERY) return fixtures.checkIn
    if (query === STRATEGY_DATA_QUERY) return fixtures.strategy
    if (query.includes('postedWeek, claimedWeek')) return fixtures.heartbeat
    if (query.includes('_type == "marketingContact" && _id == $id') && query.includes('closeReason')) return nextFrom(contacts)
    if (query.includes('_type == "marketingContact" && _id == $id')) return fixtures.existingContact ?? null
    if (query.includes('_type == "marketingOperation" && _id == $id')) return nextFrom(tasks)
    if (query.startsWith('*[_id == $id][0]{ _id }')) return fixtures.existingById ?? null
    throw new Error(`unexpected query: ${query.slice(0, 80)}`)
  })
}

function routePosture(input: { stored?: Record<string, unknown>; review?: Record<string, unknown> | null }) {
  mocks.posture.fetch.mockImplementation(async (query: string) => {
    if (query.includes('strategyReview')) return input.review ?? null
    if (query.includes('posture, setAt, runway')) return input.stored ?? {}
    throw new Error(`unexpected posture query: ${query}`)
  })
}

const opsOf = (record: PatchRecord | undefined, name: string) => (record?.ops || []).filter((op) => op[0] === name).map((op) => op.slice(1))
const setOf = (record: PatchRecord | undefined): Record<string, any> =>
  Object.assign({}, ...opsOf(record, 'set').map((args) => args[0] as Record<string, unknown>))
const unsetOf = (record: PatchRecord | undefined): string[] => opsOf(record, 'unset').flatMap((args) => args[0] as string[])
const patchesFor = (id: string) => mocks.patches.filter((record) => record.id === id)

const originalEnv = { ...process.env }

beforeEach(() => {
  mocks.patches.length = 0
  mocks.commit.mockReset()
  mocks.commit.mockImplementation(async () => ({}))
  mocks.outreach.fetch.mockReset()
  mocks.outreach.createIfNotExists.mockClear()
  mocks.outreach.patch.mockClear()
  mocks.posture.fetch.mockReset()
  mocks.posture.createIfNotExists.mockClear()
  mocks.posture.patch.mockClear()
  mocks.postSlackMessage.mockReset()
  mocks.getSlackUserDisplayName.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
})

// ── Call prep ────────────────────────────────────────────────────────────────

const jane: PrepDataContact = {
  _id: 'marketingContact.jane',
  name: 'Jane Doe',
  organization: 'Mass General Brigham',
  role: 'CMIO',
  segment: 'provider',
  warmth: 'warm',
  status: 'researched',
  owner: 'Juhan',
  howWeKnow: 'Met at HIMSS 2025',
  email: 'jane.doe@mgb.org',
  phone: '617-555-0100',
  researchReviewedAt: '2026-09-01T00:00:00Z',
  callBrief: 'Jane runs the clinical AI pilots and has spoken publicly about getting clinicians to adopt them.',
  suggestedOpener: 'Hi Jane, I saw your HIMSS talk on clinical AI adoption.',
  relevantEvidence: [{ evidenceId: 'ev1', title: 'Care navigation' }],
  personVerified: true,
  identityConfidence: 'high',
  interactions: [],
}

const prepData = (extra: PrepDataContact[] = []): PrepData => ({
  contacts: [
    jane,
    { _id: 'marketingContact.sam', name: 'Sam Rivera', organization: 'Acme Health', role: 'VP Product', warmth: 'cold', status: 'new' },
    { _id: 'marketingContact.pat', name: 'Pat Lee', organization: 'Acme Health', warmth: 'warm', status: 'new' },
    { _id: 'marketingContact.alexk', name: 'Alex Kim', organization: 'Foo Labs' },
    { _id: 'marketingContact.alexp', name: 'Alex Park', organization: 'Bar Systems' },
    ...extra,
  ],
  research: [],
  offers: [
    { key: 'ai-pilot-premortem', title: 'AI Pilot Pre-Mortem', oneLiner: 'A short, fixed-scope look at what could stall a pilot.', proofPoints: 'Ipsos Facto' },
    { key: 'clinician-adoption-rescue', title: 'Clinician Adoption Rescue', oneLiner: 'Find out why clinicians work around a tool.' },
  ],
  evidence: [{ _id: 'ev1', title: 'Care navigation', client: 'A health system' }],
})

const buttons = (blocks: Block[]) =>
  blocks.flatMap((block) => [...(block.elements || []), ...(block.accessory ? [block.accessory] : [])]).filter((element) => element.type === 'button')

// ── Call log ─────────────────────────────────────────────────────────────────

const loggable = {
  _id: 'marketingContact.jane',
  _rev: 'r1',
  name: 'Jane Doe',
  email: 'jane.doe@mgb.org',
  organization: 'Mass General Brigham',
  status: 'researched',
  interactions: [] as { _key: string }[],
}

const quickLog = (extra: Partial<Parameters<typeof logCallFromSlack>[0]> = {}) =>
  logCallFromSlack({
    contactId: 'marketingContact.jane',
    outcomeKey: 'voicemail',
    notes: 'Left a message about the pilot',
    followUp: 'default',
    byName: 'Juhan',
    key: 'slack-V123',
    now: NOW,
    ...extra,
  })

// ── Team ─────────────────────────────────────────────────────────────────────

// ── Task actions ─────────────────────────────────────────────────────────────

const TASK_ID = 'marketingOperation.t1'
const task = (extra: Record<string, unknown> = {}) => ({
  _id: TASK_ID,
  _rev: 'rev1',
  _createdAt: '2026-09-01T00:00:00Z',
  _updatedAt: '2026-09-10T00:00:00Z',
  title: 'Write the case study',
  ownerName: 'Juhan',
  // Stale: claimed once by Eric's id, then reassigned in the Studio.
  ownerSlackUserId: 'UERIC',
  status: 'queued',
  kind: 'content',
  dueAt: '2026-09-20T00:00:00Z',
  activity: [],
  ...extra,
})
const juhan = { taskId: TASK_ID, personName: 'Juhan', slackUserId: 'UJUHAN', now: NOW }
const eric = { taskId: TASK_ID, personName: 'Eric', slackUserId: 'UERIC', now: NOW }

// ── Strategy ─────────────────────────────────────────────────────────────────

const STORED_POSTURE = { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-10T00:00:00Z' } }
const PRIOR_REVIEW = {
  confirmedAt: '2026-09-02T00:00:00Z',
  confirmedBy: 'Eric',
  verdict: 'stillRight',
  monthKey: '2026-09',
  postureAtReview: 'rebuild',
}
const wonContact = {
  _id: 'marketingContact.won',
  name: 'Jane Doe',
  organization: 'Acme',
  status: 'won',
  interactions: [
    { at: '2026-09-01T00:00:00Z', statusAfter: 'meeting', channel: 'phone', by: 'Juhan' },
    { at: '2026-09-20T15:00:00Z', statusAfter: 'won', value: 40000, channel: 'phone', by: 'Juhan' },
  ],
}
const strategyData = (extra: Record<string, unknown> = {}) => ({
  contacts: [wonContact],
  gates: [{ title: 'Pick the lead offer', dueAt: '2026-10-01T00:00:00Z', status: 'needsHuman' }],
  openRethink: null,
  ...extra,
})

describe('loadStrategySnapshot', () => {
  it('feeds the latest win into the runway check-in and reads the review before anything else', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const loaded = await loadStrategySnapshot(NOW)
    expect(loaded.latestWin).toEqual({ at: '2026-09-20T15:00:00Z', label: 'Jane Doe (Acme)' })
    expect(loaded.runway.checkIn.due).toBe(true)
    expect(loaded.runway.checkIn.reason).toMatch(/Jane Doe \(Acme\) was marked won/)
    expect(loaded.snapshot.pipeline).toMatchObject({ wonThisMonth: 1, wonValueThisMonth: 40000 })
    expect(loaded.snapshot.postureId).toBe('rebuild')
    expect(loaded.review).toMatchObject({ verdict: 'stillRight' })
    expect(loaded.due.due).toBe(false)
    expect(loaded.snapshot.gates[0]).toMatchObject({ title: 'Pick the lead offer', overdue: false })
    // The prefixes are passed as parameters, never interpolated.
    expect(mocks.outreach.fetch).toHaveBeenCalledWith(STRATEGY_DATA_QUERY, {
      gatePrefix: 'exec-plan-2026q4/gate',
      rethinkPrefix: 'strategy-review/',
    })
  })
})

describe('recordStrategyVerdict', () => {
  it('writes nothing for a press on last month’s card, and hands back this month’s answer', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const result = await recordStrategyVerdict({ verdict: 'stillRight', personName: 'Juhan', monthKey: '2026-08', now: NOW })
    expect(result).toMatchObject({ ok: false, stale: true })
    expect(result.message).toBe('That was August 2026’s check — here is this month’s.')
    expect(result.answer).toMatch(/Strategy — September 2026/)
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.posture.createIfNotExists).not.toHaveBeenCalled()
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
  })

  it('records "still right" against the posture in force', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const result = await recordStrategyVerdict({ verdict: 'stillRight', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(result.ok).toBe(true)
    const [patch] = patchesFor('marketingFinancialPosture')
    expect(setOf(patch).strategyReview).toEqual({
      confirmedAt: NOW.toISOString(),
      confirmedBy: 'Juhan',
      verdict: 'stillRight',
      monthKey: '2026-09',
      postureAtReview: 'rebuild',
    })
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
  })

  it('files one rethink decision keyed by the answer it follows, BEFORE recording the verdict', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const result = await recordStrategyVerdict({ verdict: 'rethink', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(result).toMatchObject({ ok: true, filed: true })
    const decision = mocks.outreach.createIfNotExists.mock.calls[0][0] as Record<string, any>
    const sourceKey = 'strategy-review/2026-09/after-20260902T000000000Z'
    expect(decision).toMatchObject({
      _id: marketingOperationDocumentId(sourceKey),
      _type: 'marketingOperation',
      sourceKey,
      kind: 'decision',
      status: 'needsHuman',
      suggestedOwner: 'Juhan',
      ownerName: '',
    })
    expect(result.operationId).toBe(decision._id)
    expect(setOf(patchesFor('marketingFinancialPosture')[0]).strategyReview.verdict).toBe('rethink')
    expect(mocks.outreach.createIfNotExists.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.posture.patch.mock.invocationCallOrder[0],
    )

    // A second press on the same card reads the same prior answer: same id,
    // so createIfNotExists keeps it to one decision.
    await recordStrategyVerdict({ verdict: 'rethink', personName: 'Eric', monthKey: '2026-09', now: NOW })
    const second = mocks.outreach.createIfNotExists.mock.calls[1][0] as Record<string, any>
    expect(second._id).toBe(decision._id)
  })

  it('joins an open rethink instead of filing a second, once per person', async () => {
    const open = { _id: 'marketingOperation.rethink', title: 'Rethink the marketing plan (September 2026)', activity: [] }
    routeOutreach({ strategy: strategyData({ openRethink: open }) })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const result = await recordStrategyVerdict({ verdict: 'rethink', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(result).toMatchObject({ ok: true, filed: false, operationId: open._id })
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
    const [joined] = patchesFor(open._id)
    const [, , entries] = opsOf(joined, 'insert')[0] as [string, string, Record<string, unknown>[]]
    expect(entries[0]).toMatchObject({ action: 'Asked for a rethink from Slack', outcome: 'By Juhan', actor: 'person' })

    // The same person again a minute later is the same ask.
    mocks.patches.length = 0
    routeOutreach({
      strategy: strategyData({
        openRethink: { ...open, activity: [{ _key: 'a', at: minutesAgo(1), actor: 'person', action: 'Asked for a rethink from Slack', outcome: 'By Juhan' }] },
      }),
    })
    await recordStrategyVerdict({ verdict: 'rethink', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(patchesFor(open._id)).toHaveLength(0)
    // The verdict itself is still recorded.
    expect(patchesFor('marketingFinancialPosture')).toHaveLength(1)
  })
})

describe('readRunway latestWin', () => {
  it('asks about a win newer than the last confirmation only when told about it', async () => {
    routePosture({ stored: STORED_POSTURE })
    await expect(readRunway(NOW)).resolves.toMatchObject({ checkIn: { due: false } })
    const withWin = await readRunway(NOW, { latestWin: { at: '2026-09-20', label: 'Acme' } })
    expect(withWin.checkIn).toMatchObject({ due: true, urgent: false })
    expect(withWin.checkIn.reason).toMatch(/Acme was marked won/)
  })
})

// ── Weekly check-in ──────────────────────────────────────────────────────────

const WEEK = '2026-W39'
const checkInData = (extra: Record<string, unknown> = {}) => ({
  tasks: [
    {
      _id: 'marketingOperation.c1',
      title: 'Call three past clients',
      ownerName: 'Juhan',
      // Stale id: the roster must win, or Eric is pinged about Juhan's work.
      ownerSlackUserId: 'UERIC',
      status: 'queued',
      dueAt: '2026-09-22T00:00:00Z',
      _createdAt: '2026-09-01T00:00:00Z',
      _updatedAt: '2026-09-15T00:00:00Z',
    },
    {
      _id: 'marketingOperation.c2',
      title: 'Draft the newsletter',
      ownerName: 'Eric',
      status: 'working',
      _createdAt: '2026-09-01T00:00:00Z',
      _updatedAt: '2026-09-15T00:00:00Z',
    },
    { _id: 'marketingOperation.c3', title: 'Update the offer page', status: 'queued', dueAt: '2026-09-25T00:00:00Z' },
  ],
  availability: TEAM,
  contacts: [
    {
      _id: 'marketingContact.f1',
      name: 'Riley Replied',
      organization: 'Acme',
      owner: 'juhan',
      status: 'responded',
      followUpAt: '2026-09-23T14:00:00Z',
      interactions: [{ at: '2026-09-21T14:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'responded' }],
    },
  ],
  ...extra,
})

function slackEnv() {
  process.env.SLACK_BOT_TOKEN = 'xoxb-test'
  process.env.SLACK_MARKETING_CHANNEL_ID = 'CMKTBOT'
  process.env.SLACK_CHANNEL_ID = 'CVISITORCHAT'
}

const sectionIndex = (blocks: Block[], predicate: (text: string, block: Block) => boolean) =>
  blocks.findIndex((block) => predicate(String(block?.text?.text || ''), block))

// ── Heartbeat + cron auth ────────────────────────────────────────────────────
