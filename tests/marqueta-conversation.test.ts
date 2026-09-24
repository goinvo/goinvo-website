/**
 * Talking to Marqueta, end to end below Slack: what `answerMarqueta` answers
 * (against a mocked Sanity client, through the real prep / call-log / team
 * server modules) and how the events route delivers it.
 *
 * What these pin, in the order it would hurt to lose them:
 *   - a guest (or a profile Slack will not return) gets nothing outreach- or
 *     money-related, and no record is read on their behalf;
 *   - contact details never enter a channel message;
 *   - a call is logged from a message only when all of it is certain, under
 *     the presser's BOARD name, keyed on the message so a retry is a no-op,
 *     and with an Undo that can take it back;
 *   - Slack gets its 200 before any of this runs, and a timed-out retry does
 *     not produce a second answer;
 *   - the silent capture path in watched channels is exactly what it was.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  return {
    patches,
    commit,
    outreach: { fetch: vi.fn(), patch, createIfNotExists: vi.fn(async (doc: unknown) => doc) },
    afterQueue: [] as Array<() => unknown>,
    getSlackUserProfile: vi.fn(),
    getSlackUserDisplayName: vi.fn(),
    getSlackBotUserId: vi.fn(),
    postSlackMessage: vi.fn(),
    postSlackEphemeral: vi.fn(),
    verifySlackRequest: vi.fn(() => true),
    loadStrategySnapshot: vi.fn(),
    captureFromMessage: vi.fn(),
    ideasNeedingReview: vi.fn(),
    ideaCount: vi.fn(),
    appendDisputeNoteFromSlack: vi.fn(),
  }
})

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>()
  return { ...actual, after: (task: () => unknown) => void mocks.afterQueue.push(task) }
})
vi.mock('@/lib/chat/slack', () => ({
  getSlackConfig: () => ({ botToken: 'xoxb-test', channelId: 'CCHAT', signingSecret: 'secret' }),
  getSlackUserProfile: mocks.getSlackUserProfile,
  getSlackUserDisplayName: mocks.getSlackUserDisplayName,
  getSlackBotUserId: mocks.getSlackBotUserId,
  postSlackMessage: mocks.postSlackMessage,
  postSlackEphemeral: mocks.postSlackEphemeral,
  verifySlackRequest: mocks.verifySlackRequest,
  getSlackPermalink: vi.fn(async () => undefined),
}))
vi.mock('@/lib/marketing/outreachClient.server', () => ({
  getOutreachClient: () => mocks.outreach,
  isOutreachClientConfigured: () => true,
}))
vi.mock('@/lib/marketing/strategyCheck.server', () => ({ loadStrategySnapshot: mocks.loadStrategySnapshot }))
vi.mock('@/lib/marketing/ideaCapture.server', () => ({
  captureFromMessage: mocks.captureFromMessage,
  ideasNeedingReview: mocks.ideasNeedingReview,
}))
// The idea count reads through the same routed client as ideasNeedingReview.
vi.mock('@/lib/marketing/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing/client')>()
  return { ...actual, getMarketingWriteClientFor: () => ({ fetch: mocks.ideaCount }) }
})
vi.mock('@/lib/chat/sanity', () => ({ getChatSanityClient: () => null }))
vi.mock('@/lib/shop/disputeChat', () => ({ appendDisputeNoteFromSlack: mocks.appendDisputeNoteFromSlack }))
// The real answerMarqueta, wrapped so the route tests can stand in for it.
vi.mock('@/lib/marketing/marquetaChat.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/marketing/marquetaChat.server')>()
  return { ...actual, answerMarqueta: vi.fn(actual.answerMarqueta) }
})

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/slack/events/route'
import type { TeamMemberAvailability } from '@/lib/marketing/availability'
import { PREP_DATA_QUERY, scrubPrepCandidates, type PrepData, type PrepDataContact } from '@/lib/marketing/callPrep.server'
import { CHECKIN_HEARTBEAT_DOC_ID, HEARTBEAT_DOC_ID } from '@/lib/marketing/heartbeat'
import {
  decodeAvailabilityUndo,
  decodeCallLogUndo,
  decodeContactRef,
  MARQUETA_ACTION,
  checkInTaskBlockId,
} from '@/lib/marketing/marquetaActions'
import {
  answerMarqueta,
  HEARTBEAT_QUERY,
  IDEAS_PENDING_COUNT_QUERY,
  MINE_DATA_QUERY,
  readTimeOff,
  WEEK_QUERY,
  type MarquetaReply,
} from '@/lib/marketing/marquetaChat.server'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { AVAILABILITY_WRITE_QUERY, OWNED_OPEN_TASKS_QUERY } from '@/lib/marketing/slackActions.server'
import { MARKETING_ACTION } from '@/lib/marketing/slackDelegation'
import { TEAM_AVAILABILITY_QUERY } from '@/lib/marketing/team.server'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Thursday 24 Sep 2026, 10am in Arlington. */
const NOW = new Date('2026-09-24T14:00:00Z')
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString()

const TEAM: TeamMemberAvailability[] = [
  { ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available' },
  { ownerName: 'Eric', slackUserId: 'UERIC', status: 'available' },
]

const MEMBER = { ok: true, name: 'Juhan Sonin', isGuest: false, isBot: false }

const JANE: PrepDataContact = {
  _id: 'contact-jane',
  name: 'Jane Doe',
  organization: 'Acme Health',
  role: 'CMIO',
  status: 'new',
  warmth: 'unknown',
  email: 'jane.doe@acmehealth.org',
  phone: '617-555-0142',
}

const ATT: PrepDataContact = {
  _id: 'contact-att',
  name: 'Sam Rivera',
  organization: 'AT&T',
  role: 'VP Health',
  status: 'new',
  warmth: 'warm',
  howWeKnow: 'Met at HIMSS',
}

const prepData = (contacts: PrepDataContact[] = [JANE, ATT]): PrepData => ({ contacts, research: [], offers: [], evidence: [] })

type Fixtures = {
  prep?: PrepData | Error
  availability?: TeamMemberAvailability[] | Error
  /** The one availability record the write reads before patching it. */
  availabilityRecord?: Record<string, unknown> | null
  /** How many open tasks the person owns (for "your 2 open tasks"). */
  openTasks?: number
  logContact?: Record<string, unknown> | null
  mine?: Record<string, unknown>
  week?: unknown[]
  heartbeat?: Record<string, unknown>
}

/** Answer each query the way the dataset would. Anything unrouted is a test bug, loudly. */
function routeOutreach(fixtures: Fixtures) {
  mocks.outreach.fetch.mockImplementation(async (query: string) => {
    if (query === PREP_DATA_QUERY) {
      if (fixtures.prep instanceof Error) throw fixtures.prep
      return fixtures.prep ?? prepData()
    }
    if (query === TEAM_AVAILABILITY_QUERY) {
      if (fixtures.availability instanceof Error) throw fixtures.availability
      return fixtures.availability ?? TEAM
    }
    // callLog.server's read of one contact for a log.
    if (query.includes('"marketingContact" && _id == $id') && query.includes('closeReason')) return fixtures.logContact ?? null
    if (query === MINE_DATA_QUERY) return fixtures.mine ?? { tasks: [], contacts: [] }
    if (query === WEEK_QUERY) return fixtures.week ?? []
    if (query === HEARTBEAT_QUERY) return fixtures.heartbeat ?? {}
    if (query === AVAILABILITY_WRITE_QUERY) return fixtures.availabilityRecord ?? null
    if (query === OWNED_OPEN_TASKS_QUERY) return fixtures.openTasks ?? 2
    throw new Error(`unrouted query: ${query.slice(0, 80)}`)
  })
}

const pulseFor = (from: string, to: string) => summarizeOutreach([], { from, to, now: NOW })

/** What loadStrategySnapshot returns: the September check, with the runway due for a check-in. */
const STRATEGY_LOAD = {
  snapshot: {
    monthKey: '2026-09',
    money: '3.5 months of runway, to 11 Jan 2027.',
    postureId: 'rebuild',
    postureTitle: 'Rebuild',
    postureStrategy: 'Outreach leads.',
    thisMonth: pulseFor('2026-09-01', '2026-10-01'),
    lastMonth: null,
    trend: 'First month on record.',
    pipeline: { inMeeting: 2, inOpportunity: 1, estimatedValue: 45000, wonThisMonth: 1, wonValueThisMonth: 12000 },
    gates: [],
    question: 'Is outreach getting the hours it needs?',
  },
  review: null,
  due: { due: true, reason: 'Never checked.' },
  runway: {
    summary: '3.5 months of runway, to 11 Jan 2027.',
    resolved: { id: 'rebuild', source: 'runway', months: 3.5, certainUntil: '2027-01-11', disagreement: null },
    checkIn: { due: true, urgent: false, reason: 'Acme was marked won on 20 Sep —', question: 'did it extend the runway?' },
  },
  latestWin: null,
  openRethink: null,
  contacts: [],
}

const ask = (text: string, overrides: Partial<Parameters<typeof answerMarqueta>[0]> = {}) =>
  answerMarqueta({
    text,
    personName: 'Juhan Sonin',
    slackUserId: 'UJUHAN',
    channel: 'C1',
    ts: '1727182800.000100',
    botUserId: 'UBOT',
    now: NOW,
    ...overrides,
  }) as Promise<MarquetaReply>

const allText = (reply: MarquetaReply) => JSON.stringify([reply.text, reply.blocks, reply.thread])
const buttonsIn = (blocks: Block[] = []) =>
  blocks.flatMap((block) => [...(block.elements || []), ...(block.accessory ? [block.accessory] : [])]).filter((element: Block) => element.type === 'button')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.patches.length = 0
  mocks.afterQueue.length = 0
  mocks.commit.mockImplementation(async () => ({}))
  mocks.getSlackUserProfile.mockResolvedValue(MEMBER)
  mocks.getSlackUserDisplayName.mockResolvedValue('Juhan Sonin')
  mocks.getSlackBotUserId.mockResolvedValue('UBOT')
  mocks.postSlackMessage.mockImplementation(async (input: { channel: string }) => ({ channel: input.channel, ts: '1727182900.000200' }))
  mocks.postSlackEphemeral.mockResolvedValue(true)
  mocks.verifySlackRequest.mockReturnValue(true)
  routeOutreach({})
  delete process.env.SLACK_MARKETING_CHANNEL_ID
  delete process.env.MARKETING_PUBLIC_BASE_URL
  // C1 — where `ask` talks to her — is a marketing channel she is configured
  // for; the audience gate is exercised with other ids below.
  process.env.SLACK_MARKETING_CHANNEL_IDS = 'C1'
})

