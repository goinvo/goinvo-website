import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '@sanity/ui'
import type { SanityClient } from '@sanity/client'
import { formatMinutes } from '../../../lib/marketing/effort'
import { authenticatedMarketingRequest } from './authenticatedMarketingRequest'
import { OutreachCallSheet } from './OutreachCallSheet'

/**
 * The week, as decided.
 *
 * Everything else in the suite answers "what should we do?". This answers "what
 * are we doing THIS week, given the hours we actually have" — and, just as
 * importantly, what we are not doing and why. A plan that hides what it dropped
 * is not a plan, it is a filter.
 *
 * The numbers all come from the deterministic planner via /api/marketing/plan-week;
 * nothing is recomputed here, so the page and the record of the week agree.
 */

type PlanItem = {
  id: string
  title: string
  kind: string
  owner: string | null
  minutes: number
  estimateSource: 'explicit' | 'estimated'
  overdue: boolean
}

type PlanDecision = {
  id: string
  title: string
  question: string | null
  owner: string | null
  minutes: number
}

type PlanDeferral = {
  id: string
  title: string
  minutes: number
  reason: string
}

type WeekPlanResponse = {
  week: string
  weekStart: string
  weekEnd: string
  posture: string
  budgetMinutes: number
  plannedMinutes: number
  overCommitted: boolean
  theme: string | null
  rationale: string | null
  items: PlanItem[]
  decisions: PlanDecision[]
  deferred: PlanDeferral[]
  error?: string
}

const KIND_TONE: Record<string, { color: string; background: string }> = {
  outreach: { color: '#8fd4ff', background: 'rgba(76,150,214,.18)' },
  content: { color: '#f3c98b', background: 'rgba(200,140,50,.18)' },
  decision: { color: '#f0a8a0', background: 'rgba(190,80,70,.18)' },
  research: { color: '#c9b6f5', background: 'rgba(130,100,210,.18)' },
  measurement: { color: '#9fe0c4', background: 'rgba(60,160,120,.18)' },
}

function toneFor(kind: string) {
  return KIND_TONE[kind] || { color: '#c5ccda', background: 'rgba(120,130,150,.16)' }
}

function formatRange(start: string, end: string) {
  const from = new Date(`${start}T12:00:00`)
  const to = new Date(`${end}T12:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return `${start} – ${end}`
  const fmt = (date: Date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(from)} – ${fmt(to)}`
}

const styles = {
  panel: {
    background: 'rgba(19,22,31,.55)',
    border: '1px solid rgba(140,150,170,.22)',
    borderRadius: 12,
    padding: 20,
  } as const,
  muted: { color: '#98a1b5', margin: 0 } as const,
  button: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(140,150,170,.3)',
    background: 'transparent',
    color: '#e6eaf2',
    cursor: 'pointer',
    font: 'inherit',
  } as const,
}

