import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient, type SanityClient } from '@sanity/client'
import { apiVersion, dataset, projectId, previewToken } from '@/sanity/env'
import {
  isMarketingPlanConfigured,
  MARKETING_PLAN_SESSION_COOKIE,
  verifyMarketingPlanSession,
} from '@/lib/marketing/marketingPlanAuth'

// ─────────────────────────────────────────────────────────────────────────────
// GoInvo — Marketing Strategy & Content Plan
//
// A shareable, presentation-quality deck (one page, "Save as PDF") that puts the
// marketing PLAN and the SUGGESTED CONTENT in one place. It reads the SEEDED
// marketing strategy live from Sanity so it stays current with the CMS.
//
// Route: /marketing-plan  (server component; clean chrome via the sibling
// layout.tsx; noindex; absent from sitemap/nav).
//
// Access gate: MARKETING_PLAN_KEY must be configured, and access is granted by
// a short-lived HttpOnly cookie created by POST /api/marketing/plan-session.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Server-side Sanity read client. Mirrors the marketing API-route pattern
// (createClient from src/sanity/env) but reads: prefer the preview token
// (read-or-write) so drafts-published seed data resolves, and never use the CDN
// so the deck reflects the latest CMS state. Created conditionally so a missing
// projectId degrades gracefully (every fetch returns its empty fallback).
let sanityClient: SanityClient | null = null
let sanityClientResolved = false
function getSanityClient(): SanityClient | null {
  if (sanityClientResolved) return sanityClient
  sanityClientResolved = true
  if (!projectId) return (sanityClient = null)
  sanityClient = createClient({
    projectId,
    dataset,
    apiVersion,
    token: previewToken || undefined,
    useCdn: false,
    perspective: 'published',
  })
  return sanityClient
}

// ── Types (only the fields the deck renders) ─────────────────────────────────

type ProofPoint = {
  title?: string
  claim?: string
  proofType?: string
  confidence?: string
  sourceTitle?: string
  sourceUrl?: string
  topicCluster?: string
}

type Pillar = {
  _id?: string
  title?: string
  coreClaim?: string
  supportingClaims?: string[]
  approvedPhrases?: string[]
  phrasesToAvoid?: string[]
  topicCluster?: string
}

type Audience = {
  _id?: string
  title?: string
  priority?: string
  audience?: string
  needs?: string[]
  pains?: string[]
  misconceptions?: string[]
  trustTriggers?: string[]
  desiredActions?: string[]
  objections?: string[]
}

type Cta = {
  _id?: string
  title?: string
  label?: string
  funnelStage?: string
  successSignal?: string
  priority?: string
  notes?: string
}

type GateCheck = {
  label?: string
  category?: string
  guidance?: string
  required?: boolean
}

type Gate = {
  _id?: string
  title?: string
  status?: string
  whenToUse?: string
  checks?: GateCheck[]
}

type Experiment = {
  _id?: string
  title?: string
  status?: string
  hypothesis?: string
  expectedSignal?: string
  targetType?: string
  targetPath?: string
  primaryMetric?: string
}

type Idea = {
  _id?: string
  title?: string
  summary?: string
  category?: string
  status?: string
  priority?: string
  effort?: string
  nextAction?: string
  source?: string
}

type CompetitorTally = { name?: string; count?: number }

type Snapshot = {
  _id?: string
  runDate?: string
  model?: string
  promptCount?: number
  answeredCount?: number
  mentionRate?: number
  citationRate?: number
  mentionedCount?: number
  citedCount?: number
  unavailable?: boolean
  topCompetitors?: CompetitorTally[]
}

// ── GROQ ─────────────────────────────────────────────────────────────────────

const PILLARS_QUERY = `*[_type == "marketingMessagePillar" && defined(coreClaim) && coreClaim != ""]{
  _id, title, coreClaim, supportingClaims, approvedPhrases, phrasesToAvoid, topicCluster
}`

const PROOF_QUERY = `*[_type == "marketingProofPoint"]{
  title, claim, proofType, confidence, sourceTitle, sourceUrl, topicCluster
}`

const AUDIENCES_QUERY = `*[_type == "marketingAudienceProfile"]{
  _id, title, priority, audience, needs, pains, misconceptions, trustTriggers, desiredActions, objections
}`

const CTAS_QUERY = `*[_type == "marketingCta"]{
  _id, title, label, funnelStage, successSignal, priority, notes
}`

const GATES_QUERY = `*[_type == "marketingQualityGate" && status == "active"]{
  _id, title, status, whenToUse, checks[]{ label, category, guidance, required }
}`

const EXPERIMENTS_QUERY = `*[_type == "marketingExperiment"]{
  _id, title, status, hypothesis, expectedSignal, targetType, targetPath, primaryMetric
}`

const IDEAS_QUERY = `*[_type == "marketingIdea"]{
  _id, title, summary, category, status, priority, effort, nextAction, source
}`

const SNAPSHOT_QUERY = `*[_type == "aiCitationSnapshot"]|order(runDate desc)[0]{
  _id, runDate, model, promptCount, answeredCount, mentionRate, citationRate,
  mentionedCount, citedCount, unavailable, topCompetitors[]{ name, count }
}`

async function safeFetch<T>(query: string, fallback: T): Promise<T> {
  const client = getSanityClient()
  if (!client) return fallback
  try {
    const result = await client.fetch<T>(query)
    return result ?? fallback
  } catch (error) {
    console.error('marketing-plan Sanity fetch failed:', error)
    return fallback
  }
}

// ── Static narrative (source of truth: project_positioning_strategy.md) ──────
// These are the curated, non-CMS strategy artifacts (commercial money-terms, the
// AI-citation finding, and the Red Team play). They live here because they are
// editorial framing, not CMS records, and they give the deck its spine even when
// a CMS query is empty.

const CAPTURE_TIERS = [
  {
    tier: 'Tier 1',
    name: 'Boston instant-wins',
    move: 'Rewrite titles + meta on the Boston UX cluster where we already rank page 1 but earn ~0% CTR.',
    examples: '"ux consulting firm boston" (pos 3), "user experience agency boston" (pos 3.5), "ux design agency boston" (pos 6)',
    effort: 'Lowest effort',
    payoff: 'Capture latent clicks we already earn impressions for.',
  },
  {
    tier: 'Tier 2',
    name: 'Page-2 pushes',
    move: 'Concentrate relevance on terms sitting just off page 1 — a focused page + shipped-proof internal links.',
    examples: '"healthcare ux design agency" (128 impressions, pos 16.6) → page 1',
    effort: 'Medium effort',
    payoff: 'Move from page 2 to page 1 where the clicks live.',
  },
  {
    tier: 'Tier 3',
    name: 'Dedicated money-term pages',
    move: 'Stand up proof-led pages for the high-ticket commercial terms with the literal money-term as H1.',
    examples: 'healthcare design agency · healthcare UX · EHR design · medical device design',
    effort: 'Larger effort',
    payoff: 'Own the commercial demand we are currently invisible for.',
  },
] as const

