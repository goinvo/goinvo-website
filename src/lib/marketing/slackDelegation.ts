/**
 * The Monday plan in Slack, and the buttons that make it useful.
 *
 * A digest nobody can act on is noise in a channel. The first version was also
 * written in the order it was built rather than the order people act on it:
 * the asks sat at the top with no buttons, the cards that HAD buttons arrived
 * as attachments a hundred phone lines further down, and an asked task showed
 * up twice with opposite buttons. So `buildWeeklyDigestBlocks` owns the whole
 * message, top to bottom, in the order a person acts — what needs an owner,
 * what needs a decision, who to call, the money question — and each task
 * appears exactly once, drawn as the same card every other message draws.
 *
 * The cards arrive already drawn (`DigestCard`). `buildTaskCard` lives in
 * weeklyCheckIn.ts, which reads `MARKETING_ACTION` from this module while it
 * loads; importing the card builder back here would let whichever of the two
 * happened to load first decide whether either works. The route draws the
 * cards; this decides where they go and what is said around them.
 *
 * Pure Block Kit construction and pure parsing of what comes back. No network,
 * no Slack SDK, so the message shape and the action routing are both testable
 * without a workspace.
 */

import type { CallSheetEntry } from './callSheet'
import { formatMinutes } from './effort'
import { encodeContactRef, MARQUETA_ACTION } from './marquetaActions'
import {
  actionsRow,
  askMarqueta,
  countLabel,
  formatEffort,
  formatSlackDay,
  LABEL,
  openViewButton,
  slackReadable,
  STATE_EMOJI,
  VIEW_TITLE,
  weekOfLabel,
  type MarquetaView,
} from './marquetaStyle'
import { MARKETING_OPERATION_STATUSES, marketingOperationHash } from './operations'
import { askMentionsText, type OwnerAsk } from './ownerAsk'
import { formatMonths } from './runway'
import { clipSlackText, escapeSlackText, SLACK_LIMITS, slackLink, slackMention } from './slackText'
import { isDecisionTask, resolveTaskView, studioViewUrl } from './taskLinks'

/** Namespaced like the chat and dispute actions already in the interactions route. */
export const MARKETING_ACTION = {
  claim: 'goinvo_marketing_claim_task',
  decline: 'goinvo_marketing_decline_task',
  away: 'goinvo_marketing_set_away',
  linkIdentity: 'goinvo_marketing_link_identity',
  details: 'goinvo_marketing_task_details',
  runwayConfirm: 'goinvo_marketing_runway_confirm',
  runwayUpdate: 'goinvo_marketing_runway_update',
  runwaySigned: 'goinvo_marketing_runway_signed',
  ideaKeep: 'goinvo_marketing_idea_keep',
  ideaDiscard: 'goinvo_marketing_idea_discard',
} as const

/** Modal submit + the input inside it. */
export const MARKETING_ANSWER_CALLBACK = 'goinvo_marketing_answer_task'
export const MARKETING_ANSWER_BLOCK = 'goinvo_marketing_answer_block'
export const MARKETING_ANSWER_INPUT = 'goinvo_marketing_answer_input'

/** The runway modal, and the fields inside it. */
export const MARKETING_RUNWAY_CALLBACK = 'goinvo_marketing_runway'
export const RUNWAY_MONTHS_BLOCK = 'goinvo_runway_months_block'
export const RUNWAY_MONTHS_INPUT = 'goinvo_runway_months_input'
export const RUNWAY_LABEL_BLOCK = 'goinvo_runway_label_block'
export const RUNWAY_LABEL_INPUT = 'goinvo_runway_label_input'
export const RUNWAY_BASIS_BLOCK = 'goinvo_runway_basis_block'
export const RUNWAY_BASIS_INPUT = 'goinvo_runway_basis_input'

/**
 * Every block of the money-and-direction group carries an id starting with
 * this, so a press can redraw exactly that group (`replaceBlocksByPrefix`)
 * and leave the rest of the Monday plan — or of an answer — as it was.
 */
export const MONEY_BLOCK_PREFIX = 'mq_money'
export const RUNWAY_QUESTION_BLOCK = `${MONEY_BLOCK_PREFIX}_runway`
export const RUNWAY_ACTIONS_BLOCK = `${MONEY_BLOCK_PREFIX}_runway_actions`

export type MarketingActionId = (typeof MARKETING_ACTION)[keyof typeof MARKETING_ACTION]

export function isMarketingAction(actionId: string | undefined): actionId is MarketingActionId {
  return Object.values(MARKETING_ACTION).includes(actionId as MarketingActionId)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/**
 * Action payloads travel in Slack's `value` string, so they are encoded rather
 * than assumed. Slack caps `value` at 2000 characters and will silently drop a
 * message that exceeds it, so this stays deliberately small: an id and a name.
 */
export function encodeActionValue(input: {
  taskId: string
  ownerName?: string
  /** Prior state, carried so undo can restore it after the record has changed. */
  status?: string
}): string {
  return JSON.stringify({
    t: input.taskId,
    o: input.ownerName || '',
    ...(input.status ? { s: input.status } : {}),
  }).slice(0, 1900)
}

export function decodeActionValue(
  value: string | undefined,
): { taskId: string; ownerName: string; status: string } | null {
  try {
    const parsed = JSON.parse(String(value || ''))
    const taskId = String(parsed?.t || '')
    if (!taskId) return null
    return {
      taskId,
      ownerName: String(parsed?.o || ''),
      status: String(parsed?.s || ''),
    }
  } catch {
    return null
  }
}

// ── Who has been asked, and who has passed ──────────────────────────────────

/**
 * A task's `askHistory`: one entry per person the digest ASKED to take it, and
 * one per person who PASSED on it ("Not me" — `passOnTask`; a `Hand back` is
 * not a pass and records nothing here).
 * Both mean the same thing to the next ask — that person has answered — so the
 * next digest never puts the question to them again, and a task two people
 * have answered is offered as "still worth doing?" instead of to a third.
 *
 * Every entry is keyed by Slack id, never by name. A name is whatever Slack's
 * display name is this month ("Shirley Wu"), and the roster says "Shirley";
 * excluding the passer by a name parsed out of a sentence missed exactly the
 * person it was for, and asked her about the task she had just declined.
 *
 * `week` (the UTC ISO week the ask was POSTED in) is what makes a second digest
 * in the same week harmless. The entry the first run wrote is not a second
 * person's answer — it is this week's ask, and a re-run shows the same ask to
 * the same person and writes nothing. Without it, a doubled Monday asked
 * somebody else about the same task and the task came back the next week as
 * "nobody has taken this after two asks" after one real ask.
 */
export const ASK_HISTORY_KIND = { asked: 'asked', passed: 'passed' } as const
export type AskHistoryKind = (typeof ASK_HISTORY_KIND)[keyof typeof ASK_HISTORY_KIND]

/** As stored. Entries written before `week`/`kind` existed are asks from an earlier week. */
export type AskHistoryEntry = {
  _key?: string | null
  slackUserId?: string | null
  at?: string | null
  week?: string | null
  kind?: string | null
}

const ASKABLE_SLACK_ID = /^[UW][A-Z0-9]+$/
const askId = (value: unknown) => {
  const id = String(value ?? '').trim()
  return ASKABLE_SLACK_ID.test(id) ? id : ''
}

/**
 * One `askHistory` entry. The key is the task and the person (and whether they
 * were asked or passed), so writing the same fact twice is visibly the same
 * entry — and a writer that finds the key already there writes nothing.
 */
export function askHistoryEntry(input: {
  taskId: string
  slackUserId: string
  at: string
  week: string
  kind: AskHistoryKind
}): { _key: string; slackUserId: string; at: string; week: string; kind: AskHistoryKind } {
  const prefix = input.kind === ASK_HISTORY_KIND.passed ? 'pass' : 'ask'
  return {
    _key: `${prefix}-${marketingOperationHash(`${input.taskId}:${input.slackUserId}`)}`,
    slackUserId: input.slackUserId,
    at: input.at,
    week: input.week,
    kind: input.kind,
  }
}

/**
 * What a task's history means for this week's digest.
 *
 *   - `answeredIds`: every distinct person asked or passed, in any week. Never
 *     asked again; two of them make the task "still worth doing?".
 *   - `askedThisWeek`: the person THIS week's digest already asked, when they
 *     have not since passed. A re-run shows them the same ask and records
 *     nothing, and the ask is not counted as a second person — it is the same
 *     question, posted twice.
 */
export function readAskHistory(
  entries: AskHistoryEntry[] | null | undefined,
  week: string,
): { answeredIds: string[]; askedThisWeek?: string } {
  const list = (entries || []).filter(Boolean)
  const passed = new Set(
    list.filter((entry) => entry.kind === ASK_HISTORY_KIND.passed).map((entry) => askId(entry.slackUserId)).filter(Boolean),
  )
  const answeredIds = Array.from(new Set(list.map((entry) => askId(entry.slackUserId)).filter(Boolean)))
  const thisWeek = String(week || '').trim()
  const askedThisWeek = thisWeek
    ? list
        .filter((entry) => entry.kind !== ASK_HISTORY_KIND.passed && String(entry.week || '').trim() === thisWeek)
        .map((entry) => askId(entry.slackUserId))
        .filter((id) => id && !passed.has(id))
        .pop()
    : undefined
  return { answeredIds, ...(askedThisWeek ? { askedThisWeek } : {}) }
}

// ── Small shared pieces ─────────────────────────────────────────────────────

const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

const button = (actionId: string, label: string, value?: string, primary = false): Block => ({
  type: 'button',
  action_id: actionId,
  text: { type: 'plain_text', text: label, emoji: true },
  ...(value !== undefined ? { value } : {}),
  ...(primary ? { style: 'primary' } : {}),
})

const section = (text: string, extra: Block = {}): Block => ({
  type: 'section',
  ...extra,
  text: { type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) },
})