afterEach(() => {
  delete process.env.SLACK_MARKETING_CHANNEL_ID
  delete process.env.SLACK_MARKETING_CHANNEL_IDS
})

// ── Who may ask ──────────────────────────────────────────────────────────────

describe('the team-only gate', () => {
  it('tells a guest no, and reads nothing on their behalf', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Client', isGuest: true, isBot: false })
    for (const text of ['prep Jane Doe at Acme Health', 'runway', 'my tasks', 'called Jane Doe, left a voicemail', 'pipeline', 'who’s Jane Doe', 'we signed Acme for 3 months']) {
      const reply = await ask(`<@UBOT> ${text}`)
      // Never whether a contact exists: the same sentence whatever was asked.
      expect(reply.text).toBe('That’s for the GoInvo team, so I’ll leave it there.')
      expect(reply.blocks).toBeUndefined()
    }
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    expect(mocks.loadStrategySnapshot).not.toHaveBeenCalled()
    expect(mocks.patches).toHaveLength(0)
  })

  it('fails closed when Slack will not say who is asking', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: false })
    const reply = await ask('<@UBOT> strategy')
    // A failure is for the asker alone: nothing in the room, no buttons.
    expect(reply.text).toBe('')
    expect(reply.blocks).toBeUndefined()
    expect(reply.ephemeral).toMatch(/Couldn’t check who you are/)
    expect(mocks.loadStrategySnapshot).not.toHaveBeenCalled()
  })

  it('still answers help and files a capture for anybody', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Client', isGuest: true, isBot: false })
    // A guest's hello gets the guest help: what she is, not what she holds.
    const help = await ask('<@UBOT> hello?')
    expect(help.text).toMatch(/for the GoInvo team/)
    expect(help.text).not.toMatch(/runway|my calls|@Marqueta/)

    mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'idea', idea: { title: 'Booth at Town Day' } })
    const capture = await ask('<@UBOT> capture a booth at Town Day with stickers')
    expect(mocks.captureFromMessage).toHaveBeenCalledTimes(1)
    expect(capture.text).toContain('Booth at Town Day')
  })
})

// ── Reading what Slack delivered ─────────────────────────────────────────────

describe('decoding', () => {
  it('decodes the event text exactly once, then escapes on the way out', async () => {
    const reply = await ask('<@UBOT> prep Sam Rivera at AT&amp;T')
    // Found by the decoded name, rendered escaped once — never "&amp;amp;".
    expect(reply.text).toContain('Sam Rivera')
    expect(allText(reply)).toContain('AT&amp;T')
    expect(allText(reply)).not.toContain('&amp;amp;')
    expectValidSlackBlocks(reply.blocks!)
  })

  it('strips a typed "Marqueta," as well as her mention', async () => {
    const reply = await ask('Marqueta, prep Jane Doe at Acme Health', { botUserId: undefined })
    expect(reply.text).toContain('Jane Doe')
  })

  it('files a capture with the decoded text, so the board shows what was typed', async () => {
    mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'idea', idea: { title: 'AT&T webinar' } })
    await ask('<@UBOT> capture: an AT&amp;T webinar on &lt;5% adoption')
    expect(mocks.captureFromMessage.mock.calls[0][0].text).toBe('an AT&T webinar on <5% adoption')
  })
})

// ── Call prep ────────────────────────────────────────────────────────────────

describe('prep', () => {
  it('keeps contact details out of a channel and hands them over privately', async () => {
    const reply = await ask('<@UBOT> prep Jane Doe at Acme Health')
    expect(reply.blocks?.length).toBeGreaterThan(0)
    expect(reply.thread?.blocks.length).toBeGreaterThan(0)
    expect(allText(reply)).not.toContain('jane.doe@acmehealth.org')
    expect(allText(reply)).not.toContain('555-0142')
    expect(reply.ephemeral).toContain('jane.doe@acmehealth.org')
    expect(reply.ephemeral).toContain('617-555-0142')
    expectValidSlackBlocks(reply.blocks!)
    expectValidSlackBlocks(reply.thread!.blocks)
    // A contact on file gets "Log how it went" for that contact.
    const log = buttonsIn(reply.blocks).find((element) => element.action_id === MARQUETA_ACTION.logCall)
    expect(decodeContactRef(log?.value)?.contactId).toBe('contact-jane')
  })

  it('puts them inline in a DM, where nobody else can read them', async () => {
    const reply = await ask('prep Jane Doe at Acme Health', { channel: 'D1' })
    expect(reply.ephemeral).toBeUndefined()
    expect(JSON.stringify(reply.blocks)).toContain('jane.doe@acmehealth.org')
    expectValidSlackBlocks(reply.blocks!)
  })

  it('answers a failed read in words rather than half an outline', async () => {
    routeOutreach({ prep: new Error('sanity down') })
    const reply = await ask('<@UBOT> prep Jane Doe at Acme Health')
    expect(reply.blocks).toBeUndefined()
    expect(reply.text).toBe('')
    expect(reply.ephemeral).toMatch(/^Couldn’t read the outreach records just now — nothing changed\./)
    // The call list fails the same way.
    const list = await ask('<@UBOT> my calls')
    expect(list).toMatchObject({ text: '', ephemeral: expect.stringMatching(/^Couldn’t read the outreach records/) })
  })

  it('gives the call list for "my calls", as the requester’s list', async () => {
    routeOutreach({ prep: prepData([JANE, { ...ATT, owner: 'Juhan', status: 'contacted', followUpAt: daysFromNow(-1) }]) })
    const reply = await ask('<@UBOT> my calls')
    expect(reply.text).toBe('Calls for Juhan — 1 call worth making, 1 overdue')
    expect(reply.blocks?.length).toBeGreaterThan(0)
    expect(JSON.stringify(reply.blocks)).toContain('Calls for Juhan')
    expectValidSlackBlocks(reply.blocks!)
  })
})

// ── Logging a call from a message ────────────────────────────────────────────

