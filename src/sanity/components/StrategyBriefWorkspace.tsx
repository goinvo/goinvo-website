import { Fragment, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { SanityClient } from '@sanity/client'

// Strategy Brief — a clean, scannable, READ-ONLY briefing of GoInvo's
// go-to-market strategy findings (positioning, money-terms, AI visibility, the
// Red Team play). Self-contained, matching SeoWorkspace's pattern (the
// `{ client }` prop, the local `s` style-object using Sanity CSS variables).
//
// Almost everything here is STATIC content authored as constants below — it is
// a strategy RECOMMENDATION captured on 2026-06-05, not live data. The ONE
// exception is the AI-citation section (§E), which fetches the latest stored
// snapshot live from GET /api/marketing/ai-citation so the visibility numbers
// stay current; it degrades gracefully when there is no run / the fetch fails.

const BRIEF_DATE = '2026-06-05'

// --- AI-citation snapshot shape (mirrors the flattened GET list projection in
// src/app/api/marketing/ai-citation/route.ts; rates are 0–1, render as %). ---
type CompetitorTally = { name: string; count: number }
type AiCitationSnapshot = {
  runDate?: string
  mentionRate?: number
  citationRate?: number
  answeredCount?: number
  promptCount?: number
  unavailable?: boolean
  topCompetitors?: CompetitorTally[]
  results?: unknown[]
}
type AiCitationData = { error?: string; snapshots?: AiCitationSnapshot[] }

type StrategyBriefWorkspaceProps = { client?: SanityClient }

const s: Record<string, CSSProperties> = {
  wrap: { padding: 16, color: 'var(--card-fg-color)', fontSize: 13 },
  h2: { fontSize: 16, fontWeight: 600, margin: '0 0 4px' },
  sub: { color: 'var(--card-muted-fg-color)', margin: '0 0 14px' },
  card: { border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 14, marginBottom: 18, background: 'var(--card-bg-color)' },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--card-muted-fg-color)', margin: '0 0 6px' },
  cardTitle: { fontSize: 14, fontWeight: 600, margin: '0 0 8px' },
  prose: { lineHeight: 1.55, margin: '0 0 10px' },
  lead: { fontSize: 15, lineHeight: 1.5, fontWeight: 600, margin: '0 0 12px' },
  ul: { margin: '0 0 10px', paddingLeft: 18, lineHeight: 1.55 },
  li: { marginBottom: 5 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12.5 },
  th: { textAlign: 'left', padding: '6px 8px', color: 'var(--card-muted-fg-color)', borderBottom: '1px solid var(--card-border-color)', fontWeight: 500, verticalAlign: 'top' },
  td: { padding: '6px 8px', borderBottom: '1px solid var(--card-border-color)', verticalAlign: 'top', lineHeight: 1.45 },
  pillarGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 4 },
  pillarCard: { border: '1px solid var(--card-border-color)', borderRadius: 8, padding: 12, background: 'var(--card-muted-bg-color, rgba(127,134,148,0.05))' },
  callout: { border: '1px solid var(--card-border-color)', borderLeft: '3px solid #2276fc', borderRadius: 6, padding: '8px 12px', background: 'var(--card-muted-bg-color, rgba(34,118,252,0.05))', marginBottom: 10, lineHeight: 1.5 },
  warn: { border: '1px solid var(--card-border-color)', borderLeft: '3px solid #e0463c', borderRadius: 6, padding: '8px 12px', background: 'var(--card-muted-bg-color, rgba(224,70,60,0.05))', marginBottom: 10, lineHeight: 1.5 },
}

const pct = (n?: number) => (typeof n === 'number' ? `${(n * 100).toFixed(0)}%` : '—')
const fmtDate = (d?: string) => (typeof d === 'string' && d ? d.slice(0, 10) : 'unknown')

const tierBadge = (c: string): CSSProperties => ({
  display: 'inline-block',
  padding: '1px 8px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  color: '#fff',
  background: c,
  marginRight: 8,
})

