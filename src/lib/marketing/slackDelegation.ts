/**
 * The weekly marketing message in Slack, and the buttons that make it useful.
 *
 * A digest nobody can act on is just noise in a channel. So every task carries
 * the two replies a person actually has — "I'll take it" and "not me this week"
 * — plus a way to say they are away, which is the thing that otherwise silently
 * breaks the plan.
 *
 * Pure Block Kit construction and pure parsing of what comes back. No network,
 * no Slack SDK, so the message shape and the action routing are both testable
 * without a workspace.
 */

import type { CallSheetEntry } from './callSheet'

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

export type MarketingActionId = (typeof MARKETING_ACTION)[keyof typeof MARKETING_ACTION]

export function isMarketingAction(actionId: string | undefined): actionId is MarketingActionId {
  return Object.values(MARKETING_ACTION).includes(actionId as MarketingActionId)
}

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

const mention = (slackUserId?: string, fallback?: string) =>
  slackUserId ? `<@${slackUserId}>` : fallback || 'someone'

function formatMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (hours && rest) return `${hours}h ${rest}m`
  if (hours) return `${hours}h`
  return `${rest}m`
}

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

export type DigestInput = {
  theme: string
  weekStart: string
  weekEnd: string
  plannedMinutes: number
  budgetMinutes: number
  tasks: DigestTask[]
  callSheet?: CallSheetEntry[]
  /** People who are away this week, with the work that needs a new owner. */
  awayNotices?: { awayOwner: string; taskTitle: string; candidates: string[] }[]
  studioUrl?: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Block = Record<string, any>

/**
 * Build the digest.
 *
 * Ordered the way the person reads it: what the week is about, then what is
 * theirs, then who to contact and why. The call sheet is capped — a Slack
 * message with fifty blocks is scrolled past, and the Studio holds the full
 * list anyway.
 */
export function buildWeeklyDigestBlocks(input: DigestInput): Block[] {
  const blocks: Block[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: input.theme || 'This week in marketing', emoji: true },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text:
            `${input.weekStart} – ${input.weekEnd}  ·  ` +
            // "planned of" would imply the work has been fitted to the budget.
            // The digest lists what is OPEN, which can exceed it — saying
            // "planned" when it does not fit is how a plan quietly loses trust.
            `${formatMinutes(input.plannedMinutes)} of open work  ·  ${formatMinutes(input.budgetMinutes)} budget` +
            (input.plannedMinutes > input.budgetMinutes ? '  ·  more than fits' : ''),
        },
      ],
    },
  ]

  if (input.tasks.length > 0) {
    blocks.push({ type: 'divider' })
    for (const task of input.tasks.slice(0, 8)) {
      const owner = mention(task.slackUserId, task.ownerName)
      const meta = [task.minutes ? formatMinutes(task.minutes) : '', task.whyNow || '']
        .filter(Boolean)
        .join(' · ')
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${task.title}*\n${owner}${meta ? `  ·  ${meta}` : ''}` },
      })
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: MARKETING_ACTION.claim,
            text: { type: 'plain_text', text: "I'll take it" },
            style: 'primary',
            value: encodeActionValue({ taskId: task._id, ownerName: task.ownerName }),
          },
          {
            type: 'button',
            action_id: MARKETING_ACTION.decline,
            text: { type: 'plain_text', text: 'Not me this week' },
            value: encodeActionValue({ taskId: task._id, ownerName: task.ownerName }),
          },
          {
            type: 'button',
            action_id: MARKETING_ACTION.details,
            text: { type: 'plain_text', text: "What's involved" },
            value: encodeActionValue({ taskId: task._id, ownerName: task.ownerName }),
          },
        ],
      })
    }
  }

  for (const notice of input.awayNotices || []) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `:palm_tree: *${notice.awayOwner} is away* — “${notice.taskTitle}” needs someone.\n` +
          (notice.candidates.length
            ? `Free this week: ${notice.candidates.join(', ')}`
            : '_Nobody is free this week — this one probably slips._'),
      },
    })
  }

  const sheet = (input.callSheet || []).slice(0, 3)
  if (sheet.length > 0) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Who to reach out to, and why now*' },
    })
    for (const entry of sheet) {
      const people = entry.contacts.length
      const source = entry.sourceUrl ? ` <${entry.sourceUrl}|source>` : ''
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*${entry.organization}* · ${people} ${people === 1 ? 'person' : 'people'}\n` +
            `${entry.signal}${source}`,
        },
      })
    }
  }

  blocks.push({ type: 'divider' })
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        action_id: MARKETING_ACTION.away,
        text: { type: 'plain_text', text: "I'm away this week" },
        value: encodeActionValue({ taskId: 'week' }),
      },
      ...(input.studioUrl
        ? [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Open the plan' },
              url: input.studioUrl,
            },
          ]
        : []),
    ],
  })

  return blocks
}


