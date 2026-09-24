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
    setMarketingAvailability: vi.fn(),
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
vi.mock('@/lib/marketing/slackActions.server', () => ({ setMarketingAvailability: mocks.setMarketingAvailability }))
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
  decodeCallLogUndo,
  decodeContactRef,
  MARQUETA_ACTION,
  checkInTaskBlockId,
} from '@/lib/marketing/marquetaActions'
import {
  answerMarqueta,
  AVAILABILITY_RECORD_QUERY,
  HEARTBEAT_QUERY,
  MINE_DATA_QUERY,
  readTimeOff,
  WEEK_QUERY,
  type MarquetaReply,
} from '@/lib/marketing/marquetaChat.server'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
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
    if (query === AVAILABILITY_RECORD_QUERY) return fixtures.availabilityRecord ?? null
    throw new Error(`unrouted query: ${query.slice(0, 80)}`)
  })
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
  mocks.setMarketingAvailability.mockResolvedValue({ ok: true, message: 'Marked away 2026-09-28 to 2026-10-02.' })
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
    for (const text of ['prep Jane Doe at Acme Health', 'runway', 'my tasks', 'called Jane Doe, left a voicemail', 'pipeline']) {
      const reply = await ask(`<@UBOT> ${text}`)
      expect(reply.text).toMatch(/studio team/)
      expect(reply.blocks).toBeUndefined()
    }
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    expect(mocks.loadStrategySnapshot).not.toHaveBeenCalled()
    expect(mocks.patches).toHaveLength(0)
  })

  it('fails closed when Slack will not say who is asking', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: false })
    const reply = await ask('<@UBOT> strategy')
    expect(reply.text).toMatch(/couldn’t check who you are/)
    expect(mocks.loadStrategySnapshot).not.toHaveBeenCalled()
  })

  it('still answers help and files a capture for anybody', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Client', isGuest: true, isBot: false })
    const help = await ask('<@UBOT> hello?')
    expect(help.text).toContain('<@UBOT>')
    expect(help.text).not.toContain('@Marqueta')

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
    expect(reply.text).toMatch(/couldn’t reach the outreach records/)
  })

  it('gives the call list for "my calls", as the requester’s list', async () => {
    const reply = await ask('<@UBOT> my calls')
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

    expect(reply.text).toMatch(/Logged: Left a voicemail with Jane Doe/)
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
    const add = buttonsIn(reply.blocks).find((element) => element.action_id === MARQUETA_ACTION.addContact)
    expect(add?.text.text).toBe('Add Priya Patel to outreach')
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

    // The form path: the button carries a label and a scrubbed organisation.
    // (The note is the person's own message, already in the channel.)
    const offered = await ask(typed)
    const ref = decodeContactRef(buttonsIn(offered.blocks)[0]?.value)
    expect(ref).toMatchObject({ contactId: 'contact-imported', organization: '', outcome: 'interested' })
    expect(ref?.name).not.toContain('@')
    expect(offered.text).not.toContain('jd@mgb.org')

    // The one-press path: the confirmation names nobody by address either.
    routeOutreach({ prep: prepData([imported]), logContact: { ...imported, _rev: 'r1', interactions: [] } })
    const logged = await ask(typed, { ts: '1727182800.000200' })
    expect(logged.text).toMatch(/^Logged: Talked — interested with /)
    expect(JSON.stringify(logged.blocks?.[0])).not.toContain('jd@mgb.org')
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
    expect(reply.text).toMatch(/Who was the call with/)
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
    expect(JSON.stringify(reply.blocks)).toContain('+8 more')
    expect(JSON.stringify(reply.blocks)).toContain('4 more follow-ups')
    expectValidSlackBlocks(reply.blocks!)
  })

  it('will not guess whose list it is', async () => {
    mocks.getSlackUserDisplayName.mockResolvedValue(undefined)
    const reply = await ask('<@UBOT> my tasks', { slackUserId: 'UNEW', personName: 'Someone' })
    expect(reply.text).toMatch(/which name on the board is yours/)
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
    // The old path — createOrReplace over the whole record — is never used.
    expect(mocks.setMarketingAvailability).not.toHaveBeenCalled()
  }
  const setOf = (record: PatchRecord) => (record.ops.find((op) => op[0] === 'set')?.[1] || {}) as Record<string, unknown>

  it('writes it under the board name, not the Slack display name — patched, never replaced', async () => {
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
    expect(reply.text).toContain('away 2026-09-28 to 2026-10-02')
    // The way back, in words (no handler exists for an availability button).
    expect(reply.text).toContain('I’m back')
    expect(mocks.setMarketingAvailability).not.toHaveBeenCalled()
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
    // What it replaced is said out loud, so it can be put back.
    expect(reply.text).toContain('Before this I had you away 2026-10-12 to 2026-10-16')
  })

  it('reads "until" as the last day, from today', async () => {
    await ask('<@UBOT> I’m away until 2026-10-02')
    expect(setOf(availabilityWrites().patched[0])).toMatchObject({ status: 'away', from: '2026-09-24', until: '2026-10-02' })
  })

  it('"I’m back" is the reverse: available from today, with the old end date removed', async () => {
    routeOutreach({
      availabilityRecord: { _id: 'marketingTeamAvailability.juhan', _rev: 'r', ownerName: 'Juhan', slackUserId: 'UJUHAN', status: 'away', from: '2026-09-21', until: '2026-09-27' },
    })
    const reply = await ask('<@UBOT> I’m back')
    const [record] = availabilityWrites().patched
    expect(setOf(record)).toMatchObject({ status: 'available', from: '2026-09-24' })
    expect(record.ops).toContainEqual(['unset', ['until']])
    expect(reply.text).toMatch(/Wrong\? Tell me the days you’re away/)
  })

  it('never writes on a QUESTION about who is away — the asker is not the subject', async () => {
    for (const text of [
      'who’s away this week?',
      'is Juhan away next week?',
      'is anyone on holiday?',
      'who is out on PTO?',
      'what does the pipeline look like with Eric away?',
      'who is out on pto',
    ]) {
      const reply = await ask(`<@UBOT> ${text}`)
      expect(reply.text, text).toMatch(/haven’t changed anything|Nothing has changed/)
    }
    expectNoWrite()
    // Turned away on the words alone: no roster read, no record read.
    expect(mocks.outreach.fetch).not.toHaveBeenCalledWith(TEAM_AVAILABILITY_QUERY)
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
      expect(reply.text, text).toMatch(/haven’t changed anything|Nothing has changed/)
    }
    expectNoWrite()
  })

  it('asks for exact days rather than guessing them', async () => {
    for (const text of ['I’m on holiday friday', 'I’m away for 2 weeks', 'away in October', 'I’m back on Monday', 'I’m away 2026-09-28, back 2026-10-05']) {
      const reply = await ask(`<@UBOT> ${text}`)
      expect(reply.text, text).toMatch(/Which days\?/)
    }
    expectNoWrite()
  })

  it('a guest cannot write anybody’s availability, their own name included', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Juhan', isGuest: true, isBot: false })
    const reply = await ask('<@UBOT> I’m away next week', { slackUserId: 'UGUEST', personName: 'Juhan' })
    expect(reply.text).toMatch(/studio team/)
    expectNoWrite()
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
  })

  it('a member whose display name matches a name linked to someone else is NOT that person', async () => {
    mocks.getSlackUserProfile.mockResolvedValue({ ok: true, name: 'Juhan', isGuest: false, isBot: false })
    const namesake = { slackUserId: 'UOTHER', personName: 'Juhan' }

    const away = await ask('<@UBOT> I’m away next week', namesake)
    expect(away.text).toMatch(/which name on the board is yours/)
    expectNoWrite()

    // Nor can they read his list, or log a call as him.
    const mine = await ask('<@UBOT> my tasks', namesake)
    expect(mine.text).toMatch(/which name on the board is yours/)
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
    expect(reply.text).toMatch(/which name on the board is yours/)
    expect(availabilityWrites().patched).toHaveLength(0)
  })

  it('changes nothing when the team list cannot be read', async () => {
    routeOutreach({ availability: new Error('roster down') })
    const reply = await ask('<@UBOT> away 2026-09-28 2026-10-02')
    expectNoWrite()
    expect(reply.text).toMatch(/nothing changed/)
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
    expect(read('I was away last week').kind).toBe('notFirstPerson')
    expect(read('I’m sure Bob is away').kind).toBe('notFirstPerson')
    expect(read('away 2026-09-01 2026-09-05').kind).toBe('unclearDates')
    expect(read('I’m away next week?').kind).toBe('question')
    expect(readTimeOff('I’m away next week', { today: '2026-09-24', mentionsSomeoneElse: true }).kind).toBe('someoneElse')
  })
})

