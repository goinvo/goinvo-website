/**
 * What actually happens when someone presses a button in the Slack digest.
 *
 * Server-only: it writes to the private dataset. Kept out of the interactions
 * route so that route stays a thin dispatcher, the way the chat and dispute
 * handlers already are.
 *
 * Every path here is written to be safe to run twice. Slack retries an
 * interaction it thinks failed, and a retry that appends a second "claimed by"
 * note or double-books a holiday is worse than one that does nothing.
 */
import { getMarketingWriteClientFor } from './client'
import { MARKETING_OPERATION_TYPE } from './operations'
import { TEAM_AVAILABILITY_TYPE, availabilityDocId, type AvailabilityStatus } from './availability'

export type MarketingSlackActionResult = {
  ok: boolean
  taskTitle?: string
  message?: string
}

function endOfWeek(from: Date): string {
  // Slack's "I'm away this week" means the rest of the working week, so this
  // runs to Sunday rather than seven days from now — otherwise pressing it on a
  // Friday books the following week off too.
  const date = new Date(from)
  const daysToSunday = (7 - date.getUTCDay()) % 7
  date.setUTCDate(date.getUTCDate() + daysToSunday)
  return date.toISOString().slice(0, 10)
}

/** Take ownership of a task. */
export async function claimMarketingTask(input: {
  taskId: string
  personName: string
  slackUserId: string
}): Promise<MarketingSlackActionResult> {
  const client = getMarketingWriteClientFor(MARKETING_OPERATION_TYPE)
  const task = await client.fetch<{ _id: string; title?: string; ownerName?: string } | null>(
    `*[_id == $id][0]{_id, title, ownerName}`,
    { id: input.taskId },
  )
  if (!task) return { ok: false, message: 'That task no longer exists.' }

  await client
    .patch(task._id)
    .set({
      ownerName: input.personName,
      ownerSlackUserId: input.slackUserId,
      lastOutcome: `Claimed in Slack by ${input.personName}`,
    })
    .commit()

  return { ok: true, taskTitle: task.title }
}

/**
 * Hand a task back.
 *
 * The owner is cleared rather than reassigned. Picking somebody else without
 * asking them is how a plan loses the team's trust, and an unowned task is
 * visible on the board where a person can choose.
 */
export async function declineMarketingTask(input: {
  taskId: string
  personName: string
}): Promise<MarketingSlackActionResult> {
  const client = getMarketingWriteClientFor(MARKETING_OPERATION_TYPE)
  const task = await client.fetch<{ _id: string; title?: string } | null>(
    `*[_id == $id][0]{_id, title}`,
    { id: input.taskId },
  )
  if (!task) return { ok: false, message: 'That task no longer exists.' }

  await client
    .patch(task._id)
    .set({
      ownerName: '',
      status: 'needsHuman',
      humanQuestion: `${input.personName} passed on this — who should pick it up?`,
      lastOutcome: `Declined in Slack by ${input.personName}`,
    })
    .commit()

  return { ok: true, taskTitle: task.title }
}

/** Record that somebody is away, and for how long. */
export async function setMarketingAvailability(input: {
  personName: string
  slackUserId: string
  status: AvailabilityStatus
  from?: string
  until?: string
  weeklyHours?: number
  note?: string
}): Promise<MarketingSlackActionResult> {
  const client = getMarketingWriteClientFor(TEAM_AVAILABILITY_TYPE)
  const now = new Date()
  const from = input.from || now.toISOString().slice(0, 10)
  const until = input.until ?? (input.status === 'away' ? endOfWeek(now) : undefined)
  const _id = availabilityDocId(input.personName)

  // createOrReplace, not create-then-patch: pressing the button twice must leave
  // one record saying the same thing, not two overlapping holidays.
  await client.createOrReplace({
    _id,
    _type: TEAM_AVAILABILITY_TYPE,
    ownerName: input.personName,
    slackUserId: input.slackUserId,
    status: input.status,
    from,
    ...(until ? { until } : {}),
    ...(typeof input.weeklyHours === 'number' ? { weeklyHours: input.weeklyHours } : {}),
    ...(input.note ? { note: input.note } : {}),
    updatedAt: now.toISOString(),
  })

  return {
    ok: true,
    message:
      input.status === 'away'
        ? `Marked away ${from}${until ? ` to ${until}` : ''}. Their work will be flagged for reassignment.`
        : `Availability updated: ${input.status} from ${from}.`,
  }
}

/**
 * Link a Slack user to the owner name used on operations.
 *
 * Patched onto the availability record rather than createOrReplace'd: somebody
 * linking their identity must not silently cancel the holiday they booked five
 * minutes earlier.
 */
export async function linkMarketingIdentity(input: {
  ownerName: string
  slackUserId: string
}): Promise<MarketingSlackActionResult> {
  const client = getMarketingWriteClientFor(TEAM_AVAILABILITY_TYPE)
  const _id = availabilityDocId(input.ownerName)

  await client
    .transaction()
    .createIfNotExists({
      _id,
      _type: TEAM_AVAILABILITY_TYPE,
      ownerName: input.ownerName,
      status: 'available',
    })
    .patch(_id, (patch) =>
      patch.set({ slackUserId: input.slackUserId, ownerName: input.ownerName, updatedAt: new Date().toISOString() }),
    )
    .commit()

  return { ok: true, message: `Linked to ${input.ownerName}.` }
}

/** Fetch one task with everything needed to explain it. */
export async function getMarketingTaskDetail(taskId: string) {
  const client = getMarketingWriteClientFor(MARKETING_OPERATION_TYPE)
  return client.fetch<{
    _id: string
    title: string
    nextAction?: string
    whyNow?: string
    summary?: string
    humanQuestion?: string
    blocker?: string
    kind?: string
    priority?: string
    status?: string
    ownerName?: string
    dueAt?: string
    estimatedMinutes?: number
    targetView?: string
  } | null>(
    `*[_id == $id][0]{
      _id, title, nextAction, whyNow, summary, humanQuestion, blocker,
      kind, priority, status, ownerName, dueAt, estimatedMinutes, targetView
    }`,
    { id: taskId },
  )
}
