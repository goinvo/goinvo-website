import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useClient } from 'sanity'

import { clientForType } from '../../../lib/marketing/datasetRouting'
import { errorLine, formatSlackDay, LABEL, slackDayKey } from '../../../lib/marketing/marquetaStyle'
import { MARKETING_OPERATION_TYPE, type MarketingOperationPatch } from '../../../lib/marketing/operations'
import { isDecisionTask, MARKETING_TASK_QUERY_PARAM } from '../../../lib/marketing/taskLinks'
import { taskStatusWords } from '../../../lib/marketing/weeklyCheckIn'
import { authenticatedMarketingRequest } from './authenticatedMarketingRequest'

/**
 * "Marqueta sent you here, and this is what she wants."
 *
 * Slack deep-links a task straight to the view that owns it, but arriving on
 * the right screen is only half the job — the reason you came is still back in
 * Slack. This pins it to the top of the workspace: what needs doing, the
 * question to answer, and why it matters now.
 *
 * And it can act. A banner that only describes the task sends you hunting
 * for the one control that finishes it, which is the friction the link was
 * meant to remove. So it offers what the Slack card offers for the same state,
 * with the same words — Done, Stuck…, Unstuck, Reopen, or an answer box for a
 * decision — through the same guarded write the desk uses
 * (`/api/marketing/operations`, revision-checked, so a task somebody changed a
 * moment ago in Slack is never overwritten from a stale screen).
 *
 * It reads `?task=<id>` and removes that param once shown, so a refresh or a
 * shared URL does not resurrect a banner for work somebody finished last week.
 */

type FocusTask = {
  _id: string
  _rev?: string
  title?: string
  nextAction?: string
  humanQuestion?: string
  humanResponse?: string
  whyNow?: string
  kind?: string
  status?: string
  priority?: string
  ownerName?: string
  dueAt?: string
  blocker?: string
}

const FOCUS_TASK_QUERY = `*[_id == $id][0]{
  _id, _rev, title, nextAction, humanQuestion, humanResponse, whyNow,
  kind, status, priority, ownerName, dueAt, blocker
}`

const text = (value: unknown) => String(value ?? '').trim()

/** The most "What’s in the way" or an answer may say — the board's own field limits. */
export const TASK_BANNER_BLOCKER_MAX = 600
export const TASK_BANNER_ANSWER_MAX = 900

export type TaskBannerState = 'closed' | 'decision' | 'blocked' | 'open'
export type TaskBannerAction = 'done' | 'stuck' | 'unstuck' | 'reopen' | 'answer'

/**
 * Which of the card's shapes this task is in. A decision is one still waiting
 * for its answer (needsHuman with a real question) — the same rule the Slack
 * card and the planner use, so an answered decision is ordinary work again.
 */
export function taskBannerState(task: Pick<FocusTask, 'status' | 'kind' | 'humanQuestion'>): TaskBannerState {
  const status = text(task?.status)
  if (status === 'done' || status === 'dismissed') return 'closed'
  if (status === 'needsHuman' && isDecisionTask(task)) return 'decision'
  if (status === 'blocked') return 'blocked'
  return 'open'
}

/**
 * The actions on offer, leftmost first — the Slack card's for the same state
 * (§2.5): open work is finished or reported stuck, stuck work is finished or
 * unstuck, closed work reopens, and a decision is answered. Done stays the
 * leftmost wherever it appears, so it is in the same place on every card.
 */
export function taskBannerActions(task: Pick<FocusTask, 'status' | 'kind' | 'humanQuestion'>): TaskBannerAction[] {
  switch (taskBannerState(task)) {
    case 'closed':
      return ['reopen']
    case 'decision':
      return ['answer']
    case 'blocked':
      return ['done', 'unstuck']
    default:
      return ['done', 'stuck']
  }
}

/**
 * The one button styled as the one being asked for, or null for none — the
 * card's rule: at most one, leftmost, and never for reopening closed work
 * (the card has no green button there). While the Stuck form is open its Save
 * is the one being asked for, so Done steps down rather than show two.
 */