/**
 * Ask people to say which name is theirs, once.
 *
 * Operations are owned by a name ("Juhan"); Slack knows a user id. Nothing can
 * @-mention the right person until those are linked, and guessing from display
 * names is how a bot pings the wrong colleague.
 *
 * So it asks, and the asking IS the consent: the prompt states exactly what gets
 * stored and why before anybody presses anything. It only appears while owners
 * are still unmapped, so it disappears on its own rather than nagging.
 */
export function buildIdentityPromptBlocks(unmappedOwners: string[]): Block[] {
  const owners = unmappedOwners.filter(Boolean).slice(0, 20)
  if (owners.length === 0) return []
  return [
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          "*One-time setup* — I don't know who is who yet, so the names above are plain text " +
          'rather than @-mentions.\n' +
          'Pick your name and I will store your Slack user ID against it, so future tasks ' +
          'mention you directly. That is all it stores, and only for the people who choose to.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'static_select',
          action_id: MARKETING_ACTION.linkIdentity,
          placeholder: { type: 'plain_text', text: 'Which one is you?' },
          options: owners.map((owner) => ({
            text: { type: 'plain_text', text: owner },
            value: owner,
          })),
        },
      ],
    },
  ]
}


/**
 * The runway line, and the three answers a principal actually has.
 *
 * Money is the input the whole strategy hangs off, and it was the one thing the
 * suite never asked about — it held a bin picked in July and would still have
 * been planning against it in 2027. So Marqueta asks, in the channel, at the
 * moment the number is about to stop being true.
 *
 * It states the number rather than the bin. "Rebuild" invites the reader to
 * assume somebody decided it; "4.5 months, to 11 Jan 2027" can be argued with,
 * and being argued with is the point.
 *
 * Shown only when a check-in is due. A permanent banner about money in a team
 * channel is a banner people learn to scroll past.
 */
export function buildRunwayBlocks(input: {
  summary: string
  checkIn: { due: boolean; urgent: boolean; reason: string; question: string }
  disagreement?: string | null
}): Block[] {
  if (!input.checkIn.due && !input.disagreement) return []

  const lines = [input.summary]
  if (input.checkIn.due) lines.push(input.checkIn.reason + ' ' + input.checkIn.question)
  if (input.disagreement) lines.push('_' + input.disagreement + '_')

  return [
    { type: 'divider' },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*Runway*' + '\n' + lines.filter(Boolean).join('\n') },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: MARKETING_ACTION.runwayConfirm,
          text: { type: 'plain_text', text: 'Still right' },
          // Not primary: confirming is the cheap answer, and making it the
          // brightest button invites a reflex press on the one number the whole
          // strategy depends on.
        },
        {
          type: 'button',
          action_id: MARKETING_ACTION.runwaySigned,
          text: { type: 'plain_text', text: 'We signed something' },
          style: 'primary',
        },
        {
          type: 'button',
          action_id: MARKETING_ACTION.runwayUpdate,
          text: { type: 'plain_text', text: 'It has changed' },
        },
      ],
    },
  ]
}