describe('logging a call from a message', () => {
  const KEY = 'slack-msg-C1-1727182800.000100'

  it('logs it at once — under the board name, keyed on the message — with an Undo', async () => {
    routeOutreach({ logContact: { ...JANE, _rev: 'rev-1', interactions: [] } })
    const reply = await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail')

    // Thursday + three days is Sunday: the follow-up lands on Monday.
    expect(reply.text).toBe(
      ':white_check_mark: <@UJUHAN> logged a voicemail for Jane Doe (Acme Health). Status: Contacted (was New). Next follow-up Mon 28 Sep.',
    )
    expect(mocks.patches).toHaveLength(1)
    const ops = mocks.patches[0].ops
    expect(ops).toContainEqual(['ifRevisionId', 'rev-1'])
    const insert = ops.find((op) => op[0] === 'insert') as [string, string, string, Record<string, unknown>[]]
    expect(insert[3][0]).toMatchObject({ _key: KEY, by: 'Juhan', outcome: 'Left a voicemail' })

    const undo = buttonsIn(reply.blocks).find((element) => element.action_id === MARQUETA_ACTION.callLogUndo)
    expect(decodeCallLogUndo(undo?.value)).toMatchObject({ contactId: 'contact-jane', interactionKey: KEY })
    expectValidSlackBlocks(reply.blocks!)
  })

  it('writes nothing the second time the same message arrives', async () => {
    routeOutreach({ logContact: { ...JANE, _rev: 'rev-2', interactions: [{ _key: KEY }] } })
    const reply = await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail')
    expect(mocks.patches).toHaveLength(0)
    expect(reply.text).toMatch(/Already logged/)
    expect(reply.blocks).toBeUndefined()
  })

  it('offers the form, prefilled, when the outcome is not certain', async () => {
    const reply = await ask('<@UBOT> spoke with Jane Doe at Acme Health about the pilot')
    expect(mocks.patches).toHaveLength(0)
    const log = buttonsIn(reply.blocks).find((element) => element.action_id === MARQUETA_ACTION.logCall)
    const ref = decodeContactRef(log?.value)
    expect(ref).toMatchObject({ contactId: 'contact-jane', outcome: '' })
    expect(ref?.note).toContain('spoke with Jane Doe')
    expectValidSlackBlocks(reply.blocks!)
  })

  it('offers the form when the Undo could not take the write back exactly', async () => {
    // A lost contact picking up reopens it; a close reason this long cannot
    // ride in an Undo button, so the one-press write must not happen.
    const lost = { ...JANE, status: 'lost', closedAt: '2026-03-01T00:00:00Z', closedValue: 0, closeReason: 'x'.repeat(900) }
    routeOutreach({ prep: prepData([lost, ATT]), logContact: { ...lost, _rev: 'rev-3', interactions: [{ _key: 'old' }] } })
    const reply = await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail')
    expect(mocks.patches).toHaveLength(0)
    const log = buttonsIn(reply.blocks).find((element) => element.action_id === MARQUETA_ACTION.logCall)
    expect(decodeContactRef(log?.value)).toMatchObject({ contactId: 'contact-jane', outcome: 'voicemail' })
    // A next step, not a failure: it stays in the thread, with the form.
    expect(reply.text).toBe('*Jane Doe (Acme Health)* — this one needs the form, because I couldn’t undo it cleanly from here. Your note’s already in it.')
  })

  it('says a failed save to the person who asked alone — no button, nothing in the room', async () => {
    routeOutreach({ logContact: { ...JANE, _rev: 'rev-1', interactions: [] } })
    mocks.commit.mockRejectedValueOnce(new Error('sanity down'))
    const reply = await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail')
    expect(reply.text).toBe('')
    expect(reply.blocks).toBeUndefined()
    expect(reply.ephemeral).toMatch(/^Couldn’t log that — nothing changed\./)

    routeOutreach({ prep: new Error('sanity down') })
    expect(await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail')).toEqual({
      text: '',
      ephemeral: expect.stringMatching(/^Couldn’t reach the outreach records just now — nothing changed\./),
    })
  })

  it('never promises "and log it" for somebody new when the outcome would close them or set them aside', async () => {
    // A new contact is New; "not a fit" would close it the moment it exists —
    // the move a contact already on file is asked about first.
    for (const [text, word] of [
      ['called Alex Chen at Beacon Health, not a fit', 'not a fit'],
      ['spoke to Alex Chen at Beacon Health, not right now', 'not right now'],
    ] as const) {
      const reply = await ask(`<@UBOT> ${text}`)
      const add = buttonsIn(reply.blocks)
      expect(add.map((element) => element.text.text), text).toEqual(['Add Alex Chen to outreach'])
      // The outcome still rides along — it prefills the form that follows the add.
      expect(decodeContactRef(add[0].value)?.outcome, text).toBe(word === 'not a fit' ? 'notAFit' : 'notNow')
      expect(reply.text).toBe('*Alex Chen (Beacon Health)* isn’t in outreach yet.')
      expect(String(reply.blocks![0].text.text)).toContain(`Sounds like *${word}* — that marks Alex Chen (Beacon Health)`)
      expectValidSlackBlocks(reply.blocks!)
    }
    expect(mocks.patches).toHaveLength(0)
  })

  it('does not write when the team list cannot be read to name the caller', async () => {
    routeOutreach({ availability: new Error('roster down'), logContact: { ...JANE, _rev: 'r', interactions: [] } })
    const reply = await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail')
    expect(mocks.patches).toHaveLength(0)
    expect(buttonsIn(reply.blocks).map((element) => element.action_id)).toEqual([MARQUETA_ACTION.logCall])
  })

  it('offers to add somebody who is not on file — without the call as "how we know them"', async () => {
    const reply = await ask('<@UBOT> called Priya Patel at Northwind Clinic, no answer')
    expect(mocks.patches).toHaveLength(0)
    // One press adds them and logs it: what happened was clear.
    const add = buttonsIn(reply.blocks).find((element) => element.action_id === MARQUETA_ACTION.addContact)
    expect(add?.text.text).toBe('Add Priya Patel and log it')
    expect(buttonsIn(reply.blocks)).toHaveLength(1)
    const ref = decodeContactRef(add?.value)
    expect(ref).toMatchObject({ name: 'Priya Patel', organization: 'Northwind Clinic', outcome: 'noAnswer', note: '' })
    expectValidSlackBlocks(reply.blocks!)
  })

  it('asks which one when a first name fits several people — each with its own Log button', async () => {
    const janeSmith: PrepDataContact = { _id: 'contact-jane-2', name: 'Jane Smith', organization: 'Beta Labs', status: 'new' }
    routeOutreach({ prep: prepData([JANE, janeSmith]) })
    const reply = await ask('<@UBOT> called Jane, no answer')
    expect(mocks.patches).toHaveLength(0)
    const ids = buttonsIn(reply.blocks)
      .filter((element) => element.action_id === MARQUETA_ACTION.logCall)
      .map((element) => decodeContactRef(element.value)?.contactId)
    expect(ids.sort()).toEqual(['contact-jane', 'contact-jane-2'])
    expectValidSlackBlocks(reply.blocks!)
  })

  it('asks rather than logs when only the organisation was named', async () => {
    const reply = await ask('<@UBOT> called Acme Health, no answer')
    expect(mocks.patches).toHaveLength(0)
    expect(reply.text).toMatch(/Was that \*Jane Doe \(Acme Health\)\*/)
    expect(buttonsIn(reply.blocks).map((element) => element.action_id)).toEqual([MARQUETA_ACTION.logCall])
  })

  it('never adds an address from the record to what it posts in the channel', async () => {
    // Imported contacts often hold an address in `name` and even `organization`.
    const imported: PrepDataContact = { _id: 'contact-imported', name: 'jd@mgb.org', organization: 'jd@mgb.org', status: 'new' }
    routeOutreach({ prep: prepData([imported]) })
    const typed = '<@UBOT> emailed jd@mgb.org about the kit, she wants to talk'

    // The form path (no board name to log it under, so no one-press write):
    // the button carries a label and a scrubbed organisation. (The note is
    // the person's own message, already in the channel.)
    routeOutreach({ prep: prepData([imported]), availability: new Error('roster down') })
    const offered = await ask(typed)
    const ref = decodeContactRef(buttonsIn(offered.blocks)[0]?.value)
    expect(ref).toMatchObject({ contactId: 'contact-imported', organization: '', outcome: 'interested' })
    expect(ref?.name).not.toContain('@')
    expect(offered.text).not.toContain('jd@mgb.org')

    // The one-press path: the confirmation names nobody by address either.
    routeOutreach({ prep: prepData([imported]), logContact: { ...imported, _rev: 'r1', interactions: [] } })
    const logged = await ask(typed, { ts: '1727182800.000200' })
    expect(logged.text).toMatch(/logged that .+ is interested/)
    expect(JSON.stringify(logged.blocks)).not.toContain('jd@mgb.org')
    expect(logged.text).not.toContain('jd@mgb.org')
  })

  it('never names a place by an address when it asks which one — not in text, blocks or button values', async () => {
    // The newsletter import put addresses in `organization`; "Acme" matches
    // that record's domain as well as Acme Health.
    const addressAsOrg: PrepDataContact = { _id: 'contact-addr', name: 'jane@acme.org', organization: 'jane@acme.org', status: 'new' }
    const acme: PrepDataContact = { _id: 'contact-acme', name: 'Bob Roe', organization: 'Acme Health', status: 'new' }
    routeOutreach({ prep: prepData([addressAsOrg, acme]) })
    for (const text of ['called Acme, no answer', 'prep Acme']) {
      const reply = await ask(`<@UBOT> ${text}`)
      const posted = JSON.stringify([reply.text, reply.blocks, reply.thread])
      expect(posted, text).not.toContain('jane@acme.org')
      expect(posted, text).not.toContain('@')
      for (const button of buttonsIn(reply.blocks)) {
        const ref = decodeContactRef(button.value)
        expect(JSON.stringify(ref), text).not.toContain('@')
      }
      if (reply.blocks) expectValidSlackBlocks(reply.blocks)
    }
    expect(mocks.patches).toHaveLength(0)
  })

  it('scrubs "which one" candidates: an address is never a label or a button value', () => {
    expect(
      scrubPrepCandidates([
        { label: 'Someone at jane@acme.org', organization: 'jane@acme.org' },
        { label: 'Someone at Acme Health', organization: 'Acme Health' },
        { label: 'someone at jd@mgb.org, CMIO', contactId: 'c1', organization: 'jd@mgb.org' },
        { label: 'Jane Doe, CMIO — Acme Health', contactId: 'c2', organization: 'Acme Health' },
      ]),
    ).toEqual([
      { label: 'Someone at Acme Health', organization: 'Acme Health' },
      { label: 'Someone with no name on file, CMIO', organization: '', contactId: 'c1' },
      { label: 'Jane Doe, CMIO — Acme Health', organization: 'Acme Health', contactId: 'c2' },
    ])
  })

  it('asks who, rather than guessing, when the message names nobody', async () => {
    const reply = await ask('<@UBOT> left a voicemail')
    expect(reply.text).toBe(
      'Who was that with? Say `Marqueta, called Jane Doe at MGB, left a voicemail`, or press Log it… next to them in `Marqueta, my calls`.',
    )
    expect(mocks.outreach.fetch).not.toHaveBeenCalledWith(PREP_DATA_QUERY)
  })
})

// ── "My tasks" ───────────────────────────────────────────────────────────────

