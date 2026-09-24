/**
 * Every button Marqueta draws has somebody on the other end.
 *
 * Builders and the interactions route live in different files, owned — during
 * the UX pass — by different people, and a button with no handler fails in
 * the worst way: Slack shows the press as accepted, nothing is written, and
 * nobody hears about it. Worse, the delegation block in the route used to read
 * any `MARKETING_ACTION` id it did not recognise as "Not me", so a new button
 * that missed its handler quietly passed on somebody's task.
 *
 * So this is built from the SOURCE, not from a list someone keeps up to date:
 *
 *   1. Every action id referenced anywhere in `src/` is one of the two
 *      vocabularies, and every id in them is dispatched by the route — read
 *      from the route's own comparisons (`actionId === MARQUETA_ACTION.x`)
 *      and its `TASK_ACTIONS` table.
 *   2. Each id's dispatch reads the button's `value` with the decoder the
 *      builders encode for — checked in the route's source, where the handler
 *      for that id calls it on `action.value`.
 *   3. Every button the pure builders actually draw (every card state, the
 *      check-in, the Monday plan, captures, money, call prep, receipts, the
 *      legacy attachment card) decodes back to the thing it was drawn for.
 *   4. Every Studio link a message can carry names a tab the Studio has, and
 *      every landing param it sets is one the Studio reads — and strips.
 *
 * Replies drawn inside `marquetaChat.server.ts` and the route itself are
 * covered by (1) and (2) — their ids and decoders — and exercised end to end
 * in tests/marqueta-conversation.test.ts and
 * tests/slack-interactions-marqueta.test.ts.
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { buildCallLogReceiptBlocks, buildCallLogView } from '@/lib/marketing/callLog'
import { buildCallOutlineMessages, buildPrepCandidatesBlocks, buildPrepListBlocks, composeCallOutline, type PrepContact } from '@/lib/marketing/callPrep'
import {
  decodeAvailabilityUndo,
  decodeCallLogUndo,
  decodeContactRef,
  decodeStrategyValue,
  decodeTaskCardValue,
  encodeAvailabilityUndo,
  encodeCallLogUndo,
  encodeContactRef,
  CALL_LOG_CALLBACK,
  MARQUETA_ACTION,
  TASK_STUCK_CALLBACK,
} from '@/lib/marketing/marquetaActions'
import { VIEW_TITLE, weekOfLabel } from '@/lib/marketing/marquetaStyle'
import { summarizeOutreach } from '@/lib/marketing/outreachPulse'
import { describeRunway, resolveRunwayPosture, runwayCheckIn, type StoredPosture } from '@/lib/marketing/runway'
import {
  buildDraftCaptureBlocks,
  buildIdeaCaptureBlocks,
  buildIdentityPromptBlocks,
  buildRunwayView,
  buildTaskAttachment,
  buildTaskDetailView,
  buildWeeklyDigestBlocks,
  decodeActionValue,
  decodeIdeaValue,
  MARKETING_ACTION,
  MARKETING_ANSWER_CALLBACK,
  MARKETING_RUNWAY_CALLBACK,
  type DigestCard,
} from '@/lib/marketing/slackDelegation'
import {
  buildMoneyAndDirectionBlocks,
  buildStrategySnapshot,
  moneyAnswer,
  monthWindow,
  strategyAnswer,
  type MoneyRunway,
} from '@/lib/marketing/strategyCheck'
import {
  MARKETING_CONTACT_ACTION_QUERY_PARAM,
  MARKETING_CONTACT_QUERY_PARAM,
  MARKETING_FOCUS_QUERY_PARAM,
  MARKETING_OWNER_QUERY_PARAM,
  MARKETING_TASK_QUERY_PARAM,
  MARKETING_VIEW_QUERY_PARAM,
  studioTaskUrl,
  studioViewUrl,
  type StudioFocus,
} from '@/lib/marketing/taskLinks'
import { buildTaskCard, buildTaskStuckView, buildWeeklyCheckInBlocks, type CheckInTask, type TaskCardOptions } from '@/lib/marketing/weeklyCheckIn'
import { MARKETING_TOOL_VIEWS } from '@/sanity/components/marketing/domain'
import { WEEK_FOCUS_SECTION_ID } from '@/sanity/components/marketing/WeeklyPlanWorkspace'
import { marketingUrlWithoutLandingParams, readMarketingLandingParams, resolveMarketingViewParam } from '@/sanity/tools/marketingTool'

import { expectValidSlackBlocks } from './support/slackBlocks'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ROUTE_FILE = 'src/app/api/slack/interactions/route.ts'
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')

/** Thursday 24 Sep 2026, 10am in Boston; the Monday plan is Monday's. */
const NOW = new Date('2026-09-24T14:00:00Z')
const MONDAY = new Date('2026-09-21T13:00:00Z')
const BASE = 'https://www.goinvo.com'