/**
 * The modal behind "we signed something" and "it has changed".
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
        placeholder: { type: 'plain_text', text: 'SoW - Acme, discovery phase' },
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

/**
 * What Marqueta says when she notices somebody proposing work.
 *
 * Posted IN THREAD, deliberately. A reply in the channel for every idea would
 * double the traffic in a channel people already have to skim, and the fastest
 * way to get a bot muted is to make it talkative. In a thread it is there when
 * you want it and invisible when you do not.
 *
 * It states what it did and offers the two honest answers. "Keep it" is not
 * primary: the capture was a guess, and making the confirm button the brightest
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
  const detail = input.category ? ' Filed under ' + input.category + '.' : ''

  const elements: Array<Record<string, unknown>> = [
    {
      type: 'button',
      action_id: MARKETING_ACTION.ideaKeep,
      text: { type: 'plain_text', text: 'Keep it' },
      value,
    },
    {
      type: 'button',
      action_id: MARKETING_ACTION.ideaDiscard,
      text: { type: 'plain_text', text: 'Not an idea' },
      value,
    },
  ]
  if (input.studioUrl) {
    elements.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Open the board' },
      url: input.studioUrl,
    })
  }

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          'Noted this as an idea so it does not scroll away:' +
          '\n' +
          '*' + input.title + '*' +
          detail +
          '\n' +
          '_Marked as needing review - it is my guess that this was a proposal, not yours._',
      },
    },
    { type: 'actions', elements },
  ]
}

/**
 * Ideas Marqueta caught that nobody has judged yet.
 *
 * The thread reply asks once, at the moment of capture, and a thread is easy to
 * miss. Without this an unreviewed idea sits in limbo forever - present on the
 * board, trusted by nobody, because no one ever said whether it was real.
 */
export function buildIdeaReviewBlocks(ideas: Array<{ title: string }>, studioUrl?: string): Block[] {
  if (ideas.length === 0) return []
  const names = ideas.slice(0, 3).map((idea) => '• ' + idea.title)
  const more = ideas.length > 3 ? ' and ' + (ideas.length - 3) + ' more' : ''
  return [
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text:
            '_I caught ' + ideas.length + ' thing' + (ideas.length === 1 ? '' : 's') +
            ' in the channel that might be ideas' + more + ' - still waiting on a yes or no:_' +
            '\n' + names.join('\n') +
            (studioUrl ? '\n' + '<' + studioUrl + '|Judge them on the board>' : ''),
        },
      ],
    },
  ]
}

/**
 * What Marqueta says when somebody shares written work rather than an idea.
 *
 * A draft is further along than a proposal, so the offer is different: it is
 * already on the calendar as `drafting`, with the copy attached, and the useful
 * next step is to open it and give it a date. It still says plainly that it
 * filed the thing on a guess, and binning it is the same one press.
 */
export function buildDraftCaptureBlocks(input: {
  title: string
  contentType?: string
  channel: string
  ts: string
  studioUrl?: string
}): Block[] {
  const value = JSON.stringify({ c: input.channel, ts: input.ts }).slice(0, 1900)
  const kind = input.contentType && input.contentType !== 'other' ? input.contentType : 'draft'

  const elements: Array<Record<string, unknown>> = [
    {
      type: 'button',
      action_id: MARKETING_ACTION.ideaDiscard,
      text: { type: 'plain_text', text: 'Not for the calendar' },
      value,
    },
  ]
  if (input.studioUrl) {
    elements.unshift({
      type: 'button',
      text: { type: 'plain_text', text: 'Open it and set a date' },
      url: input.studioUrl,
      style: 'primary',
    })
  }

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          'That looks like written work, so I put it on the calendar with the copy attached:' +
          '\n' +
          '*' + input.title + '*  ·  ' + kind + ', drafting' +
          '\n' +
          '_It has no date and will not post itself. My guess that this was a draft, not yours._',
      },
    },
    { type: 'actions', elements },
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
  return value.length <= 24 ? value : `${value.slice(0, 23)}\u2026`
}

/**
 * Everything a person needs to actually start the task.
 *
 * The digest deliberately shows only a title and a line of context — a channel
 * message with six paragraphs per task is one nobody reads. But that left
 * "what am I actually supposed to do here?" unanswered, so this is the other
 * half: `nextAction` first, because it is the concrete instruction, then why it
 * matters now, then the background behind it.
 */
