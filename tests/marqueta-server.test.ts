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

describe('prepCallFor', () => {
  it('prepares a known contact, with contact details kept OUT of every block', async () => {
    routeOutreach({ prep: prepData() })
    const reply = await prepCallFor({ text: 'prep Jane Doe', senderName: 'Juhan', now: NOW })
    expect(reply.kind).toBe('outline')
    if (reply.kind !== 'outline') return
    expectValidSlackBlocks(reply.first, { maxBlocks: 15 })
    expectValidSlackBlocks(reply.second, { maxBlocks: 20 })
    expect(reply.text).toContain('Jane Doe')
    expect(reply.contactId).toBe('marketingContact.jane')

    // The caller decides where these go (DM inline, or ephemeral) — never the channel.
    expect(reply.contactDetails).toEqual(['Email: jane.doe@mgb.org', 'Phone: 617-555-0100'])
    const rendered = JSON.stringify([reply.first, reply.second])
    expect(rendered).not.toContain('jane.doe@mgb.org')
    expect(rendered).not.toContain('617-555-0100')

    const log = buttons(reply.first).find((button) => button.action_id === MARQUETA_ACTION.logCall)
    expect(decodeContactRef(log?.value)).toMatchObject({ contactId: 'marketingContact.jane', name: 'Jane Doe' })
    expect(buttons(reply.first).some((button) => button.action_id === MARQUETA_ACTION.addContact)).toBe(false)
    const studio = buttons(reply.first).find((button) => button.url)
    expect(studio?.url).toBe('https://www.goinvo.com/studio/marketing?view=outreach')
  })

  it('passes the typed request through, so "my meeting with Jane tomorrow" is meeting prep', async () => {
    routeOutreach({ prep: prepData() })
    const typed = await prepCallFor({ text: 'prep me for my meeting with Jane Doe tomorrow', senderName: 'Juhan', now: NOW })
    expect(typed.kind === 'outline' && typed.text).toMatch(/^Meeting prep — Jane Doe/)

    // From a button there is no request: Jane's own record decides.
    const pressed = await prepCallFor({
      ref: decodeContactRef(encodeContactRef({ contactId: 'marketingContact.jane' })),
      senderName: 'Juhan',
      now: NOW,
    })
    expect(pressed.kind === 'outline' && pressed.text).toMatch(/^Call prep — Jane Doe/)
  })

  it('prepares an organisation around its best contact, with a Log button for that contact', async () => {
    routeOutreach({ prep: prepData() })
    const reply = await prepCallFor({ text: 'prep Acme Health', senderName: 'Juhan', now: NOW })
    expect(reply.kind).toBe('outline')
    if (reply.kind !== 'outline') return
    // Pat is warm, Sam is cold: the outline is built around Pat.
    expect(reply.contactId).toBe('marketingContact.pat')
    const log = buttons(reply.first).find((button) => button.action_id === MARQUETA_ACTION.logCall)
    expect(decodeContactRef(log?.value)?.contactId).toBe('marketingContact.pat')
    expectValidSlackBlocks(reply.first, { maxBlocks: 15 })
  })

  it('asks which one when a first name matches two people', async () => {
    routeOutreach({ prep: prepData() })
    const reply = await prepCallFor({ text: 'prep Alex', senderName: 'Juhan', now: NOW })
    expect(reply.kind).toBe('candidates')
    if (reply.kind !== 'candidates') return
    expectValidSlackBlocks(reply.blocks)
    const refs = buttons(reply.blocks).map((button) => decodeContactRef(button.value)?.contactId)
    expect(refs.sort()).toEqual(['marketingContact.alexk', 'marketingContact.alexp'])
    expect(buttons(reply.blocks).every((button) => button.action_id === MARQUETA_ACTION.prepCall)).toBe(true)
  })

  it('builds a generic outline for someone not on file, with an Add button and no Log button', async () => {
    routeOutreach({ prep: prepData() })
    const reply = await prepCallFor({
      text: 'prep Chris Nobody at Unknown Co — met at a conference',
      senderName: 'Juhan',
      now: NOW,
    })
    expect(reply.kind).toBe('outline')
    if (reply.kind !== 'outline') return
    expect(reply.contactId).toBeUndefined()
    expect(reply.contactDetails).toEqual([])
    const all = buttons(reply.first)
    expect(all.some((button) => button.action_id === MARQUETA_ACTION.logCall)).toBe(false)
    const add = all.find((button) => button.action_id === MARQUETA_ACTION.addContact)
    expect(decodeContactRef(add?.value)).toMatchObject({
      contactId: '',
      name: 'Chris Nobody',
      organization: 'Unknown Co',
      note: 'met at a conference',
    })
    expectValidSlackBlocks(reply.first, { maxBlocks: 15 })
    expectValidSlackBlocks(reply.second, { maxBlocks: 20 })
  })

  it('offers no Add button when adding would write nothing (a free-mail address)', async () => {
    routeOutreach({ prep: prepData() })
    const reply = await prepCallFor({ text: 'prep someone@gmail.com', senderName: 'Juhan', now: NOW })
    const all = reply.kind === 'outline' ? buttons(reply.first) : []
    expect(all.some((button) => button.action_id === MARQUETA_ACTION.addContact)).toBe(false)
  })

  it('answers in words when there is nobody to prep, or the records cannot be read', async () => {
    routeOutreach({ prep: prepData() })
    await expect(prepCallFor({ text: 'prep', senderName: 'Juhan', now: NOW })).resolves.toMatchObject({ kind: 'text' })

    mocks.outreach.fetch.mockRejectedValue(new Error('Sanity is down'))
    const reply = await prepCallFor({ text: 'prep Jane Doe', senderName: 'Juhan', now: NOW })
    expect(reply).toMatchObject({ kind: 'text' })
  })
})