const VOCABULARY = { MARQUETA_ACTION, MARKETING_ACTION } as const
type VocabularyName = keyof typeof VOCABULARY
const ALL_IDS = new Set<string>([...Object.values(MARQUETA_ACTION), ...Object.values(MARKETING_ACTION)])
const idOf = (vocabulary: string, key: string): string | undefined => (VOCABULARY as Record<string, Record<string, string>>)[vocabulary]?.[key]

// ── What reads each button's value ──────────────────────────────────────────

/**
 * What the route hands a button's `value` to, per action id — and the pure
 * decoder that reads it. `null` where the value is not read at all (the
 * runway buttons, "I’m away", a select that sends its chosen option).
 *
 * Every id in both vocabularies must have an entry, so a new id cannot be
 * added without deciding here how its value is read.
 */
type Reader = { calls: string; decode: (value: string) => unknown }
const contactRef: Reader = { calls: 'decodeContactRef', decode: decodeContactRef }
const taskCard: Reader = { calls: 'decodeTaskCardValue', decode: decodeTaskCardValue }

const VALUE_READER: Record<string, Reader | null> = {
  [MARQUETA_ACTION.prepCall]: contactRef,
  [MARQUETA_ACTION.logCall]: contactRef,
  [MARQUETA_ACTION.addContact]: contactRef,
  [MARQUETA_ACTION.taskDone]: taskCard,
  [MARQUETA_ACTION.taskProgress]: taskCard,
  [MARQUETA_ACTION.taskStuck]: taskCard,
  [MARQUETA_ACTION.taskHandBack]: taskCard,
  [MARQUETA_ACTION.taskReopen]: taskCard,
  [MARQUETA_ACTION.taskTake]: taskCard,
  [MARQUETA_ACTION.taskDrop]: taskCard,
  [MARQUETA_ACTION.taskSnooze]: taskCard,
  [MARQUETA_ACTION.callLogUndo]: { calls: 'decodeCallLogUndo', decode: decodeCallLogUndo },
  [MARQUETA_ACTION.strategyConfirm]: { calls: 'decodeStrategyValue', decode: decodeStrategyValue },
  [MARQUETA_ACTION.strategyRethink]: { calls: 'decodeStrategyValue', decode: decodeStrategyValue },
  // Decoded inside slackActions.server (and checked there against the presser).
  [MARQUETA_ACTION.availabilityUndo]: { calls: 'restoreMarketingAvailability', decode: decodeAvailabilityUndo },
  [MARKETING_ACTION.claim]: taskCard,
  [MARKETING_ACTION.decline]: taskCard,
  // `decodeActionValue` reads the `{t,o,s}` every task card value starts with.
  [MARKETING_ACTION.details]: { calls: 'decodeActionValue', decode: decodeActionValue },
  [MARKETING_ACTION.ideaKeep]: { calls: 'decodeIdeaValue', decode: decodeIdeaValue },
  [MARKETING_ACTION.ideaDiscard]: { calls: 'decodeIdeaValue', decode: decodeIdeaValue },
  [MARKETING_ACTION.away]: null,
  [MARKETING_ACTION.linkIdentity]: null,
  [MARKETING_ACTION.runwayConfirm]: null,
  [MARKETING_ACTION.runwaySigned]: null,
  [MARKETING_ACTION.runwayUpdate]: null,
}

// ── Reading the source ──────────────────────────────────────────────────────

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((entry) => {
    const path = `${dir}/${entry}`
    if (statSync(join(ROOT, path)).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry) ? [path] : []
  })
}

const parse = (file: string) => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

function walk(node: ts.Node, visit: (node: ts.Node) => void) {
  visit(node)
  ts.forEachChild(node, (child) => walk(child, visit))
}

/** `MARQUETA_ACTION.taskDone` → the vocabulary and key, or null. */
function vocabularyAccess(node: ts.Node): { vocabulary: VocabularyName; key: string } | null {
  if (!ts.isPropertyAccessExpression(node) || !ts.isIdentifier(node.expression)) return null
  const vocabulary = node.expression.text
  if (vocabulary !== 'MARQUETA_ACTION' && vocabulary !== 'MARKETING_ACTION') return null
  return { vocabulary, key: node.name.text }
}

/** Every `MARQUETA_ACTION.x` / `MARKETING_ACTION.x` referenced in a file. */
function referencedIds(file: string): Array<{ vocabulary: VocabularyName; key: string; id: string | undefined }> {
  const found: Array<{ vocabulary: VocabularyName; key: string; id: string | undefined }> = []
  walk(parse(file), (node) => {
    const access = vocabularyAccess(node)
    if (access) found.push({ ...access, id: idOf(access.vocabulary, access.key) })
  })
  return found
}

/** The expression a handler switches on: the pressed action's id. */
const isDispatchSubject = (node: ts.Expression) => /^(actionId|action[?!]?\.action_id!?)$/.test(node.getText())

/**
 * The route's dispatch, read from its source: for each id, the blocks that
 * handle it. An id is dispatched where the pressed id is compared to it
 * (`actionId === MARQUETA_ACTION.x`, `action?.action_id === …`) — the block
 * is the `if` whose condition makes that comparison, or, for a comparison
 * held in a `const` (the claim / decline pair), the `if` block it sits in —
 * and where it keys the `TASK_ACTIONS` table, whose block is `if (runTask)`.
 */