const FAILURE_TAXONOMY = [
  { id: 'F1', pattern: "Workflows don't survive reality", tell: 'Map the design against a real clinician day — does the happy path survive the first interruption, override, or edge case?', goinvo: 'GoInvo OSS / shipped workflow work' },
  { id: 'F2', pattern: 'Clinicians route around it', tell: 'Watch for the shadow workflow — the sticky note, the second screen, the export-to-Excel that means the tool lost.', goinvo: 'Workflow-native clinical UX' },
  { id: 'F3', pattern: 'Black box / no inspectable evidence', tell: 'Can a skeptical clinician see why the system said what it said before they trust it?', goinvo: '"Verify before you sign" — published, auditable work' },
  { id: 'F4', pattern: 'Patient burden underestimated', tell: 'Count the taps, trips, and reading-level demands the design quietly pushes onto the patient.', goinvo: 'MA SNAP 7%→70%, patient-facing redesigns' },
  { id: 'F5', pattern: 'Operational complexity', tell: 'Trace what has to go right operationally for the demo to become the deployed reality.', goinvo: 'Regulated-environment delivery' },
  { id: 'F6', pattern: 'Org-chart, not care', tell: 'Ask whose convenience the design optimizes — the care, or the reporting line that funded it.', goinvo: 'Senior, care-centered design judgment' },
  { id: 'F7', pattern: 'No path to shippable', tell: 'Is there a working prototype, or just PoC theater that never crosses into production?', goinvo: 'The literal Red Team promise — working prototype + risk map' },
  { id: 'F8', pattern: 'Illegible data / standard layer', tell: 'Is the data model legible and standards-based, or a bespoke schema that will rot?', goinvo: 'GoInvo OSS: FHIR / SHR / Flux' },
] as const

// ── Small presentation helpers ───────────────────────────────────────────────

function priorityRank(priority?: string): number {
  switch ((priority || '').toLowerCase()) {
    case 'high':
    case 'primary':
      return 0
    case 'medium':
    case 'secondary':
      return 1
    case 'low':
    case 'niche':
      return 2
    default:
      return 3
  }
}

const PROOF_CLUSTER_TO_PILLAR: Record<string, string> = {
  'verify-before-you-sign': 'Verify Before You Sign (Lead)',
  'ship-in-regulated-environments': 'We Ship In Regulated Environments',
  'healthcare-only-for-20-years': 'Healthcare-Only For 20 Years',
  'medtech-fda-and-funding': 'We Ship In Regulated Environments',
}