describe('prepCallList', () => {
  const followUp = (id: string, name: string, extra: Partial<PrepDataContact>): PrepDataContact => ({
    _id: id,
    name,
    organization: 'Acme',
    warmth: 'cold',
    status: 'contacted',
    interactions: [{ at: '2026-09-14T14:00:00Z', by: 'Juhan', statusAfter: 'contacted', channel: 'phone' }],
    ...extra,
  })

  it('puts the people who replied first, and keeps a colleague’s follow-ups off my list', async () => {
    routeOutreach({
      prep: prepData([
        followUp('marketingContact.cold', 'Casey Cold', { owner: 'juhan', followUpAt: daysFromNow(-2) }),
        followUp('marketingContact.replied', 'Riley Replied', { owner: 'Juhan', status: 'responded', followUpAt: daysFromNow(-1) }),
        followUp('marketingContact.erics', 'Erin Elsewhere', { owner: 'Eric', followUpAt: daysFromNow(1) }),
      ]),
    })
    const resolveOwner = (raw: string) => (raw.toLowerCase() === 'juhan' ? 'Juhan' : raw)
    const { blocks, text } = await prepCallList({ now: NOW, resolveOwner, personName: 'Juhan', handle: '<@UBOT>' })
    expectValidSlackBlocks(blocks)
    const rendered = JSON.stringify(blocks)
    expect(rendered.indexOf('Riley Replied')).toBeGreaterThan(-1)
    expect(rendered.indexOf('Riley Replied')).toBeLessThan(rendered.indexOf('Casey Cold'))
    expect(rendered).not.toContain('Erin Elsewhere')
    // Ready for a first call: research reviewed, identity confirmed, owned by Juhan.
    expect(rendered).toContain('Jane Doe')
    expect(rendered).toContain('Calls for Juhan')
    expect(text).toMatch(/calls worth making for Juhan/)
  })

  it('says plainly when nobody is on the list', async () => {
    routeOutreach({ prep: { contacts: [], research: [], offers: [], evidence: [] } })
    const { blocks, text } = await prepCallList({ now: NOW, handle: '<@UBOT>' })
    expectValidSlackBlocks(blocks)
    expect(JSON.stringify(blocks)).toContain('prep Sam Rivera at Acme')
    expect(text).toMatch(/Nobody is on the call list/)
  })
})