export function taskBannerPrimary(actions: TaskBannerAction[], stuckFormOpen = false): TaskBannerAction | null {
  const first = actions[0]
  if (!first || first === 'reopen' || stuckFormOpen) return null
  return first
}

/**
 * The write each action makes, as a patch for the operations route — or null
 * when the action needs words it was not given. Each is the Slack press's own
 * effect: Stuck records what is in the way, Unstuck puts the work back in
 * progress and clears it, Reopen brings closed work back as not started, and
 * an answer returns the decision to the queue with the answer on it.
 */
export function taskBannerPatch(
  action: TaskBannerAction,
  input: { blocker?: string; answer?: string } = {},
): { patch: MarketingOperationPatch; note: string } | null {
  switch (action) {
    case 'done':
      return { patch: { status: 'done' }, note: 'Marked done from the Studio.' }
    case 'stuck': {
      const blocker = text(input.blocker).slice(0, TASK_BANNER_BLOCKER_MAX)
      if (!blocker) return null
      return { patch: { status: 'blocked', blocker }, note: 'Marked stuck from the Studio.' }
    }
    case 'unstuck':
      return { patch: { status: 'working', blocker: '' }, note: 'Unstuck from the Studio.' }
    case 'reopen':
      return { patch: { status: 'queued', dismissedUntil: '' }, note: 'Reopened from the Studio.' }
    case 'answer': {
      const answer = text(input.answer).slice(0, TASK_BANNER_ANSWER_MAX)
      if (answer.length < 2) return null
      return {
        patch: { status: 'queued', humanResponse: answer, blocker: '' },
        note: 'The team answered the question from the Studio.',
      }
    }
    default:
      return null
  }
}