export function buildTaskDetailBlocks(task: TaskDetail): Block[] {
  const chips = [
    task.kind,
    task.priority ? `${task.priority} priority` : '',
    task.status,
    task.ownerName ? `owner: ${task.ownerName}` : 'unowned',
    task.dueAt ? `due ${String(task.dueAt).slice(0, 10)}` : '',
    task.minutes ? formatMinutes(task.minutes) : '',
  ].filter(Boolean)

  const blocks: Block[] = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${task.title}*` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: chips.join('  ·  ') }] },
  ]

  const section = (label: string, body?: string) => {
    if (!body || !body.trim()) return
    blocks.push({ type: 'divider' })
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*${label}*\n${body.trim()}` } })
  }

  section('What needs doing', task.nextAction)
  section(task.kind === 'decision' ? 'The question to answer' : 'Why now', task.humanQuestion || task.whyNow)
  if (task.humanQuestion && task.whyNow) section('Why now', task.whyNow)
  section('Background', task.summary)
  section('Blocked by', task.blocker)

  if (!task.nextAction && !task.summary && !task.whyNow && !task.humanQuestion) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_This task has no detail recorded yet. Open it in the Studio to add what needs doing._',
      },
    })
  }

  return blocks
}


/**
 * The whole modal, not just its body.
 *
 * A modal that only tells you things is a dead end: you read it, close it, and
 * still have to go and find the work. So this adds the two ways out —
 * answer a decision right here, or jump straight to the Studio view that owns
 * it, with the task named so the Studio can point at what needs filling.
 *
 * The text box appears ONLY for a decision with a question. Offering one for
 * "write the article" would promise something a modal cannot deliver.
 */
export function buildTaskDetailView(
  task: TaskDetail,
  options: { studioUrl?: string } = {},
): Record<string, unknown> {
  const blocks = buildTaskDetailBlocks(task)
  const answerable = Boolean(task.humanQuestion && task.kind === 'decision')

  if (options.studioUrl) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Open where this happens' },
          url: options.studioUrl,
          style: answerable ? undefined : 'primary',
        },
      ],
    })
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


/**
 * Rewrite the digest so a finished task checks itself off.
 *
 * Without this the message is a permanent to-do list: someone claims a task and
 * the channel still shows it unclaimed, so the next person claims it too. The
 * buttons for that task are removed as well — a button that has already been
 * pressed either does nothing or, worse, does it twice.
 *
 * Works by finding the actions block whose encoded value names the task, since
 * that is the only place the id appears; the section immediately above it is the
 * task's own line.
 */
export function markTaskInBlocks(
  blocks: Block[],
  taskId: string,
  statusLine: string,
): Block[] {
  if (!taskId) return blocks

  const actionsIndex = blocks.findIndex(
    (block) =>
      block.type === 'actions' &&
      (block.elements || []).some((element: Record<string, unknown>) => {
        const decoded = decodeActionValue(element.value as string | undefined)
        return decoded?.taskId === taskId
      }),
  )
  if (actionsIndex < 1) return blocks

  const sectionIndex = actionsIndex - 1
  const original = String(blocks[sectionIndex]?.text?.text || '')
  // Keep the title line, drop the buttons, and say what happened to it.
  const titleLine = original.split('\n')[0].replace(/^\*|\*$/g, '')

  const next = [...blocks]
  next[sectionIndex] = {
    type: 'section',
    text: { type: 'mrkdwn', text: `:white_check_mark: ~${titleLine}~\n${statusLine}` },
  }
  next.splice(actionsIndex, 1)
  return next
}


/**
 * Slack gives almost no styling control — no CSS, no fonts, no text colour. The
 * levers that DO exist are worth using deliberately:
 *
 *   attachment color   the one custom colour available, a bar down the left edge
 *   section fields     two-column key/value instead of a run-on sentence
 *   accessory          a control on the RIGHT of a section, saving a whole row
 *   emoji              the only glyphs there are
 *
 * Priority is the thing worth colouring: it is what decides reading order, and
 * a wall of identical grey blocks hides it completely.
 */
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#d94d2f',
  high: '#c08a6a',
  normal: '#4fb3a5',
  low: '#6f7a90',
}

export type DigestMessage = { blocks: Block[]; attachments: Block[] }

