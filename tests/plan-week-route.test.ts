/**
 * plan-week, against a mocked Sanity.
 *
 * What these pin is what the route adds around the pure planner: time held
 * back for follow-ups before the fill; the rows This week lays out (status,
 * blocker and owner on every row, the follow-ups due, the week's pulse and the
 * runway it was planned against); and that none of it carries a contact
 * detail — the contacts are read to NAME a follow-up, never to pass on how to
 * reach somebody.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

type Op = [string, ...unknown[]]
type PatchRecord = { id: string; ops: Op[] }

const mocks = vi.hoisted(() => {
  const patches: PatchRecord[] = []
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
    chain.commit = async () => ({})
    return chain
  })
  const client = () => ({ fetch: vi.fn(), patch, createIfNotExists: vi.fn() })
  return {
    patches,
    patch,
    /** plan-week's own client (it pins the outreach dataset with createClient). */
    planWeek: client(),
    outreach: client(),
    settings: client(),
    assertStudioWriterOrApiKey: vi.fn(async () => {}),
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
vi.mock('@/lib/marketing/outreachClient.server', () => ({ getOutreachClient: () => mocks.outreach }))
vi.mock('@/lib/marketing/client', () => ({ getMarketingWriteClientFor: () => mocks.settings }))
// plan-week only: its own pinned client, and no model (the week is named by Claude when a key exists).
vi.mock('@sanity/client', () => ({ createClient: () => mocks.planWeek }))
vi.mock('@/sanity/env', () => ({ apiVersion: '2025-01-01', dataset: 'production', projectId: 'test-project', writeToken: 'test-token' }))
vi.mock('@/lib/marketing/anthropicJson', () => ({
  isAnthropicConfigured: () => false,
  generateClaudeText: vi.fn(),
  parseJsonObject: vi.fn(),
  resolveMarketingModel: vi.fn(),
}))

import { GET as PLAN_WEEK_GET, POST as PLAN_WEEK_POST } from '@/app/api/marketing/plan-week/route'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Monday 21 Sep 2026, 9am in Boston. */
const NOW = new Date('2026-09-21T13:00:00Z')