// --- §B messaging pillars (show-don't-claim). LEAD pillar first. ---
const PILLARS: Array<{ lead?: boolean; claim: string; proof: ReactNode }> = [
  {
    lead: true,
    claim: 'You can verify our work before you sign.',
    proof: 'Determinants of Health (~2,174 citations, open-source), hGraph / Walgreens, 65+ open-source projects. Competitors structurally can’t say this.',
  },
  {
    claim: 'We ship in regulated environments, with the numbers public.',
    proof: 'MA SNAP 7%→70%, NIH All of Us, 160M+ people impacted, CodeRyte $146M exit, Ipsos Facto.',
  },
  {
    claim: 'Healthcare-only for 20 years.',
    proof: '110+ products shipped, the Eric Topol quote, 90–91% repeat clients.',
  },
  {
    claim: 'The people who pitch are the people who build.',
    proof: 'No bait-and-switch from senior pitch to junior delivery — named makers do the work.',
  },
]

// --- §D commercial money-terms, by capture tier. ---
type MoneyTerm = { term: string; note: string }
const TIER1: MoneyTerm[] = [
  { term: '"ux consulting firm boston"', note: 'position ~3' },
  { term: '"user experience agency boston"', note: 'position ~3.5' },
  { term: '"ux design agency boston"', note: 'position ~6' },
  { term: '"ehr design"', note: '223 impressions, position ~10' },
]
const TIER2: MoneyTerm[] = [
  { term: '"healthcare ux design agency"', note: '128 impr, position ~16.6 — best signal' },
  { term: '"medical ux design agency" / "healthcare ux agency" cluster', note: 'position ~15–18, real impressions' },
]
const TIER3: MoneyTerm[] = [
  { term: '"healthcare design agency"', note: 'volume 90, position ~31' },
  { term: '"medical device design"', note: 'volume 390, difficulty 0' },
  { term: '"medical device software design"', note: 'volume 90, difficulty 6' },
  { term: '"healthcare website / web design agency"', note: 'volume 170–480, low difficulty' },
  { term: '"healthcare data visualization"', note: 'signature capability' },
]

// --- §F clinical-software failure taxonomy (F1–F8 + the falsifiable "tell"). ---
type FailureMode = { id: string; mode: string; tell: string }
const FAILURE_TAXONOMY: FailureMode[] = [
  { id: 'F1', mode: 'Workflows don’t survive reality', tell: 'The happy path was designed for the demo, not the messy clinic floor — does it hold under interruption, edge cases, and overload?' },
  { id: 'F2', mode: 'Clinicians route around it', tell: 'Are users building shadow workarounds (sticky notes, side spreadsheets, copy-paste) to avoid the tool?' },
  { id: 'F3', mode: 'Black-box / no inspectable evidence', tell: 'Can a clinician see WHY the system recommended this — or is it "trust the model"?' },
  { id: 'F4', mode: 'Patient burden underestimated', tell: 'How much extra effort does it push onto the patient, and was that ever measured?' },
  { id: 'F5', mode: 'Operational complexity', tell: 'How many integrations, handoffs, and configs must hold for it to work on day 200, not day 1?' },
  { id: 'F6', mode: 'Org-chart-not-care', tell: 'Does the product map to how the business is organized, or to how care actually gets delivered?' },
  { id: 'F7', mode: 'No path to shippable', tell: 'Is there a working prototype in a real environment — or just strategy that never ships? (the literal Red Team promise)' },
  { id: 'F8', mode: 'Illegible data / standard layer', tell: 'Is the data interoperable and legible (FHIR/SHR/Flux), or locked in a format only one vendor can read? (what GoInvo OSS fixes)' },
]

