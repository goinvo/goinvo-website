/**
 * Money and direction on the server, against a mocked Sanity client.
 *
 * The pure modules are tested on their own; these tests pin what the server
 * layer adds around them — which records are read and in what order, the exact
 * writes, idempotency under retries, and what a press redraws in place.
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
  return { patches, commit, outreach, posture }
})

vi.mock('@/lib/marketing/outreachClient.server', () => ({
  getOutreachClient: () => mocks.outreach,
  isOutreachClientConfigured: () => true,
}))
vi.mock('@/lib/marketing/client', () => ({
  getMarketingWriteClientFor: () => mocks.posture,
  getMarketingWriteClient: () => mocks.posture,
}))

import { LABEL } from '@/lib/marketing/marquetaStyle'
import { MARQUETA_ACTION } from '@/lib/marketing/marquetaActions'
import { marketingOperationDocumentId } from '@/lib/marketing/operations'
import { readRunway } from '@/lib/marketing/runway.server'
import {
  loadStrategySnapshot,
  recordStrategyVerdict,
  renderMoneyAndDirection,
  STRATEGY_DATA_QUERY,
} from '@/lib/marketing/strategyCheck.server'
import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/** Thursday 24 Sep 2026, 10am in Arlington. */
const NOW = new Date('2026-09-24T14:00:00Z')
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()