function routeDispatch(): Map<string, ts.Node[]> {
  const source = parse(ROUTE_FILE)
  const scopes = new Map<string, ts.Node[]>()
  const add = (id: string | undefined, scope: ts.Node | undefined) => {
    if (!id || !scope) return
    scopes.set(id, [...(scopes.get(id) || []), scope])
  }

  let runTaskBlock: ts.Node | undefined
  walk(source, (node) => {
    if (ts.isIfStatement(node) && ts.isIdentifier(node.expression) && node.expression.text === 'runTask') runTaskBlock = node.thenStatement
  })

  walk(source, (node) => {
    // TASK_ACTIONS: { [MARQUETA_ACTION.taskDone]: markTaskDone, … }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'TASK_ACTIONS' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const property of node.initializer.properties) {
        if (ts.isPropertyAssignment(property) && ts.isComputedPropertyName(property.name)) {
          const access = vocabularyAccess(property.name.expression)
          if (access) add(idOf(access.vocabulary, access.key), runTaskBlock)
        }
      }
    }
    if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) return
    const [subject, other] = isDispatchSubject(node.left) ? [node.left, node.right] : [node.right, node.left]
    const access = vocabularyAccess(other)
    if (!access || !isDispatchSubject(subject)) return

    // The nearest `if` whose condition holds this comparison — or whose block
    // does, when the comparison was stored in a const first.
    let child: ts.Node = node
    let parent: ts.Node | undefined = node.parent
    while (parent && !ts.isSourceFile(parent)) {
      if (ts.isIfStatement(parent)) {
        add(idOf(access.vocabulary, access.key), child === parent.expression ? parent.thenStatement : parent.thenStatement === child ? child : parent)
        return
      }
      child = parent
      parent = parent.parent
    }
  })
  return scopes
}

/** Names of the functions a block calls with the pressed button's value somewhere in the arguments. */
function valueReadersIn(scope: ts.Node): Set<string> {
  const names = new Set<string>()
  walk(scope, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return
    if (node.arguments.some((argument) => /\baction[?!]?\.value\b/.test(argument.getText()))) names.add(node.expression.text)
  })
  return names
}

// ── Reading what the builders draw ──────────────────────────────────────────

type Control = { action_id: string; value?: string; label: string; where: string }

/** Every pressable element in a message: action rows, accessories, and legacy attachments' blocks. */
function controlsIn(blocks: Block[], where: string, attachments: Block[] = []): Control[] {
  const all = [...(blocks || []), ...attachments.flatMap((attachment) => attachment?.blocks || [])]
  return all
    .flatMap((block) => [...(block?.type === 'actions' ? block.elements || [] : []), ...(block?.accessory ? [block.accessory] : [])])
    .filter((element: Block) => element && element.action_id)
    .map((element: Block) => ({
      action_id: String(element.action_id),
      value: element.value === undefined ? undefined : String(element.value),
      label: String(element.text?.text || element.placeholder?.text || ''),
      where,
    }))
}

// Fixtures: the shared gallery week (§4) — enough of it to draw every button.
const task = (overrides: Partial<CheckInTask> & { _id: string }): CheckInTask => ({
  title: 'Draft the pre-mortem article (v2)',
  status: 'working',
  minutes: 30,
  dueAt: '2026-09-25',
  targetView: 'calendar',
  ...overrides,
})

const TASKS = {
  open: task({ _id: 'op-open', ownerName: 'Shirley', slackUserId: 'U2' }),
  blocked: task({ _id: 'op-blocked', ownerName: 'Juhan', slackUserId: 'U1', status: 'blocked', blocker: 'Waiting on legal' }),
  slipping: task({ _id: 'op-slipping', ownerName: 'Eric', slackUserId: 'U3', status: 'queued', dueAt: '2026-09-01' }),
  unowned: task({ _id: 'op-merch', title: 'Arlington Town Day merch table', status: 'queued', ownerName: '' }),
  decision: task({ _id: 'op-decide', title: 'Decide: publish the F1–F8 taxonomy?', kind: 'decision', status: 'needsHuman', humanQuestion: 'Publish it?', ownerName: '' }),
  ownDecision: task({ _id: 'op-own-decision', kind: 'decision', status: 'needsHuman', humanQuestion: 'Publish it?', ownerName: 'Juhan', slackUserId: 'U1' }),
  done: task({ _id: 'op-done', ownerName: 'Shirley', slackUserId: 'U2', status: 'done' }),
  dropped: task({ _id: 'op-dropped', ownerName: 'Shirley', slackUserId: 'U2', status: 'dismissed' }),
  exhausted: task({ _id: 'op-kit', title: 'Pin the kit on LinkedIn', status: 'queued', ownerName: '' }),
  away: task({ _id: 'op-away', ownerName: 'Eric', slackUserId: 'U3', status: 'queued' }),
}