describe('my tasks', () => {
  const task = (id: string, ownerName: string, extra: Record<string, unknown> = {}) => ({
    _id: id,
    title: `Task ${id}`,
    ownerName,
    status: 'queued',
    dueAt: daysFromNow(2),
    _createdAt: daysFromNow(-20),
    _updatedAt: daysFromNow(-20),
    ...extra,
  })

  it('shows the requester’s open work as check-in cards, and their follow-ups', async () => {
    routeOutreach({
      mine: {
        tasks: [
          task('t1', 'juhan'),
          task('t2', 'Juhan', { status: 'blocked', blocker: 'Waiting on <numbers>' }),
          task('t3', 'Eric'),
        ],
        contacts: [
          { _id: 'c1', name: 'Jane Doe', organization: 'Acme Health', owner: 'Juhan', status: 'contacted', followUpAt: daysFromNow(1) },
          { _id: 'c2', name: 'Bob Roe', organization: 'Beta', owner: 'Eric', status: 'contacted', followUpAt: daysFromNow(1) },
        ],
      },
    })
    const reply = await ask('<@UBOT> what’s on my plate?')
    const ids = (reply.blocks || []).map((block) => block.block_id).filter(Boolean)
    expect(ids).toContain(checkInTaskBlockId('t1'))
    expect(ids).toContain(checkInTaskBlockId('t2'))
    expect(ids).not.toContain(checkInTaskBlockId('t3'))
    const json = JSON.stringify(reply.blocks)
    expect(json).toContain('Follow up with Jane Doe')
    expect(json).not.toContain('Bob Roe')
    expect(json).toContain('&lt;numbers&gt;')
    // The stuck one is read first.
    expect(ids.indexOf(checkInTaskBlockId('t2'))).toBeLessThan(ids.indexOf(checkInTaskBlockId('t1')))
    expect(mocks.outreach.fetch).toHaveBeenCalledWith(MINE_DATA_QUERY, { planPrefix: 'weekly-plan/' })
    expectValidSlackBlocks(reply.blocks!)
  })

  it('stays under Slack’s limits with a long list', async () => {
    const tasks = Array.from({ length: 20 }, (_, index) => task(`t${index}`, 'Juhan'))
    const contacts = Array.from({ length: 9 }, (_, index) => ({
      _id: `c${index}`,
      name: `Person ${index}`,
      organization: 'Acme',
      owner: 'Juhan',
      status: 'contacted',
      followUpAt: daysFromNow(1),
    }))
    routeOutreach({ mine: { tasks, contacts } })
    const reply = await ask('<@UBOT> my tasks')
    // One phone screen: five cards, three follow-ups, and the count of the rest.
    expect(reply.blocks!.filter((block) => String(block.block_id || '').startsWith('mq_task_actions_'))).toHaveLength(5)
    expect(JSON.stringify(reply.blocks)).toContain('+15 more')
    expect(JSON.stringify(reply.blocks)).toContain('+6 more follow-ups — `Marqueta, my calls`')
    expectValidSlackBlocks(reply.blocks!)
  })

  it('will not guess whose list it is', async () => {
    mocks.getSlackUserDisplayName.mockResolvedValue(undefined)
    const reply = await ask('<@UBOT> my tasks', { slackUserId: 'UNEW', personName: 'Someone' })
    expect(reply.text).toBe('')
    expect(reply.ephemeral).toMatch(/which name on the team list is yours/)
    expect(mocks.outreach.fetch).not.toHaveBeenCalledWith(MINE_DATA_QUERY, expect.anything())
  })
})

// ── Availability ─────────────────────────────────────────────────────────────

describe('availability', () => {
  /** Every write the availability path can make, in one place. */
  const availabilityWrites = () => ({
    patched: mocks.patches.filter((record) => record.id.startsWith('marketingTeamAvailability.')),
    created: mocks.outreach.createIfNotExists.mock.calls.map(([doc]) => doc as Record<string, unknown>),
  })
  const expectNoWrite = () => {
    const { patched, created } = availabilityWrites()
    expect(patched).toHaveLength(0)
    expect(created).toHaveLength(0)
  }
  const setOf = (record: PatchRecord) => (record.ops.find((op) => op[0] === 'set')?.[1] || {}) as Record<string, unknown>
  const undoOf = (reply: MarquetaReply) =>
    decodeAvailabilityUndo(buttonsIn(reply.blocks).find((element) => element.action_id === MARQUETA_ACTION.availabilityUndo)?.value)

  it('writes it under the board name, not the Slack display name — patched, never replaced — with Undo', async () => {
    const reply = await ask('<@UBOT> away 2026-09-28 2026-10-02', { personName: 'Juhan Sonin' })
    const { patched, created } = availabilityWrites()
    expect(created).toEqual([
      { _id: 'marketingTeamAvailability.juhan', _type: 'marketingTeamAvailability', ownerName: 'Juhan', status: 'available' },
    ])
    expect(patched).toHaveLength(1)
    expect(setOf(patched[0])).toMatchObject({ status: 'away', from: '2026-09-28', until: '2026-10-02' })
    // Nothing that belongs to the identity link is touched.
    expect(setOf(patched[0])).not.toHaveProperty('slackUserId')
    expect(setOf(patched[0])).not.toHaveProperty('ownerName')
    // Second person, the days in words, no ISO date — and the way back is one press.
    expect(reply.text).toBe(
      'You’re away Mon 28 Sep – Fri 2 Oct. I’ll leave you out of next week’s plan, and your 2 open tasks will show as needing someone.',
    )
    expect(undoOf(reply)).toMatchObject({ ownerName: 'Juhan', slackUserId: 'UJUHAN', prior: null })
    expectValidSlackBlocks(reply.blocks!)
  })

  it('keeps the Slack link, the allocation and the note, conditional on the revision it read', async () => {
    routeOutreach({
      availabilityRecord: {
        _id: 'marketingTeamAvailability.juhan',
        _rev: 'rev-avail',
        ownerName: 'Juhan',
        slackUserId: 'UJUHAN',
        status: 'away',
        from: '2026-10-12',
        until: '2026-10-16',
        weeklyHours: 4,
        note: 'Mondays only',
      },
    })
    const reply = await ask('<@UBOT> I’m away next week')
    const { patched, created } = availabilityWrites()
    expect(created).toHaveLength(0)
    expect(patched).toHaveLength(1)
    const ops = patched[0].ops
    expect(ops).toContainEqual(['ifRevisionId', 'rev-avail'])
    const set = setOf(patched[0])
    // Next week from Thursday 24 Sep is Monday 28 Sep to Sunday 4 Oct — not "today to Sunday".
    expect(set).toMatchObject({ status: 'away', from: '2026-09-28', until: '2026-10-04' })
    for (const kept of ['slackUserId', 'weeklyHours', 'note', 'ownerName']) expect(set).not.toHaveProperty(kept)
    expect(ops.filter((op) => op[0] === 'unset')).toHaveLength(0)
    // What it replaced is said out loud, and Undo puts it back.
    expect(reply.text).toContain('This replaces your time off Mon 12 – Fri 16 Oct.')
    expect(undoOf(reply)?.prior).toMatchObject({ status: 'away', from: '2026-10-12', until: '2026-10-16' })
  })

  it('reads "until" as the last day, from today, and a weekday as that day', async () => {
    await ask('<@UBOT> I’m away until 2026-10-02')
    expect(setOf(availabilityWrites().patched[0])).toMatchObject({ status: 'away', from: '2026-09-24', until: '2026-10-02' })
    mocks.patches.length = 0
    await ask('<@UBOT> I’m on holiday friday')
    expect(setOf(availabilityWrites().patched[0])).toMatchObject({ status: 'away', from: '2026-09-25', until: '2026-09-25' })
  })

  it('books "Fri 2 Oct" — the way she prints a date — as that one day, not eight', async () => {
    await ask('<@UBOT> away Fri 2 Oct')
    expect(setOf(availabilityWrites().patched[0])).toMatchObject({ status: 'away', from: '2026-10-02', until: '2026-10-02' })
    mocks.patches.length = 0
    await ask('<@UBOT> away until Fri 2 Oct')
    expect(setOf(availabilityWrites().patched[0])).toMatchObject({ status: 'away', from: '2026-09-24', until: '2026-10-02' })
    // A weekday that is not that date's is a question back, and no write.
    mocks.patches.length = 0
    mocks.outreach.createIfNotExists.mockClear()
    const wrong = await ask('<@UBOT> away Fri 3 Oct')
    expectNoWrite()
    expect(wrong.text).toMatch(/^Which days\?/)
  })

  it('hears "I’m off Friday" and "I’m sick today"', async () => {
    await ask('<@UBOT> I’m off Friday')
    expect(setOf(availabilityWrites().patched[0])).toMatchObject({ status: 'away', from: '2026-09-25', until: '2026-09-25' })
    mocks.patches.length = 0
    await ask('<@UBOT> I’m sick today')
    expect(setOf(availabilityWrites().patched[0])).toMatchObject({ status: 'away', from: '2026-09-24', until: '2026-09-24' })
  })

  it('"I’m back" is the reverse: available from today, with the old end date removed', async () => {
    routeOutreach({
      availabilityRecord: { _id: 'marketingTeamAvailability.juhan', _rev: 'r', ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'away', from: '2026-09-21', until: '2026-09-27' },
    })
    const reply = await ask('<@UBOT> I’m back')
    const [record] = availabilityWrites().patched
    expect(setOf(record)).toMatchObject({ status: 'available', from: '2026-09-24' })
    expect(record.ops).toContainEqual(['unset', ['until']])
    expect(reply.text).toMatch(/^You’re available from Thu 24 Sep\./)
    expect(undoOf(reply)).toBeTruthy()
  })

  it('says so, and writes nothing, when the record already says it', async () => {
    routeOutreach({
      availabilityRecord: { _id: 'marketingTeamAvailability.juhan', _rev: 'r', ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'away', from: '2026-09-28', until: '2026-10-04' },
    })
    const reply = await ask('<@UBOT> away next week')
    expect(availabilityWrites().patched).toHaveLength(0)
    expect(reply.text).toMatch(/already down as away/)
    expect(reply.blocks).toBeUndefined()
  })

  it('never writes on a QUESTION about who is away — the asker is not the subject', async () => {
    for (const text of ['is anyone on holiday?', 'who is out on PTO?', 'who is out on pto']) {
      const reply = await ask(`<@UBOT> ${text}`)
      expect(reply.text, text).toMatch(/nothing changed|Nothing has changed/)
    }
    expectNoWrite()
    // Turned away on the words alone: no roster read, no record read.
    expect(mocks.outreach.fetch).not.toHaveBeenCalledWith(TEAM_AVAILABILITY_QUERY)
  })

  it('answers a question about one of her topics as that topic, and still writes nothing', async () => {
    mocks.loadStrategySnapshot.mockResolvedValue(STRATEGY_LOAD)
    expect((await ask('<@UBOT> what does the pipeline look like with Eric away?')).text).toMatch(/^\*Pipeline\* —/)
    expect((await ask('<@UBOT> who’s away this week?')).text).toMatch(/^\*This week\* —/)
    expect((await ask('<@UBOT> is Juhan away next week?')).text).toMatch(/^\*This week\* —/)
    expectNoWrite()
  })

  it('never writes when the message is about somebody else', async () => {
    for (const text of [
      'Eric is away next week',
      '<@UERIC> is away next week',
      'I heard Bob is on holiday',
      'I’m covering while Eric is away',
      'I’m away and Eric is too',
      'she’s away until 2026-10-02',
    ]) {
      const reply = await ask(`<@UBOT> ${text}`)
      expect(reply.text, text).toMatch(/nothing changed|Nothing has changed/)
    }
    expectNoWrite()
  })

  it('asks for the days rather than guessing them', async () => {
    for (const text of ['I’m away for 2 weeks', 'away in October', 'away next Friday', 'I’m away 2026-09-28, back 2026-10-05']) {
      const reply = await ask(`<@UBOT> ${text}`)
      expect(reply.text, text).toBe('Which days? For example `Marqueta, away next week`, `away Fri`, `away 1–5 Oct`. Nothing has changed yet.')
    }
    expectNoWrite()
  })

  it('a guest cannot write anybody’s availability, their own name included', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Juhan', isGuest: true, isBot: false })
    const reply = await ask('<@UBOT> I’m away next week', { slackUserId: 'UGUEST', personName: 'Juhan' })
    expect(reply.text).toMatch(/GoInvo team/)
    expectNoWrite()
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
  })

  it('a member whose display name matches a name linked to someone else is NOT that person', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Juhan', isGuest: false, isBot: false })
    const namesake = { slackUserId: 'UOTHER', personName: 'Juhan' }

    // Said to them alone: a refusal about who they are is not for the room.
    const away = await ask('<@UBOT> I’m away next week', namesake)
    expect(away.text).toBe('')
    expect(away.ephemeral).toMatch(/which name on the team list is yours/)
    expectNoWrite()

    // Nor can they read his list, or log a call as him.
    const mine = await ask('<@UBOT> my tasks', namesake)
    expect(mine.ephemeral).toMatch(/which name on the team list is yours/)
    expect(mocks.outreach.fetch).not.toHaveBeenCalledWith(MINE_DATA_QUERY, expect.anything())

    routeOutreach({ logContact: { ...JANE, _rev: 'rev-1', interactions: [] } })
    const logged = await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail', namesake)
    expect(mocks.patches).toHaveLength(0)
    expect(buttonsIn(logged.blocks).map((element) => element.action_id)).toEqual([MARQUETA_ACTION.logCall])
  })

  it('refuses a record that is linked to someone else even when the roster did not show it', async () => {
    routeOutreach({
      availability: [{ ownerName: 'Juhan', status: 'available' }],
      availabilityRecord: { _id: 'marketingTeamAvailability.juhan', _rev: 'r', ownerName: 'Juhan', slackUserId: 'UJUHAN' },
    })
    const reply = await ask('<@UBOT> I’m away next week', { slackUserId: 'UOTHER', personName: 'Juhan' })
    expect(reply.text).toBe('')
    expect(reply.ephemeral).toMatch(/which name on the team list is yours/)
    expect(availabilityWrites().patched).toHaveLength(0)
  })

  it('changes nothing when the team list cannot be read', async () => {
    routeOutreach({ availability: new Error('roster down') })
    const reply = await ask('<@UBOT> away 2026-09-28 2026-10-02')
    expectNoWrite()
    expect(reply.text).toBe('')
    expect(reply.ephemeral).toMatch(/nothing changed/)
  })

  it('is answered in any channel: it is about the person telling her', async () => {
    await ask('<@UBOT> I’m away next week', { channel: 'CRANDOM' })
    expect(availabilityWrites().patched).toHaveLength(1)
  })

  it('readTimeOff: statements it will write, and what it turns away', () => {
    const read = (text: string) => readTimeOff(text, { today: '2026-09-24' })
    expect(read('I’m away 2026-09-28 2026-10-02')).toEqual({ kind: 'statement', status: 'away', from: '2026-09-28', until: '2026-10-02' })
    expect(read('fyi I’ll be out tomorrow')).toEqual({ kind: 'statement', status: 'away', from: '2026-09-25', until: '2026-09-25' })
    expect(read('called in sick')).toEqual({ kind: 'statement', status: 'away', from: '2026-09-24', until: '2026-09-24' })
    expect(read('ooo this week')).toEqual({ kind: 'statement', status: 'away', from: '2026-09-24', until: '2026-09-27' })
    expect(read('away 2026-10-05')).toEqual({ kind: 'statement', status: 'away', from: '2026-10-05', until: '2026-10-05' })
    expect(read('I’m away')).toEqual({ kind: 'statement', status: 'away', from: '2026-09-24', until: '2026-09-27' })
    expect(read('I’m away next week')).toEqual({ kind: 'statement', status: 'away', from: '2026-09-28', until: '2026-10-04' })
    expect(read('I’m back on Monday')).toEqual({ kind: 'statement', status: 'away', from: '2026-09-24', until: '2026-09-27' })
    expect(read('I was away last week').kind).toBe('notFirstPerson')
    expect(read('I’m sure Bob is away').kind).toBe('notFirstPerson')
    expect(read('away 2026-09-01 2026-09-05').kind).toBe('unclearDates')
    expect(read('I’m away for 2 weeks').kind).toBe('unclearDates')
    expect(read('I’m away next week?').kind).toBe('question')
    expect(readTimeOff('I’m away next week', { today: '2026-09-24', mentionsSomeoneElse: true }).kind).toBe('someoneElse')
  })
})

