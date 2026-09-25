import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@sanity/ui'
import type { SanityClient } from '@sanity/client'
import { useCurrentUser } from 'sanity'
import { formatMinutes } from '../../../lib/marketing/effort'
import type { FollowUpParts } from '../../../lib/marketing/followUps'
import { countLabel, errorLine, LABEL, slackDayKey, weekOfLabel } from '../../../lib/marketing/marquetaStyle'
import { isDecisionTask, type StudioContactAction, type StudioFocus } from '../../../lib/marketing/taskLinks'
import { taskStatusWords } from '../../../lib/marketing/weeklyCheckIn'
import { authenticatedMarketingRequest } from './authenticatedMarketingRequest'
import { OutreachCallSheet } from './OutreachCallSheet'
import { StudioVizScope } from './StudioVizScope'
import { WeekGlance, type WeekGlanceData } from '../../../components/marketing-viz/WeekGlance'
import { GLANCE_SLOTS } from '../../../lib/marketing/viz/weekGlance'
import type { StoredPosture } from '../../../lib/marketing/runway'
import { TASK_BANNER_ANSWER_MAX, taskBannerPatch } from './TaskFocusBanner'

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
 *
 * It is also where most of Slack's links land, so it has to show what the
 * message showed, in the same words: the follow-ups the check-in listed, the
 * status words the cards use, what is in the way of stuck work, and — for
 * "+2 more on This week" — exactly one person's share (`?owner=`). Each of
 * those landings is read once by the tool shell and handed down as a prop.
 */

type PlanRowStatus = { status?: string; blocker?: string | null; owner: string | null; kind?: string }

export type PlanItem = PlanRowStatus & {
  id: string
  title: string
  kind: string
  minutes: number
  estimateSource: 'explicit' | 'estimated'
  overdue: boolean
}

export type PlanDecision = PlanRowStatus & {
  id: string
  title: string
  question: string | null
  minutes: number
  /** The record's revision, so an answer given here is refused if it changed since. */
  rev?: string | null
}

export type PlanDeferral = PlanRowStatus & {
  id: string
  title: string
  minutes: number
  reason: string
  /** When finished work was finished — the "done this week" line counts by it. */
  completedAt?: string | null
}

export type WeekPlanResponse = {
  week: string
  weekStart: string
  weekEnd: string
  posture: string
  /**
   * "Rebuild — 4.5 months of certain runway (to 11 Jan 2027)", from the read
   * that chose the posture; null when that read failed (the bare posture is
   * shown instead).
   */
  runway?: string | null
  /** "Outreach this week: 3 touches (2 people) · …"; null when the contacts could not be read. */
  pulse?: string | null
  budgetMinutes: number
  plannedMinutes: number
  overCommitted: boolean
  reserved?: { minutes: number; label: string } | null
  /** `dueDay` is the studio's day (YYYY-MM-DD) the follow-up falls on, for the follow-up strip. */
  followUps?: Array<FollowUpParts & { dueDay?: string | null }>
  /** The pulse and the runway as numbers, for the week-at-a-glance charts; null when their read failed. */
  outreachStats?: WeekGlanceData['outreachStats']
  runwayStored?: StoredPosture | null
  theme: string | null
  rationale: string | null
  items: PlanItem[]
  decisions: PlanDecision[]
  deferred: PlanDeferral[]
  error?: string
}

export type CaughtIdea = {
  _id: string
  title: string
  summary?: string
  source?: string
  relatedUrl?: string
  category?: string
  _createdAt?: string
}

/**
 * A task's kind wears the same colour as its share of the hours in the meter
 * above (weekGlance's fixed slots), so "outreach" is one colour everywhere on
 * the page — the dot carries it, the word stays ink.
 */
function kindSlot(kind: string): number {
  if (kind === 'outreach') return GLANCE_SLOTS.outreach
  if (kind === 'decision') return GLANCE_SLOTS.decisions
  return GLANCE_SLOTS.other
}

/** "overdue", said with a status mark rather than red text alone. */
function OverdueMark({ label = 'overdue' }: { label?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, marginLeft: 8, color: 'var(--card-fg-color)' }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--viz-serious)' }} />
      {label}
    </span>
  )
}