/** Every card state in §2.5, in both modes where the mode changes the buttons. */
const CARD_CASES: Array<[string, CheckInTask, Omit<TaskCardOptions, 'now'>]> = [
  ['open (mine)', TASKS.open, { mode: 'mine' }],
  ['blocked (mine)', TASKS.blocked, { mode: 'mine' }],
  ['slipping (mine)', TASKS.slipping, { mode: 'mine' }],
  ['taken (plan)', TASKS.open, { mode: 'plan' }],
  ['unowned', TASKS.unowned, { mode: 'plan' }],
  ['asked', TASKS.unowned, { mode: 'plan', ask: { slackUserId: 'U3', name: 'Eric', reason: 'suggested' } }],
  ['away cover', TASKS.away, { mode: 'plan', context: 'away', awayNote: 'Eric is away · free this week: Juhan, Shirley' }],
  ['exhausted', TASKS.exhausted, { mode: 'plan', context: 'exhausted' }],
  ['decision', TASKS.decision, { mode: 'plan' }],
  ['own decision (mine)', TASKS.ownDecision, { mode: 'mine' }],
  ['done', TASKS.done, { mode: 'mine' }],
  ['dropped', TASKS.dropped, { mode: 'mine' }],
]

const card = (name: string): Block[] => {
  const found = CARD_CASES.find(([label]) => label === name)!
  return buildTaskCard(found[1], { ...found[2], now: MONDAY, studioBaseUrl: BASE })
}
const digestCard = (name: string): DigestCard => {
  const found = CARD_CASES.find(([label]) => label === name)!
  return { taskId: found[1]._id, blocks: card(name) }
}

const JANE_REF = encodeContactRef({ contactId: 'contact-jane', organization: 'Mass General Brigham', name: 'Jane Doe' })

function runwayState(stored: StoredPosture, now: Date): MoneyRunway {
  return { summary: describeRunway(stored, now), checkIn: runwayCheckIn(stored, now), resolved: resolveRunwayPosture(stored, now) }
}
const STALE_RUNWAY = runwayState({ runway: { certainUntil: '2027-01-11', confirmedAt: '2026-08-20T00:00:00Z' } }, NOW)
const FRESH_RUNWAY = runwayState({ runway: { certainUntil: '2027-01-11', confirmedAt: '2026-09-20T00:00:00Z' } }, NOW)
const SNAPSHOT = buildStrategySnapshot({
  now: NOW,
  runwaySummary: '3.5 months of certain runway (to 11 Jan 2027) — Rebuild.',
  postureId: 'rebuild',
  thisMonth: summarizeOutreach([], { ...monthWindow(NOW, 0), now: NOW }),
  lastMonth: summarizeOutreach([], { ...monthWindow(NOW, -1), now: NOW }),
  pipelineContacts: [{ status: 'meeting', estimatedValue: 60000, interactions: [] }],
  gates: [],
})

const JANE: PrepContact = {
  _id: 'contact-jane',
  name: 'Jane Doe',
  organization: 'Mass General Brigham',
  role: 'CMIO',
  segment: 'provider',
  warmth: 'warm',
  status: 'contacted',
}

