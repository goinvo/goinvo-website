/**
 * The Thursday check-in and the people who are away.
 *
 * Reviewer finding: the check-in @-mentioned people recorded as away — "<@U> —
 * here's what's on your list", with Done and Stuck buttons, and the mention in
 * the top-level text their phone reads. And the digest's "I'm away this week"
 * button files the absence under Slack's display name ("Jules Soren"), beside
 * the record the roster knows the person by ("Jules"), so a check by board name
 * alone would still have missed it. These pin both.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Op = [string, ...unknown[]]
type PatchRecord = { id: string; ops: Op[] }

const mocks = vi.hoisted(() => {
  const patches: PatchRecord[] = []
  const commit = vi.fn(async (record: PatchRecord) => record)
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
    patches,
    commit,
    outreach: { fetch: vi.fn(), createIfNotExists: vi.fn(async (doc: unknown) => doc), patch },
    postSlackMessage: vi.fn(),
  }
})

vi.mock('@/lib/marketing/outreachClient.server', () => ({
  getOutreachClient: () => mocks.outreach,
  isOutreachClientConfigured: () => true,
}))
vi.mock('@/lib/chat/slack', () => ({
  postSlackMessage: mocks.postSlackMessage,
  getSlackUserDisplayName: vi.fn(),
}))

import { hoursForWeek, statusOn, type TeamMemberAvailability } from '@/lib/marketing/availability'
import { CHECKIN_HEARTBEAT_DOC_ID } from '@/lib/marketing/heartbeat'
import { absencesOn, CHECK_IN_DATA_QUERY, runWeeklyCheckIn } from '@/lib/marketing/weeklyCheckIn.server'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Thursday 24 Sep 2026, 10am in Arlington. */
const NOW = new Date('2026-09-24T14:00:00Z')
const TODAY = '2026-09-24'

const ROSTER: TeamMemberAvailability[] = [
  { ownerName: 'Jules', slackUserId: 'UJULES', status: 'available' },
  { ownerName: 'Ezra', slackUserId: 'UEZRA', status: 'available' },
]
/** What "I'm away this week" writes: Slack's display name, the same Slack id. */
const JULES_AWAY: TeamMemberAvailability = {
  ownerName: 'Jules Soren',
  slackUserId: 'UJULES',
  status: 'away',
  from: '2026-09-21',
  until: '2026-09-27',
}

const task = (id: string, ownerName: string, extra: Record<string, unknown> = {}) => ({
  _id: `marketingOperation.${id}`,
  title: `${ownerName}’s task ${id}`,
  ownerName,
  status: 'queued',
  dueAt: '2026-09-22T00:00:00Z',
  _createdAt: '2026-09-01T00:00:00Z',
  _updatedAt: '2026-09-15T00:00:00Z',
  ...extra,
})

function checkInData(availability: TeamMemberAvailability[], extraTasks: Record<string, unknown>[] = []) {
  return {
    tasks: [task('j1', 'Jules'), task('j2', 'Jules'), task('e1', 'Ezra'), ...extraTasks],
    availability,
    contacts: [
      {
        _id: 'marketingContact.f1',
        name: 'Riley Replied',
        organization: 'Acme',
        owner: 'Jules',
        status: 'responded',
        followUpAt: '2026-09-23T14:00:00Z',
        interactions: [{ at: '2026-09-21T14:00:00Z', by: 'Jules', channel: 'phone', statusAfter: 'responded' }],
      },
    ],
  }
}

function route(availability: TeamMemberAvailability[], extraTasks: Record<string, unknown>[] = []) {
  mocks.outreach.fetch.mockImplementation(async (query: string) => {
    if (query === CHECK_IN_DATA_QUERY) return checkInData(availability, extraTasks)
    if (query.includes('postedWeek, claimedWeek')) return { _rev: 'h1' }
    throw new Error(`unexpected query: ${query.slice(0, 60)}`)
  })
}

const originalEnv = { ...process.env }