function formatPct(n?: number): string {
  return typeof n === 'number' && Number.isFinite(n) ? `${Math.round(n * 100)}%` : '—'
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Roadmap bucketing: combine ideas (content + supporting build work) +
// experiments + tiers, grouped Now / Next / Later by priority.
type RoadmapItem = {
  title: string
  detail: string
  kind: 'Content' | 'Build' | 'Experiment' | 'Page target'
  effort?: string
  nextAction?: string
}

// Internal dashboard/tooling ideas that live in the marketing CMS but are NOT
// part of an audience-facing content plan (they describe building admin UI, not
// content to publish). Excluded from the shareable roadmap so the deliverable
// stays a clean "suggested content" list a founder can forward as-is.
const ROADMAP_IDEA_EXCLUDE = new Set<string>([
  'A/B view: Refresh-from-GA4 button + last-fetched timestamp',
  'Content-brief generation from GSC queries',
])

function bucketForPriority(priority?: string): 'Now' | 'Next' | 'Later' {
  const r = priorityRank(priority)
  if (r === 0) return 'Now'
  if (r === 1) return 'Next'
  return 'Later'
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function MarketingPlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!isMarketingPlanConfigured()) notFound()

  const cookieStore = await cookies()
  const session = cookieStore.get(MARKETING_PLAN_SESSION_COOKIE)?.value
  if (!verifyMarketingPlanSession(session)) {
    const params = await searchParams
    const denied = params.denied === '1' || (Array.isArray(params.denied) && params.denied[0] === '1')
    return (
      <main className="mp-access-shell">
        <section className="mp-access-card" aria-labelledby="marketing-plan-access-title">
          <p className="mp-eyebrow">Internal GoInvo document</p>
          <h1 id="marketing-plan-access-title">Marketing plan access</h1>
          <p>Enter the team access key. It is submitted securely and is never placed in the URL.</p>
          <form method="post" action="/api/marketing/plan-session">
            <label htmlFor="marketing-plan-key">Access key</label>
            <input id="marketing-plan-key" name="key" type="password" autoComplete="current-password" required />
            <button type="submit">Open marketing plan</button>
          </form>
          {denied && <p role="alert" className="mp-access-error">That access key was not accepted.</p>}
        </section>
        <style>{`
          .mp-access-shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f5f4f0; color: #24434d; }
          .mp-access-card { width: min(100%, 440px); border: 1px solid #d8d6d0; border-radius: 8px; background: white; padding: 32px; box-shadow: 0 12px 40px rgba(36,67,77,.12); }
          .mp-access-card h1 { margin: 4px 0 12px; font-family: var(--font-serif); font-size: 2rem; font-weight: 400; }
          .mp-access-card p { line-height: 1.5; }
          .mp-eyebrow { margin: 0; color: #007385; font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
          .mp-access-card form { display: grid; gap: 8px; margin-top: 24px; }
          .mp-access-card label { font-weight: 700; font-size: .875rem; }
          .mp-access-card input { min-height: 44px; border: 1px solid #8a969a; border-radius: 4px; padding: 8px 10px; font: inherit; }
          .mp-access-card button { min-height: 44px; margin-top: 8px; border: 0; border-radius: 4px; background: #007385; color: white; padding: 10px 16px; font: inherit; font-weight: 700; cursor: pointer; }
          .mp-access-error { color: #a12820; font-weight: 700; }
        `}</style>
      </main>
    )
  }

  const [pillars, proof, audiences, ctas, gates, experiments, ideas, snapshot] = await Promise.all([
    safeFetch<Pillar[]>(PILLARS_QUERY, []),
    safeFetch<ProofPoint[]>(PROOF_QUERY, []),
    safeFetch<Audience[]>(AUDIENCES_QUERY, []),
    safeFetch<Cta[]>(CTAS_QUERY, []),
    safeFetch<Gate[]>(GATES_QUERY, []),
    safeFetch<Experiment[]>(EXPERIMENTS_QUERY, []),
    safeFetch<Idea[]>(IDEAS_QUERY, []),
    safeFetch<Snapshot | null>(SNAPSHOT_QUERY, null),
  ])

  // Order pillars: lead positioning first.
  const PILLAR_ORDER = [
    'Master Positioning',
    'Verify Before You Sign (Lead)',
    'We Ship In Regulated Environments',
    'Healthcare-Only For 20 Years',
    'The People Who Pitch Are The People Who Build',
  ]
  const orderedPillars = [...pillars].sort((a, b) => {
    const ai = PILLAR_ORDER.indexOf(a.title || '')
    const bi = PILLAR_ORDER.indexOf(b.title || '')
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  // Proof grouped under pillar (by topicCluster mapping). Anything unmapped
  // becomes a general evidence bucket.
  const proofByPillar = new Map<string, ProofPoint[]>()
  const proofGeneral: ProofPoint[] = []
  for (const p of proof) {
    const pillarTitle = p.topicCluster ? PROOF_CLUSTER_TO_PILLAR[p.topicCluster] : undefined
    if (pillarTitle) {
      const arr = proofByPillar.get(pillarTitle) || []
      arr.push(p)
      proofByPillar.set(pillarTitle, arr)
    } else {
      proofGeneral.push(p)
    }
  }

  // Audiences: the focused buyer profiles first, by priority. Keep all from CMS.
  const orderedAudiences = [...audiences].sort(
    (a, b) => priorityRank(a.priority) - priorityRank(b.priority),
  )

  // Build the roadmap from ideas (content + product/Red-Team build items) +
  // experiments + the Tier page targets.
  const roadmap: Record<'Now' | 'Next' | 'Later', RoadmapItem[]> = { Now: [], Next: [], Later: [] }

  const roadmapIdeaCategories = new Set(['content', 'product'])
  for (const idea of ideas) {
    const category = (idea.category || '').toLowerCase()
    if (!roadmapIdeaCategories.has(category)) continue
    if ((idea.status || '').toLowerCase() === 'dropped' || (idea.status || '').toLowerCase() === 'shipped') continue
    if (ROADMAP_IDEA_EXCLUDE.has(idea.title || '')) continue
    // Content-category ideas are the publishable pieces; product-category ideas
    // are the supporting build work (e.g. the page template) — label them
    // honestly as "Build" rather than dressing them up as content.
    roadmap[bucketForPriority(idea.priority)].push({
      title: idea.title || 'Untitled idea',
      detail: idea.summary || '',
      kind: category === 'product' ? 'Build' : 'Content',
      effort: idea.effort,
      nextAction: idea.nextAction,
    })
  }

  for (const exp of experiments) {
    // Experiments are sequenced by their own readiness; treat "running" as Now,
    // the named idea-stage tests as Next.
    const bucket: 'Now' | 'Next' | 'Later' = (exp.status || '').toLowerCase() === 'running' ? 'Now' : 'Next'
    roadmap[bucket].push({
      title: exp.title || 'Untitled experiment',
      detail: exp.hypothesis || '',
      kind: 'Experiment',
      effort: exp.primaryMetric ? `Primary metric: ${exp.primaryMetric}` : undefined,
      nextAction: exp.expectedSignal,
    })
  }

  // Tier page targets onto the roadmap (Tier 1 = Now, Tier 2 = Next, Tier 3 = Later).
  const tierBucket: Record<string, 'Now' | 'Next' | 'Later'> = {
    'Tier 1': 'Now',
    'Tier 2': 'Next',
    'Tier 3': 'Later',
  }
  for (const t of CAPTURE_TIERS) {
    roadmap[tierBucket[t.tier]].push({
      title: `${t.tier} — ${t.name}`,
      detail: t.move,
      kind: 'Page target',
      effort: t.effort,
      nextAction: t.payoff,
    })
  }

  const hasAnyCms =
    orderedPillars.length || audiences.length || ctas.length || gates.length || experiments.length || ideas.length

  return (
    <main className="mp-root">
      <style>{PRINT_AND_PAGE_CSS}</style>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="mp-hero">
        <div className="mp-shell">
          <span className="mp-badge">Recommendation · June 2026</span>
          <h1 className="mp-hero-title">GoInvo — Marketing Strategy &amp; Content Plan</h1>
          <p className="mp-hero-summary">
            Become the healthcare-only design and engineering studio whose work you can verify before
            you sign — then capture the commercial demand we already rank for, and turn our failure
            expertise into the content that lands it.
          </p>
          <div className="mp-hero-meta">
            <span>Part 1 — Strategy</span>
            <span className="mp-dot" aria-hidden="true">•</span>
            <span>Part 2 — Suggested Content &amp; Roadmap</span>
            <span className="mp-dot" aria-hidden="true">•</span>
            <span className="mp-print-hint">Tip: print or “Save as PDF” to share</span>
          </div>
          {!hasAnyCms && (
            <p className="mp-empty-note">
              Live CMS data is unavailable in this environment, so the deck shows its strategy spine
              without the seeded records.
            </p>
          )}
        </div>
      </header>

      <div className="mp-shell mp-body">
        {/* ── PART 1 LABEL ─────────────────────────────────────── */}
        <div className="mp-part-label">Part 1 · Strategy</div>

        {/* ── 2. POSITIONING ───────────────────────────────────── */}
        <Section id="positioning" eyebrow="01 · Positioning" title="The one move: the safer bet you can verify">
          <div className="mp-lead-callout">
            “GoInvo is the healthcare-only design and engineering studio whose work you can verify
            before you sign — and that&apos;s why it&apos;s the safer bet.”
          </div>
          <div className="mp-grid-2">
            <Card title="Studio, not “consulting.”">
              <p>
                Drop the word <em>consulting</em> — it inherits big-consulting distrust, misdescribes a
                team that ships software (not decks), and loses the SEO money-terms. <strong>Studio</strong>{' '}
                is literally true: craft, named makers, shipped artifacts.
              </p>
            </Card>
            <Card title="The foil is a failure mode — not McKinsey.">
              <p>
                Position against <strong>“strategy that never ships”</strong> — the stalled pilot, the
                deck that gathers dust. Never punch up at McKinsey by name (different buyer, reads small,
                and it drags us into their sentence).
              </p>
            </Card>
            <Card title="Take the “safe choice” territory.">
              <p>
                The lower-risk bet is the one you can verify before you sign — exactly what an open
                studio lets a finance / compliance committee do.
              </p>
            </Card>
            <Card title="Register: quiet confidence.">
              <p>
                Never grievance, rebel, or fear. The anti-establishment pose repels the budget-holding
                committee. The only sanctioned consulting reference is the JAMA finding (&gt;$7.8B spent
                on consultants, little measurable improvement) — used to redefine <em>risk</em>, never to
                name-and-shame.
              </p>
            </Card>
          </div>
        </Section>

        {/* ── 3. AUDIENCES ─────────────────────────────────────── */}
        <Section id="audiences" eyebrow="02 · Audiences" title="The buyers we are writing for">
          {orderedAudiences.length === 0 ? (
            <EmptyNote label="No audience profiles found in the CMS yet." />
          ) : (
            <div className="mp-audience-grid">
              {orderedAudiences.map((a) => (
                <article key={a._id || a.title} className="mp-audience-card">
                  <div className="mp-audience-head">
                    <h3>{a.title}</h3>
                    {a.priority && <span className={`mp-pill mp-pill-${a.priority}`}>{a.priority}</span>}
                  </div>
                  {a.audience && <p className="mp-audience-who">{a.audience}</p>}
                  <div className="mp-audience-cols">
                    <MiniList label="Needs" items={a.needs} tone="need" />
                    <MiniList label="Fears / pains" items={a.pains} tone="fear" />
                    <MiniList label="Trust triggers" items={a.trustTriggers} tone="trust" />
                  </div>
                </article>
              ))}
            </div>
          )}
        </Section>

        {/* ── 4. MESSAGING PILLARS + PROOF ─────────────────────── */}
        <Section id="pillars" eyebrow="03 · Messaging" title="Messaging pillars + the proof behind them">
          {orderedPillars.length === 0 ? (
            <EmptyNote label="No message pillars found in the CMS yet." />
          ) : (
            <div className="mp-pillar-stack">
              {orderedPillars.map((p) => {
                const linkedProof = proofByPillar.get(p.title || '') || []
                const isMaster = p.title === 'Master Positioning'
                return (
                  <article key={p._id || p.title} className={`mp-pillar ${isMaster ? 'mp-pillar-master' : ''}`}>
                    <div className="mp-pillar-head">
                      <h3>{p.title}</h3>
                      {p.topicCluster && <span className="mp-cluster">{p.topicCluster}</span>}
                    </div>
                    <p className="mp-pillar-claim">{p.coreClaim}</p>
                    {p.supportingClaims && p.supportingClaims.length > 0 && (
                      <ul className="mp-bullets">
                        {p.supportingClaims.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    )}
                    {linkedProof.length > 0 && (
                      <div className="mp-proof-row">
                        <span className="mp-proof-label">Proof</span>
                        <div className="mp-proof-chips">
                          {linkedProof.map((pr, i) => (
                            <span key={i} className="mp-proof-chip" title={pr.claim}>
                              {pr.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(p.approvedPhrases?.length || p.phrasesToAvoid?.length) ? (
                      <div className="mp-phrase-grid">
                        {p.approvedPhrases && p.approvedPhrases.length > 0 && (
                          <div className="mp-phrase-col mp-phrase-use">
                            <span className="mp-phrase-h">Reusable language</span>
                            <ul>{p.approvedPhrases.map((x, i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                        )}
                        {p.phrasesToAvoid && p.phrasesToAvoid.length > 0 && (
                          <div className="mp-phrase-col mp-phrase-avoid">
                            <span className="mp-phrase-h">Framing to avoid</span>
                            <ul>{p.phrasesToAvoid.map((x, i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                )
              })}
              {proofGeneral.length > 0 && (
                <article className="mp-pillar">
                  <div className="mp-pillar-head">
                    <h3>Additional proof in the evidence locker</h3>
                  </div>
                  <div className="mp-proof-chips">
                    {proofGeneral.map((pr, i) => (
                      <span key={i} className="mp-proof-chip" title={pr.claim}>
                        {pr.title}
                      </span>
                    ))}
                  </div>
                </article>
              )}
            </div>
          )}
        </Section>

        {/* ── 5. COMMERCIAL MONEY-TERMS ────────────────────────── */}
        <Section
          id="money-terms"
          eyebrow="04 · Commercial"
          title="The money-terms: we rank, but earn ~0 clicks"
        >
          <p className="mp-section-intro">
            GoInvo&apos;s search visibility sits on low-commercial-intent “open source” terms, while the
            high-ticket commercial terms (healthcare design agency, healthcare UX, EHR design, medical
            device design, the Boston UX cluster) are latent. We already rank page 1–2 and earn{' '}
            <strong>~0 clicks</strong> — that&apos;s a capture problem, not a ranking problem.
          </p>
          <div className="mp-tier-grid">
            {CAPTURE_TIERS.map((t) => (
              <article key={t.tier} className="mp-tier-card">
                <div className="mp-tier-top">
                  <span className="mp-tier-badge">{t.tier}</span>
                  <span className="mp-tier-effort">{t.effort}</span>
                </div>
                <h3 className="mp-tier-name">{t.name}</h3>
                <p className="mp-tier-move">{t.move}</p>
                <p className="mp-tier-examples">{t.examples}</p>
                <p className="mp-tier-payoff">{t.payoff}</p>
              </article>
            ))}
          </div>
          <div className="mp-trap">
            <span className="mp-trap-label">The patient-experience trap</span>
            <p>
              Don&apos;t pit “patient, not P&amp;L” — it terrifies the ROI/finance buyer who controls the
              budget. The win is <strong>both</strong>: we move the numbers and the outcomes. Capture the
              high-intent commercial searcher, then route the open-source audience to the paid offer.
            </p>
          </div>
        </Section>

        {/* ── 6. AI-CITATION SHARE-OF-VOICE ────────────────────── */}
        <Section
          id="ai-citation"
          eyebrow="05 · AI visibility"
          title="AI-citation share-of-voice"
        >
          <p className="mp-section-intro">
            The finding: GoInvo is <strong>strong only on “open source”</strong> queries and weak on the
            commercial ones. AI answer engines are an emerging discovery surface — being cited for “why
            healthcare software fails” and the money-terms is the GEO prize.
          </p>
          <div className="mp-snapshot">
            {snapshot && !snapshot.unavailable ? (
              <>
                <div className="mp-snapshot-stats">
                  <Stat label="Mention rate" value={formatPct(snapshot.mentionRate)} />
                  <Stat label="Citation rate" value={formatPct(snapshot.citationRate)} />
                  <Stat
                    label="Prompts answered"
                    value={`${snapshot.answeredCount ?? '—'} / ${snapshot.promptCount ?? '—'}`}
                  />
                  <Stat label="Run date" value={formatDate(snapshot.runDate)} />
                </div>
                {snapshot.topCompetitors && snapshot.topCompetitors.length > 0 && (
                  <div className="mp-snapshot-comp">
                    <span className="mp-proof-label">Top competitors surfaced</span>
                    <div className="mp-proof-chips">
                      {snapshot.topCompetitors.map((c, i) => (
                        <span key={i} className="mp-proof-chip">
                          {c.name} {typeof c.count === 'number' ? `· ${c.count}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mp-snapshot-empty">
                <span className="mp-proof-label">Latest snapshot</span>
                <p>
                  No AI-citation snapshot has been recorded yet. The tracker (
                  <code>POST /api/marketing/ai-citation</code>) runs a fixed prompt panel and stores
                  mention-rate, citation-rate, and the competitors surfaced over time. Once a run lands,
                  the live numbers appear here.
                </p>
              </div>
            )}
          </div>
        </Section>

        {/* ── 7. THE RED TEAM PLAY ─────────────────────────────── */}
        <Section id="red-team" eyebrow="06 · The land offer" title="The Red Team play — the “Software M&amp;M”">
          <div className="mp-grid-2 mp-redteam-intro">
            <Card title="The register: an M&amp;M conference.">
              <p>
                Hold morbidity-&amp;-mortality rounds for clinical software: blameless, “what &amp; how”
                never “why &amp; who,” unsparing about the <em>system</em>, generous to the <em>people</em>.
                Specificity is authority; vagueness reads as fear.
              </p>
            </Card>
            <Card title="The de-risking core.">
              <p>
                A 4–8 week productized clinical-software de-risking sprint → a working prototype + risk
                map. “Design as a diagnostic tool.” It de-risks the client&apos;s <em>product</em>; the
                positioning de-risks their <em>vendor choice</em> — the same move, two levels.
              </p>
            </Card>
          </div>

          <h3 className="mp-subhead">The F1–F8 Clinical Software Failure Taxonomy</h3>
          <p className="mp-section-intro">
            The evergreen engine and IP: an owned, citable taxonomy of why clinical software fails — each
            pattern with a falsifiable <strong>tell</strong> the reader runs on their <em>own</em> product.
          </p>
          <div className="mp-table-wrap">
            <table className="mp-taxonomy">
              <thead>
                <tr>
                  <th className="mp-th-id">#</th>
                  <th>Failure pattern</th>
                  <th>The tell (run it on your own product)</th>
                  <th className="mp-th-go">GoInvo lens</th>
                </tr>
              </thead>
              <tbody>
                {FAILURE_TAXONOMY.map((f) => (
                  <tr key={f.id}>
                    <td className="mp-td-id">{f.id}</td>
                    <td className="mp-td-pattern">{f.pattern}</td>
                    <td>{f.tell}</td>
                    <td className="mp-td-go">{f.goinvo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mp-grid-3 mp-redteam-rules">
            <Card title="Defunct-only launch cases.">
              <p>
                IBM Watson for Oncology, Theranos (a short contrast device), Haven. <strong>Not</strong>{' '}
                Oracle-Cerner or any living, litigious, or plausible-future-client company.
              </p>
            </Card>
            <Card title="#1 risk: reach ≠ revenue.">
              <p>
                The teardown audience (design Twitter, students, journalists, competitors) is not the
                buyer; virality is inversely correlated with purchase intent. Defeat it with a{' '}
                <strong>gated self-diagnostic</strong> and measure qualified discovery calls, not
                pageviews.
              </p>
            </Card>
            <Card title="The go / no-go.">
              <p>
                Taxonomy + self-diagnostic + funnel = unconditional greenlight. Named teardowns =
                conditional: finite (~6–8), counsel-gated, defunct-only, 2:1 self-teardown-first,
                instrumented from day one, with a 90-day pipeline kill switch.
              </p>
            </Card>
          </div>
        </Section>

        {/* ── 8. WHAT TO AVOID (QUALITY GATES) ─────────────────── */}
        <Section id="avoid" eyebrow="07 · Guardrails" title="What to avoid — the quality gates">
          {gates.length === 0 ? (
            <EmptyNote label="No active quality gates found in the CMS yet." />
          ) : (
            <div className="mp-gate-stack">
              {gates.map((g) => (
                <article key={g._id || g.title} className="mp-gate">
                  <div className="mp-gate-head">
                    <h3>{g.title}</h3>
                    {g.status && <span className="mp-pill mp-pill-active">{g.status}</span>}
                  </div>
                  {g.whenToUse && <p className="mp-gate-when">{g.whenToUse}</p>}
                  {g.checks && g.checks.length > 0 && (
                    <ul className="mp-gate-checks">
                      {g.checks.map((c, i) => (
                        <li key={i} className={c.required ? 'mp-check-required' : ''}>
                          <span className="mp-check-label">
                            {c.label}
                            {c.required && <span className="mp-req">required</span>}
                          </span>
                          {c.guidance && <span className="mp-check-guide">{c.guidance}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </Section>

        {/* ── PART 2 LABEL ─────────────────────────────────────── */}
        <div className="mp-part-label mp-part-2">Part 2 · Suggested Content &amp; Roadmap</div>

        {/* ── 9. CONTENT ROADMAP ───────────────────────────────── */}
        <Section
          id="roadmap"
          eyebrow="08 · Roadmap"
          title="Prioritized content roadmap — Now / Next / Later"
        >
          <p className="mp-section-intro">
            What to make, in order. Combines the content ideas (the failure-pattern library, the
            teardowns, the gated self-diagnostic, “where our designs didn&apos;t survive,” the money-term
            pages), the live experiments (Boston rewrite, gated-diagnostic test, healthcare-UX page-2
            push), and the Tier 1/2/3 page targets — grouped by priority, each with effort and the next
            action.
          </p>
          <div className="mp-roadmap-grid">
            {(['Now', 'Next', 'Later'] as const).map((bucket) => (
              <div key={bucket} className={`mp-roadmap-col mp-roadmap-${bucket.toLowerCase()}`}>
                <div className="mp-roadmap-head">
                  <h3>{bucket}</h3>
                  <span className="mp-roadmap-count">{roadmap[bucket].length}</span>
                </div>
                {roadmap[bucket].length === 0 ? (
                  <p className="mp-roadmap-empty">Nothing queued.</p>
                ) : (
                  <ol className="mp-roadmap-list">
                    {roadmap[bucket].map((item, i) => (
                      <li key={i} className="mp-roadmap-item">
                        <div className="mp-roadmap-item-top">
                          <span className={`mp-kind mp-kind-${item.kind.replace(/\s/g, '').toLowerCase()}`}>
                            {item.kind}
                          </span>
                          {item.effort && <span className="mp-roadmap-effort">{item.effort}</span>}
                        </div>
                        <h4 className="mp-roadmap-item-title">{item.title}</h4>
                        {item.detail && <p className="mp-roadmap-item-detail">{item.detail}</p>}
                        {item.nextAction && (
                          <p className="mp-roadmap-next">
                            <span>Next:</span> {item.nextAction}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>

          {/* CTA ladder pulled from the CMS, as the funnel destinations. */}
          {ctas.length > 0 && (
            <div className="mp-cta-block">
              <h3 className="mp-subhead">The CTA ladder these route to</h3>
              <div className="mp-cta-grid">
                {[...ctas]
                  .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
                  .map((c) => (
                    <article key={c._id || c.title} className="mp-cta-card">
                      <div className="mp-cta-top">
                        {c.funnelStage && <span className="mp-cta-stage">{c.funnelStage}</span>}
                        {c.priority && <span className={`mp-pill mp-pill-${c.priority}`}>{c.priority}</span>}
                      </div>
                      <p className="mp-cta-label">“{c.label}”</p>
                      {c.successSignal && <p className="mp-cta-signal">{c.successSignal}</p>}
                    </article>
                  ))}
              </div>
            </div>
          )}
        </Section>

        <footer className="mp-footer">
          <p>
            GoInvo · Marketing Strategy &amp; Content Plan · Recommendation, June 2026. Internal — not
            adopted policy. Strategy reflects the live marketing CMS.
          </p>
        </footer>
      </div>
    </main>
  )
}

// ── Reusable presentation components ─────────────────────────────────────────

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="mp-section">
      <div className="mp-section-head">
        <span className="mp-eyebrow">{eyebrow}</span>
        <h2 className="mp-section-title" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      {children}
    </section>
  )
}

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mp-card">
      <h4 className="mp-card-title">{title}</h4>
      <div className="mp-card-body">{children}</div>
    </div>
  )
}

function MiniList({ label, items, tone }: { label: string; items?: string[]; tone: string }) {
  if (!items || items.length === 0) return null
  return (
    <div className={`mp-mini mp-mini-${tone}`}>
      <span className="mp-mini-label">{label}</span>
      <ul>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mp-stat">
      <span className="mp-stat-value">{value}</span>
      <span className="mp-stat-label">{label}</span>
    </div>
  )
}

function EmptyNote({ label }: { label: string }) {
  return <p className="mp-empty-note">{label}</p>
}

// ── Print + page CSS (scoped under .mp-root) ─────────────────────────────────
// Reuses the site's design tokens (--color-*, --font-serif/sans) from globals.css.
// Print rules give clean margins, page-breaks between major sections, and hide
// any interactive chrome so "Save as PDF" yields a shareable document.

const PRINT_AND_PAGE_CSS = `
.mp-root {
  --mp-ink: var(--color-black);
  --mp-muted: var(--color-gray);
  --mp-line: var(--color-gray-medium);
  --mp-bg: var(--color-white);
  --mp-soft: var(--color-gray-lightest);
  --mp-primary: var(--color-primary);
  --mp-primary-soft: var(--color-primary-lightest);
  --mp-secondary: var(--color-secondary);
  --mp-tertiary: var(--color-tertiary);
  --mp-tertiary-soft: var(--color-tertiary-lightest);
  color: var(--mp-ink);
  background: var(--mp-bg);
  font-family: var(--font-sans);
  line-height: 1.55;
}
.mp-shell {
  max-width: 1040px;
  margin: 0 auto;
  padding: 0 2rem;
}
@media (max-width: 640px) { .mp-shell { padding: 0 1.1rem; } }

/* Hero */
.mp-hero {
  background: linear-gradient(160deg, var(--mp-tertiary) 0%, #16323b 100%);
  color: var(--color-white);
  padding: 3.4rem 0 3rem;
  border-bottom: 4px solid var(--mp-primary);
}
.mp-badge {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--color-white);
  background: var(--mp-primary);
  padding: 0.32rem 0.8rem;
  border-radius: 2px;
}
.mp-hero-title {
  font-family: var(--font-serif);
  color: var(--color-white);
  font-size: 2.7rem;
  line-height: 1.1;
  margin: 1rem 0 0.9rem;
  font-weight: 400;
}
.mp-hero-summary {
  font-size: 1.2rem;
  max-width: 46rem;
  color: #e9eef0;
  margin: 0 0 1.3rem;
}
.mp-hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  letter-spacing: 0.4px;
  color: #b9c7cc;
  text-transform: uppercase;
  font-weight: 600;
}
.mp-hero-meta .mp-dot { color: var(--mp-primary); }
.mp-print-hint { text-transform: none; font-weight: 400; font-style: italic; letter-spacing: 0; }

.mp-body { padding-bottom: 4rem; }

.mp-part-label {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--mp-primary);
  border-bottom: 2px solid var(--mp-primary);
  padding: 2.6rem 0 0.7rem;
  margin-bottom: 0.6rem;
  font-weight: 600;
}
.mp-part-2 { margin-top: 1rem; }

/* Section scaffold */
.mp-section {
  padding: 2.4rem 0;
  border-bottom: 1px solid var(--mp-line);
}
.mp-section:last-of-type { border-bottom: none; }
.mp-section-head { margin-bottom: 1.4rem; }
.mp-eyebrow {
  display: block;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--mp-secondary);
  margin-bottom: 0.45rem;
}
.mp-section-title {
  font-family: var(--font-serif);
  font-size: 2rem;
  line-height: 1.12;
  font-weight: 400;
  color: var(--mp-ink);
  margin: 0;
}
.mp-section-intro {
  font-size: 1.05rem;
  color: var(--mp-muted);
  max-width: 52rem;
  margin: 0 0 1.4rem;
}
.mp-subhead {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 400;
  margin: 2rem 0 0.4rem;
  color: var(--mp-ink);
}

/* Lead callout */
.mp-lead-callout {
  font-family: var(--font-serif);
  font-size: 1.6rem;
  line-height: 1.32;
  color: var(--mp-tertiary);
  border-left: 5px solid var(--mp-primary);
  background: var(--mp-primary-soft);
  padding: 1.2rem 1.5rem;
  margin: 0 0 1.8rem;
  border-radius: 0 4px 4px 0;
}

/* Generic card grids */
.mp-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.mp-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
@media (max-width: 760px) {
  .mp-grid-2, .mp-grid-3 { grid-template-columns: 1fr; }
}
.mp-card {
  background: var(--mp-soft);
  border: 1px solid var(--mp-line);
  border-radius: 6px;
  padding: 1.1rem 1.2rem;
}
.mp-card-title {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--mp-tertiary);
}
.mp-card-body p { margin: 0; font-size: 0.94rem; color: var(--mp-muted); }
.mp-card-body em { color: var(--mp-ink); font-style: italic; }
.mp-card-body strong { color: var(--mp-ink); }

/* Audiences */
.mp-audience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
@media (max-width: 860px) { .mp-audience-grid { grid-template-columns: 1fr; } }
.mp-audience-card {
  border: 1px solid var(--mp-line);
  border-top: 4px solid var(--mp-secondary);
  border-radius: 6px;
  padding: 1.1rem 1.2rem;
  background: var(--mp-bg);
}
.mp-audience-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; }
.mp-audience-head h3 {
  font-family: var(--font-serif);
  font-size: 1.18rem;
  margin: 0;
  font-weight: 400;
  line-height: 1.2;
}
.mp-audience-who { font-size: 0.9rem; color: var(--mp-muted); margin: 0.5rem 0 0.9rem; }
.mp-audience-cols { display: grid; gap: 0.7rem; }
.mp-mini-label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}
.mp-mini ul { margin: 0; padding-left: 1rem; list-style: none; }
.mp-mini li { font-size: 0.86rem; color: var(--mp-ink); margin-bottom: 0.18rem; position: relative; padding-left: 0.7rem; }
.mp-mini li::before { content: ''; position: absolute; left: 0; top: 0.62em; width: 5px; height: 5px; border-radius: 50%; }
.mp-mini-need .mp-mini-label { color: var(--mp-secondary); }
.mp-mini-need li::before { background: var(--mp-secondary); }
.mp-mini-fear .mp-mini-label { color: var(--color-red); }
.mp-mini-fear li::before { background: var(--color-red); }
.mp-mini-trust .mp-mini-label { color: var(--mp-primary); }
.mp-mini-trust li::before { background: var(--mp-primary); }

/* Pills */
.mp-pill {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}
.mp-pill-primary { background: var(--mp-primary-soft); color: var(--mp-primary); }
.mp-pill-secondary { background: var(--mp-tertiary-soft); color: var(--mp-secondary); }
.mp-pill-niche, .mp-pill-experimental { background: var(--color-gray-light); color: var(--mp-muted); }
.mp-pill-active { background: #e6f3ea; color: #2e7d4f; }
.mp-pill-contextual { background: var(--color-gray-light); color: var(--mp-muted); }

/* Pillars */
.mp-pillar-stack { display: grid; gap: 1.1rem; }
.mp-pillar {
  border: 1px solid var(--mp-line);
  border-radius: 6px;
  padding: 1.2rem 1.3rem;
  background: var(--mp-bg);
}
.mp-pillar-master {
  border: 1px solid var(--mp-primary);
  background: var(--mp-primary-soft);
}
.mp-pillar-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap; }
.mp-pillar-head h3 {
  font-family: var(--font-serif);
  font-size: 1.32rem;
  font-weight: 400;
  margin: 0;
}
.mp-cluster { font-size: 0.72rem; color: var(--mp-muted); font-family: var(--font-sans); }
.mp-pillar-claim { font-size: 1.08rem; font-weight: 600; color: var(--mp-tertiary); margin: 0.6rem 0 0.7rem; }
.mp-bullets { margin: 0 0 0.6rem; padding-left: 0; list-style: none; }
.mp-bullets li {
  font-size: 0.92rem;
  color: var(--mp-muted);
  margin-bottom: 0.4rem;
  padding-left: 1.1rem;
  position: relative;
}
.mp-bullets li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 6px;
  height: 6px;
  background: var(--mp-primary);
  border-radius: 50%;
}
.mp-proof-row { display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; margin-top: 0.7rem; }
.mp-proof-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--mp-secondary); }
.mp-proof-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.mp-proof-chip {
  font-size: 0.78rem;
  background: var(--mp-tertiary-soft);
  color: var(--mp-tertiary);
  border: 1px solid var(--mp-line);
  padding: 0.22rem 0.55rem;
  border-radius: 4px;
}
.mp-phrase-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; margin-top: 0.9rem; }
@media (max-width: 700px) { .mp-phrase-grid { grid-template-columns: 1fr; } }
.mp-phrase-h { display: block; font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 0.35rem; }
.mp-phrase-col ul { margin: 0; padding-left: 1rem; }
.mp-phrase-col li { font-size: 0.84rem; margin-bottom: 0.22rem; }
.mp-phrase-use .mp-phrase-h { color: #2e7d4f; }
.mp-phrase-use li { color: var(--mp-ink); }
.mp-phrase-avoid .mp-phrase-h { color: var(--color-red); }
.mp-phrase-avoid li { color: var(--mp-muted); }

/* Money-term tiers */
.mp-tier-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
@media (max-width: 860px) { .mp-tier-grid { grid-template-columns: 1fr; } }
.mp-tier-card {
  border: 1px solid var(--mp-line);
  border-radius: 6px;
  padding: 1.1rem 1.2rem;
  background: var(--mp-bg);
  display: flex;
  flex-direction: column;
}
.mp-tier-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.mp-tier-badge {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-white);
  background: var(--mp-primary);
  padding: 0.18rem 0.55rem;
  border-radius: 3px;
}
.mp-tier-effort { font-size: 0.72rem; color: var(--mp-muted); font-weight: 600; }
.mp-tier-name { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 400; margin: 0 0 0.5rem; }
.mp-tier-move { font-size: 0.9rem; color: var(--mp-ink); margin: 0 0 0.5rem; }
.mp-tier-examples { font-size: 0.82rem; color: var(--mp-secondary); font-style: italic; margin: 0 0 0.6rem; }
.mp-tier-payoff { font-size: 0.86rem; color: var(--mp-muted); margin: auto 0 0; padding-top: 0.4rem; border-top: 1px dashed var(--mp-line); }
.mp-trap {
  margin-top: 1.4rem;
  border: 1px solid var(--color-red);
  background: #fdf3f1;
  border-radius: 6px;
  padding: 1rem 1.2rem;
}
.mp-trap-label { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--color-red); margin-bottom: 0.35rem; }
.mp-trap p { margin: 0; font-size: 0.94rem; color: var(--mp-ink); }

/* Snapshot */
.mp-snapshot {
  border: 1px solid var(--mp-line);
  border-radius: 6px;
  padding: 1.3rem;
  background: var(--mp-soft);
}
.mp-snapshot-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
@media (max-width: 700px) { .mp-snapshot-stats { grid-template-columns: 1fr 1fr; } }
.mp-stat { display: flex; flex-direction: column; gap: 0.2rem; }
.mp-stat-value { font-family: var(--font-serif); font-size: 1.9rem; color: var(--mp-primary); line-height: 1; }
.mp-stat-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--mp-muted); font-weight: 600; }
.mp-snapshot-comp { margin-top: 1.1rem; }
.mp-snapshot-empty p { margin: 0.3rem 0 0; font-size: 0.94rem; color: var(--mp-muted); }
.mp-snapshot-empty code { background: var(--mp-bg); border: 1px solid var(--mp-line); padding: 0.05rem 0.3rem; border-radius: 3px; font-size: 0.84rem; }

/* Red team taxonomy table */
.mp-table-wrap { overflow-x: auto; border: 1px solid var(--mp-line); border-radius: 6px; }
.mp-taxonomy { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.mp-taxonomy thead th {
  background: var(--mp-tertiary);
  color: var(--color-white);
  text-align: left;
  font-family: var(--font-sans);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  padding: 0.7rem 0.9rem;
}
.mp-th-id { width: 3rem; }
.mp-th-go { width: 24%; }
.mp-taxonomy tbody td { padding: 0.7rem 0.9rem; border-top: 1px solid var(--mp-line); vertical-align: top; color: var(--mp-ink); }
.mp-taxonomy tbody tr:nth-child(even) { background: var(--mp-soft); }
.mp-td-id { font-family: var(--font-serif); font-weight: 700; color: var(--mp-primary); font-size: 1rem; }
.mp-td-pattern { font-weight: 600; color: var(--mp-tertiary); }
.mp-td-go { color: var(--mp-secondary); font-size: 0.85rem; }
.mp-redteam-rules { margin-top: 1.4rem; }
.mp-redteam-intro { margin-bottom: 0.5rem; }

/* Quality gates */
.mp-gate-stack { display: grid; gap: 1.1rem; }
.mp-gate { border: 1px solid var(--mp-line); border-radius: 6px; padding: 1.2rem 1.3rem; background: var(--mp-bg); }
.mp-gate-head { display: flex; align-items: center; gap: 0.7rem; }
.mp-gate-head h3 { font-family: var(--font-serif); font-size: 1.25rem; font-weight: 400; margin: 0; }
.mp-gate-when { font-size: 0.9rem; color: var(--mp-muted); margin: 0.5rem 0 0.9rem; }
.mp-gate-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.7rem; }
.mp-gate-checks li { border-left: 3px solid var(--mp-line); padding-left: 0.8rem; }
.mp-gate-checks li.mp-check-required { border-left-color: var(--mp-primary); }
.mp-check-label { display: block; font-size: 0.92rem; font-weight: 600; color: var(--mp-ink); }
.mp-req { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--mp-primary); margin-left: 0.5rem; }
.mp-check-guide { display: block; font-size: 0.84rem; color: var(--mp-muted); margin-top: 0.2rem; }

/* Roadmap */
.mp-roadmap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.1rem; }
@media (max-width: 900px) { .mp-roadmap-grid { grid-template-columns: 1fr; } }
.mp-roadmap-col { border: 1px solid var(--mp-line); border-radius: 6px; background: var(--mp-bg); overflow: hidden; }
.mp-roadmap-head { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem; color: var(--color-white); }
.mp-roadmap-now .mp-roadmap-head { background: var(--mp-primary); }
.mp-roadmap-next .mp-roadmap-head { background: var(--mp-secondary); }
.mp-roadmap-later .mp-roadmap-head { background: var(--mp-tertiary); }
.mp-roadmap-head h3 { font-family: var(--font-serif); font-size: 1.2rem; font-weight: 400; margin: 0; color: var(--color-white); }
.mp-roadmap-count { font-size: 0.8rem; background: rgba(255,255,255,0.25); padding: 0.1rem 0.5rem; border-radius: 999px; font-weight: 700; }
.mp-roadmap-list { list-style: none; margin: 0; padding: 0.8rem; display: grid; gap: 0.8rem; counter-reset: rm; }
.mp-roadmap-empty { padding: 1rem; color: var(--mp-muted); font-size: 0.88rem; font-style: italic; margin: 0; }
.mp-roadmap-item { border: 1px solid var(--mp-line); border-radius: 5px; padding: 0.7rem 0.8rem; background: var(--mp-soft); }
.mp-roadmap-item-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.35rem; }
.mp-kind { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; padding: 0.12rem 0.45rem; border-radius: 3px; }
.mp-kind-content { background: var(--mp-primary-soft); color: var(--mp-primary); }
.mp-kind-build { background: #eef2ee; color: #3f6b4d; }
.mp-kind-experiment { background: var(--mp-tertiary-soft); color: var(--mp-secondary); }
.mp-kind-pagetarget { background: var(--color-gray-light); color: var(--mp-muted); }
.mp-roadmap-effort { font-size: 0.68rem; color: var(--mp-muted); font-weight: 600; text-align: right; }
.mp-roadmap-item-title { font-family: var(--font-sans); font-size: 0.92rem; font-weight: 700; margin: 0 0 0.3rem; color: var(--mp-ink); line-height: 1.25; }
.mp-roadmap-item-detail { font-size: 0.82rem; color: var(--mp-muted); margin: 0 0 0.4rem; }
.mp-roadmap-next { font-size: 0.8rem; color: var(--mp-tertiary); margin: 0; }
.mp-roadmap-next span { font-weight: 700; text-transform: uppercase; font-size: 0.66rem; letter-spacing: 0.6px; color: var(--mp-secondary); }

/* CTA ladder */
.mp-cta-block { margin-top: 2rem; }
.mp-cta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
@media (max-width: 860px) { .mp-cta-grid { grid-template-columns: 1fr; } }
.mp-cta-card { border: 1px solid var(--mp-line); border-radius: 6px; padding: 1rem 1.1rem; background: var(--mp-soft); }
.mp-cta-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.mp-cta-stage { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--mp-secondary); }
.mp-cta-label { font-family: var(--font-serif); font-size: 1.1rem; color: var(--mp-ink); margin: 0 0 0.5rem; }
.mp-cta-signal { font-size: 0.83rem; color: var(--mp-muted); margin: 0; }

/* Empty notes + footer */
.mp-empty-note { font-size: 0.9rem; color: var(--mp-muted); font-style: italic; margin: 0.5rem 0 0; }
.mp-hero .mp-empty-note { color: #cdd8db; }
.mp-footer { margin-top: 2.5rem; padding-top: 1.2rem; border-top: 1px solid var(--mp-line); }
.mp-footer p { font-size: 0.8rem; color: var(--mp-muted); margin: 0; }

/* ── PRINT ─────────────────────────────────────────────── */
@media print {
  @page { margin: 14mm; }
  .mp-root { background: #fff; font-size: 11px; }
  .mp-shell { max-width: none; padding: 0; }
  .mp-print-hint { display: none; }
  .mp-hero {
    background: #16323b !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 1.4rem 1rem;
  }
  .mp-hero-title { font-size: 1.9rem; }
  .mp-hero-summary { font-size: 0.95rem; }
  .mp-body { padding: 0 1rem; }
  /* Page-breaks between major sections */
  .mp-section { break-inside: avoid-page; page-break-inside: avoid; padding: 1.1rem 0; }
  .mp-part-label { break-before: page; page-break-before: always; }
  #positioning { break-before: avoid; page-break-before: avoid; }
  .mp-section-title { font-size: 1.5rem; }
  .mp-lead-callout { font-size: 1.2rem; }
  .mp-audience-card, .mp-pillar, .mp-gate, .mp-tier-card, .mp-roadmap-col, .mp-card, .mp-cta-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .mp-taxonomy thead th, .mp-tier-badge, .mp-badge, .mp-roadmap-head {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mp-taxonomy tr { break-inside: avoid; page-break-inside: avoid; }
  a { color: var(--mp-ink); text-decoration: none; }
}
`