/** The day after a `YYYY-MM-DD` key. */
function nextDayKey(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

/** "overdue since Tue 22 Sep" / "due today" / "due tomorrow" / "due Fri 25 Sep" — the card's words. */
function dueWords(dueAt: string | undefined, now: Date): string {
  const due = slackDayKey(dueAt)
  const today = slackDayKey(now)
  if (!due || !today) return ''
  if (due < today) return `overdue since ${formatSlackDay(due, now)}`
  if (due === today) return 'due today'
  if (due === nextDayKey(today)) return 'due tomorrow'
  return `due ${formatSlackDay(due, now)}`
}

/** Status words that already say who has it, so "Nobody has it" would repeat them. */
const SAYS_WHO = new Set(['Nobody has it', 'Marqueta working', 'Needs someone', 'Needs a decision', 'Done', 'Dropped'])

/**
 * One line, in the Slack card's wording: "Urgent · Stuck · Juhan · overdue
 * since Tue 22 Sep". The status words are `taskStatusWords`, the function the
 * card and the desk's pill use, so the three never describe one task two ways.
 */
export function taskBannerMeta(task: FocusTask, now: Date): string {
  const words = taskStatusWords({
    status: task.status,
    kind: task.kind,
    humanQuestion: task.humanQuestion,
    ownerName: task.ownerName,
  })
  const owner = text(task.ownerName)
  const closed = taskBannerState(task) === 'closed'
  return [
    task.priority === 'urgent' || task.priority === 'high' ? 'Urgent' : '',
    words,
    owner || (SAYS_WHO.has(words) ? '' : 'Nobody has it'),
    closed ? '' : dueWords(task.dueAt, now),
  ]
    .filter(Boolean)
    .join(' · ')
}

const styles = {
  button: {
    minHeight: 44,
    border: '1px solid rgba(140,150,170,.35)',
    borderRadius: 7,
    padding: '8px 12px',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  primary: {
    minHeight: 44,
    border: '1px solid #007385',
    borderRadius: 7,
    padding: '8px 12px',
    background: '#007385',
    color: '#fff',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    minHeight: 76,
    boxSizing: 'border-box',
    border: '1px solid rgba(140,150,170,.35)',
    borderRadius: 7,
    padding: '8px 10px',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: 16,
    resize: 'vertical',
    marginTop: 4,
  },
} satisfies Record<string, CSSProperties>

export function TaskFocusBanner({
  request = authenticatedMarketingRequest,
  onSaved,
}: {
  request?: typeof authenticatedMarketingRequest
  /**
   * After a save, so the page under the banner can re-read: the desk and This
   * week would otherwise still show the task in the section it just left.
   */
  onSaved?: () => void
} = {}) {
  const baseClient = useClient({ apiVersion: '2024-01-01' })
  // Operations live in the private dataset; the workspace client would read
  // production and find nothing. The same client proves write access for the
  // cookie-mode Studio when the banner saves.
  const client = useMemo(() => clientForType(baseClient, MARKETING_OPERATION_TYPE), [baseClient])

  const [taskId, setTaskId] = useState<string | null>(null)
  const [task, setTask] = useState<FocusTask | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const [stuckOpen, setStuckOpen] = useState(false)
  const [blockerDraft, setBlockerDraft] = useState('')
  const [answerDraft, setAnswerDraft] = useState('')

  const loadTask = useCallback(
    (id: string) =>
      client.fetch<FocusTask | null>(FOCUS_TASK_QUERY, { id }).then((found) => {
        setTask(found)
        return found
      }),
    [client],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const requested = url.searchParams.get(MARKETING_TASK_QUERY_PARAM)
    if (!requested) return

    // Strip the param immediately: the banner is a one-time arrival cue, and a
    // copied URL should not re-announce a task days later. The history state
    // is passed through, not replaced: the Studio's router keeps its own there.
    url.searchParams.delete(MARKETING_TASK_QUERY_PARAM)
    window.history.replaceState(window.history.state, '', url.toString())
    setTaskId(requested)

    let cancelled = false
    client
      .fetch<FocusTask | null>(FOCUS_TASK_QUERY, { id: requested })
      .then((found) => {
        if (!cancelled) setTask(found)
      })
      .catch(() => {
        /* A banner is a nicety; failing to load one must not break the view. */
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const act = useCallback(
    async (action: TaskBannerAction) => {
      if (!task || saving) return
      const write = taskBannerPatch(action, { blocker: blockerDraft, answer: answerDraft })
      if (!write) return
      setSaving(true)
      setNotice('')
      setFailure('')
      try {
        const response = await request<{ item?: FocusTask }>(
          '/api/marketing/operations',
          { action: 'update', id: task._id, expectedRevision: task._rev || '', patch: write.patch, note: write.note },
          'POST',
          client,
        )
        // Replaced, not merged: a merge kept every field the write had just
        // removed (the blocker after Unstuck, the snooze after Reopen), so the
        // banner went on describing the task as it was.
        if (response.item) setTask(response.item)
        else if (taskId) await loadTask(taskId)
        setStuckOpen(false)
        setBlockerDraft('')
        setAnswerDraft('')
        // Slack messages are not live: a card already posted keeps its old
        // state until something redraws it, and saying so saves a confused
        // "but Slack still says…".
        setNotice('Saved — Slack’s card updates on its next post.')
        onSaved?.()
      } catch (error) {
        setFailure(errorLine('save that', error instanceof Error ? error.message : 'Try again in a moment.'))
        // Re-read, so the next press carries the task's current revision.
        if (taskId) void loadTask(taskId).catch(() => undefined)
      } finally {
        setSaving(false)
      }
    },
    [answerDraft, blockerDraft, client, loadTask, onSaved, request, saving, task, taskId],
  )

  const dismiss = useCallback(() => setDismissed(true), [])

  if (!task || dismissed) return null

  const now = new Date()
  const state = taskBannerState(task)
  const actions = taskBannerActions(task)
  const primary = taskBannerPrimary(actions, stuckOpen)
  // An answered question is no longer the thing to do: the answer is shown
  // instead, and the question stops being offered as the instruction.
  const answered = text(task.humanResponse) && task.status !== 'needsHuman' ? text(task.humanResponse) : ''
  const question = answered ? '' : text(task.humanQuestion)
  const instruction = task.nextAction || question || task.whyNow
  const title = text(task.title) || 'This task'

  const actionButton = (action: TaskBannerAction) => {
    const style = action === primary ? styles.primary : styles.button
    if (action === 'stuck') {
      return (
        <button
          type="button"
          key={action}
          style={style}
          disabled={saving}
          aria-expanded={stuckOpen}
          aria-controls="task-focus-stuck"
          onClick={() => setStuckOpen((open) => !open)}
        >
          {LABEL.STUCK}
        </button>
      )
    }
    const label = action === 'done' ? LABEL.DONE : action === 'unstuck' ? LABEL.UNSTUCK : LABEL.REOPEN
    return (
      <button type="button" key={action} style={style} disabled={saving} onClick={() => void act(action)}>
        {label}
      </button>
    )
  }

  return (
    <section
      aria-label={`Task from Slack: ${title}`}
      data-task-focus-banner="true"
      data-task-focus-state={state}
      style={{
        border: '1px solid rgba(79,179,165,.45)',
        borderLeft: '3px solid #4fb3a5',
        background: 'rgba(79,179,165,.08)',
        borderRadius: 4,
        padding: '12px 14px',
        marginBottom: 14,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 auto', display: 'grid', gap: 6 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: '#4fb3a5',
          }}
        >
          Marqueta sent you here
        </div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: '#98a1b5' }}>{taskBannerMeta(task, now)}</div>
        {state === 'blocked' && text(task.blocker) && (
          <div style={{ fontSize: 13.5, color: '#ffb07a' }}>In the way: {task.blocker}</div>
        )}
        {instruction && (
          <div style={{ fontSize: 13.5, color: '#c9d1e0', maxWidth: '82ch' }}>
            <span style={{ color: '#98a1b5' }}>
              {task.nextAction ? 'What needs doing: ' : question ? 'The question to answer: ' : 'Why now: '}
            </span>
            {instruction}
          </div>
        )}
        {answered && (
          <div style={{ fontSize: 13.5, color: '#c9d1e0', maxWidth: '82ch' }}>
            <span style={{ color: '#98a1b5' }}>Answered: </span>
            {answered}
          </div>
        )}

        {state === 'decision' ? (
          <div style={{ display: 'grid', gap: 8, maxWidth: '82ch' }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              Answer it here
              <textarea
                aria-label={`Answer for ${title}`}
                rows={3}
                maxLength={TASK_BANNER_ANSWER_MAX}
                style={styles.textarea}
                value={answerDraft}
                disabled={saving}
                placeholder="The decision, in your own words."
                onChange={(event) => setAnswerDraft(event.currentTarget.value)}
              />
            </label>
            <div>
              <button
                type="button"
                style={styles.primary}
                disabled={saving || answerDraft.trim().length < 2}
                onClick={() => void act('answer')}
              >
                {saving ? 'Saving…' : 'Save answer'}
              </button>
            </div>
          </div>
        ) : (
          <div role="group" aria-label={`Actions for ${title}`} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {actions.map(actionButton)}
          </div>
        )}

        {stuckOpen && state !== 'decision' && (
          <div id="task-focus-stuck" style={{ display: 'grid', gap: 8, maxWidth: '82ch' }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>
              What’s in the way
              <textarea
                aria-label={`What’s in the way of ${title}`}
                rows={3}
                maxLength={TASK_BANNER_BLOCKER_MAX}
                style={styles.textarea}
                value={blockerDraft}
                disabled={saving}
                placeholder="e.g. Need the case-study numbers before I can write it"
                onChange={(event) => setBlockerDraft(event.currentTarget.value)}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                style={styles.primary}
                disabled={saving || !blockerDraft.trim()}
                onClick={() => void act('stuck')}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" style={styles.button} disabled={saving} onClick={() => setStuckOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div role="status" aria-live="polite" style={{ fontSize: 12.5, color: '#7dd69e', minHeight: 0 }}>
          {notice}
        </div>
        {failure && (
          <div role="alert" style={{ fontSize: 12.5, color: '#d98a8a' }}>
            {failure}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 0,
          color: '#98a1b5',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          minWidth: 44,
          minHeight: 44,
          padding: 2,
        }}
      >
        ×
      </button>
    </section>
  )
}
