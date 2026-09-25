/**
 * Where Slack's links land in the Studio, and what the page lets you do there.
 *
 * Studio components cannot be driven here (no DOM, no Sanity session), so the
 * rules live in pure helpers each component exports and these pin them, plus
 * a few source-level checks for the wiring a helper cannot show — which value
 * a select is bound to, which write a button makes, how a URL is cleaned.
 *
 * The acceptance lines from the plan, each pinned below:
 *   - a task taken in Slack shows its taker on the desk;
 *   - pressing "Still right" in the Studio leaves the runway in charge;
 *   - the desk counts no weekly-plan records;
 *   - "+2 more on This week" (owner=Juhan) shows exactly Juhan's share.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({ doc: null as Record<string, unknown> | null }))

// runway.server's storage, in memory: enough to run the real "Still right".
vi.mock('@/lib/marketing/client', () => {
  const client = {
    fetch: async () => (store.doc ? JSON.parse(JSON.stringify(store.doc)) : null),
    createIfNotExists: async (doc: Record<string, unknown>) => {
      if (!store.doc) store.doc = { ...doc }
      return store.doc
    },
    patch: () => {
      const sets: Record<string, unknown>[] = []
      const chain = {
        set: (fields: Record<string, unknown>) => {
          sets.push(fields)
          return chain
        },
        commit: async () => {
          store.doc = Object.assign(store.doc || {}, ...sets)
          return store.doc
        },
      }
      return chain
    },
  }
  return { getMarketingWriteClientFor: () => client, getMarketingWriteClient: () => client }
})

import { resolveOwnerName } from '@/lib/marketing/availability'
import { canTransitionMarketingOperation, getMarketingOperationCounts, normalizeMarketingOperationPatch, type MarketingOperation } from '@/lib/marketing/operations'
import { resolveRunwayPosture, type StoredPosture } from '@/lib/marketing/runway'
import { confirmRunway } from '@/lib/marketing/runway.server'
import { studioViewUrl } from '@/lib/marketing/taskLinks'
import { taskStatusWords } from '@/lib/marketing/weeklyCheckIn'
import {
  moneyNudgeDue,
  parseRunwayMonths,
  postureOverrideSelect,
  runwayAnswerBody,
  runwayAnswersOffered,
  runwayStateFrom,
} from '@/sanity/components/marketing/MarketingFinancialPostureSetting'
import {
  deskOperations,
  deskOwnerOptions,
  deskOwnerPatch,
  deskOwnerValue,
} from '@/sanity/components/marketing/MarketingOperationsBoard'
import {
  taskBannerActions,
  taskBannerMeta,
  taskBannerPatch,
  taskBannerPrimary,
  taskBannerState,
  type TaskBannerAction,
} from '@/sanity/components/marketing/TaskFocusBanner'
import {
  caughtIdeaMeta,
  filterWeekByOwner,
  groupDeferred,
  splitWeekDecisions,
  WEEK_FOCUS_SECTION_ID,
  weekFocusTarget,
  weekOwners,
  workMeta,
  type PlanDeferral,
  type WeekPlanResponse,
} from '@/sanity/components/marketing/WeeklyPlanWorkspace'
import { marketingUrlWithoutLandingParams, readMarketingLandingParams } from '@/sanity/tools/marketingTool'

/** Thursday 24 Sep 2026, 10am in Boston. */
const NOW = new Date('2026-09-24T14:00:00Z')
const BASE = 'https://www.goinvo.com'

const read = (path: string) => readFileSync(path, 'utf8')
const HOST = read('src/sanity/tools/marketingTool.tsx')
const WEEK = read('src/sanity/components/marketing/WeeklyPlanWorkspace.tsx')
const BANNER = read('src/sanity/components/marketing/TaskFocusBanner.tsx')
const DESK = read('src/sanity/components/marketing/MarketingOperationsBoard.tsx')
const MONEY = read('src/sanity/components/marketing/MarketingFinancialPostureSetting.tsx')
const OUTREACH = read('src/sanity/components/marketing/OutreachWorkspace.tsx')
const CALL_SHEET = read('src/sanity/components/marketing/OutreachCallSheet.tsx')

function operation(overrides: Partial<MarketingOperation> & { _id: string }): MarketingOperation {
  return {
    _type: 'marketingOperation',
    title: 'Work',
    nextAction: 'Do it',
    status: 'queued',
    priority: 'normal',
    kind: 'content',
    origin: 'manual',
    autonomy: 'humanReview',
    targetView: 'thisWeek',
    sourceKey: `manual:${overrides._id}`,
    sourceFingerprint: 'f',
    ...overrides,
  }
}

// ── The host: one-shot landing params ───────────────────────────────────────

