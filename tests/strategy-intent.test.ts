/**
 * The studio's intent: the goals Marqueta judges everything against.
 *
 * Rules pinned here, each of which would fail silently:
 *   - a draft is never shown or treated as decided;
 *   - approval follows the Team permissions SETTING, with the presser's name;
 *   - a card pressed after a redraft cannot approve words nobody read (version check);
 *   - an objective without a number and a date cannot be approved (it could not
 *     be measured or planned backwards from);
 *   - every version is kept, with who did it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MARQUETA_ACTION } from '@/lib/marketing/marquetaActions'
import { LABEL } from '@/lib/marketing/marquetaStyle'
import {
  approveIntent,
  buildIntentBlocks,
  buildIntentChangeView,
  decodeIntentChangeMetadata,
  decodeIntentValue,
  encodeIntentChangeMetadata,
  encodeIntentValue,
  INTENT_CHANGE_BLOCK,
  INTENT_CHANGE_INPUT,
  intentProblems,
  MAX_OBJECTIVES,
  nextDraft,
  normalizeIntent,
  parseIntentDraft,
  readIntentChangeSubmission,
  type StrategyIntent,
} from '@/lib/marketing/strategyIntent'
import { DEFAULT_TEAM_ACCESS } from '@/lib/marketing/teamAccess'
import { clearTeamAccessCache } from '@/lib/marketing/teamAccess.server'
import { expectValidSlackBlocks, expectValidSlackModal } from './support/slackBlocks'

const NOW = new Date('2026-10-05T15:00:00Z')

const objective = (overrides: Record<string, unknown> = {}) => ({
  key: 'signed-engagements',
  statement: 'Win regulated-product design work',
  measure: 'signed engagements',
  target: 3,
  by: '2027-03-31',
  current: 0,
  currentAsOf: '2026-10-01',
  leadingIndicators: ['discovery calls booked'],
  ...overrides,
})

const intent = (overrides: Record<string, unknown> = {}): StrategyIntent =>
  normalizeIntent({
    status: 'draft',
    version: 1,
    endState: 'A studio known for shipping regulated health software.',
    horizon: '2027-06-30',
    objectives: [objective()],
    notDoing: ['Paid ads'],
    assumptions: [{ statement: 'Budgets for AI work hold', checkBy: '2026-12-01' }],
    draftedBy: 'Marqueta',
    draftedAt: '2026-10-01T00:00:00Z',
    history: [{ version: 1, status: 'draft', by: 'Marqueta', at: '2026-10-01T00:00:00Z', note: 'First draft.' }],
    ...overrides,
  })!

describe('normalizeIntent', () => {
  it('keeps at most three objectives and gives each a unique key', () => {
    const read = normalizeIntent({
      endState: 'x',
      objectives: [objective(), objective(), objective(), objective({ key: 'other' })],
    })!
    expect(read.objectives).toHaveLength(MAX_OBJECTIVES)
    expect(new Set(read.objectives.map((entry) => entry.key)).size).toBe(MAX_OBJECTIVES)
  })

  it('reads nothing usable as no intent, so a seeded record is not mistaken for goals', () => {
    expect(normalizeIntent({ contextNotes: 'notes only', version: 0 })).toBeNull()
    expect(normalizeIntent(null)).toBeNull()
  })

  it('drops bad dates and numbers rather than storing garbage', () => {
    const read = normalizeIntent({ endState: 'x', horizon: 'next year', objectives: [objective({ target: 'three', by: '31/03/2027' })] })!
    expect(read.horizon).toBeNull()
    expect(read.objectives[0].target).toBeNull()
    expect(read.objectives[0].by).toBeNull()
  })
})

describe('intentProblems: an unmeasurable intent cannot be approved', () => {
  it('names each missing number, date and the past horizon', () => {
    const bad = intent({ horizon: '2026-01-01', objectives: [objective({ measure: '', target: null, by: null })] })
    const problems = intentProblems(bad, NOW).join(' ')
    expect(problems).toMatch(/horizon \(2026-01-01\) is already past/)
    expect(problems).toMatch(/no measure/)
    expect(problems).toMatch(/no target/)
    expect(problems).toMatch(/no date/)
    expect(intentProblems(intent(), NOW)).toEqual([])
  })

  it('refuses to approve while a problem remains', () => {
    expect(approveIntent(intent({ objectives: [objective({ target: null })] }), { by: 'Jules', at: NOW.toISOString(), now: NOW })).toBeNull()
  })
})

describe('versioning: every change kept, a redraft is always a draft', () => {
  it('bumps the version, records who and why, and clears an approval', () => {
    const approved = approveIntent(intent(), { by: 'Jules', at: NOW.toISOString(), now: NOW })!
    expect(approved.status).toBe('approved')
    const redraft = nextDraft(approved, intent({ endState: 'Changed.' }), { by: 'Marqueta, asked by Shay', at: NOW.toISOString(), note: 'Dropped pharma.' })
    expect(redraft).toMatchObject({ status: 'draft', version: 2, approvedBy: null, changeNote: 'Dropped pharma.' })
    expect(redraft.history.map((entry) => `${entry.version}:${entry.status}:${entry.by}`)).toEqual([
      '1:draft:Marqueta',
      '1:approved:Jules',
      '2:draft:Marqueta, asked by Shay',
    ])
  })

  it('keeps the seeded context notes through a revision', () => {
    const current = intent({ contextNotes: 'What we decided in July.' })
    expect(nextDraft(current, intent({ contextNotes: '' }), { by: 'x', at: NOW.toISOString(), note: 'n' }).contextNotes).toBe('What we decided in July.')
  })
})

describe('the model’s draft', () => {
  it('parses a draft and refuses one with no objectives', () => {
    const good = JSON.stringify({ endState: 'x', horizon: '2027-06-30', objectives: [objective()], changeNote: 'First.' })
    expect(parseIntentDraft(good)?.changeNote).toBe('First.')
    expect(parseIntentDraft(JSON.stringify({ endState: 'x', objectives: [] }))).toBeNull()
    expect(parseIntentDraft('not json')).toBeNull()
  })
})

describe('the intent card', () => {
  const ids = { approve: MARQUETA_ACTION.intentApprove, change: MARQUETA_ACTION.intentChange }
  type Drawn = { type?: string; elements?: { text?: { text?: string } }[] }
  const labels = (blocks: Record<string, unknown>[]) =>
    (blocks as Drawn[])
      .filter((block) => block.type === 'actions')
      .flatMap((block) => (block.elements || []).map((element) => element.text?.text))

  it('says DRAFT and offers Approve only to someone allowed, when nothing blocks it', () => {
    const draft = buildIntentBlocks({ intent: intent(), now: NOW, access: DEFAULT_TEAM_ACCESS, viewerCanApprove: true, actionIds: ids })
    expectValidSlackBlocks(draft as never)
    expect(JSON.stringify(draft)).toContain('*DRAFT*')
    expect(labels(draft)).toEqual([LABEL.INTENT_APPROVE, LABEL.INTENT_CHANGE])

    const notAllowed = buildIntentBlocks({ intent: intent(), now: NOW, access: DEFAULT_TEAM_ACCESS, viewerCanApprove: false, actionIds: ids })
    expect(labels(notAllowed)).toEqual([LABEL.INTENT_CHANGE])

    const blocked = buildIntentBlocks({
      intent: intent({ objectives: [objective({ by: null })] }),
      now: NOW,
      access: DEFAULT_TEAM_ACCESS,
      viewerCanApprove: true,
      actionIds: ids,
    })
    expect(labels(blocked)).toEqual([LABEL.INTENT_CHANGE])
    expect(JSON.stringify(blocked)).toContain('Before it can be approved')
  })

  it('shows an approved intent with who approved it, and no Approve button', () => {
    const approved = approveIntent(intent(), { by: 'Jules', at: NOW.toISOString(), now: NOW })!
    const blocks = buildIntentBlocks({ intent: approved, now: NOW, access: DEFAULT_TEAM_ACCESS, viewerCanApprove: true, actionIds: ids })
    expect(JSON.stringify(blocks)).toContain('Approved by Jules')
    expect(labels(blocks)).toEqual([LABEL.INTENT_CHANGE])
  })

  it('carries the version it was drawn for, so a stale press is caught', () => {
    expect(decodeIntentValue(encodeIntentValue(4))).toEqual({ version: 4 })
    expect(decodeIntentValue('{"v":0}')).toBeNull()
    expect(decodeIntentValue('junk')).toBeNull()
  })

  it('builds a valid Change… form whose answer and thread survive the round trip', () => {
    const meta = encodeIntentChangeMetadata({ channel: 'C1', threadTs: '1.2', version: 3 })
    expectValidSlackModal(buildIntentChangeView(meta) as never)
    expect(decodeIntentChangeMetadata(meta)).toEqual({ channel: 'C1', threadTs: '1.2', version: 3 })
    expect(readIntentChangeSubmission({ [INTENT_CHANGE_BLOCK]: { [INTENT_CHANGE_INPUT]: { value: '  Drop pharma.  ' } } })).toBe('Drop pharma.')
  })
})

// ── approveIntentAs: the server-side checks ──────────────────────────────────

const store = vi.hoisted(() => ({ doc: null as Record<string, unknown> | null, settings: null as unknown, writes: [] as unknown[] }))

vi.mock('@/lib/marketing/client', () => ({
  getMarketingWriteClientFor: (type: string) => ({
    fetch: async (query: string) => (type === 'marketingSettings' ? store.settings : query.includes('_id == $id') ? store.doc : null),
    createOrReplace: async (doc: Record<string, unknown>) => {
      store.writes.push(doc)
      store.doc = doc
    },
  }),
}))
vi.mock('@/lib/marketing/outreachClient.server', () => ({ getOutreachClient: () => ({ fetch: async () => [] }) }))
vi.mock('@/lib/marketing/runway.server', () => ({ readRunway: async () => null }))

describe('approveIntentAs', () => {
  beforeEach(() => {
    store.doc = intent({ version: 2 }) as unknown as Record<string, unknown>
    store.settings = null
    store.writes = []
    clearTeamAccessCache()
  })

  it('approves the version the person saw, under their name', async () => {
    const { approveIntentAs } = await import('@/lib/marketing/strategyIntent.server')
    const result = await approveIntentAs({ version: 2, personName: 'Jules', slackUserId: 'U1', now: NOW })
    expect(result.ok).toBe(true)
    expect(store.writes).toHaveLength(1)
    expect(store.writes[0]).toMatchObject({ status: 'approved', approvedBy: 'Jules', approvedSlackUserId: 'U1', version: 2 })
  })

  it('refuses a stale card and writes nothing', async () => {
    const { approveIntentAs } = await import('@/lib/marketing/strategyIntent.server')
    const result = await approveIntentAs({ version: 1, personName: 'Jules', now: NOW })
    expect(result).toMatchObject({ ok: false, reason: 'stale' })
    expect(store.writes).toEqual([])
  })

  it('refuses someone the setting does not name, and says who can', async () => {
    store.settings = { mode: 'byRole', approvers: ['Ezra'] }
    const { approveIntentAs } = await import('@/lib/marketing/strategyIntent.server')
    const result = await approveIntentAs({ version: 2, personName: 'Jules', now: NOW })
    expect(result).toMatchObject({ ok: false, reason: 'not-allowed' })
    if (!result.ok) expect(result.message).toContain('Ezra')
    expect(store.writes).toEqual([])
  })
})
