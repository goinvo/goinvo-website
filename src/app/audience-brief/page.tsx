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
import { ORG_RESEARCH_TYPE, type OrgResearch } from '@/lib/marketing/orgResearch'
import {
  assessReadiness,
  clusterOrganizations,
  coverageGaps,
  groupDecisionsByOwner,
  leadRecommendation,
  summariseSegments,
  type BriefContact,
  type BriefDecision,
} from '@/lib/marketing/audienceBrief'

// ─────────────────────────────────────────────────────────────────────────────
// GoInvo — Audience Brief
//
// The fourth gated internal page. /marketing-plan says WHAT and WHY,
// /outreach-plan says WHO and HOW, /action-plan says WHEN — this one says
// WHO WE ACTUALLY HAVE, because the other three are written around a warm
// network the CMS does not contain.
//
// Ordered finding → ask → evidence, deliberately. An earlier draft led with the
// data and buried the recommendation two thirds down, under a table whose top
// row was its least useful number. A brief is read top-down by someone with
// five minutes: what did we learn, what do you need to decide, and only then
// show your working.
//
// Every number is read live from the private outreach dataset. Nothing is
// transcribed, and the headline claim is derived rather than written, so it
// cannot drift away from the table underneath it.
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

/** Who this brief is written for; their decisions sort first. */
const READER = 'Juhan'

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
  decisions: BriefDecision[]
  offers: { key?: string; title?: string; priceBand?: string }[]
  weeklyHours: number | null
  posture: string | null
  orgResearch: (OrgResearch & {
    researchedAt?: string
    verification?: {
      status?: string
      reason?: string
      checkedAt?: string
      evidence?: { url: string; title: string; quote: string; textFragmentUrl: string }[]
    }
  })[]
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
  "posture": *[_id == "marketingFinancialPosture"][0].posture,
  "orgResearch": *[_type == "${ORG_RESEARCH_TYPE}" && confidence != "low"]{
    organization, recentSignal, context, quote, quoteUrl, reachableAbout, suggestedOfferKey,
    confidence, researchedAt,
    sources[]{ title, url },
    verification{ status, reason, checkedAt, evidence[]{ url, title, quote, textFragmentUrl } }
  }
}`

const EMPTY: BriefData = {
  contacts: [],
  checkpointsLogged: 0,
  interactionsLogged: 0,
  decisions: [],
  offers: [],
  weeklyHours: null,
  posture: null,
  orgResearch: [],
}

const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0)

function Decision({ decision }: { decision: BriefDecision }) {
  return (
    <li>
      <div className="ab-decision-head">
        <strong>{decision.title}</strong>
        {decision.ownerName && <span className="ab-owner">{decision.ownerName}</span>}
        {decision.dueAt && <span className="ab-due">{String(decision.dueAt).slice(0, 10)}</span>}
      </div>
      {decision.humanQuestion && <p>{decision.humanQuestion}</p>}
    </li>
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
  const { lead, doorOpener, spread } = leadRecommendation(clusters, data.contacts)
  const { mine, others } = groupDecisionsByOwner(data.decisions, READER)
  const vaguePricing = data.offers.filter(
    (offer) => !offer.priceBand || !/\d/.test(String(offer.priceBand)),
  )
  const maxCluster = clusters.length > 0 ? clusters[0].total : 0
  const researchByOrg = new Map(
    (data.orgResearch || []).map((entry) => [entry.organization.toLowerCase(), entry]),
  )
  // Openings worth acting on this week, densest organisations first.
  const openings = clusters
    .flatMap((cluster) =>
      cluster.organizations.map((org) => ({
        org,
        cluster,
        research: researchByOrg.get(org.name.toLowerCase()),
      })),
    )
    .filter((row) => row.research)
    // Verified claims first: an opening you can actually stand behind outranks a
    // bigger organisation whose signal is still unconfirmed.
    .sort((a, b) => {
      const rank = (status?: string) =>
        status === 'verified' ? 0 : status === 'overreach' ? 1 : 2
      const byStatus = rank(a.research?.verification?.status) - rank(b.research?.verification?.status)
      return byStatus !== 0 ? byStatus : b.org.count - a.org.count
    })
  const buyerRows = segments.rows.filter((row) => row.isBuyer)
  const otherRows = segments.rows.filter((row) => !row.isBuyer)

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
        <nav className="ab-jump" aria-label="Sections">
          <a href="#ask">What we need from you</a>
          <a href="#openings">Openings</a>
          <a href="#evidence">The evidence</a>
          <a href="#organisations">Organisations</a>
          <a href="/action-plan">Execution plan ↗</a>
        </nav>
      </header>

      {/* ── 1. The finding, and what follows from it ─────────────────────── */}
      <section className="ab-bottomline">
        {readiness.isColdList && (
          <>
            <p className="ab-kicker">The finding</p>
            <h2>This list has never been used.</h2>
            <p className="ab-bl-lead">
              Across all {readiness.total.toLocaleString()} contacts there are{' '}
              <strong>zero logged interactions</strong>, <strong>zero outreach checkpoints</strong>,
              and <strong>nobody marked as contacted</strong>. It is the EmailOctopus newsletter
              import: real people who opted in to hear from us, but not relationships anyone has
              worked yet. The execution plan says <em>“call the top-ranked ten warm contacts”</em>{' '}
              — there is no ranking to draw on, because the input was never there.
            </p>
          </>
        )}

        <div className="ab-verdicts">
          {lead && (
            <div className="ab-verdict">
              <p className="ab-verdict-label">Lead with</p>
              <p className="ab-verdict-value">{lead.label}</p>
              <p className="ab-verdict-why">
                The densest real cluster: {lead.total} contacts, and{' '}
                {Math.round(spread(lead) * lead.total)} distinct organisations behind them.
                Several people at the same company is a foothold — someone can introduce you
                internally, which is a warmer start than any cold email.
              </p>
            </div>
          )}
          {doorOpener && (
            <div className="ab-verdict">
              <p className="ab-verdict-label">Open doors with</p>
              <p className="ab-verdict-value">{doorOpener.label}</p>
              <p className="ab-verdict-why">
                {doorOpener.total} contacts spread across{' '}
                {Math.round(spread(doorOpener) * doorOpener.total)} different companies — roughly
                one person each. That is a set of doors to knock on, not a book of business, which
                is exactly the shape the Clinical AI Pilot Pre-Mortem is built for.
              </p>
            </div>
          )}
          {gaps.map((gap) => (
            <div key={gap.segment} className="ab-verdict is-warn">
              <p className="ab-verdict-label">Do not lead with</p>
              <p className="ab-verdict-value">{gap.label}</p>
              <p className="ab-verdict-why">
                The turnaround plan targets this segment and the list holds {gap.count}{' '}
                {gap.count === 1 ? 'contact' : 'contacts'}. It can still be a deliberate
                cold-outreach bet — but it should be chosen with that cost visible, not assumed.
              </p>
            </div>
          ))}
        </div>

        <p className="ab-caveat">
          Every sector below is a machine suggestion until a person confirms it. Confirming the
          segment on the organisations that matter is the cheapest step that makes the rest of
          the plan real.
        </p>
      </section>

      {/* ── 2. The ask ───────────────────────────────────────────────────── */}
      <section className="ab-section" id="ask">
        <h2>What we need from you</h2>

        {vaguePricing.length > 0 && (
          <div className="ab-blocker">
            <p className="ab-kicker">Blocking every first call</p>
            <p>
              {vaguePricing.length} of {data.offers.length} active offers still carry a price band
              with no numbers in it. Buyers screen on range before they take a meeting, so this
              gates every conversation the plan schedules.
            </p>
            <ul className="ab-offers">
              {vaguePricing.map((offer) => (
                <li key={offer.key || offer.title}>
                  <strong>{offer.title}</strong>
                  <span className="ab-offer-band">{offer.priceBand || 'no band set'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {mine.length > 0 && (
          <>
            <h3>
              Yours to decide <span className="ab-count">{mine.length}</span>
            </h3>
            <ul className="ab-decisions">
              {mine.map((decision) => (
                <Decision key={decision._id} decision={decision} />
              ))}
            </ul>
          </>
        )}

        {others.length > 0 && (
          <details className="ab-more">
            <summary>
              {others.length} more decisions owned by someone else
            </summary>
            <ul className="ab-decisions">
              {others.map((decision) => (
                <Decision key={decision._id} decision={decision} />
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ── 3. Where to start ───────────────────────────────────────────── */}
      {openings.length > 0 && (
        <section className="ab-section" id="openings">
          <h2>Openings we could make this week</h2>
          <p className="ab-note ab-note-lead">
            Live web research on the organisations where we have the most people. Each opening is
            tied to something specific and published — anything the research could not cite is not
            here, because an uncited signal read out on a call is worse than no call.
          </p>
          <ol className="ab-openings">
            {openings.map(({ org, cluster, research }) => (
              <li key={org.name}>
                <div className="ab-opening-head">
                  <strong>{org.name}</strong>
                  <span className="ab-opening-meta">
                    {cluster.label} · {org.count} {org.count === 1 ? 'contact' : 'contacts'}
                  </span>
                  {research!.verification?.status === 'verified' ? (
                    <span className="ab-badge is-verified">verified against source</span>
                  ) : research!.verification?.status === 'overreach' ? (
                    <span className="ab-badge is-overreach">partly unverified</span>
                  ) : research!.verification?.status ? (
                    <span className="ab-badge">unverified</span>
                  ) : (
                    <span className="ab-badge">not yet checked</span>
                  )}
                </div>
                {research!.verification?.evidence?.[0] && (
                  <p className="ab-verified">
                    <span className="ab-tag">Verified</span>
                    <span>
                      &ldquo;{research!.verification.evidence[0].quote}&rdquo;{' '}
                      <a
                        href={research!.verification.evidence[0].textFragmentUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        see it in the source
                      </a>
                    </span>
                  </p>
                )}
                {research!.recentSignal && (
                  <p className="ab-signal">
                    <span className="ab-tag">
                      {research!.verification?.status === 'verified' ? 'What changed' : 'Unverified'}
                    </span>
                    {research!.recentSignal}
                  </p>
                )}
                {research!.verification?.status === 'overreach' && research!.verification.reason && (
                  <p className="ab-overreach">
                    <span className="ab-tag">Careful</span>
                    {research!.verification.reason}
                  </p>
                )}
                {research!.context && (
                  <details className="ab-context">
                    <summary>Background — not verified, do not repeat as fact</summary>
                    <p>{research!.context}</p>
                  </details>
                )}
                {research!.reachableAbout && (
                  <p className="ab-opening-line">
                    <span className="ab-tag">The opening</span>
                    {research!.reachableAbout}
                  </p>
                )}
                {research!.sources.length > 0 && (
                  <p className="ab-sources">
                    {research!.sources.slice(0, 4).map((source, index) => (
                      <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                        {source.title?.trim() ? source.title.slice(0, 46) : `source ${index + 1}`}
                      </a>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── 4. The working ──────────────────────────────────────────────── */}
      <section className="ab-section" id="evidence">
        <h2>The evidence</h2>

        <div className="ab-stats">
          <div className="ab-stat">
            <div className="ab-stat-value">{readiness.total.toLocaleString()}</div>
            <div className="ab-stat-label">contacts on the list</div>
          </div>
          <div className="ab-stat">
            <div className="ab-stat-value">{readiness.withOrganization.toLocaleString()}</div>
            <div className="ab-stat-label">
              we can name an employer for ({pct(readiness.withOrganization, readiness.total)}%)
            </div>
          </div>
          <div className="ab-stat">
            <div className="ab-stat-value">{segments.buyerSide.toLocaleString()}</div>
            <div className="ab-stat-label">at organisations that could buy</div>
          </div>
          <div className="ab-stat is-missing">
            <div className="ab-stat-value">{readiness.everContacted}</div>
            <div className="ab-stat-label">have ever been contacted</div>
          </div>
          <div className="ab-stat is-missing">
            <div className="ab-stat-value">{readiness.confirmedSegment}</div>
            <div className="ab-stat-label">have a segment a person confirmed</div>
          </div>
        </div>
        <p className="ab-note">
          The two red figures are the gap between the plan and the list. Employer and sector are
          inferred from the email domain and stored as a suggestion — a domain can prove where
          somebody works, never that they know us, which is why warmth is left blank rather than
          guessed.
        </p>

        <h3>Where the audience actually is</h3>
        <table className="ab-table">
          <caption className="ab-caption">
            Buyer-side segments first. Everything below the rule is real audience, but not
            somebody who can commission work.
          </caption>
          <thead>
            <tr>
              <th scope="col">Segment</th>
              <th scope="col" className="ab-num">Contacts</th>
              <th scope="col" className="ab-num">Share</th>
            </tr>
          </thead>
          <tbody>
            {buyerRows.map((row) => (
              <tr key={row.segment} className="is-buyer">
                <td>{row.label}</td>
                <td className="ab-num">{row.count.toLocaleString()}</td>
                <td className="ab-num">{Math.round(row.share * 100)}%</td>
              </tr>
            ))}
            <tr className="ab-subtotal">
              <td>Buyer-side total</td>
              <td className="ab-num">{segments.buyerSide.toLocaleString()}</td>
              <td className="ab-num">{pct(segments.buyerSide, segments.total)}%</td>
            </tr>
          </tbody>
          <tbody className="ab-tbody-rest">
            {otherRows.map((row) => (
              <tr key={row.segment}>
                <td>{row.label}</td>
                <td className="ab-num">{row.count.toLocaleString()}</td>
                <td className="ab-num">{Math.round(row.share * 100)}%</td>
              </tr>
            ))}
            <tr>
              <td>Unclassified (mostly personal addresses)</td>
              <td className="ab-num">{segments.unclassified.toLocaleString()}</td>
              <td className="ab-num">{pct(segments.unclassified, segments.total)}%</td>
            </tr>
          </tbody>
        </table>
        <p className="ab-note">
          Academics and design-agency peers are counted but cannot buy: the first is students and
          faculty, the second is our competitors.
        </p>
      </section>

      <section className="ab-section" id="organisations">
        <h2>The organisations behind those numbers</h2>
        <p className="ab-note ab-note-lead">
          A count alone cannot tell you whether a segment is worth a quarter of work — “33
          contacts” could be one hospital or thirty companies. These are the names, with the bar
          showing each segment against the largest.
        </p>
        <div className="ab-clusters">
          {clusters.map((cluster) => (
            <div key={cluster.segment} className="ab-cluster">
              <div className="ab-cluster-head">
                <h3>{cluster.label}</h3>
                <span className="ab-cluster-total">{cluster.total}</span>
              </div>
              <div className="ab-bar" aria-hidden="true">
                <div
                  className="ab-bar-fill"
                  style={{ width: `${maxCluster > 0 ? (cluster.total / maxCluster) * 100 : 0}%` }}
                />
              </div>
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

      <footer className="ab-footer">
        <p>
          Everything above is read live from the private <code>{OUTREACH_DATASET}</code> dataset
          each time this page loads, and the recommendation at the top is derived from the same
          numbers rather than written down — so it cannot drift out of step with the table. To
          change it, edit the records in the Studio (Outreach → Contacts and Offers, or the
          Operations board) and reload.
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
      .ab-page { max-width: 1020px; margin: 0 auto; padding: 56px 24px 96px; line-height: 1.6; }
      .ab-eyebrow { margin: 0 0 10px; color: ${TEAL}; font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .ab-kicker { margin: 0 0 6px; color: ${WARN}; font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .ab-header { border-bottom: 2px solid ${INK}; padding-bottom: 24px; margin-bottom: 32px; }
      .ab-header h1 { font-size: clamp(2.2rem, 5vw, 3.1rem); line-height: 1.03; letter-spacing: -.025em; margin: 0 0 14px; font-weight: 300; }
      .ab-lede { font-size: 1.14rem; max-width: 62ch; margin: 0 0 18px; color: #4a453f; }
      .ab-jump { display: flex; gap: 18px; flex-wrap: wrap; font-size: .88rem; }
      .ab-jump a { color: ${TEAL}; text-decoration: none; border-bottom: 1px solid #cfe4e7; padding-bottom: 1px; }
      .ab-jump a:hover { border-bottom-color: ${TEAL}; }

      /* 1. Bottom line — the only block with a filled background, so the eye
         lands here first on a page that is otherwise white. */
      .ab-bottomline { background: #fff; border: 1px solid #e7e2db; border-top: 3px solid ${WARN}; padding: 28px 30px; margin-bottom: 44px; }
      .ab-bottomline h2 { margin: 0 0 12px; font-size: 1.6rem; font-weight: 700; letter-spacing: -.015em; }
      .ab-bl-lead { margin: 0 0 24px; max-width: 74ch; font-size: 1.02rem; }
      .ab-verdicts { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .ab-verdict { border-left: 3px solid ${TEAL}; padding: 2px 0 2px 14px; }
      .ab-verdict.is-warn { border-left-color: ${WARN}; }
      .ab-verdict-label { margin: 0; font-size: .72rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #8a847c; }
      .ab-verdict-value { margin: 2px 0 6px; font-size: 1.18rem; font-weight: 700; letter-spacing: -.01em; }
      .ab-verdict.is-warn .ab-verdict-value { color: ${WARN}; }
      .ab-verdict-why { margin: 0; font-size: .9rem; color: #6f6a64; }
      .ab-caveat { margin: 22px 0 0; padding-top: 16px; border-top: 1px solid #efeae3; color: #6f6a64; font-size: .9rem; max-width: 78ch; }

      .ab-section { margin-bottom: 56px; scroll-margin-top: 20px; }
      .ab-section h2 { font-size: 1.55rem; font-weight: 600; letter-spacing: -.015em; margin: 0 0 20px; padding-bottom: 10px; border-bottom: 1px solid #e7e2db; }
      .ab-section h3 { font-size: 1.02rem; font-weight: 700; margin: 30px 0 12px; display: flex; align-items: baseline; gap: 9px; }
      .ab-count { background: ${ACCENT}; color: #fff; font-size: .72rem; font-weight: 700; border-radius: 10px; padding: 1px 8px; }
      .ab-note { color: #6f6a64; font-size: .93rem; max-width: 74ch; }
      .ab-note-lead { margin-top: 0; margin-bottom: 18px; }

      /* 2. The ask */
      .ab-blocker { border: 1px solid #f0d9d3; background: #fdf7f5; padding: 18px 20px; margin-bottom: 8px; }
      .ab-blocker p { margin: 0 0 12px; max-width: 74ch; }
      .ab-offers { list-style: none; margin: 0; padding: 0; }
      .ab-offers li { display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; background: #fff; border: 1px solid #f0e2dd; padding: 8px 12px; margin-bottom: 5px; font-size: .9rem; }
      .ab-offers li:last-child { margin-bottom: 0; }
      .ab-offer-band { color: #8a847c; font-style: italic; }

      .ab-decisions { list-style: none; margin: 0; padding: 0; }
      .ab-decisions li { border: 1px solid #e7e2db; border-left: 3px solid ${ACCENT}; background: #fff; padding: 12px 16px; margin-bottom: 8px; }
      .ab-decisions p { margin: 6px 0 0; color: #6f6a64; font-size: .91rem; max-width: 76ch; }
      .ab-decision-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
      .ab-owner { font-size: .7rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: ${TEAL}; }
      .ab-due { font-size: .78rem; color: #8a847c; font-variant-numeric: tabular-nums; }
      .ab-more { margin-top: 22px; }
      .ab-more summary { cursor: pointer; color: ${TEAL}; font-size: .92rem; font-weight: 600; padding: 6px 0; }
      .ab-more[open] summary { margin-bottom: 12px; }
      .ab-more .ab-decisions li { border-left-color: #d8d2c9; }

      /* 3. Openings */
      .ab-openings { list-style: none; margin: 0; padding: 0; counter-reset: opening; }
      .ab-openings li { position: relative; border: 1px solid #e7e2db; border-left: 3px solid ${TEAL}; background: #fff; padding: 15px 18px 15px 52px; margin-bottom: 10px; counter-increment: opening; }
      .ab-openings li::before { content: counter(opening); position: absolute; left: 17px; top: 15px; font-size: 1.05rem; font-weight: 700; color: #c6c0b8; font-variant-numeric: tabular-nums; }
      .ab-opening-head { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; margin-bottom: 8px; }
      .ab-opening-head strong { font-size: 1.04rem; }
      .ab-opening-meta { font-size: .78rem; color: #8a847c; }
      .ab-badge { font-size: .66rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #8a847c; background: #f4f1ec; padding: 1px 7px; }
      .ab-badge.is-verified { color: #2c6e49; background: #eaf4ee; }
      .ab-badge.is-overreach { color: ${WARN}; background: #fdf3f1; }
      .ab-verified { margin: 0 0 7px; font-size: .93rem; max-width: 86ch; color: ${INK}; }
      .ab-verified a { color: ${TEAL}; font-size: .82rem; white-space: nowrap; }
      .ab-overreach { margin: 0 0 7px; font-size: .87rem; max-width: 86ch; color: ${WARN}; }
      /* Collapsed by default and labelled on the summary itself: the point of
         separating this from the claim is that it never gets read as evidence. */
      .ab-context { margin: 8px 0 0; }
      .ab-context summary { cursor: pointer; font-size: .76rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #a8a29a; }
      .ab-context p { margin: 8px 0 0; font-size: .88rem; color: #8a847c; max-width: 86ch; border-left: 2px dashed #d8d2c9; padding-left: 12px; }
      .ab-tag { display: inline-block; min-width: 92px; font-size: .68rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #a8a29a; vertical-align: baseline; }
      .ab-signal, .ab-opening-line { margin: 0 0 7px; font-size: .93rem; max-width: 86ch; }
      .ab-opening-line { color: ${INK}; }
      .ab-signal { color: #6f6a64; }
      .ab-sources { margin: 9px 0 0; display: flex; gap: 8px; flex-wrap: wrap; }
      .ab-sources a { font-size: .74rem; color: ${TEAL}; border: 1px solid #d9e8ea; padding: 2px 8px; text-decoration: none; }
      .ab-sources a:hover { border-color: ${TEAL}; }

      /* 4. Evidence */
      .ab-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 14px; }
      .ab-stat { border: 1px solid #e7e2db; padding: 14px 16px; background: #fff; }
      .ab-stat.is-missing { border-color: #f0d9d3; background: #fdf7f5; }
      .ab-stat-value { font-size: 1.7rem; font-weight: 700; letter-spacing: -.025em; color: ${ACCENT}; font-variant-numeric: tabular-nums; }
      .ab-stat.is-missing .ab-stat-value { color: ${WARN}; }
      .ab-stat-label { font-size: .8rem; color: #6f6a64; margin-top: 3px; line-height: 1.35; }

      /* Wide content scrolls inside its own box; the page never scrolls sideways. */
      .ab-table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e7e2db; margin-bottom: 12px; display: block; overflow-x: auto; }
      .ab-caption { caption-side: top; text-align: left; color: #6f6a64; font-size: .86rem; padding: 10px 14px 12px; max-width: 74ch; }
      .ab-table th, .ab-table td { border-bottom: 1px solid #efeae3; padding: 9px 14px; text-align: left; font-size: .93rem; white-space: nowrap; }
      .ab-table th { background: #faf8f4; font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; color: #6f6a64; }
      .ab-num { text-align: right; font-variant-numeric: tabular-nums; }
      .ab-table tr.is-buyer td { font-weight: 600; }
      .ab-subtotal td { font-weight: 700; border-bottom: 2px solid ${INK}; }
      .ab-tbody-rest td { color: #8a847c; }

      .ab-clusters { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
      .ab-cluster { border: 1px solid #e7e2db; background: #fff; padding: 16px 18px; }
      .ab-cluster-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
      .ab-cluster-head h3 { margin: 0; font-size: .98rem; font-weight: 700; }
      .ab-cluster-total { color: ${ACCENT}; font-weight: 700; font-variant-numeric: tabular-nums; }
      .ab-bar { height: 4px; background: #f4f1ec; margin: 9px 0 12px; }
      .ab-bar-fill { height: 100%; background: ${TEAL}; opacity: .85; }
      .ab-cluster ul { list-style: none; margin: 0; padding: 0; }
      .ab-cluster li { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; border-bottom: 1px solid #f4f1ec; font-size: .89rem; }
      .ab-cluster li:last-child { border-bottom: 0; }
      .ab-org-count { color: ${ACCENT}; font-weight: 700; font-variant-numeric: tabular-nums; }

      .ab-footer { border-top: 1px solid #e7e2db; padding-top: 18px; color: #8a847c; font-size: .87rem; max-width: 82ch; }
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
        .ab-bottomline { padding: 20px 18px; }
      }
    `}</style>
  )
}