describe('addContactFromSlack', () => {
  it('creates the typed person once, with a deterministic id', async () => {
    routeOutreach({ existingById: null })
    const ref = decodeContactRef(encodeContactRef({ name: 'Chris Nobody', organization: 'Unknown Co', note: 'met at a conference' }))!
    const first = await addContactFromSlack({ ref, ownerName: 'Juhan', now: NOW })
    expect(first).toMatchObject({ ok: true, created: true, label: 'Chris Nobody (Unknown Co)' })
    const document = mocks.outreach.createIfNotExists.mock.calls[0][0] as Record<string, unknown>
    expect(document).toMatchObject({
      _type: 'marketingContact',
      name: 'Chris Nobody',
      organization: 'Unknown Co',
      owner: 'Juhan',
      status: 'new',
      warmth: 'unknown',
      howWeKnow: 'met at a conference',
    })
    expect(document).not.toHaveProperty('email')
    expect(first.ok && first.contactId).toBe(document._id)

    // A retry finds the record the first press made: no second create.
    routeOutreach({ existingById: { _id: document._id } })
    const again = await addContactFromSlack({ ref, ownerName: 'Juhan', now: NOW })
    expect(again).toMatchObject({ ok: true, created: false, contactId: document._id })
    expect(mocks.outreach.createIfNotExists).toHaveBeenCalledTimes(1)
  })

  it('refuses a ref with neither a name nor an organisation', async () => {
    routeOutreach({})
    const result = await addContactFromSlack({
      ref: { contactId: '', organization: '', name: 'someone', role: 'CIO', note: '', outcome: '' },
      ownerName: 'Juhan',
      now: NOW,
    })
    expect(result).toEqual({ ok: false, message: 'Tell me a name or an organisation.' })
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
  })
})

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