const ownerKey = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Everybody with a share of the week — tasks, decisions, deferred work or a
 * follow-up — once each, alphabetically. The owner a link asked for is always
 * included, so "+2 more on This week" never lands on a filter nobody can see
 * is on.
 */
export function weekOwners(plan: Pick<WeekPlanResponse, 'items' | 'decisions' | 'deferred' | 'followUps'>, requested = ''): string[] {
  const names = new Map<string, string>()
  const add = (value: unknown) => {
    const name = String(value ?? '').replace(/\s+/g, ' ').trim()
    if (name && !names.has(ownerKey(name))) names.set(ownerKey(name), name)
  }
  for (const row of [...(plan.items || []), ...(plan.decisions || []), ...(plan.deferred || [])]) add(row?.owner)
  for (const followUp of plan.followUps || []) add(followUp?.ownerName)
  add(requested)
  return [...names.values()].sort((left, right) => left.localeCompare(right))
}

/**
 * One person's share of the week: their tasks, decisions, deferred work and
 * follow-ups, and nothing that nobody owns. '' is everyone. Case-insensitive,
 * because "juhan" on a contact and "Juhan" on the board are one person.
 */
export function filterWeekByOwner<T extends Pick<WeekPlanResponse, 'items' | 'decisions' | 'deferred' | 'followUps'>>(
  plan: T,
  owner: string,
): Pick<WeekPlanResponse, 'items' | 'decisions' | 'deferred'> & { followUps: FollowUpParts[] } {
  const key = ownerKey(owner)
  const mine = (value: unknown) => !key || ownerKey(value) === key
  return {
    items: (plan.items || []).filter((row) => mine(row.owner)),
    decisions: (plan.decisions || []).filter((row) => mine(row.owner)),
    deferred: (plan.deferred || []).filter((row) => mine(row.owner)),
    followUps: (plan.followUps || []).filter((row) => mine(row.ownerName)),
  }
}

/** Status words that already say nobody has it, so "Nobody has it" would repeat them. */
const SAYS_NOBODY = new Set(['Nobody has it', 'Marqueta working', 'Needs someone'])

/**
 * "Juhan · In progress · 30m" / "Nobody has it · 30m (est.)" / "Needs
 * someone · 20m": who has it and where it stands, in `taskStatusWords` — the
 * Slack card's words.
 */
export function workMeta(row: PlanRowStatus & { minutes: number; estimateSource?: string; question?: string | null }): string {
  const owner = String(row.owner ?? '').trim()
  const words = taskStatusWords({ status: row.status, kind: row.kind, humanQuestion: row.question || undefined, ownerName: owner })
  // "Not started" says nothing a list of planned work does not; everything else does.
  const status = words === 'Not started' ? '' : words
  const who = owner || (SAYS_NOBODY.has(status) ? '' : 'Nobody has it')
  const minutes = row.minutes > 0 ? `${formatMinutes(row.minutes)}${row.estimateSource === 'estimated' ? ' (est.)' : ''}` : ''
  return [who, status, minutes].filter(Boolean).join(' · ')
}

/**
 * The planner's decisions, split into the real ones and the owner searches.
 *
 * The planner files every needsHuman task as a decision, including the ones
 * Slack's "Not me" leaves ("Eric passed on this — who should pick it up?").
 * Those want a person, not an answer: the card offers them "I’ll take it",
 * the digest lists them under "Needs an owner", and the status words call
 * them "Needs someone". Shown under "Decisions waiting" they read as a
 * question nobody could answer, and `?focus=decisions` landed on them. The
 * rule is `isDecisionTask`, the one the card, the banner and the digest use.
 */
export function splitWeekDecisions(decisions: PlanDecision[]): { decisions: PlanDecision[]; needsSomeone: PlanDecision[] } {
  const real: PlanDecision[] = []
  const needsSomeone: PlanDecision[] = []
  for (const row of decisions || []) {
    const decision = isDecisionTask({ kind: row.kind, status: row.status || 'needsHuman', humanQuestion: row.question || undefined })
    ;(decision ? real : needsSomeone).push(row)
  }
  return { decisions: real, needsSomeone }
}