const context = (text: string, extra: Block = {}): Block => ({
  type: 'context',
  ...extra,
  elements: [{ type: 'mrkdwn', text: clipSlackText(text, SLACK_LIMITS.sectionText) }],
})

/** Record text for a line of mrkdwn: escaped, on one line, clipped. */
const recordText = (value: unknown, max: number) => clipSlackText(escapeSlackText(clean(value)), max)

/**
 * "This week", linked to the tab when there is a Studio to link to. The words
 * are the tab's own name either way, so a reader without the link still knows
 * where to look.
 */
function thisWeekLink(studioBaseUrl: string | undefined, focus?: 'caught' | 'decisions' | 'followUps', label: string = VIEW_TITLE.thisWeek) {
  const url = studioViewUrl(studioBaseUrl, 'thisWeek', focus ? { focus } : {})
  return url ? slackLink(url, label) : escapeSlackText(label)
}

// ── The Monday plan ─────────────────────────────────────────────────────────

/**
 * A follow-up owed to somebody who already answered, rendered by the caller
 * (`followUpLine` in followUps.ts owns the wording and the escaping, so the
 * digest and the check-in can never describe the same contact two ways).
 * `contactRef` is an encoded `ContactRef` for the Prep and Log buttons.
 */
export type DigestFollowUp = { label: string; detail: string; contactRef: string }

/** The digest shows this many follow-ups; the rest are one `my calls` away. */
export const MAX_DIGEST_FOLLOW_UPS = 3

/** One task, already drawn by `buildTaskCard` in plan mode: its section and its actions. */
export type DigestCard = { taskId: string; blocks: Block[] }

/**
 * At most this many cards under "Needs an owner". A Monday plan is read on a
 * phone before the first coffee; five asks is already a lot of asking.
 */
export const MAX_OWNER_CARDS = 5
/** "At most two other unowned" — the rest are counted, and This week has them all. */
const MAX_OPEN_CARDS = 2
const MAX_DECISION_CARDS = 2
const MAX_CALL_SHEET = 3
const MAX_STUCK_NAMED = 2
const MAX_UNDRAFTED_NAMED = 3
const MAX_IDEAS_NAMED = 3

export type DigestInput = {
  now: Date
  /** Monday of the week, `YYYY-MM-DD`. */
  weekStart: string
  budgetMinutes: number
  /** The recorded plan's numbers. Absent when the digest is showing the open board instead. */
  plan?: { plannedMinutes: number; theme?: string | null } | null
  /** Without a plan: minutes of open work, for "10h of open work for an 8h week". */
  openMinutes?: number
  /** False when the tick says this week's plan did not save. */
  planRecorded?: boolean
  /** Registry warnings, plain text (domainWatch.ts). */
  renewals?: string[]
  /** "Last week: 2 tasks done · Outreach: …", plain text. */
  lastWeek?: string
  needsOwner?: {
    /** Asked by name (ownerAsk.ts). Never trimmed: the one part addressed to a person. */
    asked?: DigestCard[]
    /** Work belonging to someone away this week. */
    away?: DigestCard[]
    /** Asked twice, nobody took it. */
    exhausted?: DigestCard[]
    /** Everything else nobody owns. */
    open?: DigestCard[]
    /** Needs an owner but not handed in as a card at all — counted into "+N more". */
    more?: number
  }
  decisions?: DigestCard[]
  /** Every decision waiting, when more are waiting than are handed in. */
  decisionsTotal?: number
  /** Who already has work this week, and how much. Names as the board holds them. */
  taken?: Array<{ name: string; slackUserId?: string; count: number }>
  /** Work that is stuck, owned or not: shown so the room can see what is in the way. */
  stuck?: Array<{ title: string; ownerName?: string; slackUserId?: string; blocker?: string; url?: string }>
  followUps?: DigestFollowUp[]
  /** Every follow-up due, shown or not. */
  followUpsTotal?: number
  callSheet?: CallSheetEntry[]
  undraftedPosts?: Array<{ title?: string | null }>
  /** The money-and-direction group (strategyCheck.ts), ids already on it. */
  money?: Block[]
  /** Ideas caught in Slack nobody has judged — titles for the first few. */
  ideas?: Array<{ title: string }>
  /** How many are waiting in all, when more than `ideas` holds. */
  ideasTotal?: number
  unmappedOwners?: string[]
  studioBaseUrl?: string
}

/** The groups that give way, in this order, when the message would pass Slack's fifty blocks. */
const TRIM_ORDER = ['followUps', 'callSheet', 'exhausted', 'away', 'decisions'] as const
type TrimGroup = (typeof TRIM_ORDER)[number]