// ── Who can read the answer ──────────────────────────────────────────────────

describe('the audience gate', () => {
  it('answers nothing about the work in a channel it is not configured for — whoever asks', async () => {
    process.env.SLACK_MARKETING_CHANNEL_ID = 'CBOT'
    for (const text of ['runway', 'prep Jane Doe at Acme Health', 'pipeline', 'my tasks', 'my calls', 'week', 'called Jane Doe, left a voicemail', 'who’s Jane Doe', 'we signed Acme for 3 months']) {
      const reply = await ask(`<@UBOT> ${text}`, { channel: 'CSHARED' })
      // No DM offered: DMs are not wired up unless SLACK_MARQUETA_DMS says so.
      expect(reply.text, text).toContain('I only talk about outreach, money and the plan in <#CBOT>')
      expect(reply.blocks).toBeUndefined()
      expect(reply.ephemeral).toBeUndefined()
    }
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    expect(mocks.loadStrategySnapshot).not.toHaveBeenCalled()
    expect(mocks.patches).toHaveLength(0)
  })

  it('mentions a DM only when DMs are wired up', async () => {
    process.env.SLACK_MARKETING_CHANNEL_ID = 'CBOT'
    process.env.SLACK_MARQUETA_DMS = '1'
    try {
      const reply = await ask('<@UBOT> runway', { channel: 'CSHARED' })
      expect(reply.text).toContain('in a DM or in <#CBOT>')
      expect((await ask('<@UBOT> help', { channel: 'CSHARED' })).text).toMatch(/DM me/)
    } finally {
      delete process.env.SLACK_MARQUETA_DMS
    }
    expect((await ask('<@UBOT> help', { channel: 'CSHARED' })).text).not.toMatch(/DM/)
  })

  it('answers in a DM, in her own room and in the marketing channels she sits in', async () => {
    process.env.SLACK_MARKETING_CHANNEL_ID = 'CBOT'
    process.env.SLACK_MARKETING_CHANNEL_IDS = 'CBOT,CMKT'
    for (const channel of ['D1', 'CBOT', 'CMKT']) {
      const reply = await ask('<@UBOT> prep Jane Doe at Acme Health', { channel })
      expect(reply.text, channel).toContain('Jane Doe')
    }
  })

  it('still gives help anywhere, and a hello that is personal only where it may be', async () => {
    const help = await ask('<@UBOT> help', { channel: 'CSHARED' })
    expect(help.text).toContain('`Marqueta, prep Jane Doe at MGB`')
    const hello = await ask('<@UBOT> hi', { channel: 'CSHARED' })
    expect(hello.text).toBe('Hi. I keep GoInvo’s outreach list, the week’s marketing tasks and the runway. `Marqueta, help` for what I can do.')
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
  })
})

// ── Money, strategy, pipeline, heartbeat, week ───────────────────────────────

