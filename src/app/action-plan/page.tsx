import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, previewToken, projectId } from '@/sanity/env'
import { FOLLOW_UP_STATUSES, OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import {
  isMarketingPlanConfigured,
  MARKETING_PLAN_SESSION_COOKIE,
  verifyMarketingPlanSession,
} from '@/lib/marketing/marketingPlanAuth'
import {
  buildPlanCalendarCells,
  composeCallScript,
  composeEmailTemplates,
  EXEC_PLAN_CALENDAR_PREFIX,
  EXEC_PLAN_OP_PREFIX,
  groupNextTwoWeeks,
  mergePlanEntries,
  parsePlanMonth,
  phaseProgress,
  PLAN_END,
  PLAN_PHASES,
  PLAN_START,
  planMonthNav,
  planPhaseForSourceKey,
  type PlanContentItem,
  type PlanEvidence,
  type PlanFollowUp,
  type PlanOffer,
  type PlanOperation,
  type ScriptContact,
} from '@/lib/marketing/executionPlan'
import { toDateInputValue } from '@/lib/marketing/dates'

// ─────────────────────────────────────────────────────────────────────────────
// GoInvo — Execution Plan (Sep–Nov 2026)
//
// The third gated internal page: /marketing-plan says WHAT and WHY,
// /outreach-plan says WHO and HOW — this page says WHEN. It renders the
// 12-week plan from live CMS documents (operations in the private outreach
// dataset, content items on the production calendar, follow-ups on contacts),
// so checking work off in the Studio is what updates the plan.
//
// Route: /action-plan (server component; unlisted; noindex). Gated by the same
// MARKETING_PLAN_KEY session as its siblings.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Gated and unlisted, but unlisted is not the same as noindexed: a crawler
// that finds the URL still indexes the gate. Say it explicitly.
export const metadata: Metadata = {
  title: 'Execution Plan — GoInvo Internal',
  robots: { index: false, follow: false },
}

const INK = '#1d1b1a'
const ACCENT = '#d94d2f'
const TEAL = '#007385'

let outreachClient: SanityClient | null = null
let outreachResolved = false
function getOutreachClient(): SanityClient | null {
  if (outreachResolved) return outreachClient
  outreachResolved = true
  if (!projectId || !previewToken) return (outreachClient = null)
  outreachClient = createClient({
    projectId,
    dataset: OUTREACH_DATASET,
    apiVersion,
    token: previewToken,
    useCdn: false,
    perspective: 'published',
  })
  return outreachClient
}


type OutreachData = {
  totals: {
    contacts: number
    researched: number
    briefed: number
    interactions: number
    inMotion: number
  }
  followUps: PlanFollowUp[]
  planOps: PlanOperation[]
  offers: PlanOffer[]
  scriptContacts: ScriptContact[]
  evidence: PlanEvidence[]
}

const OUTREACH_QUERY = `{
  "totals": {
    "contacts": count(*[_type == "marketingContact"]),
    "researched": count(*[_type == "marketingContact" && defined(researchedAt)]),
    "briefed": count(*[_type == "marketingContact" && defined(callBrief)]),
    "interactions": math::sum(*[_type == "marketingContact"]{"n": count(coalesce(interactions, []))}.n),
    "inMotion": count(*[_type == "marketingContact" && status in ["contacted","responded","meeting","opportunity"]])
  },
  "followUps": *[_type == "marketingContact" && defined(followUpAt) && status in $followUpStatuses]{
    _id, name, organization, status, followUpAt, nextStep
  },
  "planOps": *[_type == "marketingOperation" && string::startsWith(sourceKey, $opPrefix)]{
    _id, title, status, priority, kind, ownerName, dueAt, blocker, humanQuestion, nextAction, summary, sourceKey
  },
  "offers": *[_type == "marketingOffer" && status == "active"] | order(coalesce(order, 100) asc){
    key, title, oneLiner, description, priceBand, idealBuyer, proofPoints
  },
  "scriptContacts": *[_type == "marketingContact" && defined(researchSuggestedSegment) && defined(suggestedOpener)]{
    researchSuggestedSegment, suggestedOpener, suggestedOfferKey,
    "evidenceIds": relevantEvidence[].evidenceId
  },
  "evidence": *[_type == "marketingWorkEvidence"]{
    _id, title, client, segments, businessOutcomes, highlights[]{ metric, detail }
  }
}`

const CONTENT_QUERY = `*[_type == "marketingCalendarItem" && string::startsWith(_id, $calPrefix)]{
  _id, title, status, publishAt, contentType, channel, brief
}`

const EMPTY_OUTREACH: OutreachData = {
  totals: { contacts: 0, researched: 0, briefed: 0, interactions: 0, inMotion: 0 },
  followUps: [],
  planOps: [],
  offers: [],
  scriptContacts: [],
  evidence: [],
}

const WINDOW_START_MS = new Date(`${PLAN_START}T12:00:00`).getTime()
const WINDOW_END_MS = new Date(`${PLAN_END}T12:00:00`).getTime()
function windowPercent(dateKey: string): number {
  const time = new Date(`${dateKey}T12:00:00`).getTime()
  const ratio = (time - WINDOW_START_MS) / (WINDOW_END_MS - WINDOW_START_MS)
  return Math.max(0, Math.min(100, ratio * 100))
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  working: 'In progress',
  needsHuman: 'Needs a decision',
  waiting: 'Waiting',
  blocked: 'Blocked',
  scheduled: 'Scheduled',
  done: 'Done',
  dismissed: 'Dismissed',
  idea: 'Idea',
  drafting: 'Drafting',
  review: 'In review',
  published: 'Published',
  canceled: 'Canceled',
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] || status
}

