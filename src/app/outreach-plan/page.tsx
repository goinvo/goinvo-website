import { cookies } from 'next/headers'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, previewToken, projectId } from '@/sanity/env'
import { OUTREACH_DATASET } from '@/lib/marketing/outreachEnums'
import {
  isMarketingPlanConfigured,
  MARKETING_PLAN_SESSION_COOKIE,
  verifyMarketingPlanSession,
} from '@/lib/marketing/marketingPlanAuth'

// ─────────────────────────────────────────────────────────────────────────────
// GoInvo — Warm-Network Outreach Plan
//
// The page to send after contacts are loaded: what the list is, what we are
// selling, who to call first, and how a call runs. Numbers are read live from
// the PRIVATE outreach dataset so the plan can never drift from reality.
//
// Route: /outreach-plan (server component; unlisted; noindex). Gated by the
// same MARKETING_PLAN_KEY session as /marketing-plan.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const INK = '#1d1b1a'
const ACCENT = '#d94d2f'
const TEAL = '#007385'

let outreachClient: SanityClient | null = null
let clientResolved = false
function getOutreachClient(): SanityClient | null {
  if (clientResolved) return outreachClient
  clientResolved = true
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

type Contact = {
  name?: string
  role?: string
  organization?: string
  researchSuggestedSegment?: string
  feasibilityScore?: number
  suggestedOfferKey?: string
}
type Offer = { key?: string; title?: string; oneLiner?: string; priceBand?: string }
type PlanData = {
  total: number
  researched: number
  verified: number
  named: number
  hot: number
  segments: string[]
  matchedOffers: string[]
  callList: Contact[]
  offers: Offer[]
}

const PLAN_QUERY = `{
  "total": count(*[_type == "marketingContact"]),
  "researched": count(*[_type == "marketingContact" && defined(researchedAt)]),
  "verified": count(*[_type == "marketingContact" && personVerified == true]),
  "named": count(*[_type == "marketingContact" && defined(role) && defined(organization)]),
  "hot": count(*[_type == "marketingContact" && warmth == "hot"]),
  "segments": *[_type == "marketingContact" && defined(researchedAt) && defined(researchSuggestedSegment)].researchSuggestedSegment,
  "matchedOffers": *[_type == "marketingContact" && defined(suggestedOfferKey)].suggestedOfferKey,
  "callList": *[
    _type == "marketingContact" && defined(feasibilityScore) && defined(role)
    && !(name in [email])
  ] | order(feasibilityScore desc)[0...12]{
    name, role, organization, researchSuggestedSegment, feasibilityScore, suggestedOfferKey
  },
  "offers": *[_type == "marketingOffer" && status == "active"] | order(coalesce(order, 100) asc){
    key, title, oneLiner, priceBand
  }
}`

const EMPTY: PlanData = {
  total: 0, researched: 0, verified: 0, named: 0, hot: 0,
  segments: [], matchedOffers: [], callList: [], offers: [],
}

const SEGMENT_LABELS: Record<string, string> = {
  healthtech: 'Healthtech', research: 'Research / academic', government: 'Government',
  provider: 'Providers', pharma: 'Pharma', medDevice: 'Med-device', payer: 'Payers', other: 'Other',
}

function tally(values: string[]): Array<[string, number]> {
  const counts: Record<string, number> = {}
  for (const value of values) counts[value] = (counts[value] || 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="op-stat">
      <div className="op-stat-value">{value}</div>
      <div className="op-stat-label">{label}</div>
    </div>
  )
}

export default async function OutreachPlanPage() {
  const configured = isMarketingPlanConfigured()
  const session = (await cookies()).get(MARKETING_PLAN_SESSION_COOKIE)?.value
  const unlocked = configured && verifyMarketingPlanSession(session)

  if (!unlocked) {
    return (
      <main className="op-gate">
        <div className="op-gate-card">
          <p className="op-eyebrow">GoInvo · Internal</p>
          <h1>Warm-Network Outreach Plan</h1>
          {configured ? (
            <>
              <p>This document is restricted. Enter the access key to continue.</p>
              <form method="post" action="/api/marketing/plan-session">
                <input type="hidden" name="next" value="/outreach-plan" />
                <input type="password" name="key" placeholder="Access key" aria-label="Access key" required />
                <button type="submit">View the plan</button>
              </form>
            </>
          ) : (
            <p>Access is not configured on this deployment. Set <code>MARKETING_PLAN_KEY</code> to enable it.</p>
          )}
        </div>
        <PlanStyles />
      </main>
    )
  }

  const client = getOutreachClient()
  const data = client ? await client.fetch<PlanData>(PLAN_QUERY).catch(() => EMPTY) : EMPTY
  const segments = tally(data.segments)
  const matched = tally(data.matchedOffers)
  const offerByKey = new Map(data.offers.map((offer) => [offer.key, offer]))
  const featured = matched.slice(0, 3).map(([key, count]) => ({ offer: offerByKey.get(key), count, key }))

  return (
    <main className="op-page">
      <header className="op-header">
        <p className="op-eyebrow">GoInvo · Internal · {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <h1>Warm-network outreach</h1>
        <p className="op-lede">
          The list is loaded and researched. This is what we have, what we&rsquo;re offering, who to call
          first, and how a call runs — so the network finally gets tested instead of discussed.
        </p>
      </header>

      <section className="op-section">
        <h2>Where we stand</h2>
        <div className="op-stats">
          <Stat value={data.total.toLocaleString()} label="contacts in the CMS" />
          <Stat value={data.researched} label="researched with AI + live web" />
          <Stat value={data.verified} label="identity-verified people" />
          <Stat value={data.named} label="with a confirmed role and org" />
        </div>
        <p className="op-note">
          Every contact came from our own newsletter audience — people who chose a relationship with
          GoInvo. Nothing here was bought or scraped. Contact records live in the private outreach
          dataset, never the public one.
        </p>
      </section>

      <section className="op-section">
        <h2>The strategy, in three moves</h2>
        <ol className="op-moves">
          <li>
            <h3>Pipeline before polish</h3>
            <p>
              The homepage draws roughly 550 visitors a month and produces about six qualified
              enquiries. No amount of site experimentation extracts a signal from that. A warm list
              of this size, worked properly, produces conversations in weeks.
            </p>
          </li>
          <li>
            <h3>Warm before cold</h3>
            <p>
              These are past collaborators, clients, and peers — MITRE, Mass General Brigham,
              Meditech, CMS, Vibrent, and a long tail of universities. We start where a reply is
              already likely, not with strangers.
            </p>
          </li>
          <li>
            <h3>A small yes before a big yes</h3>
            <p>
              Nobody signs a fixed-scope engagement from an email. Every conversation asks for one
              free 30-minute working session on a problem they already own. The engagement is what
              that session earns.
            </p>
          </li>
        </ol>
      </section>

      {featured.length > 0 && (
        <section className="op-section">
          <h2>What we&rsquo;re offering</h2>
          <p className="op-note">
            The research matched each contact to the offer that fits their public situation. These
            three came up most often across the researched list.
          </p>
          <div className="op-offers">
            {featured.map(({ offer, count, key }) => (
              <article key={key} className="op-offer">
                <h3>{offer?.title || key}</h3>
                <p className="op-offer-line">{offer?.oneLiner}</p>
                <p className="op-offer-meta">
                  <span className="op-pill">{offer?.priceBand || 'Priced per engagement'}</span>
                  <span className="op-count">matched to {count} {count === 1 ? 'contact' : 'contacts'}</span>
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {data.callList.length > 0 && (
        <section className="op-section">
          <h2>Who to call first</h2>
          <p className="op-note">
            Ranked by the research&rsquo;s feasibility score — a blend of how well the offer fits, how
            reachable the person is, and whether the timing is real. Each of these has a full call
            brief in the Studio: their situation, what to show them, and the opening line.
          </p>
          <div className="op-table-wrap">
            <table className="op-table">
              <thead>
                <tr><th>Person</th><th>Role</th><th>Segment</th><th>Best-fit offer</th><th>Fit</th></tr>
              </thead>
              <tbody>
                {data.callList.map((contact, index) => (
                  <tr key={`${contact.name}-${index}`}>
                    <td>
                      <strong>{contact.name}</strong>
                      {contact.organization && <span className="op-org">{contact.organization}</span>}
                    </td>
                    <td className="op-muted">{contact.role}</td>
                    <td className="op-muted">{SEGMENT_LABELS[contact.researchSuggestedSegment || ''] || '—'}</td>
                    <td className="op-muted">{offerByKey.get(contact.suggestedOfferKey || '')?.title || '—'}</td>
                    <td><span className="op-score">{contact.feasibilityScore}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {segments.length > 0 && (
            <p className="op-note">
              Researched list by segment: {segments.map(([key, count]) => `${SEGMENT_LABELS[key] || key} ${count}`).join(' · ')}.
            </p>
          )}
        </section>
      )}

      <section className="op-section">
        <h2>How a call runs</h2>
        <ol className="op-steps">
          <li><strong>Open with their world, not ours.</strong> The brief names what their organization has publicly announced. Lead with that, and it is a conversation rather than a pitch.</li>
          <li><strong>Ask the pre-mortem question.</strong> &ldquo;It&rsquo;s 18 months out and the pilot quietly died — what killed it?&rdquo; People answer this honestly because failure is the premise, not an accusation.</li>
          <li><strong>Show one piece of evidence.</strong> The brief picks the case study closest to their problem — Flux Notes for MITRE, CodeRyte for workflow, Ipsos Facto for adoption. One, not a portfolio tour.</li>
          <li><strong>Ask for the 30 minutes.</strong> Name who should be in the room and what gets scoped. That is the entire ask.</li>
        </ol>
        <p className="op-note">
          Afterwards, log the outcome on the contact in the Studio — what they said, what got
          funded, when to follow up. The next call is only as good as the last note.
        </p>
      </section>

      <section className="op-section op-asks">
        <h2>What we need from you</h2>
        <ul>
          <li>
            <strong>Mark the true believers.</strong> {data.hot > 0
              ? `${data.hot} contacts are flagged hot so far.`
              : 'Nobody is flagged hot yet.'} Point out the handful who would take a call this
            week and they move to the top of the plan.
          </li>
          <li>
            <strong>Decide on pricing in writing.</strong> The offers currently read &ldquo;quoted per
            engagement.&rdquo; Real ranges qualify buyers before the call and filter out the work we
            don&rsquo;t want. Your call whether numbers go in front of people.
          </li>
          <li>
            <strong>Say go.</strong> The briefs are written and the sequence is ready. What is
            missing is permission to start sending.
          </li>
        </ul>
      </section>

      <footer className="op-footer">
        <p>Restricted GoInvo internal document · figures read live from the outreach CMS.</p>
      </footer>

      <PlanStyles />
    </main>
  )
}

function PlanStyles() {
  return (
    <style>{`
      .op-page, .op-gate { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: ${INK}; background: #fdfcfa; }
      .op-page { max-width: 880px; margin: 0 auto; padding: 56px 24px 96px; line-height: 1.6; }
      .op-eyebrow { margin: 0 0 10px; color: ${TEAL}; font-size: .75rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
      .op-header { border-bottom: 2px solid ${INK}; padding-bottom: 28px; margin-bottom: 40px; }
      .op-header h1 { font-size: clamp(2.2rem, 5vw, 3.2rem); line-height: 1.05; letter-spacing: -.02em; margin: 0 0 14px; font-weight: 300; }
      .op-lede { font-size: 1.15rem; max-width: 62ch; margin: 0; color: #4a453f; }
      .op-section { margin-bottom: 52px; }
      .op-section h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -.01em; margin: 0 0 18px; }
      .op-note { color: #6f6a64; font-size: .95rem; max-width: 68ch; }
      .op-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 18px; }
      .op-stat { border: 1px solid #e7e2db; padding: 18px; background: #fff; }
      .op-stat-value { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; color: ${ACCENT}; }
      .op-stat-label { font-size: .85rem; color: #6f6a64; margin-top: 4px; }
      .op-moves { list-style: none; counter-reset: move; padding: 0; margin: 0; display: grid; gap: 20px; }
      .op-moves li { counter-increment: move; border-left: 3px solid ${ACCENT}; padding-left: 18px; }
      .op-moves h3 { margin: 0 0 6px; font-size: 1.15rem; }
      .op-moves h3::before { content: counter(move) ". "; color: ${ACCENT}; font-weight: 700; }
      .op-moves p { margin: 0; color: #4a453f; max-width: 66ch; }
      .op-offers { display: grid; gap: 14px; }
      .op-offer { border: 1px solid #e7e2db; background: #fff; padding: 20px; }
      .op-offer h3 { margin: 0 0 6px; font-size: 1.1rem; }
      .op-offer-line { margin: 0 0 12px; color: #4a453f; max-width: 70ch; }
      .op-offer-meta { margin: 0; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .op-pill { border: 1px solid ${INK}; border-radius: 999px; padding: 4px 12px; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
      .op-count { color: #6f6a64; font-size: .9rem; }
      .op-table-wrap { overflow-x: auto; margin-bottom: 14px; }
      .op-table { width: 100%; border-collapse: collapse; font-size: .95rem; }
      .op-table th { text-align: left; font-size: .75rem; text-transform: uppercase; letter-spacing: .08em; color: #6f6a64; border-bottom: 2px solid ${INK}; padding: 0 12px 8px 0; }
      .op-table td { border-bottom: 1px solid #e7e2db; padding: 12px 12px 12px 0; vertical-align: top; }
      .op-org { display: block; color: #6f6a64; font-size: .85rem; }
      .op-muted { color: #4a453f; }
      .op-score { font-weight: 700; color: ${ACCENT}; font-variant-numeric: tabular-nums; }
      .op-steps { padding-left: 20px; display: grid; gap: 10px; margin: 0 0 16px; }
      .op-steps li { max-width: 70ch; color: #4a453f; }
      .op-asks { background: #fff; border: 1px solid #e7e2db; border-top: 3px solid ${ACCENT}; padding: 28px; }
      .op-asks ul { padding-left: 20px; display: grid; gap: 12px; margin: 0; }
      .op-asks li { max-width: 68ch; color: #4a453f; }
      .op-footer { border-top: 1px solid #e7e2db; padding-top: 18px; color: #6f6a64; font-size: .85rem; }
      .op-gate { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .op-gate-card { background: #fff; border: 1px solid #e7e2db; border-top: 3px solid ${ACCENT}; padding: 36px; max-width: 420px; width: 100%; }
      .op-gate-card h1 { font-size: 1.6rem; font-weight: 300; margin: 0 0 12px; }
      .op-gate-card p { color: #6f6a64; margin: 0; }
      .op-gate-card form { display: grid; gap: 10px; margin-top: 22px; }
      .op-gate-card input { border: 1px solid #cfc9be; padding: 12px; font-size: 1rem; }
      .op-gate-card button { background: ${ACCENT}; color: #fff; border: 0; padding: 12px; font-weight: 600; font-size: 1rem; cursor: pointer; }
      @media print { .op-page { padding: 0; } .op-section { break-inside: avoid; } }
    `}</style>
  )
}
