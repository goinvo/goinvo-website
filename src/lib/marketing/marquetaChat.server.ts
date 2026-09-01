/**
 * Answering somebody who spoke to Marqueta.
 *
 * Server-only: every answer is a read of the private dataset, or a write she
 * already knows how to make. No model call — a question about the runway must
 * be answered from the runway record or not at all, because a plausible wrong
 * number here is worse than "I don't know".
 */
import { getMarketingWriteClientFor } from './client'
import { estimateOperationMinutes } from './effort'
import { captureFromMessage } from './ideaCapture.server'
import { ideasNeedingReview } from './ideaCapture.server'
import { captureConfirmation, marquetaHelpText, parseMarquetaIntent } from './marquetaChat'
import { readRunway } from './runway.server'
import { parseAvailabilityCommand } from './availability'
import { setMarketingAvailability } from './slackActions.server'

const OPERATION_TYPE = 'marketingOperation'

type OpenTask = {
  title: string
  ownerName?: string
  suggestedOwner?: string
  kind?: string
  priority?: string
  estimatedMinutes?: number
}

function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

/** The week, as a person would ask about it. */
async function answerWeek(): Promise<string> {
  const client = getMarketingWriteClientFor(OPERATION_TYPE)
  const tasks = await client.fetch<OpenTask[]>(
    `*[_type == $type && status in ["queued", "working", "needsHuman"]]
       | order(coalesce(dueAt, "9999") asc)[0...40]{
         title, ownerName, suggestedOwner, kind, priority, estimatedMinutes
       }`,
    { type: OPERATION_TYPE },
  )
  if (!tasks.length) return 'Nothing open on the board — which is either very good news or a sign nobody has planned the week.'

  const minutes = tasks.reduce((sum, task) => sum + estimateOperationMinutes(task).minutes, 0)
  const unclaimed = tasks.filter((task) => !String(task.ownerName || '').trim())

  const lines = [
    `*${tasks.length} open*, about ${formatMinutes(minutes)} of work.`,
    `*${unclaimed.length} nobody has taken.*`,
  ]
  for (const task of unclaimed.slice(0, 5)) {
    const suggested = String(task.suggestedOwner || '').trim()
    lines.push(`• ${task.title}${suggested ? ` _(suggested: ${suggested})_` : ''}`)
  }
  if (unclaimed.length > 5) lines.push(`• …and ${unclaimed.length - 5} more`)
  return lines.join('\n')
}

/** The runway, stated as the number rather than the bin. */
async function answerRunway(): Promise<string> {
  const state = await readRunway()
  const lines = [state.summary]
  if (state.resolved.disagreement) lines.push(`_${state.resolved.disagreement}_`)
  if (state.checkIn.due) lines.push(`${state.checkIn.reason} ${state.checkIn.question}`)
  lines.push('_Tell me "we signed something" or set it in the Studio and the whole plan follows it._')
  return lines.join('\n')
}

async function answerIdeas(): Promise<string> {
  const pending = await ideasNeedingReview(10)
  if (!pending.length) return 'Nothing waiting on a yes or no — the board is clear.'
  return [
    `*${pending.length}* I caught that still need a yes or no:`,
    ...pending.map((idea) => `• ${idea.title}`),
    '_Judge them on the This week tab in the Studio._',
  ].join('\n')
}

/**
 * Reply to a message addressed to Marqueta.
 *
 * Returns the text to post, or null when there is nothing worth saying —
 * silence is a valid answer and better than an acknowledgement nobody needs.
 */
export async function answerMarqueta(input: {
  text: string
  personName: string
  slackUserId?: string
  channel: string
  ts: string
}): Promise<string | null> {
  const intent = parseMarquetaIntent(input.text)

  try {
    if (intent.kind === 'week') return await answerWeek()
    if (intent.kind === 'runway') return await answerRunway()
    if (intent.kind === 'ideas') return await answerIdeas()

    if (intent.kind === 'availability') {
      const parsed = parseAvailabilityCommand(intent.text, new Date().toISOString().slice(0, 10))
      if (!parsed) {
        return 'I could not tell which days you mean. Try "away 2026-09-01 2026-09-05".'
      }
      const result = await setMarketingAvailability({
        personName: input.personName,
        slackUserId: input.slackUserId || '',
        status: parsed.status,
        from: parsed.from,
        until: parsed.until,
        weeklyHours: parsed.weeklyHours,
      })
      return result.message || 'Noted.'
    }

    if (intent.kind === 'capture') {
      const result = await captureFromMessage({
        text: intent.text,
        personName: input.personName,
        channel: input.channel,
        ts: input.ts,
      })
      if (!result.ok) {
        // Only reachable when the classifier declined an EXPLICIT capture,
        // which it must not do — say so rather than swallowing it.
        return `I could not file that: ${result.message || 'it did not look like anything I keep.'}`
      }
      if (result.alreadyCaptured || result.mergedInto) return 'Already have that one.'
      const title = result.draft?.title || result.idea?.title || intent.text.slice(0, 80)
      return captureConfirmation({
        kind: result.kind === 'draft' ? 'draft' : 'idea',
        title,
        explicit: intent.explicit,
      })
    }

    return marquetaHelpText()
  } catch (error) {
    console.error('[marqueta] answering failed', error)
    return 'Something went wrong looking that up. The Studio still has the real answer.'
  }
}