describe('the questions', () => {
  it('answers money with the runway and the pipeline — and the runway’s own buttons when a check-in is due', async () => {
    mocks.loadStrategySnapshot.mockResolvedValue(STRATEGY_LOAD)
    const reply = await ask('<@UBOT> how are we for money?')
    expect(reply.text).toBe('*Runway* — 3.5 months of certain runway, to 11 Jan 2027 (Rebuild)')
    const labels = buttonsIn(reply.blocks).map((element) => element.text.text)
    expect(labels).toEqual(['Still right', 'We signed something…', 'It changed…'])
    expect(JSON.stringify(reply.blocks)).toContain("Pipeline: 3 in meeting/opportunity, ~$45,000 estimated")
    // "I will ask on the next digest" left the person asking with nothing to do.
    expect(JSON.stringify(reply)).not.toMatch(/next digest/)
    expectValidSlackBlocks(reply.blocks!)
  })

  it('answers strategy with the question first and its two answers, and pipeline with counts', async () => {
    mocks.loadStrategySnapshot.mockResolvedValue(STRATEGY_LOAD)
    const strategy = await ask('<@UBOT> strategy')
    expect(strategy.text).toBe('*Is outreach getting the hours it needs?*')
    expect(buttonsIn(strategy.blocks).map((element) => element.text.text)).toEqual(['Plan still fits', 'Needs a rethink'])
    const pipeline = await ask('<@UBOT> pipeline')
    expect(pipeline.text).toMatch(/^\*Pipeline\* —/)
    expect(JSON.stringify(pipeline.blocks)).toContain('`Marqueta, my calls`')
  })

  it('reads BOTH schedules’ records for "tick"', async () => {
    routeOutreach({
      heartbeat: {
        tick: { week: '2026-W39', ranAt: daysFromNow(-3), steps: [{ name: 'plan', ok: true, count: 4, detail: 'Planned <4> items' }] },
        checkin: null,
      },
    })
    const reply = await ask('<@UBOT> tick')
    expect(mocks.outreach.fetch).toHaveBeenCalledWith(HEARTBEAT_QUERY, { tick: HEARTBEAT_DOC_ID, checkin: CHECKIN_HEARTBEAT_DOC_ID })
    expect(reply.text).toContain(':white_check_mark: plan — Planned &lt;4&gt; items')
    expect(reply.text).toContain('Thursday check-in has never run')
  })

  it('reads a stored run back in Slack’s words — no ISO week, no "(s)"', async () => {
    routeOutreach({
      heartbeat: {
        tick: {
          week: '2026-W39',
          ranAt: daysFromNow(-3),
          steps: [
            { name: 'plan', ok: true, count: 4, detail: '4 item(s) planned for 2026-W39.' },
            { name: 'digest', ok: true, count: 1, detail: 'digest posted with 1 task(s).' },
          ],
        },
        checkin: null,
      },
    })
    const reply = await ask('<@UBOT> tick')
    expect(reply.text).toContain('for the week of Mon 21 Sep.')
    expect(reply.text).toContain('plan — 4 items planned for the week of Mon 21 Sep.')
    expect(reply.text).toContain('digest — digest posted with 1 task.')
    expect(reply.text).not.toMatch(/\d{4}-W\d\d|\(s\)/)
  })

  it('escapes task titles in the week', async () => {
    routeOutreach({ week: [{ _id: 't1', title: 'Pilot deck: <5% adoption & why', kind: 'content', status: 'queued' }] })
    const reply = await ask('<@UBOT> what’s on this week?')
    expect(JSON.stringify(reply.blocks)).toContain('&lt;5% adoption &amp; why')
    expect(mocks.outreach.fetch).toHaveBeenCalledWith(WEEK_QUERY, { planPrefix: 'weekly-plan/' })
  })

  it('answers a failure in words', async () => {
    mocks.loadStrategySnapshot.mockRejectedValue(new Error('down'))
    const reply = await ask('<@UBOT> runway')
    expect(reply).toEqual({ text: '', ephemeral: expect.stringMatching(/^Couldn’t look that up — nothing changed\./) })
  })
})

// ── The answer shapes (UX pass) ──────────────────────────────────────────────

/**
 * Every answer ends on exactly one next thing: its last block is ONE row of
 * buttons (at most three, at most one green, and green only first), or its
 * last line holds exactly one `Marqueta, …` hint.
 */
function endsWithOneAction(reply: MarquetaReply): boolean {
  const hints = (text: string) => (text.match(/`Marqueta, [^`]+`/g) || []).length
  const blocks = reply.blocks || []
  if (!blocks.length) {
    const lines = reply.text.trim().split('\n')
    return hints(lines[lines.length - 1]) === 1
  }
  const last = blocks[blocks.length - 1]
  if (last.type === 'actions') {
    const elements: Block[] = last.elements || []
    const green = elements.filter((element) => element.style === 'primary')
    return elements.length >= 1 && elements.length <= 3 && green.length <= 1 && (!green.length || elements[0].style === 'primary')
  }
  if (last.accessory) return false
  const text = last.type === 'context' ? (last.elements || []).map((element: Block) => String(element.text || '')).join(' ') : String(last.text?.text || '')
  return hints(text) === 1
}

describe('saying nothing', () => {
  it('answers a thank-you, an ok or an emoji with silence — and reads nothing', async () => {
    for (const text of ['thanks!', 'ok', 'great, thank you', ':+1:', 'cheers Marqueta']) {
      expect(await ask(`<@UBOT> ${text}`), text).toBeNull()
    }
    // …with a hello in front, too: these got "Did you mean `Marqueta, my tasks`?".
    for (const text of ['hey Marqueta, thanks!', 'Hey <@UBOT> thanks', 'Thanks Marqueta, that helps', 'hey <@UBOT> :+1:', 'hi Marqueta, thank you']) {
      expect(await ask(text), text).toBeNull()
    }
    expect(mocks.getSlackUserProfile).not.toHaveBeenCalled()
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
  })
})

describe('a hello', () => {
  it('is three lines at most and ends on this person’s most useful thing', async () => {
    routeOutreach({
      mine: {
        tasks: [{ _id: 't1', title: 'Write the case study', ownerName: 'Juhan', status: 'queued' }],
        contacts: [{ _id: 'c1', name: 'Jane Doe', organization: 'Acme Health', owner: 'Juhan', status: 'contacted', followUpAt: daysFromNow(-1) }],
      },
    })
    const reply = await ask('<@UBOT> hi')
    expect(reply.text).toBe(
      'Hi Juhan. I keep GoInvo’s outreach list, the week’s marketing tasks and the runway.\nYou have 1 follow-up due — say `Marqueta, my calls`.',
    )
    expect(reply.text.split('\n').length).toBeLessThanOrEqual(3)
  })
})

describe('what she cannot answer', () => {
  it('suggests the command a typo looks like, and runs nothing', async () => {
    for (const [typed, command] of [
      ['runwya', 'runway'],
      ['rnway', 'runway'],
      ['pipline', 'pipeline'],
      ['piepline', 'pipeline'],
      ['stratgy', 'strategy'],
      ['strategey', 'strategy'],
      ['weeek', 'week'],
      ['ideass', 'ideas'],
      ['hlep', 'help'],
      ['clals', 'my calls'],
    ]) {
      expect((await ask(`<@UBOT> ${typed}`)).text).toBe(`Did you mean \`Marqueta, ${command}\`?`)
    }
    // Suggest only: no lookup, no answer to a question nobody asked.
    expect(mocks.loadStrategySnapshot).not.toHaveBeenCalled()
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
  })

  it('never replies to something it did not understand with more than three lines', async () => {
    for (const text of ['what is our Q4 revenue target?', 'the booth went great yesterday', 'can you sing', 'lorem ipsum dolor sit amet']) {
      const reply = await ask(`<@UBOT> ${text}`)
      expect(reply.text.split('\n').length, text).toBeLessThanOrEqual(3)
      expect(reply.blocks, text).toBeUndefined()
    }
    expect((await ask('<@UBOT> what is our Q4 revenue target?')).text).toBe(
      'I don’t have that — I keep calls, tasks and the runway. Closest: `Marqueta, pipeline`.',
    )
  })
})

describe('logging — the one-press paths and the ones that ask first', () => {
  const PRIYA: PrepDataContact = { _id: 'contact-priya', name: 'Priya Patel', organization: 'Acme Health', status: 'responded', warmth: 'warm' }

  it('asks before moving somebody who replied to Dormant — "keen but after the budget" is not right now', async () => {
    routeOutreach({ prep: prepData([JANE, PRIYA]), logContact: { ...PRIYA, _rev: 'r', interactions: [] } })
    const reply = await ask('<@UBOT> spoke to Priya Patel, she is keen but after the budget')
    expect(mocks.patches).toHaveLength(0)
    expect(reply.text).toBe(
      'Sounds like *not right now* — that moves Priya Patel (Acme Health) from Responded to Dormant, with a follow-up in 2 months.',
    )
    const log = buttonsIn(reply.blocks)
    expect(log.map((element) => element.text.text)).toEqual(['Log it…'])
    expect(decodeContactRef(log[0].value)).toMatchObject({ contactId: 'contact-priya', outcome: 'notNow' })
  })

  it('offers one "Log <name>…" per person it could have been, each with the contact and what was said', async () => {
    const janeSmith: PrepDataContact = { _id: 'contact-jane-2', name: 'Jane Smith', organization: 'Beta Labs', status: 'new' }
    routeOutreach({ prep: prepData([JANE, janeSmith]) })
    const reply = await ask('<@UBOT> called Jane, left a voicemail')
    expect(reply.text).toBe('Which Jane did you call?')
    const logs = buttonsIn(reply.blocks)
    expect(logs.every((element) => element.action_id === MARQUETA_ACTION.logCall && /^Log .+…$/.test(element.text.text))).toBe(true)
    expect(logs.map((element) => decodeContactRef(element.value)).map((ref) => [ref?.contactId, ref?.outcome])).toEqual([
      ['contact-jane', 'voicemail'],
      ['contact-jane-2', 'voicemail'],
    ])
    expect(mocks.patches).toHaveLength(0)
  })

  it('every write from a message offers Undo', async () => {
    routeOutreach({ logContact: { ...JANE, _rev: 'rev-1', interactions: [] } })
    const logged = await ask('<@UBOT> called Jane Doe at Acme Health, left a voicemail')
    expect(mocks.patches.length).toBeGreaterThan(0)
    expect(buttonsIn(logged.blocks).map((element) => element.action_id)).toEqual([MARQUETA_ACTION.callLogUndo])

    mocks.patches.length = 0
    routeOutreach({})
    const away = await ask('<@UBOT> away next week')
    expect(mocks.patches.length).toBeGreaterThan(0)
    expect(buttonsIn(away.blocks).map((element) => element.action_id)).toEqual([MARQUETA_ACTION.availabilityUndo])
  })
})