export function StrategyBriefWorkspace({ client: _client }: StrategyBriefWorkspaceProps) {
  // §E only: read the latest stored AI-citation snapshot (cheap GET — runs
  // nothing). Everything else on this view is static.
  const [aiCite, setAiCite] = useState<AiCitationData | null>(null)
  const [aiCiteLoading, setAiCiteLoading] = useState(true)

  const loadAiCitation = useCallback(async () => {
    setAiCiteLoading(true)
    try {
      const res = await fetch('/api/marketing/ai-citation')
      setAiCite((await res.json()) as AiCitationData)
    } catch {
      setAiCite({ error: 'Could not load AI-citation snapshots.' })
    } finally {
      setAiCiteLoading(false)
    }
  }, [])
  useEffect(() => {
    void loadAiCitation()
  }, [loadAiCitation])

  return (
    <div style={s.wrap} aria-label="Strategy brief sections">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={s.h2}>Strategy Brief</h2>
          <p style={s.sub}>
            The positioning + plan, on one page: who we are, the money terms, AI visibility, and the Red Team play.
          </p>
        </div>
        <span
          style={{
            ...tierBadge('#7b2ff7'),
            marginRight: 0,
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
          }}
          title="This is a strategy recommendation, not yet adopted by GoInvo."
        >
          RECOMMENDATION · {BRIEF_DATE}
        </span>
      </div>

      <div style={{ ...s.callout, marginBottom: 18 }}>
        Captured {BRIEF_DATE} from a 6-agent research + synthesis workflow. This is a <strong>recommendation, not yet
        adopted</strong> — read it as the argued-for direction, not settled house style.
      </div>

      {/* --- A. Positioning --- */}
      <div style={s.card}>
        <div style={s.sectionLabel}>A · Positioning</div>
        <p style={s.lead}>
          GoInvo is the healthcare-only design and engineering studio whose work you can verify before you sign — and
          that&apos;s why it&apos;s the safer bet.
        </p>
        <ul style={s.ul}>
          <li style={s.li}>
            <strong>Drop the word &ldquo;consulting.&rdquo;</strong> Be a <strong>studio</strong> — craft, named makers,
            shipped artifacts. It&apos;s literally true (we ship software, not decks) and it keeps the SEO money-terms.
          </li>
          <li style={s.li}>
            <strong>The foil is a failure mode</strong> — &ldquo;strategy that never ships,&rdquo; the stalled pilot, the
            deck that gathers dust. <strong>NOT McKinsey:</strong> we don&apos;t compete with them, and punching up from a
            40-person studio reads small.
          </li>
          <li style={s.li}>
            <strong>Take the &ldquo;safe choice&rdquo; ground</strong> in quiet confidence — &ldquo;the lower-risk bet is
            the one you can verify before you sign.&rdquo; Never grievance, rebel, or fear.
          </li>
        </ul>
      </div>

      {/* --- B. Messaging pillars (show-don't-claim) --- */}
      <div style={s.card}>
        <div style={s.sectionLabel}>B · Messaging pillars — show, don&apos;t claim</div>
        <div style={s.pillarGrid}>
          {PILLARS.map((p, i) => (
            <div
              key={p.claim}
              style={{
                ...s.pillarCard,
                ...(p.lead ? { borderLeft: '3px solid #2276fc' } : null),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span style={{ ...tierBadge(p.lead ? '#2276fc' : '#7d8694'), marginRight: 0 }}>
                  {p.lead ? 'LEAD' : i + 1}
                </span>
                <span style={{ fontWeight: 600 }}>{p.claim}</span>
              </div>
              <div style={{ color: 'var(--card-muted-fg-color)', fontSize: 12, lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--card-fg-color)' }}>Proof.</strong> {p.proof}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- C. Open source = evidence locker --- */}
      <div style={s.card}>
        <div style={s.sectionLabel}>C · Open source = evidence locker</div>
        <p style={s.prose}>
          Reframe open source from &ldquo;we give it away&rdquo; to &ldquo;<strong>we publish so you can audit our thinking
          before you sign</strong> — your engagement stays confidential, commercial, and ROI-driven.&rdquo;
        </p>
        <p style={{ ...s.prose, marginBottom: 0 }}>
          This walls the free IP off from the paid work (killing the IP-leak procurement objection) and converts what
          looked like a non-paying liability into our most defensible commercial asset.
        </p>
      </div>

      {/* --- D. Commercial money-terms (the capture opportunity) --- */}
      <div style={s.card}>
        <div style={s.sectionLabel}>D · Commercial money-terms — the capture opportunity</div>
        <div style={s.callout}>
          <strong>Key insight:</strong> GoInvo ALREADY ranks page-1/2 for these commercial terms and earns ~0 clicks —
          latent, uncaptured demand. This is a <strong>capture problem, not a demand problem.</strong>
        </div>

        <MoneyTier
          badge={<span style={tierBadge('#1f9d55')}>TIER 1</span>}
          title="Instant wins — rank page-1, ~0% CTR → rewrite title / meta"
          terms={TIER1}
        />
        <MoneyTier
          badge={<span style={tierBadge('#d98a00')}>TIER 2</span>}
          title="Page-2 pushes — position ~15–18, real impressions"
          terms={TIER2}
        />
        <MoneyTier
          badge={<span style={tierBadge('#2276fc')}>TIER 3</span>}
          title="Dedicated pages — real volume, winnable"
          terms={TIER3}
        />

        <div style={s.warn}>
          <strong>The trap (don&apos;t chase):</strong> &ldquo;patient experience&rdquo; shows ~1,900 searches, but they&apos;re
          JOBS, journals, and clinical-ops titles — not buyers. High volume, wrong wallet.
        </div>

        <div style={{ ...s.callout, marginBottom: 0 }}>
          <strong>Page discipline:</strong> H1 = the literal search term (so it ranks). Subhead + first scroll = the
          verify-before-you-sign proof (so it converts).
        </div>
      </div>

      {/* --- E. AI-citation share-of-voice (LIVE) --- */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={s.sectionLabel}>E · AI-citation share-of-voice — live</div>
          <button type="button" style={miniBtn} onClick={() => void loadAiCitation()} disabled={aiCiteLoading}>
            {aiCiteLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        <p style={s.prose}>
          <strong>Finding:</strong> GoInvo&apos;s only strong AI visibility is &ldquo;open source healthcare software&rdquo;
          (cited at goinvo.com/open-source-health-design); the commercial cluster is weak. Rates are non-deterministic
          run-to-run (~mention 8&ndash;33%, citation 8&ndash;17%), so we track it as a <strong>trend</strong>, not a fixed
          score.
        </p>

        {/* The one live read on this view — latest stored snapshot, graceful. */}
        <AiCitationLatest data={aiCite} loading={aiCiteLoading} />
      </div>

      {/* --- F. The Red Team play (failure-teardown strategy) --- */}
      <div style={s.card}>
        <div style={s.sectionLabel}>F · The Red Team play — failure-teardown strategy</div>
        <div style={s.callout}>
          <strong>Verdict:</strong> go bolder — but on <strong>rigor, not aggression.</strong> Vagueness reads as fear;
          specificity turns fear into authority.
        </div>
        <p style={s.prose}>
          <strong>Register = the clinical M&amp;M (morbidity &amp; mortality) conference.</strong> Blameless. &ldquo;What
          and how,&rdquo; never &ldquo;why and who.&rdquo; Unsparing about the SYSTEM, generous to the PEOPLE.
        </p>

        <div style={{ fontWeight: 600, margin: '14px 0 6px' }}>Clinical-software failure taxonomy (the evergreen IP)</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 42 }}>#</th>
              <th style={{ ...s.th, width: '34%' }}>Failure mode</th>
              <th style={s.th}>The &ldquo;tell&rdquo; — run it on your own product</th>
            </tr>
          </thead>
          <tbody>
            {FAILURE_TAXONOMY.map((f) => (
              <tr key={f.id}>
                <td style={{ ...s.td, fontWeight: 700, color: '#2276fc' }}>{f.id}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>{f.mode}</td>
                <td style={s.td}>{f.tell}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul style={{ ...s.ul, marginTop: 12 }}>
          <li style={s.li}>
            <strong>Launch with DEFUNCT-only cases</strong> — Watson for Oncology, Theranos (as a contrast device), Haven.
            <strong> NOT Oracle-Cerner</strong> (living, litigious, a plausible future client).
          </li>
          <li style={s.li}>
            <strong>Comparison discipline:</strong> Pattern &rarr; Principle (the tell) &rarr; Illustration (GoInvo as
            METHOD, not a scoreboard) &rarr; Humility (a real GoInvo near-miss). Never head-to-head.
          </li>
          <li style={s.li}>
            <strong>The #1 risk = reach &ne; revenue.</strong> The teardown audience (design Twitter, students,
            journalists, competitors) isn&apos;t the buyer. Defeat it with a <strong>gated self-diagnostic</strong>, measure
            <strong> qualified discovery calls</strong> (not pageviews), and set a <strong>90-day kill switch.</strong>
          </li>
          <li style={s.li}>
            <strong>Go / no-go:</strong> the taxonomy + self-diagnostic + funnel are an <strong>unconditional</strong>
            greenlight; the named teardowns are <strong>conditional</strong> (finite, counsel-gated, defunct-only,
            instrumented from day one).
          </li>
        </ul>
      </div>

      {/* --- G. What to avoid --- */}
      <div style={s.card}>
        <div style={s.sectionLabel}>G · What to avoid</div>
        <ul style={{ ...s.ul, marginBottom: 0 }}>
          <li style={s.li}>Don&apos;t name McKinsey in copy.</li>
          <li style={s.li}>Don&apos;t lead with &ldquo;human-centered&rdquo; — it puts you in IDEO&apos;s and McKinsey&apos;s sentence.</li>
          <li style={s.li}>No &ldquo;patient not P&amp;L&rdquo; and no &ldquo;no conflicts of interest&rdquo; claims (the portfolio serves pharma, providers, payers, and federal).</li>
          <li style={s.li}>No vendor junk stats.</li>
          <li style={s.li}>No rebel / grievance pose.</li>
          <li style={s.li}>Don&apos;t imply scale you lack.</li>
        </ul>
      </div>
    </div>
  )
}

const miniBtn: CSSProperties = {
  border: '1px solid var(--card-border-color)',
  background: 'var(--card-bg-color)',
  color: 'var(--card-fg-color)',
  borderRadius: 6,
  padding: '5px 11px',
  cursor: 'pointer',
  fontSize: 12,
}

// A single money-term tier: a labelled heading + a list of [term, note] rows.
function MoneyTier({ badge, title, terms }: { badge: ReactNode; title: string; terms: MoneyTerm[] }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
        {badge}
        <span style={{ fontWeight: 600 }}>{title}</span>
      </div>
      <table style={s.table}>
        <tbody>
          {terms.map((t) => (
            <tr key={t.term}>
              <td style={{ ...s.td, fontWeight: 500 }}>{t.term}</td>
              <td style={{ ...s.td, color: 'var(--card-muted-fg-color)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                {t.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// §E live read — the latest stored AI-citation snapshot, rendered gracefully:
// loading → calm line; fetch error / no snapshots / did-not-run → a calm
// fallback line; otherwise the mention + citation rate, run date, competitors.
function AiCitationLatest({ data, loading }: { data: AiCitationData | null; loading: boolean }) {
  const fallback = (msg: string) => (
    <div
      style={{
        color: 'var(--card-muted-fg-color)',
        fontSize: 12,
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px dashed var(--card-border-color)',
      }}
    >
      {msg}
    </div>
  )

  if (loading && !data) return fallback('Loading the latest AI-visibility snapshot…')
  if (!data || data.error) return fallback('AI-visibility numbers are unavailable right now — check back after the next run.')

  const snapshots = data.snapshots || []
  // Prefer the most recent snapshot that actually ran.
  const latest = snapshots.find((snap) => !snap.unavailable && (snap.answeredCount ?? 0) > 0) || snapshots[0]
  if (!latest) return fallback('No AI-citation run yet — run the check in the SEO view to capture the first snapshot.')
  if (latest.unavailable || (latest.answeredCount ?? 0) === 0)
    return fallback(`The latest run (${fmtDate(latest.runDate)}) didn’t complete — check back after the next run.`)

  return (
    <Fragment>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          flexWrap: 'wrap',
          padding: 12,
          borderRadius: 8,
          border: '1px solid var(--card-border-color)',
          marginBottom: 10,
        }}
      >
        <div style={{ minWidth: 120 }}>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: '#2276fc' }}>{pct(latest.mentionRate)}</div>
          <div style={{ fontSize: 11, color: 'var(--card-muted-fg-color)', marginTop: 4 }}>
            Mention rate — % of AI answers that name GoInvo
          </div>
        </div>
        <div style={{ minWidth: 120 }}>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: '#1f9d55' }}>{pct(latest.citationRate)}</div>
          <div style={{ fontSize: 11, color: 'var(--card-muted-fg-color)', marginTop: 4 }}>
            Citation rate — % that link goinvo.com
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--card-muted-fg-color)' }}>
          <div>
            Answered <strong style={{ color: 'var(--card-fg-color)' }}>{latest.answeredCount ?? 0}</strong> of{' '}
            {latest.promptCount ?? 0} prompts
          </div>
          <div style={{ marginTop: 2 }}>Latest run {fmtDate(latest.runDate)}</div>
        </div>
      </div>

      {latest.topCompetitors?.length ? (
        <div style={{ fontSize: 12, color: 'var(--card-muted-fg-color)' }}>
          <strong style={{ color: 'var(--card-fg-color)' }}>Named alongside us:</strong>{' '}
          {latest.topCompetitors
            .slice(0, 8)
            .map((c) => `${c.name} (${c.count})`)
            .join(' · ')}
        </div>
      ) : null}
    </Fragment>
  )
}