describe('logCallFromSlack', () => {
  it('writes the quick log conditionally on the revision it read', async () => {
    routeOutreach({ logContact: loggable })
    const result = await quickLog()
    expect(result).toMatchObject({ ok: true, statusAfter: 'contacted', label: 'Jane Doe' })
    // Three days from Thursday 10am is Sunday in Arlington.
    expect(result.message).toBe('Logged: Left a voicemail with Jane Doe · follow-up Sun 27 Sep.')
    expect(result.undo).toMatchObject({ contactId: 'marketingContact.jane', interactionKey: 'slack-V123' })
    expect(result.undo?.prior.status).toBe('researched')

    const [patch] = patchesFor('marketingContact.jane')
    expect(patch.ops.map((op) => op[0])).toEqual(['setIfMissing', 'set', 'unset', 'ifRevisionId', 'insert'])
    expect(opsOf(patch, 'setIfMissing')[0][0]).toEqual({ interactions: [] })
    expect(setOf(patch)).toMatchObject({ status: 'contacted', lastContactedAt: NOW.toISOString(), attributionChannel: 'phone' })
    expect(opsOf(patch, 'ifRevisionId')[0][0]).toBe('r1')
    const [where, path, entries] = opsOf(patch, 'insert')[0] as [string, string, Record<string, unknown>[]]
    expect([where, path]).toEqual(['after', 'interactions[-1]'])
    expect(entries[0]).toMatchObject({ _key: 'slack-V123', by: 'Juhan', outcome: 'Left a voicemail', intel: 'Left a message about the pilot' })
  })

  it('is a no-op when the same key is already on the record (a Slack retry)', async () => {
    routeOutreach({ logContact: { ...loggable, interactions: [{ _key: 'slack-V123' }] } })
    const result = await quickLog()
    expect(result).toMatchObject({ ok: true, skipped: true })
    expect(mocks.patches).toHaveLength(0)
  })

  it('re-reads once on a revision conflict and retries against the fresh record', async () => {
    routeOutreach({ logContact: [loggable, { ...loggable, _rev: 'r2', status: 'contacted' }] })
    mocks.commit.mockImplementationOnce(async () => {
      throw conflict()
    })
    const result = await quickLog()
    expect(result.ok).toBe(true)
    const writes = patchesFor('marketingContact.jane')
    expect(writes).toHaveLength(2)
    expect(opsOf(writes[1], 'ifRevisionId')[0][0]).toBe('r2')
    // The Undo carries what the SECOND write actually replaced.
    expect(result.undo?.prior.status).toBe('contacted')
  })

  it('stands down if the re-read shows the log already landed', async () => {
    routeOutreach({ logContact: [loggable, { ...loggable, _rev: 'r2', interactions: [{ _key: 'slack-V123' }] }] })
    mocks.commit.mockImplementationOnce(async () => {
      throw conflict()
    })
    await expect(quickLog()).resolves.toMatchObject({ ok: true, skipped: true })
    expect(patchesFor('marketingContact.jane')).toHaveLength(1)
  })

  it('gives up after a second conflict rather than forcing the write', async () => {
    routeOutreach({ logContact: loggable })
    mocks.commit.mockImplementation(async () => {
      throw conflict()
    })
    const result = await quickLog()
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/at the same moment/)
  })

  it('writes nothing when onlyIfReversible and the Undo could not put it back', async () => {
    routeOutreach({
      logContact: {
        ...loggable,
        status: 'lost',
        closedAt: '2026-05-01T00:00:00Z',
        closedValue: 0,
        closeReason: 'x'.repeat(600),
      },
    })
    const result = await quickLog({ outcomeKey: 'interested', onlyIfReversible: true })
    expect(result).toMatchObject({ ok: false, needsForm: true })
    expect(mocks.patches).toHaveLength(0)
  })
})

