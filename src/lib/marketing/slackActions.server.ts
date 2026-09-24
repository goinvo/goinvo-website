/**
 * What actually happens when someone presses a button in the Slack digest.
 *
 * Server-only: it writes to the private dataset. Kept out of the interactions
 * route so that route stays a thin dispatcher, the way the chat and dispute
 * handlers already are.
 *
 * Every path here is written to be safe to run twice. Slack retries an
 * interaction it thinks failed, and a retry that appends a second "claimed by"
 * note or double-books a holiday is worse than one that does nothing. The two
 * task-card buttons go through `taskActions.server.ts`, whose writes are
 * conditional on the revision they were built from — a read-then-write here
 * once let a Take landing in between be silently undone.
 */
import { getMarketingWriteClientFor } from './client'
import { MARKETING_OPERATION_TYPE } from './operations'
import { TEAM_AVAILABILITY_TYPE, availabilityDocId, type AvailabilityStatus } from './availability'
import { passOnTask, takeOverTask, type TaskActionResult } from './taskActions.server'
import { resolvePresserName } from './team.server'
import { utcIsoWeekKey } from './weeklyCheckIn.server'

export type MarketingSlackActionResult = {
  ok: boolean
  taskTitle?: string
  message?: string
  /**
   * What the task looked like BEFORE this action.
   *
   * Undo has to restore a specific previous state, not a guessed default:
   * declining a task that was already unowned must not invent an owner, and
   * claiming one that was queued must not send it back to needsHuman.
   */
  previous?: { ownerName: string; status: string }
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

const COULD_NOT_READ_TEAM = 'I couldn’t read the team list just now, so nothing changed — try again in a minute.'

/**
 * The presser's name as the BOARD writes it.
 *
 * The interactions route hands these functions Slack's display name ("Juhan
 * Sonin"), and writing that as an owner splits one person into two: two
 * check-in groups, two loads when the digest decides whom to ask, and an
 * identity prompt that keeps offering a name nobody uses. So the linked roster
 * record decides (`resolvePresserName`), and a roster that cannot be read is a
 * refusal — never a fall back to the display name.
 */
async function boardName(input: { slackUserId?: string; personName: string }): Promise<string | null> {
  try {
    return await resolvePresserName({
      slackUserId: String(input.slackUserId || '').trim() || undefined,
      displayName: String(input.personName || '').trim() || undefined,
    })
  } catch (error) {
    console.error('[slack] could not read the team roster', error)
    return null
  }
}

function toSlackActionResult(result: TaskActionResult): MarketingSlackActionResult {
  return {
    ok: result.ok,
    ...(result.task?.title ? { taskTitle: result.task.title } : {}),
    ...(result.message ? { message: result.message } : {}),
    ...(result.before ? { previous: result.before } : {}),
  }
}

/**
 * The digest card's "I'll take it" — and, on a task somebody else owns, its
 * explicitly labelled "Take it over".
 *
 * Goes through the same conditional write as the check-in's Take
 * (`takeOverTask`), so the card no longer does four things the first version
 * did: write Slack's display name as the owner, "take" a task that was already
 * done or dropped, overwrite whatever landed between its read and its write,
 * and leave a task somebody had passed on stuck in needsHuman with the stale
 * "X passed on this — who should pick it up?" — which kept it counted among the
 * week's decisions long after someone had picked it up.
 */
export async function claimMarketingTask(input: {
  taskId: string
  /** Slack's display name; resolved to the board name here. */
  personName: string
  slackUserId: string
}): Promise<MarketingSlackActionResult> {
  const person = await boardName(input)
  if (person === null) return { ok: false, message: COULD_NOT_READ_TEAM }
  return toSlackActionResult(await takeOverTask({ taskId: input.taskId, personName: person, slackUserId: input.slackUserId }))
}

/**
 * The digest card's "Not me" on an unclaimed task, and "Hand it back" on an
 * owned one (`passOnTask` has the rules).
 *
 * `slackUserId` is what makes the pass stick: it is recorded in the task's
 * `askHistory`, which is how the next digest knows never to ask this person
 * about this task again — whatever Slack's display name says — and it is how
 * an owned task is proven to be the presser's before their name is cleared off
 * it. Without it (an older caller) the pass is still recorded under the board
 * name, and an owned task can only be handed back by a presser whose name IS
 * the owner's: failing closed on someone else's work.
 */
export async function declineMarketingTask(input: {
  taskId: string
  /** Slack's display name; resolved to the board name here. */
  personName: string
  slackUserId?: string
}): Promise<MarketingSlackActionResult> {
  const person = await boardName(input)
  if (person === null) return { ok: false, message: COULD_NOT_READ_TEAM }
  const now = new Date()
  return toSlackActionResult(
    await passOnTask({
      taskId: input.taskId,
      personName: person,
      slackUserId: String(input.slackUserId || '').trim(),
      now,
      week: utcIsoWeekKey(now),
    }),
  )
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

/**
 * Record a decision made in Slack.
 *
 * The answer is written to humanResponse and the task leaves needsHuman, which
 * is what unblocks everything downstream of it. The question is deliberately
 * kept, so the record still reads as a question and its answer rather than an
 * answer floating on its own.
 */
export async function answerMarketingTask(input: {
  taskId: string
  answer: string
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
      humanResponse: input.answer,
      status: 'queued',
      lastOutcome: `Answered in Slack by ${input.personName}`,
      lastEvaluatedAt: new Date().toISOString(),
    })
    .commit()

  return { ok: true, taskTitle: task.title }
}