describe('the tool reads a Slack landing once, and cleans the URL', () => {
  it('reads what each Slack link asks for, from the same params taskLinks writes', () => {
    const prep = new URL(studioViewUrl(BASE, 'outreach', { contact: 'c-jane', contactAction: 'log' }))
    expect(readMarketingLandingParams(prep.search)).toEqual({
      contact: { id: 'c-jane', action: 'log' },
      owner: '',
      focus: null,
    })

    const week = new URL(studioViewUrl(BASE, 'thisWeek', { owner: 'Juhan', focus: 'caught' }))
    expect(readMarketingLandingParams(week.search)).toEqual({ contact: null, owner: 'Juhan', focus: 'caught' })
  })

  it('drops what it does not recognise rather than guessing, and opens prep, never a log form, by default', () => {
    expect(readMarketingLandingParams('?contact=c-jane&action=delete')).toMatchObject({ contact: { id: 'c-jane', action: 'prep' } })
    expect(readMarketingLandingParams('?contact=c-jane')).toMatchObject({ contact: { id: 'c-jane', action: 'prep' } })
    expect(readMarketingLandingParams('?action=log&focus=shop')).toEqual({ contact: null, owner: '', focus: null })
    expect(readMarketingLandingParams('')).toEqual({ contact: null, owner: '', focus: null })
    expect(readMarketingLandingParams(`?owner=${'x'.repeat(500)}`).owner).toHaveLength(80)
  })

  it('strips exactly the landing params, leaving the tab and everything else', () => {
    const url = `${BASE}/studio/marketing?view=outreach&contact=c-jane&action=log&owner=Juhan&focus=caught&task=marketingOperation.abc&role=principal`
    const cleaned = new URL(marketingUrlWithoutLandingParams(url))
    expect([...cleaned.searchParams.keys()].sort()).toEqual(['role', 'task', 'view'])
    expect(cleaned.searchParams.get('view')).toBe('outreach')
  })

  it('passes the router’s history state through when it cleans, in the host and in the banner', () => {
    expect(HOST).toContain('marketingUrlWithoutLandingParams(window.location.href)')
    expect(HOST).toContain("window.history.replaceState(window.history.state, '', next)")
    expect(BANNER).toContain("window.history.replaceState(window.history.state, '', url.toString())")
    expect(BANNER).not.toContain('replaceState({}')
  })

  it('hands each landing to the view it is for (C9)', () => {
    expect(HOST).toContain('focusContact={outreachFocus || undefined}')
    expect(HOST).toContain('initialOwner={weekLanding.owner}')
    expect(HOST).toContain('focus={weekLanding.focus || undefined}')
    expect(HOST).toContain('onOpenOutreachContact={requestOutreachContact}')
    // A contact request goes through the same unsaved-changes guard as any tab switch.
    expect(HOST).toMatch(/const requestOutreachContact = useCallback\([\s\S]*?requestMarketingView\('outreach'\)/)
    expect(WEEK).toContain("onPrepContact={onOpenOutreachContact ? (contactId: string) => onOpenOutreachContact(contactId, 'prep') : undefined}")
  })

  it('passes the C9 props to the real components, so the compiler checks the contract', () => {
    // The typed aliases that let the host compile before the Outreach work
    // landed are gone: an alias accepts a component that has DROPPED the prop,
    // so a rename there would have silently stopped every landing. Used
    // directly, a missing `focusContact` / `onPrepContact` is a type error.
    expect(HOST).not.toContain('OutreachWorkspaceLanding')
    expect(HOST).toMatch(/<OutreachWorkspace\s+client=\{client\}\s+focusContact=\{outreachFocus \|\| undefined\}/)
    expect(WEEK).not.toMatch(/const CallSheet\b/)
    expect(WEEK).toMatch(/<OutreachCallSheet\s+onPrepContact=/)
    expect(OUTREACH).toContain('focusContact?: { id: string; action: StudioContactAction; nonce: number }')
    expect(CALL_SHEET).toContain('onPrepContact?: (contactId: string) => void')
    // The contract's exact shape: { id; action: 'prep' | 'log'; nonce }.
    expect(HOST).toContain('export type OutreachContactFocus = { id: string; action: StudioContactAction; nonce: number }')
  })

  it('re-reads the desk and This week after the banner saves, so the task is not left in its old section', () => {
    expect(HOST).toContain('<TaskFocusBanner onSaved={bumpOperationsRefresh} />')
    expect(HOST).toContain('refreshToken={operationsRefreshToken}')
    expect(BANNER).toContain('onSaved?.()')
    expect(WEEK).toContain("void load('refresh')")
  })
})

// ── The desk ────────────────────────────────────────────────────────────────

describe('the desk shows the owner Slack uses', () => {
  // The website's team pages, as the tool loads them: full names
  // (tests/marketing-warm-start.test.ts has the real shape).
  const owners = [
    { _id: 'tm-juhan', title: 'Juhan Sonin' },
    { _id: 'tm-eric', title: 'Eric Benoit' },
    { _id: 'tm-shirley', title: 'Shirley Xu' },
  ]
  // The roster: the names Slack resolves a presser to.
  const roster = ['Juhan', 'Eric', 'Shirley']
  const rosterEntries = [
    { ownerName: 'Juhan', slackUserId: 'U1' },
    { ownerName: 'Eric', slackUserId: 'U3' },
    { ownerName: 'Shirley', slackUserId: 'U2' },
  ]

  it('shows a task taken in Slack as its taker’s, though the Studio user id was never set', () => {
    // What "I’ll take it" writes: the board name, no Studio id.
    const taken = operation({ _id: 'op-1', ownerName: 'Juhan' })
    const options = deskOwnerOptions([taken], owners, roster)
    expect(deskOwnerValue(taken.ownerName, options)).toBe('Juhan')
    expect(options).toContain('Juhan')
  })

  it('offers one option per person — the roster’s name, never the team page’s full name beside it', () => {
    const items = [
      operation({ _id: 'a', ownerName: 'juhan' }),
      operation({ _id: 'b', suggestedOwner: 'Eric' }),
    ]
    const options = deskOwnerOptions(items, owners, roster)
    expect(options).toEqual(['Eric', 'Juhan', 'Shirley'])
    expect(options).not.toContain('Juhan Sonin')
    expect(options).not.toContain('Eric Benoit')
    // "juhan" on a task is Juhan in the select, not "Nobody has it".
    expect(deskOwnerValue('juhan', options)).toBe('Juhan')
    expect(deskOwnerValue('', options)).toBe('')
  })

  it('writes a name Slack resolves to the same person, with the matching Studio id', () => {
    const options = deskOwnerOptions([], owners, roster)
    for (const name of options) {
      const patch = deskOwnerPatch(name, owners, { options })
      // The name Slack would resolve that person to: one person, not two.
      expect(resolveOwnerName({ displayName: patch.ownerName, entries: rosterEntries })).toBe(name)
      expect(rosterEntries.map((entry) => entry.ownerName)).toContain(patch.ownerName)
    }
    expect(deskOwnerPatch('Juhan', owners, { options })).toEqual({ ownerName: 'Juhan', ownerSanityUserId: 'tm-juhan' })
    expect(deskOwnerPatch('Shirley', owners, { options })).toEqual({ ownerName: 'Shirley', ownerSanityUserId: 'tm-shirley' })
    expect(deskOwnerPatch('', owners, { options })).toEqual({ ownerName: '', ownerSanityUserId: '' })
  })

  it('never guesses which of two people a first name means', () => {
    const twoErics = [...owners, { _id: 'tm-eric-2', title: 'Eric Chen' }]
    const options = deskOwnerOptions([], twoErics, roster)
    expect(options.filter((name) => name.startsWith('Eric'))).toEqual(['Eric'])
    // Two team pages could be "Eric": no Studio id rather than the wrong one.
    expect(deskOwnerPatch('Eric', twoErics, { options })).toEqual({ ownerName: 'Eric', ownerSanityUserId: '' })
    // Two board names could be the one team page: no id either.
    const boardTwoErics = ['Eric', 'Eric B', 'Juhan']
    expect(deskOwnerPatch('Eric', owners, { options: boardTwoErics }).ownerSanityUserId).toBe('')
  })

  it('offers every team member, by first name, and never twice for a name already there', () => {
    const items = [operation({ _id: 'a', ownerName: 'Juhan' })]
    // "Juhan Sonin" is plainly the Juhan already on the board.
    expect(deskOwnerOptions(items, owners, [])).toEqual(['Eric', 'Juhan', 'Shirley'])
    // The day the first person links, the rest of the team is still there to pick.
    expect(deskOwnerOptions(items, owners, ['Juhan'])).toEqual(['Eric', 'Juhan', 'Shirley'])
  })

  it('keeps Eric and Jon assignable once Juhan and Shirley have linked — they own nothing yet and never had a roster record', () => {
    const team = [...owners, { _id: 'tm-jon', title: 'Jon Follett' }]
    // The seeded quarter: only Juhan and Shirley own anything; only they could link.
    const items = [operation({ _id: 'a', ownerName: 'Juhan' }), operation({ _id: 'b', ownerName: 'Shirley' })]
    const options = deskOwnerOptions(items, team, ['Juhan', 'Shirley'])
    expect(options).toEqual(['Eric', 'Jon', 'Juhan', 'Shirley'])
    expect(options).not.toContain('Jon Follett')
    // Picked here, the name is the one Slack and the setup use, with the right Studio id.
    expect(deskOwnerPatch('Jon', team, { options })).toEqual({ ownerName: 'Jon', ownerSanityUserId: 'tm-jon' })
    expect(deskOwnerPatch('Eric', team, { options })).toEqual({ ownerName: 'Eric', ownerSanityUserId: 'tm-eric' })
    // Two team pages sharing a first name are offered in full rather than guessed between.
    const twoErics = [...team, { _id: 'tm-eric-2', title: 'Eric Chen' }]
    expect(deskOwnerOptions(items, twoErics, ['Juhan', 'Shirley'])).toEqual(['Eric Benoit', 'Eric Chen', 'Jon', 'Juhan', 'Shirley'])
  })

  it('finishes the owner search when somebody is picked for a task passed on in Slack — Slack’s own take', () => {
    const passed = operation({ _id: 'op-p', status: 'needsHuman', humanQuestion: 'Eric passed on this — who should pick it up?' })
    const patch = deskOwnerPatch('Juhan', owners, { options: roster, item: passed })
    expect(patch).toEqual({ ownerName: 'Juhan', ownerSanityUserId: 'tm-juhan', status: 'queued', humanQuestion: '' })
    // An allowed move, and the route keeps every field (an empty question is unset).
    expect(canTransitionMarketingOperation('needsHuman', 'queued')).toBe(true)
    expect(normalizeMarketingOperationPatch(patch)).toEqual(patch)
    // Afterwards the words are ordinary owned work, not "Needs someone".
    expect(taskStatusWords({ ...passed, ...patch, humanQuestion: undefined })).toBe('Not started')

    // A real decision keeps its question and its state: naming someone is not answering it.
    const decision = operation({ _id: 'op-d', status: 'needsHuman', kind: 'decision', humanQuestion: 'Publish F1–F8?' })
    expect(deskOwnerPatch('Juhan', owners, { options: roster, item: decision })).toEqual({ ownerName: 'Juhan', ownerSanityUserId: 'tm-juhan' })
    // Clearing the owner of a passed task leaves the search open.
    expect(deskOwnerPatch('', owners, { options: roster, item: passed })).toEqual({ ownerName: '', ownerSanityUserId: '' })
  })

  it('binds the select to the owner’s name, from the roster, and says "Nobody has it"', () => {
    expect(DESK).toContain('value={deskOwnerValue(item.ownerName, ownerOptions)}')
    expect(DESK).not.toContain('value={item.ownerSanityUserId')
    expect(DESK).toContain('<option value="">Nobody has it</option>')
    expect(DESK).toContain('aria-label={`Accountable owner for ${item.title}`}')
    expect(DESK).not.toContain('Unassigned')
    expect(DESK).toContain('deskOwnerOptions(items, owners, roster)')
    expect(DESK).toContain('setRoster(Array.isArray(response.team) ? response.team : [])')
    expect(DESK).toContain('deskOwnerPatch(event.currentTarget.value, owners, { options: ownerOptions, item })')
  })

  it('leaves the planner’s weekly records off the desk, before ranking and before any count', () => {
    const items = [
      operation({ _id: 'op-1', status: 'working', ownerName: 'Juhan' }),
      operation({ _id: 'plan-38', status: 'working', sourceKey: 'weekly-plan/2026-W38', dueAt: '2026-09-20T12:00:00Z' }),
      operation({ _id: 'plan-39', status: 'working', sourceKey: 'weekly-plan/2026-W39' }),
    ]
    const desk = deskOperations(items)
    expect(desk.map((item) => item._id)).toEqual(['op-1'])
    expect(getMarketingOperationCounts(desk, NOW)).toMatchObject({ marketingHandling: 1, overdue: 0 })
    expect(DESK).toContain('rankMarketingOperations(deskOperations(response.items || []))')
    expect(DESK).toContain('This week’s plan lives on This week →')
  })

  it('uses the Slack card’s words and actions', () => {
    expect(DESK).toContain('taskStatusWords(')
    expect(DESK).not.toContain('STATUS_LABELS')
    // The group holds unstarted work too, so it is not named after one status.
    expect(DESK).toContain("marketingHandling: 'To do'")
    expect(DESK).not.toMatch(/'In progress',\s*counts|marketingHandling: 'In progress'/)
    // The status select says what a status is, not who has it.
    expect(DESK).toContain("return words === 'Nobody has it' ? 'Not started' : words")
    expect(DESK).toContain('{statusOptionWords(item, status)}')
    expect(DESK).not.toMatch(/Marqueta handling|Resolve blocker|Marqueta already did|>Blocker: </)
    expect(DESK).toContain('>Latest: </strong>')
    expect(DESK).toContain('>In the way: </strong>')
    // Unstuck does what Unstuck does in Slack: back in progress, blocker cleared.
    expect(DESK).toContain("updateItem(item, { status: 'working', blocker: '' }, 'Unstuck from the desk.')")
    expect(DESK).toContain('{LABEL.UNSTUCK}')
  })
})

// ── Money and direction ─────────────────────────────────────────────────────

describe('money and direction in the Studio', () => {
  it('answers about the runway with the runway API’s bodies — never a posture, never setAt', () => {
    expect(runwayAnswerBody('confirm', {}, 'Shirley')).toEqual({ action: 'confirm', personName: 'Shirley' })
    expect(runwayAnswerBody('signed', { label: 'SoW — Acme', months: '3' })).toEqual({ action: 'signed', label: 'SoW — Acme', monthsAdded: 3 })
    expect(runwayAnswerBody('changed', { months: '4,5 months', basis: 'Signed work in hand' })).toEqual({
      action: 'set',
      months: 4.5,
      basis: 'Signed work in hand',
    })
    for (const body of [
      runwayAnswerBody('confirm'),
      runwayAnswerBody('signed', { label: 'x', months: '1' }),
      runwayAnswerBody('changed', { months: '2' }),
    ]) {
      expect(body).not.toHaveProperty('setAt')
      expect(body).not.toHaveProperty('posture')
    }
  })

  it('refuses an answer it cannot store rather than guessing a number', () => {
    expect(runwayAnswerBody('signed', { label: '', months: '3' })).toBeNull()
    expect(runwayAnswerBody('signed', { label: 'SoW', months: '' })).toBeNull()
    expect(runwayAnswerBody('changed', { months: '-2' })).toBeNull()
    expect(parseRunwayMonths('about 4.5')).toBe(4.5)
    expect(parseRunwayMonths('-2')).toBeNull()
    expect(parseRunwayMonths('0')).toBeNull()
    expect(parseRunwayMonths('soon')).toBeNull()
  })

  it('writes setAt in exactly one place: the explicit override', () => {
    const writes = [...MONEY.matchAll(/setAt:/g)].map((match) => match.index!)
    expect(writes).toHaveLength(1)
    const override = MONEY.indexOf('const saveOverride = useCallback(')
    const overrideEnd = MONEY.indexOf('[postureClient],', override)
    expect(override).toBeGreaterThan(-1)
    expect(writes[0]).toBeGreaterThan(override)
    expect(writes[0]).toBeLessThan(overrideEnd)
    expect(MONEY).toContain('Override the runway (the plan follows this until the runway is confirmed again)')
    expect(MONEY).toContain("authenticatedMarketingRequest<RunwayState>('/api/marketing/runway', body, 'POST', postureClient)")
    expect(MONEY).toContain('<h2 style=')
    expect(MONEY).toContain('Money and direction')
  })

  it('leaves the runway in charge after "Still right" — the bug the old nudge had', async () => {
    // Runway confirmed in August; a bin set by hand on 1 Sep; the runway then
    // re-confirmed by the team. The old Studio "Still right" re-stamped setAt,
    // which made the stale bin the newer fact and put it back in charge.
    store.doc = {
      _id: 'marketingFinancialPosture',
      posture: 'survival',
      setAt: '2026-09-01T00:00:00.000Z',
      runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-01T00:00:00.000Z' },
    }
    const before = resolveRunwayPosture(store.doc as StoredPosture, NOW)
    expect(before.source).toBe('manual')

    const after = await confirmRunway({ personName: 'Shirley', now: NOW })
    expect(after.resolved.source).toBe('runway')
    expect(after.resolved.id).toBe('rebuild')
    expect(after.stored.setAt).toBe('2026-09-01T00:00:00.000Z')

    // What the old button did, for the record: pressed a minute after the team
    // confirmed the runway in Slack, it re-stamped setAt — and the bin won.
    const aMinuteLater = new Date(NOW.getTime() + 60_000)
    expect(resolveRunwayPosture({ ...(after.stored as StoredPosture), setAt: aMinuteLater.toISOString() }, aMinuteLater).source).toBe('manual')
  })

  it('offers only "It changed…" when no runway is recorded — there is nothing to confirm or extend', () => {
    const none = runwayStateFrom({}, NOW)
    expect(none.resolved.months).toBeNull()
    expect(none.checkIn.due).toBe(true)
    expect(runwayAnswersOffered(none)).toEqual(['changed'])
    const recorded = runwayStateFrom({ runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-01T00:00:00.000Z' } }, NOW)
    expect(runwayAnswersOffered(recorded)).toEqual(['confirm', 'signed', 'changed'])
    expect(runwayAnswersOffered(null)).toEqual([])
    expect(MONEY).toContain("offered.includes('confirm') && (")
  })

  it('shows a reader who cannot write the runway, read the old way, and does not nag them on the Dashboard', () => {
    // The fallback describes the record with the API's own pure functions.
    const stored: StoredPosture = { posture: 'survival', setAt: '2026-09-01T00:00:00.000Z', runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-01T00:00:00.000Z' } }
    const state = runwayStateFrom(stored, NOW)
    expect(state.resolved).toEqual(resolveRunwayPosture(stored, NOW))
    expect(state.summary).toMatch(/months? of certain runway/)
    expect(MONEY).toContain("postureClient.fetch<StoredPosture | null>(`*[_id == $id][0]{ posture, setAt, runway }`")
    expect(MONEY).toContain('adopt(runwayStateFrom(stored))')
    // Nothing to press, no form, and no Dashboard nudge — nor a red error on every visit.
    expect(MONEY).toContain("const offered: Array<'confirm' | RunwayForm> = readOnly ? [] : runwayAnswersOffered(state)")
    expect(MONEY).toContain('const runwayForm = form && !readOnly && (')
    expect(MONEY).toContain('if (compact && (!loaded || readOnly || loadError || (!due && !saveError && !notice))) return null')
  })

  it('asks on the Dashboard only when a check-in is due, or the two inputs disagree while the hand-set bin is in charge', () => {
    const quiet = { checkIn: { due: false, urgent: false, reason: '', question: '' }, resolved: { disagreement: null, source: 'runway' } }
    expect(moneyNudgeDue(quiet as never)).toBe(false)
    expect(moneyNudgeDue({ ...quiet, checkIn: { ...quiet.checkIn, due: true } } as never)).toBe(true)
    expect(moneyNudgeDue({ ...quiet, resolved: { disagreement: 'The runway date works out to…', source: 'manual' } } as never)).toBe(true)
    // The runway is in charge: the stale bin only ever loses, and nothing here could clear it.
    expect(moneyNudgeDue({ ...quiet, resolved: { disagreement: 'The runway date works out to…', source: 'runway' } } as never)).toBe(false)
    expect(moneyNudgeDue(null)).toBe(false)
  })

  it('lets "Still right" put the nudge away on the real record — it used to stay up until the bins agreed', async () => {
    // Production: a bin set by hand in July, the runway confirmed in August.
    const record = {
      _id: 'marketingFinancialPosture',
      posture: 'survival',
      setAt: '2026-07-11T15:19:37.000Z',
      runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T12:00:00.000Z' },
    }
    const monday = new Date('2026-09-28T13:00:00Z')
    store.doc = JSON.parse(JSON.stringify(record))
    const before = runwayStateFrom(store.doc as StoredPosture, monday)
    expect(before.checkIn.due).toBe(true)
    expect(moneyNudgeDue(before)).toBe(true)

    const after = await confirmRunway({ personName: 'Shirley', now: monday })
    // Still a disagreement (3.4 months is Rebuild; the stale bin says Survival) — said, not nagged about.
    expect(after.resolved).toMatchObject({ source: 'runway', id: 'rebuild' })
    expect(after.resolved.disagreement).toBeTruthy()
    expect(moneyNudgeDue(after)).toBe(false)
    // And it stays down on every visit after, not only until the page reloads.
    expect(moneyNudgeDue(runwayStateFrom(after.stored as StoredPosture, new Date('2026-10-05T13:00:00Z')))).toBe(false)
  })

  it('shows an override in the select only while it is the one in charge, and can always pick any posture', () => {
    // The runway is in charge: the stored "Survival" is not what the plan uses.
    const runwayInCharge = runwayStateFrom(
      { posture: 'survival', setAt: '2026-07-11T15:19:37.000Z', runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T12:00:00.000Z' } },
      NOW,
    )
    expect(runwayInCharge.resolved.source).toBe('runway')
    const select = postureOverrideSelect(runwayInCharge)
    expect(select.value).toBe('')
    // Survival is an option that is not selected, so picking it is a change a native select reports.
    expect(select.options[0]).toEqual({ title: 'Choose a posture…', value: '' })
    expect(select.options.map((option) => option.value)).toContain('survival')

    // The override in charge: shown as chosen.
    const overriding = runwayStateFrom(
      { posture: 'survival', setAt: '2026-09-20T00:00:00.000Z', runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-27T12:00:00.000Z' } },
      NOW,
    )
    expect(overriding.resolved.source).toBe('manual')
    expect(postureOverrideSelect(overriding).value).toBe('survival')
    expect(postureOverrideSelect(null).value).toBe('')
    expect(MONEY).toContain('value={overrideSelect.value}')
  })
})

// ── The task banner ─────────────────────────────────────────────────────────

describe('the task banner acts, in the Slack card’s words', () => {
  type BannerTask = {
    _id: string
    title?: string
    status?: string
    kind?: string
    humanQuestion?: string
    ownerName?: string
    priority?: string
    dueAt?: string
    blocker?: string
  }
  const task = (overrides: Partial<BannerTask>): BannerTask => ({ _id: 'marketingOperation.abc', title: 'Pin the kit', ...overrides })
  const decision = task({ status: 'needsHuman', kind: 'decision', humanQuestion: 'Publish F1–F8?' })
  const passedOn = task({ status: 'needsHuman', humanQuestion: 'Eric passed on this — who should pick it up?' })

  it('offers each state what the card offers it', () => {
    const cases: Array<[BannerTask, TaskBannerAction[]]> = [
      [task({ status: 'queued' }), ['done', 'stuck']],
      [task({ status: 'working', ownerName: 'Juhan' }), ['done', 'stuck']],
      [task({ status: 'waiting' }), ['done', 'stuck']],
      [task({ status: 'scheduled' }), ['done', 'stuck']],
      // Done leftmost, as on the card (§2.5): Done★ · Unstuck.
      [task({ status: 'blocked', blocker: 'No PDF' }), ['done', 'unstuck']],
      [task({ status: 'done' }), ['reopen']],
      [task({ status: 'dismissed' }), ['reopen']],
      [decision, ['answer']],
      // "Not me" leaves an owner search, not a decision.
      [passedOn, ['done', 'stuck']],
    ]
    for (const [input, actions] of cases) expect(taskBannerActions(input)).toEqual(actions)
    expect(taskBannerState(decision)).toBe('decision')
    expect(taskBannerState(passedOn)).toBe('open')
  })

  it('styles at most one button as the ask — never Reopen, and never beside an open Stuck form’s Save', () => {
    expect(taskBannerPrimary(['done', 'stuck'])).toBe('done')
    expect(taskBannerPrimary(['done', 'unstuck'])).toBe('done')
    expect(taskBannerPrimary(['answer'])).toBe('answer')
    // The card has no green button for closed work.
    expect(taskBannerPrimary(['reopen'])).toBeNull()
    // The Stuck form's Save is the ask while it is open: one green button, not two.
    expect(taskBannerPrimary(['done', 'stuck'], true)).toBeNull()
    expect(BANNER).toContain('const primary = taskBannerPrimary(actions, stuckOpen)')
    expect(BANNER).toContain('const style = action === primary ? styles.primary : styles.button')
    expect(BANNER).not.toContain('index === 0 ? styles.primary')
  })

  it('shows the task as the save left it: replaced, not merged, and an answered question is not asked again', () => {
    // A merge kept the blocker Unstuck had just removed.
    expect(BANNER).toContain('if (response.item) setTask(response.item)')
    expect(BANNER).not.toContain('setTask({ ...task, ...response.item })')
    expect(BANNER).toContain("const answered = text(task.humanResponse) && task.status !== 'needsHuman' ? text(task.humanResponse) : ''")
    expect(BANNER).toContain("const question = answered ? '' : text(task.humanQuestion)")
    expect(BANNER).toContain('Answered: ')
  })

  it('only ever offers a move the board accepts, and the route keeps every field it sends', () => {
    const statuses = ['queued', 'working', 'waiting', 'scheduled', 'blocked', 'done', 'dismissed', 'needsHuman'] as const
    for (const status of statuses) {
      const input = status === 'needsHuman' ? decision : task({ status })
      for (const action of taskBannerActions(input)) {
        const write = taskBannerPatch(action, { blocker: 'Need the numbers', answer: 'Yes, publish it' })!
        expect(write, `${status} → ${action}`).not.toBeNull()
        expect(canTransitionMarketingOperation(status, write.patch.status!), `${status} → ${action}`).toBe(true)
        expect(normalizeMarketingOperationPatch(write.patch)).toEqual(write.patch)
      }
    }
  })

  it('makes the Slack press’s own write', () => {
    expect(taskBannerPatch('done')!.patch).toEqual({ status: 'done' })
    expect(taskBannerPatch('stuck', { blocker: '  Need the numbers  ' })!.patch).toEqual({ status: 'blocked', blocker: 'Need the numbers' })
    expect(taskBannerPatch('stuck', { blocker: 'x'.repeat(700) })!.patch.blocker).toHaveLength(600)
    expect(taskBannerPatch('stuck', { blocker: '   ' })).toBeNull()
    expect(taskBannerPatch('unstuck')!.patch).toEqual({ status: 'working', blocker: '' })
    expect(taskBannerPatch('reopen')!.patch).toEqual({ status: 'queued', dismissedUntil: '' })
    expect(taskBannerPatch('answer', { answer: 'Yes' })!.patch).toEqual({ status: 'queued', humanResponse: 'Yes', blocker: '' })
    expect(taskBannerPatch('answer', { answer: ' ' })).toBeNull()
  })

  it('describes the task in the card’s words', () => {
    expect(taskBannerMeta(task({ status: 'blocked', ownerName: 'Juhan', priority: 'high', dueAt: '2026-09-22T14:00:00Z' }), NOW)).toBe(
      'Urgent · Stuck · Juhan · overdue since Tue 22 Sep',
    )
    expect(taskBannerMeta(task({ status: 'queued', dueAt: '2026-09-25T14:00:00Z' }), NOW)).toBe('Nobody has it · due tomorrow')
    expect(taskBannerMeta(task({ status: 'waiting', dueAt: '2026-09-24T20:00:00Z' }), NOW)).toBe('Waiting on someone · Nobody has it · due today')
    expect(taskBannerMeta({ ...decision, dueAt: '2026-09-28T14:00:00Z' }, NOW)).toBe('Needs a decision · due Mon 28 Sep')
    expect(taskBannerMeta(task({ status: 'done', ownerName: 'Juhan', dueAt: '2026-09-01T14:00:00Z' }), NOW)).toBe('Done · Juhan')
    // One function for the words, shared with the card and the desk.
    const working = task({ status: 'working', ownerName: 'Shirley' })
    expect(taskBannerMeta(working, NOW)).toContain(taskStatusWords(working))
  })

  it('reads what it needs to act, and saves through the guarded operations route', () => {
    for (const field of ['_rev', 'dueAt', 'blocker', 'humanResponse', 'ownerName']) expect(BANNER).toContain(field)
    expect(BANNER).toContain("'/api/marketing/operations'")
    expect(BANNER).toContain("{ action: 'update', id: task._id, expectedRevision: task._rev || '', patch: write.patch, note: write.note }")
    expect(BANNER).toContain('Saved — Slack’s card updates on its next post.')
    expect(BANNER).toContain('Answer it here')
    expect(BANNER).toContain('What’s in the way')
  })
})

// ── This week ───────────────────────────────────────────────────────────────

describe('This week shows one person’s share when a link asks for it', () => {
  const plan: WeekPlanResponse = {
    week: '2026-W39',
    weekStart: '2026-09-21',
    weekEnd: '2026-09-27',
    posture: 'rebuild',
    budgetMinutes: 480,
    plannedMinutes: 120,
    overCommitted: false,
    theme: null,
    rationale: null,
    items: [
      { id: 'i-juhan', title: 'Call MGB', kind: 'outreach', owner: 'Juhan', status: 'working', minutes: 30, estimateSource: 'explicit', overdue: false },
      { id: 'i-shirley', title: 'Draft the article', kind: 'content', owner: 'Shirley', status: 'queued', minutes: 60, estimateSource: 'estimated', overdue: false },
      { id: 'i-nobody', title: 'Newsletter teaser', kind: 'content', owner: null, status: 'queued', minutes: 30, estimateSource: 'explicit', overdue: false },
    ],
    decisions: [
      { id: 'd-juhan', title: 'Publish F1–F8?', kind: 'decision', question: 'Should we?', owner: 'juhan', status: 'needsHuman', minutes: 20, rev: 'rev-d1' },
      { id: 'd-nobody', title: 'Pick a price band', kind: 'decision', question: 'Which?', owner: null, status: 'needsHuman', minutes: 20, rev: 'rev-d2' },
      // What Slack's "Not me" leaves: the planner files it as a decision.
      { id: 'd-passed', title: 'Newsletter: pre-mortem teaser', kind: 'content', question: 'Eric passed on this — who should pick it up?', owner: null, status: 'needsHuman', minutes: 20, rev: 'rev-p' },
    ],
    deferred: [
      { id: 'x-juhan', title: 'Pin the kit', owner: 'Juhan', status: 'blocked', blocker: 'No PDF', minutes: 20, reason: 'blocked' },
      { id: 'x-eric', title: 'Town Day table', owner: 'Eric', status: 'queued', minutes: 60, reason: 'over budget' },
      { id: 'x-done', title: 'Old post', owner: 'Juhan', status: 'done', minutes: 20, reason: 'already done', completedAt: '2026-09-22T15:00:00Z' },
    ],
    followUps: [
      { contactId: 'c-jane', who: 'Jane Doe (MGB)', due: 'overdue since Tue 22 Sep', last: '', temperature: 'they know us', overdue: true, ownerName: 'Juhan' },
      { contactId: 'c-ada', who: 'Ada Park (X Health)', due: 'due Fri 25 Sep', last: '', temperature: 'cold', overdue: false, ownerName: '' },
    ],
  }

  it('"+2 more on This week" (owner=Juhan) shows exactly Juhan’s tasks, decisions, deferred work and follow-ups', () => {
    const link = new URL(studioViewUrl(BASE, 'thisWeek', { owner: 'Juhan' }))
    const { owner } = readMarketingLandingParams(link.search)
    const shown = filterWeekByOwner(plan, owner)
    expect(shown.items.map((row) => row.id)).toEqual(['i-juhan'])
    expect(shown.decisions.map((row) => row.id)).toEqual(['d-juhan'])
    expect(shown.deferred.map((row) => row.id)).toEqual(['x-juhan', 'x-done'])
    expect(shown.followUps.map((row) => row.contactId)).toEqual(['c-jane'])

    const everyone = filterWeekByOwner(plan, '')
    expect(everyone.items).toHaveLength(3)
    expect(everyone.followUps).toHaveLength(2)
  })

  it('offers a chip for everyone with a share, and for whoever a link asked for', () => {
    expect(weekOwners(plan)).toEqual(['Eric', 'Juhan', 'Shirley'])
    expect(weekOwners(plan, 'Priya')).toEqual(['Eric', 'Juhan', 'Priya', 'Shirley'])
    expect(weekOwners(plan, 'juhan')).toEqual(['Eric', 'Juhan', 'Shirley'])
  })

  it('describes each row in the card’s status words', () => {
    expect(workMeta(plan.items[0])).toBe('Juhan · In progress · 30m')
    expect(workMeta(plan.items[1])).toBe('Shirley · 1h (est.)')
    expect(workMeta(plan.items[2])).toBe('Nobody has it · 30m')
    expect(workMeta({ owner: null, status: 'working', minutes: 15 })).toBe('Marqueta working · 15m')
  })

  it('puts stuck work on its own with what is in the way, and counts what is done', () => {
    const grouped = groupDeferred(plan.deferred, plan.weekStart)
    expect(grouped.stuck.map((row) => row.id)).toEqual(['x-juhan'])
    expect(grouped.doneCount).toBe(1)
    expect(grouped.byReason).toEqual([['over budget', [plan.deferred[1]]]])
    expect(WEEK).toContain('`In the way: ${entry.blocker}`')
    expect(WEEK).toContain("{countLabel(deferred.doneCount, 'task')} done this week — history is on the desk (Dashboard)")
  })

  it('calls only blocked work Stuck, and counts only work done this week as done', () => {
    // Everything the planner defers as 'blocked' or 'already done', by status.
    const rows: PlanDeferral[] = [
      { id: 'stuck', title: 'Pin the kit', owner: 'Juhan', status: 'blocked', blocker: 'No PDF', minutes: 20, reason: 'blocked' },
      { id: 'waiting', title: 'Hear back from MGB', owner: 'Shirley', status: 'waiting', minutes: 30, reason: 'blocked' },
      { id: 'leftover', title: 'Case study refresh', owner: null, status: 'queued', blocker: 'No strong internal source matched this update.', minutes: 45, reason: 'blocked' },
      { id: 'decision-leftover', title: 'Pick a price band', kind: 'decision', owner: null, status: 'needsHuman', blocker: 'Need last year’s numbers', minutes: 20, reason: 'blocked' },
      { id: 'done-now', title: 'Post the teaser', owner: 'Eric', status: 'done', minutes: 20, reason: 'already done', completedAt: '2026-09-21T14:00:00Z' },
      { id: 'done-before', title: 'Old post', owner: 'Eric', status: 'done', minutes: 20, reason: 'already done', completedAt: '2026-08-02T14:00:00Z' },
      { id: 'done-undated', title: 'Older post', owner: 'Eric', status: 'done', minutes: 20, reason: 'already done' },
      { id: 'dropped', title: 'Dropped idea', owner: null, status: 'dismissed', minutes: 20, reason: 'already done' },
    ]
    const grouped = groupDeferred(rows, '2026-09-21')
    expect(grouped.stuck.map((row) => row.id)).toEqual(['stuck'])
    // Dropped is not done, and August is not this week.
    expect(grouped.doneCount).toBe(1)
    expect(Object.fromEntries(grouped.byReason.map(([reason, entries]) => [reason, entries.map((row) => row.id)]))).toEqual({
      'waiting on someone': ['waiting'],
      'something in the way': ['leftover', 'decision-leftover'],
    })
    // No group is ever headed "blocked", and nothing waiting is called Stuck.
    expect(grouped.byReason.map(([reason]) => reason)).not.toContain('blocked')
    // What is in the way is shown wherever it is the reason.
    expect(WEEK).toContain("reason === 'something in the way' && entry.blocker")
  })

  it('shows a task somebody passed on as work that needs someone, not as a decision', () => {
    const { decisions, needsSomeone } = splitWeekDecisions(plan.decisions)
    expect(decisions.map((row) => row.id)).toEqual(['d-juhan', 'd-nobody'])
    expect(needsSomeone.map((row) => row.id)).toEqual(['d-passed'])
    // The Studio's words for it, without saying nobody has it twice.
    expect(workMeta(needsSomeone[0])).toBe('Needs someone · 20m')
    // Rendered in the work list; only real decisions are under "Decisions waiting".
    expect(WEEK).toContain('...split.needsSomeone.map((row) => ({ ...row, kind: row.kind || \'task\' }))')
    expect(WEEK).toContain('{split.decisions.length > 0 && (')
    expect(WEEK).toContain('{split.decisions.map((decision) => {')
    expect(WEEK).not.toContain('shown.decisions.map(')
    // A focus=decisions landing never scrolls to an owner search.
    expect(weekFocusTarget('decisions', { decisions, followUps: [], caught: [] })).toBe('week-decisions')
    expect(weekFocusTarget('decisions', { decisions: [], followUps: [], caught: [] })).toBeNull()
  })

  it('lets a decision be answered where its link lands, through the guarded write', () => {
    expect(WEEK).toContain('{LABEL.ANSWER}')
    expect(WEEK).toContain("const write = taskBannerPatch('answer', { answer: answerDraft })")
    expect(WEEK).toContain('expectedRevision: decision.rev')
    expect(WEEK).toContain("'/api/marketing/operations'")
    // Ideas judged here are recorded as the person who judged them.
    expect(WEEK).toContain("{ id, keep, ...(personName ? { personName } : {}) }")
  })

  it('scrolls a focus landing only once its section has something in it', () => {
    const sections = { decisions: [], followUps: [{}], caught: [] }
    expect(weekFocusTarget('followUps', sections)).toBe('week-follow-ups')
    expect(weekFocusTarget('caught', sections)).toBeNull()
    expect(weekFocusTarget(undefined, sections)).toBeNull()
    expect(WEEK).toContain('const id = weekFocusTarget(focus, {')
  })

  it('names follow-up buttons by what they say first (WCAG 2.5.3), in the current labels', () => {
    expect(WEEK).toContain('aria-label={`${LABEL.PREP} — ${followUp.who}`}')
    expect(WEEK).toContain('aria-label={`${LABEL.LOG} — ${followUp.who}`}')
    expect(WEEK).not.toMatch(/Log how it went|Prep a call with/)
  })

  it('says who a caught idea came from and when, with a way back to the message', () => {
    const idea = {
      _id: 'marketingIdea.slack-C1-1',
      title: 'Merch table at Town Day',
      source: 'Slack — Juhan, not yet reviewed',
      relatedUrl: 'https://goinvo.slack.com/archives/C1/p1',
      _createdAt: '2026-09-22T15:00:00Z',
    }
    expect(caughtIdeaMeta(idea, NOW)).toEqual({ line: 'Slack — Juhan · 2 days ago', url: 'https://goinvo.slack.com/archives/C1/p1' })
    expect(caughtIdeaMeta({ ...idea, _createdAt: '2026-09-24T13:00:00Z' }, NOW).line).toBe('Slack — Juhan · today')
    expect(caughtIdeaMeta({ ...idea, relatedUrl: 'javascript:alert(1)' }, NOW).url).toBe('')
    expect(WEEK).toContain('view the message in Slack ↗')
    expect(WEEK).toContain('Kept — it’s in the idea backlog on the SEO tab.')
  })

  it('lays the page out the way Slack’s links expect it', () => {
    expect(new Set(Object.values(WEEK_FOCUS_SECTION_ID)).size).toBe(3)
    for (const focus of ['caught', 'followUps', 'decisions']) expect(WEEK).toContain(`id={WEEK_FOCUS_SECTION_ID.${focus}}`)
    // Follow-ups sit above the call sheet: people who answered come first.
    expect(WEEK.indexOf('>Follow-ups due</h3>')).toBeGreaterThan(-1)
    expect(WEEK.indexOf('>Follow-ups due</h3>')).toBeLessThan(WEEK.indexOf('<OutreachCallSheet'))
    expect(WEEK).toContain('>Decisions waiting</h3>')
    expect(WEEK).toContain('>Stuck</h3>')
    expect(WEEK).toContain('Includes {plan.reserved.label} — kept free for people who already answered.')
    expect(WEEK).toContain('{weekOfLabel(plan.weekStart, now)} · {plan.runway || plan.posture}')
    expect(WEEK).not.toMatch(/Waiting on a person|Unassigned/)
    expect(WEEK).toContain('aria-label="Show whose work"')
  })
})