export function WeeklyPlanWorkspace({
  proofClient,
  request = authenticatedMarketingRequest,
}: {
  /** Outreach-scoped client, so cookie-mode Studio can prove write access. */
  proofClient?: Pick<SanityClient, 'create' | 'delete'>
  request?: typeof authenticatedMarketingRequest
} = {}) {
  const toast = useToast()
  const [plan, setPlan] = useState<WeekPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [planning, setPlanning] = useState(false)

  const load = useCallback(
    async (replan: boolean) => {
      if (replan) setPlanning(true)
      else setLoading(true)
      try {
        // GET reads the week without writing; POST commits it. Routed through the
        // shared helper so both token-mode and cookie-mode Studio authenticate —
        // a bare fetch sends no session header and is simply rejected.
        const body = await request<WeekPlanResponse>(
          '/api/marketing/plan-week',
          undefined,
          replan ? 'POST' : 'GET',
          proofClient,
        )
        setPlan(body)
        if (replan) toast.push({ status: 'success', title: 'Week re-planned' })
      } catch (error) {
        toast.push({
          status: 'error',
          title: 'Could not plan the week',
          description: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setLoading(false)
        setPlanning(false)
      }
    },
    [toast, request, proofClient],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  const fill = useMemo(() => {
    if (!plan || plan.budgetMinutes <= 0) return 0
    return Math.min(100, Math.round((plan.plannedMinutes / plan.budgetMinutes) * 100))
  }, [plan])

  const deferredByReason = useMemo(() => {
    const groups = new Map<string, PlanDeferral[]>()
    for (const entry of plan?.deferred || []) {
      groups.set(entry.reason, [...(groups.get(entry.reason) || []), entry])
    }
    return [...groups.entries()]
  }, [plan])

  if (loading) {
    return (
      <section style={styles.panel}>
        <p style={styles.muted}>Working out the week…</p>
      </section>
    )
  }

  if (!plan) {
    return (
      <section style={styles.panel}>
        <h3 style={{ margin: '0 0 6px' }}>The week could not be planned.</h3>
        <p style={{ ...styles.muted, marginBottom: 14 }}>
          This usually means the operations dataset or the Sanity write token is not configured.
        </p>
        <button type="button" style={styles.button} onClick={() => void load(false)}>
          Try again
        </button>
      </section>
    )
  }

  const remaining = plan.budgetMinutes - plan.plannedMinutes

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <p style={{ ...styles.muted, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              {formatRange(plan.weekStart, plan.weekEnd)} · {plan.posture}
            </p>
            <h2 style={{ margin: '6px 0 4px', fontSize: 24 }}>{plan.theme || 'This week'}</h2>
            {plan.rationale && (
              <p style={{ ...styles.muted, maxWidth: '62ch', lineHeight: 1.5 }}>{plan.rationale}</p>
            )}
          </div>
          <button
            type="button"
            style={{ ...styles.button, opacity: planning ? 0.6 : 1 }}
            disabled={planning}
            onClick={() => void load(true)}
          >
            {planning ? 'Planning…' : 'Re-plan the week'}
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <strong>
              {formatMinutes(plan.plannedMinutes)} planned of {formatMinutes(plan.budgetMinutes)}
            </strong>
            <span style={styles.muted}>
              {plan.overCommitted
                ? `${formatMinutes(Math.abs(remaining))} over`
                : `${formatMinutes(remaining)} spare`}
            </span>
          </div>
          <div
            style={{ height: 10, borderRadius: 6, background: 'rgba(120,130,150,.2)', overflow: 'hidden' }}
            role="img"
            aria-label={`${formatMinutes(plan.plannedMinutes)} planned of ${formatMinutes(plan.budgetMinutes)}`}
          >
            <div
              style={{
                width: `${fill}%`,
                height: '100%',
                background: plan.overCommitted ? '#e0725f' : '#4dc4d6',
              }}
            />
          </div>
          <p style={{ ...styles.muted, fontSize: 12, marginTop: 8 }}>
            Set your weekly hours in Marketing Settings. The plan fits the work to that number
            instead of handing you everything at once.
          </p>
        </div>
      </section>

      {/* Directly under the theme, above the boards. The plan says what to do;
          this is the only block that lets you actually go and do it. */}
      <OutreachCallSheet />

      {plan.decisions.length > 0 && (
        <section style={{ ...styles.panel, borderColor: 'rgba(190,80,70,.35)' }}>
          <h3 style={{ margin: '0 0 4px' }}>Waiting on a person</h3>
          <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
            These are the ones that unblock everything else. Answer them and the rest of the queue
            moves.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {plan.decisions.map((decision) => (
              <article
                key={decision.id}
                style={{
                  border: '1px solid rgba(140,150,170,.2)',
                  borderRadius: 9,
                  padding: '12px 14px',
                  display: 'grid',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong>{decision.title}</strong>
                  <span style={{ ...styles.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {decision.owner || 'Unassigned'} · {formatMinutes(decision.minutes)}
                  </span>
                </div>
                {decision.question && (
                  <p style={{ ...styles.muted, fontSize: 13, lineHeight: 1.5 }}>{decision.question}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section style={styles.panel}>
        <h3 style={{ margin: '0 0 4px' }}>The work</h3>
        <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
          In the order to do it. Overdue first, then what is due, then what is worth getting ahead
          on.
        </p>
        {plan.items.length === 0 ? (
          <p style={styles.muted}>
            No work fitted this week — the decisions above are using the budget. Answering them is
            the fastest way to free it up.
          </p>
        ) : (
          <ol style={{ display: 'grid', gap: 10, margin: 0, paddingLeft: 20 }}>
            {plan.items.map((item) => {
              const tone = toneFor(item.kind)
              return (
                <li key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span>
                      <strong>{item.title}</strong>
                      {item.overdue && (
                        <span style={{ color: '#e0725f', fontSize: 12, marginLeft: 8 }}>overdue</span>
                      )}
                    </span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          color: tone.color,
                          background: tone.background,
                        }}
                      >
                        {item.kind}
                      </span>
                      <span style={{ ...styles.muted, fontSize: 12 }}>
                        {item.owner || 'Unassigned'} · {formatMinutes(item.minutes)}
                        {item.estimateSource === 'estimated' ? ' (est.)' : ''}
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {deferredByReason.length > 0 && (
        <section style={styles.panel}>
          <h3 style={{ margin: '0 0 4px' }}>Not this week</h3>
          <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
            Nothing is dropped silently. Each of these has a reason, so you can disagree with it.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            {deferredByReason.map(([reason, entries]) => (
              <div key={reason}>
                <p style={{ ...styles.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                  {reason} · {entries.length}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                  {entries.slice(0, 8).map((entry) => (
                    <li key={entry.id} style={{ fontSize: 13 }}>
                      {entry.title}{' '}
                      <span style={{ ...styles.muted, fontSize: 12 }}>({formatMinutes(entry.minutes)})</span>
                    </li>
                  ))}
                  {entries.length > 8 && (
                    <li style={{ ...styles.muted, fontSize: 12 }}>…and {entries.length - 8} more</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