beforeEach(() => {
  mocks.patches.length = 0
  mocks.commit.mockClear()
  mocks.outreach.fetch.mockReset()
  mocks.outreach.createIfNotExists.mockClear()
  mocks.postSlackMessage.mockReset().mockResolvedValue({ channel: 'CMKTBOT', ts: '1790000000.0001' })
  process.env.SLACK_BOT_TOKEN = 'xoxb-test'
  process.env.SLACK_MARKETING_CHANNEL_ID = 'CMKTBOT'
  process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('the check-in and people who are away', () => {
  it('does not @-mention someone away — matched by Slack id when the record carries their display name', async () => {
    route([...ROSTER, JULES_AWAY])
    const result = await runWeeklyCheckIn({ now: NOW, botUserId: 'UBOT' })
    expect(result).toMatchObject({ ok: true, posted: true })

    const post = mocks.postSlackMessage.mock.calls[0][0]
    const blocks: Block[] = post.blocks
    expectValidSlackBlocks(blocks, { maxBlocks: 30 })
    // Not in the notification text, not in the blocks, and no buttons on his tasks.
    expect(post.text).not.toContain('<@UJULES>')
    expect(JSON.stringify(blocks)).not.toContain('<@UJULES>')
    expect(JSON.stringify(blocks)).not.toContain('marketingOperation.j1')
    // Ezra, who is here, is still asked.
    expect(post.text).toContain('<@UEZRA>')
    expect(JSON.stringify(blocks)).toContain('<@UEZRA> — here')

    // Named once, as plain text, with what is waiting — so the room can cover it.
    expect(JSON.stringify(blocks)).toContain('Away, so not asked this week: Jules (2 tasks, 1 follow-up).')
    expect(result.taskCount).toBe(1)
    expect(result.detail).toContain('1 person away, not asked')

    const record = mocks.patches.filter((patch) => patch.id === CHECKIN_HEARTBEAT_DOC_ID).at(-1)!
    const set = record.ops.find((op) => op[0] === 'set')![1] as Record<string, any>
    expect(set.steps[0]).toMatchObject({ name: 'checkin', ok: true })
  })

  it('also recognises an absence filed under the board name itself', async () => {
    route([{ ownerName: 'Jules', slackUserId: 'UJULES', status: 'away', from: '2026-09-21', until: '2026-09-27' }, ROSTER[1]])
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true })
    expect(result.text).not.toContain('<@UJULES>')
    expect(JSON.stringify(result.blocks)).not.toContain('<@UJULES>')
    expectValidSlackBlocks(result.blocks, { maxBlocks: 30 })
  })

  it('asks as usual once the absence is over', async () => {
    route([...ROSTER, { ...JULES_AWAY, from: '2026-09-07', until: '2026-09-13' }])
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true })
    expect(result.text).toContain('<@UJULES>')
    expect(JSON.stringify(result.blocks)).not.toContain('Away, so not asked')
  })

  it('escapes the away line — a name is record text', async () => {
    route(
      [...ROSTER, { ownerName: 'Dana <!here> & co', status: 'away', from: '2026-09-21', until: '2026-09-27' }],
      [task('d1', 'Dana <!here> & co')],
    )
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true })
    const text = JSON.stringify(result.blocks)
    expect(text).toContain('Away, so not asked this week: Dana &lt;!here&gt; &amp; co (1 task).')
    expect(text).not.toContain('<!here>')
    expectValidSlackBlocks(result.blocks, { maxBlocks: 30 })
  })
})

describe('absencesOn', () => {
  it('files an id-linked absence under every name that shares the id, ahead of "available"', () => {
    const { entries, isAway } = absencesOn([...ROSTER, JULES_AWAY], TODAY)
    // The name-keyed helpers now see the absence under the board's name.
    expect(statusOn(entries, 'Jules', TODAY)).toBe('away')
    expect(hoursForWeek({ entries, ownerName: 'Jules', dateKey: TODAY, defaultHours: 4 })).toBe(0)
    expect(statusOn(entries, 'Ezra', TODAY)).toBe('available')
    expect(isAway('Jules', undefined)).toBe(true)
    expect(isAway('Somebody', 'UJULES')).toBe(true)
    expect(isAway('Ezra', 'UEZRA')).toBe(false)
  })

  it('is exactly the roster when nobody is away today', () => {
    const { entries, isAway } = absencesOn([...ROSTER, JULES_AWAY], '2026-10-01')
    expect(entries).toEqual([...ROSTER, JULES_AWAY])
    expect(isAway('Jules', 'UJULES')).toBe(false)
  })
})
