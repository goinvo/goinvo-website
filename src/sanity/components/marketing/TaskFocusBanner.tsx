import { useCallback, useEffect, useMemo, useState } from 'react'
import { useClient } from 'sanity'

import { clientForType } from '../../../lib/marketing/datasetRouting'
import { MARKETING_OPERATION_TYPE } from '../../../lib/marketing/operations'
import { MARKETING_TASK_QUERY_PARAM } from '../../../lib/marketing/taskLinks'

/**
 * "Marqueta sent you here, and this is what she wants."
 *
 * Slack can now deep-link a task straight to the view that owns it, but arriving
 * on the right screen is only half the job — the reason you came is still back
 * in Slack. This pins it to the top of the workspace: what needs doing, the
 * question to answer, and why it matters now.
 *
 * It reads `?task=<id>` and removes that param once shown, so a refresh or a
 * shared URL does not resurrect a banner for work somebody finished last week.
 */

type FocusTask = {
  _id: string
  title?: string
  nextAction?: string
  humanQuestion?: string
  whyNow?: string
  kind?: string
  status?: string
  ownerName?: string
}

export function TaskFocusBanner() {
  const baseClient = useClient({ apiVersion: '2024-01-01' })
  // Operations live in the private dataset; the workspace client would read
  // production and find nothing.
  const client = useMemo(
    () => clientForType(baseClient, MARKETING_OPERATION_TYPE),
    [baseClient],
  )

  const [task, setTask] = useState<FocusTask | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const taskId = url.searchParams.get(MARKETING_TASK_QUERY_PARAM)
    if (!taskId) return

    // Strip the param immediately: the banner is a one-time arrival cue, and a
    // copied URL should not re-announce a task days later.
    url.searchParams.delete(MARKETING_TASK_QUERY_PARAM)
    window.history.replaceState({}, '', url.toString())

    let cancelled = false
    client
      .fetch<FocusTask | null>(
        `*[_id == $id][0]{_id, title, nextAction, humanQuestion, whyNow, kind, status, ownerName}`,
        { id: taskId },
      )
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

  const dismiss = useCallback(() => setDismissed(true), [])

  if (!task || dismissed) return null

  const instruction = task.nextAction || task.humanQuestion || task.whyNow

  return (
    <div
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
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            color: '#4fb3a5',
            marginBottom: 4,
          }}
        >
          Marqueta sent you here
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{task.title}</div>
        {instruction && (
          <div style={{ fontSize: 13.5, color: '#c9d1e0', maxWidth: '82ch' }}>
            <span style={{ color: '#98a1b5' }}>
              {task.nextAction
                ? 'What needs doing: '
                : task.humanQuestion
                  ? 'The question to answer: '
                  : 'Why now: '}
            </span>
            {instruction}
          </div>
        )}
        {task.status === 'needsHuman' && (
          <div style={{ fontSize: 12, color: '#c08a6a', marginTop: 6 }}>
            This one is waiting on a person — it blocks whatever comes after it.
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
          padding: 2,
        }}
      >
        ×
      </button>
    </div>
  )
}
