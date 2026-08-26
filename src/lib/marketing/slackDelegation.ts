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
} as const

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
