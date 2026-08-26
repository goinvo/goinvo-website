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
} as const

/** Modal submit + the input inside it. */
export const MARKETING_ANSWER_CALLBACK = 'goinvo_marketing_answer_task'
export const MARKETING_ANSWER_BLOCK = 'goinvo_marketing_answer_block'
export const MARKETING_ANSWER_INPUT = 'goinvo_marketing_answer_input'

export type MarketingActionId = (typeof MARKETING_ACTION)[keyof typeof MARKETING_ACTION]

export function isMarketingAction(actionId: string | undefined): actionId is MarketingActionId {
  return Object.values(MARKETING_ACTION).includes(actionId as MarketingActionId)
}

/**
 * Action payloads travel in Slack's `value` string, so they are encoded rather
 * than assumed. Slack caps `value` at 2000 characters and will silently drop a
 * message that exceeds it, so this stays deliberately small: an id and a name.
 */
export function encodeActionValue(input: { taskId: string; ownerName?: string }): string {
  return JSON.stringify({ t: input.taskId, o: input.ownerName || '' }).slice(0, 1900)
}

export function decodeActionValue(value: string | undefined): { taskId: string; ownerName: string } | null {
  try {
    const parsed = JSON.parse(String(value || ''))
    const taskId = String(parsed?.t || '')
    if (!taskId) return null
    return { taskId, ownerName: String(parsed?.o || '') }
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
 * One attachment per task.
 *
 * Per-task colour is only possible this way — `color` lives on an attachment,
 * not a block — so each task becomes its own small card. The primary action
 * sits as an accessory on the title row rather than below it, which removes an
 * entire row per task and keeps the whole week visible without scrolling.
 */
export function buildTaskAttachment(task: DigestTask & { kind?: string; priority?: string }): Block {
  const value = encodeActionValue({ taskId: task._id, ownerName: task.ownerName })

  const facts: Block[] = []
  const fields = [
    task.ownerName ? `*Owner*\n${mention(task.slackUserId, task.ownerName)}` : '*Owner*\n_unclaimed_',
    task.minutes ? `*Effort*\n${formatMinutes(task.minutes)}` : '',
    task.priority ? `*Priority*\n${task.priority}` : '',
    task.kind ? `*Type*\n${task.kind}` : '',
  ].filter(Boolean)
  if (fields.length) facts.push({ type: 'section', fields: fields.map((t) => ({ type: 'mrkdwn', text: t })) })

  return {
    color: PRIORITY_COLOR[String(task.priority || 'normal')] || PRIORITY_COLOR.normal,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${task.title}*` },
      },
      ...facts,
      ...(task.whyNow
        ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: `_${task.whyNow}_` }] }]
        : []),
      {
        // All three together in one row. As an accessory the primary button sat
        // detached in the top-right corner, reading as unrelated to the two
        // below it — the choice is one choice, so it looks like one.
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: MARKETING_ACTION.claim,
            text: { type: 'plain_text', text: "I'll take it" },
            style: 'primary',
            value,
          },
          {
            type: 'button',
            action_id: MARKETING_ACTION.details,
            text: { type: 'plain_text', text: "What's involved" },
            value,
          },
          {
            type: 'button',
            action_id: MARKETING_ACTION.decline,
            text: { type: 'plain_text', text: 'Not me' },
            value,
          },
        ],
      },
    ],
  }
}

/**
 * Rewrite a finished task inside its attachment.
 *
 * Same job as markTaskInBlocks, but attachments nest their blocks one level
 * deeper. The whole card collapses to a single struck-through line, which is
 * what makes a half-done week readable at a glance.
 */
export function markTaskInAttachments(
  attachments: Block[],
  taskId: string,
  statusLine: string,
): Block[] {
  if (!taskId) return attachments
  return attachments.map((attachment) => {
    const blocks: Block[] = attachment.blocks || []
    const owns = blocks.some(
      (block) =>
        (block.accessory && decodeActionValue(block.accessory.value)?.taskId === taskId) ||
        (block.elements || []).some(
          (element: Record<string, unknown>) =>
            decodeActionValue(element.value as string | undefined)?.taskId === taskId,
        ),
    )
    if (!owns) return attachment
    // Take what is between the asterisks. The previous version stripped the
    // first whitespace-delimited token to remove an emoji — with the emoji gone
    // that silently ate the first word, turning "Call MEDITECH" into "MEDITECH".
    const raw = String(blocks[0]?.text?.text || '')
    const title = (raw.match(/\*([^*]+)\*/)?.[1] || raw).trim()
    return {
      color: '#3f7d5c',
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `:white_check_mark:  ~${title}~\n${statusLine}` },
        },
      ],
    }
  })
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