/** Every message the pure builders draw, by name. */
function renderedMessages(): Array<{ where: string; blocks: Block[]; attachments?: Block[] }> {
  const messages: Array<{ where: string; blocks: Block[]; attachments?: Block[] }> = []
  for (const [name] of CARD_CASES) messages.push({ where: `task card: ${name}`, blocks: card(name) })

  messages.push({
    where: 'Thursday check-in',
    blocks: buildWeeklyCheckInBlocks({
      weekLabel: weekOfLabel('2026-09-21', NOW),
      groups: [
        {
          ownerName: 'Shirley',
          slackUserId: 'U2',
          tasks: [TASKS.open, TASKS.blocked, TASKS.slipping],
          hidden: 2,
          followUps: [{ label: '*Follow up with Jane Doe (Mass General Brigham)*', detail: 'overdue since Tue 22 Sep', contactRef: JANE_REF, overdue: true }],
        },
      ],
      unowned: [TASKS.unowned],
      pulse: null,
      now: NOW,
      studioBaseUrl: BASE,
    }),
  })

  const money = buildMoneyAndDirectionBlocks({ now: NOW, runway: STALE_RUNWAY, snapshot: SNAPSHOT, strategyDue: { due: true, reason: 'A month since the last check.' } })
  messages.push({
    where: 'Monday plan',
    blocks: buildWeeklyDigestBlocks({
      now: MONDAY,
      weekStart: '2026-09-21',
      budgetMinutes: 480,
      plan: { plannedMinutes: 450, theme: 'Pre-mortem week' },
      planRecorded: true,
      needsOwner: { asked: [digestCard('asked')], away: [digestCard('away cover')], exhausted: [digestCard('exhausted')], open: [], more: 1 },
      decisions: [digestCard('decision')],
      taken: [{ name: 'Juhan', slackUserId: 'U1', count: 2 }],
      followUps: [{ label: '*Follow up with Jane Doe*', detail: 'due Tue 22 Sep', contactRef: JANE_REF }],
      followUpsTotal: 3,
      callSheet: [{ organization: 'Crossover Health', contacts: [{ _id: 'contact-sam' }], signal: 's', quote: 'q', sourceUrl: '', opening: '', offer: null, context: '' } as never],
      money,
      ideas: [{ title: 'Merch table' }],
      ideasTotal: 4,
      unmappedOwners: ['Eric'],
      studioBaseUrl: BASE,
    }),
  })

  messages.push({ where: 'money: runway due', blocks: money })
  messages.push({ where: 'money: strategy only', blocks: buildMoneyAndDirectionBlocks({ now: NOW, runway: FRESH_RUNWAY, snapshot: SNAPSHOT, strategyDue: { due: true, reason: 'A month since the last check.' } }) })
  messages.push({ where: 'money: after Still right', blocks: buildMoneyAndDirectionBlocks({ now: NOW, runway: STALE_RUNWAY, snapshot: SNAPSHOT, strategyDue: { due: true, reason: 'x' }, receipt: { kind: 'runwayConfirmed', who: '<@U1>' } }) })
  messages.push({ where: 'money: rethink receipt', blocks: buildMoneyAndDirectionBlocks({ now: NOW, runway: FRESH_RUNWAY, snapshot: SNAPSHOT, receipt: { kind: 'rethink', who: '<@U1>', decisionTaskId: 'op-rethink', suggestedTo: 'Juhan' }, studioBaseUrl: BASE }) })
  messages.push({ where: '`runway` answer', blocks: moneyAnswer({ now: NOW, runway: STALE_RUNWAY, snapshot: SNAPSHOT }).blocks })
  messages.push({ where: '`strategy` answer', blocks: strategyAnswer({ now: NOW, runway: FRESH_RUNWAY, snapshot: SNAPSHOT, due: { due: true, reason: 'A month since the last check.' } }).blocks })

  messages.push({ where: 'idea capture', blocks: buildIdeaCaptureBlocks({ title: 'Merch table at Town Day', category: 'event', channel: 'CE4AA4BHP', ts: '1726000000.000100', studioUrl: studioViewUrl(BASE, 'thisWeek', { focus: 'caught' }) }) })
  messages.push({ where: 'draft capture', blocks: buildDraftCaptureBlocks({ title: 'Newsletter: pre-mortem teaser', contentType: 'newsletter', channel: 'CE4AA4BHP', ts: '1726000000.000200', studioUrl: studioViewUrl(BASE, 'calendar') }) })
  messages.push({ where: 'identity prompt', blocks: buildIdentityPromptBlocks(['Eric']) })

  messages.push({
    where: 'call-log receipt',
    blocks: buildCallLogReceiptBlocks({
      presserId: 'U1',
      contactLabel: 'Jane Doe (Mass General Brigham)',
      outcomeKey: 'voicemail',
      statusBefore: 'researched',
      statusAfter: 'contacted',
      followUpAt: '2026-09-28',
      undoValue: encodeCallLogUndo({
        contactId: 'contact-jane',
        interactionKey: 'slack-C1-1',
        prior: { status: 'researched', followUpAt: '', lastContactedAt: '', attributionChannel: '', nextStep: '' },
      }),
      now: NOW,
    }),
  })

  const outline = composeCallOutline({ match: { kind: 'contact', contact: JANE }, research: [], offers: [], evidence: [], senderName: 'Juhan', includeContactDetails: false, now: NOW })
  const prep = buildCallOutlineMessages(outline, {
    studioUrl: studioViewUrl(BASE, 'outreach', { contact: 'contact-jane', contactAction: 'prep' }),
    logRef: JANE_REF,
    addRef: encodeContactRef({ organization: 'Mass General Brigham', name: 'Jane Doe' }),
  })
  messages.push({ where: 'call prep', blocks: prep.first })
  messages.push({ where: 'call prep (thread)', blocks: prep.second })
  const candidates = [
    { label: 'Jane Doe, CMIO — Mass General Brigham', contactId: 'contact-jane', organization: 'Mass General Brigham' },
    { label: 'Jane Smith, VP Product — Acme Health', contactId: 'contact-smith', organization: 'Acme Health' },
  ]
  messages.push({ where: 'which Jane? (prep)', blocks: buildPrepCandidatesBlocks(candidates, 'Which Jane?') })
  messages.push({ where: 'which Jane? (log)', blocks: buildPrepCandidatesBlocks(candidates, 'Which Jane did you call?', { action: 'log', note: 'left a voicemail', outcome: 'voicemail' }) })
  messages.push({
    where: '`my calls`',
    blocks: buildPrepListBlocks([{ label: 'Jane Doe', temperature: 'knowsUs', detail: 'follow-up Tue 22 Sep', contactId: 'contact-jane', organization: 'Mass General Brigham' }], { heading: '*Your calls*' }),
  })

  // A Monday plan posted before the plan moved into blocks, still in the channel.
  messages.push({
    where: 'legacy attachment card',
    blocks: [],
    attachments: [
      buildTaskAttachment({ _id: 'op-legacy-open', title: 'Old card', status: 'queued' }),
      buildTaskAttachment({ _id: 'op-legacy-owned', title: 'Old owned card', ownerName: 'Juhan', slackUserId: 'U1', status: 'working' }),
    ],
  })
  return messages
}