const FOLLOW_UP_CONTACTS = [
  { _id: 'c-jane', name: 'Jane Doe', email: 'jane@mgb.org', organization: 'MGB', owner: 'juhan', status: 'responded', warmth: 'warm', followUpAt: '2026-09-18T14:00:00Z', interactions: [{ at: '2026-09-11T14:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'responded' }] },
  { _id: 'c-sam', name: 'sam.rivera@acme.org', email: 'sam.rivera@acme.org', organization: 'Acme', owner: 'Eric', status: 'contacted', warmth: 'cold', followUpAt: '2026-09-22T14:00:00Z', interactions: null },
  { _id: 'c-3', name: 'Ada Park', email: 'ada@x.org', organization: 'X Health', owner: 'Juhan', status: 'contacted', warmth: 'warm', followUpAt: '2026-09-23T14:00:00Z', interactions: [] },
  { _id: 'c-4', name: 'Bo Chen 617-555-0123', email: 'bo@y.org', organization: 'Y Clinic', owner: '', status: 'meeting', warmth: 'hot', followUpAt: '2026-09-24T14:00:00Z', interactions: [] },
]

const TEAM = [
  { ownerName: 'Juhan', slackUserId: 'UJUHAN' },
  { ownerName: 'Eric', slackUserId: 'UERIC' },
]

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

const planRequest = (method: 'GET' | 'POST', query = '') =>
  new NextRequest(`https://www.goinvo.com/api/marketing/plan-week${query}`, { method, headers: { authorization: 'Bearer key' } })

/** The operations, and the stored runway, as plan-week's own client returns them. */
function routePlanWeek(operations: Block[], stored: Block | null = null) {
  mocks.planWeek.fetch.mockImplementation(async (query: string) => {
    if (query.includes('"marketingOperation"')) return operations
    if (query.includes('posture, setAt, runway')) return stored
    return null
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  mocks.patches.length = 0
  mocks.patch.mockClear()
  for (const client of [mocks.planWeek, mocks.outreach, mocks.settings]) {
    client.fetch.mockReset()
    client.createIfNotExists.mockReset()
  }
  routePlanWeek([BIG_TASK])
  mocks.settings.fetch.mockResolvedValue({ weeklyMarketingHours: 4 })
  mocks.outreach.fetch.mockResolvedValue({ contacts: FOLLOW_UP_CONTACTS.slice(0, 3), team: TEAM })
  return () => {
    vi.useRealTimers()
  }
})

describe('plan-week reserves time for follow-ups', () => {
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

  it('reads the contacts through the pinned outreach client, drafts excluded, with no phone field or call note', async () => {
    await PLAN_WEEK_GET(planRequest('GET'))
    const [query] = mocks.outreach.fetch.mock.calls[0]
    expect(query).toContain('_type == "marketingContact"')
    expect(query).toContain('!(_id in path("drafts.**"))')
    // The log is read down to when/who/how/status: never what anybody wrote.
    expect(query).not.toMatch(/phone|note|summary|outcome/i)
  })

  it('never lets a contact detail out, though it reads names to say who a follow-up is with', async () => {
    mocks.outreach.fetch.mockResolvedValue({ contacts: FOLLOW_UP_CONTACTS, team: TEAM })
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    const json = JSON.stringify(body)
    expect(json).not.toMatch(/@(mgb|acme|x|y)\.org/)
    expect(json).not.toContain('617')
    expect(body.followUps.map((row: Block) => row.who)).toEqual(
      expect.arrayContaining(['Jane Doe (MGB)', 'Sam (Acme)', 'Bo Chen (Y Clinic)']),
    )
  })

  it('plans the week without a reservation when nobody is owed a call', async () => {
    mocks.outreach.fetch.mockResolvedValue({ contacts: [], team: TEAM })
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.followUpsDue).toBe(0)
    expect(body.reserved).toBeNull()
    expect(body.followUps).toEqual([])
    expect(body.items.map((item: Block) => item.id)).toEqual(['op-big'])
  })

  it('still plans when the contacts cannot be read, and says the count is unknown rather than zero', async () => {
    mocks.outreach.fetch.mockRejectedValue(new Error('outreach unavailable'))
    const response = await PLAN_WEEK_GET(planRequest('GET'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.followUpsDue).toBeNull()
    expect(body.reserved).toBeNull()
    // Unknown, not "no outreach logged yet".
    expect(body.pulse).toBeNull()
    expect(body.items.map((item: Block) => item.id)).toEqual(['op-big'])
  })

  it('records the reservation on the stored week', async () => {
    const response = await PLAN_WEEK_POST(planRequest('POST'))
    expect(response.status).toBe(200)
    const [document] = mocks.planWeek.createIfNotExists.mock.calls[0]
    expect(document.summary).toContain('Follow-ups: 3 (~45m reserved).')
    expect(document.sourceKey).toBe('weekly-plan/2026-W39')
    const set = mocks.patches.at(-1)!.ops.find((op) => op[0] === 'set')![1] as Record<string, unknown>
    expect(set.summary).toContain('Follow-ups: 3 (~45m reserved).')
  })
})

describe('plan-week gives This week what it lays out', () => {
  const OPERATIONS = [
    { ...BIG_TASK, _id: 'op-mine', title: 'Draft the pre-mortem article', estimatedMinutes: 30, ownerName: 'Shirley', status: 'working' },
    { ...BIG_TASK, _id: 'op-stuck', title: 'Pin the kit', estimatedMinutes: 20, ownerName: 'Juhan', status: 'blocked', blocker: 'Waiting on the PDF' },
    { ...BIG_TASK, _id: 'op-decision', title: 'Publish the taxonomy?', kind: 'decision', estimatedMinutes: 20, status: 'needsHuman', humanQuestion: 'Should we publish F1–F8?' },
    { ...BIG_TASK, _id: 'op-done', title: 'Old post', estimatedMinutes: 20, ownerName: 'Eric', status: 'done' },
    // The planner's own record of an earlier week: never planned, never listed.
    { ...BIG_TASK, _id: 'op-plan', title: 'Week of 2026-09-14', kind: 'update', status: 'working', sourceKey: 'weekly-plan/2026-W38' },
  ]

  it('puts status, blocker and owner on every row', async () => {
    routePlanWeek(OPERATIONS)
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()

    expect(body.items).toEqual([
      expect.objectContaining({ id: 'op-mine', owner: 'Shirley', status: 'working', blocker: null, kind: 'content' }),
    ])
    expect(body.decisions).toEqual([
      expect.objectContaining({ id: 'op-decision', owner: null, status: 'needsHuman', question: 'Should we publish F1–F8?', kind: 'decision' }),
    ])
    expect(body.deferred).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'op-stuck', owner: 'Juhan', status: 'blocked', blocker: 'Waiting on the PDF', reason: 'blocked' }),
        expect.objectContaining({ id: 'op-done', owner: 'Eric', status: 'done', reason: 'already done' }),
      ]),
    )
    const everyId = [...body.items, ...body.decisions, ...body.deferred].map((row: Block) => row.id)
    expect(everyId).not.toContain('op-plan')
  })

  it('lists the follow-ups due, worded as Slack words them, with owners named as the board names them', async () => {
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.followUps[0]).toEqual({
      contactId: 'c-jane',
      who: 'Jane Doe (MGB)',
      due: 'overdue since Fri 18 Sep',
      last: 'last: Responded on 11 Sep',
      temperature: 'they replied',
      overdue: true,
      // "juhan" on the contact, "Juhan" on the board: one person.
      ownerName: 'Juhan',
    })
    expect(body.followUps).toHaveLength(body.followUpsDue)
  })

  it('says how outreach is going this week, and which runway the week was planned against', async () => {
    const touched = {
      ...FOLLOW_UP_CONTACTS[2],
      interactions: [{ at: '2026-09-21T12:00:00Z', by: 'Juhan', channel: 'phone', statusAfter: 'contacted' }],
    }
    mocks.outreach.fetch.mockResolvedValue({ contacts: [FOLLOW_UP_CONTACTS[0], touched], team: TEAM })
    routePlanWeek([BIG_TASK], { runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-01T00:00:00Z' } })

    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.pulse).toMatch(/^Outreach this week: 1 touch \(1 person\)/)
    // 11 Jan 2027 is 3.5 months from 21 Sep — the stored date, read on the day.
    expect(body.runway).toBe('Rebuild — 3.5 months of certain runway (to 11 Jan 2027)')
    expect(body.posture).toBe('rebuild')
  })

  it('counts follow-ups in the header the way the rows under it do', async () => {
    // Thursday 24 Sep: one follow-up this ISO week (Wed 23), two early next
    // week (Tue 29, Wed 30). The rows look seven days ahead; the header used
    // to count to Sunday only, and said 1 above a section of 3.
    vi.setSystemTime(new Date('2026-09-24T14:00:00Z'))
    const contact = (id: string, followUpAt: string) => ({ ...FOLLOW_UP_CONTACTS[2], _id: id, followUpAt, interactions: [] })
    mocks.outreach.fetch.mockResolvedValue({
      contacts: [contact('c-23', '2026-09-23T14:00:00Z'), contact('c-29', '2026-09-29T14:00:00Z'), contact('c-30', '2026-09-30T14:00:00Z')],
      team: TEAM,
    })
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.followUps).toHaveLength(3)
    expect(body.followUpsDue).toBe(3)
    expect(body.reserved.label).toBe('Follow-ups: 3 (~45m reserved)')
    const said = Number(/(\d+) follow-ups? waiting/.exec(body.pulse)?.[1])
    expect(said).toBe(body.followUps.length)
    // …and the overdue count is the rows' too.
    expect(body.pulse).toContain(`${body.followUps.filter((row: Block) => row.overdue).length} overdue`)
  })

  it('carries what This week needs to act on a row: a decision’s revision, and when done work was done', async () => {
    routePlanWeek([
      { ...BIG_TASK, _id: 'op-decision', _rev: 'rev-7', kind: 'decision', estimatedMinutes: 20, status: 'needsHuman', humanQuestion: 'Publish?' },
      { ...BIG_TASK, _id: 'op-done', estimatedMinutes: 20, status: 'done', completedAt: '2026-09-21T15:00:00Z' },
    ])
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.decisions).toEqual([expect.objectContaining({ id: 'op-decision', rev: 'rev-7' })])
    expect(body.deferred).toEqual([expect.objectContaining({ id: 'op-done', completedAt: '2026-09-21T15:00:00Z' })])
    const [query] = mocks.planWeek.fetch.mock.calls.find(([q]) => String(q).includes('"marketingOperation"'))!
    expect(query).toContain('_rev')
    expect(query).toContain('completedAt')
  })

  it('says nothing about the runway when the runway could not be read, rather than "no date recorded"', async () => {
    mocks.planWeek.fetch.mockImplementation(async (query: string) => {
      if (query.includes('"marketingOperation"')) return [BIG_TASK]
      if (query.includes('posture, setAt, runway')) throw new Error('read failed')
      return null
    })
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.runway).toBeNull()
    expect(body.posture).toBe('survival')

    // A record that genuinely has no date says so.
    routePlanWeek([BIG_TASK], null)
    const empty = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(empty.runway).toBe('Survival — no runway date recorded')
  })

  it('says when a posture set by hand is overriding the runway date', async () => {
    routePlanWeek([BIG_TASK], {
      posture: 'survival',
      setAt: '2026-09-10T00:00:00Z',
      runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-01T00:00:00Z' },
    })
    const body = await (await PLAN_WEEK_GET(planRequest('GET'))).json()
    expect(body.runway).toBe('Survival — 3.5 months of certain runway (to 11 Jan 2027) · posture set by hand')
  })
})