function formatDay(dateKey: string): string {
  if (!dateKey) return '—'
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="ap-stat">
      <div className="ap-stat-value">{value}</div>
      <div className="ap-stat-label">{label}</div>
    </div>
  )
}

export default async function ActionPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; denied?: string }>
}) {
  const configured = isMarketingPlanConfigured()
  const session = (await cookies()).get(MARKETING_PLAN_SESSION_COOKIE)?.value
  const unlocked = configured && verifyMarketingPlanSession(session)
  const params = await searchParams

  if (!unlocked) {
    const denied = params.denied === '1'
    return (
      <main className="ap-gate">
        <div className="ap-gate-card">
          <p className="ap-eyebrow">GoInvo · Internal</p>
          <h1>Execution Plan</h1>
          {configured ? (
            <>
              <p>This document is restricted. Enter the access key to continue.</p>
              <form method="post" action="/api/marketing/plan-session">
                <input type="hidden" name="next" value="/action-plan" />
                <input type="password" name="key" placeholder="Access key" aria-label="Access key" required />
                <button type="submit">View the plan</button>
              </form>
              {denied && <p role="alert" className="ap-gate-error">That access key was not accepted.</p>}
            </>
          ) : (
            <p>Access is not configured on this deployment. Set <code>MARKETING_PLAN_KEY</code> to enable it.</p>
          )}
        </div>
        <PlanStyles />
      </main>
    )
  }

  const now = new Date()
  const outreach = getOutreachClient()
  // Calendar items move with the split, so both halves of this page now read
  // the same private dataset; the separate production client is gone.
  const production = outreach
  const [data, contentItems] = await Promise.all([
    outreach
      ? outreach
          .fetch<OutreachData>(OUTREACH_QUERY, {
            followUpStatuses: FOLLOW_UP_STATUSES,
            opPrefix: EXEC_PLAN_OP_PREFIX,
          })
          .catch(() => EMPTY_OUTREACH)
      : Promise.resolve(EMPTY_OUTREACH),
    production
      ? production
          .fetch<PlanContentItem[]>(CONTENT_QUERY, { calPrefix: EXEC_PLAN_CALENDAR_PREFIX })
          .catch(() => [] as PlanContentItem[])
      : Promise.resolve([] as PlanContentItem[]),
  ])

  const todayKey = toDateInputValue(now)
  const entries = mergePlanEntries({
    operations: data.planOps,
    contentItems,
    followUps: data.followUps,
    now,
  })

  const month = parsePlanMonth(params.month, now)
  const cells = buildPlanCalendarCells(month, now)
  const nav = planMonthNav(month)
  const weekGroups = groupNextTwoWeeks(entries, now)

  const planOpsDone = data.planOps.filter((op) => op.status === 'done').length
  const planOpsTotal = data.planOps.filter((op) => op.status !== 'dismissed').length
  const followUpsOverdue = data.followUps.filter((f) => {
    const key = toDateInputValue(f.followUpAt)
    return Boolean(key) && key < todayKey
  }).length

  const gateOps = data.planOps
    .filter((op) => planPhaseForSourceKey(op.sourceKey) === 'gate')
    .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''))
  const askOps = data.planOps
    .filter((op) => op.status === 'needsHuman')
    .sort((a, b) => (a.dueAt || '').localeCompare(b.dueAt || ''))

  const leadMagnetGate = data.planOps.find(
    (op) => op.sourceKey === `${EXEC_PLAN_OP_PREFIX}gate/lead-magnet-approval`,
  )

  const segmentCounts = new Map<string, number>()
  for (const contact of data.scriptContacts) {
    const segment = contact.researchSuggestedSegment
    if (segment) segmentCounts.set(segment, (segmentCounts.get(segment) || 0) + 1)
  }
  const callScripts = [...segmentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([segment]) => composeCallScript(segment, data.scriptContacts, data.offers, data.evidence))
    .filter((script): script is NonNullable<typeof script> => Boolean(script))
  const emailTemplates = composeEmailTemplates(data.offers)

  const weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <main className="ap-page">
      <header className="ap-header">
        <p className="ap-eyebrow">
          GoInvo · Internal · {now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <h1>Execution plan — September to November</h1>
        <p className="ap-lede">
          The strategy has a calendar now. Every action below is a live CMS document — operations in
          the private outreach dataset, content on the marketing calendar, follow-ups on the contacts
          themselves. Check work off in the Studio and this page updates.
        </p>
        <nav className="ap-siblings" aria-label="Related internal documents">
          <a href="/marketing-plan">Strategy deck</a>
          <span aria-hidden="true">·</span>
          <a href="/outreach-plan">Warm-network brief</a>
        </nav>
      </header>

      {/* ── Where we stand ─────────────────────────────────────── */}
      <section className="ap-section">
        <h2>Where we stand</h2>
        <div className="ap-stats">
          <Stat value={data.totals.contacts.toLocaleString()} label="contacts in the CMS" />
          <Stat value={data.totals.researched} label="researched" />
          <Stat value={data.totals.briefed} label="with a call brief" />
          <Stat value={data.totals.interactions} label="interactions logged" />
          <Stat value={data.totals.inMotion} label="conversations in motion" />
          <Stat
            value={`${data.followUps.length}${followUpsOverdue ? ` (${followUpsOverdue} overdue)` : ''}`}
            label="follow-ups scheduled"
          />
          <Stat value={`${planOpsDone} / ${planOpsTotal}`} label="plan actions done" />
        </div>
        {leadMagnetGate && (
          <p className="ap-note">
            Lead magnet: <strong>{statusLabel(leadMagnetGate.status)}</strong>
            {leadMagnetGate.status !== 'done' && leadMagnetGate.dueAt
              ? ` — approval due ${formatDay(toDateInputValue(leadMagnetGate.dueAt))}, and phase 2 builds nothing until then.`
              : ' — approved; phase 2 ship steps are unblocked.'}
          </p>
        )}
      </section>

      {/* ── Timeline ───────────────────────────────────────────── */}
      <section className="ap-section">
        <h2>The twelve weeks</h2>
        <div className="ap-timeline">
          <div className="ap-timeline-months">
            {['2026-09-01', '2026-10-01', '2026-11-01'].map((key) => (
              <span key={key} style={{ left: `${windowPercent(key)}%` }}>
                {new Date(`${key}T12:00:00`).toLocaleDateString('en-US', { month: 'long' })}
              </span>
            ))}
          </div>
          {PLAN_PHASES.map((phase) => {
            const progress = phaseProgress(phase.key, data.planOps, now)
            const left = windowPercent(phase.startsOn)
            const width = Math.max(windowPercent(phase.endsOn) - left, 4)
            return (
              <div key={phase.key} className="ap-phase-row">
                <div className="ap-phase-meta">
                  <span className="ap-phase-title">{phase.title}</span>
                  <span className="ap-phase-progress">
                    {progress.done}/{progress.total} done
                    {progress.overdue > 0 ? ` · ${progress.overdue} overdue` : ''}
                  </span>
                </div>
                <div className="ap-phase-track">
                  <div className={`ap-phase-bar ap-phase-${phase.key}`} style={{ left: `${left}%`, width: `${width}%` }}>
                    <div className="ap-phase-fill" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
                <p className="ap-phase-summary">{phase.summary}</p>
              </div>
            )
          })}
          {gateOps.length > 0 && (
            <div className="ap-gates-row">
              <div className="ap-phase-meta">
                <span className="ap-phase-title">Decision gates</span>
              </div>
              <div className="ap-phase-track ap-gates-track">
                {gateOps.map((gate) => {
                  const dateKey = toDateInputValue(gate.dueAt)
                  const overdue = Boolean(dateKey) && dateKey < todayKey && gate.status !== 'done'
                  return (
                    <span
                      key={gate._id}
                      className={`ap-gate-marker ${gate.status === 'done' ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}`}
                      style={{ left: `${windowPercent(dateKey || PLAN_START)}%` }}
                      title={`${gate.title} — ${formatDay(dateKey)} (${statusLabel(gate.status)})`}
                    />
                  )
                })}
              </div>
              <p className="ap-phase-summary">
                {gateOps.map((gate) => `${formatDay(toDateInputValue(gate.dueAt))}: ${gate.title.replace(/^Gate: /, '')}`).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Month calendar ─────────────────────────────────────── */}
      <section className="ap-section">
        <div className="ap-cal-head">
          <h2>{nav.label}</h2>
          <div className="ap-cal-nav">
            {nav.prev ? <a href={`/action-plan?month=${nav.prev}`}>← Previous</a> : <span>← Previous</span>}
            {nav.next ? <a href={`/action-plan?month=${nav.next}`}>Next →</a> : <span>Next →</span>}
          </div>
        </div>
        <div className="ap-cal-grid" role="grid">
          {weekdayHeaders.map((day) => (
            <div key={day} className="ap-cal-weekday">{day}</div>
          ))}
          {cells.map((cell) => {
            const dayEntries = entries.get(cell.dateKey) || []
            return (
              <div
                key={cell.dateKey}
                className={`ap-cal-cell ${cell.inMonth ? '' : 'is-outside'} ${cell.isToday ? 'is-today' : ''}`}
              >
                <span className="ap-cal-daynum">{cell.date.getDate()}</span>
                {dayEntries.map((entry) => (
                  <span
                    key={`${entry.kind}-${entry.id}`}
                    className={`ap-chip ap-chip-${entry.kind} ${entry.done ? 'is-done' : ''} ${entry.overdue ? 'is-overdue' : ''}`}
                    title={`${entry.title}${entry.detail ? ` — ${entry.detail}` : ''} (${statusLabel(entry.status)})`}
                  >
                    {entry.kind === 'followUp' && entry.detail
                      ? `${entry.title} — ${entry.detail}`
                      : entry.title}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
        <p className="ap-note ap-legend">
          <span className="ap-chip ap-chip-operation">Plan action</span>
          <span className="ap-chip ap-chip-content">Content</span>
          <span className="ap-chip ap-chip-followUp">Contact follow-up</span>
        </p>
      </section>

      {/* ── Next two weeks ─────────────────────────────────────── */}
      <section className="ap-section">
        <h2>The next two weeks</h2>
        {weekGroups.length === 0 ? (
          <p className="ap-note">Nothing scheduled in the next two weeks.</p>
        ) : (
          weekGroups.map((group) => (
            <div key={group.weekStartKey} className="ap-week">
              <h3>{group.label}</h3>
              <div className="ap-table-wrap">
                <table className="ap-table">
                  <thead>
                    <tr><th>Due</th><th>Action</th><th>Type</th><th>Owner</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {group.entries.map((entry) => (
                      <tr key={`${entry.kind}-${entry.id}`} className={entry.overdue ? 'is-overdue' : ''}>
                        <td className="ap-nowrap">{formatDay(entry.dateKey)}</td>
                        <td>
                          <strong>{entry.title}</strong>
                          {entry.detail && <span className="ap-detail">{entry.detail}</span>}
                        </td>
                        <td className="ap-muted">
                          {entry.kind === 'operation' ? 'Plan action' : entry.kind === 'content' ? 'Content' : 'Follow-up'}
                        </td>
                        <td className="ap-muted">{entry.owner || '—'}</td>
                        <td>
                          <span className={`ap-status ap-status-${entry.status}`}>
                            {entry.overdue ? 'Overdue · ' : ''}{statusLabel(entry.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ── Supporting documents ───────────────────────────────── */}
      <section className="ap-section ap-docs">
        <h2>Supporting documents</h2>
        <p className="ap-note">
          Composed live from the CMS — edits to offers, openers, and work evidence appear here
          immediately. Print this page to take the scripts into a call.
        </p>

        {callScripts.length > 0 && (
          <>
            <h3 className="ap-doc-heading">Call scripts by segment</h3>
            <div className="ap-scripts">
              {callScripts.map((script) => (
                <article key={script.segment} className="ap-doc-card">
                  <header className="ap-doc-head">
                    <h4>{script.segmentLabel}</h4>
                    <span className="ap-count">{script.contactCount} researched {script.contactCount === 1 ? 'contact' : 'contacts'}</span>
                  </header>
                  <ol className="ap-script-steps">
                    <li>
                      <strong>Open with their world.</strong>
                      {script.openerExamples.length > 0 ? (
                        <>
                          {' '}The researched openers set the register:
                          <ul>
                            {script.openerExamples.map((opener, index) => (
                              <li key={index}><em>“{opener}”</em></li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        ' Lead with what their organization has publicly announced.'
                      )}
                    </li>
                    <li>
                      <strong>Ask the pre-mortem question.</strong> {script.premortemQuestion}
                    </li>
                    {script.evidenceBullets.length > 0 && (
                      <li>
                        <strong>Show one piece of evidence</strong> — the most-matched for this segment:
                        <ul>
                          {script.evidenceBullets.map((bullet, index) => (
                            <li key={index}>{bullet}</li>
                          ))}
                        </ul>
                      </li>
                    )}
                    {script.offer && (
                      <li>
                        <strong>If it fits, name the offer.</strong> {script.offer.title}
                        {script.offer.oneLiner ? ` — ${script.offer.oneLiner}` : ''}
                        {script.offer.priceBand ? ` (${script.offer.priceBand})` : ''}
                      </li>
                    )}
                    <li>
                      <strong>Make the ask.</strong> {script.ask}
                    </li>
                  </ol>
                </article>
              ))}
            </div>
          </>
        )}

        <h3 className="ap-doc-heading">Email templates</h3>
        <div className="ap-templates">
          {emailTemplates.map((template) => (
            <article key={template.key} className="ap-doc-card">
              <header className="ap-doc-head">
                <h4>{template.title}</h4>
              </header>
              <p className="ap-subject"><span>Subject:</span> {template.subject}</p>
              <pre className="ap-email-body">{template.body}</pre>
            </article>
          ))}
        </div>

        {data.offers.length > 0 && (
          <>
            <h3 className="ap-doc-heading">Offer one-pagers</h3>
            <div className="ap-offers">
              {data.offers.map((offer) => (
                <article key={offer.key} className="ap-doc-card">
                  <header className="ap-doc-head">
                    <h4>{offer.title}</h4>
                    <span className="ap-pill">{offer.priceBand?.trim() || 'Priced per engagement'}</span>
                  </header>
                  {offer.oneLiner && <p className="ap-offer-line">{offer.oneLiner}</p>}
                  {offer.description && <p className="ap-offer-desc">{offer.description}</p>}
                  {offer.idealBuyer && (
                    <p className="ap-offer-meta"><span>Ideal buyer:</span> {offer.idealBuyer}</p>
                  )}
                  {offer.proofPoints && (
                    <p className="ap-offer-meta"><span>Proof:</span> {offer.proofPoints}</p>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Decision gates & asks ──────────────────────────────── */}
      {askOps.length > 0 && (
        <section className="ap-section ap-asks">
          <h2>Decisions this plan is waiting on</h2>
          <ul>
            {askOps.map((op) => {
              const dateKey = toDateInputValue(op.dueAt)
              const overdue = Boolean(dateKey) && dateKey < todayKey
              return (
                <li key={op._id}>
                  <div className="ap-ask-head">
                    <strong>{op.title.replace(/^Gate: /, '')}</strong>
                    <span className={`ap-ask-due ${overdue ? 'is-overdue' : ''}`}>
                      {op.ownerName ? `${op.ownerName} · ` : ''}{formatDay(dateKey)}{overdue ? ' · overdue' : ''}
                    </span>
                  </div>
                  {op.humanQuestion && <p>{op.humanQuestion}</p>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <footer className="ap-footer">
        <p>
          Restricted GoInvo internal document · every action reads live from the CMS · mark work
          done in Studio → Marketing (Outreach operations, Calendar) and this page follows.
        </p>
      </footer>

      <PlanStyles />
    </main>
  )
}

function PlanStyles() {
  return (
    <style>{`
      .ap-page, .ap-gate { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: ${INK}; background: #fdfcfa; }
      .ap-page { max-width: 1080px; margin: 0 auto; padding: 56px 24px 96px; line-height: 1.6; }
      .ap-eyebrow { margin: 0 0 10px; color: ${TEAL}; font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .ap-header { border-bottom: 2px solid ${INK}; padding-bottom: 28px; margin-bottom: 40px; }
      .ap-header h1 { font-size: clamp(2.1rem, 5vw, 3rem); line-height: 1.05; letter-spacing: -.02em; margin: 0 0 14px; font-weight: 300; }
      .ap-lede { font-size: 1.12rem; max-width: 64ch; margin: 0 0 14px; color: #4a453f; }
      .ap-siblings { display: flex; gap: 10px; font-size: .9rem; }
      .ap-siblings a { color: ${TEAL}; }
      .ap-section { margin-bottom: 52px; }
      .ap-section h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -.01em; margin: 0 0 18px; }
      .ap-section h3 { font-size: 1.1rem; font-weight: 600; margin: 22px 0 10px; }
      .ap-note { color: #6f6a64; font-size: .95rem; max-width: 72ch; }
      .ap-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
      .ap-stat { border: 1px solid #e7e2db; padding: 14px 16px; background: #fff; }
      .ap-stat-value { font-size: 1.6rem; font-weight: 700; letter-spacing: -.02em; color: ${ACCENT}; }
      .ap-stat-label { font-size: .82rem; color: #6f6a64; margin-top: 2px; }

      /* Timeline */
      .ap-timeline { border: 1px solid #e7e2db; background: #fff; padding: 26px 22px 18px; }
      .ap-timeline-months { position: relative; height: 20px; margin-bottom: 10px; border-bottom: 1px solid #e7e2db; }
      .ap-timeline-months span { position: absolute; top: 0; transform: translateX(0); font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6f6a64; }
      .ap-phase-row, .ap-gates-row { margin-bottom: 16px; }
      .ap-phase-meta { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px; }
      .ap-phase-title { font-weight: 600; font-size: .95rem; }
      .ap-phase-progress { font-size: .8rem; color: #6f6a64; }
      .ap-phase-track { position: relative; height: 18px; background: #f4f1ec; border-radius: 9px; }
      .ap-phase-bar { position: absolute; top: 0; height: 100%; border-radius: 9px; overflow: hidden; background: #e5dfd6; }
      .ap-phase-fill { height: 100%; background: ${TEAL}; opacity: .85; }
      .ap-phase-phase1 .ap-phase-fill { background: ${ACCENT}; }
      .ap-phase-phase2 .ap-phase-fill { background: ${TEAL}; }
      .ap-phase-phase3 .ap-phase-fill { background: #4a6b48; }
      .ap-phase-summary { margin: 6px 0 0; font-size: .84rem; color: #6f6a64; }
      .ap-gates-track { background: transparent; }
      .ap-gate-marker { position: absolute; top: 2px; width: 14px; height: 14px; background: #fff; border: 2.5px solid ${ACCENT}; transform: translateX(-50%) rotate(45deg); }
      .ap-gate-marker.is-done { background: ${ACCENT}; }
      .ap-gate-marker.is-overdue { border-color: #a12820; background: #a12820; }

      /* Calendar */
      .ap-cal-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
      .ap-cal-nav { display: flex; gap: 18px; font-size: .92rem; }
      .ap-cal-nav a { color: ${TEAL}; font-weight: 600; }
      .ap-cal-nav span { color: #c6c0b8; }
      /* minmax(0,1fr): a bare 1fr floors at the widest nowrap chip, blowing the
         columns apart and scrolling the page sideways. */
      .ap-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); border: 1px solid #e7e2db; border-width: 0 0 1px 1px; background: #fff; }
      .ap-cal-weekday { border: 1px solid #e7e2db; border-width: 1px 1px 0 0; padding: 6px 8px; font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #6f6a64; background: #faf8f4; }
      .ap-cal-cell { border: 1px solid #e7e2db; border-width: 1px 1px 0 0; min-height: 84px; padding: 6px; display: flex; flex-direction: column; gap: 3px; }
      .ap-cal-cell.is-outside { background: #faf8f4; }
      .ap-cal-cell.is-outside .ap-cal-daynum { color: #c6c0b8; }
      .ap-cal-cell.is-today { box-shadow: inset 0 0 0 2px ${ACCENT}; }
      .ap-cal-daynum { font-size: .78rem; font-weight: 700; color: #6f6a64; }
      .ap-chip { display: block; font-size: .68rem; line-height: 1.25; padding: 2px 6px; border-radius: 3px; border-left: 3px solid transparent; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
      .ap-chip-operation { background: #fbeae5; border-left-color: ${ACCENT}; color: #7a2d1a; }
      .ap-chip-content { background: #e3f0f2; border-left-color: ${TEAL}; color: #114e58; }
      .ap-chip-followUp { background: #f1efeb; border-left-color: #a9a294; color: #4a453f; }
      .ap-chip.is-done { opacity: .5; text-decoration: line-through; }
      .ap-chip.is-overdue { outline: 1px solid #a12820; }
      .ap-legend { display: flex; gap: 8px; align-items: center; margin-top: 10px; }
      .ap-legend .ap-chip { display: inline-block; }

      /* Week tables */
      .ap-week h3 { margin: 18px 0 8px; }
      .ap-table-wrap { overflow-x: auto; }
      .ap-table { width: 100%; border-collapse: collapse; font-size: .93rem; background: #fff; border: 1px solid #e7e2db; }
      .ap-table th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: #6f6a64; border-bottom: 2px solid ${INK}; padding: 8px 12px; }
      .ap-table td { border-bottom: 1px solid #e7e2db; padding: 10px 12px; vertical-align: top; }
      .ap-table tr.is-overdue td { background: #fdf3f1; }
      .ap-nowrap { white-space: nowrap; }
      .ap-detail { display: block; color: #6f6a64; font-size: .84rem; }
      .ap-muted { color: #4a453f; }
      .ap-status { font-size: .8rem; font-weight: 600; }
      .ap-status-done { color: #2e7d4f; }
      .ap-status-needsHuman { color: ${ACCENT}; }

      /* Supporting documents */
      .ap-doc-heading { border-bottom: 1px solid #e7e2db; padding-bottom: 6px; }
      .ap-scripts, .ap-templates, .ap-offers { display: grid; gap: 14px; }
      .ap-doc-card { border: 1px solid #e7e2db; background: #fff; padding: 18px 20px; }
      .ap-doc-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
      .ap-doc-head h4 { margin: 0; font-size: 1.05rem; }
      .ap-count { color: #6f6a64; font-size: .85rem; }
      .ap-script-steps { padding-left: 20px; display: grid; gap: 8px; margin: 0; }
      .ap-script-steps li { max-width: 74ch; color: #4a453f; }
      .ap-script-steps ul { padding-left: 18px; margin: 4px 0 0; }
      .ap-subject { margin: 0 0 8px; font-size: .92rem; }
      .ap-subject span { font-weight: 700; color: #6f6a64; }
      .ap-email-body { white-space: pre-wrap; font-family: inherit; font-size: .92rem; color: #4a453f; background: #faf8f4; border: 1px dashed #e7e2db; padding: 14px 16px; margin: 0; }
      .ap-pill { border: 1px solid ${INK}; border-radius: 999px; padding: 3px 11px; font-size: .74rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; }
      .ap-offer-line { margin: 0 0 8px; font-weight: 600; }
      .ap-offer-desc { margin: 0 0 8px; color: #4a453f; max-width: 76ch; }
      .ap-offer-meta { margin: 0; font-size: .88rem; color: #4a453f; }
      .ap-offer-meta span { font-weight: 700; color: #6f6a64; }

      /* Asks */
      .ap-asks { background: #fff; border: 1px solid #e7e2db; border-top: 3px solid ${ACCENT}; padding: 26px 28px; }
      .ap-asks ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
      .ap-asks li { max-width: 76ch; }
      .ap-ask-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; flex-wrap: wrap; }
      .ap-ask-due { font-size: .82rem; color: #6f6a64; white-space: nowrap; }
      .ap-ask-due.is-overdue { color: #a12820; font-weight: 700; }
      .ap-asks p { margin: 4px 0 0; color: #4a453f; font-size: .93rem; }

      .ap-footer { border-top: 1px solid #e7e2db; padding-top: 18px; color: #6f6a64; font-size: .85rem; }

      /* Gate */
      .ap-gate { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .ap-gate-card { background: #fff; border: 1px solid #e7e2db; border-top: 3px solid ${ACCENT}; padding: 36px; max-width: 420px; width: 100%; }
      .ap-gate-card h1 { font-size: 1.6rem; font-weight: 300; margin: 0 0 12px; }
      .ap-gate-card p { color: #6f6a64; margin: 0; }
      .ap-gate-card form { display: grid; gap: 10px; margin-top: 22px; }
      .ap-gate-card input[type="password"] { border: 1px solid #cfc9be; padding: 12px; font-size: 1rem; }
      .ap-gate-card button { background: ${ACCENT}; color: #fff; border: 0; padding: 12px; font-weight: 600; font-size: 1rem; cursor: pointer; }
      .ap-gate-error { color: #a12820; font-weight: 700; margin-top: 10px; }

      @media print {
        .ap-page { padding: 0; max-width: none; }
        .ap-section { break-inside: avoid-page; }
        .ap-doc-card, .ap-week, .ap-timeline { break-inside: avoid; page-break-inside: avoid; }
        .ap-cal-nav, .ap-siblings { display: none; }
        .ap-chip { white-space: normal; }
      }
    `}</style>
  )
}