// ── 1. Every id is dispatched ───────────────────────────────────────────────

describe('every Marqueta button has a handler', () => {
  const dispatch = routeDispatch()
  const scanned = [...sourceFiles('src/lib'), ...sourceFiles('src/app'), ...sourceFiles('src/sanity')]

  it('reads the route’s dispatch (so a pass means something)', () => {
    // Spot checks on each shape the reader has to understand.
    expect(dispatch.get(MARQUETA_ACTION.taskDone)?.length, 'TASK_ACTIONS').toBeGreaterThan(0)
    expect(dispatch.get(MARQUETA_ACTION.logCall)?.length, 'actionId === …').toBeGreaterThan(0)
    expect(dispatch.get(MARKETING_ACTION.details)?.length, 'action?.action_id === …').toBeGreaterThan(0)
    expect(dispatch.get(MARKETING_ACTION.decline)?.length, 'a comparison held in a const').toBeGreaterThan(0)
    // A comparison that is not a dispatch — searching a message's blocks — is not counted as one.
    expect(read(ROUTE_FILE)).toContain('element?.action_id === MARQUETA_ACTION.addContact')
  })

  it('dispatches every id in both vocabularies explicitly — none is left to a catch-all', () => {
    const missing = [...ALL_IDS].filter((id) => !dispatch.has(id))
    expect(missing).toEqual([])
  })

  it('references no action id outside the two vocabularies, anywhere in src', () => {
    const unknown = scanned.flatMap((file) =>
      referencedIds(file)
        .filter((reference) => !reference.id)
        .map((reference) => `${file}: ${reference.vocabulary}.${reference.key}`),
    )
    expect(unknown).toEqual([])
    // And every id a file does reference is one the route dispatches.
    const emitted = new Set(scanned.flatMap((file) => referencedIds(file).map((reference) => reference.id!)))
    expect([...emitted].filter((id) => !dispatch.has(id))).toEqual([])
  })

  it('types no Marqueta action id by hand — ids come from the vocabularies', () => {
    const typed = scanned.flatMap((file) => {
      const found: string[] = []
      walk(parse(file), (node) => {
        if (
          ts.isPropertyAssignment(node) &&
          node.name.getText() === 'action_id' &&
          (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer)) &&
          /^goinvo_(marqueta|marketing)_/.test(node.initializer.text)
        ) {
          found.push(`${file}: ${node.initializer.text}`)
        }
      })
      return found
    })
    expect(typed).toEqual([])
  })

  it('routes every form’s submission by its callback id, before the answer form’s catch-all', () => {
    const route = read(ROUTE_FILE)
    // The task-answer handler takes ANY submission with private_metadata, so
    // each other form must be claimed by its callback id above it — or its
    // submission is read as an answer to a task.
    const catchAll = route.indexOf("payload.type === 'view_submission' && payload.view?.private_metadata")
    expect(catchAll).toBeGreaterThan(0)
    const views: Array<[string, Record<string, unknown>]> = [
      ['CALL_LOG_CALLBACK', buildCallLogView({ contactLabel: 'Jane Doe', metadata: '{}' })],
      ['TASK_STUCK_CALLBACK', buildTaskStuckView({ taskTitle: 'A task', metadata: '{}' })],
      ['MARKETING_RUNWAY_CALLBACK', buildRunwayView('update')],
    ]
    for (const [name, view] of views) {
      expect(view.callback_id, name).toBe({ CALL_LOG_CALLBACK, TASK_STUCK_CALLBACK, MARKETING_RUNWAY_CALLBACK }[name])
      const handler = route.indexOf(`payload.view?.callback_id === ${name}`)
      expect(handler, name).toBeGreaterThan(0)
      expect(handler, name).toBeLessThan(catchAll)
    }
    // The answer form is the one the catch-all is for.
    expect(buildTaskDetailView({ _id: 'op-decide', title: 'Decide', kind: 'decision', humanQuestion: 'Publish it?', status: 'needsHuman' }, {}).callback_id).toBe(MARKETING_ANSWER_CALLBACK)
  })

  it('refuses an id the delegation block does not know, instead of reading it as “Not me”', () => {
    const route = read(ROUTE_FILE)
    expect(route).toMatch(/const decline = actionId === MARKETING_ACTION\.decline[\s\S]{0,600}if \(!claim && !decline\) \{[\s\S]{0,300}return\s*\}/)
    // …and does so before anything is read from the value or written.
    const guard = route.indexOf('if (!claim && !decline)')
    expect(guard).toBeGreaterThan(0)
    expect(route.indexOf('declineMarketingTask({', guard)).toBeGreaterThan(guard)
  })
})