const DAY_MS = 86_400_000

/**
 * The second line of a "Caught in Slack" row: who said it, when, and a way
 * back to the message — "Slack — Juhan · 2 days ago". The permalink is only
 * used when it is an https link; anything else is left off rather than linked.
 */
export function caughtIdeaMeta(idea: CaughtIdea, now: Date): { line: string; url: string } {
  const source = String(idea.source ?? '').replace(/,\s*not yet reviewed\s*$/i, '').trim()
  const created = slackDayKey(idea._createdAt)
  const today = slackDayKey(now)
  let age = ''
  if (created && today) {
    const days = Math.round((Date.parse(today) - Date.parse(created)) / DAY_MS)
    age = days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
  }
  const url = /^https:\/\//i.test(String(idea.relatedUrl ?? '').trim()) ? String(idea.relatedUrl).trim() : ''
  return { line: [source, age].filter(Boolean).join(' · '), url }
}

/**
 * Why a deferred row is not this week, in the page's words.
 *
 * The planner's 'blocked' covers three different things — work that is
 * stuck, work waiting on somebody else, and anything with leftover text in its
 * blocker field — and only the first is "Stuck" (§2.3's status words). So the
 * row's STATUS decides: waiting work is "waiting on someone", and the rest of
 * the planner's 'blocked' is "something in the way", with what it says.
 */
function deferralReason(entry: PlanDeferral): string {
  if (entry.status === 'waiting') return 'waiting on someone'
  if (entry.reason === 'blocked') return 'something in the way'
  return entry.reason
}

/**
 * The deferred list, the way the page shows it:
 *
 *   stuck      status `blocked` only, shown with what is in the way;
 *   doneCount  work DONE this week (on or after `weekStart`, when given) — a
 *              line, since the history is the desk's job. Dropped work is not
 *              counted as done, and last month's work is not this week's;
 *   byReason   everything else, grouped by why it is not this week.
 */
export function groupDeferred(
  deferred: PlanDeferral[],
  weekStart?: string,
): {
  stuck: PlanDeferral[]
  doneCount: number
  byReason: Array<[string, PlanDeferral[]]>
} {
  const stuck: PlanDeferral[] = []
  let doneCount = 0
  const byReason = new Map<string, PlanDeferral[]>()
  const since = slackDayKey(weekStart)
  for (const entry of deferred || []) {
    if (entry.status === 'blocked') {
      stuck.push(entry)
    } else if (entry.status === 'done') {
      const finished = slackDayKey(entry.completedAt)
      if (!since || (finished && finished >= since)) doneCount += 1
    } else if (entry.status !== 'dismissed' && entry.reason !== 'already done') {
      const reason = deferralReason(entry)
      byReason.set(reason, [...(byReason.get(reason) || []), entry])
    }
  }
  return { stuck, doneCount, byReason: [...byReason.entries()] }
}

/** Where each `?focus=` lands. Prefixed, so a generic word cannot collide with another id in the Studio. */
export const WEEK_FOCUS_SECTION_ID: Record<StudioFocus, string> = {
  caught: 'week-caught',
  followUps: 'week-follow-ups',
  decisions: 'week-decisions',
}

type WeekSections = { decisions: unknown[]; followUps: unknown[]; caught: unknown[] }

/**
 * The section a `?focus=` landing should scroll to, or null while that
 * section is not on the page (its data has not loaded, or it has nothing in
 * it) — the page waits rather than scrolling somewhere else.
 */
export function weekFocusTarget(focus: StudioFocus | undefined | null, sections: WeekSections): string | null {
  if (!focus || !(focus in WEEK_FOCUS_SECTION_ID)) return null
  return (sections[focus] || []).length > 0 ? WEEK_FOCUS_SECTION_ID[focus] : null
}