/**
 * One card per task, rendered from its CURRENT state.
 *
 * The first version collapsed a claimed or declined task into a struck-through
 * line with a single Undo button. That made the MESSAGE the source of truth,
 * with two consequences: reverse it once and you are stuck, and reposting the
 * digest loses the button entirely — so somebody who declined a call had no way
 * back to it at all.
 *
 * The card is a function of the record instead. Every state offers the action
 * that reverses it, however many times it has changed hands:
 *
 *   unowned          I'll take it   ·   Not me
 *   owned by you     Hand it back
 *   owned by others  Take it over
 *   passed           I'll take it
 *
 * Nothing collapses, so nothing is a dead end, and none of it depends on the
 * message still being the one you originally clicked.
 */
export function buildTaskAttachment(
  task: DigestTask & {
    kind?: string
    priority?: string
    status?: string
    note?: string
    suggestedOwner?: string
  },
): Block {
  const value = encodeActionValue({ taskId: task._id, ownerName: task.ownerName })
  const owner = String(task.ownerName || '').trim()
  const passed = !owner && task.status === 'needsHuman'

  const detailsButton = {
    type: 'button',
    action_id: MARKETING_ACTION.details,
    text: { type: 'plain_text', text: "What's involved" },
    value,
  }
  const takeButton = {
    type: 'button',
    action_id: MARKETING_ACTION.claim,
    text: { type: 'plain_text', text: owner ? 'Take it over' : "I'll take it" },
    style: 'primary',
    value,
  }
  const releaseButton = {
    type: 'button',
    action_id: MARKETING_ACTION.decline,
    text: { type: 'plain_text', text: owner ? 'Hand it back' : 'Not me' },
    value,
  }

  // A passed task has nothing to hand back, so it offers only the way forward.
  const elements = passed ? [takeButton, detailsButton] : [takeButton, detailsButton, releaseButton]

  // A suggestion must read as a suggestion. Showing "Owner: Juhan" for someone
  // who never accepted the work makes the board report commitment that does not
  // exist, and hides the fact that nobody has picked it up.
  const suggested = String(task.suggestedOwner || '').trim()
  const ownerField = owner
    ? '*Taken by*' + '\n' + mention(task.slackUserId, owner)
    : suggested
      ? '*Unclaimed*' + '\n' + '_suggested: ' + suggested + '_'
      : '*Unclaimed*' + '\n' + '_anyone_'

  const fields = [
    ownerField,
    task.minutes ? '*Effort*' + '\n' + formatMinutes(task.minutes) : '',
    task.priority ? '*Priority*' + '\n' + task.priority : '',
    task.kind ? '*Type*' + '\n' + task.kind : '',
  ].filter(Boolean)

  return {
    color: passed
      ? '#6f7a90'
      : PRIORITY_COLOR[String(task.priority || 'normal')] || PRIORITY_COLOR.normal,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: '*' + task.title + '*' } },
      { type: 'section', fields: fields.map((t) => ({ type: 'mrkdwn', text: t })) },
      ...(task.whyNow
        ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: '_' + task.whyNow + '_' }] }]
        : []),
      // What just happened, so the channel sees the change without re-reading.
      ...(task.note ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: task.note }] }] : []),
      { type: 'actions', elements },
    ],
  }
}

/**
 * Swap one task's card for a freshly rendered one.
 *
 * Replaces the collapse-and-offer-undo approach. Because the card is drawn from
 * the record, "undo" is just the reverse action being available again — there is
 * no separate undo state to get stuck in.
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
 * What to say back when someone presses a button.
 *
 * Slack replaces the message with whatever is returned, so this has to restate
 * enough for the channel to still make sense afterwards — a bare "done" leaves
 * everyone else wondering what happened.
 */
export function buildActionAcknowledgement(input: {
  action: MarketingActionId
  userId: string
  taskTitle?: string
}): string {
  const who = `<@${input.userId}>`
  const task = input.taskTitle ? `*${input.taskTitle}*` : 'that'
  switch (input.action) {
    case MARKETING_ACTION.claim:
      return `${who} picked up ${task}.`
    case MARKETING_ACTION.decline:
      return `${who} passed on ${task} — it needs another owner.`
    case MARKETING_ACTION.away:
      return `${who} is away this week. Their work needs reassigning.`
    case MARKETING_ACTION.linkIdentity:
      return `${who} is now linked, and will be @-mentioned on their tasks.`
    default:
      return `${who} responded.`
  }
}