const cardsOf = (list: DigestCard[] | undefined) =>
  (list || []).filter((card) => card && clean(card.taskId) && Array.isArray(card.blocks) && card.blocks.length > 0)

/**
 * The week line: "Week of Mon 21 Sep · 7h 30m planned of 8h · _theme_", or,
 * with no plan to report, the open work against the budget — and, when that
 * does not fit, it says so rather than calling it a plan.
 */
function weekLine(input: DigestInput): string {
  const week = weekOfLabel(input.weekStart, input.now)
  const budget = formatMinutes(input.budgetMinutes)
  if (input.plan) {
    const theme = clean(input.plan.theme).replace(/[_*~`]/g, ' ').replace(/\s+/g, ' ').trim()
    const planned = `${formatMinutes(input.plan.plannedMinutes)} planned of ${budget}`
    return [week, planned, theme ? `_${recordText(theme, 120)}_` : ''].filter(Boolean).join(' · ')
  }
  const open = Math.max(0, Number(input.openMinutes) || 0)
  const over = open > input.budgetMinutes ? ' — more than fits' : ''
  // Said aloud, "8h" and "11h" start with a vowel: "an 8h week".
  const article = /^(8|11h|18h)/.test(budget) ? 'an' : 'a'
  return `${week} · ${formatMinutes(open)} of open work for ${article} ${budget} week${over}`
}

/**
 * The Monday plan, in the order people act on it:
 *
 *   Monday plan
 *   Week of Mon 21 Sep · 7h 30m planned of 8h · _theme_
 *   ⚠️ the plan did not save / a domain is about to lapse
 *   Last week: …
 *   ── *Needs an owner*        asked, away cover, asked twice, two others; +N more
 *      *Decisions waiting*     two at most
 *      Already taken: …        a roll call, not cards: owned work is Thursday's
 *      ⚠️ Stuck: …
 *   ── *Outreach this week*    follow-ups · who to reach out to · posts with no draft
 *   ── money and direction     one question at a time, when one is due
 *   ── ideas · the identity prompt · Ask me: …
 *      [Open This week] [I’m away this week]      ← always the last block
 *
 * Owned work is a roll call, not cards. The first green button used to be a
 * hundred lines down, below a card per task somebody already had; the tasks
 * that need a person to say "mine" come first, and owners get their own list
 * on Thursday and in `my tasks`.
 *
 * Over fifty blocks Slack refuses the WHOLE message, so groups give way whole,
 * from the least urgent (follow-up rows, one `my calls` away) to the most
 * (decisions), each leaving a line that counts what went. Never a raw slice:
 * that cut the footer — the one row every message ends on — first. The asks
 * never give way: they are the part of the message addressed to a person.
 */
export function buildWeeklyDigestBlocks(input: DigestInput): Block[] {
  const trimmed = new Set<TrimGroup>()
  let blocks = composeDigest(input, trimmed)
  for (const group of TRIM_ORDER) {
    if (blocks.length <= SLACK_LIMITS.blocksPerMessage) break
    trimmed.add(group)
    blocks = composeDigest(input, trimmed)
  }
  return blocks
}

function composeDigest(input: DigestInput, trimmed: Set<TrimGroup>): Block[] {
  const base = input.studioBaseUrl
  const blocks: Block[] = [
    { type: 'header', text: { type: 'plain_text', text: 'Monday plan', emoji: true } },
    context(weekLine(input)),
  ]

  // Said out loud rather than hidden: if the scheduled plan did not persist,
  // everything below is the raw board, not the week that was planned.
  if (input.planRecorded === false) {
    blocks.push(
      context(
        `${STATE_EMOJI.risk} This week’s plan didn’t save, so this is the open board, not the planned week — ` +
          `re-plan on ${thisWeekLink(base)}.`,
      ),
    )
  }

  // Renewals, only when one is close — and every one of them. The cheapest
  // item in the message, and the only one whose failure takes everything else
  // down with it.
  const renewals = (input.renewals || []).map(clean).filter(Boolean)
  if (renewals.length) {
    blocks.push(
      context(
        renewals
          .map((note) => `${STATE_EMOJI.risk} ${clipSlackText(escapeSlackText(slackReadable(note, input.now)), 600)}`)
          .join('\n'),
      ),
    )
  }

  const lastWeek = clean(input.lastWeek)
  if (lastWeek) blocks.push(context(recordText(lastWeek, 600)))

  blocks.push(...workBlocks(input, trimmed))
  blocks.push(...outreachBlocks(input, trimmed))

  const money = (input.money || []).filter(Boolean)
  if (money.length) blocks.push({ type: 'divider' }, ...money)

  const closing: Block[] = []
  const ideas = ideaReviewLine(input.ideas || [], input.ideasTotal, base)
  if (ideas) closing.push(context(ideas))
  closing.push(...buildIdentityPromptBlocks(input.unmappedOwners || []))
  closing.push(
    context(
      `Ask me: ${askMarqueta('my calls')} · ${askMarqueta('my tasks')} · ${escapeSlackText(askMarqueta('prep <name>'))}`,
    ),
  )
  blocks.push({ type: 'divider' }, ...closing)

  // Always the last block: the two things anyone can do with the whole plan.
  blocks.push(
    ...actionsRow(
      [
        openViewButton('thisWeek', studioViewUrl(base, 'thisWeek')),
        button(MARKETING_ACTION.away, LABEL.AWAY, encodeActionValue({ taskId: 'week' })),
      ],
      'mq_footer',
    ),
  )
  return blocks
}

/**
 * "Needs an owner", "Decisions waiting", the roll call and anything stuck.
 *
 * Needs an owner draws, in order: the people asked by name, cover for anyone
 * away, the tasks asked about twice with nobody taking them, and then at most
 * two more — five cards in all, the rest counted into one "+N more on This
 * week". Every task id appears once: a task is a card in one group or it is
 * counted, never both.
 */
function workBlocks(input: DigestInput, trimmed: Set<TrimGroup>): Block[] {
  const base = input.studioBaseUrl
  const seen = new Set<string>()
  const unseen = (list: DigestCard[]) =>
    list.filter((card) => {
      if (seen.has(card.taskId)) return false
      seen.add(card.taskId)
      return true
    })

  const owner = input.needsOwner || {}
  const asked = unseen(cardsOf(owner.asked))
  const away = unseen(cardsOf(owner.away))
  const exhausted = unseen(cardsOf(owner.exhausted))
  const open = unseen(cardsOf(owner.open))
  const decisions = unseen(cardsOf(input.decisions))

  const shown: DigestCard[] = [...asked]
  let counted = Math.max(0, Math.floor(Number(owner.more) || 0))
  const take = (list: DigestCard[], limit: number, group?: TrimGroup) => {
    if (group && trimmed.has(group)) {
      counted += list.length
      return
    }
    const room = Math.max(0, Math.min(limit, MAX_OWNER_CARDS - shown.length))
    shown.push(...list.slice(0, room))
    counted += Math.max(0, list.length - room)
  }
  take(away, MAX_OWNER_CARDS, 'away')
  take(exhausted, MAX_OWNER_CARDS, 'exhausted')
  // Once a group has given way for length, the rest do not take its place —
  // that would only swap which cards make the message too long.
  take(open, trimmed.has('exhausted') || trimmed.has('away') ? 0 : MAX_OPEN_CARDS)

  const blocks: Block[] = []
  if (shown.length || counted) {
    blocks.push(section('*Needs an owner*'))
    for (const card of shown) blocks.push(...card.blocks)
    if (counted) {
      blocks.push(context(`+${counted} more on ${thisWeekLink(base)}`))
    }
  }

  const waiting = Math.max(decisions.length, Math.floor(Number(input.decisionsTotal) || 0))
  if (waiting) {
    if (trimmed.has('decisions')) {
      blocks.push(section(`*Decisions waiting:* ${waiting} — answer them on ${thisWeekLink(base, 'decisions')}`))
    } else {
      const drawn = decisions.slice(0, MAX_DECISION_CARDS)
      blocks.push(section('*Decisions waiting*'))
      for (const card of drawn) blocks.push(...card.blocks)
      if (waiting > drawn.length) blocks.push(context(`+${waiting - drawn.length} more on ${thisWeekLink(base, 'decisions')}`))
    }
  }

  const taken = rollCall(input.taken || [])
  if (taken) blocks.push(context(taken))
  const stuck = stuckLine(input.stuck || [])
  if (stuck) blocks.push(context(stuck))

  return blocks.length ? [{ type: 'divider' }, ...blocks] : []
}

/**
 * "Already taken: <@U1> 2 · <@U2> 1 — ask `Marqueta, my tasks` for yours".
 * Alphabetical, like the check-in: ordered by count it would be a leaderboard.
 */
function rollCall(taken: NonNullable<DigestInput['taken']>): string {
  const people = new Map<string, { label: string; name: string; count: number }>()
  for (const entry of taken) {
    const name = clean(entry?.name)
    const count = Math.max(0, Math.floor(Number(entry?.count) || 0))
    if (!name || !count) continue
    const key = askId(entry.slackUserId) || `name:${name.toLowerCase()}`
    const existing = people.get(key)
    if (existing) existing.count += count
    else people.set(key, { label: slackMention(askId(entry.slackUserId) || undefined, name), name, count })
  }
  const list = [...people.values()].sort((a, b) => a.name.localeCompare(b.name))
  if (!list.length) return ''
  return `Already taken: ${list.map((person) => `${person.label} ${person.count}`).join(' · ')} — ask ${askMarqueta('my tasks')} for yours`
}

/**
 * "⚠️ Stuck: *Title* (<@U2>) — in the way: the numbers". Stuck work used to
 * vanish from the Monday plan entirely (the read skipped `blocked`), which is
 * the one week it most needs somebody to see it.
 */
function stuckLine(stuck: NonNullable<DigestInput['stuck']>): string {
  const list = stuck.filter((task) => task && clean(task.title))
  if (!list.length) return ''
  const named = list.slice(0, MAX_STUCK_NAMED).map((task) => {
    const title = clean(task.title)
    const shownTitle = task.url ? slackLink(task.url, title.length > 120 ? `${title.slice(0, 119)}…` : title) : recordText(title, 120)
    const who = clean(task.ownerName) ? slackMention(askId(task.slackUserId) || undefined, clean(task.ownerName)) : 'nobody has it'
    const blocker = clean(task.blocker) ? ` — in the way: ${recordText(task.blocker, 200)}` : ''
    return `${shownTitle} (${who})${blocker}`
  })
  const more = list.length - named.length
  return `${STATE_EMOJI.risk} Stuck: ${named.join(' · ')}${more > 0 ? ` · +${more} more` : ''}`
}

/**
 * "Outreach this week": follow-ups owed to people who answered, who to reach
 * out to and why now, and any post going out with nothing written.
 */
function outreachBlocks(input: DigestInput, trimmed: Set<TrimGroup>): Block[] {
  const base = input.studioBaseUrl
  const blocks: Block[] = []

  const followUps = (input.followUps || [])
    .filter((followUp) => followUp && (clean(followUp.label) || clean(followUp.detail)))
    .slice(0, MAX_DIGEST_FOLLOW_UPS)
  const shownFollowUps = trimmed.has('followUps') ? [] : followUps
  for (const followUp of shownFollowUps) blocks.push(...digestFollowUpBlocks(followUp))
  const followUpsTotal = Math.max(followUps.length, Math.floor(Number(input.followUpsTotal) || 0))
  const restFollowUps = followUpsTotal - shownFollowUps.length
  if (restFollowUps > 0) {
    const count = countLabel(restFollowUps, shownFollowUps.length ? 'more follow-up' : 'follow-up', shownFollowUps.length ? 'more follow-ups' : 'follow-ups')
    blocks.push(context(`${shownFollowUps.length ? '+' : ''}${count} due — ask ${askMarqueta('my calls')}`))
  }

  const sheet = (input.callSheet || []).filter((entry) => entry && clean(entry.organization)).slice(0, MAX_CALL_SHEET)
  if (sheet.length && trimmed.has('callSheet')) {
    blocks.push(context(`${countLabel(sheet.length, 'organisation')} worth a call this week — on ${thisWeekLink(base)}`))
  } else if (sheet.length) {
    blocks.push(section('*Who to reach out to, and why now*'))
    for (const entry of sheet) blocks.push(callSheetEntryBlock(entry))
  }

  const posts = (input.undraftedPosts || []).filter(Boolean)
  if (posts.length) {
    const titles = posts.slice(0, MAX_UNDRAFTED_NAMED).map((post) => recordText(clean(post.title) || 'Untitled post', 80))
    const more = posts.length - titles.length
    const verb = posts.length === 1 ? 'goes' : 'go'
    blocks.push(
      context(
        `${STATE_EMOJI.risk} ${countLabel(posts.length, 'post')} ${verb} out this week with no draft yet: ${titles.join(' · ')}${more > 0 ? ` …and ${more} more` : ''}`,
      ),
    )
  }

  return blocks.length ? [{ type: 'divider' }, section('*Outreach this week*'), ...blocks] : []
}

/**
 * One call-sheet organisation, with Prep as an accessory rather than a row of
 * its own: the sheet is three lines, and a row of buttons under each would
 * double its height.
 */
function callSheetEntryBlock(entry: CallSheetEntry): Block {
  const people = (entry.contacts || []).length
  // slackLink, not a hand-built <url|…>: a research URL is record text, and a
  // `|` or `>` in it would end the link early and spill the rest as markup.
  const source = entry.sourceUrl ? ` ${slackLink(entry.sourceUrl, 'source')}` : ''
  const prep = callSheetPrepButton(entry)
  return section(
    `*${recordText(entry.organization, 150)}*${people ? ` · ${countLabel(people, 'person', 'people')}` : ''}\n` +
      `${clipSlackText(escapeSlackText(entry.signal || ''), 1200)}${source}`,
    prep ? { accessory: prep } : {},
  )
}

/**
 * Prep for one call-sheet organisation.
 *
 * The sheet says who to call and why now; what actually gets a nervous person
 * to pick up the phone is the outline, so it is one press away from the line
 * that suggested the call. The ref names the first contact the sheet listed
 * and the organisation, so the outline is about a person when there is one. No
 * button when there is nothing to prep, rather than one that opens an empty
 * outline.
 */
function callSheetPrepButton(entry: CallSheetEntry): Block | null {
  const contactId = String(entry.contacts.find((contact) => contact?._id)?._id || '').trim()
  const organization = String(entry.organization || '').trim()
  if (!contactId && !organization) return null
  const value = encodeContactRef({ contactId, organization })
  if (value.length > SLACK_LIMITS.buttonValue) return null
  return button(MARQUETA_ACTION.prepCall, LABEL.PREP, value)
}

/**
 * One follow-up line and its two buttons — Prep and Log it…, never Done: a
 * follow-up is finished by logging what happened, which is what moves the
 * contact's date on. A ref Slack would refuse means no buttons, not a message
 * Slack rejects whole.
 */
function digestFollowUpBlocks(followUp: DigestFollowUp): Block[] {
  const body = [clean(followUp.label), clean(followUp.detail)].filter(Boolean).join('\n')
  if (!body) return []
  const blocks: Block[] = [section(body)]
  const ref = String(followUp.contactRef || '')
  if (ref && ref.length <= SLACK_LIMITS.buttonValue) {
    blocks.push({
      type: 'actions',
      elements: [button(MARQUETA_ACTION.prepCall, LABEL.PREP, ref), button(MARQUETA_ACTION.logCall, LABEL.LOG, ref)],
    })
  }
  return blocks
}

/**
 * The top-level `text` — what a phone's lock screen shows, cut at about ninety
 * characters. Mentions and the ask first, because a mention that only lives in
 * the blocks reaches somebody's screen without ever reaching their phone; then
 * the message's name and its numbers.
 *
 *   <@U3> <@U2> — could you take a task each? · Monday plan: 3 tasks need an owner, 3 follow-ups due
 */
export function digestNotificationText(input: {
  asks: OwnerAsk[]
  needsOwner: number
  followUps: number
  weekStart: string
  now: Date
}): string {
  const owners = Math.max(0, Math.floor(Number(input.needsOwner) || 0))
  const followUps = Math.max(0, Math.floor(Number(input.followUps) || 0))
  const parts = [
    owners ? `${countLabel(owners, 'task')} ${owners === 1 ? 'needs' : 'need'} an owner` : '',
    followUps ? `${countLabel(followUps, 'follow-up')} due` : '',
  ].filter(Boolean)
  const summary = parts.length ? parts.join(', ') : weekOfLabel(input.weekStart, input.now).replace(/^Week of/, 'week of')
  const mentions = askMentionsText(input.asks || [])
  return clipSlackText(`${mentions ? `${mentions} · ` : ''}Monday plan: ${summary}`, SLACK_LIMITS.fallbackText)
}

/**
 * Ask people to say which name is theirs, once.
 *
 * Operations are owned by a name ("Juhan"); Slack knows a user id. Nothing can
 * @-mention the right person until those are linked, and guessing from display
 * names is how a bot pings the wrong colleague.
 *
 * So it asks, and the asking IS the consent: the prompt states exactly what gets
 * stored and why before anybody presses anything. One section with the choice
 * beside it, and only while owners are still unmapped, so it disappears on its
 * own rather than nagging.
 */
export function buildIdentityPromptBlocks(unmappedOwners: string[]): Block[] {
  const owners = Array.from(new Set((unmappedOwners || []).map(clean).filter(Boolean))).slice(0, 20)
  if (owners.length === 0) return []
  return [
    section(
      '*One-time setup:* which name on the list is yours? I’ll store your Slack ID against it so I can ' +
        '@-mention you on your own tasks — nothing else.',
      {
        accessory: {
          type: 'static_select',
          action_id: MARKETING_ACTION.linkIdentity,
          placeholder: { type: 'plain_text', text: 'Which one is you?' },
          options: owners.map((owner) => ({
            text: { type: 'plain_text', text: owner.slice(0, SLACK_LIMITS.optionText) },
            value: owner.slice(0, 150),
          })),
        },
      },
    ),
  ]
}

// ── Money: the runway question ──────────────────────────────────────────────

/** "11 Jan 2027": the studio's calendar, the year only when it is not this one. No weekday on a far-off date. */
export function runwayDay(date: string | null | undefined, now: Date): string {
  return formatSlackDay(String(date || ''), now).replace(/^[A-Z][a-z]{2} /, '')
}

/**
 * The runway as its two facts — "4.5 months" and "11 Jan 2027" — or null when
 * there is no future date to state. Months are rough on purpose (runway.ts).
 */
export function runwayParts(input: { months?: number | null; certainUntil?: string | null }, now: Date): { months: string; day: string } | null {
  const months = typeof input.months === 'number' && Number.isFinite(input.months) ? input.months : null
  const day = runwayDay(input.certainUntil, now)
  if (months === null || months <= 0 || !day) return null
  return { months: formatMonths(months), day }
}

/** "4.5 months (to 11 Jan 2027)", for receipts and answers. '' with no future date. */
export function runwayFacts(input: { months?: number | null; certainUntil?: string | null }, now: Date): string {
  const parts = runwayParts(input, now)
  return parts ? `${parts.months} (to ${parts.day})` : ''
}

/**
 * The runway question, and the three answers a principal actually has.
 *
 * Money is the input the whole strategy hangs off, so Marqueta asks, in the
 * channel, at the moment the number is about to stop being true — and states
 * the number rather than the bin: "Rebuild" invites the reader to assume
 * somebody decided it; "4.5 months, to 11 Jan 2027" can be argued with, and
 * being argued with is the point.
 *
 * The check-in's reason says WHY it is asking (stale, close to the line, a
 * deal was won since); the question is always the same one — is that number
 * still true? — because all three answers answer it.
 *
 * None of the three buttons is green. "Still right" is the cheap answer, and
 * making it the brightest button invites a reflex press on the one number the
 * whole strategy depends on.
 *
 * Nothing due and nothing to reconcile: nothing said. A permanent banner about
 * money in a team channel is a banner people learn to scroll past.
 */
export function buildRunwayBlocks(input: {
  summary: string
  checkIn: { due: boolean; urgent?: boolean; reason: string; question: string }
  disagreement?: string | null
  /** Months left and the date they reach. Without them the question is the check-in's own. */
  months?: number | null
  certainUntil?: string | null
  now?: Date
  /** "*Money and direction*" above the question: the digest's group heading. */
  heading?: boolean
}): Block[] {
  const disagreement = clean(input.disagreement)
  if (!input.checkIn?.due && !disagreement) return []
  const now = input.now || new Date()

  // Escaped: the check-in's reason can carry a won contact's name ("AT&T was
  // marked won…"), and record text reaching mrkdwn raw is how a stray `<`
  // breaks the card or a stored `<!here>` pings the channel.
  const parts = runwayParts(input, now)
  const question = parts
    ? `Still ${parts.months} of certain runway (to ${parts.day}), or has that moved?`
    : clean(input.checkIn?.due ? input.checkIn.question : input.summary)
  const reason = input.checkIn?.due ? clean(input.checkIn.reason).replace(/^The runway was last confirmed/, 'Last confirmed') : ''

  const lines = [
    input.heading ? '*Money and direction*' : '',
    clipSlackText(escapeSlackText(question), 600),
    reason ? `_${clipSlackText(escapeSlackText(reason), 600)}_` : '',
    disagreement ? `_${clipSlackText(escapeSlackText(disagreement), 600)}_` : '',
  ].filter(Boolean)

  return [
    section(lines.join('\n'), { block_id: RUNWAY_QUESTION_BLOCK }),
    {
      type: 'actions',
      block_id: RUNWAY_ACTIONS_BLOCK,
      elements: [
        button(MARKETING_ACTION.runwayConfirm, LABEL.RUNWAY_OK),
        button(MARKETING_ACTION.runwaySigned, LABEL.RUNWAY_SIGNED),
        button(MARKETING_ACTION.runwayUpdate, LABEL.RUNWAY_CHANGED),
      ],
    },
  ]
}

/**
 * The modal behind "We signed something…" and "It changed…".
 *
 * Two shapes, one callback. Signing asks what and how much runway it buys,
 * because a commitment with no months cannot move the date and guessing one
 * would inflate the runway on nothing.
 */
export function buildRunwayView(kind: 'signed' | 'update', current?: string): Record<string, unknown> {
  const signed = kind === 'signed'
  const blocks: Block[] = []

  if (current) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: current } })
    blocks.push({ type: 'divider' })
  }

  if (signed) {
    blocks.push({
      type: 'input',
      block_id: RUNWAY_LABEL_BLOCK,
      label: { type: 'plain_text', text: 'What was signed' },
      element: {
        type: 'plain_text_input',
        action_id: RUNWAY_LABEL_INPUT,
        placeholder: { type: 'plain_text', text: 'SoW — Acme, discovery phase' },
      },
    })
  }

  blocks.push({
    type: 'input',
    block_id: RUNWAY_MONTHS_BLOCK,
    label: { type: 'plain_text', text: signed ? 'Months of runway it buys' : 'Months of runway left' },
    hint: {
      type: 'plain_text',
      text: signed
        ? 'Added to the runway we already had, not counted from today.'
        : 'Assuming nothing new closes. Half months are fine.',
    },
    element: {
      type: 'plain_text_input',
      action_id: RUNWAY_MONTHS_INPUT,
      placeholder: { type: 'plain_text', text: signed ? '3' : '4.5' },
    },
  })

  if (!signed) {
    blocks.push({
      type: 'input',
      block_id: RUNWAY_BASIS_BLOCK,
      optional: true,
      label: { type: 'plain_text', text: 'What that assumes' },
      element: {
        type: 'plain_text_input',
        action_id: RUNWAY_BASIS_INPUT,
        multiline: true,
        placeholder: { type: 'plain_text', text: 'Signed work in hand, nothing new closing.' },
      },
    })
  }

  return {
    type: 'modal',
    callback_id: MARKETING_RUNWAY_CALLBACK,
    // How the submit handler knows which shape came back. Slack titles are
    // capped at 24 characters, so both stay short.
    private_metadata: kind,
    title: { type: 'plain_text', text: signed ? 'Signed work' : 'Update runway' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks,
  }
}

/** Pull the runway modal's fields out of a view_submission payload. */
export function readRunwaySubmission(values: Record<string, Record<string, { value?: string | null }>> | undefined): {
  months: number | null
  label: string
  basis: string
} {
  const at = (block: string, input: string) => String(values?.[block]?.[input]?.value || '').trim()
  const raw = at(RUNWAY_MONTHS_BLOCK, RUNWAY_MONTHS_INPUT)
  // "4.5 months", "about 4.5", "4,5" - people type units. Take the number and
  // reject anything that is not one rather than storing NaN as a date.
  //
  // The minus is checked BEFORE stripping, because stripping it turns "-2" into
  // "2": someone saying they are two months PAST the end would have extended
  // the runway by two months instead.
  const negative = /-\s*[0-9]/.test(raw)
  const parsed = negative ? NaN : Number(raw.replace(',', '.').replace(/[^0-9.]/g, ''))
  return {
    months: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    label: at(RUNWAY_LABEL_BLOCK, RUNWAY_LABEL_INPUT),
    basis: at(RUNWAY_BASIS_BLOCK, RUNWAY_BASIS_INPUT),
  }
}

// ── Ideas and drafts caught in the channel ──────────────────────────────────

/**
 * What Marqueta says when she notices somebody proposing work.
 *
 * Posted IN THREAD, deliberately. A reply in the channel for every idea would
 * double the traffic in a channel people already have to skim, and the fastest
 * way to get a bot muted is to make it talkative. In a thread it is there when
 * you want it and invisible when you do not.
 *
 * It states what it did and offers the two honest answers. "Keep it" is not
 * green: the capture was a guess, and making the confirm button the brightest
 * thing in the message nudges people into blessing guesses.
 */
export function buildIdeaCaptureBlocks(input: {
  title: string
  category?: string
  channel: string
  ts: string
  studioUrl?: string
}): Block[] {
  const value = JSON.stringify({ c: input.channel, ts: input.ts }).slice(0, 1900)
  const category = clean(input.category)
  return [
    section(
      'Filed as an idea so it doesn’t scroll away:\n' +
        `*${recordText(input.title || 'Untitled idea', 300)}*${category ? ` · ${recordText(category, 80)}` : ''}\n` +
        '_My guess — nothing happens until someone keeps it._',
    ),
    ...actionsRow([
      button(MARKETING_ACTION.ideaKeep, LABEL.IDEA_KEEP, value),
      button(MARKETING_ACTION.ideaDiscard, LABEL.IDEA_DISCARD, value),
      openViewButton('thisWeek', input.studioUrl || ''),
    ]),
  ]
}

/**
 * "*4 ideas I caught still need a yes or no:* A · B · C …and 1 more — Review
 * them on This week". The count is every idea waiting, and "…and N more"
 * counts only the ones not named — the old line said "4 things … and 1 more"
 * about four ideas, which read as five.
 */
function ideaReviewLine(ideas: Array<{ title: string }>, total: number | undefined, studioBaseUrl?: string): string {
  const list = (ideas || []).filter((idea) => idea && clean(idea.title))
  const count = Math.max(list.length, Math.floor(Number(total) || 0))
  if (!count) return ''
  const named = list.slice(0, MAX_IDEAS_NAMED).map((idea) => recordText(idea.title, 80))
  const more = count - named.length
  const review = thisWeekLink(studioBaseUrl, 'caught', 'Review them on This week')
  const noun = count === 1 ? 'idea I caught still needs' : 'ideas I caught still need'
  return `*${count} ${noun} a yes or no:* ${named.join(' · ')}${more > 0 ? ` …and ${more} more` : ''} — ${review}`
}

/**
 * Ideas Marqueta caught that nobody has judged yet, as the Monday plan shows
 * them — one line, linked to where they are judged.
 *
 * The thread reply asks once, at the moment of capture, and a thread is easy
 * to miss. Without this an unreviewed idea sits in limbo forever — present on
 * the board, trusted by nobody, because no one ever said whether it was real.
 */
export function buildIdeaReviewBlocks(
  ideas: Array<{ title: string }>,
  opts: { total?: number; studioBaseUrl?: string } = {},
): Block[] {
  const line = ideaReviewLine(ideas, opts.total, opts.studioBaseUrl)
  return line ? [context(line)] : []
}

/**
 * What Marqueta says when somebody shares written work rather than an idea.
 *
 * A draft is further along than a proposal: it is already on the calendar as
 * `drafting`, with the copy attached. It says plainly that it filed the thing
 * on a guess, where to find it (an undated draft is not on the month grid, so
 * "open the calendar" alone sent people looking in the wrong place), and
 * binning it is one press.
 */
export function buildDraftCaptureBlocks(input: {
  title: string
  contentType?: string
  channel: string
  ts: string
  studioUrl?: string
}): Block[] {
  const value = JSON.stringify({ c: input.channel, ts: input.ts }).slice(0, 1900)
  const kind = input.contentType && input.contentType !== 'other' ? clean(input.contentType) : 'draft'
  return [
    section(
      'That looks like a finished draft, so it’s on the calendar with the copy attached:\n' +
        `*${recordText(input.title || 'Untitled draft', 300)}* · ${recordText(kind, 40)} · drafting, no date\n` +
        '_It won’t post itself — it’s under *Unscheduled*, below the month grid._',
    ),
    // The link last, as on the idea receipt beside it in the thread (rule 2).
    ...actionsRow([
      button(MARKETING_ACTION.ideaDiscard, LABEL.DRAFT_DISCARD, value),
      openViewButton('calendar', input.studioUrl || ''),
    ]),
  ]
}

/** Which message a Keep / Not-an-idea press refers to. */
export function decodeIdeaValue(value: string | undefined): { channel: string; ts: string } | null {
  try {
    const parsed = JSON.parse(String(value || ''))
    const channel = String(parsed?.c || '')
    const ts = String(parsed?.ts || '')
    if (!channel || !ts) return null
    return { channel, ts }
  } catch {
    return null
  }
}

// ── The task detail modal ───────────────────────────────────────────────────

export type TaskDetail = {
  _id: string
  title: string
  /** The concrete thing to do. The single most useful field, so it leads. */
  nextAction?: string
  whyNow?: string
  summary?: string
  /** For a decision, the question that has to be answered. */
  humanQuestion?: string
  blocker?: string
  kind?: string
  priority?: string
  status?: string
  ownerName?: string
  dueAt?: string
  minutes?: number
  targetView?: string
}

/**
 * Slack modal titles are capped at 24 characters and the API REJECTS a longer
 * one outright, so a real task title has to be trimmed rather than passed
 * through. The full title is repeated in the body, where there is room.
 */
export function modalTitle(text: string, fallback = 'Task'): string {
  const value = String(text || '').trim() || fallback
  return value.length <= 24 ? value : `${value.slice(0, 23)}…`
}

const STATUS_SET = new Set<string>(MARKETING_OPERATION_STATUSES)
const DETAIL_STATUS_WORDS: Record<string, string> = {
  queued: 'Not started',
  working: 'In progress',
  needsHuman: 'Needs someone',
  waiting: 'Waiting on someone',
  blocked: 'Stuck',
  scheduled: 'Scheduled',
  done: 'Done',
  dismissed: 'Dropped',
}

/**
 * Where a task stands, in the card's and the Studio pill's words.
 *
 * The same rules as `taskStatusWords` (weeklyCheckIn.ts), which this module
 * cannot import: that module reads `MARKETING_ACTION` from here while it
 * loads, so importing it back would make load order decide whether either
 * works. tests/slack-delegation.test.ts holds the two to each other for every
 * status, owned and not, decision and not — a word changed in one place fails
 * there, not in front of the team.
 */
export function detailStatusWords(task: Pick<TaskDetail, 'status' | 'kind' | 'humanQuestion' | 'ownerName'>): string {
  const raw = clean(task?.status)
  const status = STATUS_SET.has(raw) ? raw : 'queued'
  if (['done', 'dismissed', 'blocked', 'waiting', 'scheduled'].includes(status)) return DETAIL_STATUS_WORDS[status]
  if (status === 'needsHuman') return isDecisionTask({ ...task, status }) ? 'Needs a decision' : DETAIL_STATUS_WORDS.needsHuman
  const owned = clean(task?.ownerName).length > 0
  if (status === 'working') return owned ? DETAIL_STATUS_WORDS.working : 'Marqueta working'
  return owned ? DETAIL_STATUS_WORDS.queued : 'Nobody has it'
}

const lowerFirst = (words: string) => (words.startsWith('Marqueta') ? words : words.charAt(0).toLowerCase() + words.slice(1))

/**
 * Everything a person needs to actually start the task.
 *
 * The plan shows only a title and a line — a channel message with six
 * paragraphs per task is one nobody reads. This is the other half: the facts
 * in the card's words ("Decision · Urgent · needs a decision · nobody has it ·
 * due Fri 25 Sep · ~20m"), then `nextAction`, because it is the concrete
 * instruction, then why it matters now, then the background.
 */
export function buildTaskDetailBlocks(task: TaskDetail, opts: { now?: Date } = {}): Block[] {
  const now = opts.now || new Date()
  const kind = clean(task.kind)
  const status = detailStatusWords(task)
  const owner = clean(task.ownerName)
  const due = task.dueAt ? formatSlackDay(task.dueAt, now) : ''
  const chips = [
    kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : '',
    task.priority === 'urgent' || task.priority === 'high' ? 'Urgent' : '',
    lowerFirst(status),
    // "Nobody has it" is already the status word for unowned work not started.
    owner ? `owner ${owner}` : status === 'Nobody has it' ? '' : 'nobody has it',
    due ? `due ${due}` : '',
    formatEffort(Number(task.minutes)),
  ].filter(Boolean)

  const blocks: Block[] = [
    section(`*${recordText(task.title || 'Untitled task', 300)}*`),
    context(escapeSlackText(chips.join(' · '))),
  ]

  const part = (label: string, body?: string) => {
    if (!body || !body.trim()) return
    blocks.push({ type: 'divider' })
    blocks.push(section(`*${label}*\n${clipSlackText(escapeSlackText(body.trim()), 2800)}`))
  }

  part('What needs doing', task.nextAction)
  part(task.kind === 'decision' ? 'The question to answer' : 'Why now', task.humanQuestion || task.whyNow)
  if (task.humanQuestion && task.whyNow) part('Why now', task.whyNow)
  part('Background', task.summary)
  part('In the way', task.blocker)

  if (!task.nextAction && !task.summary && !task.whyNow && !task.humanQuestion) {
    blocks.push(section(`_This task has no detail recorded yet. Add what needs doing on ${VIEW_TITLE.thisWeek}, in the Studio._`))
  }

  return blocks
}

const STUDIO_VIEWS = new Set<string>(Object.keys(VIEW_TITLE))

/**
 * The link out of the detail modal, named after the tab it opens.
 *
 * A task's own view when it is one Slack links to by name (This week,
 * Outreach, Calendar); anything else opens This week with the task named —
 * the banner there says why you came and can mark it done or stuck. A link
 * called "Open where this happens" told nobody where they were going, which
 * is how people stop pressing links.
 */
function detailLink(task: TaskDetail, opts: { studioBaseUrl?: string; studioUrl?: string }): Block | null {
  let base = clean(opts.studioBaseUrl)
  if (!base && opts.studioUrl) {
    try {
      base = new URL(opts.studioUrl).origin
    } catch {
      base = ''
    }
  }
  const resolved = resolveTaskView(task)
  const view: MarquetaView = STUDIO_VIEWS.has(resolved) ? (resolved as MarquetaView) : 'thisWeek'
  return openViewButton(view, studioViewUrl(base, view, { task: task._id }))
}

/**
 * The whole modal, not just its body.
 *
 * A modal that only tells you things is a dead end: you read it, close it, and
 * still have to go and find the work. So this adds the two ways out — answer a
 * decision right here, or open the Studio tab that holds it, with the task
 * named so the Studio can point at what needs filling.
 *
 * The text box appears ONLY for a decision with a question. Offering one for
 * "write the article" would promise something a modal cannot deliver.
 */
export function buildTaskDetailView(
  task: TaskDetail,
  options: { studioUrl?: string; studioBaseUrl?: string; now?: Date } = {},
): Record<string, unknown> {
  const blocks = buildTaskDetailBlocks(task, { now: options.now })
  const answerable = Boolean(task.humanQuestion && task.kind === 'decision')

  const link = detailLink(task, options)
  if (link) {
    blocks.push({ type: 'divider' })
    // Green only when it is the one thing to do here; with an answer box, Save answer is.
    blocks.push({ type: 'actions', elements: [answerable ? link : { ...link, style: 'primary' }] })
  }

  if (answerable) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'input',
      block_id: MARKETING_ANSWER_BLOCK,
      label: { type: 'plain_text', text: 'Answer it here' },
      hint: { type: 'plain_text', text: 'Saved onto the task and marked decided.' },
      optional: true,
      element: {
        type: 'plain_text_input',
        action_id: MARKETING_ANSWER_INPUT,
        multiline: true,
        placeholder: { type: 'plain_text', text: 'Your decision, in a sentence or two' },
      },
    })
  }

  return {
    type: 'modal',
    callback_id: MARKETING_ANSWER_CALLBACK,
    // Slack hands private_metadata back on submit; it is how we know which task
    // was answered without trusting anything the client could edit.
    private_metadata: task._id,
    title: { type: 'plain_text', text: modalTitle(task.title) },
    close: { type: 'plain_text', text: 'Close' },
    ...(answerable ? { submit: { type: 'plain_text', text: 'Save answer' } } : {}),
    blocks,
  }
}

// ── Legacy: the attachment cards of Monday plans posted before this one ─────

/** The shape the attachment cards were drawn from. Only legacy redraws use it now. */
export type DigestTask = {
  _id: string
  title: string
  kind?: string
  priority?: string
  status?: string
  suggestedOwner?: string
  ownerName?: string
  slackUserId?: string
  minutes?: number
  whyNow?: string
}

/**
 * A task card from a Monday plan posted BEFORE the plan moved into blocks.
 *
 * Nothing new is posted as an attachment: the notification never saw what was
 * in one, and a phone showed it a hundred lines below the asks. But messages
 * already in the channel still have these cards and their buttons, and a
 * press on one redraws the card (`refreshTaskInAttachments`). So it keeps its
 * old action ids — the interactions route still handles them — and speaks the
 * current vocabulary: `I’ll take it` · `Details…` · `Not me`. Once somebody
 * has it, `Not me` · `Details…`: the owned card's button is the old decline
 * (`passOnTask` — needs someone, and a pass on record), so it wears the label
 * that means exactly that. `Hand back` is `handBackTask` everywhere else, and
 * one label doing two different writes is the reflex-press trap the
 * vocabulary exists to close (rule 4). "Take it over" is gone; nothing in the
 * current plan needs it.
 *
 * No colour bar: priority is the word "Urgent", which a screen reader reads
 * and a colour-blind reader can see.
 */
export function buildTaskAttachment(
  task: DigestTask & {
    kind?: string
    priority?: string
    status?: string
    note?: string
    suggestedOwner?: string
    askedName?: string
  },
): Block {
  const value = encodeActionValue({ taskId: task._id, ownerName: task.ownerName })
  const owner = clean(task.ownerName)
  const passed = !owner && task.status === 'needsHuman'

  const details = button(MARKETING_ACTION.details, LABEL.DETAILS, value)
  const elements = owner
    ? [button(MARKETING_ACTION.decline, LABEL.NOT_ME, value), details]
    : passed
      ? [button(MARKETING_ACTION.claim, LABEL.TAKE, value, true), details]
      : [button(MARKETING_ACTION.claim, LABEL.TAKE, value, true), details, button(MARKETING_ACTION.decline, LABEL.NOT_ME, value)]

  // A suggestion must read as a suggestion. Showing "Owner: Juhan" for someone
  // who never accepted the work makes the board report commitment that does
  // not exist, and hides the fact that nobody has picked it up.
  const suggested = clean(task.suggestedOwner)
  const asked = clean(task.askedName)
  const who = owner
    ? `Taken by ${slackMention(task.slackUserId, owner)}`
    : asked
      ? `Nobody has it · asked ${recordText(asked, 120)}`
      : suggested
        ? `Nobody has it · suggested ${recordText(suggested, 120)}`
        : 'Nobody has it'
  const meta = [
    task.priority === 'urgent' || task.priority === 'high' ? '*Urgent*' : '',
    who,
    formatEffort(Number(task.minutes)),
  ].filter(Boolean)

  return {
    blocks: [
      // Title and why-now are record text, so escaped; `note` is mrkdwn the
      // caller built (it carries the presser's mention) and is passed through.
      section(`*${recordText(task.title, 2900)}*\n${meta.join(' · ')}`),
      ...(task.whyNow ? [context(`_${recordText(task.whyNow, 2900)}_`)] : []),
      // What just happened, so the channel sees the change without re-reading.
      ...(task.note ? [context(task.note)] : []),
      { type: 'actions', elements },
    ],
  }
}

/**
 * Swap one legacy attachment card for a fresh render. Because the card is
 * drawn from the record, "undo" is just the reverse action being available
 * again — there is no separate undo state to get stuck in.
 */
export function refreshTaskInAttachments(
  attachments: Block[],
  taskId: string,
  task: DigestTask & { kind?: string; priority?: string; status?: string; note?: string },
): Block[] {
  if (!taskId) return attachments
  return attachments.map((attachment) =>
    JSON.stringify(attachment).includes(taskId) ? buildTaskAttachment(task) : attachment,
  )
}

/**
 * The note a press leaves on a legacy attachment card, so the channel still
 * makes sense afterwards — a bare "done" leaves everyone else wondering what
 * happened.
 */
export function buildActionAcknowledgement(input: {
  action: MarketingActionId
  userId: string
  taskTitle?: string
}): string {
  const who = `<@${input.userId}>`
  const task = input.taskTitle ? `*${recordText(input.taskTitle, 300)}*` : 'that'
  switch (input.action) {
    case MARKETING_ACTION.claim:
      return `${who} picked up ${task}.`
    case MARKETING_ACTION.decline:
      return `${who} passed on ${task} — it needs another owner.`
    case MARKETING_ACTION.away:
      return `${who} is away this week. Their work needs someone.`
    case MARKETING_ACTION.linkIdentity:
      return `${who} is now linked, and will be @-mentioned on their tasks.`
    default:
      return `${who} responded.`
  }
}
