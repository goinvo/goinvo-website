import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, previewToken, projectId } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import {
  isMarketingPlanConfigured,
  MARKETING_PLAN_SESSION_COOKIE,
  verifyMarketingPlanSession,
} from '@/lib/marketing/marketingPlanAuth'
import {
  assessReadiness,
  clusterOrganizations,
  coverageGaps,
  summariseSegments,
  type BriefContact,
} from '@/lib/marketing/audienceBrief'

// ─────────────────────────────────────────────────────────────────────────────
// GoInvo — Audience Brief
//
// The fourth gated internal page. /marketing-plan says WHAT and WHY,
// /outreach-plan says WHO and HOW, /action-plan says WHEN — this one says
// WHO WE ACTUALLY HAVE, because the other three are written around a warm
// network the CMS does not contain.
//
// Every number is read live from the private outreach dataset. Nothing is
// transcribed: if the list changes in the Studio, this page changes, and a
// claim here can always be checked against the records behind it.
//
// Route: /audience-brief (server component; unlisted; noindex). Same
// MARKETING_PLAN_KEY session as its siblings.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Audience Brief — GoInvo Internal',
  robots: { index: false, follow: false },
}

const INK = '#1d1b1a'
const ACCENT = '#d94d2f'
const TEAL = '#007385'
const WARN = '#a12820'

/** Segments the turnaround plan names as targets, to check the list against. */
const TARGETED_SEGMENTS = ['medDevice', 'pharma', 'provider', 'healthtech'] as const

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

type BriefData = {
  contacts: BriefContact[]
  checkpointsLogged: number
  interactionsLogged: number
  decisions: {
    _id: string
    title: string
    ownerName?: string
    humanQuestion?: string
    dueAt?: string
    priority?: string
  }[]
  offers: { key?: string; title?: string; priceBand?: string }[]
  weeklyHours: number | null
  posture: string | null
}

// count(*[...].array[]) counts a NULL for every doc missing the array, so the
// sum-of-counts form is the one that gives a true zero.
const BRIEF_QUERY = `{
  "contacts": *[_type == "marketingContact"]{ organization, researchSuggestedSegment, segment, warmth, status },
  "checkpointsLogged": count(*[_type == "marketingOutreachCheckpoint"]),
  "interactionsLogged": math::sum(*[_type == "marketingContact"]{"n": count(coalesce(interactions, []))}.n),
  "decisions": *[_type == "marketingOperation" && status == "needsHuman"] | order(coalesce(dueAt, "9999") asc){
    _id, title, ownerName, humanQuestion, dueAt, priority
  },
  "offers": *[_type == "marketingOffer" && status == "active"] | order(coalesce(order, 100) asc){
    key, title, priceBand
  },
  "weeklyHours": *[_id == "marketingSettings"][0].weeklyMarketingHours,
  "posture": *[_id == "marketingFinancialPosture"][0].posture
}`

const EMPTY: BriefData = {
  contacts: [],
  checkpointsLogged: 0,
  interactionsLogged: 0,
  decisions: [],
  offers: [],
  weeklyHours: null,
  posture: null,
}

const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

function Stat({ value, label, tone }: { value: string; label: string; tone?: 'warn' }) {
  return (
    <div className="ab-stat">
      <div className="ab-stat-value" style={tone === 'warn' ? { color: WARN } : undefined}>
        {value}
      </div>
      <div className="ab-stat-label">{label}</div>
    </div>
  )
}