const styles = {
  panel: {
    background: 'var(--card-bg-color)',
    border: '1px solid var(--card-border-color)',
    borderRadius: 12,
    padding: 20,
    scrollMarginTop: 16,
  } as const,
  muted: { color: 'var(--card-muted-fg-color)', margin: 0 } as const,
  button: {
    minHeight: 44,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid var(--card-border-color)',
    background: 'transparent',
    color: 'var(--card-fg-color)',
    cursor: 'pointer',
    font: 'inherit',
  } as const,
  primary: {
    minHeight: 44,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #007385',
    background: '#007385',
    color: '#fff',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
  } as const,
  textarea: {
    width: '100%',
    minHeight: 76,
    boxSizing: 'border-box',
    border: '1px solid var(--card-border-color)',
    borderRadius: 8,
    padding: '8px 10px',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: 16,
    resize: 'vertical',
    marginTop: 4,
  } as const,
}

export function WeeklyPlanWorkspace({
  proofClient,
  request = authenticatedMarketingRequest,
  initialOwner = '',
  focus,
  onOpenOutreachContact,
  refreshToken = 0,
}: {
  /** Outreach-scoped client, so cookie-mode Studio can prove write access. */
  proofClient?: Pick<SanityClient, 'create' | 'delete'>
  request?: typeof authenticatedMarketingRequest
  /** `?owner=` from a Slack link: start filtered to this person. */
  initialOwner?: string
  /** `?focus=` from a Slack link: scroll to this section once it has loaded. */
  focus?: StudioFocus
  /** Prep / Log it… on a follow-up: open that contact on Outreach. */
  onOpenOutreachContact?: (contactId: string, action: StudioContactAction) => void
  /** Bumped when a task changed elsewhere on the page (the banner): re-read the week quietly. */
  refreshToken?: number
} = {}) {
  const toast = useToast()
  // Who is judging an idea or answering a decision, by first name — the way
  // Slack records the same presses, so the record says who, not "Someone".
  const personName = String(useCurrentUser()?.name ?? '').trim().split(/\s+/)[0] || ''
  const [plan, setPlan] = useState<WeekPlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [planning, setPlanning] = useState(false)
  const [owner, setOwner] = useState(() => String(initialOwner || '').trim())
  // Ideas Marqueta caught in the marketing channel and nobody has judged.
  const [pendingIdeas, setPendingIdeas] = useState<CaughtIdea[]>([])
  const focusedRef = useRef(false)
  const seenRefreshRef = useRef(refreshToken)
  // The decision being answered here, if any: one open form at a time.
  const [answering, setAnswering] = useState<string | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')
  const [answerSaving, setAnswerSaving] = useState(false)
  const [answerError, setAnswerError] = useState('')

  const loadIdeas = useCallback(async () => {
    try {
      const body = await request<{ pending: CaughtIdea[] }>('/api/marketing/ideas/review', undefined, 'GET', proofClient)
      setPendingIdeas(body.pending || [])
    } catch {
      // A missing review list must never stop the week rendering. It is a
      // prompt, not the plan.
      setPendingIdeas([])
    }
  }, [request, proofClient])

  const judgeIdea = useCallback(
    async (id: string, keep: boolean) => {
      // Removed from the list immediately: the judgement is the whole
      // interaction, and watching a row sit there implies it did not take.
      setPendingIdeas((current) => current.filter((idea) => idea._id !== id))
      try {
        await request('/api/marketing/ideas/review', { id, keep, ...(personName ? { personName } : {}) }, 'POST', proofClient)
        toast.push({
          status: 'success',
          // Kept ideas are not on this page any more; say where they went.
          title: keep ? 'Kept — it’s in the idea backlog on the SEO tab.' : 'Binned — noted as not an idea.',
        })
      } catch (error) {
        toast.push({
          status: 'error',
          title: errorLine('save that', ''),
          description: error instanceof Error ? error.message : String(error),
        })
        void loadIdeas()
      }
    },
    [request, proofClient, toast, loadIdeas, personName],
  )

  const load = useCallback(
    /**
     * 'initial' shows the loading state, 'replan' commits the week (POST), and
     * 'refresh' re-reads it in place — after a task changed on this page, the
     * week should move under you, not blank out while it does.
     */
    async (mode: 'initial' | 'replan' | 'refresh') => {
      if (mode === 'replan') setPlanning(true)
      else if (mode === 'initial') setLoading(true)
      try {
        // GET reads the week without writing; POST commits it. Routed through the
        // shared helper so both token-mode and cookie-mode Studio authenticate —
        // a bare fetch sends no session header and is simply rejected.
        const body = await request<WeekPlanResponse>(
          '/api/marketing/plan-week',
          undefined,
          mode === 'replan' ? 'POST' : 'GET',
          proofClient,
        )
        setPlan(body)
        if (mode === 'replan') toast.push({ status: 'success', title: 'Week re-planned' })
      } catch (error) {
        toast.push({
          status: 'error',
          title: mode === 'refresh' ? 'Couldn’t refresh the week' : 'Couldn’t plan the week',
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
    void load('initial')
    void loadIdeas()
  }, [load, loadIdeas])

  // Something on the page changed a task (the banner saved): re-read in place.
  useEffect(() => {
    if (refreshToken === seenRefreshRef.current) return
    seenRefreshRef.current = refreshToken
    void load('refresh')
  }, [refreshToken, load])

  const owners = useMemo(() => (plan ? weekOwners(plan, owner) : []), [plan, owner])
  const shown = useMemo(() => (plan ? filterWeekByOwner(plan, owner) : null), [plan, owner])
  const split = useMemo(() => splitWeekDecisions(shown?.decisions || []), [shown])
  const deferred = useMemo(() => groupDeferred(shown?.deferred || [], plan?.weekStart), [shown, plan])

  // A `?focus=` landing scrolls once, as soon as its section is on the page.
  // Ideas load separately from the plan, so this waits for whichever it needs.
  useEffect(() => {
    if (focusedRef.current || !plan || typeof document === 'undefined') return
    const id = weekFocusTarget(focus, {
      decisions: split.decisions,
      followUps: shown?.followUps || [],
      caught: pendingIdeas,
    })
    const target = id ? document.getElementById(id) : null
    if (!target) return
    focusedRef.current = true
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus, plan, shown, split, pendingIdeas])

  /**
   * An answer given on the page: the banner's own write (`taskBannerPatch`),
   * through the guarded operations route with the revision the week was read
   * at — so a decision somebody answered in Slack a minute ago is refused
   * rather than overwritten, and the week is re-read either way.
   */
  const saveAnswer = useCallback(
    async (decision: PlanDecision) => {
      const write = taskBannerPatch('answer', { answer: answerDraft })
      if (!write || !decision.rev || answerSaving) return
      setAnswerSaving(true)
      setAnswerError('')
      try {
        await request(
          '/api/marketing/operations',
          {
            action: 'update',
            id: decision.id,
            expectedRevision: decision.rev,
            patch: write.patch,
            note: personName ? `${personName} answered the question on This week.` : write.note,
          },
          'POST',
          proofClient,
        )
        setAnswering(null)
        setAnswerDraft('')
        toast.push({ status: 'success', title: 'Saved — Slack’s card updates on its next post.' })
      } catch (error) {
        setAnswerError(errorLine('save that answer', error instanceof Error ? error.message : 'Try again in a moment.'))
      } finally {
        setAnswerSaving(false)
        void load('refresh')
      }
    },
    [answerDraft, answerSaving, load, personName, proofClient, request, toast],
  )

  if (loading) {
    return (
      <section style={styles.panel}>
        <p style={styles.muted}>Working out the week…</p>
      </section>
    )
  }

  if (!plan || !shown) {
    return (
      <section style={styles.panel}>
        <h3 style={{ margin: '0 0 6px' }}>The week could not be planned.</h3>
        <p style={{ ...styles.muted, marginBottom: 14 }}>
          This usually means the operations dataset or the Sanity write token is not configured.
        </p>
        <button type="button" style={styles.button} onClick={() => void load('initial')}>
          Try again
        </button>
      </section>
    )
  }

  const now = new Date()
  // The whole team's week, whoever the list below is filtered to: the hours
  // are one budget, and a filtered meter would look like spare time.
  const glance: WeekGlanceData = {
    ...plan,
    weekStart: plan.weekStart,
    followUps: (plan.followUps || []).map((row) => ({ ...row, dueDay: row.dueDay ?? null })),
    outreachStats: plan.outreachStats ?? null,
    runwayStored: plan.runwayStored ?? null,
  }
  // The planned work, then the tasks somebody passed on in Slack: planned for
  // the week too, and waiting only for somebody to take them ("Needs someone").
  const work: Array<PlanRowStatus & { id: string; title: string; kind: string; minutes: number; overdue?: boolean; estimateSource?: string; question?: string | null }> = [
    ...shown.items,
    ...split.needsSomeone.map((row) => ({ ...row, kind: row.kind || 'task' })),
  ]
  const filtered = Boolean(owner.trim())
  const whose = filtered ? `${owner.trim()}’s` : ''

  return (
    <StudioVizScope style={{ color: 'inherit' }}>
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ ...styles.muted, fontSize: 13 }}>
              {weekOfLabel(plan.weekStart, now)} · {plan.runway || plan.posture}
            </p>
            <h2 style={{ margin: '6px 0 4px', fontSize: 24 }}>{plan.theme || 'This week'}</h2>
            {plan.pulse && <p style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.5 }}>{plan.pulse}</p>}
            {plan.rationale && (
              <p style={{ ...styles.muted, maxWidth: '62ch', lineHeight: 1.5 }}>{plan.rationale}</p>
            )}
          </div>
          <button
            type="button"
            style={{ ...styles.button, opacity: planning ? 0.6 : 1 }}
            disabled={planning}
            onClick={() => void load('replan')}
          >
            {planning ? 'Planning…' : 'Re-plan the week'}
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <WeekGlance data={glance} now={now} />
          {plan.reserved && (
            <p style={{ ...styles.muted, fontSize: 12, marginTop: 12 }}>
              Includes {plan.reserved.label} — kept free for people who already answered.
            </p>
          )}
          <p style={{ ...styles.muted, fontSize: 12, marginTop: 8 }}>
            Set your weekly hours in Marketing Settings. The plan fits the work to that number
            instead of handing you everything at once.
          </p>
        </div>

        {owners.length > 0 && (
          <div
            role="group"
            aria-label="Show whose work"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}
          >
            {['', ...owners].map((name) => {
              const active = ownerKey(name) === ownerKey(owner)
              return (
                <button
                  type="button"
                  key={name || 'everyone'}
                  aria-pressed={active}
                  style={{
                    ...styles.button,
                    borderColor: active ? 'var(--viz-series-1)' : 'var(--card-border-color)',
                    boxShadow: active ? 'inset 0 0 0 1px var(--viz-series-1)' : undefined,
                    fontWeight: active ? 650 : 400,
                  }}
                  onClick={() => setOwner(name)}
                >
                  {name || 'Everyone'}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Above the call sheet: these people already answered, and a follow-up
          owed is the warmest call of the week. Worded exactly as the check-in
          words them, from the same function. */}
      {shown.followUps.length > 0 && (
        <section id={WEEK_FOCUS_SECTION_ID.followUps} style={styles.panel} aria-labelledby="week-follow-ups-title">
          <h3 id="week-follow-ups-title" style={{ margin: '0 0 4px' }}>Follow-ups due</h3>
          <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
            People who already said something back and are waiting to hear from us. Overdue first.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {shown.followUps.map((followUp) => (
              <li
                key={followUp.contactId}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  borderTop: '1px solid var(--card-border-color)',
                  paddingTop: 10,
                }}
              >
                <span style={{ flex: '1 1 320px', display: 'grid', gap: 2, minWidth: 0 }}>
                  <strong>Follow up with {followUp.who}</strong>
                  <span style={{ fontSize: 13, color: followUp.overdue ? 'var(--card-fg-color)' : 'var(--card-muted-fg-color)' }}>
                    {followUp.overdue ? (
                      <span aria-hidden style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: 'var(--viz-serious)', marginRight: 6 }} />
                    ) : null}
                    {[followUp.due, followUp.last, followUp.temperature].filter(Boolean).join(' · ')}
                  </span>
                  <span style={{ ...styles.muted, fontSize: 12 }}>{followUp.ownerName || 'Nobody has it'}</span>
                </span>
                {onOpenOutreachContact && (
                  <span style={{ display: 'flex', gap: 8 }}>
                    {/* The accessible name starts with the visible label (WCAG 2.5.3),
                        so "click Log it" works by voice; the name after it says
                        which of the rows it is. */}
                    <button
                      type="button"
                      style={styles.button}
                      aria-label={`${LABEL.PREP} — ${followUp.who}`}
                      onClick={() => onOpenOutreachContact(followUp.contactId, 'prep')}
                    >
                      {LABEL.PREP}
                    </button>
                    <button
                      type="button"
                      style={styles.button}
                      aria-label={`${LABEL.LOG} — ${followUp.who}`}
                      onClick={() => onOpenOutreachContact(followUp.contactId, 'log')}
                    >
                      {LABEL.LOG}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Directly under the theme, above the boards. The plan says what to do;
          this is the only block that lets you actually go and do it. */}
      <OutreachCallSheet
        onPrepContact={onOpenOutreachContact ? (contactId: string) => onOpenOutreachContact(contactId, 'prep') : undefined}
      />

      {split.decisions.length > 0 && (
        <section
          id={WEEK_FOCUS_SECTION_ID.decisions}
          style={{ ...styles.panel, borderLeft: '3px solid var(--viz-series-3)' }}
          aria-labelledby="week-decisions-title"
        >
          <h3 id="week-decisions-title" style={{ margin: '0 0 4px' }}>Decisions waiting</h3>
          <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
            These are the ones that unblock everything else. Answer them and the rest of the queue
            moves.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {split.decisions.map((decision) => {
              const open = answering === decision.id
              return (
                <article
                  key={decision.id}
                  style={{
                    border: '1px solid var(--card-border-color)',
                    borderRadius: 9,
                    padding: '12px 14px',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{decision.title}</strong>
                    <span style={{ ...styles.muted, fontSize: 12 }}>
                      {decision.owner || 'Nobody has it'} · {formatMinutes(decision.minutes)}
                    </span>
                  </div>
                  {decision.question && (
                    <p style={{ ...styles.muted, fontSize: 13, lineHeight: 1.5 }}>{decision.question}</p>
                  )}
                  {/* Answer… opens the banner's answer box, here: This week is
                      where a decision link lands, so it has to be where one
                      can be answered. */}
                  {decision.rev && !open && (
                    <div>
                      <button
                        type="button"
                        style={styles.primary}
                        onClick={() => {
                          setAnswering(decision.id)
                          setAnswerDraft('')
                          setAnswerError('')
                        }}
                      >
                        {LABEL.ANSWER}
                      </button>
                    </div>
                  )}
                  {open && (
                    <div style={{ display: 'grid', gap: 8, maxWidth: '82ch' }}>
                      <label style={{ fontSize: 13, fontWeight: 700 }}>
                        Answer it here
                        <textarea
                          aria-label={`Answer for ${decision.title}`}
                          rows={3}
                          maxLength={TASK_BANNER_ANSWER_MAX}
                          style={styles.textarea}
                          value={answerDraft}
                          disabled={answerSaving}
                          placeholder="The decision, in your own words."
                          onChange={(event) => setAnswerDraft(event.currentTarget.value)}
                        />
                      </label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          style={styles.primary}
                          disabled={answerSaving || answerDraft.trim().length < 2}
                          onClick={() => void saveAnswer(decision)}
                        >
                          {answerSaving ? 'Saving…' : 'Save answer'}
                        </button>
                        <button type="button" style={styles.button} disabled={answerSaving} onClick={() => setAnswering(null)}>
                          Cancel
                        </button>
                      </div>
                      {answerError && (
                        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: 'var(--card-fg-color)', borderLeft: '3px solid var(--viz-critical)', paddingLeft: 8 }}>
                          {answerError}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section style={styles.panel}>
        <h3 style={{ margin: '0 0 4px' }}>The work</h3>
        <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
          In the order to do it. Overdue first, then what is due, then what is worth getting ahead
          on.
        </p>
        {work.length === 0 ? (
          <p style={styles.muted}>
            {filtered
              ? `None of ${whose} work is planned this week.`
              : 'No work fitted this week — the decisions above are using the budget. Answering them is the fastest way to free it up.'}
          </p>
        ) : (
          <ol style={{ display: 'grid', gap: 10, margin: 0, paddingLeft: 20 }}>
            {work.map((item) => {
              return (
                <li key={item.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span>
                      <strong>{item.title}</strong>
                      {item.overdue && <OverdueMark />}
                    </span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: `var(--viz-series-${kindSlot(item.kind) + 1})` }} />
                        {item.kind}
                      </span>
                      <span style={{ ...styles.muted, fontSize: 12 }}>{workMeta(item)}</span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      {pendingIdeas.length > 0 && (
        <section id={WEEK_FOCUS_SECTION_ID.caught} style={styles.panel} aria-labelledby="week-caught-title">
          <h3 id="week-caught-title" style={{ margin: '0 0 4px' }}>Caught in Slack — are these ideas?</h3>
          <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
            I thought these sounded like somebody proposing work. That is my guess, not theirs —
            so nothing counts as an idea until you say so.
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {pendingIdeas.map((idea) => {
              const meta = caughtIdeaMeta(idea, now)
              return (
                <li
                  key={idea._id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--card-border-color)',
                    paddingTop: 10,
                  }}
                >
                  <span style={{ flex: '1 1 320px', display: 'grid', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{idea.title}</span>
                    {(meta.line || meta.url) && (
                      <span style={{ ...styles.muted, fontSize: 12 }}>
                        {meta.line}
                        {meta.url && (
                          <>
                            {meta.line ? ' · ' : ''}
                            <a href={meta.url} target="_blank" rel="noreferrer" style={{ color: 'var(--viz-series-1)' }}>
                              view the message in Slack ↗
                            </a>
                          </>
                        )}
                      </span>
                    )}
                  </span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button type="button" style={styles.button} onClick={() => void judgeIdea(idea._id, true)}>
                      {LABEL.IDEA_KEEP}
                    </button>
                    <button type="button" style={styles.button} onClick={() => void judgeIdea(idea._id, false)}>
                      {LABEL.IDEA_DISCARD}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {deferred.stuck.length > 0 && (
        <section style={{ ...styles.panel, borderLeft: '3px solid var(--viz-serious)' }} aria-labelledby="week-stuck-title">
          <h3 id="week-stuck-title" style={{ margin: '0 0 4px' }}>Stuck</h3>
          <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
            Not planned until what is in the way moves. If you can move it, that frees the work.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            {deferred.stuck.map((entry) => (
              <li key={entry.id} style={{ fontSize: 13 }}>
                <strong>{entry.title}</strong>{' '}
                <span style={{ ...styles.muted, fontSize: 12 }}>
                  ({[entry.owner || 'Nobody has it', formatMinutes(entry.minutes)].join(' · ')})
                </span>
                <div style={{ color: 'var(--card-fg-color)', fontSize: 12.5, marginTop: 2 }}>
                  {entry.blocker ? `In the way: ${entry.blocker}` : 'Nobody wrote down what’s in the way.'}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {deferred.byReason.length > 0 && (
        <section style={styles.panel}>
          <h3 style={{ margin: '0 0 4px' }}>Not this week</h3>
          <p style={{ ...styles.muted, fontSize: 13, marginBottom: 14 }}>
            Nothing is dropped silently. Each of these has a reason, so you can disagree with it.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            {deferred.byReason.map(([reason, entries]) => (
              <div key={reason}>
                <p style={{ ...styles.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                  {reason} · {entries.length}
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
                  {entries.slice(0, 8).map((entry) => (
                    <li key={entry.id} style={{ fontSize: 13 }}>
                      {entry.title}{' '}
                      <span style={{ ...styles.muted, fontSize: 12 }}>({formatMinutes(entry.minutes)})</span>
                      {reason === 'something in the way' && entry.blocker && (
                        <div style={{ ...styles.muted, fontSize: 12, marginTop: 2 }}>{`In the way: ${entry.blocker}`}</div>
                      )}
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

      {deferred.doneCount > 0 && (
        <p style={{ ...styles.muted, fontSize: 13 }}>
          {countLabel(deferred.doneCount, 'task')} done this week — history is on the desk (Dashboard)
        </p>
      )}
    </div>
    </StudioVizScope>
  )
}