describe('the new answers', () => {
  beforeEach(() => {
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'
  })

  const WEEK = [
    { _id: 'w1', title: 'Draft the pre-mortem article (v2)', ownerName: 'Shirley', status: 'working', dueAt: daysFromNow(1) },
    { _id: 'w2', title: 'Decide: publish the F1–F8 taxonomy?', status: 'needsHuman', kind: 'decision', humanQuestion: 'Publish it?' },
    { _id: 'w3', title: 'Arlington Town Day merch table', status: 'queued' },
    { _id: 'w4', title: 'Newsletter: pre-mortem teaser', status: 'queued' },
    { _id: 'w5', title: 'Pin the kit on LinkedIn', status: 'queued' },
    { _id: 'w6', title: 'Fix the offer page', ownerName: 'Juhan', status: 'blocked', blocker: 'Waiting on copy', dueAt: daysFromNow(-3) },
    { _id: 'w7', title: 'Get the booth permit', status: 'blocked', blocker: 'No reply from the town' },
  ]
  /** Eric is away the week of Mon 21 Sep. */
  const AWAY_TEAM: TeamMemberAvailability[] = [
    { ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'available' },
    { ownerName: 'Shirley', slackUserId: 'USHIRLEY', status: 'available' },
    { ownerName: 'Eric', slackUserId: 'UERIC', status: 'away', from: '2026-09-21', until: '2026-09-27' },
  ]

  it('"week": yours first, the team’s in one line, who is away, then work nobody has — stuck work included', async () => {
    routeOutreach({ week: WEEK, availability: AWAY_TEAM })
    const reply = await ask('<@UBOT> week')
    expect(reply.text).toBe('*This week* — you have 1 open, 1 overdue · `Marqueta, my tasks`')
    const head = String(reply.blocks![0].text.text)
    expect(head).toContain('7 open tasks across the team')
    expect(head).toContain('4 nobody has taken · 1 decision waiting')
    expect(head).toContain(':palm_tree: Away this week: Eric')
    const cards = reply.blocks!.filter((block) => String(block.block_id || '').startsWith('mq_task_') && !String(block.block_id).startsWith('mq_task_actions_'))
    // Three cards, never the decision (answered, not taken), and never a name to ask.
    expect(cards).toHaveLength(3)
    expect(JSON.stringify(cards)).not.toContain('taxonomy')
    expect(JSON.stringify(cards)).not.toContain('Eric')
    expect(JSON.stringify(reply.blocks)).toContain('+1 more nobody has taken')
    expect(reply.blocks![reply.blocks!.length - 1]).toMatchObject({ type: 'actions', elements: [{ text: { text: 'Open This week' } }] })
    expectValidSlackBlocks(reply.blocks!)
  })

  it('"who’s Jane Doe": one line on where things stand, with Prep and Log it…', async () => {
    const jane = {
      ...JANE,
      warmth: 'warm',
      status: 'contacted',
      owner: 'Shirley',
      followUpAt: '2026-09-22T14:00:00Z',
      interactions: [{ at: '2026-09-15T14:00:00Z', statusAfter: 'contacted', channel: 'phone' }],
    }
    routeOutreach({ prep: prepData([jane, ATT]) })
    const reply = await ask('<@UBOT> who’s Jane Doe')
    expect(reply.text).toBe('*Jane Doe* — CMIO, Acme Health · warm · last: Contacted on 15 Sep · follow-up Tue 22 Sep (overdue) · owner Shirley')
    expect(buttonsIn(reply.blocks).map((element) => element.text.text)).toEqual(['Prep', 'Log it…'])
    // Never the email or the phone.
    expect(JSON.stringify(reply)).not.toMatch(/jane\.doe@|555-0142/)
    expectValidSlackBlocks(reply.blocks!)
  })

  it('"we signed Acme for 3 months" hands over the runway’s own form — nothing is written from the sentence', async () => {
    const reply = await ask('<@UBOT> we signed Acme for 3 months')
    expect(reply.text).toBe('*Signed work* — Acme for 3 months. Record it and the runway moves with it:')
    expect(buttonsIn(reply.blocks)).toEqual([
      { type: 'button', action_id: MARKETING_ACTION.runwaySigned, text: { type: 'plain_text', text: 'We signed something…', emoji: true } },
    ])
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
  })

  it('"ideas": at most five titles and a link to review them on This week', async () => {
    mocks.ideasNeedingReview.mockResolvedValue(Array.from({ length: 7 }, (_, index) => ({ _id: `i${index}`, title: `Idea <${index}>` })))
    const reply = await ask('<@UBOT> ideas')
    expect(reply.text).toBe('*Caught in Slack* — 7 ideas still need a yes or no')
    expect(String(reply.blocks![0].text.text).split('\n').filter((line) => line.startsWith('•'))).toHaveLength(5)
    expect(JSON.stringify(reply.blocks)).toContain('Idea &lt;0&gt;')
    expect(buttonsIn(reply.blocks)[0]).toMatchObject({ text: { text: 'Open This week' }, url: 'https://www.goinvo.com/studio/marketing?view=thisWeek&focus=caught' })
  })

  it('"ideas": counts the whole backlog, not the ones it read to name', async () => {
    // Counting the capped read said "10 ideas" to a backlog of 40.
    mocks.ideasNeedingReview.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({ _id: `i${index}`, title: `Idea ${index}` })))
    mocks.ideaCount.mockResolvedValue(40)
    const reply = await ask('<@UBOT> ideas')
    expect(reply.text).toBe('*Caught in Slack* — 40 ideas still need a yes or no')
    expect(String(reply.blocks![0].text.text)).toContain('…and 35 more')
    expect(mocks.ideaCount).toHaveBeenCalledWith(IDEAS_PENDING_COUNT_QUERY, { type: 'marketingIdea' })

    // A count that fails is never fewer than were just read.
    mocks.ideaCount.mockRejectedValueOnce(new Error('down'))
    expect((await ask('<@UBOT> ideas', { ts: 'x.2' })).text).toBe('*Caught in Slack* — 5 ideas still need a yes or no')
  })

  it('"who’s got the newsletter" is not a person: it is answered as what it asks', async () => {
    routeOutreach({ week: WEEK, availability: AWAY_TEAM })
    // Not a lookup at all.
    const got = await ask('<@UBOT> who’s got the newsletter')
    expect(got.text).not.toMatch(/Nobody by that name/)
    expect(mocks.outreach.fetch).not.toHaveBeenCalledWith(PREP_DATA_QUERY)

    // Typed in lower case: looked up, and when nobody matches, answered as the week.
    const merch = await ask('<@UBOT> status of town day merch plan')
    expect(merch.text).toBe('*This week* — you have 1 open, 1 overdue · `Marqueta, my tasks`')

    // …but a lower-case name that IS on file is that contact.
    const jane = await ask('<@UBOT> who’s jane doe')
    expect(jane.text).toMatch(/^\*Jane Doe\* — CMIO, Acme Health/)
  })

  it('a capture carries Keep it · Not an idea · Open This week, and says it was a guess', async () => {
    mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'idea', idea: { title: 'Merch table at Town Day' } })
    const reply = await ask('<@UBOT> we should do a merch table at Arlington Town Day, stickers and a tote', { ts: '555.5' })
    expect(reply.text).toBe('Filed as an idea: Merch table at Town Day — keep it?')
    expect(buttonsIn(reply.blocks).map((element) => element.text.text)).toEqual(['Keep it', 'Not an idea', 'Open This week'])
    expect(JSON.parse(buttonsIn(reply.blocks)[1].value)).toEqual({ c: 'C1', ts: '555.5' })
    expect(JSON.stringify(reply.blocks)).toContain('My guess')

    mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'draft', draft: { title: 'Next newsletter' } })
    const draft = await ask('<@UBOT> capture: here’s a draft of the newsletter')
    expect(draft.text).toBe('Put on the calendar as a draft: Next newsletter')
    expect(buttonsIn(draft.blocks).map((element) => element.text.text)).toEqual(['Not for the calendar', 'Open Calendar'])
  })

  it('every answer ends on exactly one next thing', async () => {
    mocks.loadStrategySnapshot.mockResolvedValue(STRATEGY_LOAD)
    mocks.ideasNeedingReview.mockResolvedValue([{ _id: 'i1', title: 'A booth' }])
    mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'idea', idea: { title: 'A booth' } })
    routeOutreach({
      week: WEEK,
      availability: AWAY_TEAM,
      logContact: { ...JANE, _rev: 'r', interactions: [] },
      mine: { tasks: [{ _id: 't1', title: 'Write the case study', ownerName: 'Juhan', status: 'queued' }], contacts: [] },
      prep: prepData([JANE, { ...ATT, owner: 'Juhan', status: 'contacted', followUpAt: daysFromNow(-1) }]),
      heartbeat: { tick: null, checkin: null },
    })
    const kinds: Record<string, string> = {
      help: 'help',
      helpMore: 'help more',
      greeting: 'hi',
      week: 'week',
      mine: 'my tasks',
      ideas: 'ideas',
      runway: 'runway',
      strategy: 'strategy',
      pipeline: 'pipeline',
      prepList: 'my calls',
      logCall: 'called Jane Doe at Acme Health, left a voicemail',
      contact: 'who’s Jane Doe',
      signed: 'we signed Acme for 3 months',
      availability: 'away next week',
      heartbeat: 'tick',
      capture: 'capture a booth at Town Day with stickers',
      unknown: 'what is our Q4 revenue target?',
      typo: 'runwya',
    }
    for (const [kind, text] of Object.entries(kinds)) {
      mocks.patches.length = 0
      const reply = await ask(`<@UBOT> ${text}`, { ts: `${kind}.1` })
      expect(reply, kind).not.toBeNull()
      expect(endsWithOneAction(reply), `${kind}: ${JSON.stringify(reply).slice(0, 400)}`).toBe(true)
      if (reply.blocks?.length) expectValidSlackBlocks(reply.blocks)
      // The first line is the notification — never a raw ISO date or "(s)".
      expect(reply.text, kind).not.toMatch(/\d{4}-\d{2}-\d{2}|\(s\)|@Marqueta/)
    }
  })
})

// ── The events route ─────────────────────────────────────────────────────────