// ── 2. Each handler reads the value the way its buttons wrote it ────────────

describe('each handler reads a button’s value with the decoder its builders encode for', () => {
  const dispatch = routeDispatch()

  it('decides, for every id, what reads its value', () => {
    expect(Object.keys(VALUE_READER).sort()).toEqual([...ALL_IDS].sort())
  })

  it('calls that reader on the pressed value in the id’s own handler', () => {
    const wrong = Object.entries(VALUE_READER).flatMap(([id, reader]) => {
      if (!reader) return []
      const readers = new Set((dispatch.get(id) || []).flatMap((scope) => [...valueReadersIn(scope)]))
      return readers.has(reader.calls) ? [] : [`${id}: expected ${reader.calls}(action.value), found ${[...readers].join(', ') || 'nothing'}`]
    })
    expect(wrong).toEqual([])
  })

  it('reads an Undo for time off the way setMarketingAvailability writes it', () => {
    const actions = read('src/lib/marketing/slackActions.server.ts')
    expect(actions).toContain('undoValue: encodeAvailabilityUndo(')
    expect(actions).toMatch(/decodeAvailabilityUndo\(input\.undo\)/)
    const undo = encodeAvailabilityUndo({
      ownerName: 'Eric',
      slackUserId: 'U3',
      wrote: { status: 'away', from: '2026-09-28', until: '2026-10-04', weeklyHours: null },
      prior: null,
    })
    expect(decodeAvailabilityUndo(undo)).toMatchObject({ ownerName: 'Eric', slackUserId: 'U3', prior: null })
  })

  it('reads a call-log Undo the way every receipt writes it', () => {
    for (const file of [ROUTE_FILE, 'src/lib/marketing/marquetaChat.server.ts']) {
      expect(read(file), file).toMatch(/undoValue: [^\n]*encodeCallLogUndo\(/)
    }
  })
})

// ── 3. What the builders draw decodes back ──────────────────────────────────

describe('every button the builders draw decodes back to what it was drawn for', () => {
  const messages = renderedMessages()
  const controls = messages.flatMap((message) => controlsIn(message.blocks, message.where, message.attachments))

  it('draws valid Slack, and draws every button there is', () => {
    for (const message of messages) {
      expectValidSlackBlocks(message.blocks)
      for (const attachment of message.attachments || []) expectValidSlackBlocks(attachment.blocks)
    }
    // The fixtures reach every id — so every id's value is checked below, not just the easy ones.
    const drawn = new Set(controls.map((control) => control.action_id))
    const undrawn = [...ALL_IDS].filter((id) => !drawn.has(id))
    // Drawn only by server code — the time-off Undo (the route's away receipt,
    // marquetaChat.server's `away` reply) — and covered by sections 1 and 2.
    expect(undrawn).toEqual([MARQUETA_ACTION.availabilityUndo])
  })

  it('uses only ids the route dispatches', () => {
    const dispatch = routeDispatch()
    expect(controls.filter((control) => !dispatch.has(control.action_id)).map((control) => `${control.where}: ${control.action_id}`)).toEqual([])
  })

  it('carries a value its handler can read, naming the task or person it was drawn for', () => {
    const unreadable = controls.flatMap((control) => {
      const reader = VALUE_READER[control.action_id]
      if (!reader) return []
      const decoded = reader.decode(control.value || '') as Record<string, any> | null
      if (!decoded) return [`${control.where}: “${control.label}” (${control.action_id}) → unreadable ${control.value}`]
      return []
    })
    expect(unreadable).toEqual([])
  })

  it('points each task card’s buttons at that card’s own task, in the mode it was drawn in', () => {
    for (const [name, fixture, options] of CARD_CASES) {
      const cardControls = controlsIn(card(name), name)
      expect(cardControls.length, name).toBeGreaterThan(0)
      for (const control of cardControls) {
        expect(decodeActionValue(control.value)?.taskId, `${name}: ${control.label}`).toBe(fixture._id)
        expect(decodeTaskCardValue(control.value)?.mode, `${name}: ${control.label}`).toBe(options.mode)
      }
    }
    // The away cover's Take is the one that may move a task off its owner.
    const cover = controlsIn(card('away cover'), 'away cover').find((control) => control.action_id === MARQUETA_ACTION.taskTake)!
    expect(decodeTaskCardValue(cover.value)).toMatchObject({ cover: true, ownerName: 'Eric' })
  })

  it('points Prep and Log it… at a contact, and a log candidate at the person picked', () => {
    const contactControls = controls.filter((control) => VALUE_READER[control.action_id] === contactRef)
    expect(contactControls.length).toBeGreaterThan(4)
    for (const control of contactControls) {
      const ref = decodeContactRef(control.value)!
      expect(ref.contactId || ref.organization || ref.name, `${control.where}: ${control.label}`).toBeTruthy()
      // Log it… opens a form against a record; without a contact id it would be refused.
      if (control.action_id === MARQUETA_ACTION.logCall) expect(ref.contactId, `${control.where}: ${control.label}`).toBeTruthy()
    }
    const logCandidates = controls.filter((control) => control.where === 'which Jane? (log)')
    expect(logCandidates.map((control) => decodeContactRef(control.value)?.contactId)).toEqual(['contact-jane', 'contact-smith'])
    expect(decodeContactRef(logCandidates[0].value)).toMatchObject({ note: 'left a voicemail', outcome: 'voicemail' })
  })

  it('names the captured message on an idea or draft, and the month on a strategy answer', () => {
    for (const control of controls.filter((control) => control.action_id === MARKETING_ACTION.ideaKeep || control.action_id === MARKETING_ACTION.ideaDiscard)) {
      expect(decodeIdeaValue(control.value)?.channel, control.where).toBe('CE4AA4BHP')
    }
    for (const control of controls.filter((control) => control.action_id === MARQUETA_ACTION.strategyConfirm || control.action_id === MARQUETA_ACTION.strategyRethink)) {
      expect(decodeStrategyValue(control.value)?.monthKey, control.where).toBe('2026-09')
    }
    const undo = controls.find((control) => control.action_id === MARQUETA_ACTION.callLogUndo)!
    expect(decodeCallLogUndo(undo.value)).toMatchObject({ contactId: 'contact-jane', interactionKey: 'slack-C1-1' })
  })
})

// ── 4. Every Studio link lands somewhere the Studio reads ───────────────────

describe('every Studio link lands on something the Studio reads', () => {
  const HOST = read('src/sanity/tools/marketingTool.tsx')
  const BANNER = read('src/sanity/components/marketing/TaskFocusBanner.tsx')

  it('names only tabs the Studio has — and the Studio switches to each one', () => {
    for (const view of MARKETING_TOOL_VIEWS.map((entry) => entry.id)) {
      const url = new URL(studioViewUrl(BASE, view))
      expect(url.searchParams.get(MARKETING_VIEW_QUERY_PARAM), view).toBe(view)
      expect(resolveMarketingViewParam(view), view).toBe(view)
    }
    // Anything else lands on This week, never on whatever tab was open last.
    expect(new URL(studioViewUrl(BASE, 'ideas')).searchParams.get(MARKETING_VIEW_QUERY_PARAM)).toBe('thisWeek')
    // Every view Slack names a button after is a real tab.
    for (const view of Object.keys(VIEW_TITLE)) expect(resolveMarketingViewParam(view), view).toBe(view)
  })

  it('reads every landing param a link can carry, and strips each one after landing', () => {
    const url = studioViewUrl(BASE, 'outreach', { task: 'op-1', contact: 'contact-jane', contactAction: 'log', owner: 'Juhan', focus: 'followUps' })
    const params = new URL(url).searchParams
    for (const param of [MARKETING_TASK_QUERY_PARAM, MARKETING_CONTACT_QUERY_PARAM, MARKETING_CONTACT_ACTION_QUERY_PARAM, MARKETING_OWNER_QUERY_PARAM, MARKETING_FOCUS_QUERY_PARAM]) {
      expect(params.has(param), param).toBe(true)
    }
    // The host reads contact/action/owner/focus…
    expect(readMarketingLandingParams(new URL(url).search)).toEqual({ contact: { id: 'contact-jane', action: 'log' }, owner: 'Juhan', focus: 'followUps' })
    const stripped = new URL(marketingUrlWithoutLandingParams(url)).searchParams
    for (const param of [MARKETING_CONTACT_QUERY_PARAM, MARKETING_CONTACT_ACTION_QUERY_PARAM, MARKETING_OWNER_QUERY_PARAM, MARKETING_FOCUS_QUERY_PARAM]) {
      expect(stripped.has(param), param).toBe(false)
    }
    expect(stripped.get(MARKETING_VIEW_QUERY_PARAM)).toBe('outreach')
    // …and the task banner reads `task` and strips it itself.
    expect(BANNER).toContain('url.searchParams.get(MARKETING_TASK_QUERY_PARAM)')
    expect(BANNER).toContain('url.searchParams.delete(MARKETING_TASK_QUERY_PARAM)')
    expect(HOST).toContain('<TaskFocusBanner')
  })

  it('scrolls to a section This week actually has, for every focus a message can ask for', () => {
    for (const focus of ['caught', 'followUps', 'decisions'] as StudioFocus[]) {
      expect(WEEK_FOCUS_SECTION_ID[focus], focus).toBeTruthy()
      expect(readMarketingLandingParams(`?focus=${focus}`).focus, focus).toBe(focus)
    }
  })

  it('sends a decision to This week, where it can be answered, whatever its record says', () => {
    const url = studioTaskUrl({ baseUrl: BASE, taskId: 'op-decide', targetView: 'outreach', kind: 'decision', status: 'needsHuman', humanQuestion: 'Publish it?' })
    expect(new URL(url).searchParams.get(MARKETING_VIEW_QUERY_PARAM)).toBe('thisWeek')
    expect(new URL(url).searchParams.get(MARKETING_TASK_QUERY_PARAM)).toBe('op-decide')
  })
})