function routeOutreach(fixtures: { strategy?: Record<string, unknown> | Error }) {
  mocks.outreach.fetch.mockImplementation(async (query: string) => {
    if (query === STRATEGY_DATA_QUERY) {
      if (fixtures.strategy instanceof Error) throw fixtures.strategy
      return fixtures.strategy
    }
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
const patchesFor = (id: string) => mocks.patches.filter((record) => record.id === id)
const buttons = (blocks: Block[]) => blocks.flatMap((block) => block.elements || []).filter((element: Block) => element.type === 'button')

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
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  process.env.MARKETING_PUBLIC_BASE_URL = 'https://www.goinvo.com'
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.restoreAllMocks()
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
  it('writes nothing for a press on last month’s card, and hands back this month’s answer with its buttons', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const result = await recordStrategyVerdict({ verdict: 'stillRight', personName: 'Juhan', monthKey: '2026-08', now: NOW })
    expect(result).toMatchObject({ ok: false, stale: true })
    // This year's month without its year (rule 7).
    expect(result.message).toBe('That was August’s check — here is this month’s.')
    // The question leads the answer; the review was fresh, so no buttons.
    expect(result.answer).toMatch(/^\*Runway says Rebuild: /)
    expectValidSlackBlocks(result.answerBlocks || [])
    expect(mocks.patches).toHaveLength(0)
    expect(mocks.posture.createIfNotExists).not.toHaveBeenCalled()
    expect(mocks.outreach.createIfNotExists).not.toHaveBeenCalled()
  })

  it('records "plan still fits" against the posture in force', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const result = await recordStrategyVerdict({ verdict: 'stillRight', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(result.ok).toBe(true)
    expect(result.message).toBe('Plan confirmed for September by Juhan — I’ll ask again in October, or sooner if the runway crosses a line.')
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

  it('files one rethink decision on This week, keyed by the answer it follows, BEFORE recording the verdict', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const result = await recordStrategyVerdict({ verdict: 'rethink', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(result).toMatchObject({ ok: true, filed: true })
    expect(result.message).toBe('Juhan asked for a rethink — it’s a decision on This week, suggested to Juhan.')
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
      targetView: 'thisWeek',
    })
    expect(result.decisionTaskId).toBe(decision._id)
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
    expect(result).toMatchObject({ ok: true, filed: false, decisionTaskId: open._id })
    expect(result.message).toBe('Juhan asked for a rethink too — it’s already a decision on This week.')
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

  it('answers a double-tap as the press it repeats, never as a second voice', async () => {
    const ask = (by: string, minutes: number) => ({
      _key: `${by}-${minutes}`,
      at: minutesAgo(minutes),
      actor: 'person',
      action: 'Asked for a rethink from Slack',
      outcome: `By ${by}`,
    })
    const open = (activity: Record<string, unknown>[]) => ({
      _id: 'marketingOperation.rethink',
      title: 'Rethink the marketing plan (September 2026)',
      activity,
    })

    // Juhan filed it a minute ago and pressed again: still HIS rethink, not "too".
    routeOutreach({ strategy: strategyData({ openRethink: open([ask('Juhan', 1)]) }) })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const filer = await recordStrategyVerdict({ verdict: 'rethink', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(filer).toMatchObject({ ok: true, filed: true, repeat: true, decisionTaskId: 'marketingOperation.rethink' })
    expect(filer.message).toBe('Juhan asked for a rethink — it’s a decision on This week, suggested to Juhan.')
    expect(patchesFor('marketingOperation.rethink')).toHaveLength(0)

    // Juhan joined Eric's, then pressed again: still one "too".
    mocks.patches.length = 0
    routeOutreach({ strategy: strategyData({ openRethink: open([ask('Eric', 30), ask('Juhan', 1)]) }) })
    const joiner = await recordStrategyVerdict({ verdict: 'rethink', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(joiner).toMatchObject({ ok: true, filed: false, repeat: true })
    expect(joiner.message).toBe('Juhan asked for a rethink too — it’s already a decision on This week.')
    expect(patchesFor('marketingOperation.rethink')).toHaveLength(0)

    // A colleague a minute after the filer is a real second voice: joined, recorded, no `repeat`.
    mocks.patches.length = 0
    routeOutreach({ strategy: strategyData({ openRethink: open([ask('Juhan', 1)]) }) })
    const second = await recordStrategyVerdict({ verdict: 'rethink', personName: 'Eric', monthKey: '2026-09', now: NOW })
    expect(second).toMatchObject({ ok: true, filed: false })
    expect(second.repeat).toBeUndefined()
    expect(patchesFor('marketingOperation.rethink')).toHaveLength(1)
  })

  it('names an earlier month without this year’s number', async () => {
    routeOutreach({ strategy: strategyData() })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const lastYear = await recordStrategyVerdict({ verdict: 'stillRight', personName: 'Juhan', monthKey: '2025-12', now: NOW })
    expect(lastYear.message).toBe('That was December 2025’s check — here is this month’s.')
  })

  it('says "nothing changed" only when nothing did', async () => {
    routeOutreach({ strategy: new Error('outreach down') })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const failed = await recordStrategyVerdict({ verdict: 'stillRight', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(failed).toMatchObject({ ok: false, message: 'Couldn’t record that — nothing changed. Answer it on This week in the Studio.' })

    // The decision was filed, then the verdict write failed: that is not "nothing changed".
    routeOutreach({ strategy: strategyData() })
    mocks.commit.mockRejectedValue(new Error('posture write refused'))
    const half = await recordStrategyVerdict({ verdict: 'rethink', personName: 'Juhan', monthKey: '2026-09', now: NOW })
    expect(half.ok).toBe(false)
    expect(half.message).not.toContain('nothing changed')
    expect(half.message).toContain('press again and it joins the same decision')
  })
})

describe('renderMoneyAndDirection — the redraw a money press leaves in place', () => {
  it('reads the records AFTER the press: the receipt carries the number now, and the next question follows', async () => {
    // The runway was just confirmed; the strategy has never been checked.
    routeOutreach({ strategy: strategyData({ contacts: [] }) })
    routePosture({ stored: { runway: { certainUntil: '2027-01-11', confirmedAt: NOW.toISOString() } }, review: null })
    const blocks = await renderMoneyAndDirection({ now: NOW, receipt: { kind: 'runwayConfirmed', who: '<@UJUHAN>' } })
    expectValidSlackBlocks(blocks)
    expect(blocks.every((block) => String(block.block_id).startsWith('mq_money'))).toBe(true)
    expect(blocks[0].text.text).toBe(':white_check_mark: Runway confirmed by <@UJUHAN> · Thu 24 Sep — 3.5 months (to 11 Jan 2027).')
    expect(buttons(blocks).map((button) => button.text.text)).toEqual([LABEL.RUNWAY_CHANGED, LABEL.PLAN_FITS, LABEL.PLAN_RETHINK])
    expect(buttons(blocks).some((button) => button.style)).toBe(false)
  })

  it('links a rethink receipt to the decision on This week', async () => {
    routeOutreach({ strategy: strategyData({ openRethink: { _id: 'marketingOperation.rethink' } }) })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const blocks = await renderMoneyAndDirection({
      now: NOW,
      receipt: { kind: 'rethink', who: '<@UJUHAN>', suggestedTo: 'Juhan', decisionTaskId: 'marketingOperation.rethink' },
    })
    expectValidSlackBlocks(blocks)
    expect(blocks[0].text.text).toBe('<@UJUHAN> asked for a rethink — it’s a decision on This week, suggested to Juhan.')
    expect(buttons(blocks)[0]).toMatchObject({
      text: { text: 'Open This week' },
      url: 'https://www.goinvo.com/studio/marketing?view=thisWeek&task=marketingOperation.rethink',
    })
    // The runway win this fixture carries is asked about next, never both at once.
    expect(buttons(blocks).filter((button) => button.action_id === MARQUETA_ACTION.strategyConfirm)).toHaveLength(0)
  })

  it('never throws: a failed re-read still draws the receipt, without numbers or a question', async () => {
    routeOutreach({ strategy: new Error('outreach down') })
    routePosture({ stored: STORED_POSTURE, review: PRIOR_REVIEW })
    const blocks = await renderMoneyAndDirection({ now: NOW, receipt: { kind: 'runwayConfirmed', who: '<@UJUHAN>' } })
    expect(blocks).toHaveLength(2)
    expect(blocks[0].text.text).toBe(':white_check_mark: Runway confirmed by <@UJUHAN> · Thu 24 Sep.')
    await expect(renderMoneyAndDirection({ now: NOW })).resolves.toEqual([])
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