// ── Who can read the answer ──────────────────────────────────────────────────

describe('the audience gate', () => {
  it('answers nothing about the work in a channel it is not configured for — whoever asks', async () => {
    process.env.SLACK_MARKETING_CHANNEL_ID = 'CBOT'
    for (const text of ['runway', 'prep Jane Doe at Acme Health', 'pipeline', 'my tasks', 'my calls', 'week', 'called Jane Doe, left a voicemail']) {
      const reply = await ask(`<@UBOT> ${text}`, { channel: 'CSHARED' })
      expect(reply.text, text).toContain('I only talk about outreach, money and the plan in a DM or in <#CBOT>')
      expect(reply.blocks).toBeUndefined()
      expect(reply.ephemeral).toBeUndefined()
    }
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
    expect(mocks.loadStrategySnapshot).not.toHaveBeenCalled()
    expect(mocks.patches).toHaveLength(0)
  })

  it('answers in a DM, in her own room and in the marketing channels she sits in', async () => {
    process.env.SLACK_MARKETING_CHANNEL_ID = 'CBOT'
    process.env.SLACK_MARKETING_CHANNEL_IDS = 'CBOT,CMKT'
    for (const channel of ['D1', 'CBOT', 'CMKT']) {
      const reply = await ask('<@UBOT> prep Jane Doe at Acme Health', { channel })
      expect(reply.text, channel).toContain('Jane Doe')
    }
  })

  it('still gives help anywhere', async () => {
    const reply = await ask('<@UBOT> hello?', { channel: 'CSHARED' })
    expect(reply.text).toContain('prep Sam Rivera at Acme')
  })
})