export default async function AudienceBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const configured = isMarketingPlanConfigured()
  const session = (await cookies()).get(MARKETING_PLAN_SESSION_COOKIE)?.value
  const unlocked = configured && verifyMarketingPlanSession(session)
  const params = await searchParams

  if (!unlocked) {
    return (
      <main className="ab-gate">
        <div className="ab-gate-card">
          <p className="ab-eyebrow">GoInvo · Internal</p>
          <h1>Audience Brief</h1>
          {configured ? (
            <>
              <p>This document is restricted. Enter the access key to continue.</p>
              <form method="post" action="/api/marketing/plan-session">
                <input type="hidden" name="next" value="/audience-brief" />
                <input type="password" name="key" placeholder="Access key" aria-label="Access key" required />
                <button type="submit">View the brief</button>
              </form>
              {params.denied === '1' && (
                <p role="alert" className="ab-gate-error">That access key was not accepted.</p>
              )}
            </>
          ) : (
            <p>
              Access is not configured on this deployment. Set <code>MARKETING_PLAN_KEY</code> to enable it.
            </p>
          )}
        </div>
        <BriefStyles />
      </main>
    )
  }

  const client = getOutreachClient()
  const data = client ? await client.fetch<BriefData>(BRIEF_QUERY).catch(() => EMPTY) : EMPTY

  const segments = summariseSegments(data.contacts)
  const clusters = clusterOrganizations(data.contacts, { perSegment: 8 })
  const readiness = assessReadiness({
    contacts: data.contacts,
    checkpointsLogged: data.checkpointsLogged,
    interactionsLogged: data.interactionsLogged,
  })
  const gaps = coverageGaps(data.contacts, TARGETED_SEGMENTS, 10)
  const vaguePricing = data.offers.filter(
    (offer) => !offer.priceBand || !/\d/.test(String(offer.priceBand)),
  )
  const biggest = clusters[0]

  return (
    <main className="ab-page">
      <header className="ab-header">
        <p className="ab-eyebrow">GoInvo · Internal · Live from the CMS</p>
        <h1>Who we can actually reach</h1>
        <p className="ab-lede">
          The plan is written around calling a warm network. This is what the outreach list
          contains today, read straight from the private dataset — so we choose a segment from
          evidence rather than from intent.
        </p>
        <p className="ab-siblings">
          <a href="/marketing-plan">Strategy</a> · <a href="/outreach-plan">Outreach</a> ·{' '}
          <a href="/action-plan">Execution plan</a>
        </p>
      </header>

      {readiness.isColdList && (
        <section className="ab-alarm">
          <h2>This list has never been used.</h2>
          <p>
            Across all {readiness.total.toLocaleString()} contacts there are{' '}
            <strong>zero logged interactions</strong>, <strong>zero outreach checkpoints</strong>,
            and <strong>nobody marked as contacted</strong>. It is the EmailOctopus newsletter
            import: real people who opted in to hear from us, but not relationships anyone has
            worked yet.
          </p>
          <p>
            That matters because the execution plan says <em>“call the top-ranked ten warm
            contacts.”</em> There is no ranking to draw on — not because the work slipped, but
            because the input was never there. Warmth is deliberately left blank rather than
            guessed: a domain can prove where somebody works, never that they know us.
          </p>
        </section>
      )}

      <section className="ab-section">
        <h2>The list at a glance</h2>
        <div className="ab-stats">
          <Stat value={readiness.total.toLocaleString()} label="contacts" />
          <Stat
            value={`${readiness.withOrganization.toLocaleString()}`}
            label={`with an employer (${pct(readiness.withOrganization, readiness.total)}%)`}
          />
          <Stat value={segments.buyerSide.toLocaleString()} label="buyer-side organisations" />
          <Stat value={String(readiness.everContacted)} label="ever contacted" tone="warn" />
          <Stat value={String(readiness.confirmedSegment)} label="segment confirmed by a person" tone="warn" />
        </div>
        <p className="ab-note">
          Employer and sector are inferred from the email domain and stored as a{' '}
          <em>suggestion</em>. They stay suggestions until someone confirms them in
          Outreach → Contacts, which is why “segment confirmed by a person” is its own number
          rather than folded into the others.
        </p>
      </section>

      <section className="ab-section">
        <h2>Where the audience actually is</h2>
        <table className="ab-table">
          <thead>
            <tr>
              <th>Segment</th>
              <th className="ab-num">Contacts</th>
              <th className="ab-num">Share</th>
              <th>Can they buy design work?</th>
            </tr>
          </thead>
          <tbody>
            {segments.rows.map((row) => (
              <tr key={row.segment} className={row.isBuyer ? 'is-buyer' : undefined}>
                <td>{row.label}</td>
                <td className="ab-num">{row.count.toLocaleString()}</td>
                <td className="ab-num">{Math.round(row.share * 100)}%</td>
                <td>{row.isBuyer ? <span className="ab-yes">buyer-side</span> : <span className="ab-no">no</span>}</td>
              </tr>
            ))}
            <tr className="ab-row-rest">
              <td>Unclassified (mostly personal addresses)</td>
              <td className="ab-num">{segments.unclassified.toLocaleString()}</td>
              <td className="ab-num">{pct(segments.unclassified, segments.total)}%</td>
              <td>
                <span className="ab-no">unknown</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="ab-note">
          A personal address proves nothing about where someone works, so those are left
          unclassified rather than guessed at. Academics and design-agency peers are counted but
          are not buyers — the first is students and faculty, the second is our competitors.
        </p>
      </section>

      <section className="ab-section">
        <h2>The organisations behind those numbers</h2>
        <p className="ab-note ab-note-lead">
          A count on its own does not tell you whether a segment is worth a quarter of work —
          “{biggest ? biggest.total : 0} contacts” could be one company or thirty. These are the
          names.
        </p>
        <div className="ab-clusters">
          {clusters.map((cluster) => (
            <div key={cluster.segment} className="ab-cluster">
              <h3>
                {cluster.label} <span className="ab-cluster-total">{cluster.total}</span>
              </h3>
              <ul>
                {cluster.organizations.map((org) => (
                  <li key={org.name}>
                    <span className="ab-org">{org.name}</span>
                    {org.count > 1 && <span className="ab-org-count">{org.count}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {gaps.length > 0 && (
        <section className="ab-section">
          <h2>Segments we name but cannot reach</h2>
          <div className="ab-gaps">
            {gaps.map((gap) => (
              <div key={gap.segment} className="ab-gap">
                <div className="ab-gap-count">{gap.count}</div>
                <div>
                  <strong>{gap.label}</strong>
                  <p>
                    The turnaround plan targets this segment, and the list holds {gap.count}{' '}
                    {gap.count === 1 ? 'contact' : 'contacts'}. Leading with it means cold
                    outreach with no warm entry — possible, but a different and slower job than
                    the plan assumes.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ab-section">
        <h2>What this suggests</h2>
        <ol className="ab-reco">
          <li>
            <strong>Lead where there is density.</strong> The strongest real cluster is
            providers and health IT — and it is largely on our doorstep in Boston, which makes an
            introduction a coffee rather than a cold email.
          </li>
          <li>
            <strong>Use pharma as the door-opener, not the pipeline.</strong> A handful of
            contacts spread one-per-company across major pharma is exactly the shape the Clinical
            AI Pilot Pre-Mortem is built for: a reason to make contact, not a book of business.
          </li>
          <li>
            <strong>Do not lead with a segment the list cannot support.</strong> See the gap
            above. It can be a deliberate cold-outreach bet, but it should be chosen with that
            cost visible.
          </li>
          <li>
            <strong>Confirm before calling.</strong> Every sector here is a machine suggestion.
            Confirming the segment on the organisations that matter is the cheapest step that
            makes the rest of the plan real.
          </li>
        </ol>
      </section>

      {vaguePricing.length > 0 && (
        <section className="ab-section">
          <h2>Blocking the first call</h2>
          <p className="ab-note ab-note-lead">
            {vaguePricing.length} of {data.offers.length} active offers still carry a price band
            with no numbers in it. Buyers screen on range before they take a meeting, so this is
            load-bearing for every conversation the plan schedules.
          </p>
          <ul className="ab-offers">
            {vaguePricing.map((offer) => (
              <li key={offer.key || offer.title}>
                <strong>{offer.title}</strong>
                <span className="ab-offer-band">{offer.priceBand || 'no band set'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.decisions.length > 0 && (
        <section className="ab-section">
          <h2>Decisions waiting on a person</h2>
          <p className="ab-note ab-note-lead">
            Live from the operations board — {data.decisions.length} open. These are the ones
            nothing else can move past.
          </p>
          <ul className="ab-decisions">
            {data.decisions.slice(0, 12).map((decision) => (
              <li key={decision._id}>
                <div className="ab-decision-head">
                  <strong>{decision.title}</strong>
                  {decision.ownerName && <span className="ab-owner">{decision.ownerName}</span>}
                  {decision.dueAt && (
                    <span className="ab-due">{String(decision.dueAt).slice(0, 10)}</span>
                  )}
                </div>
                {decision.humanQuestion && <p>{decision.humanQuestion}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="ab-footer">
        <p>
          Everything above is read live from the private <code>{OUTREACH_DATASET}</code> dataset
          each time this page loads. To change it, edit the records in the Studio — Outreach →
          Contacts and Offers, or the Operations board — and reload.
          {data.posture && (
            <>
              {' '}
              Current financial posture: <strong>{data.posture}</strong>
              {data.weeklyHours ? (
                <> · marketing budget <strong>{data.weeklyHours}h/week</strong>.</>
              ) : (
                '.'
              )}
            </>
          )}
        </p>
      </footer>

      <BriefStyles />
    </main>
  )
}

function BriefStyles() {
  return (
    <style>{`
      .ab-page, .ab-gate { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: ${INK}; background: #fdfcfa; }
      .ab-page { max-width: 1080px; margin: 0 auto; padding: 56px 24px 96px; line-height: 1.6; }
      .ab-eyebrow { margin: 0 0 10px; color: ${TEAL}; font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .ab-header { border-bottom: 2px solid ${INK}; padding-bottom: 28px; margin-bottom: 36px; }
      .ab-header h1 { font-size: clamp(2.1rem, 5vw, 3rem); line-height: 1.05; letter-spacing: -.02em; margin: 0 0 14px; font-weight: 300; }
      .ab-lede { font-size: 1.12rem; max-width: 64ch; margin: 0 0 14px; color: #4a453f; }
      .ab-siblings { display: flex; gap: 8px; font-size: .9rem; margin: 0; color: #c6c0b8; }
      .ab-siblings a { color: ${TEAL}; }
      .ab-section { margin-bottom: 52px; }
      .ab-section h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -.01em; margin: 0 0 18px; }
      .ab-note { color: #6f6a64; font-size: .95rem; max-width: 72ch; }
      .ab-note-lead { margin-top: 0; margin-bottom: 18px; }

      .ab-alarm { border-left: 4px solid ${WARN}; background: #fdf3f1; padding: 22px 24px; margin-bottom: 44px; }
      .ab-alarm h2 { margin: 0 0 10px; font-size: 1.25rem; font-weight: 700; color: ${WARN}; }
      .ab-alarm p { margin: 0 0 10px; max-width: 74ch; }
      .ab-alarm p:last-child { margin-bottom: 0; }

      .ab-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
      .ab-stat { border: 1px solid #e7e2db; padding: 14px 16px; background: #fff; }
      .ab-stat-value { font-size: 1.6rem; font-weight: 700; letter-spacing: -.02em; color: ${ACCENT}; }
      .ab-stat-label { font-size: .82rem; color: #6f6a64; margin-top: 2px; }

      /* Wide content scrolls inside its own box; the page never scrolls sideways. */
      .ab-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e7e2db; margin-bottom: 14px; display: block; overflow-x: auto; white-space: nowrap; }
      .ab-table th, .ab-table td { border-bottom: 1px solid #efeae3; padding: 9px 14px; text-align: left; font-size: .92rem; }
      .ab-table th { background: #faf8f4; font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: #6f6a64; }
      .ab-num { text-align: right; font-variant-numeric: tabular-nums; }
      .ab-table tr.is-buyer td { font-weight: 600; }
      .ab-row-rest td { color: #8a847c; }
      .ab-yes { color: ${TEAL}; font-weight: 700; font-size: .8rem; }
      .ab-no { color: #a8a29a; font-size: .8rem; }

      .ab-clusters { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
      .ab-cluster { border: 1px solid #e7e2db; background: #fff; padding: 16px 18px; }
      .ab-cluster h3 { margin: 0 0 10px; font-size: 1rem; font-weight: 700; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
      .ab-cluster-total { color: ${ACCENT}; font-variant-numeric: tabular-nums; }
      .ab-cluster ul { list-style: none; margin: 0; padding: 0; }
      .ab-cluster li { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px solid #f4f1ec; font-size: .9rem; }
      .ab-cluster li:last-child { border-bottom: 0; }
      .ab-org-count { color: ${ACCENT}; font-weight: 700; font-variant-numeric: tabular-nums; }

      .ab-gaps { display: grid; gap: 12px; }
      .ab-gap { display: flex; gap: 18px; align-items: flex-start; border: 1px solid #f0d9d3; background: #fdf7f5; padding: 16px 18px; }
      .ab-gap-count { font-size: 2.2rem; font-weight: 700; color: ${WARN}; line-height: 1; min-width: 48px; font-variant-numeric: tabular-nums; }
      .ab-gap p { margin: 4px 0 0; color: #6f6a64; font-size: .93rem; max-width: 70ch; }

      .ab-reco { margin: 0; padding-left: 22px; }
      .ab-reco li { margin-bottom: 12px; max-width: 76ch; }

      .ab-offers { list-style: none; margin: 0; padding: 0; }
      .ab-offers li { display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; border: 1px solid #e7e2db; background: #fff; padding: 10px 14px; margin-bottom: 6px; font-size: .93rem; }
      .ab-offer-band { color: #8a847c; font-style: italic; }

      .ab-decisions { list-style: none; margin: 0; padding: 0; }
      .ab-decisions li { border: 1px solid #e7e2db; background: #fff; padding: 12px 16px; margin-bottom: 8px; }
      .ab-decisions p { margin: 6px 0 0; color: #6f6a64; font-size: .92rem; max-width: 74ch; }
      .ab-decision-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
      .ab-owner { font-size: .72rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: ${TEAL}; }
      .ab-due { font-size: .78rem; color: #8a847c; font-variant-numeric: tabular-nums; }

      .ab-footer { border-top: 1px solid #e7e2db; padding-top: 18px; color: #8a847c; font-size: .88rem; }
      .ab-footer code { background: #f4f1ec; padding: 1px 5px; }

      .ab-gate { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .ab-gate-card { border: 1px solid #e7e2db; background: #fff; padding: 34px 32px; max-width: 420px; width: 100%; }
      .ab-gate-card h1 { font-size: 1.7rem; font-weight: 300; margin: 0 0 12px; }
      .ab-gate-card p { color: #6f6a64; font-size: .95rem; }
      .ab-gate-card input { width: 100%; padding: 10px 12px; border: 1px solid #d8d2c9; margin-bottom: 10px; font-size: 1rem; }
      .ab-gate-card button { width: 100%; padding: 11px 12px; border: 0; background: ${INK}; color: #fff; font-size: .95rem; font-weight: 600; cursor: pointer; }
      .ab-gate-error { color: ${WARN}; font-weight: 600; }

      @media (max-width: 600px) {
        .ab-page { padding: 36px 16px 72px; }
        .ab-gap { flex-direction: column; gap: 8px; }
      }
    `}</style>
  )
}