describe('the events route', () => {
  const answer = vi.mocked(answerMarqueta)

  const post = (event: Record<string, unknown>, headers: Record<string, string> = {}) =>
    POST(
      new NextRequest('http://localhost/api/slack/events', {
        method: 'POST',
        body: JSON.stringify({ type: 'event_callback', event: { type: 'message', ...event } }),
        headers: { 'content-type': 'application/json', ...headers },
      }),
    )

  const runAfter = async () => {
    const queue = mocks.afterQueue.splice(0)
    for (const task of queue) await task()
  }

  const REPLY: MarquetaReply = {
    text: 'Call prep — Jane Doe',
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Say this' } }],
    thread: { text: 'Call prep — Jane Doe — offer', blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Offer' } }] },
    ephemeral: 'Email: jane.doe@acmehealth.org',
  }

  it('answers 200 before the conversation runs, then posts reply → thread → ephemeral in one thread', async () => {
    answer.mockResolvedValueOnce(REPLY)
    const response = await post({ channel: 'C1', user: 'UJUHAN', text: '<@UBOT> prep Jane', ts: '100.1' })
    expect(response.status).toBe(200)
    expect(answer).not.toHaveBeenCalled()
    expect(mocks.afterQueue).toHaveLength(1)

    await runAfter()
    expect(answer).toHaveBeenCalledWith(
      expect.objectContaining({ text: '<@UBOT> prep Jane', slackUserId: 'UJUHAN', channel: 'C1', ts: '100.1', botUserId: 'UBOT' }),
    )
    expect(mocks.postSlackMessage).toHaveBeenCalledTimes(2)
    expect(mocks.postSlackMessage.mock.calls[0][0]).toMatchObject({ channel: 'C1', threadTs: '100.1', blocks: REPLY.blocks, username: 'Marqueta' })
    expect(mocks.postSlackMessage.mock.calls[1][0]).toMatchObject({ channel: 'C1', threadTs: '100.1', blocks: REPLY.thread!.blocks })
    expect(mocks.postSlackEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'C1', user: 'UJUHAN', threadTs: '100.1', text: REPLY.ephemeral }),
    )
  })

  it('threads under the parent when asked inside a thread', async () => {
    answer.mockResolvedValueOnce({ text: 'ok' })
    await post({ channel: 'C1', user: 'UJUHAN', text: 'Marqueta, runway?', ts: '200.2', thread_ts: '150.0' })
    await runAfter()
    expect(mocks.postSlackMessage.mock.calls[0][0].threadTs).toBe('150.0')
  })

  it('never sends an empty blocks array', async () => {
    answer.mockResolvedValueOnce({ text: 'Nothing open.', blocks: [] })
    await post({ channel: 'C1', user: 'UJUHAN', text: '<@UBOT> week', ts: '100.1' })
    await runAfter()
    expect(mocks.postSlackMessage.mock.calls[0][0]).not.toHaveProperty('blocks')
  })

  it('in a DM, replies where the person wrote and threads the follow-up under her own reply', async () => {
    answer.mockResolvedValueOnce({ ...REPLY, ephemeral: undefined })
    await post({ channel: 'D1', user: 'UJUHAN', text: 'prep Jane', ts: '300.3' })
    await runAfter()
    expect(mocks.postSlackMessage.mock.calls[0][0].threadTs).toBeUndefined()
    expect(mocks.postSlackMessage.mock.calls[1][0].threadTs).toBe('1727182900.000200')
    expect(mocks.postSlackEphemeral).not.toHaveBeenCalled()
  })

  it('says a failure to the asker alone — nothing in the room, in the thread they asked in', async () => {
    answer.mockResolvedValueOnce({ text: '', ephemeral: 'Couldn’t look that up — nothing changed. The Studio still has the real answer.' })
    await post({ channel: 'C1', user: 'UJUHAN', text: '<@UBOT> runway', ts: '100.1' })
    await runAfter()
    expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    expect(mocks.postSlackEphemeral).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'C1', user: 'UJUHAN', threadTs: '100.1', text: expect.stringMatching(/^Couldn’t look that up/) }),
    )

    // In a DM the room is already private: it is simply the reply.
    answer.mockResolvedValueOnce({ text: '', ephemeral: 'Couldn’t look that up — nothing changed.' })
    await post({ channel: 'D1', user: 'UJUHAN', text: 'runway', ts: '300.3' })
    await runAfter()
    expect(mocks.postSlackMessage).toHaveBeenCalledTimes(1)
    expect(mocks.postSlackMessage.mock.calls[0][0]).toMatchObject({ channel: 'D1', text: 'Couldn’t look that up — nothing changed.' })
    expect(mocks.postSlackMessage.mock.calls[0][0]).not.toHaveProperty('blocks')
    expect(mocks.postSlackEphemeral).toHaveBeenCalledTimes(1)
  })

  it('posts nothing more when the reply itself failed', async () => {
    answer.mockResolvedValueOnce(REPLY)
    mocks.postSlackMessage.mockResolvedValueOnce(null)
    await post({ channel: 'C1', user: 'UJUHAN', text: '<@UBOT> prep Jane', ts: '100.1' })
    await runAfter()
    expect(mocks.postSlackMessage).toHaveBeenCalledTimes(1)
    expect(mocks.postSlackEphemeral).not.toHaveBeenCalled()
  })

  it('skips only a retry Slack sent because it timed out waiting', async () => {
    await post({ channel: 'C1', user: 'UJUHAN', text: '<@UBOT> week', ts: '100.1' }, { 'x-slack-retry-num': '1', 'x-slack-retry-reason': 'http_timeout' })
    expect(mocks.afterQueue).toHaveLength(0)

    answer.mockResolvedValueOnce({ text: 'ok' })
    await post({ channel: 'C1', user: 'UJUHAN', text: '<@UBOT> week', ts: '100.1' }, { 'x-slack-retry-num': '1', 'x-slack-retry-reason': 'http_error' })
    expect(mocks.afterQueue).toHaveLength(1)
    await runAfter()
    expect(mocks.postSlackMessage).toHaveBeenCalledTimes(1)
  })

  it('does not answer a message that only mentions her name in passing', async () => {
    await post({ channel: 'CRANDOM', user: 'UJUHAN', text: 'Marqueta caught two ideas this week', ts: '100.1' })
    expect(mocks.afterQueue).toHaveLength(0)
  })

  describe('in a watched channel', () => {
    beforeEach(() => {
      process.env.SLACK_MARKETING_CHANNEL_IDS = 'CBOT,CMKT'
      process.env.SLACK_MARKETING_CHANNEL_ID = 'CBOT'
    })

    it('captures silently, storing the text as it was typed — decoded once', async () => {
      mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'idea', idea: { title: 'x', category: 'event' } })
      const raw = 'We should do a co-branded R&amp;D webinar with AT&amp;T for <https://acme.org|Acme> folks'
      await post({ channel: 'CMKT', user: 'UJUHAN', text: raw, ts: '400.4' })
      // Not "R&amp;D" on the board: Slack's escaping is taken off before anything reads it.
      expect(mocks.captureFromMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'We should do a co-branded R&D webinar with AT&T for Acme folks', channel: 'CMKT', ts: '400.4', personName: 'Juhan Sonin' }),
      )
      expect(mocks.afterQueue).toHaveLength(0)
      // Captured in a human channel, and said nothing there.
      expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    })

    it('reads a pasted quote the way Slack delivers it (&gt;), so a short draft is a draft', async () => {
      mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'draft', draft: { title: 'Here’s a draft', contentType: 'newsletter' } })
      process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'
      const delivered = 'Here’s a draft:\n&gt; Look across a parking lot.\n&gt; A bruise on our brains.'
      await post({ channel: 'CBOT', user: 'UJUHAN', text: delivered, ts: '410.4' })
      const [call] = mocks.captureFromMessage.mock.calls
      expect(call[0].text).toBe('Here’s a draft:\n> Look across a parking lot.\n> A bruise on our brains.')
      // Said in her own room: the notification says what happened, and the link opens the Calendar.
      const posted = mocks.postSlackMessage.mock.calls[0][0]
      expect(posted).toMatchObject({ channel: 'CBOT', threadTs: '410.4', username: 'Marqueta', text: 'Put on the calendar as a draft: Here’s a draft' })
      expect(JSON.stringify(posted.blocks)).toContain('https://www.goinvo.com/studio/marketing?view=calendar')
      expectValidSlackBlocks(posted.blocks)
    })

    it('files an idea in her own room with the question in the notification', async () => {
      mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'idea', idea: { title: 'Stickers & a tote', category: 'growth' } })
      process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'
      await post({ channel: 'CBOT', user: 'UJUHAN', text: 'we should do a merch table at Arlington Town Day, stickers and a tote', ts: '411.4' })
      const posted = mocks.postSlackMessage.mock.calls[0][0]
      expect(posted.text).toBe('Filed as an idea: Stickers &amp; a tote — keep it?')
      expect(JSON.stringify(posted.blocks)).toContain('view=thisWeek&focus=caught')
    })

    it('stays silent when thanked', async () => {
      await post({ channel: 'CBOT', user: 'UJUHAN', text: '<@UBOT> thanks!', ts: '412.4' })
      await runAfter()
      expect(mocks.postSlackMessage).not.toHaveBeenCalled()
    })

    it('does not look anybody up for chatter the filter turns away', async () => {
      await post({ channel: 'CMKT', user: 'UJUHAN', text: 'lunch at noon?', ts: '401.4' })
      expect(mocks.captureFromMessage).not.toHaveBeenCalled()
      expect(mocks.getSlackUserDisplayName).not.toHaveBeenCalled()
    })

    it('answers instead of capturing when she is addressed by name', async () => {
      answer.mockResolvedValueOnce({ text: 'ok' })
      await post({ channel: 'CMKT', user: 'UJUHAN', text: 'Marqueta, we should do stickers for Town Day', ts: '402.4' })
      expect(mocks.captureFromMessage).not.toHaveBeenCalled()
      expect(mocks.afterQueue).toHaveLength(1)
    })
  })
})