describe('undoCallLog', () => {
  const undo: CallLogUndo = {
    contactId: 'marketingContact.jane',
    interactionKey: 'slack-V123',
    prior: { status: 'researched', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' },
  }
  const afterLog = {
    ...loggable,
    _rev: 'r5',
    status: 'contacted',
    followUpAt: daysFromNow(3),
    lastContactedAt: NOW.toISOString(),
    attributionChannel: 'phone',
    interactions: [{ _key: 'int-earlier' }, { _key: 'slack-V123' }],
  }

  it('removes exactly that interaction and restores the prior fields', async () => {
    routeOutreach({ logContact: afterLog })
    const result = await undoCallLog(undo, 'Juhan')
    expect(result.ok).toBe(true)
    expect(result.message).toMatch(/Undone by Juhan: the call with Jane Doe is off the record — back to Researched/)
    const [patch] = patchesFor('marketingContact.jane')
    expect(setOf(patch)).toEqual({ status: 'researched' })
    expect(unsetOf(patch)).toEqual(
      expect.arrayContaining(['followUpAt', 'lastContactedAt', 'attributionChannel', 'nextStep', 'interactions[_key=="slack-V123"]']),
    )
    expect(opsOf(patch, 'ifRevisionId')[0][0]).toBe('r5')
  })

  it('refuses when something was logged since', async () => {
    routeOutreach({ logContact: { ...afterLog, interactions: [{ _key: 'slack-V123' }, { _key: 'int-later' }] } })
    const result = await undoCallLog(undo, 'Juhan')
    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/Something else was logged since/)
    expect(mocks.patches).toHaveLength(0)
  })

  it('refuses a key that could not have come from us', async () => {
    routeOutreach({ logContact: afterLog })
    const result = await undoCallLog({ ...undo, interactionKey: 'x"]|*[_type' }, 'Juhan')
    expect(result.ok).toBe(false)
    expect(mocks.outreach.fetch).not.toHaveBeenCalled()
  })
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

    mocks.getSlackUserDisplayName.mockResolvedValue('eric')
    await expect(resolvePresserName({ slackUserId: 'UNEW', entries: TEAM })).resolves.toBe('Eric')
    mocks.getSlackUserDisplayName.mockResolvedValue('Juhan Sonin')
    await expect(resolvePresserName({ slackUserId: 'UNEW', entries: TEAM })).resolves.toBe('Juhan Sonin')
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
    await expect(takeTask(eric)).resolves.toMatchObject({ ok: false, message: 'Juhan already has that one.' })
    expect(mocks.patches).toHaveLength(0)
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
    await expect(takeTask(eric)).resolves.toMatchObject({ ok: false, message: 'Juhan already has that one.' })
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
    await expect(takeTask({ ...juhan, slackUserId: 'UOTHER' })).resolves.toMatchObject({ ok: false, message: 'Juhan already has that one.' })
    expect(mocks.patches).toHaveLength(0)
  })

  it('still writes when the roster cannot be read — only the card’s mention id is lost', async () => {
    routeOutreach({ task: task(), availability: new Error('down') })
    const result = await markTaskDone(juhan)
    expect(result.ok).toBe(true)
    // Without a roster the stamped id is all there is.
    expect(result.task?.slackUserId).toBe('UERIC')
  })
})

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
    expect(post).toMatchObject({ channel: 'CMKTBOT', username: 'Marqueta', unfurl: false })
    expect(post.text).toContain('<@UJUHAN>')
    expect(post.text).toContain('<@UERIC>')
    const blocks: Block[] = post.blocks
    expectValidSlackBlocks(blocks, { maxBlocks: 30 })
    const ericHeading = sectionIndex(blocks, (text) => text.startsWith('<@UERIC> — here'))
    const juhanHeading = sectionIndex(blocks, (text) => text.startsWith('<@UJUHAN> — here'))
    const juhanTask = sectionIndex(blocks, (text) => text.includes('Call three past clients'))
    expect(ericHeading).toBeGreaterThan(-1)
    // Juhan's task sits under Juhan, whatever id is stamped on it.
    expect(juhanTask).toBeGreaterThan(juhanHeading)
    expect(juhanHeading).toBeGreaterThan(ericHeading)
    expect(JSON.stringify(blocks)).toContain('Follow up with Riley Replied')
    expect(JSON.stringify(blocks)).toContain('Nobody has taken: Update the offer page')

    expect(setOf(record)).toMatchObject({
      week: WEEK,
      postedWeek: WEEK,
      postedTs: '1790000000.0001',
      lastHealthyAt: NOW.toISOString(),
    })
    expect(setOf(record).steps[0]).toMatchObject({ name: 'checkin', ok: true, count: 3 })
    expect(unsetOf(record)).toContain('error')
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
    await expect(runWeeklyCheckIn({ now: NOW })).resolves.toMatchObject({ skipped: true, skipReason: 'alreadyPosted' })
    expect(mocks.patches).toHaveLength(0)

    mocks.postSlackMessage.mockResolvedValue({ channel: 'CMKTBOT', ts: '2.2' })
    await expect(runWeeklyCheckIn({ now: NOW, force: true })).resolves.toMatchObject({ posted: true })
  })

  it('never overrides a fresh claim, even with force; a stale one only with force', async () => {
    slackEnv()
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1', claimedWeek: WEEK, claimedAt: minutesAgo(2) } })
    await expect(runWeeklyCheckIn({ now: NOW, force: true })).resolves.toMatchObject({ skipped: true, skipReason: 'claimed' })

    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1', claimedWeek: WEEK, claimedAt: minutesAgo(20) } })
    await expect(runWeeklyCheckIn({ now: NOW })).resolves.toMatchObject({ skipped: true, skipReason: 'staleClaim' })
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

  // A busy week: five people with four due tasks each fills the message to the
  // ceiling, and the follow-up nobody owns — a contact who REPLIED — used to be
  // appended after the trim and silently dropped, while the run still counted it.
  it('keeps the "follow-ups nobody owns" line on a week that fills all thirty blocks', async () => {
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
    const result = await runWeeklyCheckIn({ now: NOW, dryRun: true, botUserId: 'UBOT' })
    expect(result).toMatchObject({ ok: true, followUpCount: 1 })
    expectValidSlackBlocks(result.blocks, { maxBlocks: 30 })
    // At the ceiling, so the line could not have had a block of its own.
    expect(result.blocks).toHaveLength(30)
    const holder = result.blocks.find((block) => JSON.stringify(block).includes('Follow-ups nobody owns'))
    expect(holder).toBeDefined()
    expect(holder?.type).toBe('context')
    expect(holder?.elements.length).toBeGreaterThan(1)
    expect(JSON.stringify(holder)).toContain('Robin Replied')
    expect(result.detail).not.toMatch(/did not fit/)
  })

  it('puts the line beside "Nobody has taken" without spending a block', async () => {
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
    expectValidSlackBlocks(result.blocks, { maxBlocks: 30 })
    const nobody = result.blocks.find((block) => block.type === 'context' && String(block.elements[0]?.text).startsWith('Nobody has taken:'))
    expect(nobody?.elements).toHaveLength(2)
    expect(nobody?.elements[1].text).toMatch(/^Follow-ups nobody owns: /)
  })

  it('withUnownedFollowUps: a block only when one is free, and says when there was no room at all', () => {
    const line = 'Follow-ups nobody owns: Robin (Acme), overdue'
    const header: Block = { type: 'header', text: { type: 'plain_text', text: 'Thursday check-in' } }
    const week: Block = { type: 'context', elements: [{ type: 'mrkdwn', text: '2026-W39' }] }
    const button: Block = { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Open the plan' }, url: 'https://x.test' }] }
    const card = (n: number): Block => ({ type: 'section', block_id: `card-${n}`, text: { type: 'mrkdwn', text: `task ${n}` } })

    // Under the ceiling: its own context block, above the Studio button.
    const roomy = withUnownedFollowUps([header, week, card(1), button], line)
    expect(roomy.placed).toBe(true)
    expect(roomy.blocks.map((block) => block.type)).toEqual(['header', 'context', 'section', 'context', 'actions'])
    expectValidSlackBlocks(roomy.blocks)

    // At the ceiling with no "Nobody has taken": into the week line, same block count.
    const full = [header, week, ...Array.from({ length: 27 }, (_, n) => card(n)), button]
    const packed = withUnownedFollowUps(full, line)
    expect(packed).toMatchObject({ placed: true })
    expect(packed.blocks).toHaveLength(30)
    expect(packed.blocks[1].elements.map((element: Block) => element.text)).toEqual(['2026-W39', line])
    expectValidSlackBlocks(packed.blocks, { maxBlocks: 30 })
    // The input is not mutated — the builder's blocks are the caller's.
    expect(week.elements).toHaveLength(1)

    // Nowhere at all: reported, never silently lost.
    const bare = [header, ...Array.from({ length: 28 }, (_, n) => card(n)), button]
    expect(withUnownedFollowUps(bare, line)).toEqual({ blocks: bare, placed: false })

    // Nothing to say is not a failure.
    expect(withUnownedFollowUps(bare, '')).toEqual({ blocks: bare, placed: true })
  })

  it('gives the claim back and records the failure when Slack refuses the post', async () => {
    slackEnv()
    routeOutreach({ checkIn: checkInData(), heartbeat: { _rev: 'h1' } })
    mocks.postSlackMessage.mockResolvedValue(null)
    const result = await runWeeklyCheckIn({ now: NOW })
    expect(result).toMatchObject({ ok: false, posted: false })
    const [, record] = patchesFor(CHECKIN_HEARTBEAT_DOC_ID)
    expect(setOf(record).steps[0]).toMatchObject({ name: 'checkin', ok: false })
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