// ── Money, strategy, pipeline, heartbeat, week ───────────────────────────────

describe('the questions', () => {
  const pulse = (from: string, to: string) => summarizeOutreach([], { from, to, now: NOW })
  const strategyLoad = {
    snapshot: {
      monthKey: '2026-09',
      money: '4.5 months of runway, to 11 Jan 2027.',
      postureId: 'rebuild',
      postureTitle: 'Rebuild',
      postureStrategy: 'Outreach leads.',
      thisMonth: pulse('2026-09-01', '2026-10-01'),
      lastMonth: null,
      trend: 'First month on record.',
      pipeline: { inMeeting: 2, inOpportunity: 1, estimatedValue: 45000, wonThisMonth: 1, wonValueThisMonth: 12000 },
      gates: [],
      question: 'Is outreach getting the hours it needs?',
    },
    review: null,
    due: { due: true, reason: 'Never checked.' },
    runway: {
      summary: '4.5 months of runway, to 11 Jan 2027.',
      resolved: { disagreement: null },
      checkIn: { due: true, urgent: false, reason: 'Acme was marked won on 20 Sep —', question: 'did it extend the runway?' },
    },
    latestWin: null,
    openRethink: null,
    contacts: [],
  }

  it('answers money with the runway, the check-in and the pipeline', async () => {
    mocks.loadStrategySnapshot.mockResolvedValue(strategyLoad)
    const reply = await ask('<@UBOT> how are we for money?')
    expect(reply.text).toContain('4.5 months')
    expect(reply.text).toContain('did it extend the runway?')
    expect(reply.text).toMatch(/Pipeline/)
  })

  it('answers strategy and pipeline from the same load', async () => {
    mocks.loadStrategySnapshot.mockResolvedValue(strategyLoad)
    expect((await ask('<@UBOT> strategy')).text).toContain('*Strategy — September 2026*')
    expect((await ask('<@UBOT> pipeline')).text).toContain('*Pipeline*')
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
    expect(reply.text).toContain('Planned &lt;4&gt; items')
    expect(reply.text).toContain('Thursday check-in has never run')
  })

  it('escapes task titles in the week', async () => {
    routeOutreach({ week: [{ title: 'Pilot deck: <5% adoption & why', kind: 'content' }] })
    const reply = await ask('<@UBOT> what’s on this week?')
    expect(reply.text).toContain('&lt;5% adoption &amp; why')
    expect(mocks.outreach.fetch).toHaveBeenCalledWith(WEEK_QUERY, { planPrefix: 'weekly-plan/' })
  })

  it('answers a failure in words', async () => {
    mocks.loadStrategySnapshot.mockRejectedValue(new Error('down'))
    expect((await ask('<@UBOT> runway')).text).toMatch(/Something went wrong/)
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

    it('captures silently, storing the raw text exactly as before', async () => {
      mocks.captureFromMessage.mockResolvedValue({ ok: true, kind: 'idea', idea: { title: 'x', category: 'event' } })
      const raw = 'We should do a co-branded R&amp;D webinar with AT&amp;T for <https://acme.org|Acme> folks'
      await post({ channel: 'CMKT', user: 'UJUHAN', text: raw, ts: '400.4' })
      expect(mocks.captureFromMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: raw, channel: 'CMKT', ts: '400.4', personName: 'Juhan Sonin' }),
      )
      expect(mocks.afterQueue).toHaveLength(0)
      // Captured in a human channel, and said nothing there.
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
