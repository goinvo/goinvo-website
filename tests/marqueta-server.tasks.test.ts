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
import { PREP_DATA_QUERY, type PrepData } from '@/lib/marketing/callPrep.server'
import { authorizeCron, cronDeniedStatus } from '@/lib/marketing/cronAuth'
import { CHECKIN_HEARTBEAT_DOC_ID, heartbeatHealth } from '@/lib/marketing/heartbeat'
import { STRATEGY_DATA_QUERY } from '@/lib/marketing/strategyCheck.server'
import {
  answerTask,
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
import { CHECK_IN_FOOTER_BLOCK, MAX_CHECK_IN_BLOCKS } from '@/lib/marketing/weeklyCheckIn'
import { CHECK_IN_DATA_QUERY, runWeeklyCheckIn, utcIsoWeekKey } from '@/lib/marketing/weeklyCheckIn.server'
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

// ── Team ─────────────────────────────────────────────────────────────────────

describe('team identity', () => {
  it('reads a task owner’s Slack id from the roster first, never a stale stamped one', () => {
    expect(slackIdForOwner(TEAM, 'Juhan', 'UERIC')).toBe('UJUHAN')
    expect(slackIdForOwner(TEAM, 'juhan', undefined)).toBe('UJUHAN')
    // Unmapped name: the task's id only when the roster does not give it to someone else.
    expect(slackIdForOwner(TEAM, 'Shirley', 'UERIC')).toBeUndefined()
    expect(slackIdForOwner(TEAM, 'Shirley', 'USHIRLEY')).toBe('USHIRLEY')
    // Contradictory roster: nobody's id rather than possibly the wrong one.
    const split: TeamMemberAvailability[] = [
      { ownerName: 'Sam', slackUserId: 'USAM1', status: 'available' },
      { ownerName: 'sam', slackUserId: 'USAM2', status: 'available' },
    ]
    expect(slackIdForOwner(split, 'Sam', 'USAM1')).toBeUndefined()
  })

  it('resolves a presser to their board name without asking Slack when they are linked', async () => {
    await expect(resolvePresserName({ slackUserId: 'UJUHAN', entries: TEAM })).resolves.toBe('Juhan')
    expect(mocks.getSlackUserDisplayName).not.toHaveBeenCalled()

    // An exact match on a record nobody has linked yet is still that name.
    const roster: TeamMemberAvailability[] = [...TEAM, { ownerName: 'Shirley', status: 'available' }]
    mocks.getSlackUserDisplayName.mockResolvedValue('shirley')
    await expect(resolvePresserName({ slackUserId: 'UNEW', entries: roster })).resolves.toBe('Shirley')
    mocks.getSlackUserDisplayName.mockResolvedValue('Juhan Sonin')
    await expect(resolvePresserName({ slackUserId: 'UNEW', entries: TEAM })).resolves.toBe('Juhan Sonin')
  })

  // Reviewer finding: the display-name match won even when that board name was
  // linked to a DIFFERENT Slack account — so anybody whose display name read
  // "Eric" took, passed and booked time off as Eric.
  it('treats a namesake as nobody: a name linked to someone else is only theirs', async () => {
    mocks.getSlackUserDisplayName.mockResolvedValue('eric')
    await expect(resolvePresserName({ slackUserId: 'UNEW', entries: TEAM })).resolves.toBe('Someone')
    await expect(resolvePresserName({ slackUserId: 'UNEW', displayName: 'Juhan', entries: TEAM })).resolves.toBe('Someone')
    // No Slack id at all proves nothing about a linked name either.
    await expect(resolvePresserName({ displayName: 'Juhan', entries: TEAM })).resolves.toBe('Someone')
    // The linked account itself, under any display name, is still that person.
    await expect(resolvePresserName({ slackUserId: 'UERIC', displayName: 'Eric B', entries: TEAM })).resolves.toBe('Eric')
    // A name with two records is theirs if either record is linked to them.
    const split: TeamMemberAvailability[] = [
      { ownerName: 'Sam', slackUserId: 'USAM1', status: 'available' },
      { ownerName: 'sam', slackUserId: 'USAM2', status: 'available' },
    ]
    await expect(resolvePresserName({ slackUserId: 'USAM2', displayName: 'Sam', entries: split })).resolves.toBe('sam')
    await expect(resolvePresserName({ slackUserId: 'UOTHER', displayName: 'Sam', entries: split })).resolves.toBe('Someone')
  })

  it('throws rather than guessing when the roster cannot be read', async () => {
    routeOutreach({ availability: new Error('down') })
    await expect(resolvePresserName({ slackUserId: 'UJUHAN' })).rejects.toThrow('down')
  })

  it('turns GROQ nulls into absent fields, so a missing allocation is the default week, not zero hours', () => {
    const [row] = tidyAvailability([
      { ownerName: ' Juhan ', slackUserId: 'UJUHAN', status: 'available', from: null, until: null, weeklyHours: null, note: null },
    ])
    expect(row).toEqual({ ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available' })
    expect(hoursForWeek({ entries: [row], ownerName: 'Juhan', dateKey: '2026-09-24', defaultHours: 4 })).toBe(4)
    expect(tidyAvailability([{ ownerName: 'Eric', slackUserId: 'not-an-id', status: 'weird', weeklyHours: 2 }])).toEqual([
      { ownerName: 'Eric', status: 'available', weeklyHours: 2 },
    ])
  })

  it('lists askable teammates once per Slack id, in name order', () => {
    const team = askableTeam([
      { ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available' },
      { ownerName: 'Juhan Sonin', slackUserId: 'UJUHAN', status: 'available' },
      { ownerName: 'Eric', slackUserId: 'UERIC', status: 'available' },
      { ownerName: 'Nobody', status: 'available' },
    ])
    expect(team).toEqual([
      { name: 'Eric', slackUserId: 'UERIC' },
      { name: 'Juhan', slackUserId: 'UJUHAN' },
    ])
  })
})

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

describe('task actions', () => {
  it('Done: moves to done through the status rules, and returns the fresh card with the roster’s id', async () => {
    routeOutreach({ task: task(), availability: TEAM })
    const result = await markTaskDone(juhan)
    expect(result).toMatchObject({ ok: true, changed: true })
    const [patch] = patchesFor(TASK_ID)
    expect(setOf(patch)).toMatchObject({ status: 'done', completedAt: NOW.toISOString(), lastOutcome: 'Done — said in Slack by Juhan' })
    expect(setOf(patch).activity).toHaveLength(1)
    expect(opsOf(patch, 'ifRevisionId')[0][0]).toBe('rev1')
    expect(result.task).toMatchObject({ _id: TASK_ID, status: 'done', ownerName: 'Juhan', slackUserId: 'UJUHAN', updatedAt: NOW.toISOString() })
  })

  it('Done on a done task changes nothing', async () => {
    routeOutreach({ task: task({ status: 'done' }), availability: TEAM })
    await expect(markTaskDone(juhan)).resolves.toMatchObject({ ok: true, changed: false })
    expect(mocks.patches).toHaveLength(0)
  })

  it('Unstuck: blocked goes back to working and the blocker is cleared', async () => {
    routeOutreach({ task: task({ status: 'blocked', blocker: 'Waiting on numbers' }), availability: TEAM })
    const result = await markTaskUnstuck(juhan)
    const [patch] = patchesFor(TASK_ID)
    expect(setOf(patch).status).toBe('working')
    expect(unsetOf(patch)).toContain('blocker')
    expect(result.task?.blocker).toBeUndefined()
  })

  it('Unstuck never moves a task waiting on a decision to working', async () => {
    routeOutreach({ task: task({ status: 'needsHuman', humanQuestion: 'Which offer leads?' }), availability: TEAM })
    const result = await markTaskUnstuck(juhan)
    const [patch] = patchesFor(TASK_ID)
    expect(setOf(patch).status).toBe('needsHuman')
    expect(unsetOf(patch)).not.toContain('humanQuestion')
    expect(result.task).toMatchObject({ status: 'needsHuman', humanQuestion: 'Which offer leads?' })
  })

  it('Stuck: blocked with what is in the way, and refuses an empty blocker', async () => {
    routeOutreach({ task: task(), availability: TEAM })
    const result = await markTaskStuck({ ...juhan, blocker: '  Need the case-study numbers  ' })
    expect(setOf(patchesFor(TASK_ID)[0])).toMatchObject({ status: 'blocked', blocker: 'Need the case-study numbers' })
    expect(result.task?.status).toBe('blocked')

    mocks.patches.length = 0
    await expect(markTaskStuck({ ...juhan, blocker: '   ' })).resolves.toMatchObject({ ok: false })
    expect(mocks.patches).toHaveLength(0)
  })

  it('Reopen: done goes back to queued and completedAt is removed', async () => {
    routeOutreach({ task: task({ status: 'done', completedAt: '2026-09-23T00:00:00Z' }), availability: TEAM })
    const result = await reopenTask(juhan)
    const [patch] = patchesFor(TASK_ID)
    expect(setOf(patch).status).toBe('queued')
    expect(unsetOf(patch)).toContain('completedAt')
    expect(result.task?.status).toBe('queued')
  })

  it('Hand back: clears the owner AND the stamped Slack id, keeps the status and the question', async () => {
    routeOutreach({
      task: task({ status: 'needsHuman', humanQuestion: 'Which client story do we lead with?' }),
      availability: TEAM,
    })
    const result = await handBackTask(juhan)
    const [patch] = patchesFor(TASK_ID)
    expect(unsetOf(patch)).toEqual(expect.arrayContaining(['ownerName', 'ownerSlackUserId']))
    expect(unsetOf(patch)).not.toContain('humanQuestion')
    expect(setOf(patch)).not.toHaveProperty('humanQuestion')
    expect(setOf(patch).status).toBe('needsHuman')
    expect(result.task).toMatchObject({ status: 'needsHuman', humanQuestion: 'Which client story do we lead with?' })
    expect(result.task?.ownerName).toBeUndefined()
    expect(result.task?.slackUserId).toBeUndefined()
  })

  it('Hand back refuses to clear a colleague’s name off their work', async () => {
    routeOutreach({ task: task(), availability: TEAM })
    await expect(handBackTask(eric)).resolves.toMatchObject({ ok: false })
    expect(mocks.patches).toHaveLength(0)
  })

  it('Take: a task the digest parked after a decline goes back to queued, its question cleared', async () => {
    routeOutreach({
      task: task({ ownerName: '', ownerSlackUserId: '', status: 'needsHuman', humanQuestion: 'Jen passed on this — who should pick it up?' }),
      availability: TEAM,
    })
    const result = await takeTask(eric)
    const [patch] = patchesFor(TASK_ID)
    expect(setOf(patch)).toMatchObject({ status: 'queued', ownerName: 'Eric', ownerSlackUserId: 'UERIC' })
    expect(unsetOf(patch)).toContain('humanQuestion')
    expect(result.task).toMatchObject({ status: 'queued', ownerName: 'Eric', slackUserId: 'UERIC' })
    expect(result.task?.humanQuestion).toBeUndefined()
  })

  it('Take keeps a real decision a decision', async () => {
    routeOutreach({
      task: task({ ownerName: '', ownerSlackUserId: '', kind: 'decision', status: 'needsHuman', humanQuestion: 'Which offer leads?' }),
      availability: TEAM,
    })
    await takeTask(eric)
    const [patch] = patchesFor(TASK_ID)
    expect(setOf(patch).status).toBe('needsHuman')
    expect(unsetOf(patch)).not.toContain('humanQuestion')
  })

  it('Take refuses a presser nobody could name, rather than filing it under "Someone"', async () => {
    routeOutreach({ task: task({ ownerName: '', ownerSlackUserId: '' }), availability: TEAM })
    await expect(takeTask({ ...eric, personName: 'Someone' })).resolves.toMatchObject({ ok: false })
    expect(mocks.patches).toHaveLength(0)
  })

  it('Take does not take a task somebody else owns', async () => {
    routeOutreach({ task: task(), availability: TEAM })
    await expect(takeTask(eric)).resolves.toMatchObject({ ok: false, message: 'Couldn’t take that — nothing changed. Juhan already has it.' })
    expect(mocks.patches).toHaveLength(0)
  })

  // One error shape for every refusal and failure: what could not be done,
  // that nothing changed, and where to do it instead.
  it('refuses in one shape — "Couldn’t … — nothing changed." — and never says it did something', async () => {
    const refusals: Array<[string, () => Promise<{ ok: boolean; message?: string }>]> = [
      ['closed', async () => (routeOutreach({ task: task({ status: 'done' }), availability: TEAM }), handBackTask(juhan))],
      ['someone else’s', async () => (routeOutreach({ task: task(), availability: TEAM }), handBackTask(eric))],
      ['in progress', async () => (routeOutreach({ task: task({ status: 'working' }), availability: TEAM }), dropTask(juhan))],
      ['no blocker', async () => (routeOutreach({ task: task(), availability: TEAM }), markTaskStuck({ ...juhan, blocker: '  ' }))],
      ['gone', async () => (routeOutreach({ task: null, availability: TEAM }), markTaskDone(juhan))],
      ['no task id', async () => markTaskDone({ ...juhan, taskId: '' })],
    ]
    for (const [name, run] of refusals) {
      const result = await run()
      expect(result.ok, name).toBe(false)
      expect(result.message, name).toMatch(/^Couldn’t [^—]+ — nothing changed\. \S/)
      expect(result.message, name).not.toMatch(/Studio’s|in the Studio|'/)
    }
    expect(mocks.patches).toHaveLength(0)
  })

  // The away cover: the one card whose Take may move a task off its owner.
  describe('Take as an away cover', () => {
    const erics = () => task({ ownerName: 'Eric', ownerSlackUserId: 'UERIC' })
    const shirley = { taskId: TASK_ID, personName: 'Shirley', slackUserId: 'USHIRLEY', now: NOW }

    it('moves the task off the away owner it was drawn for, onto the presser, and names who it came from', async () => {
      routeOutreach({ task: erics(), availability: TEAM })
      const result = await takeTask({ ...juhan, coverFor: 'Eric' })
      expect(result).toMatchObject({ ok: true, changed: true, message: 'It’s yours — taken over from Eric.' })
      const [patch] = patchesFor(TASK_ID)
      expect(setOf(patch)).toMatchObject({
        ownerName: 'Juhan',
        ownerSlackUserId: 'UJUHAN',
        lastOutcome: 'Taken over from Eric in Slack by Juhan',
      })
      expect(opsOf(patch, 'ifRevisionId')[0][0]).toBe('rev1')
      expect(result.task).toMatchObject({ ownerName: 'Juhan', slackUserId: 'UJUHAN' })
    })

    it('never takes it from whoever covered it first — a stale cover card is refused', async () => {
      // Juhan covered Eric's task; Shirley presses the same card later.
      routeOutreach({ task: task({ ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN' }), availability: TEAM })
      await expect(takeTask({ ...shirley, coverFor: 'Eric' })).resolves.toMatchObject({ ok: false, message: 'Couldn’t take that — nothing changed. Juhan already has it.' })
      expect(mocks.patches).toHaveLength(0)
    })

    it('is only a cover for the owner named — without it, or for someone else, Take still refuses', async () => {
      routeOutreach({ task: erics(), availability: TEAM })
      await expect(takeTask(juhan)).resolves.toMatchObject({ ok: false, message: 'Couldn’t take that — nothing changed. Eric already has it.' })
      await expect(takeTask({ ...juhan, coverFor: 'Shirley' })).resolves.toMatchObject({ ok: false })
      await expect(takeTask({ ...juhan, coverFor: '' })).resolves.toMatchObject({ ok: false })
      expect(mocks.patches).toHaveLength(0)
    })

    it('is an ordinary take when the task has come free since', async () => {
      routeOutreach({ task: task({ ownerName: '', ownerSlackUserId: '' }), availability: TEAM })
      await expect(takeTask({ ...juhan, coverFor: 'Eric' })).resolves.toMatchObject({ ok: true, message: 'It’s yours.' })
      expect(setOf(patchesFor(TASK_ID)[0])).toMatchObject({ ownerName: 'Juhan', lastOutcome: 'Taken in Slack by Juhan' })
    })
  })

  it('Drop: dismissed with who dropped it, but not while in progress', async () => {
    routeOutreach({ task: task(), availability: TEAM })
    const result = await dropTask(juhan)
    expect(setOf(patchesFor(TASK_ID)[0])).toMatchObject({ status: 'dismissed', lastOutcome: 'Dropped from Slack by Juhan' })
    expect(result.task?.status).toBe('dismissed')

    mocks.patches.length = 0
    routeOutreach({ task: task({ status: 'working' }), availability: TEAM })
    await expect(dropTask(juhan)).resolves.toMatchObject({ ok: false })
    expect(mocks.patches).toHaveLength(0)
  })

  it('Snooze: seven days on from the later of today and the old date, once per press', async () => {
    routeOutreach({ task: task({ dueAt: daysFromNow(-20) }), availability: TEAM })
    await snoozeTask(juhan)
    expect(setOf(patchesFor(TASK_ID)[0]).dueAt).toBe(daysFromNow(7))

    mocks.patches.length = 0
    routeOutreach({ task: task({ dueAt: daysFromNow(3) }), availability: TEAM })
    await snoozeTask(juhan)
    expect(setOf(patchesFor(TASK_ID)[0]).dueAt).toBe(daysFromNow(10))

    // A double-tap is one press, not two weeks.
    mocks.patches.length = 0
    routeOutreach({
      task: task({ activity: [{ _key: 'a1', at: minutesAgo(1), actor: 'person', action: 'Kept for next week in Slack' }] }),
      availability: TEAM,
    })
    await expect(snoozeTask(juhan)).resolves.toMatchObject({ ok: true, changed: false })
    expect(mocks.patches).toHaveLength(0)
  })

  it('re-reads and rebuilds once on a revision conflict', async () => {
    routeOutreach({ task: [task(), task({ _rev: 'rev2' })], availability: TEAM })
    mocks.commit.mockImplementationOnce(async () => {
      throw conflict()
    })
    await expect(markTaskDone(juhan)).resolves.toMatchObject({ ok: true, changed: true })
    const writes = patchesFor(TASK_ID)
    expect(writes).toHaveLength(2)
    expect(opsOf(writes[1], 'ifRevisionId')[0][0]).toBe('rev2')

    // A second conflict is reported, not forced.
    mocks.patches.length = 0
    routeOutreach({ task: [task(), task({ _rev: 'rev2' })], availability: TEAM })
    mocks.commit.mockImplementation(async () => {
      throw conflict()
    })
    await expect(markTaskDone(juhan)).resolves.toMatchObject({ ok: false, message: expect.stringMatching(/at the same moment/) })
    expect(patchesFor(TASK_ID)).toHaveLength(2)
  })

  // The stale-id shape from team.server.ts: Eric claimed in Slack, the Studio
  // reassigned the task to Juhan, and `ownerSlackUserId` still says UERIC.
  // With no roster entry for Juhan to contradict it, that stamp used to count
  // as proof that Eric owns the task.
  it('Hand back never trusts a stale stamped id when the roster cannot name the owner', async () => {
    routeOutreach({ task: task(), availability: [] })
    await expect(handBackTask(eric)).resolves.toMatchObject({ ok: false, message: expect.stringMatching(/Juhan’s/) })
    expect(mocks.patches).toHaveLength(0)

    // A roster that names other people but not Juhan is the same situation.
    routeOutreach({ task: task(), availability: [{ ownerName: 'Shirley', slackUserId: 'USHIRLEY', status: 'available' }] })
    await expect(handBackTask(eric)).resolves.toMatchObject({ ok: false })
    expect(mocks.patches).toHaveLength(0)
  })

  it('Hand back refuses rather than guessing when the roster cannot be read', async () => {
    routeOutreach({ task: task(), availability: new Error('down') })
    await expect(handBackTask(eric)).resolves.toMatchObject({ ok: false, message: expect.stringMatching(/couldn’t check who owns/) })
    expect(mocks.patches).toHaveLength(0)
  })

  it('Take by the previous owner of a reassigned task is refused, never "already yours"', async () => {
    routeOutreach({ task: task(), availability: [] })
    await expect(takeTask(eric)).resolves.toMatchObject({ ok: false, message: 'Couldn’t take that — nothing changed. Juhan already has it.' })
    expect(mocks.patches).toHaveLength(0)

    routeOutreach({ task: task(), availability: new Error('down') })
    const unreadable = await takeTask(eric)
    expect(unreadable).toMatchObject({ ok: false, message: expect.stringMatching(/couldn’t check who owns/) })
    expect(unreadable.message).not.toMatch(/already yours/)
    expect(mocks.patches).toHaveLength(0)
  })

  it('the owner is still the owner without a roster: by board name, and the stale id is replaced', async () => {
    // The name answers the question, so an unreadable roster does not block the real owner.
    routeOutreach({ task: task(), availability: new Error('down') })
    await expect(handBackTask(juhan)).resolves.toMatchObject({ ok: true, changed: true })
    expect(unsetOf(patchesFor(TASK_ID)[0])).toEqual(expect.arrayContaining(['ownerName', 'ownerSlackUserId']))

    mocks.patches.length = 0
    routeOutreach({ task: task(), availability: [] })
    await expect(takeTask(juhan)).resolves.toMatchObject({ ok: true, changed: true })
    expect(setOf(patchesFor(TASK_ID)[0])).toMatchObject({ ownerName: 'Juhan', ownerSlackUserId: 'UJUHAN' })
  })

  it('recognises a linked owner by the ROSTER’s id under a different name', async () => {
    routeOutreach({ task: task(), availability: TEAM })
    await expect(handBackTask({ ...juhan, personName: 'Juhan Sonin' })).resolves.toMatchObject({ ok: true, changed: true })
  })

  it('does not take a linked owner’s name as proof when the Slack id says it is someone else', async () => {
    // An unlinked colleague whose display name happens to be "Juhan".
    routeOutreach({ task: task(), availability: TEAM })
    await expect(handBackTask({ ...juhan, slackUserId: 'UOTHER' })).resolves.toMatchObject({ ok: false })
    await expect(takeTask({ ...juhan, slackUserId: 'UOTHER' })).resolves.toMatchObject({ ok: false, message: 'Couldn’t take that — nothing changed. Juhan already has it.' })
    expect(mocks.patches).toHaveLength(0)
  })

  // A redraw links the title where the card first linked it: the record's
  // own targetView, not its kind's default tab.
  it('hands back the record’s own targetView, so a redrawn card links where it did before', async () => {
    routeOutreach({ task: task({ kind: 'content', targetView: 'seo' }), availability: TEAM })
    const result = await markTaskDone(juhan)
    expect(result.task).toMatchObject({ kind: 'content', targetView: 'seo' })
  })

  describe('Answer… (answerTask)', () => {
    const decision = (extra: Record<string, unknown> = {}) =>
      task({ kind: 'decision', status: 'needsHuman', humanQuestion: 'Publish the taxonomy, or keep it internal?', ...extra })

    it('saves the answer and moves a waiting decision to queued, keeping the question — conditional on the revision read', async () => {
      routeOutreach({ task: decision(), availability: TEAM })
      const result = await answerTask({ ...juhan, answer: '  Keep it internal.\nRevisit in Q1.  ' })
      expect(result).toMatchObject({ ok: true, changed: true })
      const [patch] = patchesFor(TASK_ID)
      expect(setOf(patch)).toMatchObject({
        status: 'queued',
        humanResponse: 'Keep it internal.\nRevisit in Q1.',
        lastOutcome: 'Answered in Slack by Juhan',
        lastEvaluatedAt: NOW.toISOString(),
      })
      expect(setOf(patch).activity).toEqual([expect.objectContaining({ action: 'Answered in Slack', outcome: 'By Juhan' })])
      expect(unsetOf(patch)).not.toContain('humanQuestion')
      expect(opsOf(patch, 'ifRevisionId')[0][0]).toBe('rev1')
      // The fresh card: no longer waiting, the question kept, the roster's id for the mention.
      expect(result.task).toMatchObject({ status: 'queued', humanQuestion: 'Publish the taxonomy, or keep it internal?', slackUserId: 'UJUHAN' })
    })

    it('revises an answer without moving the work, and changes nothing for the same answer again', async () => {
      routeOutreach({ task: decision({ status: 'working', humanResponse: 'Publish it.' }), availability: TEAM })
      await expect(answerTask({ ...juhan, answer: 'Keep it internal.' })).resolves.toMatchObject({ ok: true, changed: true })
      expect(setOf(patchesFor(TASK_ID)[0])).toMatchObject({ status: 'working', humanResponse: 'Keep it internal.' })

      mocks.patches.length = 0
      routeOutreach({ task: decision({ status: 'queued', humanResponse: 'Keep it internal.' }), availability: TEAM })
      await expect(answerTask({ ...juhan, answer: 'Keep it internal.' })).resolves.toMatchObject({ ok: true, changed: false })
      expect(mocks.patches).toHaveLength(0)
    })

    it('refuses a closed decision, and an empty answer, in the one error shape', async () => {
      routeOutreach({ task: decision({ status: 'done' }), availability: TEAM })
      const closed = await answerTask({ ...juhan, answer: 'Yes.' })
      expect(closed).toMatchObject({ ok: false, message: 'Couldn’t save that answer — nothing changed. It’s already closed — press Reopen first.' })
      routeOutreach({ task: decision(), availability: TEAM })
      await expect(answerTask({ ...juhan, answer: '   ' })).resolves.toMatchObject({ ok: false })
      expect(mocks.patches).toHaveLength(0)
    })
  })

  it('still writes when the roster cannot be read — only the card’s mention id is lost', async () => {
    routeOutreach({ task: task(), availability: new Error('down') })
    const result = await markTaskDone(juhan)
    expect(result.ok).toBe(true)
    // Without a roster the stamped id is all there is.
    expect(result.task?.slackUserId).toBe('UERIC')
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

describe('runWeeklyCheckIn', () => {
  it('uses the UTC ISO week', () => {
    expect(utcIsoWeekKey(NOW)).toBe(WEEK)
    expect(utcIsoWeekKey(new Date('2026-01-01T00:30:00Z'))).toBe('2026-W01')
    expect(utcIsoWeekKey(new Date('2027-01-03T23:30:00Z'))).toBe('2026-W53')
  })

  it('dry run builds the real message and touches nothing', async () => {
    routeOutreach({ checkIn: checkInData() })
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true, botUserId: 'UBOT' })
    expect(result).toMatchObject({ ok: true, posted: false, week: WEEK, followUpCount: 1 })
    expect(result.detail).toMatch(/^Dry run for the week of Mon 21 Sep: /)
    expect(result.taskCount).toBe(2)
    expectValidSlackBlocks(result.blocks, { maxBlocks: 30 })
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
  })

  it('posts once to her own room, mentions from the roster, and records the run', async () => {
    slackEnv()
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1' } })
    mocks.postSlackMessage.mockResolvedValue({ channel: 'CMKTBOT', ts: '1790000000.0001' })
    const result = await runWeeklyCheckIn({ now: NOW, botUserId: 'UBOT' })
    expect(result).toMatchObject({ ok: true, posted: true, week: WEEK, ts: '1790000000.0001' })

    const [claim, record] = patchesFor(CHECKIN_HEARTBEAT_DOC_ID)
    expect(setOf(claim)).toEqual({ claimedWeek: WEEK, claimedAt: NOW.toISOString() })
    expect(opsOf(claim, 'ifRevisionId')[0][0]).toBe('h1')

    const post = mocks.postSlackMessage.mock.calls[0][0]
    expect(post).toMatchObject({ channel: 'CMKTBOT', username: 'Marqueta', iconEmoji: ':chart_with_upwards_trend:', unfurl: false })
    // The lock screen: mentions first, then what it is and how much.
    expect(post.text).toBe('<@UERIC> <@UJUHAN> — Thursday check-in: 3 open tasks, 1 follow-up (1 overdue)')
    const blocks: Block[] = post.blocks
    expectValidSlackBlocks(blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    expect(blocks[1].elements[0].text).toBe('Week of Mon 21 Sep · 2 working days left')
    expect(JSON.stringify(blocks)).not.toMatch(/2026-W39/)
    const ericHeading = sectionIndex(blocks, (text) => text.startsWith('*<@UERIC>*'))
    const juhanHeading = sectionIndex(blocks, (text) => text.startsWith('*<@UJUHAN>*'))
    const juhanTask = sectionIndex(blocks, (text) => text.includes('Call three past clients'))
    expect(ericHeading).toBeGreaterThan(-1)
    // Juhan's task sits under Juhan, whatever id is stamped on it.
    expect(juhanTask).toBeGreaterThan(juhanHeading)
    expect(juhanHeading).toBeGreaterThan(ericHeading)
    expect(blocks[juhanHeading].text.text).toBe('*<@UJUHAN>* · 1 task, 1 follow-up')
    expect(JSON.stringify(blocks)).toContain('Follow up with Riley Replied')
    // The room's card for the work nobody has, linked into the Studio.
    const nobody = sectionIndex(blocks, (text) => text === '*Nobody has taken*')
    expect(blocks[nobody + 1].text.text).toContain('https://www.goinvo.com/studio/marketing?view=thisWeek&task=marketingOperation.c3|Update the offer page')
    expect(blocks.at(-1)).toMatchObject({ block_id: CHECK_IN_FOOTER_BLOCK })

    expect(setOf(record)).toMatchObject({
      week: WEEK,
      postedWeek: WEEK,
      postedTs: '1790000000.0001',
      lastHealthyAt: NOW.toISOString(),
    })
    expect(setOf(record).steps[0]).toMatchObject({ name: 'checkin', ok: true, count: 3 })
    // Never "2026-W39" in a sentence: `Marqueta, tick` reads these out in Slack.
    expect(setOf(record).steps[0].detail).toMatch(/^Check-in posted for the week of Mon 21 Sep: /)
    expect(unsetOf(record)).toContain('error')
  })

  // The same task links to the same tab in every message: the check-in used
  // to read no targetView, so a content task the record files under SEO linked
  // to the Calendar here and to SEO in the Monday plan and `my tasks`.
  it('links each card where the record says it lives, as the Monday plan does', async () => {
    const seoTask = {
      _id: 'marketingOperation.meta',
      title: 'Fix the meta descriptions',
      ownerName: 'Juhan',
      kind: 'content',
      targetView: 'seo',
      status: 'working',
      dueAt: '2026-09-25T00:00:00Z',
    }
    routeOutreach({ checkIn: checkInData({ tasks: [seoTask], contacts: [] }) })
    expect(CHECK_IN_DATA_QUERY).toMatch(/\btargetView\b/)
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true })
    expect(JSON.stringify(result.blocks)).toContain('studio/marketing?view=seo&task=marketingOperation.meta|Fix the meta descriptions')
  })

  it('stands down when another run wins the claim', async () => {
    slackEnv()
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1' } })
    mocks.commit.mockImplementationOnce(async () => {
      throw conflict()
    })
    const result = await runWeeklyCheckIn({ now: NOW })
    expect(result).toMatchObject({ ok: true, skipped: true, skipReason: 'claimed', posted: false })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(patchesFor(CHECKIN_HEARTBEAT_DOC_ID)).toHaveLength(1)
  })

  it('skips a week already posted unless forced', async () => {
    slackEnv()
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1', postedWeek: WEEK, claimedWeek: WEEK } })
    await expect(runWeeklyCheckIn({ now: NOW })).resolves.toMatchObject({
      skipped: true,
      skipReason: 'alreadyPosted',
      detail: 'The check-in for the week of Mon 21 Sep was already posted.',
    })
    expect(mocks.patches).toHaveLength(0)

    mocks.postSlackMessage.mockResolvedValue({ channel: 'CMKTBOT', ts: '2.2' })
    await expect(runWeeklyCheckIn({ now: NOW, force: true })).resolves.toMatchObject({ posted: true })
  })

  it('never overrides a fresh claim, even with force; a stale one only with force', async () => {
    slackEnv()
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1', claimedWeek: WEEK, claimedAt: minutesAgo(2) } })
    await expect(runWeeklyCheckIn({ now: NOW, force: true })).resolves.toMatchObject({
      skipped: true,
      skipReason: 'claimed',
      detail: 'Another run is posting the check-in for the week of Mon 21 Sep.',
    })

    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1', claimedWeek: WEEK, claimedAt: minutesAgo(20) } })
    await expect(runWeeklyCheckIn({ now: NOW })).resolves.toMatchObject({
      skipped: true,
      skipReason: 'staleClaim',
      detail: 'A run claimed the check-in for the week of Mon 21 Sep 20 minutes ago and never posted. Run again with force=1 to post it.',
    })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()

    mocks.postSlackMessage.mockResolvedValue({ channel: 'CMKTBOT', ts: '3.3' })
    await expect(runWeeklyCheckIn({ now: NOW, force: true })).resolves.toMatchObject({ posted: true })
  })

  it('fails closed without her own channel — never the visitor-chat channel', async () => {
    slackEnv()
    delete process.env.SLACK_MARKETING_CHANNEL_ID
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1' } })
    const result = await runWeeklyCheckIn({ now: NOW })
    expect(result).toMatchObject({ ok: false, posted: false })
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    const [record] = patchesFor(CHECKIN_HEARTBEAT_DOC_ID)
    expect(setOf(record).error).toMatch(/SLACK_MARKETING_CHANNEL_ID/)
  })

  // A busy week: five people with four due tasks each. The follow-up nobody
  // owns — a contact who REPLIED — used to be appended after the message was
  // trimmed and silently dropped, while the run still counted it. The builder
  // now places it inside its own budget, so it cannot be the thing that did
  // not fit.
  it('keeps the "follow-ups nobody owns" line on a crowded week', async () => {
    const people = ['Ana', 'Ben', 'Cal', 'Dee', 'Eve']
    const busy = {
      tasks: people.flatMap((name) =>
        [1, 2, 3, 4].map((n) => ({
          _id: `marketingOperation.${name}-${n}`,
          title: `${name} task ${n}`,
          ownerName: name,
          status: 'queued',
          dueAt: daysFromNow(n),
          _createdAt: '2026-09-01T00:00:00Z',
          _updatedAt: '2026-09-15T00:00:00Z',
        })),
      ),
      availability: people.map((name) => ({ ownerName: name, slackUserId: `U${name.toUpperCase()}`, status: 'available' })),
      contacts: [
        {
          _id: 'marketingContact.orphan',
          name: 'Robin Replied',
          organization: 'Acme',
          owner: null,
          status: 'responded',
          followUpAt: daysFromNow(-3),
          interactions: [{ at: daysFromNow(-10), channel: 'email', statusAfter: 'responded' }],
        },
      ],
    }
    routeOutreach({ checkIn: busy })
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true })
    expect(result).toMatchObject({ ok: true, followUpCount: 1, taskCount: 20 })
    expectValidSlackBlocks(result.blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    const holder = result.blocks.find((block) => JSON.stringify(block).includes('Follow-ups nobody owns'))
    expect(holder?.type).toBe('context')
    expect(JSON.stringify(holder)).toContain('Robin Replied')
    // Each of the five is still asked, once.
    for (const name of people) expect(JSON.stringify(result.blocks).split(`<@U${name.toUpperCase()}>`)).toHaveLength(2)
    expect(result.detail).not.toMatch(/did not fit/)
  })

  it('puts the ownerless follow-ups with the other work nobody has, above the hints', async () => {
    routeOutreach({
      checkIn: checkInData({
        contacts: [
          {
            _id: 'marketingContact.orphan',
            name: 'Robin Replied',
            organization: 'Acme',
            status: 'responded',
            followUpAt: daysFromNow(-3),
            interactions: [{ at: daysFromNow(-10), channel: 'email', statusAfter: 'responded' }],
          },
        ],
      }),
    })
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true })
    expectValidSlackBlocks(result.blocks, { maxBlocks: MAX_CHECK_IN_BLOCKS })
    const texts = result.blocks.map((block) => JSON.stringify(block))
    const nobody = texts.findIndex((text) => text.includes('*Nobody has taken*'))
    const note = texts.findIndex((text) => text.includes('Follow-ups nobody owns: '))
    // The one line on how to talk to her: "Ask me", or on a week with nothing logged, the zero-touch hint.
    const hints = texts.findIndex((text) => /Ask me:|not on file\?/.test(text))
    expect(nobody).toBeGreaterThan(-1)
    expect(note).toBeGreaterThan(nobody)
    expect(note).toBeLessThan(hints)
  })

  // To the team — and to the watchdog — a skipped post looks exactly like a
  // job that died. So a week with nothing on anyone's list still posts, as
  // one line, and is recorded as a healthy run that had nothing to say.
  it('posts the one-line check-in on a week with nothing to say, and records it as healthy', async () => {
    slackEnv()
    routeOutreach({ checkIn: { tasks: [], availability: TEAM, contacts: [] }, heartbeat: { _rev: 'h1' } })
    mocks.postSlackMessage.mockResolvedValue({ channel: 'CMKTBOT', ts: '4.4' })
    const result = await runWeeklyCheckIn({ now: NOW })
    expect(result).toMatchObject({ ok: true, posted: true, taskCount: 0, followUpCount: 0 })

    const post = mocks.postSlackMessage.mock.calls[0][0]
    expect(post.text).toBe('Thursday check-in: nothing is on anyone’s list for this week or next.')
    expect(post.blocks).toHaveLength(1)
    expect(post.blocks[0].text.text).toMatch(/^\*Thursday check-in:\* nothing is on anyone’s list for this week or next\./)
    expectValidSlackBlocks(post.blocks)

    const [, record] = patchesFor(CHECKIN_HEARTBEAT_DOC_ID)
    // Read aloud (`Marqueta, tick` quotes it), so the week is in words; the key stays in the fields.
    expect(setOf(record).steps[0]).toMatchObject({ name: 'checkin', ok: true, count: 0, detail: 'Check-in posted for the week of Mon 21 Sep: nothing to say.' })
    expect(setOf(record)).toMatchObject({ week: WEEK, postedWeek: WEEK })
  })

  it('gives the claim back and records the failure when Slack refuses the post', async () => {
    slackEnv()
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1' } })
    mocks.postSlackMessage.mockResolvedValue(null)
    const result = await runWeeklyCheckIn({ now: NOW })
    expect(result).toMatchObject({ ok: false, posted: false })
    expect(result.detail).toMatch(/^Slack refused the check-in for the week of Mon 21 Sep \(/)
    const [, record] = patchesFor(CHECKIN_HEARTBEAT_DOC_ID)
    expect(setOf(record).steps[0]).toMatchObject({ name: 'checkin', ok: false, detail: result.detail })
    expect(setOf(record)).not.toHaveProperty('postedWeek')
    expect(unsetOf(record)).toEqual(expect.arrayContaining(['claimedWeek', 'claimedAt']))
  })
})

// ── Heartbeat + cron auth ────────────────────────────────────────────────────

describe('heartbeatHealth label', () => {
  it('names the job it is about, and keeps the tick’s wording by default', () => {
    expect(heartbeatHealth(null, NOW, 'Thursday check-in').summary).toBe(
      'The Thursday check-in has never run. Nothing is scheduled, so nothing is happening on its own.',
    )
    const healthy = { week: WEEK, ranAt: NOW.toISOString(), steps: [{ name: 'checkin' as const, ok: true, count: 3, detail: 'posted' }] }
    expect(heartbeatHealth(healthy, NOW, 'Thursday check-in').summary).toBe(`Thursday check-in ran today for ${WEEK}.`)
    expect(heartbeatHealth({ ...healthy, error: 'not_in_channel' }, NOW, 'Thursday check-in').summary).toMatch(
      /^The Thursday check-in last ran today and failed: not_in_channel/,
    )
    expect(heartbeatHealth(healthy, NOW).summary).toBe(`Weekly tick ran today for ${WEEK}.`)
    expect(heartbeatHealth(null, NOW).summary).toMatch(/^The weekly tick has never run/)
  })
})

describe('authorizeCron', () => {
  const request = (authorization?: string) => new Request('https://example.test/api/marketing/checkin', {
    headers: authorization ? { authorization } : {},
  })

  it('fails closed with no secret configured', () => {
    delete process.env.CRON_SECRET
    delete process.env.MARKETING_API_KEY
    const denied = authorizeCron(request('Bearer anything'))
    expect(denied).toBe('CRON_SECRET is not configured, so the tick cannot authenticate.')
    expect(cronDeniedStatus(denied!)).toBe(503)
    expect(authorizeCron(request(), 'the check-in')).toBe('CRON_SECRET is not configured, so the check-in cannot authenticate.')
  })

  it('accepts only the exact bearer secret, falling back to the API key', () => {
    process.env.CRON_SECRET = 'cron-secret'
    expect(authorizeCron(request('Bearer cron-secret'))).toBeNull()
    expect(authorizeCron(request('Bearer cron-secre'))).toBe('Unauthorized.')
    expect(authorizeCron(request())).toBe('Unauthorized.')
    expect(cronDeniedStatus('Unauthorized.')).toBe(401)

    delete process.env.CRON_SECRET
    process.env.MARKETING_API_KEY = 'api-key'
    expect(authorizeCron(request('Bearer api-key'))).toBeNull()
  })
})
