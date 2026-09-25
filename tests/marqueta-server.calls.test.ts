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

import type { TeamMemberAvailability } from '@/lib/marketing/availability'
import { logCallFromSlack, undoCallLog } from '@/lib/marketing/callLog.server'
import {
  addContactFromSlack,
  PREP_DATA_QUERY,
  prepCallFor,
  prepCallList,
  type PrepData,
  type PrepDataContact,
} from '@/lib/marketing/callPrep.server'
import { decodeContactRef, encodeContactRef, MARQUETA_ACTION, type CallLogUndo } from '@/lib/marketing/marquetaActions'
import { STRATEGY_DATA_QUERY } from '@/lib/marketing/strategyCheck.server'
import { TEAM_AVAILABILITY_QUERY } from '@/lib/marketing/team.server'
import { CHECK_IN_DATA_QUERY } from '@/lib/marketing/weeklyCheckIn.server'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Thursday 24 Sep 2026, 10am in Arlington. */
const NOW = new Date('2026-09-24T14:00:00Z')
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString()

const conflict = () => Object.assign(new Error('Document has been modified since the revision given'), { statusCode: 409 })


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
    // "Open Outreach" lands on THIS contact, with the outline open.
    const studio = buttons(reply.first).find((button) => button.url)
    expect(studio?.text.text).toBe('Open Outreach')
    expect(studio?.url).toBe('https://www.goinvo.com/studio/marketing?view=outreach&contact=marketingContact.jane&action=prep')
    expect(reply.threadText).toBe('Offer, voicemail and email draft for Jane Doe')
  })

  it('passes the typed request through, so "my meeting with Jane tomorrow" is meeting prep', async () => {
    routeOutreach({ prep: prepData() })
    const typed = await prepCallFor({ text: 'prep me for my meeting with Jane Doe tomorrow', senderName: 'Juhan', now: NOW })
    expect(typed.kind === 'outline' && typed.text).toBe('Meeting prep: Jane Doe (Mass General Brigham)')

    // From a button there is no request: Jane's own record decides.
    const pressed = await prepCallFor({
      ref: decodeContactRef(encodeContactRef({ contactId: 'marketingContact.jane' })),
      senderName: 'Juhan',
      now: NOW,
    })
    expect(pressed.kind === 'outline' && pressed.text).toBe('Call prep: Jane Doe (Mass General Brigham)')
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

  it('asks which person when nobody at an organisation is clearly the one to call', async () => {
    // Same stage, same warmth: an outline for whoever sorts first alphabetically
    // is prep for a call nobody decided to make.
    routeOutreach({
      prep: prepData([
        { _id: 'marketingContact.sam2', name: 'Sam Rivera', organization: 'Crossover Health', warmth: 'cold', status: 'new' },
        { _id: 'marketingContact.scott', name: 'Scott Shreeve', organization: 'Crossover Health', warmth: 'cold', status: 'new' },
      ]),
    })
    const reply = await prepCallFor({ text: 'prep Crossover Health', senderName: 'Juhan', now: NOW })
    expect(reply.kind).toBe('candidates')
    if (reply.kind !== 'candidates') return
    expect(reply.text).toBe('Who at Crossover Health?')
    expectValidSlackBlocks(reply.blocks)
    expect(buttons(reply.blocks).map((button) => decodeContactRef(button.value)?.contactId).sort()).toEqual([
      'marketingContact.sam2',
      'marketingContact.scott',
    ])
  })

  it('an email-first outline’s Log it… opens with "Sent an email" chosen', async () => {
    routeOutreach({ prep: prepData() })
    const reply = await prepCallFor({ text: 'prep Sam Rivera at Acme Health', senderName: 'Juhan', now: NOW })
    expect(reply.kind).toBe('outline')
    if (reply.kind !== 'outline') return
    expect(reply.text).toBe('Email first: Sam Rivera (Acme Health)')
    const log = buttons(reply.first).find((button) => button.action_id === MARQUETA_ACTION.logCall)
    expect(decodeContactRef(log?.value)).toMatchObject({ contactId: 'marketingContact.sam', outcome: 'emailed' })
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
    const { blocks, text } = await prepCallList({ now: NOW, resolveOwner, personName: 'Juhan' })
    expectValidSlackBlocks(blocks)
    const rendered = JSON.stringify(blocks)
    expect(rendered.indexOf('Riley Replied')).toBeGreaterThan(-1)
    expect(rendered.indexOf('Riley Replied')).toBeLessThan(rendered.indexOf('Casey Cold'))
    expect(rendered).not.toContain('Erin Elsewhere')
    // Ready for a first call: research reviewed, identity confirmed, owned by Juhan.
    expect(rendered).toContain('Jane Doe')
    expect(rendered).toContain('Calls for Juhan')
    // The first line is the notification: who, how many, how many overdue.
    expect(text).toMatch(/^Calls for Juhan — \d+ calls worth making, 2 overdue$/)
  })

  it('calls somebody "they know us" only when the relationship says so — never for merely being on file', async () => {
    routeOutreach({
      prep: {
        ...prepData([
          // Imported as "cool", never contacted: a guess, not a relationship.
          followUp('marketingContact.never', 'Sam Rivera', { owner: 'Juhan', warmth: 'cool', status: 'researched', interactions: [], followUpAt: daysFromNow(1) }),
          followUp('marketingContact.cool', 'Casey Cool', { owner: 'Juhan', warmth: 'cool', followUpAt: daysFromNow(1) }),
        ]),
      },
    })
    const { blocks } = await prepCallList({ now: NOW, personName: 'Juhan', resolveOwner: (raw) => raw })
    const line = (name: string) => String(blocks.find((block) => String(block.text?.text || '').includes(name))?.text?.text || '')
    expect(line('Casey Cool')).toContain('they know us')
    expect(line('Sam Rivera')).not.toContain('they know us')
  })

  it('says plainly when nobody is on the list', async () => {
    routeOutreach({ prep: { contacts: [], research: [], offers: [], evidence: [] } })
    const { blocks, text } = await prepCallList({ now: NOW })
    expectValidSlackBlocks(blocks)
    expect(JSON.stringify(blocks)).toContain('`Marqueta, prep Sam Rivera at Acme`')
    expect(text).toBe('Nobody’s on your list yet.')
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
    expect(result).toMatchObject({ ok: true, statusBefore: 'researched', statusAfter: 'contacted', label: 'Jane Doe' })
    // Three days from Thursday 10am is Sunday in Arlington: the follow-up moves to Monday.
    expect(result.message).toBe('Logged: Left a voicemail with Jane Doe · follow-up Mon 28 Sep.')
    expect(result.followUpAt).toBe('2026-09-28T14:00:00.000Z')
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
    interactions: [{ _key: 'int-earlier' }, { _key: 'slack-V123', outcome: 'Left a voicemail' }],
  }

  it('removes exactly that interaction and restores the prior fields', async () => {
    routeOutreach({ logContact: afterLog })
    const result = await undoCallLog(undo, 'Juhan')
    expect(result.ok).toBe(true)
    // What the struck-through receipt needs, read off the interaction it removed.
    expect(result).toMatchObject({ label: 'Jane Doe', outcomeKey: 'voicemail' })
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
